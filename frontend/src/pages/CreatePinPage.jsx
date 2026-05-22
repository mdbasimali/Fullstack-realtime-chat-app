import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const CreatePinPage = () => {
  const { createPin } = useAuthStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  const handleChange = (index, value) => {
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
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newPin.findIndex(val => val === "");
      if (nextEmptyIndex !== -1 && inputRefs[nextEmptyIndex].current) {
        inputRefs[nextEmptyIndex].current.focus();
      } else if (inputRefs[3].current) {
        inputRefs[3].current.focus();
      }
    } else {
      newPin[index] = value;
      setPin(newPin);

      // Move to next input automatically if value is filled
      if (value !== "" && index < 3) {
        inputRefs[index + 1].current.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && pin[index] === "" && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPin = pin.join("");
    
    if (finalPin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    setIsSubmitting(true);
    const res = await createPin(finalPin);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      toast.success("PIN created successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } else {
      toast.error(res.error || "Failed to create PIN");
      // Reset pin on error
      setPin(["", "", "", ""]);
      if (inputRefs[0].current) inputRefs[0].current.focus();
    }
  };

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
        className="relative w-full max-w-[420px] animate-scale-up z-10 my-auto"
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

        <div className="px-8 py-10 md:px-10 flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-3xl animate-spin-slow opacity-50"
                style={{ background: "conic-gradient(from 0deg, #7c3aed, #06b6d4, #ec4899, #7c3aed)", borderRadius: "22px" }}
              />
              <div
                className="relative size-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a0a3e 0%, #0a1a3e 100%)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {isSuccess ? (
                  <CheckCircle2 size={32} className="text-emerald-400" />
                ) : (
                  <Lock size={28} style={{ color: "#a78bfa" }} />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white mb-2">
                {isSuccess ? "PIN Created!" : "Create a PIN"}
              </h1>
              <p className="text-sm font-medium" style={{ color: "#9ca3af" }}>
                {isSuccess 
                  ? "Your account is now more secure."
                  : "Add an extra layer of security to your ChatZone account."}
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
                    className="w-14 h-16 text-center text-2xl font-black text-white rounded-2xl outline-none transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: digit !== "" 
                        ? "1px solid rgba(167,139,250,0.6)" 
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: digit !== ""
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
                  disabled={isSubmitting || pin.join("").length !== 4}
                  className="relative w-full py-4 rounded-2xl text-sm font-black text-white overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #0891b2 100%)",
                    boxShadow: "0 8px 32px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)"
                  }}
                  onMouseEnter={e => { if (!isSubmitting && pin.join("").length === 4) e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = ""; }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Saving…</>
                    ) : (
                      <>Set PIN <ChevronRight size={16} /></>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 disabled:opacity-50 hover:bg-white/5"
                  style={{ color: "#9ca3af" }}
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default CreatePinPage;
