import ActiveCall from "../models/activeCall.model.js";
import CallHistory from "../models/callHistory.model.js";
import User from "../models/user.model.js";

/**
 * Handles 1-to-1 WebRTC Call Signaling
 */
export default (io, socket, userId) => {
  
  // Initiating a call
  socket.on("call-user", async ({ to, offer, type }) => {
    try {
      const sender = await User.findById(userId).select("fullName profilePic");
      
      // We use rooms for user-specific routing in Redis environment instead of memory map
      socket.to(`user:${to}`).emit("incoming-call", {
        from: userId,
        senderName: sender?.fullName,
        senderPic: sender?.profilePic,
        offer,
        type,
      });

      // Save ringing state to DB
      const newCall = new ActiveCall({
        callId: `call_${Date.now()}_${userId}_${to}`,
        type: type,
        status: "ringing",
        callerId: userId,
        participants: [
          { userId: userId, status: "joined" },
          { userId: to, status: "invited" },
        ],
      });
      await newCall.save();

      // Emit back the callId to the caller
      socket.emit("call-initiated", { callId: newCall.callId });
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  });

  // Target answers the call
  socket.on("answer-call", async ({ to, answer, callId }) => {
    socket.to(`user:${to}`).emit("call-answered", { answer, from: userId });
    
    // Update DB state
    await ActiveCall.findOneAndUpdate(
      { callId, "participants.userId": userId },
      { 
        $set: { 
          "status": "ongoing",
          "participants.$.status": "joined",
          "participants.$.joinedAt": new Date()
        } 
      }
    );
  });

  // Reject / Busy
  socket.on("reject-call", async ({ to, callId }) => {
    socket.to(`user:${to}`).emit("call-rejected", { from: userId });
    
    const call = await ActiveCall.findOneAndDelete({ callId });
    if (call) {
      await new CallHistory({
        callId,
        type: call.type,
        status: "declined",
        callerId: call.callerId,
        participants: call.participants,
        startedAt: call.createdAt,
        endedAt: new Date(),
      }).save();
    }
  });

  socket.on("busy-user", ({ to }) => {
    socket.to(`user:${to}`).emit("call-busy", { from: userId });
  });

  // ICE Candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(`user:${to}`).emit("ice-candidate", { candidate, from: userId });
  });

  // End Call
  socket.on("end-call", async ({ to, callId }) => {
    socket.to(`user:${to}`).emit("call-ended", { from: userId });
    
    const call = await ActiveCall.findOneAndDelete({ callId });
    if (call) {
      const endedAt = new Date();
      const duration = Math.floor((endedAt - call.createdAt) / 1000); // seconds
      
      await new CallHistory({
        callId,
        type: call.type,
        status: "completed",
        callerId: call.callerId,
        participants: call.participants.map(p => ({
          userId: p.userId,
          duration: duration,
        })),
        startedAt: call.createdAt,
        endedAt,
        totalDuration: duration,
      }).save();
    }
  });
};
