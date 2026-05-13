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

  if(isCheckingAuth && !authUser)return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin"/>
    </div>
  );

  const showNavbar = !["/", "/settings", "/profile"].includes(location.pathname);

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
