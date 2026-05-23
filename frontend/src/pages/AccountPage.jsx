import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Trash2, Smartphone, ShieldAlert, XCircle, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const AccountPage = () => {
  const navigate = useNavigate();
  const { authUser, deleteAccount } = useAuthStore();
  const [pinReminders, setPinReminders] = useState(true);
  const [registrationLock, setRegistrationLock] = useState(false);

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState(["", "", "", ""]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePinChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...deletePin];
    newPin[index] = value;
    setDeletePin(newPin);

    if (value !== "" && index < 3) {
      const nextInput = document.getElementById(`del-pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDelete = async () => {
    const pinString = deletePin.join("");
    if (authUser.pin && pinString.length !== 4) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }

    setIsDeleting(true);
    const success = await deleteAccount(pinString);
    if (success) {
      toast.success("Account deletion started.");
      navigate("/login");
    } else {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePin(["", "", "", ""]);
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
          Account
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        
        {/* Signal PIN Section */}
        <div className="flex flex-col mb-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">ChatZone PIN</span>
          </div>
          
          <button 
            onClick={() => navigate("/settings/account/change-pin")}
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-base-content font-medium">Change your PIN</span>
          </button>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">PIN reminders</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">You'll be asked less frequently over time</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={pinReminders}
              onChange={(e) => setPinReminders(e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Registration Lock</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">Require your ChatZone PIN to register your phone number with ChatZone again</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={registrationLock}
              onChange={(e) => setRegistrationLock(e.target.checked)}
            />
          </label>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Advanced PIN settings</span>
          </button>
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 my-2 mx-0" />

        {/* Account Section */}
        <div className="flex flex-col mt-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">Account</span>
          </div>

          <button 
            onClick={() => navigate('/settings/account/add-number')}
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-base-content font-medium">
              {authUser?.phoneNumber ? "Change number" : "Add number"}
            </span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Transfer account</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Transfer account to a new Android device</span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Your account data</span>
          </button>

          <button 
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-rose-500 font-medium">Delete account</span>
          </button>
        </div>

      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
            onClick={closeDeleteModal}
          />
          
          <div className="relative bg-base-100 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-scale-up p-6 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full">
                <Trash2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-base-content">Delete account?</h3>
                <p className="text-sm text-base-content/60 px-4">
                  This will permanently delete your account and erase all your data. This action cannot be undone.
                </p>
              </div>
            </div>

            {authUser?.pin && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-base-content/50 uppercase text-center">Confirm with your PIN</p>
                <div className="flex justify-center gap-3">
                  {deletePin.map((digit, index) => (
                    <input
                      key={index}
                      id={`del-pin-${index}`}
                      type="password"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !deletePin[index] && index > 0) {
                          document.getElementById(`del-pin-${index - 1}`).focus();
                        }
                      }}
                      className="w-12 h-14 text-center text-2xl font-black rounded-xl border-2 border-base-300 focus:border-error focus:ring-4 focus:ring-error/10 bg-base-200/50 transition-all outline-none"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                disabled={isDeleting || (authUser?.pin && deletePin.join("").length !== 4)}
                className="btn btn-error w-full h-14 rounded-2xl text-white font-bold text-base shadow-lg shadow-error/20 transition-all active:scale-[0.98]"
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-md"></span>
                ) : (
                  "Delete account permanently"
                )}
              </button>
              <button 
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="btn btn-ghost w-full h-14 rounded-2xl font-bold text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;

