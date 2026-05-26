import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        messageId: {
            type: String, // Unique message identifier for E2EE
            unique: true,
            sparse: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senderDeviceId: {
            type: String, // For Signal Protocol
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () { return !this.groupId; }
        },
        receiverDeviceId: {
            type: String, // For Signal Protocol
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group"
        },
        chatId: {
            type: String,
        },
        participantIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        text: {
            type: String,
        },
        encryptedPayload: {
            type: String, // Double Ratchet encrypted payload
        },
        image: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        deliveryStatus: {
            type: String,
            enum: ["sent", "delivered", "read", "failed"],
            default: "sent",
        },
        messageType: {
            type: String,
            enum: ["text", "image", "video", "voice_call", "video_call", "audio", "story_reply", "signal_message"],
            default: "text",
        },
        storyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Story"
        },
        callStatus: {
            type: String, // "accepted", "rejected", "missed", "ended"
        },
        callDuration: {
            type: Number, // duration in seconds
        },
        isEncrypted: {
            type: Boolean,
            default: false,
        },
        iv: {
            type: String,
        }
    },
    { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;