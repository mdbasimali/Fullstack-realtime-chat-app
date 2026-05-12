import {Server} from"socket.io";
import http from "http";
import express from "express";
import webpush from "web-push";
import User from "../models/user.model.js";



const app=express();
const server = http.createServer(app);


const io =new Server(server,{
    cors:{
        origin: ["http://localhost:5173", "http://localhost:5174", "https://fullstack-realtime-chat-app-sooty.vercel.app", "https://chatzone.cloudnexis.in"]
    },
});

export function getReceiverSocketId(userId){
    return userSocketMap[userId]
}

async function sendPushNotification(userId, data) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

        const payload = JSON.stringify(data);

        const pushPromises = user.pushSubscriptions.map(sub => 
            webpush.sendNotification(sub, payload, {
                TTL: 60, // 1 minute TTL for calls
                urgency: "high",
            }).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                    return User.findByIdAndUpdate(userId, {
                        $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
                    });
                }
                console.error("Error sending push notification:", err);
            })
        );

        await Promise.all(pushPromises);
    } catch (error) {
        console.error("Error in sendPushNotification:", error);
    }
}

//used to store  online users
const userSocketMap={};//{userId:socketId}

io.on("connection", (socket) =>{
   console.log("A user connected", socket.id);
   const userId = socket.handshake.query.userId;
   if(userId)userSocketMap[userId]=socket.id

  //io.emit() is used to send events to all the connected clients
   io.emit("getOnlineUsers",Object.keys(userSocketMap));

  // ✅ Video Call Signaling Logic

  // Caller sends offer to callee
  socket.on("call:user", async ({ to, offer, type }) => {
    const receiverSocketId = getReceiverSocketId(to);
    
    // Always send push notification if we have a token, so they get it even if tab is in background/throttled
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
        },
        actions: [
            { action: "answer", title: "Answer" },
            { action: "decline", title: "Decline" }
        ]
    });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", { from: userId, offer, type });
    }
  });

  // Callee sends answer back to caller
  socket.on("call:accepted", ({ to, answer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:accepted", { from: userId, answer });
    }
  });

  // Callee rejects the call
  socket.on("call:rejected", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:rejected", { from: userId });
    }
  });

  // Either party ends the call
  socket.on("call:ended", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ended", { from: userId });
    }
  });

  // Exchange ICE candidates
  socket.on("ice:candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice:candidate", { from: userId, candidate });
    }
  });


//disconnect logic
   socket.on("disconnect", ()=>{
     console.log("A user disconnected", socket.id);
     delete userSocketMap[userId];
     io.emit("getOnlineUsers", Object.keys(userSocketMap));
   })
})


export {io, app ,server};

