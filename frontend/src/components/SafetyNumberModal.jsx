import React, { useEffect, useState } from "react";
import { generateFingerprint } from "../lib/crypto";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { ShieldCheck, X, Loader2 } from "lucide-react";

const SafetyNumberModal = ({ isOpen, onClose }) => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatstore();
  
  const [myFingerprint, setMyFingerprint] = useState("");
  const [theirFingerprint, setTheirFingerprint] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !authUser || !selectedUser) return;

    const computeFingerprints = async () => {
      setLoading(true);
      try {
        if (authUser.publicKey) {
          const myFp = await generateFingerprint(authUser.publicKey);
          setMyFingerprint(myFp);
        }
        if (selectedUser.publicKey) {
          const theirFp = await generateFingerprint(selectedUser.publicKey);
          setTheirFingerprint(theirFp);
        }
      } catch (err) {
        console.error("Error computing safety numbers:", err);
      } finally {
        setLoading(false);
      }
    };

    computeFingerprints();
  }, [isOpen, authUser, selectedUser]);

  if (!isOpen) return null;

  // Format 60-digit string into chunks of 5 for readability
  const formatNumber = (numStr) => {
    if (!numStr) return "";
    return numStr.match(/.{1,5}/g)?.join(" ") || numStr;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-base-100 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-base-200 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center">Verify Safety Number</h2>
          <p className="text-sm text-base-content/70 text-center mt-2 px-4 leading-relaxed">
            To verify that messages and calls with {selectedUser?.fullName} are end-to-end encrypted, compare these numbers with their device.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300">
              <h3 className="text-xs font-bold text-base-content/60 uppercase tracking-wider mb-2">Your Safety Number</h3>
              <p className="font-mono text-sm tracking-wide break-words text-base-content leading-relaxed">
                {formatNumber(myFingerprint) || "Not available"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300">
              <h3 className="text-xs font-bold text-base-content/60 uppercase tracking-wider mb-2">{selectedUser?.fullName}'s Safety Number</h3>
              <p className="font-mono text-sm tracking-wide break-words text-base-content leading-relaxed">
                {formatNumber(theirFingerprint) || "Not available"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <button 
            onClick={onClose}
            className="w-full btn btn-primary rounded-2xl h-12 shadow-lg shadow-primary/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyNumberModal;
