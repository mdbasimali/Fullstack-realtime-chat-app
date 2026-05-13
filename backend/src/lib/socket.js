import {Server} from"socket.io";
import http from "http";
import express from "express";
import webpush from "web-push";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app=express();
const server = http.createServer(app);

const io =new Server(server,{
    cors:{
        origin: ["http://localhost:5173", "http://localhost:5174", "https://fullstack-realtime-chat-app-sooty.vercel.app", "https://chatzone.cloudnexis.in"]
    },
});

const userSocketMap = {}; // {userId: socketId}
export const activeCalls = new Map(); // {userId: {partnerId, type, startTime}}
const pendingCalls = new Map(); // {userId: {from, offer, type, timestamp}}

export function getReceiverSocketId(userId){
    return userSocketMap[userId]
}

async function sendPushNotification(userId, data) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return;
        }

        const payload = JSON.stringify(data);
        const pushPromises = user.pushSubscriptions.map(sub => 
            webpush.sendNotification(sub, payload, {
                TTL: 60,
                urgency: "high",
            }).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    return User.findByIdAndUpdate(userId, {
                        $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
                    });
                }
            })
        );
        await Promise.all(pushPromises);
    } catch (error) {
        console.error("Error in sendPushNotification:", error);
    }
}

async function saveCallLog(senderId, receiverId, type, status, duration = 0) {
    try {
        const newMessage = new Message({
            senderId,
            receiverId,
            messageType: type === "video" ? "video_call" : "voice_call",
            callStatus: status,
            callDuration: duration,
            text: type === "video" ? "Video call" : "Voice call",
        });

        await newMessage.save();

        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);
        if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);
        
        return newMessage;
    } catch (error) {
        console.error("Error saving call log:", error);
    }
}

io.on("connection", (socket) =>{
   console.log("A user connected", socket.id);
   const userId = socket.handshake.query.userId;
   if(userId) {
       userSocketMap[userId]=socket.id;
       
       // Check for pending calls
       if (pendingCalls.has(userId)) {
           const call = pendingCalls.get(userId);
           if (Date.now() - call.timestamp < 45000) {
               socket.emit("call:incoming", { from: call.from, offer: call.offer, type: call.type });
           }
           pendingCalls.delete(userId);
       }

       // Refresh recovery: Check for active calls
       if (activeCalls.has(userId)) {
           const call = activeCalls.get(userId);
           User.findById(call.partnerId).then(partner => {
               if (partner) {
                   socket.emit("call:active-sync", { partner, type: call.type || "video" });
               }
           });
       }
   }

    io.emit("getOnlineUsers",Object.keys(userSocketMap));

  // Video Call Signaling Logic
  socket.on("call:user", async ({ to, offer, type }) => {
    const receiverSocketId = getReceiverSocketId(to);
    const sender = await User.findById(userId).select("fullName profilePic");
    
    sendPushNotification(to, {
        title: `Incoming ${type} call`,
        body: `${sender?.fullName || "Someone"} is calling you...`,
        data: {
            type: "incoming_call",
            callType: type,
            from: userId,
            senderName: sender?.fullName,
            senderPic: sender?.profilePic,
            offer: offer
        }
    });

    pendingCalls.set(to, { from: userId, offer, type, timestamp: Date.now() });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", { from: userId, offer, type });
    }
  });

  socket.on("call:accepted", ({ to, answer }) => {
    pendingCalls.delete(userId);
    const receiverSocketId = getReceiverSocketId(to);
    
    activeCalls.set(userId, { partnerId: to, type: "accepted", startTime: Date.now() });
    activeCalls.set(to, { partnerId: userId, type: "accepted", startTime: Date.now() });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:accepted", { from: userId, answer });
    }
  });

  socket.on("call:rejected", ({ to }) => {
    pendingCalls.delete(userId);
    saveCallLog(to, userId, "voice", "rejected");
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:rejected", { from: userId });
    }
  });

  socket.on("call:ended", ({ to, type, duration }) => {
    pendingCalls.delete(to);
    activeCalls.delete(userId);
    activeCalls.delete(to);

    if (to && userId) {
        saveCallLog(userId, to, type || "voice", "ended", duration || 0);
    }

    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ended", { from: userId });
    }
  });

  socket.on("ice:candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice:candidate", { from: userId, candidate });
    }
  });

  socket.on("call:screen-share-started", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:screen-share-started", { from: userId });
    }
  });

  socket.on("call:screen-share-stopped", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:screen-share-stopped", { from: userId });
    }
  });

  socket.on("messageSeen", async ({ senderId }) => {
    try {
      if (senderId && userId) {
        await Message.updateMany(
          { senderId, receiverId: userId, isRead: false },
          { $set: { isRead: true } }
        );

        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesRead", {
            readBy: userId,
            senderId: senderId,
          });
        }
      }
    } catch (e) {
      console.error("Error in messageSeen socket handler:", e);
    }
  });

   socket.on("disconnect", ()=>{
     console.log("A user disconnected", socket.id);
     delete userSocketMap[userId];
     io.emit("getOnlineUsers", Object.keys(userSocketMap));
   })
})

export {io, app ,server};
