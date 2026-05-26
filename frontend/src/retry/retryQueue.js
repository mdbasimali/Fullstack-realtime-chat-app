import { db } from '../encryption/sessionStore';
import { axiosInstance } from '../lib/axios';

class RetryQueueManager {
  constructor() {
    this.isProcessing = false;
  }

  async addFailedMessage(messageObj) {
    await db.messages.put({
      messageId: messageObj.messageId,
      chatId: messageObj.chatId,
      payload: messageObj.payload,
      status: 'failed',
      createdAt: Date.now()
    });
    // Attempt processing immediately if network is available
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      const failedMessages = await db.messages.where('status').equals('failed').toArray();
      for (let msg of failedMessages) {
        try {
          // Attempt to re-send via REST API (since socket might be unstable)
          // or we can emit via socket if we have the reference
          await axiosInstance.post(`/messages/send/${msg.chatId}`, msg.payload);
          // If successful, update status
          await db.messages.update(msg.messageId, { status: 'sent' });
        } catch (err) {
          console.error("Retry failed for message:", msg.messageId);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const retryQueueManager = new RetryQueueManager();

// Automatically process queue when coming back online
window.addEventListener('online', () => {
  retryQueueManager.processQueue();
});
