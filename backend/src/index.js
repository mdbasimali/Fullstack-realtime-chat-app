import express from "express";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import pushRoutes from "./routes/push.route.js";
import { app, server} from "./lib/socket.js";
import webpush from "web-push";

app.set("trust proxy", 1); // Required for secure cookies on Render/Vercel


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
app.use(express.json({ limit: "50mb" }));//main image ka high quality se upload krn ake liye ye  use kiya
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());
app.use(cors({
     origin: ["http://localhost:5173", "http://localhost:5174", "https://fullstack-realtime-chat-app-sooty.vercel.app", "https://chatzone.cloudnexis.in"],
     credentials: true,
}));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/push", pushRoutes);

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*",(req,res)=>{
      res.sendFile(path.join(__dirname, "../frontend", "dist" , "index.html"));

    })
}

server.listen(PORT, ()=>{
    console.log("server is running on PORT:" + PORT);
    connectDB();
});