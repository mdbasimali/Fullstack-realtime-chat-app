import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        receiverId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: function() { return !this.groupId; }
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group"
        },
        text:{
            type:String,
        },
        image:{
            type:String,
        },
        isRead:{
            type:Boolean,
            default:false,
        },
        messageType: {
            type: String,
            enum: ["text", "image", "video", "voice_call", "video_call", "audio"],
            default: "text",
        },
        callStatus: {
            type: String, // "accepted", "rejected", "missed", "ended"
        },
        callDuration: {
            type: Number, // duration in seconds
        }
    },
    {timestamps:true}
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;