import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import {io} from "socket.io-client";
import { App } from "@capacitor/app";
import toast from "react-hot-toast";
import { useChatstore } from "./useChatStore";

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
  isAppLocked: false,
  isVerifyingPin: false,
  isBiometricsEnabled: localStorage.getItem("biometrics_enabled") === "true",
  _hasInitializedLockListener: false,
  _lastBackgroundTime: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }
      set({ authUser: res.data });
      useChatstore.getState().setCurrentUserId(res.data._id);
      get().connectSocket();
      get().setupPushNotifications();
      get().initializeE2EE(res.data);
    } catch (error) {
      set({ authUser: null });
      useChatstore.getState().clearChatStore();
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
      useChatstore.getState().setCurrentUserId(res.data._id);
      get().connectSocket();
      get().initializeE2EE(res.data);
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
      useChatstore.getState().setCurrentUserId(res.data._id);
      get().connectSocket();
      get().initializeE2EE(res.data);
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
      useChatstore.getState().setCurrentUserId(res.data._id);
      get().connectSocket();
      get().setupPushNotifications();
      get().initializeE2EE(res.data);
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
      useChatstore.getState().setCurrentUserId(res.data._id);
      get().connectSocket();
      get().setupPushNotifications();
      get().initializeE2EE(res.data);
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
      get().disconnectSocket();
      useChatstore.getState().clearChatStore();
      const { clearInMemoryPrivateKey } = await import("../lib/crypto");
      clearInMemoryPrivateKey();
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  initializeE2EE: async (user, forceReset = false, newPin = null) => {
    try {
      const { generateECDHKeyPair, getMyPrivateKey, saveMyPrivateKey, wrapPrivateKey } = await import("../lib/crypto");
      let privateKeyJwk = await getMyPrivateKey(user._id);
      
      // Only generate new pair if explicitly forcing a reset, or if the server has no public key for this user (first signup)
      if (forceReset || !user.publicKey) {
        console.log("Generating new E2EE keys...");
        const keys = await generateECDHKeyPair();
        
        if (newPin || user.pin) {
          // If a PIN is provided or exists, wrap the new key immediately
          const wrapped = await wrapPrivateKey(keys.privateKeyJwk, newPin || "legacy");
          await saveMyPrivateKey(user._id, wrapped);
        } else {
          // Fallback to legacy
          await saveMyPrivateKey(user._id, keys.privateKeyJwk);
        }
        
        // Upload public key to server
        await axiosInstance.put("/auth/keys", { publicKey: keys.publicKeyJwk });
        
        set((state) => ({ authUser: { ...state.authUser, publicKey: keys.publicKeyJwk } }));
      } else if (!privateKeyJwk && user.publicKey) {
        console.warn("No local private key found, but public key exists on server. Old messages cannot be decrypted until keys are synced or session is reset.");
      }
    } catch (error) {
      console.error("E2EE Initialization failed:", error);
    }
  },

  resetSecureSession: async () => {
    const user = get().authUser;
    if (!user) return;
    await get().initializeE2EE(user, true);
    toast.success("Secure session reset successfully.");
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

  createPin: async (pin) => {
    try {
      const res = await axiosInstance.put("/auth/create-pin", { pin });
      set((state) => ({ 
        authUser: state.authUser ? { ...state.authUser, pin: "enabled" } : null 
      }));
      
      const authUser = get().authUser;
      if (authUser) {
        const { getStoredPrivateKeyRaw, wrapPrivateKey, saveMyPrivateKey, setInMemoryPrivateKey } = await import("../lib/crypto");
        const storedKey = await getStoredPrivateKeyRaw(authUser._id);
        
        // If we have a legacy plaintext key, wrap it immediately with the new PIN!
        if (storedKey && !storedKey.isWrapped) {
          const wrapped = await wrapPrivateKey(storedKey, pin);
          await saveMyPrivateKey(authUser._id, wrapped);
          setInMemoryPrivateKey(storedKey); // keep it unlocked in memory
          toast.success("Local messages secured with PIN.");
        } else if (!storedKey) {
          // If no key exists, initialize it with the PIN
          await get().initializeE2EE(authUser, true, pin);
        }
      }

      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Error creating PIN:", error);
      return { success: false, error: error?.response?.data?.message || "Failed to create PIN" };
    }
  },

  changePin: async (oldPin, newPin) => {
    try {
      const res = await axiosInstance.put("/auth/change-pin", { oldPin, newPin });
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Error changing PIN:", error);
      return { success: false, error: error?.response?.data?.message || "Failed to change PIN" };
    }
  },

  checkUsername: async (username) => {
    try {
      const res = await axiosInstance.get(`/auth/check-username?username=${username}`);
      return res.data;
    } catch (error) {
      console.error("Error in checkUsername:", error);
      return { available: false, message: error?.response?.data?.message || "Error checking username" };
    }
  },

  verifyPin: async (pin) => {
    set({ isVerifyingPin: true });
    try {
      const authUser = get().authUser;
      if (!authUser) throw new Error("Not authenticated");

      const { getStoredPrivateKeyRaw, unwrapPrivateKey, setInMemoryPrivateKey } = await import("../lib/crypto");
      const storedBundle = await getStoredPrivateKeyRaw(authUser._id);

      if (storedBundle && storedBundle.isWrapped) {
        try {
          const decryptedJwk = await unwrapPrivateKey(storedBundle, pin);
          setInMemoryPrivateKey(decryptedJwk);
        } catch (cryptoErr) {
          throw new Error("Incorrect local decryption PIN");
        }
      }

      // We still verify with the server for auth completeness
      const res = await axiosInstance.post("/auth/verify-pin", { pin });
      set({ isAppLocked: false });
      
      // Trigger re-decryption of messages now that memory key is available
      const chatStore = useChatstore.getState();
      chatStore.clearMessageCache();
      chatStore.getUsers();
      if (chatStore.selectedUser) {
        chatStore.getMessages(chatStore.selectedUser._id);
      }
      
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Error verifying PIN:", error);
      return { success: false, error: error?.response?.data?.message || error.message || "Incorrect PIN" };
    } finally {
      set({ isVerifyingPin: false });
    }
  },

  deleteAccount: async (pin) => {
    try {
      const res = await axiosInstance.post("/auth/delete-account", { pin });
      // The controller handles the socket forceLogout which will clean up state,
      // but we can proactively clear it here.
      set({ authUser: null, isAppLocked: false });
      localStorage.removeItem("token");
      get().disconnectSocket();
      useChatstore.getState().clearChatStore();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    }
  },

  initAppLockListener: () => {
    if (get()._hasInitializedLockListener) return;
    set({ _hasInitializedLockListener: true });

    const LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    // Listen for Web Visibility API (triggers on minimize/tab switch)
    document.addEventListener("visibilitychange", async () => {
      const authUser = get().authUser;
      if (document.visibilityState === "hidden") {
        // Record the time when app goes to background
        set({ _lastBackgroundTime: Date.now() });
      } else if (document.visibilityState === "visible") {
        // Check if 3 minutes have passed since it went to background
        const lastTime = get()._lastBackgroundTime;
        if (lastTime && (Date.now() - lastTime >= LOCK_TIMEOUT_MS)) {
          if (authUser && authUser.pin) {
            set({ isAppLocked: true });
            const { clearInMemoryPrivateKey } = await import("../lib/crypto");
            clearInMemoryPrivateKey();
          }
        }
        set({ _lastBackgroundTime: null });
      }
    });

    // Listen for Capacitor App State
    try {
      App.addListener("appStateChange", async ({ isActive }) => {
        const authUser = get().authUser;
        if (!isActive) {
          set({ _lastBackgroundTime: Date.now() });
        } else {
          const lastTime = get()._lastBackgroundTime;
          if (lastTime && (Date.now() - lastTime >= LOCK_TIMEOUT_MS)) {
            if (authUser && authUser.pin) {
              set({ isAppLocked: true });
              const { clearInMemoryPrivateKey } = await import("../lib/crypto");
              clearInMemoryPrivateKey();
            }
          }
          set({ _lastBackgroundTime: null });
        }
      });
    } catch (e) {
      console.log("Capacitor App plugin not active");
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
    if(!authUser || get().socket)return; // Avoid recreating if socket already exists

    const socket = io(BASE_URL,{
      query:{
        userId:authUser._id,
      },
      autoConnect: false, // Prevent race condition with React useEffect
    });

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

    socket.on("conversationDeleted", (userId) => {
      useChatstore.getState().removeConversationFromCache(userId);
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
