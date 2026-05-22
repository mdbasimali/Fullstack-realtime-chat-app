import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Lock, Loader2, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const AppLockScreen = () => {
  const { verifyPin, isVerifyingPin } = useAuthStore();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  const handleChange = async (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    // Handle paste or multi-character input
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 4).split("");
      pastedDigits.forEach((digit, i) => {
        if (index + i < 4) newPin[index + i] = digit;
      });
      setPin(newPin);
      
      // Auto-submit if full
      if (newPin.join("").length === 4) {
        handleVerify(newPin.join(""));
      } else {
        const nextEmptyIndex = newPin.findIndex(val => val === "");
        if (nextEmptyIndex !== -1 && inputRefs[nextEmptyIndex].current) {
          inputRefs[nextEmptyIndex].current.focus();
        }
      }
    } else {
      newPin[index] = value;
      setPin(newPin);

      // Auto-submit if full
      if (newPin.join("").length === 4) {
        handleVerify(newPin.join(""));
      } else if (value !== "" && index < 3) {
        // Move to next input automatically if value is filled
        inputRefs[index + 1].current.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && pin[index] === "" && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (finalPin) => {
    if (finalPin.length !== 4) return;

    const res = await verifyPin(finalPin);

    if (res.success) {
      setIsSuccess(true);
      toast.success("Unlocked!");
    } else {
      toast.error(res.error || "Incorrect PIN");
      // Trigger shake animation
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
      
      // Reset pin on error
      setPin(["", "", "", ""]);
      if (inputRefs[0].current) inputRefs[0].current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(pin.join(""));
  };

  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-full flex flex-col justify-center items-center p-4 md:p-6"
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
        className={`relative w-full max-w-[420px] z-10 my-auto ${errorShake ? "animate-shake" : "animate-scale-up"}`}
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: errorShake ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.07)",
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset"
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-px transition-colors duration-300"
          style={{ width: "60%", background: errorShake ? "linear-gradient(90deg, transparent, rgba(239,68,68,0.8), transparent)" : "linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)" }}
        />

        <div className="px-8 py-10 md:px-10 flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-3xl animate-spin-slow opacity-50"
                style={{ 
                  background: errorShake ? "conic-gradient(from 0deg, #ef4444, #991b1b, #ef4444)" : "conic-gradient(from 0deg, #7c3aed, #06b6d4, #ec4899, #7c3aed)", 
                  borderRadius: "22px" 
                }}
              />
              <div
                className="relative size-16 rounded-2xl flex items-center justify-center transition-colors"
                style={{ 
                  background: "linear-gradient(135deg, #1a0a3e 0%, #0a1a3e 100%)", 
                  border: "1px solid rgba(255,255,255,0.12)" 
                }}
              >
                {isSuccess ? (
                  <CheckCircle2 size={32} className="text-emerald-400" />
                ) : errorShake ? (
                  <AlertCircle size={28} className="text-red-500" />
                ) : (
                  <Lock size={28} style={{ color: "#a78bfa" }} />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white mb-2">
                {isSuccess ? "Unlocked!" : "App Locked"}
              </h1>
              <p className="text-sm font-medium" style={{ color: errorShake ? "#ef4444" : "#9ca3af" }}>
                {isSuccess 
                  ? "Welcome back."
                  : errorShake ? "Incorrect PIN. Try again." : "Enter your PIN to unlock ChatZone."}
              </p>
            </div>
          </div>

          {!isSuccess && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* PIN Inputs */}
              <div className="flex justify-center gap-3 md:gap-4">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4} // Allow paste of 4 digits
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-14 h-16 text-center text-2xl font-black text-white rounded-2xl outline-none transition-all duration-200 ${errorShake ? "border-red-500/50 bg-red-500/5 text-red-100" : ""}`}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: errorShake 
                        ? "1px solid rgba(239,68,68,0.5)"
                        : digit !== "" 
                          ? "1px solid rgba(167,139,250,0.6)" 
                          : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: errorShake 
                        ? "0 0 0 3px rgba(239,68,68,0.12)"
                        : digit !== ""
                          ? "0 0 0 3px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.08)"
                          : "none"
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isVerifyingPin || pin.join("").length !== 4}
                  className="relative w-full py-4 rounded-2xl text-sm font-black text-white overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #0891b2 100%)",
                    boxShadow: "0 8px 32px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)"
                  }}
                  onMouseEnter={e => { if (!isVerifyingPin && pin.join("").length === 4) e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = ""; }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isVerifyingPin ? (
                      <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                    ) : (
                      <>Unlock <ChevronRight size={16} /></>
                    )}
                  </span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
      
      {/* Custom keyframes for shake animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}} />
    </div>
  );
};

export default AppLockScreen;
