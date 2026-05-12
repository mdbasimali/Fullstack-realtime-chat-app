import {Server} from"socket.io";
import http from "http";
import express from "express";



const app=express();
const server = http.createServer(app);


const io =new Server(server,{
    cors:{
        origin: ["http://localhost:5173"]

    },
});

export function getReceiverSocketId(userId){
    return userSocketMap[userId]
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
  socket.on("call:user", ({ to, offer, type }) => {
    const receiverSocketId = getReceiverSocketId(to);
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

