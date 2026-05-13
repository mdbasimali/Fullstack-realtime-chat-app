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

        console.log(`Sending push notification to user ${userId} with ${user.pushSubscriptions.length} subscriptions`);
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

        // Notify both parties to update their UI
        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);
        if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);
        
        return newMessage;
    } catch (error) {
        console.error("Error saving call log:", error);
    }
}

//used to store  online users
const userSocketMap={};//{userId:socketId}
const pendingCalls = new Map(); // {userId: {from, offer, type, timestamp}}

io.on("connection", (socket) =>{
   console.log("A user connected", socket.id);
   const userId = socket.handshake.query.userId;
   if(userId) {
       userSocketMap[userId]=socket.id;
       
       // Check for pending calls for this user
       if (pendingCalls.has(userId)) {
           const call = pendingCalls.get(userId);
           // Only re-emit if call is less than 45 seconds old
           if (Date.now() - call.timestamp < 45000) {
               socket.emit("call:incoming", { from: call.from, offer: call.offer, type: call.type });
           }
           pendingCalls.delete(userId);
       }
   }

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

    // Always store call as pending for re-sync (in case user reloads or clicks notification)
    pendingCalls.set(to, { from: userId, offer, type, timestamp: Date.now() });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", { from: userId, offer, type });
    }
  });

  // Callee sends answer back to caller
  socket.on("call:accepted", ({ to, answer }) => {
    pendingCalls.delete(userId); // Clear pending call for callee
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:accepted", { from: userId, answer });
    }
  });

  // Callee rejects the call
  socket.on("call:rejected", ({ to }) => {
    pendingCalls.delete(userId); // Clear pending call for callee
    
    // Log as missed call
    saveCallLog(to, userId, "voice", "rejected"); // 'to' is the original caller

    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:rejected", { from: userId });
    }
  });

  // Either party ends the call
  socket.on("call:ended", ({ to, type, duration }) => {
    pendingCalls.delete(to); // Clear pending call if it was ended
    
    // Log call as ended with duration
    if (to && userId) {
        saveCallLog(userId, to, type || "voice", "ended", duration || 0);
    }

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

  // Relay Screen Share Status
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

  // Real-time Message Seen/Read Event
  socket.on("messageSeen", async ({ senderId }) => {
    try {
      if (senderId && userId) {
        // Mark all unread messages from this sender to current user as read
        await Message.updateMany(
          { senderId, receiverId: userId, isRead: false },
          { $set: { isRead: true } }
        );

        // Notify the sender that their messages to this user have been read
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


//disconnect logic
   socket.on("disconnect", ()=>{
     console.log("A user disconnected", socket.id);
     delete userSocketMap[userId];
     io.emit("getOnlineUsers", Object.keys(userSocketMap));
   })
})


export {io, app ,server};

