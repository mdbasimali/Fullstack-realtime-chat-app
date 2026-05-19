import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import {io} from "socket.io-client";
// import { Users } from "lucide-react";

const getBaseURL = () => {
  if (import.meta.env.MODE !== "development") {
    return "https://chatzone-backend-c0mn.onrender.com";
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${hostname}:5001`;
};

const BASE_URL = getBaseURL();

export const useAuthStore = create((set,get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers:[],
  socket:null,
  linkedDevices: [],
  isFetchingDevices: false,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }
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
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true, user: res.data };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error?.response?.data?.message || "Signup failed" };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true, user: res.data };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error?.response?.data?.message || "Login failed" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  googleLogin: async (credential) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/google", { credential });
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      get().connectSocket();
      get().setupPushNotifications();
      return { success: true, user: res.data };
    } catch (error) {
      console.error("Google Auth error:", error);
      return { success: false, error: error?.response?.data?.message || "Google Authentication failed" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  firebaseLogin: async (idToken) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/firebase-login", { idToken });
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      get().connectSocket();
      get().setupPushNotifications();
      return { success: true, user: res.data };
    } catch (error) {
      console.error("Firebase Login error:", error);
      return { success: false, error: error?.response?.data?.message || "Firebase OTP Authentication failed" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("token");
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

  getLinkedDevices: async () => {
    set({ isFetchingDevices: true });
    try {
      const res = await axiosInstance.get("/auth/linked-devices");
      set({ linkedDevices: res.data });
    } catch (error) {
      console.error("Error fetching linked devices:", error);
    } finally {
      set({ isFetchingDevices: false });
    }
  },

  revokeDevice: async (sessionId) => {
    try {
      await axiosInstance.delete(`/auth/linked-devices/${sessionId}`);
      const { linkedDevices } = get();
      set({ linkedDevices: linkedDevices.filter(d => d.sessionId !== sessionId) });
      return { success: true };
    } catch (error) {
      console.error("Error revoking device:", error);
      return { success: false, error: error?.response?.data?.message || "Failed to revoke session" };
    }
  },

  linkDevice: async (sessionId) => {
    try {
      const userAgent = navigator.userAgent;
      let os = "Unknown OS";
      if (userAgent.indexOf("Win") !== -1) os = "Windows";
      if (userAgent.indexOf("Mac") !== -1) os = "macOS";
      if (userAgent.indexOf("Linux") !== -1) os = "Linux";
      if (userAgent.indexOf("Android") !== -1) os = "Android";
      if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

      let browser = "Unknown Browser";
      if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
      if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1) browser = "Safari";
      if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
      if (userAgent.indexOf("Edge") !== -1) browser = "Edge";

      const deviceName = `${browser} on ${os}`;

      const res = await axiosInstance.post("/auth/link-device", {
        sessionId,
        deviceName,
        browser,
        os
      });
      return res.data;
    } catch (error) {
      console.error("Error in linkDevice:", error);
      throw error?.response?.data?.message || "Failed to link device";
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

    socket.on("session:revoked", ({ sessionId }) => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload && payload.sessionId === sessionId) {
            localStorage.removeItem("token");
            set({ authUser: null });
            socket.disconnect();
            window.location.reload();
          }
        } catch (e) {
          console.error("Error parsing JWT for session check:", e);
        }
      }
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
