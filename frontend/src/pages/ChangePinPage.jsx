import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Keyboard } from "lucide-react";
import toast from "react-hot-toast";

const ChangePinPage = () => {
  const { createPin } = useAuthStore();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Create, 2: Confirm, 3: Creating
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      setConfirmPin("");
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setStep(3); // Show "Creating PIN..."
    const res = await createPin(newPin);

    if (res.success) {
      toast.success("PIN created successfully!");
      navigate("/settings/account");
    } else {
      toast.error(res.error || "Failed to create PIN");
      setStep(1);
      setNewPin("");
      setConfirmPin("");
    }
  };

  const isNextDisabled = step === 1 ? newPin.length < 4 : confirmPin.length < 4;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white select-none font-sans text-gray-900">
      
      {/* Header padding for mobile status bar if needed */}
      <div className="pt-12 px-6 flex-1 flex flex-col">
        
        <h1 className="text-3xl font-medium tracking-tight mb-4">
          {step === 1 ? "Create your PIN" : "Confirm your PIN."}
        </h1>
        
        <p className="text-[15px] text-gray-600 mb-8 leading-relaxed">
          {step === 1 ? (
            <>
              PINs can help you restore your account and keep your info encrypted with Signal. <span className="font-semibold cursor-pointer">Learn more</span>
            </>
          ) : (
            "Re-enter the PIN you just created."
          )}
        </p>

        {step === 3 ? (
          <div className="flex-1 flex items-center justify-center -mt-32">
            <p className="text-[15px] text-gray-800">Creating PIN...</p>
          </div>
        ) : (
          <form 
            onSubmit={step === 1 ? handleNextStep1 : handleNextStep2} 
            className="flex flex-col flex-1"
          >
            <div className="flex flex-col items-center">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                value={step === 1 ? newPin : confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (step === 1) setNewPin(val);
                  else setConfirmPin(val);
                }}
                className="w-full bg-[#f0f4fa] border-b-2 border-[#1e88e5] text-center text-xl tracking-widest py-4 outline-none"
              />
              {step === 1 && (
                <p className="text-[13px] text-gray-700 mt-3 font-medium">
                  PIN must be at least 4 digits
                </p>
              )}
              
              {step === 1 && (
                <button 
                  type="button" 
                  className="mt-6 flex items-center gap-2 text-[#1e88e5] font-medium text-[15px] hover:bg-[#1e88e5]/10 px-4 py-2 rounded-xl transition-colors"
                >
                  <Keyboard size={20} strokeWidth={2} />
                  Create alphanumeric PIN
                </button>
              )}
            </div>

            {/* Bottom Next Button Area */}
            <div className="mt-auto pb-6 flex justify-end">
              <button
                type="submit"
                disabled={isNextDisabled}
                className={`px-8 py-3 rounded-full font-medium text-[15px] transition-colors ${
                  isNextDisabled 
                    ? "bg-[#f0f2f5] text-gray-400" 
                    : "bg-[#1e88e5] text-white hover:bg-[#1565c0]"
                }`}
              >
                Next
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default ChangePinPage;
