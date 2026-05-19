import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Loader2, ArrowLeft, Phone, ShieldCheck, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import toast from "react-hot-toast";

// Firebase imports
import { auth } from "../lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const LoginPage = () => {
  const { googleLogin, firebaseLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  
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

  // Firebase Phone Auth states
  const [loginStep, setLoginStep] = useState("phone"); // "phone" | "otp"
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Auto resend timer effect
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Clean recaptcha verifier helper
  const cleanRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {
        console.error("Error clearing recaptcha:", err);
      }
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) {
      try {
        const parent = container.parentNode;
        if (parent) {
          container.remove();
          const newContainer = document.createElement("div");
          newContainer.id = "recaptcha-container";
          parent.appendChild(newContainer);
        }
      } catch (domErr) {
        console.error("Error recreating recaptcha container:", domErr);
        container.innerHTML = "";
      }
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
    return () => cleanRecaptcha();
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
  }, [scriptLoaded, googleClientId, loginStep]); // Re-render when loginStep toggles back to phone screen

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

  // Setup Firebase Recaptcha
  const initializeRecaptcha = () => {
    if (!auth) {
      throw new Error("Firebase auth client is not initialized.");
    }
    cleanRecaptcha();
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        // Recaptcha resolved
      },
      "expired-callback": () => {
        toast.error("reCAPTCHA verification expired. Please try again.");
        cleanRecaptcha();
      }
    });
  };

  // Send Firebase OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    if (!auth) {
      toast.error("Mobile Login is not configured. Firebase keys are missing in the environment.");
      return;
    }
    
    // Validate Indian mobile numbers (10 digits starting with 6-9)
    const normalizedNumber = phoneNumber.trim().replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(normalizedNumber)) {
      toast.error("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    const fullPhoneNumber = `+91${normalizedNumber}`;
    setIsSendingOtp(true);

    try {
      initializeRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      
      setConfirmationResult(result);
      setLoginStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60); // 60 seconds resend cooldown
      toast.success(`OTP sent to +91 ${normalizedNumber.slice(0, 5)} ${normalizedNumber.slice(5)}`);
      
      // Auto focus first OTP input box
      setTimeout(() => {
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }, 300);
    } catch (err) {
      console.error("Firebase send OTP error:", err);
      cleanRecaptcha();
      toast.error(err.message || "Failed to send verification SMS");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Auto trigger verification when all 6 digits entered
  const verifyOtp = async (otpCode) => {
    if (!confirmationResult) return;
    setIsVerifyingOtp(true);
    const toastId = toast.loading("Verifying code...");

    try {
      const result = await confirmationResult.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      
      // Post to backend login route
      const res = await firebaseLogin(idToken);
      if (res.success) {
        toast.success("Welcome to ChatZone!", { id: toastId });
        localStorage.setItem("trigger_contact_sync", "true");
        navigate("/");
      } else {
        toast.error(res.error || "Authentication failed", { id: toastId });
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      toast.error("Invalid verification code. Please check and try again.", { id: toastId });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // OTP inputs keyboard handlers
  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next box
    if (value !== "" && index < 5) {
      otpRefs.current[index + 1].focus();
    }

    // Auto verify when fully filled
    if (newOtp.join("").length === 6) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length === 6 && !isNaN(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      verifyOtp(pastedData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden text-white">
      {/* Invisible Recaptcha Anchor */}
      <div id="recaptcha-container"></div>

      {/* Glowing background auroras */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card Grid */}
      <div className="w-full max-w-4xl bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[36px] shadow-2xl grid md:grid-cols-2 overflow-hidden animate-scale-up z-10">
        
        {/* Left Side: Mobile OTP flow / Branding */}
        <div className="p-8 md:p-12 flex flex-col justify-between space-y-8 border-r border-white/5 min-h-[520px]">
          
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

          {/* Form Step: Enter Phone Number */}
          {loginStep === "phone" && (
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Verify your number <Phone size={20} className="text-primary animate-bounce" />
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                  ChatZone will verify your number. Enter your 10-digit mobile number below.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="flex gap-2">
                  {/* Fixed Country Code for Indian Focus */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-300">
                    <span className="text-base select-none">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  
                  {/* Phone Input Box */}
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    maxLength="10"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder-slate-600 focus:outline-hidden focus:border-primary transition-all shadow-xs"
                    disabled={isSendingOtp}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp || phoneNumber.length !== 10}
                  className="w-full btn btn-primary rounded-2xl py-3.5 h-auto text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending verification SMS...</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Native Google auth fallback */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold tracking-widest uppercase">OR CONTINUE WITH</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="flex justify-center min-h-[50px]">
                {isLoggingIn ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-xs text-slate-500 font-bold">Connecting...</span>
                  </div>
                ) : (
                  <div id="googleBtnContainer" className="flex justify-center transition-all duration-300 active:scale-95" />
                )}
              </div>
            </div>
          )}

          {/* Form Step: Enter OTP Code */}
          {loginStep === "otp" && (
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <button
                  onClick={() => setLoginStep("phone")}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline mb-2"
                >
                  <ArrowLeft size={14} />
                  <span>Change Number</span>
                </button>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Enter 6-digit OTP <ShieldCheck size={20} className="text-emerald-500" />
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                  We've sent an OTP to <strong className="text-white">+91 {phoneNumber}</strong>. Type it below.
                </p>
              </div>

              <div className="space-y-4">
                {/* 6 Digit Verification Inputs */}
                <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 text-center text-lg font-black text-white placeholder-transparent focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                      disabled={isVerifyingOtp}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between py-2">
                  {resendTimer > 0 ? (
                    <span className="text-xs text-slate-500 font-semibold">
                      Resend SMS in <strong className="text-slate-300">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendOtp(null)}
                      disabled={isSendingOtp}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={isSendingOtp ? "animate-spin" : ""} />
                      <span>Resend SMS OTP</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => verifyOtp(otp.join(""))}
                  disabled={isVerifyingOtp || otp.join("").length !== 6}
                  className="w-full btn btn-success rounded-2xl py-3.5 h-auto text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying credentials...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>
              </div>
            </div>
          )}

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
