import { createRouter, config } from "./mediasoupServer.js";

// In-memory registry for SFU rooms and peers
// Format: roomId -> { router, peers: { socketId: { transport, producers[], consumers[] } } }
export const rooms = new Map();

/**
 * Creates a room and its associated router if it doesn't exist
 */
export const getOrCreateRoom = async (roomId) => {
  let room = rooms.get(roomId);
  if (!room) {
    const router = await createRouter();
    room = {
      router,
      peers: new Map(),
    };
    rooms.set(roomId, room);
    console.log(`Created SFU Room: ${roomId}`);
  }
  return room;
};

/**
 * Creates a WebRTC Transport for a peer
 */
export const createWebRtcTransport = async (router) => {
  const { listenIps, initialAvailableOutgoingBitrate, enableUdp, enableTcp, preferUdp } = config.webRtcTransport;

  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp,
    enableTcp,
    preferUdp,
    initialAvailableOutgoingBitrate,
  });

  transport.on("dtlsstatechange", (dtlsState) => {
    if (dtlsState === "closed" || dtlsState === "failed") {
      transport.close();
    }
  });

  transport.on("routerclose", () => {
    transport.close();
  });

  return transport;
};

/**
 * Cleans up a peer's resources (transports, producers, consumers)
 */
export const removePeerFromRoom = (roomId, socketId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  const peer = room.peers.get(socketId);
  if (peer) {
    console.log(`Cleaning up peer ${socketId} from room ${roomId}`);
    peer.transports.forEach(t => t.close());
    // Closing transport automatically closes producers/consumers associated with it
    room.peers.delete(socketId);
  }

  // If room is empty, close router to prevent memory leak
  if (room.peers.size === 0) {
    console.log(`Room ${roomId} is empty. Closing router.`);
    room.router.close();
    rooms.delete(roomId);
  }
};
