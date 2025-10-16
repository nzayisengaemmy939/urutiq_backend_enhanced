// Lazy-load bullmq at runtime. If it's not installed, expose a safe fallback
// queue implementation so the API can start without crashing.
// Simple Redis connection config (override with REDIS_URL or REDIS_HOST/REDIS_PORT)
const connection = (() => {
    if (process.env.REDIS_URL)
        return { connection: process.env.REDIS_URL };
    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379)
    };
})();
class FallbackQueue {
    name;
    constructor(name) {
        this.name = name;
    }
    async add(_name, _data, _opts) {
        // noop: pretend the job was enqueued but don't fail startup
        console.warn(`FallbackQueue: enqueue skipped for ${this.name}`);
        return null;
    }
    async getJobCounts() {
        return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
}
// In-process queue for development when Redis/bullmq isn't available.
class LocalQueue {
    name;
    _processor = null;
    _id = 1;
    constructor(name) {
        this.name = name;
    }
    registerProcessor(fn) {
        this._processor = fn;
    }
    async add(name, data, _opts) {
        const job = { id: `local-${this._id++}`, name, data };
        // run processor asynchronously if registered
        if (this._processor) {
            setImmediate(async () => {
                try {
                    if (this._processor) {
                        await this._processor(job);
                    }
                }
                catch (err) {
                    console.error('LocalQueue job failed', err);
                }
            });
        }
        else {
            console.warn(`LocalQueue: no processor for ${this.name}, job ${name} skipped`);
        }
        return job;
    }
    async getJobCounts() {
        return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
}
let _aiQueue = null;
let _aiDlq = null;
let _loading = false;
let _localQueueInstance = null;
async function ensureQueues() {
    if (_aiQueue && _aiDlq)
        return;
    if (_loading)
        return; // allow concurrent callers to wait on the same init
    _loading = true;
    try {
        const mod = await import('bullmq');
        const Queue = mod.Queue;
        _aiQueue = new Queue('ai-jobs', { connection });
        _aiDlq = new Queue('ai-dlq', { connection });
    }
    catch (err) {
        // If bullmq isn't installed or import fails, use an in-process queue for dev.
        console.warn('bullmq not available, using in-process LocalQueue. Install bullmq+ioredis and run Redis for full functionality.');
        _localQueueInstance = new LocalQueue('ai-jobs');
        _aiQueue = _localQueueInstance;
        _aiDlq = new LocalQueue('ai-dlq');
    }
    finally {
        _loading = false;
    }
}
export const aiQueue = {
    add: async (name, data, opts) => {
        try {
            await ensureQueues();
            return await _aiQueue.add(name, data, opts);
        }
        catch (err) {
            console.error('Failed to enqueue AI job', name, err);
            return null;
        }
    },
    getJobCounts: async (...args) => {
        try {
            await ensureQueues();
            return await _aiQueue.getJobCounts(...args);
        }
        catch (e) {
            console.error('aiQueue.getJobCounts failed', e);
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
    }
};
export const aiDlq = {
    add: async (name, data, opts) => {
        try {
            await ensureQueues();
            return await _aiDlq.add(name, data, opts);
        }
        catch (err) {
            console.error('Failed to enqueue DLQ job', name, err);
            return null;
        }
    },
    getJobCounts: async (...args) => {
        try {
            await ensureQueues();
            return await _aiDlq.getJobCounts(...args);
        }
        catch (e) {
            console.error('aiDlq.getJobCounts failed', e);
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
    }
};
export async function enqueueAiJob(name, data, opts) {
    try {
        return await aiQueue.add(name, data, opts);
    }
    catch (err) {
        // Don't throw — routes should continue even if enqueue fails
        console.error('Failed to enqueue AI job', name, err);
        return null;
    }
}
export async function moveJobToDlq(job, err) {
    try {
        const payload = {
            originalName: job?.name,
            originalData: job?.data,
            failedAt: new Date().toISOString(),
            error: String(err?.message || err)
        };
        return await aiDlq.add('failed-job', payload, { removeOnComplete: false });
    }
    catch (e) {
        console.error('Failed to move job to DLQ', e);
        return null;
    }
}
export async function getQueueCounts() {
    try {
        const counts = await aiQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        const dlqCounts = await aiDlq.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        return { ai: counts, dlq: dlqCounts };
    }
    catch (e) {
        console.error('getQueueCounts failed', e);
        return { error: String(e) };
    }
}
// Allows the worker to register a processor when using LocalQueue fallback
export function registerLocalProcessor(fn) {
    if (!_localQueueInstance) {
        _localQueueInstance = new LocalQueue('ai-jobs');
        _aiQueue = _localQueueInstance;
    }
    _localQueueInstance.registerProcessor(fn);
}
// AI-specific queue functions
export async function enqueueDocumentAnalysis(documentId, analysisType, metadata) {
    return await aiQueue.add('document-analysis', {
        documentId,
        analysisType,
        ...metadata
    }, {
        priority: 1,
        removeOnComplete: 50,
        removeOnFail: 25
    });
}
export async function enqueueDocumentAutomation(automationType, documents, rules, metadata) {
    return await aiQueue.add('document-automation', {
        automationType,
        documents,
        rules,
        ...metadata
    }, {
        priority: 2,
        removeOnComplete: 50,
        removeOnFail: 25
    });
}
export async function enqueueBulkProcessing(jobType, items, metadata) {
    return await aiQueue.add('bulk-processing', {
        jobType,
        items,
        ...metadata
    }, {
        priority: 3,
        removeOnComplete: 100,
        removeOnFail: 50
    });
}
