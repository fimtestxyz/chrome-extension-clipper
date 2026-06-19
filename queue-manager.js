/**
 * API Forwarding & Queue Manager
 * Handles sending captures to the backend and manages an offline retry queue.
 */
class QueueManager {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    this.queueKey = 'gobble_capture_queue';
  }

  async getQueue() {
    const result = await chrome.storage.local.get([this.queueKey]);
    return result[this.queueKey] || [];
  }

  async enqueue(payload, maxSizeOverride) {
    const queue = await this.getQueue();
    const effectiveMax = maxSizeOverride ?? this.maxSize;

    const entry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload,
      attempts: 0,
      nextRetry: Date.now() + 2000,
    };

    queue.push(entry);

    // Enforce size limit (FIFO)
    if (queue.length > effectiveMax) {
      queue.shift();
    }

    await chrome.storage.local.set({ [this.queueKey]: queue });
  }

  async dequeue() {
    const queue = await this.getQueue();
    if (queue.length === 0) return null;

    const item = queue.shift();
    await chrome.storage.local.set({ [this.queueKey]: queue });
    return item;
  }

  async markFailed(id) {
    const queue = await this.getQueue();
    const index = queue.findIndex((item) => item.id === id);

    if (index !== -1) {
      queue[index].attempts += 1;
      const delay = Math.pow(2, queue[index].attempts) * 1000;
      queue[index].nextRetry = Date.now() + delay;

      if (queue[index].attempts > 5) {
        queue.splice(index, 1);
      }

      await chrome.storage.local.set({ [this.queueKey]: queue });
    }
  }
}

export default new QueueManager();
