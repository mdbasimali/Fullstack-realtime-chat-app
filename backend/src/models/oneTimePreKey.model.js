import mongoose from "mongoose";

const oneTimePreKeySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    keyId: {
      type: Number,
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a keyId is unique per device
oneTimePreKeySchema.index({ deviceId: 1, keyId: 1 }, { unique: true });

const OneTimePreKey = mongoose.model("OneTimePreKey", oneTimePreKeySchema);

export default OneTimePreKey;
