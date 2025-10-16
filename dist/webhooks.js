import { enqueueAiJob } from './queue.js';
// WEBHOOK_URLS env expected as comma-separated list of URLs
export function enqueueWebhooks(eventName, payload) {
    const raw = process.env.WEBHOOK_URLS || '';
    if (!raw)
        return;
    const urls = raw.split(',').map(s => s.trim()).filter(Boolean);
    for (const url of urls) {
        // enqueue a delivery job per URL
        enqueueAiJob('deliver-webhook', { url, event: eventName, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true });
    }
}
