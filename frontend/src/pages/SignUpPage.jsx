import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2, Mail, Lock, Eye, EyeOff, User, AtSign, Phone } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const { signup, googleLogin, isSigningUp, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            text: "signup_with",
            shape: "pill"
          }
        );
      } catch (err) {
        console.error("Error rendering Google Sign-In button:", err);
      }
    }
  }, [scriptLoaded, googleClientId]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[28px] md:rounded-[36px] px-6 py-10 md:p-12 shadow-2xl flex flex-col items-center space-y-6 animate-scale-up z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-75 animate-pulse" />
          <div className="relative size-16 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center">
            <MessageSquare className="size-8 text-primary" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Join ChatZone instantly.
          </p>
        </div>

        {/* Welcome message and Signup Form */}
        <div className="space-y-4 w-full flex flex-col justify-center">
          <form onSubmit={handleEmailSignup} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="size-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-hidden focus:border-primary transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <AtSign className="size-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-hidden focus:border-primary transition-all shadow-xs"
                    required
                  />
                </div>
              </div>
            </div>

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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="size-3.5" />
                </div>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
              disabled={isSigningUp}
              className="w-full btn btn-primary rounded-2xl py-3 h-auto text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold tracking-widest uppercase">OR</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="flex justify-center min-h-[50px]">
            {isLoggingIn ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-[10px] text-slate-400 font-semibold">Signing in...</span>
              </div>
            ) : (
              <div id="googleBtnContainer" className="flex justify-center transition-all duration-300 active:scale-95" />
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-bold">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 text-center font-medium leading-relaxed max-w-[260px]">
          By continuing, you agree to ChatZone's <span className="hover:text-primary transition-colors cursor-pointer underline">Terms of Service</span> and <span className="hover:text-primary transition-colors cursor-pointer underline">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
