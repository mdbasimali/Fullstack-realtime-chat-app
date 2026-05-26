import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    localDeviceId: {
      type: String,
      required: true,
      index: true,
    },
    remoteDeviceId: {
      type: String,
      required: true,
      index: true,
    },
    sessionData: {
      type: String,
      required: true,
    },
    ratchetState: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index to ensure there's only one session between two specific devices
sessionSchema.index({ localDeviceId: 1, remoteDeviceId: 1 }, { unique: true });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
