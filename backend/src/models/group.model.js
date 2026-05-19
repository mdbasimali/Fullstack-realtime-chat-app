import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 200,
      default: "",
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    avatar: {
      type: String,
      default: "",
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    maxMembers: {
      type: Number,
      default: 100, // Capped at 100 to prevent database performance degradation
    }
  },
  { timestamps: true }
);

// Indexes for high performance lookup
groupSchema.index({ members: 1 });
groupSchema.index({ createdAt: -1 });

const Group = mongoose.model("Group", groupSchema);
export default Group;
