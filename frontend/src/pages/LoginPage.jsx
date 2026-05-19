import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import toast from "react-hot-toast";

const LoginPage = () => {
  const { googleLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  
  const [sessionId, setSessionId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [linkingStatus, setLinkingStatus] = useState("idle"); // "idle" | "success"
  
  const qrSocketRef = useRef(null);

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
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      if (error === "no_credential") toast.error("No credentials received from Google");
      else if (error === "invalid_token") toast.error("Google authentication token verification failed");
      else if (error === "no_email") toast.error("Google account did not provide an email address");
      else if (error === "server_error") toast.error("Internal server error during Google login");
      else toast.error("Google Authentication failed");
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
    if (scriptLoaded && googleClientId && window.google) {
      try {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const initOptions = {
          client_id: googleClientId,
          auto_select: false,
        };

        if (isStandalone) {
          initOptions.ux_mode = "redirect";
          initOptions.login_uri = `${axiosInstance.defaults.baseURL}/auth/google-redirect`;
        } else {
          initOptions.callback = handleGoogleCredentialResponse;
        }

        window.google.accounts.id.initialize(initOptions);

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

        if (!isStandalone) {
          window.google.accounts.id.prompt();
        }
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded, googleClientId]);

  // QR Linking Socket Logic for Desktop Client
  useEffect(() => {
    // Only connect QR socket on desktop screens
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    // Get the base socket URL (strip /api if present)
    const baseURL = axiosInstance.defaults.baseURL.replace("/api", "");
    const qrSocket = io(baseURL);
    qrSocketRef.current = qrSocket;
    
    qrSocket.on("connect", () => {
      qrSocket.emit("qr:request-session");
    });

    qrSocket.on("qr:session", async (sessId) => {
      setSessionId(sessId);
      setQrExpired(false);
      setSecondsLeft(60);
      setLinkingStatus("idle");

      try {
        const dataUrl = await QRCode.toDataURL(sessId, {
          width: 260,
          margin: 2,
          color: {
            dark: "#0f172a", // Dark slate
            light: "#ffffff", // White background
          },
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error("Error generating QR data URL:", err);
      }
    });

    qrSocket.on("qr:linked", async ({ token, user }) => {
      setLinkingStatus("success");
      if (navigator.vibrate) navigator.vibrate([200]);
      toast.success(`Success! Logged in as ${user.fullName}`);
      
      // Save token and log in
      localStorage.setItem("token", token);
      
      // Reset auth state inside the store and trigger redirection
      await useAuthStore.getState().checkAuth();
      navigate("/");
    });

    return () => {
      if (qrSocket) qrSocket.disconnect();
    };
  }, [navigate]);

  // Timer countdown
  useEffect(() => {
    if (!sessionId || qrExpired) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, qrExpired]);

  const refreshQrCode = () => {
    if (qrSocketRef.current) {
      setLinkingStatus("idle");
      setQrCodeDataUrl("");
      qrSocketRef.current.emit("qr:request-session");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden text-white">
      {/* Aurora glowing backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[36px] shadow-2xl grid md:grid-cols-2 overflow-hidden animate-scale-up z-10">
        
        {/* Left Side: Branding + Instructions + Google Login */}
        <div className="p-8 md:p-12 flex flex-col items-center justify-between space-y-8 border-r border-white/5 min-h-[500px]">
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Glowing Logo */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-75 animate-pulse" />
              <div className="relative size-16 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center">
                <MessageSquare className="size-8 text-primary" />
              </div>
            </div>

            {/* Branding header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Chat<span className="text-primary">Zone</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-[280px] mx-auto font-medium">
                Connect instantly with friends and family.
              </p>
            </div>

            {/* Step-by-step QR scanning instructions for Desktop users */}
            <div className="hidden md:block w-full max-w-xs space-y-3.5 text-left bg-slate-900/50 p-5 border border-white/5 rounded-2xl text-xs text-slate-300">
              <p className="font-bold text-slate-200 text-sm">To link with QR Code:</p>
              <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed">
                <li>Open <strong>ChatZone</strong> on your mobile web app.</li>
                <li>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and point to this screen.</li>
              </ol>
            </div>
          </div>

          {/* Google Login Interface */}
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

        {/* Right Side: QR Code Display Card (Visible on Desktop only) */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 md:p-12 bg-slate-900/30">
          <div className="relative w-[280px] h-[280px] bg-white rounded-3xl p-4 flex items-center justify-center border border-white/10 shadow-2xl">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Session Code" 
                className={`w-full h-full object-contain transition-all duration-300 ${
                  qrExpired || linkingStatus === "success" ? "blur-[5px] opacity-20" : ""
                }`} 
              />
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
                <span className="text-xxs font-semibold text-slate-500">Generating QR session...</span>
              </div>
            )}

            {/* QR Expiration Overlay */}
            {qrExpired && qrCodeDataUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/85 rounded-3xl backdrop-blur-sm">
                <span className="text-xs font-bold text-white text-center mb-3">QR Code Expired</span>
                <button
                  onClick={refreshQrCode}
                  className="btn btn-sm btn-primary rounded-full px-5 font-bold shadow-lg shadow-primary/20"
                >
                  Reload QR Code
                </button>
              </div>
            )}

            {/* Linking Success Overlay */}
            {linkingStatus === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/85 rounded-3xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <span className="text-xs font-bold text-white text-center">Syncing chats & logging in...</span>
              </div>
            )}
          </div>

          {/* Timer Count */}
          {!qrExpired && qrCodeDataUrl && (
            <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              QR Code expires in <span className="text-white font-bold">{secondsLeft}s</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
