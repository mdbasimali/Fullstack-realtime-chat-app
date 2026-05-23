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

  // Group calling WebRTC Mesh Signaling events
  const checkGroupCallRoomEmpty = (gId) => {
    setTimeout(() => {
      const callRoom = io.sockets.adapter.rooms.get(`group_call_${gId}`);
      const size = callRoom ? callRoom.size : 0;
      if (size === 0) {
        io.to(`group_${gId}`).emit("group-call:active-state", {
          groupId: gId,
          isActive: false
        });
      }
    }, 200);
  };

  // Group calling WebRTC Mesh Signaling events
  socket.on("group-call:join", ({ groupId }) => {
    socket.join(`group_call_${groupId}`);
    // Broadcast active status to the general group room
    io.to(`group_${groupId}`).emit("group-call:active-state", {
      groupId,
      isActive: true
    });
    // Notify others in the room
    socket.to(`group_call_${groupId}`).emit("group-call:user-joined", {
      userId,
      socketId: socket.id
    });
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

  socket.on("group-call:offer", ({ toSocketId, offer }) => {
    io.to(toSocketId).emit("group-call:offer", {
      fromSocketId: socket.id,
      fromUserId: userId,
      offer
    });
  });

  socket.on("group-call:answer", ({ toSocketId, answer }) => {
    io.to(toSocketId).emit("group-call:answer", {
      fromSocketId: socket.id,
      answer
    });
  });

  socket.on("group-call:ice-candidate", ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit("group-call:ice-candidate", {
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on("group-call:leave", ({ groupId }) => {
    socket.leave(`group_call_${groupId}`);
    socket.to(`group_call_${groupId}`).emit("group-call:user-left", {
      userId,
      socketId: socket.id
    });
    checkGroupCallRoomEmpty(groupId);
  });

  socket.on("disconnecting", () => {
    try {
      for (const room of socket.rooms) {
        if (room.startsWith("group_call_")) {
          const groupId = room.replace("group_call_", "");
          socket.to(room).emit("group-call:user-left", {
            userId,
            socketId: socket.id
          });
          checkGroupCallRoomEmpty(groupId);
        }
      }
    } catch (err) {
      console.error("Error in disconnecting handler:", err);
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
