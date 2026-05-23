import mongoose from "mongoose";

const activeCallSchema = new mongoose.Schema(
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
      enum: ["ringing", "ongoing", "ended"],
      default: "ringing",
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
        status: {
          type: String,
          enum: ["invited", "joined", "declined", "left", "busy"],
          default: "invited",
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],
    mediasoupRouterId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const ActiveCall = mongoose.model("ActiveCall", activeCallSchema);
export default ActiveCall;
