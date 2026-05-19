import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const LoginPage = () => {
  const { googleLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  const handleGoogleCredentialResponse = async (response) => {
    const res = await googleLogin(response.credential);
    if (res.success) {
      toast.success("Welcome to ChatZone!");
      localStorage.setItem("trigger_contact_sync", "true");
      navigate("/");
    } else {
      toast.error(res.error || "Authentication failed");
    }
  };

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const res = await axiosInstance.get("/auth/google-client-id");
        if (res.data?.clientId) {
          setGoogleClientId(res.data.clientId);
        }
      } catch (err) {
        console.error("Failed to fetch Google Client ID:", err);
      }
    };
    fetchClientId();
  }, []);

  useEffect(() => {
    // Check if script is already present
    const existingScript = document.getElementById("google-gsi-client");
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Keep script cached to prevent flickering on navigation
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded && googleClientId && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("googleBtnContainer"),
          { 
            theme: "outline", 
            size: "large", 
            width: "320",
            text: "continue_with",
            shape: "pill"
          }
        );

        // Display One Tap prompt if supported
        window.google.accounts.id.prompt();
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded, googleClientId]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Aurora glowing backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-2xl flex flex-col items-center space-y-8 animate-scale-up z-10">
        
        {/* Glowing Logo */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-75 animate-pulse" />
          <div className="relative size-16 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center">
            <MessageSquare className="size-8 text-primary" />
          </div>
        </div>

        {/* Branding header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Chat<span className="text-primary">Zone</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-[280px] mx-auto font-medium">
            Connect instantly with friends and family using secure Google authentication.
          </p>
        </div>

        {/* Auth Interface */}
        <div className="w-full flex flex-col items-center justify-center space-y-4 py-4 min-h-[80px]">
          {isLoggingIn ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Signing you in securely...</span>
            </div>
          ) : (
            <div id="googleBtnContainer" className="flex justify-center transition-all duration-300 active:scale-95" />
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-500 text-center font-medium leading-relaxed max-w-[260px]">
          By continuing, you agree to ChatZone's <span className="hover:text-primary transition-colors cursor-pointer underline">Terms of Service</span> and <span className="hover:text-primary transition-colors cursor-pointer underline">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
