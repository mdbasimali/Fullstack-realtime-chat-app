import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const { googleLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const handleGoogleCredentialResponse = async (response) => {
    const res = await googleLogin(response.credential);
    if (res.success) {
      toast.success("Account created successfully!");
      localStorage.setItem("trigger_contact_sync", "true");
      navigate("/");
    } else {
      toast.error(res.error || "Authentication failed");
    }
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (scriptLoaded && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "934273574163-qg6k47g290h26q0f3lh65b7g4b8u2j8p.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("googleBtnContainer"),
          { 
            theme: "outline", 
            size: "large", 
            width: "320",
            text: "signup_with",
            shape: "pill"
          }
        );
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-2xl flex flex-col items-center space-y-8 animate-scale-up z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-75 animate-pulse" />
          <div className="relative size-16 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center">
            <MessageSquare className="size-8 text-primary" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-slate-400 max-w-[280px] mx-auto font-medium">
            Join ChatZone instantly using your Google account.
          </p>
        </div>

        <div className="w-full flex flex-col items-center justify-center space-y-4 py-4 min-h-[80px]">
          {isLoggingIn ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Creating your account securely...</span>
            </div>
          ) : (
            <div id="googleBtnContainer" className="flex justify-center transition-all duration-300 active:scale-95" />
          )}
        </div>

        <div className="text-[11px] text-slate-500 text-center font-medium leading-relaxed max-w-[260px]">
          By continuing, you agree to ChatZone's <span className="hover:text-primary transition-colors cursor-pointer underline">Terms of Service</span> and <span className="hover:text-primary transition-colors cursor-pointer underline">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
