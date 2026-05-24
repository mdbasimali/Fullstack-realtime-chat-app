import React, { useState } from "react";
import { Loader2, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";
import { enrollBiometrics } from "../lib/biometrics";
import { useAuthStore } from "../store/useAuthStore";

const BiometricEnrollModal = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authUser, verifyPin } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return toast.error("Enter a 4-digit PIN");
    
    setIsSubmitting(true);
    // Verify PIN is correct first
    const verifyRes = await verifyPin(pin);
    if (!verifyRes.success) {
      setIsSubmitting(false);
      return toast.error("Incorrect PIN");
    }

    const success = await enrollBiometrics(authUser._id, pin);
    setIsSubmitting(false);

    if (success) {
      toast.success("Biometrics enrolled successfully");
      onSuccess();
    } else {
      toast.error("Failed to enroll biometrics");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
            <Fingerprint size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-base-content">Enable Biometrics</h2>
            <p className="text-sm text-base-content/60 mt-1">
              Enter your current PIN to securely enable fingerprint or face unlock.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 4-digit PIN"
            className="w-full text-center text-2xl tracking-[0.5em] font-black h-14 bg-base-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-semibold bg-base-100 hover:bg-base-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 4}
              className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-content flex justify-center items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Enable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default BiometricEnrollModal;
