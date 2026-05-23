import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let pubClient = null;
let subClient = null;
let redisClient = null; // Standard client for get/set operations

if (process.env.REDIS_URL) {
  console.log("Connecting to Redis for scalable Socket.IO...");
  
  pubClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by some libraries
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  subClient = pubClient.duplicate();
  redisClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis PubClient Error", err));
  subClient.on("error", (err) => console.error("Redis SubClient Error", err));
  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  pubClient.on("connect", () => console.log("Redis PubClient Connected"));
} else {
  console.warn("WARNING: REDIS_URL not provided. Socket.io will use in-memory adapter (No multi-server scaling).");
}

export { pubClient, subClient, redisClient };
