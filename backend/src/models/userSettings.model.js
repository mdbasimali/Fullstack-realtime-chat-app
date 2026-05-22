import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    generateLinkPreviews: {
      type: Boolean,
      default: true,
    },
    useAddressBookPhotos: {
      type: Boolean,
      default: false,
    },
    keepMutedChatsArchived: {
      type: Boolean,
      default: false,
    },
    useSystemEmoji: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserSettings = mongoose.model("UserSettings", userSettingsSchema);
export default UserSettings;
