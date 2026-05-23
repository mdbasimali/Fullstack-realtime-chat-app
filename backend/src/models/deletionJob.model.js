import mongoose from "mongoose";

const deletionJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    progress: {
      type: Number,
      default: 0, // 0 to 100
    },
    retries: {
      type: Number,
      default: 0,
    },
    errorLog: [
      {
        timestamp: { type: Date, default: Date.now },
        message: String,
      }
    ]
  },
  { timestamps: true }
);

const DeletionJob = mongoose.model("DeletionJob", deletionJobSchema);

export default DeletionJob;
