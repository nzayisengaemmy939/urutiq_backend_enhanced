// Lazy-load bullmq at runtime. If it's not installed, expose a safe fallback
// queue implementation so the API can start without crashing.

// Simple Redis connection config (override with REDIS_URL or REDIS_HOST/REDIS_PORT)
const connection = (() => {
  if (process.env.REDIS_URL) return { connection: process.env.REDIS_URL } as any;
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  } as any;
})();

class FallbackQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add(_name: string, _data: any, _opts?: any) {
    // noop: pretend the job was enqueued but don't fail startup
    console.warn(`FallbackQueue: enqueue skipped for ${this.name}`);
    return null;
  }
  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } as any;
  }
}

// In-process queue for development when Redis/bullmq isn't available.
class LocalQueue {
  name: string;
  private _processor: ((job: any) => Promise<any>) | null = null;
  private _id = 1;
  constructor(name: string) {
    this.name = name;
  }
  registerProcessor(fn: (job: any) => Promise<any>) {
    this._processor = fn;
  }
  async add(name: string, data: any, _opts?: any) {
    const job = { id: `local-${this._id++}`, name, data } as any;
    // run processor asynchronously if registered
    if (this._processor) {
      setImmediate(async () => {
        try {
          if (this._processor) {
            await this._processor(job);
          }
        } catch (err) {
          console.error('LocalQueue job failed', err);
        }
      });
    } else {
      console.warn(`LocalQueue: no processor for ${this.name}, job ${name} skipped`);
    }
    return job;
  }
  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } as any;
  }
}

let _aiQueue: any = null;
let _aiDlq: any = null;
let _loading = false;
let _localQueueInstance: LocalQueue | null = null;

async function ensureQueues() {
  if (_aiQueue && _aiDlq) return;
  if (_loading) return; // allow concurrent callers to wait on the same init
  _loading = true;
  try {
    const mod = await import('bullmq');
    const Queue = (mod as any).Queue;
    _aiQueue = new Queue('ai-jobs', { connection } as any);
    _aiDlq = new Queue('ai-dlq', { connection } as any);
  } catch (err) {
  // If bullmq isn't installed or import fails, use an in-process queue for dev.
  console.warn('bullmq not available, using in-process LocalQueue. Install bullmq+ioredis and run Redis for full functionality.');
  _localQueueInstance = new LocalQueue('ai-jobs');
  _aiQueue = _localQueueInstance;
  _aiDlq = new LocalQueue('ai-dlq');
  } finally {
    _loading = false;
  }
}

export const aiQueue = {
  add: async (name: string, data: any, opts?: any) => {
    try {
      await ensureQueues();
      return await _aiQueue.add(name, data, opts);
    } catch (err) {
      console.error('Failed to enqueue AI job', name, err);
      return null;
    }
  },
  getJobCounts: async (...args: any[]) => {
    try {
      await ensureQueues();
      return await _aiQueue.getJobCounts(...args);
    } catch (e) {
      console.error('aiQueue.getJobCounts failed', e);
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }
};

export const aiDlq = {
  add: async (name: string, data: any, opts?: any) => {
    try {
      await ensureQueues();
      return await _aiDlq.add(name, data, opts);
    } catch (err) {
      console.error('Failed to enqueue DLQ job', name, err);
      return null;
    }
  },
  getJobCounts: async (...args: any[]) => {
    try {
      await ensureQueues();
      return await _aiDlq.getJobCounts(...args);
    } catch (e) {
      console.error('aiDlq.getJobCounts failed', e);
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }
};

export async function enqueueAiJob(name: string, data: any, opts?: any) {
  try {
    return await aiQueue.add(name, data, opts);
  } catch (err) {
    // Don't throw — routes should continue even if enqueue fails
    console.error('Failed to enqueue AI job', name, err);
    return null;
  }
}

export async function moveJobToDlq(job: any, err: any) {
  try {
    const payload = {
      originalName: job?.name,
      originalData: job?.data,
      failedAt: new Date().toISOString(),
      error: String(err?.message || err)
    };
    return await aiDlq.add('failed-job', payload, { removeOnComplete: false });
  } catch (e) {
    console.error('Failed to move job to DLQ', e);
    return null;
  }
}

export async function getQueueCounts() {
  try {
    const counts = await aiQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    const dlqCounts = await aiDlq.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return { ai: counts, dlq: dlqCounts };
  } catch (e) {
    console.error('getQueueCounts failed', e);
    return { error: String(e) };
  }
}

// Allows the worker to register a processor when using LocalQueue fallback
export function registerLocalProcessor(fn: (job: any) => Promise<any>) {
  if (!_localQueueInstance) {
    _localQueueInstance = new LocalQueue('ai-jobs');
    _aiQueue = _localQueueInstance;
  }
  _localQueueInstance.registerProcessor(fn);
}

// AI-specific queue functions
export async function enqueueDocumentAnalysis(documentId: string, analysisType: string, metadata: any) {
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

export async function enqueueDocumentAutomation(automationType: string, documents: any[], rules: any, metadata: any) {
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

export async function enqueueBulkProcessing(jobType: string, items: any[], metadata: any) {
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
