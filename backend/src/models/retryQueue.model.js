import mongoose from "mongoose";

const retryQueueSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderDeviceId: {
      type: String,
      required: true,
    },
    receiverDeviceId: {
      type: String,
      required: true,
    },
    encryptedPayload: {
      type: String,
      required: true,
    },
    messageType: {
      type: Number,
      default: 1, // standard message
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

const RetryQueue = mongoose.model("RetryQueue", retryQueueSchema);

export default RetryQueue;
