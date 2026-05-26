import RetryQueue from "../models/retryQueue.model.js";
import { getDeviceSocketId, io } from "../lib/socket.js";

// Polling interval in ms (e.g., every 10 seconds)
const POLL_INTERVAL = 10000;

export const startRetryWorker = () => {
  console.log("Retry worker started");
  setInterval(async () => {
    try {
      const now = new Date();
      // Find messages that need to be retried
      const pendingMessages = await RetryQueue.find({
        nextRetryAt: { $lte: now },
        retryCount: { $lt: 5 }, // max retries
      });

      for (const msg of pendingMessages) {
        const receiverSocketId = getDeviceSocketId(msg.receiverId, msg.receiverDeviceId);
        
        if (receiverSocketId) {
          // Emit the message to the specific device
          io.to(receiverSocketId).emit("message:retry", {
            messageId: msg.messageId,
            senderDeviceId: msg.senderDeviceId,
            encryptedPayload: msg.encryptedPayload,
            messageType: msg.messageType,
          });
          
          // Update retry count and next retry time (exponential backoff)
          msg.retryCount += 1;
          msg.nextRetryAt = new Date(Date.now() + Math.pow(2, msg.retryCount) * 5000);
          await msg.save();
        }
      }
      
      // Delete messages that exceeded max retries
      await RetryQueue.deleteMany({ retryCount: { $gte: 5 } });
    } catch (error) {
      console.error("Error in retry worker:", error.message);
    }
  }, POLL_INTERVAL);
};
