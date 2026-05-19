import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async () => {
  try {
    // Set DNS servers to Google DNS to fix querySrv ECONNREFUSED on Windows
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,             // Maintain up to 50 socket connections
      minPoolSize: 10,             // Keep at least 10 connections open
      socketTimeoutMS: 45000,      // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoBD connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};

