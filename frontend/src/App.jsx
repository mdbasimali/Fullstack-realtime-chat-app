import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import {Loader} from "lucide-react"
import {Toaster} from "react-hot-toast";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import CallModal from "./components/CallModal";

// Lazy load pages for faster initial load
const HomePage = React.lazy(() => import("./pages/HomePage"));
const SignUpPage = React.lazy(() => import("./pages/SignUpPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
// import axios from "axios";

const App = () => {
  const {authUser,checkAuth,isCheckingAuth,onlineUsers}=useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();
  const [isServerAwake, setIsServerAwake] = React.useState(false);

  // Aggressively wake up the backend on mount
  useEffect(() => {
    const wakeUp = async () => {
      try {
        await axiosInstance.get("/auth/check");
        setIsServerAwake(true);
      } catch (err) {
        // If it fails, try again in 3 seconds
        setTimeout(wakeUp, 3000);
      }
    };
    wakeUp();
  }, []);

  console.log({onlineUsers});


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
    users // We might need to find the user info
  } = useCallStore();

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("ice:candidate", handleIceCandidate);

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("ice:candidate");
    };
  }, [socket, handleIncomingCall, handleCallAccepted, handleCallRejected, handleCallEnded, handleIceCandidate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("call") === "true") {
      // The socket connection will automatically trigger the 'call:incoming' 
      // event via the backend's new pendingCalls re-sync logic.
      
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }
  }, [location]);

  console.log({authUser});

  // Removed full-screen blocking loader for instant app start
  const showNavbar = !["/", "/settings", "/profile"].includes(location.pathname);

  return (
    <div data-theme={theme} className="h-screen overflow-hidden flex flex-col relative">
      {/* Subtle indicator if server is still waking up */}
      {!isServerAwake && (
        <div className="absolute top-0 inset-x-0 z-[100] bg-warning/20 px-4 py-1 flex items-center justify-center gap-2">
           <Loader className="size-3 animate-spin text-warning" />
           <span className="text-[10px] font-bold text-warning-content uppercase tracking-widest">
             Server is waking up... Please wait a moment
           </span>
        </div>
      )}
      
      {showNavbar && <Navbar />}
      <div className="flex-1 overflow-hidden">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader className="size-10 animate-spin text-primary opacity-20"/>
          </div>
        }>
          <Routes>
            <Route path="/" element={authUser ? <HomePage />:<Navigate to="/login" />} />
            <Route path="/signup" element={!authUser ? <SignUpPage />:<Navigate to="/" />} />
            <Route path="/login" element={!authUser ? <LoginPage />:<Navigate to="/" />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={authUser ? <ProfilePage />:<Navigate to="/login" />} />
          </Routes>
        </React.Suspense>
      </div>
      
      <Toaster/>
      <CallModal />
    </div>
  );
};

export default App;
