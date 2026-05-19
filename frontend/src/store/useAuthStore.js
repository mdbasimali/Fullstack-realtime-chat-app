import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import {io} from "socket.io-client";
// import { Users } from "lucide-react";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "https://chatzone-backend-c0mn.onrender.com";

export const useAuthStore = create((set,get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers:[],
  socket:null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
      get().setupPushNotifications();
    } catch (error) {
      set({ authUser: null });
      console.log("Error in checkAuth:", error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      get().connectSocket();

    } catch (error) {
      console.error("Login error:", error);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      get().disconnectSocket()
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
    } catch (error) {
      console.log("error in update profile:", error);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },


  connectSocket:()=>{
    const {authUser}=get()
    if(!authUser || get().socket?.connected)return;

    const socket = io(BASE_URL,{
      query:{
        userId:authUser._id,
      },
    });
    socket.connect();

    set({socket:socket});
    socket.on("getOnlineUsers", (userIds)=>{
      set({onlineUsers:userIds})
    });
  },


  disconnectSocket:()=>{
    if(get().socket?.connected) get().socket.disconnect();
  },

  setupPushNotifications: async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered");

      // Check for permission
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") return;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BH1ZlBiN1Wl58dEAfBeg5_Up-WJGMjSFAfuC1iaw5NUMqIWVB0ZjmCzOeulWTuYXJrv_UxrolQOQmJVloyxOk2k",
      });

      await axiosInstance.post("/push/subscribe", subscription);
      console.log("Push subscription successful");
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  },

}));
