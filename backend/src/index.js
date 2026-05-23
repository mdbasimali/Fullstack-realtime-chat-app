import express from "express";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import pushRoutes from "./routes/push.route.js";
import storyRoutes from "./routes/story.route.js";
import groupRoutes from "./routes/group.route.js";
import settingsRoutes from "./routes/settings.route.js";
import storySettingsRoutes from "./routes/storySettings.route.js";
import { app, server} from "./lib/socket.js";
import webpush from "web-push";
import { startMediasoupWorkers } from "./webrtc/mediasoupServer.js";

app.set("trust proxy", 1); // Required for secure cookies on Render/Vercel

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://fullstack-realtime-chat-app-sooty.vercel.app",
  "https://chatzone.cloudnexis.in",
  "https://accounts.google.com"
];

// CORS Middleware (Should be at the top to ensure headers are always present)
app.use((req, res, next) => {
  if (req.path === "/api/auth/google-redirect") {
    return next();
  }
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("http://172.") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })(req, res, next);
});

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Payload Compression
app.use(compression());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 5000 : 150, // Higher limit for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", apiLimiter);

dotenv.config()

webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);


const PORT=process.env.PORT;
const __dirname = path.resolve(); //dirname

// app.use(express.json());
// ❌ ye line hata do
// app.use(express.json());

// ✅ iske jagah ye use karo
app.use(express.json({ limit: "200mb" })); // 200mb to handle base64-encoded video uploads
app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/push", pushRoutes);
    app.use("/api/stories", storyRoutes);
    app.use("/api/groups", groupRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/story-settings", storySettingsRoutes);

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*",(req,res)=>{
      res.sendFile(path.join(__dirname, "../frontend", "dist" , "index.html"));

    })
}

server.listen(PORT, async ()=>{
    console.log("server is running on PORT:" + PORT);
    connectDB();
    try {
        await startMediasoupWorkers();
    } catch (e) {
        console.error("Failed to start Mediasoup workers:", e);
    }
});