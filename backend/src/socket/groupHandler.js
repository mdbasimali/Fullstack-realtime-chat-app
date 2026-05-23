import { getOrCreateRoom, createWebRtcTransport, removePeerFromRoom, rooms } from "../webrtc/roomManager.js";

/**
 * Handles Mediasoup Group Call Signaling
 */
export default (io, socket, userId) => {
  
  // 1. Join or Create SFU Room
  socket.on("join-room", async ({ roomId }, callback) => {
    try {
      const room = await getOrCreateRoom(roomId);
      socket.join(roomId);

      // Initialize peer structure if not exists
      if (!room.peers.has(socket.id)) {
        room.peers.set(socket.id, {
          userId,
          transports: new Map(),
          producers: new Map(),
          consumers: new Map(),
        });
      }

      // Return RTP Capabilities to the client so it knows what codecs are supported
      const rtpCapabilities = room.router.rtpCapabilities;
      callback({ rtpCapabilities });

      // Notify others in room
      socket.to(roomId).emit("participant-joined", { userId, socketId: socket.id });
    } catch (error) {
      console.error("Error joining room:", error);
      callback({ error: error.message });
    }
  });

  // 2. Create WebRTC Transport (Send or Receive)
  socket.on("create-transport", async ({ roomId, direction }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) throw new Error("Room not found");

      const transport = await createWebRtcTransport(room.router);
      
      const peer = room.peers.get(socket.id);
      peer.transports.set(transport.id, transport);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (error) {
      console.error("Error creating transport:", error);
      callback({ error: error.message });
    }
  });

  // 3. Connect WebRTC Transport (DTLS Handshake)
  socket.on("connect-transport", async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(roomId);
      const peer = room.peers.get(socket.id);
      const transport = peer.transports.get(transportId);

      await transport.connect({ dtlsParameters });
      callback({ success: true });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // 4. Produce Track (Send Audio/Video)
  socket.on("produce-track", async ({ roomId, transportId, kind, rtpParameters }, callback) => {
    try {
      const room = rooms.get(roomId);
      const peer = room.peers.get(socket.id);
      const transport = peer.transports.get(transportId);

      const producer = await transport.produce({ kind, rtpParameters });
      peer.producers.set(producer.id, producer);

      // Tell others in the room there is a new producer they can consume
      socket.to(roomId).emit("new-producer", {
        producerId: producer.id,
        socketId: socket.id,
        userId,
        kind,
      });

      callback({ id: producer.id });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // 5. Consume Track (Receive Audio/Video)
  socket.on("consume-track", async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(roomId);
      const peer = room.peers.get(socket.id);
      const transport = peer.transports.get(transportId);

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error("Cannot consume");
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused to wait for client to attach track
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on("transportclose", () => {
        peer.consumers.delete(consumer.id);
      });
      consumer.on("producerclose", () => {
        peer.consumers.delete(consumer.id);
        socket.emit("consumer-closed", { consumerId: consumer.id });
      });

      callback({
        id: consumer.id,
        producerId: producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // 6. Resume Consumer
  socket.on("resume-consumer", async ({ roomId, consumerId }, callback) => {
    try {
      const room = rooms.get(roomId);
      const peer = room.peers.get(socket.id);
      const consumer = peer.consumers.get(consumerId);
      
      await consumer.resume();
      callback({ success: true });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // 7. Cleanup on Disconnect or Leave
  socket.on("leave-room", ({ roomId }) => {
    removePeerFromRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("participant-left", { userId, socketId: socket.id });
  });

  socket.on("disconnect", () => {
    // Find rooms this socket is in and clean them up
    for (const [roomId, room] of rooms.entries()) {
      if (room.peers.has(socket.id)) {
        removePeerFromRoom(roomId, socket.id);
        socket.to(roomId).emit("participant-left", { userId, socketId: socket.id });
      }
    }
  });
};
