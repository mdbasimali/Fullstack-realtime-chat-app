import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async () => {
  try {
    // Set DNS servers to Google DNS to fix querySrv ECONNREFUSED on Windows
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoBD connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};

