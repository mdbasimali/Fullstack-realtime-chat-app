import mongoose from "mongoose";

const callHistorySchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["audio", "video", "group"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "missed", "declined", "failed"],
      required: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        duration: {
          type: Number, // in seconds
          default: 0,
        },
      },
    ],
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
    },
    totalDuration: {
      type: Number, // in seconds
      default: 0,
    },
  },
  { timestamps: true }
);

const CallHistory = mongoose.model("CallHistory", callHistorySchema);
export default CallHistory;
