import mongoose from "mongoose";

const deletedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    scheduledPermanentDeleteAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "User requested deletion",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const DeletedAccount = mongoose.model("DeletedAccount", deletedAccountSchema);

export default DeletedAccount;
