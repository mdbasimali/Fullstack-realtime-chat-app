import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2, Mail, Lock, Eye, EyeOff, User, AtSign, Phone, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const { signup, googleLogin, isSigningUp, isLoggingIn, checkUsername } = useAuthStore();
  const navigate = useNavigate();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    if (username.length < 4) {
      setUsernameStatus("too_short");
      setUsernameMessage("Username must be at least 4 characters");
      return;
    }

    const usernameRegex = /^[a-z0-9.\-_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus("invalid_chars");
      setUsernameMessage("Only letters, numbers, ., -, and _ are allowed");
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    const timeoutId = setTimeout(async () => {
      const result = await checkUsername(username);
      if (result.available) {
        setUsernameStatus("available");
        setUsernameMessage("Username is available");
      } else {
        setUsernameStatus("unavailable");
        setUsernameMessage(result.message || "Username is not available");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, checkUsername]);

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

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!fullName || !username || !email || !password || !phoneNumber) {
      toast.error("Please fill in all fields");
      return;
    }
    if (usernameStatus !== "available") {
      toast.error("Please provide a valid and available username");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    const res = await signup({ fullName, username, email, password, phoneNumber });
    if (res.success) {
      toast.success("Account created successfully!");
      localStorage.setItem("trigger_contact_sync", "true");
      navigate("/");
    } else {
      toast.error(res.error || "Failed to create account");
    }
  };

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
        window.google.accounts.id.renderButton(
          document.getElementById("googleBtnContainer"),
          { theme: "outline", size: "large", width: "192", text: "signup_with", shape: "pill" }
        );
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded, googleClientId]);

  const inputStyle = (field) => ({
    background: "rgba(255,255,255,0.04)",
    border: focusedField === field
      ? "1px solid rgba(167,139,250,0.6)"
      : "1px solid rgba(255,255,255,0.08)",
    boxShadow: focusedField === field
      ? "0 0 0 3px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.08)"
      : "none"
  });

  const iconColor = (field) => focusedField === field ? "#a78bfa" : "#4b5563";

  return (
    <div
      className="h-full overflow-y-auto flex flex-col justify-start items-center p-4 md:p-6 relative"
      style={{ background: "linear-gradient(135deg, #050510 0%, #0d0d2b 40%, #0a0a1f 70%, #0f0524 100%)" }}
    >
      {/* Animated background orbs */}
      <div
        className="fixed pointer-events-none animate-float"
        style={{
          top: "5%", right: "12%", width: "360px", height: "360px",
          background: "radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)",
          borderRadius: "50%", filter: "blur(40px)"
        }}
      />
      <div
        className="fixed pointer-events-none animate-float-delayed"
        style={{
          bottom: "8%", left: "10%", width: "340px", height: "340px",
          background: "radial-gradient(circle, rgba(6,182,212,0.13) 0%, transparent 70%)",
          borderRadius: "50%", filter: "blur(40px)"
        }}
      />

      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[480px] animate-scale-up z-10 my-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset"
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-px"
          style={{ width: "60%", background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)" }}
        />

        <div className="px-8 py-10 md:px-10 flex flex-col gap-7">

          {/* Logo + title */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-3xl animate-spin-slow opacity-50"
                style={{ background: "conic-gradient(from 0deg, #7c3aed, #06b6d4, #ec4899, #7c3aed)", borderRadius: "22px" }}
              />
              <div
                className="relative size-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a0a3e 0%, #0a1a3e 100%)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <MessageSquare size={28} style={{ color: "#a78bfa" }} />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight text-white">
                Create Account
              </h1>
              <p className="text-sm mt-1.5 font-medium" style={{ color: "#6b7280" }}>
                Join{" "}
                <span style={{ background: "linear-gradient(90deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 900 }}>
                  ChatZone
                </span>
                {" "}and start chatting instantly.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">

            {/* Full Name + Username row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                  Full Name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: iconColor("fullName") }} />
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField(null)}
                    className="auth-input w-full pl-9 pr-3 py-3 text-xs font-semibold text-white placeholder-gray-700 rounded-xl outline-none transition-all duration-200"
                    style={inputStyle("fullName")}
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                  Username
                </label>
                <div className="relative">
                  <AtSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: iconColor("username") }} />
                  <input
                    id="signup-username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/\s/g, '');
                      setUsername(val);
                    }}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    className="auth-input w-full pl-9 pr-3 py-3 text-xs font-semibold text-white placeholder-gray-700 rounded-xl outline-none transition-all duration-200"
                    style={{
                      ...inputStyle("username"),
                      borderColor: (usernameStatus === "unavailable" || usernameStatus === "too_short" || usernameStatus === "invalid_chars") ? "rgba(239,68,68,0.5)" : usernameStatus === "available" ? "rgba(16,185,129,0.5)" : focusedField === "username" ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.08)"
                    }}
                    required
                  />
                </div>
                {usernameMessage && (
                  <span className="text-[10px] font-bold pl-1" style={{
                    color: (usernameStatus === "unavailable" || usernameStatus === "too_short" || usernameStatus === "invalid_chars") ? "#ef4444" : usernameStatus === "available" ? "#10b981" : "#6b7280"
                  }}>
                    {usernameMessage}
                  </span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: iconColor("email") }} />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input w-full pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder-gray-600 rounded-2xl outline-none transition-all duration-200"
                  style={inputStyle("email")}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                Phone Number
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: iconColor("phone") }} />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input w-full pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder-gray-600 rounded-2xl outline-none transition-all duration-200"
                  style={inputStyle("phone")}
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
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: iconColor("password") }} />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input w-full pl-11 pr-12 py-3.5 text-sm font-semibold text-white placeholder-gray-600 rounded-2xl outline-none transition-all duration-200"
                  style={inputStyle("password")}
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

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: i < Math.min(Math.floor(password.length / 2), 4)
                          ? (password.length < 4 ? "#ef4444" : password.length < 6 ? "#f59e0b" : "#10b981")
                          : "rgba(255,255,255,0.08)"
                      }}
                    />
                  ))}
                  <span className="text-[10px] font-bold ml-1" style={{
                    color: password.length < 4 ? "#ef4444" : password.length < 6 ? "#f59e0b" : "#10b981"
                  }}>
                    {password.length < 4 ? "Weak" : password.length < 6 ? "Fair" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={isSigningUp}
              className="relative w-full py-4 rounded-2xl text-sm font-black text-white mt-1 overflow-hidden transition-all duration-200 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #0891b2 100%)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)"
              }}
              onMouseEnter={e => { if (!isSigningUp) e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = ""; }}
            >
              <span className="relative flex items-center justify-center gap-2">
                {isSigningUp ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                ) : (
                  <><Sparkles size={16} /> Create Account</>
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
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" style={{ color: "#a78bfa" }} />
                <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Signing in…</span>
              </div>
            ) : (
              <div id="googleBtnContainer" className="flex justify-center transition-transform duration-200 active:scale-95" />
            )}
          </div>

          {/* Footer */}
          <div className="text-center space-y-3">
            <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-black transition-colors duration-150"
                style={{ color: "#a78bfa" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c4b5fd"}
                onMouseLeave={e => e.currentTarget.style.color = "#a78bfa"}
              >
                Log in →
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
      </div>
    </div>
  );
};

export default SignUpPage;
