import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import Redis from "ioredis";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const wipeDatabase = async () => {
  try {
    console.log("Starting full application wipe...");

    // 1. Wipe Redis
    if (process.env.REDIS_URL) {
      console.log("Connecting to Redis...");
      const redis = new Redis(process.env.REDIS_URL);
      await redis.flushall();
      console.log("✅ Redis successfully flushed.");
      redis.disconnect();
    }

    // 2. Wipe MongoDB
    if (process.env.MONGODB_URI) {
      console.log("Connecting to MongoDB...");
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
      await mongoose.connect(process.env.MONGODB_URI);
      const collections = await mongoose.connection.db.collections();
      for (let collection of collections) {
        await collection.drop();
        console.log(`✅ Dropped collection: ${collection.collectionName}`);
      }
      await mongoose.disconnect();
      console.log("✅ MongoDB successfully wiped.");
    }

    // 3. Wipe Cloudinary (optional but requested)
    console.log("Wiping Cloudinary resources (this might take a moment)...");
    try {
      // NOTE: For some free tiers, delete_all_resources is restricted. We will attempt it.
      const result = await cloudinary.api.delete_all_resources({ resource_type: "image" });
      const rawResult = await cloudinary.api.delete_all_resources({ resource_type: "raw" });
      const videoResult = await cloudinary.api.delete_all_resources({ resource_type: "video" });
      console.log("✅ Cloudinary images wiped:", result);
      console.log("✅ Cloudinary raw (E2EE) wiped:", rawResult);
      console.log("✅ Cloudinary videos wiped:", videoResult);
    } catch (cErr) {
      console.warn("⚠️ Cloudinary wipe had a warning/error (could be permission or empty):", cErr.message);
    }

    console.log("🎉 Complete Wipe Successful!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during wipe:", error);
    process.exit(1);
  }
};

wipeDatabase();
