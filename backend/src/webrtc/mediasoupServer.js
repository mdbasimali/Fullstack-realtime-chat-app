import mediasoup from "mediasoup";
import os from "os";

// Worker pool to distribute load across CPU cores
const workers = [];
let nextWorkerIdx = 0;

export const config = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: "warn",
    logTags: [
      "info",
      "ice",
      "dtls",
      "rtp",
      "srtp",
      "rtcp",
    ],
  },
  router: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        },
      },
      {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "42e01f",
          "level-asymmetry-allowed": 1,
          "x-google-start-bitrate": 1000,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1", // Must be set to public IP in production
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000, // 1Mbps
  },
};

/**
 * Initialize Mediasoup Workers based on CPU cores
 */
export const startMediasoupWorkers = async () => {
  const numWorkers = os.cpus().length;
  console.log(`Starting ${numWorkers} Mediasoup workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on("died", () => {
      console.error(`Mediasoup Worker ${worker.pid} died. Exiting process in 2 seconds...`);
      setTimeout(() => process.exit(1), 2000); // Fail-fast approach, PM2 will restart
    });

    workers.push(worker);
  }
};

/**
 * Load balancer: Get the next available worker in a round-robin fashion
 */
export const getNextWorker = () => {
  if (workers.length === 0) {
    throw new Error("No Mediasoup workers available");
  }
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
};

/**
 * Creates a new Room (Router) on the least loaded worker
 */
export const createRouter = async () => {
  const worker = getNextWorker();
  const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
  return router;
};
