import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import toast from "react-hot-toast";

const LoginPage = () => {
  const { login, googleLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  
  // Email/Password states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Google sign in states
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  
  // Desktop QR pairing states
  const [sessionId, setSessionId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [linkingStatus, setLinkingStatus] = useState("idle"); // "idle" | "success"
  const qrSocketRef = useRef(null);

  // Email login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    const res = await login({ email, password });
    if (res.success) {
      toast.success("Welcome back to ChatZone!");
      localStorage.setItem("trigger_contact_sync", "true");
      navigate("/");
    } else {
      toast.error(res.error || "Failed to login");
    }
  };

  // Google credential login
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

  // Fetch Google Client ID on load
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

  // Fetch error query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      if (error === "no_credential") toast.error("No credentials received from Google");
      else if (error === "invalid_token") toast.error("Google authentication token verification failed");
      else if (error === "no_email") toast.error("Google account did not provide an email address");
      else if (error === "server_error") toast.error("Internal server error during Google login");
      else toast.error("Google Authentication failed");
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load Google GSI client
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

  // Render Google Button when loaded
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

        const container = document.getElementById("googleBtnContainer");
        if (container) {
          window.google.accounts.id.renderButton(
            container,
            { 
              theme: "outline", 
              size: "large", 
              width: "320",
              text: "continue_with",
              shape: "pill"
            }
          );
        }

        if (!isStandalone) {
          window.google.accounts.id.prompt();
        }
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded, googleClientId]);

  // Desktop QR socket listener
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

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
            dark: "#0f172a",
            light: "#ffffff",
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
      
      localStorage.setItem("token", token);
      await useAuthStore.getState().checkAuth();
      navigate("/");
    });

    return () => {
      if (qrSocket) qrSocket.disconnect();
    };
  }, [navigate]);

  // QR Timer Countdown
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

      {/* Glowing background auroras */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card Grid */}
      <div className="w-full max-w-md md:max-w-4xl bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[28px] md:rounded-[36px] shadow-2xl grid md:grid-cols-2 overflow-hidden animate-scale-up z-10">
        
        {/* Left Side: Google Login / Branding */}
        <div className="px-6 py-10 md:p-12 flex flex-col justify-between space-y-8 border-r-0 md:border-r border-white/5 min-h-[460px] md:min-h-[520px]">
          
          {/* Header Branding */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-60" />
              <div className="relative size-10 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                <MessageSquare className="size-5 text-primary" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">Chat<span className="text-primary">Zone</span></span>
              <span className="block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">India Onboarding</span>
            </div>
          </div>

          {/* Welcome back message and Email/Password login */}
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                Log in to your ChatZone account.
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="size-3.5" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-hidden focus:border-primary transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="size-3.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-hidden focus:border-primary transition-all shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full btn btn-primary rounded-2xl py-3 h-auto text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold tracking-widest uppercase">OR</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <div className="flex justify-center min-h-[50px]">
              <div id="googleBtnContainer" className="flex justify-center transition-all duration-300 active:scale-95" />
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-400">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-bold">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="text-[10px] text-slate-500 text-center font-medium leading-relaxed">
            By continuing, you agree to ChatZone's <span className="hover:text-primary transition-colors cursor-pointer underline">Terms of Service</span> and <span className="hover:text-primary transition-colors cursor-pointer underline">Privacy Policy</span>.
          </div>
        </div>

        {/* Right Side: Desktop QR Code Pairing (Visible on Desktop Screen sizes only) */}
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

          {/* Countdown timer */}
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
