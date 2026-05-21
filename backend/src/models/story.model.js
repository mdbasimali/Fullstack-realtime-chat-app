import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String, // URL for images or text content
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    caption: {
      type: String,
      default: "",
    },
    bgColor: {
      type: String,
      default: "",
    },
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    // Stories expire after 24 hours
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: '24h' }
    }
  },
  { timestamps: true }
);

// Ensure the index is created
storySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);

export default Story;
