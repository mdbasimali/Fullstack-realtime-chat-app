import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useChatstore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { Loader } from "lucide-react"
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import CallModal from "./components/CallModal";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// Lazy load pages for faster initial load
const HomePage = React.lazy(() => import("./pages/HomePage"));
const SignUpPage = React.lazy(() => import("./pages/SignUpPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const LinkedDevicesPage = React.lazy(() => import("./pages/LinkedDevicesPage"));
// import axios from "axios";

const App = () => {
  const {authUser,checkAuth,isCheckingAuth,onlineUsers}=useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedUser, setSelectedUser } = useChatstore();

  // Extract Google redirect token synchronously on initial load to avoid race conditions
  const queryParams = new URLSearchParams(window.location.search);
  const redirectToken = queryParams.get("token");
  if (redirectToken) {
    localStorage.setItem("token", redirectToken);
  }

  console.log({onlineUsers});

  // Handle native Android hardware back button & system navigation gesture swipes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupBackButton = async () => {
      const backListener = await CapApp.addListener("backButton", (data) => {
        const { isInCall, isMinimized, setIsMinimized } = useCallStore.getState();

        // If in an active call, always prioritize minimizing it
        if (isInCall && !isMinimized) {
          setIsMinimized(true);
          return;
        }

        const currentPath = window.location.pathname;
        if (currentPath === "/") {
          const { selectedUser, activeTab } = useChatstore.getState();
          
          if (selectedUser) {
            useChatstore.getState().setSelectedUser(null);
          } else if (activeTab !== "chats") {
            useChatstore.getState().setActiveTab("chats");
          } else {
            // Only exit if NO active call
            if (!isInCall) {
              CapApp.exitApp();
            }
          }
        } else if (currentPath === "/settings" || currentPath === "/profile") {
          navigate("/");
        } else {
          if (data.canGoBack) {
            window.history.back();
          } else if (!isInCall) {
            CapApp.exitApp();
          }
        }
      });
      return listener;
    };

    const listenerPromise = setupBackButton();

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);

  useEffect(()=>{
    checkAuth();
  },[checkAuth]);

  const { socket } = useAuthStore();
  const { 
    handleIncomingCall, 
    handleCallAccepted, 
    handleCallRejected, 
    handleCallEnded, 
    handleIceCandidate,
    handleScreenShareStarted,
    handleScreenShareStopped,
    handleActiveSync,
  } = useCallStore();

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("ice:candidate", handleIceCandidate);
    socket.on("call:screen-share-started", handleScreenShareStarted);
    socket.on("call:screen-share-stopped", handleScreenShareStopped);
    socket.on("call:active-sync", handleActiveSync);

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("ice:candidate");
      socket.off("call:screen-share-started");
      socket.off("call:screen-share-stopped");
      socket.off("call:active-sync");
    };
  }, [socket, handleIncomingCall, handleCallAccepted, handleCallRejected, handleCallEnded, handleIceCandidate, handleScreenShareStarted, handleScreenShareStopped, handleActiveSync]);

  // Subscribe to global group events
  useEffect(() => {
    if (!socket) return;

    const handleGroupCreated = (newGroup) => {
      const { groups } = useGroupStore.getState();
      if (!groups.some(g => g._id === newGroup._id)) {
        useGroupStore.setState({ groups: [newGroup, ...groups] });
      }
      
      // Auto-subscribe the socket to the new group's room
      socket.emit("group:join-room", newGroup._id);
    };

    socket.on("groupCreated", handleGroupCreated);

    return () => {
      socket.off("groupCreated", handleGroupCreated);
    };
  }, [socket]);

  // Warn user before refresh during a call
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const { isInCall } = useCallStore.getState();
      if (isInCall) {
        e.preventDefault();
        e.returnValue = "You are in an active call. Refreshing will disconnect you.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("call") === "true") {
      // The socket connection will automatically trigger the 'call:incoming' 
      // event via the backend's new pendingCalls re-sync logic.
      
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }

    if (params.get("trigger_sync") === "true") {
      localStorage.setItem("trigger_contact_sync", "true");
      import("react-hot-toast").then(({ default: toast }) => {
        toast.success("Welcome to ChatZone!");
      });
      window.history.replaceState({}, document.title, "/");
    }

    const code = params.get("code");
    if (code && authUser) {
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
      
      const performJoin = async () => {
        const success = await useGroupStore.getState().joinGroupByInviteCode(code);
        if (success) {
          useChatstore.getState().setActiveTab("groups");
        }
      };
      performJoin();
    }
  }, [location, authUser]);

  console.log({authUser});

  if(isCheckingAuth && !authUser)return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin"/>
    </div>
  );

  const showNavbar = !["/", "/settings", "/settings/devices", "/profile", "/join-group", "/login", "/signup"].includes(location.pathname);

  return (
    <div data-theme={theme} className="h-screen overflow-hidden flex flex-col">
      {showNavbar && <Navbar />}
      <div className="flex-1 overflow-hidden">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader className="size-10 animate-spin text-primary opacity-20"/>
          </div>
        }>
          <Routes>
            <Route path="/" element={authUser ? <HomePage />:<Navigate to="/login" />} />
            <Route path="/join-group" element={authUser ? <HomePage />:<Navigate to="/login" />} />
            <Route path="/signup" element={!authUser ? <SignUpPage />:<Navigate to="/" />} />
            <Route path="/login" element={!authUser ? <LoginPage />:<Navigate to="/" />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/devices" element={authUser ? <LinkedDevicesPage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={authUser ? <ProfilePage />:<Navigate to="/login" />} />
          </Routes>
        </React.Suspense>
      </div>
      
      <CallModal />
    </div>
  );
};

export default App;
