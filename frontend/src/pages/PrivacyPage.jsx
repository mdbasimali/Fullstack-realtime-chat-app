import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import BiometricEnrollModal from "../components/BiometricEnrollModal";
import { isBiometricsAvailable, deleteNativeBiometrics, deleteWebAuthnData } from "../lib/biometrics";
import toast from "react-hot-toast";

const PrivacyPage = () => {
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [screenSecurity, setScreenSecurity] = useState(false);
  const [incognitoKeyboard, setIncognitoKeyboard] = useState(false);
  const [paymentLock, setPaymentLock] = useState(false);
  
  const { authUser, isBiometricsEnabled, setBiometricsEnabled } = useAuthStore();
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      const available = await isBiometricsAvailable();
      setBiometricsSupported(available);
    };
    checkBiometrics();
  }, []);

  const handleBiometricToggle = async (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      if (!authUser.pin) {
        toast.error("You must create a PIN first before enabling Biometrics.");
        return;
      }
      setIsEnrollModalOpen(true);
    } else {
      await deleteNativeBiometrics();
      await deleteWebAuthnData(authUser._id);
      setBiometricsEnabled(false);
      toast.success("Biometrics disabled.");
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Privacy
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Top items */}
        <div className="flex flex-col mb-2 mt-2">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Phone number</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed pr-4">
              Choose who can see your phone number and who can contact you on ChatZone with it.
            </span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Blocked</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">0 contacts or groups</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Messaging Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Messaging</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Read receipts</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                If read receipts are disabled, you won't be able to see read receipts from others.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md shrink-0"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Typing indicators</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                If typing indicators are disabled, you won't be able to see typing indicators from others.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md shrink-0"
              checked={typingIndicators}
              onChange={(e) => setTypingIndicators(e.target.checked)}
            />
          </label>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Disappearing messages Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Disappearing messages</span>
          </div>

          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Default timer for new chats</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 pr-4 leading-relaxed">
                Set a default disappearing message timer for all new chats started by you.
              </span>
            </div>
            <span className="text-[16px] text-base-content/70 shrink-0">Off</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* App security Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">App security</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Screen lock</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Off</span>
          </button>

          {biometricsSupported && (
            <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
              <div className="flex flex-col">
                <span className="text-[16px] text-base-content font-medium flex items-center gap-2">
                  <Fingerprint size={18} />
                  Biometric unlock
                </span>
                <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                  Use fingerprint or face recognition to unlock your chats
                </span>
              </div>
              <input 
                type="checkbox" 
                className="toggle toggle-md shrink-0 toggle-primary"
                checked={isBiometricsEnabled}
                onChange={handleBiometricToggle}
              />
            </label>
          )}

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Screen security</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                Block screenshots in the recents list and inside the app
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={screenSecurity}
              onChange={(e) => setScreenSecurity(e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Incognito keyboard</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                Request keyboard to disable personalized learning.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={incognitoKeyboard}
              onChange={(e) => setIncognitoKeyboard(e.target.checked)}
            />
          </label>

          <p className="px-6 py-2 text-[14px] text-base-content/60 leading-relaxed mb-2">
            This setting is not a guarantee, and your keyboard may ignore it. <a href="#" className="font-bold text-base-content">Learn more</a>
          </p>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Payments Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Payments</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Payment lock</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                Require Android screen lock or fingerprint to transfer funds
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={paymentLock}
              onChange={(e) => setPaymentLock(e.target.checked)}
            />
          </label>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Advanced Section */}
        <div className="flex flex-col mt-2 mb-8">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Advanced</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 pr-4 leading-relaxed">
              ChatZone messages and calls, always relay calls, and sealed sender
            </span>
          </button>
        </div>

      </div>

      <BiometricEnrollModal 
        isOpen={isEnrollModalOpen} 
        onClose={() => setIsEnrollModalOpen(false)}
        onSuccess={() => {
          setIsEnrollModalOpen(false);
          setBiometricsEnabled(true);
        }}
      />
    </div>
  );
};

export default PrivacyPage;
