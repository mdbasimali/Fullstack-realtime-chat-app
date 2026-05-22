import mongoose from "mongoose";

const storyPrivacySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    privacyType: {
      type: String,
      enum: ["ALL", "EXCEPT", "ONLY"],
      default: "ALL",
    },
    excludedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    allowRepliesAndReactions: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const StoryPrivacy = mongoose.model("StoryPrivacy", storyPrivacySchema);
export default StoryPrivacy;
