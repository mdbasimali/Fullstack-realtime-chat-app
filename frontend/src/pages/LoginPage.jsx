import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2, Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";
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
  const [focusedField, setFocusedField] = useState(null);

  // Google sign in states
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  // Desktop QR pairing states
  const [sessionId, setSessionId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [linkingStatus, setLinkingStatus] = useState("idle");
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
        if (res.data?.clientId) setGoogleClientId(res.data.clientId);
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
    if (existingScript) { setScriptLoaded(true); return; }
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
        const initOptions = { client_id: googleClientId, auto_select: false };
        if (isStandalone) {
          initOptions.ux_mode = "redirect";
          initOptions.login_uri = `${axiosInstance.defaults.baseURL}/auth/google-redirect`;
        } else {
          initOptions.callback = handleGoogleCredentialResponse;
        }
        window.google.accounts.id.initialize(initOptions);
        const container = document.getElementById("googleBtnContainer");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline", size: "large", width: "192",
            text: "continue_with", shape: "pill"
          });
        }
        if (!isStandalone) window.google.accounts.id.prompt();
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
    qrSocket.on("connect", () => qrSocket.emit("qr:request-session"));
    qrSocket.on("qr:session", async (sessId) => {
      setSessionId(sessId);
      setQrExpired(false);
      setSecondsLeft(60);
      setLinkingStatus("idle");
      try {
        const dataUrl = await QRCode.toDataURL(sessId, {
          width: 260, margin: 2,
          color: { dark: "#0f0f23", light: "#ffffff" },
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) { console.error("Error generating QR data URL:", err); }
    });
    qrSocket.on("qr:linked", async ({ token, user }) => {
      setLinkingStatus("success");
      if (navigator.vibrate) navigator.vibrate([200]);
      toast.success(`Success! Logged in as ${user.fullName}`);
      localStorage.setItem("token", token);
      await useAuthStore.getState().checkAuth();
      navigate("/");
    });
    return () => { if (qrSocket) qrSocket.disconnect(); };
  }, [navigate]);

  // QR Timer Countdown
  useEffect(() => {
    if (!sessionId || qrExpired) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); setQrExpired(true); return 0; }
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
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 md:p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #050510 0%, #0d0d2b 40%, #0a0a1f 70%, #0f0524 100%)" }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute pointer-events-none animate-float"
        style={{
          top: "8%", left: "10%", width: "420px", height: "420px",
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          borderRadius: "50%", filter: "blur(40px)"
        }}
      />
      <div
        className="absolute pointer-events-none animate-float-delayed"
        style={{
          bottom: "10%", right: "8%", width: "380px", height: "380px",
          background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
          borderRadius: "50%", filter: "blur(40px)"
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)",
          borderRadius: "50%", filter: "blur(60px)"
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      {/* Main Card */}
      <div
        className="w-full max-w-[440px] md:max-w-[900px] animate-scale-up z-10 grid md:grid-cols-[1fr_1px_1fr] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset"
        }}
      >
        {/* ── LEFT COLUMN ── */}
        <div className="px-8 py-10 md:px-10 md:py-12 flex flex-col gap-8">

          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {/* Spinning ring */}
              <div
                className="absolute -inset-1.5 rounded-2xl animate-spin-slow opacity-60"
                style={{ background: "conic-gradient(from 0deg, #7c3aed, #06b6d4, #7c3aed)", borderRadius: "18px" }}
              />
              <div
                className="relative size-12 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a0a3e 0%, #0a1a3e 100%)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <MessageSquare size={22} style={{ color: "#a78bfa" }} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Chat<span style={{ background: "linear-gradient(90deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Zone</span>
              </span>
              <span className="block text-[10px] font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: "#4b5563" }}>
                India Onboarding
              </span>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Welcome <span className="shimmer-text">Back 👋</span>
            </h1>
            <p className="text-sm mt-2 font-medium" style={{ color: "#6b7280" }}>
              Sign in to continue your conversations.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                Email or Username
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                  style={{ color: focusedField === "email" ? "#a78bfa" : "#4b5563" }}
                />
                <input
                  id="login-email"
                  type="text"
                  placeholder="you@example.com or johndoe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input w-full pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder-gray-600 rounded-2xl transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: focusedField === "email"
                      ? "1px solid rgba(167,139,250,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "email"
                      ? "0 0 0 3px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.1)"
                      : "none"
                  }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                  style={{ color: focusedField === "password" ? "#a78bfa" : "#4b5563" }}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input w-full pl-11 pr-12 py-3.5 text-sm font-semibold text-white placeholder-gray-600 rounded-2xl transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: focusedField === "password"
                      ? "1px solid rgba(167,139,250,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "password"
                      ? "0 0 0 3px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.1)"
                      : "none"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: "#4b5563" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                  onMouseLeave={e => e.currentTarget.style.color = "#4b5563"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoggingIn}
              className="relative w-full py-4 rounded-2xl text-sm font-black text-white mt-1 overflow-hidden transition-all duration-200 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #0891b2 100%)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)"
              }}
              onMouseEnter={e => { if (!isLoggingIn) e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = ""; }}
            >
              {/* Shimmer overlay */}
              <span
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)" }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {isLoggingIn ? (
                  <><Loader2 size={16} className="animate-spin" /> Logging in...</>
                ) : (
                  <><Zap size={16} /> Log In</>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#374151" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Google Button */}
          <div className="flex justify-center min-h-[46px]">
            <div id="googleBtnContainer" className="flex justify-center transition-transform duration-200 active:scale-95" />
          </div>

          {/* Footer links */}
          <div className="text-center space-y-3">
            <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-black transition-colors duration-150"
                style={{ color: "#a78bfa" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c4b5fd"}
                onMouseLeave={e => e.currentTarget.style.color = "#a78bfa"}
              >
                Sign up →
              </Link>
            </p>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: "#374151" }}>
              By continuing, you agree to ChatZone's{" "}
              <span className="underline underline-offset-2 cursor-pointer" style={{ color: "#4b5563" }}>Terms of Service</span>
              {" "}and{" "}
              <span className="underline underline-offset-2 cursor-pointer" style={{ color: "#4b5563" }}>Privacy Policy</span>.
            </p>
          </div>
        </div>

        {/* ── DIVIDER (desktop only) ── */}
        <div
          className="hidden md:block w-px self-stretch"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent)" }}
        />

        {/* ── RIGHT COLUMN: QR Code (desktop only) ── */}
        <div className="hidden md:flex flex-col items-center justify-center px-10 py-12 gap-8">
          {/* Section heading */}
          <div className="text-center">
            <h2 className="text-lg font-black text-white tracking-tight">Log in faster</h2>
            <p className="text-xs mt-1 font-medium" style={{ color: "#6b7280" }}>
              Scan with your phone to log in instantly
            </p>
          </div>

          {/* QR frame */}
          <div className="relative">
            {/* Glow ring */}
            <div
              className="absolute -inset-3 rounded-[28px] animate-glow-pulse"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))", filter: "blur(12px)" }}
            />
            <div
              className="relative flex items-center justify-center rounded-3xl p-3"
              style={{
                background: "#fff",
                width: "240px", height: "240px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
              }}
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Login Code"
                  className="w-full h-full object-contain rounded-2xl transition-all duration-300"
                  style={{ filter: (qrExpired || linkingStatus === "success") ? "blur(6px) opacity(0.2)" : "none" }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={28} className="animate-spin" style={{ color: "#7c3aed" }} />
                  <span className="text-xs font-semibold text-gray-500">Generating…</span>
                </div>
              )}

              {/* Expired overlay */}
              {qrExpired && qrCodeDataUrl && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl gap-3"
                  style={{ background: "rgba(5,5,20,0.88)", backdropFilter: "blur(4px)" }}
                >
                  <span className="text-xs font-bold text-white text-center">QR Code Expired</span>
                  <button
                    onClick={refreshQrCode}
                    className="px-4 py-2 rounded-full text-xs font-black text-white transition-all"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}
                  >
                    Refresh QR
                  </button>
                </div>
              )}

              {/* Linking success overlay */}
              {linkingStatus === "success" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl gap-3"
                  style={{ background: "rgba(5,5,20,0.88)", backdropFilter: "blur(4px)" }}
                >
                  <Loader2 size={24} className="animate-spin" style={{ color: "#a78bfa" }} />
                  <span className="text-xs font-bold text-white text-center">Syncing & logging in…</span>
                </div>
              )}
            </div>
          </div>

          {/* Countdown */}
          {!qrExpired && qrCodeDataUrl && (
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#6b7280" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Expires in{" "}
              <span className="font-black text-white">{secondsLeft}s</span>
            </div>
          )}

          {/* QR steps */}
          <ol className="text-xs space-y-2 text-left w-full max-w-[200px]" style={{ color: "#6b7280" }}>
            {[
              "Open ChatZone on your phone",
              "Tap ⋮ → Linked Devices",
              "Scan this QR code",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
                >
                  {i + 1}
                </span>
                <span className="font-medium leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
