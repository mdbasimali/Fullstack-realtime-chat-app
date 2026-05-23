import {Server} from"socket.io";
import http from "http";
import express from "express";
import webpush from "web-push";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "../redis/redisClient.js";
import callHandler from "../socket/callHandler.js";
import groupHandler from "../socket/groupHandler.js";

const app=express();
const server = http.createServer(app);

const io =new Server(server,{
    cors:{
        origin: ["http://localhost:5173", "http://localhost:5174", "https://fullstack-realtime-chat-app-sooty.vercel.app", "https://chatzone.cloudnexis.in"]
    },
});

if (pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.IO Redis Adapter configured.");
}

const userSocketMap = {}; // {userId: socketId}
export const activeCalls = new Map(); // {userId: {partnerId, type, startTime}}
const pendingCalls = new Map(); // {userId: {from, offer, type, timestamp}}
export const qrSessions = new Map(); // { sessionId: { socketId, createdAt } }

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

     socket.on("qr:request-session", () => {
       const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
       qrSessions.set(sessionId, {
         socketId: socket.id,
         createdAt: Date.now()
       });
       socket.emit("qr:session", sessionId);
     });

    // Join a personal room for distributed 1-to-1 signaling
    socket.join(`user:${userId}`);

    // Register handlers
    callHandler(io, socket, userId);
    groupHandler(io, socket, userId);

  socket.on("markMessagesAsRead", async ({ senderId }) => {
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

  // Group rooms listeners for secure, real-time message broadcasting
  socket.on("group:join-rooms", (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach((id) => {
        socket.join(`group_${id}`);
      });
    }
  });

  socket.on("group:join-room", (groupId) => {
    if (groupId) {
      socket.join(`group_${groupId}`);
    }
  });

  socket.on("group:leave-room", (groupId) => {
    if (groupId) {
      socket.leave(`group_${groupId}`);
    }
  });


  socket.on("group-call:invite", async ({ groupId, invitedUserIds, callType }) => {
    try {
      const sender = await User.findById(userId).select("fullName profilePic");
      invitedUserIds.forEach(uId => {
        const targetSocketId = getReceiverSocketId(uId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("group-call:incoming-invite", {
            groupId,
            fromUserId: userId,
            fromUserName: sender?.fullName || "Someone",
            fromUserPic: sender?.profilePic,
            callType
          });
        }

        sendPushNotification(uId, {
          title: `Group ${callType} Call`,
          body: `${sender?.fullName || "Someone"} invited you to join a call`,
          data: {
            type: "group_call_invite",
            groupId,
            callType,
            fromUserId: userId
          }
        });
      });
    } catch (err) {
      console.error("Error in group-call:invite handler:", err);
    }
  });


   socket.on("disconnect", ()=>{
      for (const [sessionId, session] of qrSessions.entries()) {
        if (session.socketId === socket.id) {
          qrSessions.delete(sessionId);
        }
      }
     console.log("A user disconnected", socket.id);
     delete userSocketMap[userId];
     io.emit("getOnlineUsers", Object.keys(userSocketMap));
   })
})

export {io, app ,server};
