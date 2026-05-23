import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { ArrowLeft, AlertTriangle, Trash2, Smartphone, ShieldAlert, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const DeleteAccountPage = () => {
  const { authUser, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePinChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value !== "" && index < 3) {
      const nextInput = document.getElementById(`del-pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    const pinString = pin.join("");
    if (authUser.pin && pinString.length !== 4) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }

    setIsDeleting(true);
    const success = await deleteAccount(pinString);
    if (success) {
      toast.success("Account deletion started. You have been logged out.");
      navigate("/login");
    } else {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-base-100 overflow-hidden font-sans">
      <header className="px-4 py-3 safe-top flex items-center gap-4 bg-base-100 sticky top-0 z-10 shadow-sm border-b border-base-200">
        <button 
          onClick={() => step === 1 ? navigate(-1) : setStep(step - 1)}
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <h1 className="text-xl font-medium text-base-content">Delete account</h1>
      </header>

      <div className="flex-1 w-full mx-auto pb-6 overflow-y-auto custom-scrollbar px-6 pt-6 max-w-md">
        
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 text-error">
              <AlertTriangle size={28} className="shrink-0" />
              <h2 className="text-lg font-semibold leading-tight">Deleting your account will:</h2>
            </div>

            <ul className="space-y-4 text-[15px] text-base-content/80 mt-6">
              <li className="flex items-start gap-3">
                <Trash2 size={20} className="mt-0.5 text-base-content/60" />
                <span>Delete your account from ChatZone</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle size={20} className="mt-0.5 text-base-content/60" />
                <span>Erase your message history</span>
              </li>
              <li className="flex items-start gap-3">
                <Smartphone size={20} className="mt-0.5 text-base-content/60" />
                <span>Delete you from all of your ChatZone groups</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldAlert size={20} className="mt-0.5 text-base-content/60" />
                <span>Delete your backup history and settings</span>
              </li>
            </ul>

            <div className="pt-8">
              <button 
                onClick={() => setStep(authUser.pin ? 2 : 3)}
                className="btn btn-error w-full rounded-xl text-white shadow-sm font-bold text-base"
              >
                Proceed to Delete
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in flex flex-col items-center">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Enter your PIN</h2>
            <p className="text-sm text-base-content/60 text-center max-w-xs">
              To verify it's you, please enter your ChatZone PIN.
            </p>

            <div className="flex justify-center gap-4 py-6">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`del-pin-${index}`}
                  type="password"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !pin[index] && index > 0) {
                      document.getElementById(`del-pin-${index - 1}`).focus();
                    }
                  }}
                  className="w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 border-base-300 focus:border-error focus:ring-4 focus:ring-error/20 bg-base-100 transition-all outline-none"
                />
              ))}
            </div>

            <button 
              onClick={() => {
                if (pin.join("").length === 4) setStep(3);
                else toast.error("Enter complete PIN");
              }}
              className="btn btn-error w-full rounded-xl text-white shadow-sm font-bold"
            >
              Verify PIN
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-error">Final Confirmation</h2>
            <p className="text-sm text-base-content/70 text-center">
              This action is <strong className="text-error">IRREVERSIBLE</strong>. Type <strong>DELETE</strong> below to permanently schedule your account for deletion.
            </p>

            <div className="py-4">
              <input 
                type="text" 
                placeholder="Type DELETE" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-base-200 border-2 border-base-300 focus:border-error focus:outline-none text-center font-bold text-lg tracking-wider"
              />
            </div>

            <button 
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || isDeleting}
              className="btn btn-error w-full rounded-xl text-white shadow-sm font-bold"
            >
              {isDeleting ? <span className="loading loading-spinner"></span> : "Delete My Account"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default DeleteAccountPage;
