import React, { useState } from "react";
import { MoreVertical, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const AddPhoneNumberPage = () => {
  const navigate = useNavigate();
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  
  const [phoneNumber, setPhoneNumber] = useState(authUser?.phoneNumber || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      return toast.error("Phone number is required");
    }
    
    // Simple validation (10 digits)
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length !== 10) {
      return toast.error("Please enter a valid 10-digit phone number");
    }

    await updateProfile({ phoneNumber: cleanedNumber });
    navigate(-1); // Go back to the account page after successful update
  };

  const handleRemoveNumber = async () => {
    await updateProfile({ phoneNumber: "" });
    toast.success("Phone number removed");
    navigate(-1);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-base-100">
      {/* Header */}
      <div className="flex items-center justify-end p-4 safe-p-top">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors cursor-pointer inline-block">
            <MoreVertical size={24} />
          </label>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-200 mt-2">
            <li>
              <button 
                onClick={handleRemoveNumber} 
                className="text-rose-500 font-medium hover:bg-rose-500/10"
                disabled={isUpdatingProfile}
              >
                Remove number
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <h1 className="text-[28px] font-normal text-base-content mb-3 mt-4">Phone number</h1>
        
        <p className="text-[15px] text-base-content/70 leading-tight mb-8">
          You will receive a verification code. Carrier rates may apply.
        </p>

        <form id="phoneForm" onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {/* Country Selector (Static for now) */}
          <div className="w-full bg-[#f0f2f5] dark:bg-base-200/50 border-b border-[#8696a0] flex items-center justify-between px-4 py-3 rounded-t-md cursor-pointer hover:bg-[#e9edef] dark:hover:bg-base-200 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-xl">🇮🇳</span>
              <span className="text-[16px] text-base-content">India</span>
            </div>
            <svg className="w-5 h-5 text-base-content/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>

          {/* Phone Input Row */}
          <div className="flex gap-4">
            {/* Country Code */}
            <div className="w-[80px] bg-[#f0f2f5] dark:bg-base-200/50 border-b border-[#8696a0] flex items-center justify-center px-2 py-3 rounded-t-md">
              <span className="text-[16px] text-base-content/60">+ 91</span>
            </div>
            
            {/* Phone Number Input */}
            <div className="flex-1 bg-[#f0f2f5] dark:bg-base-200/50 border-b-2 border-[#1e88e5] relative rounded-t-md overflow-hidden">
              <label className="absolute left-4 top-1.5 text-[12px] text-[#1e88e5]">Phone number</label>
              <input
                type="tel"
                className="w-full bg-transparent border-none outline-none text-[16px] text-base-content pl-4 pr-4 pt-6 pb-2"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

        </form>
      </div>

      {/* Footer / Floating Button */}
      <div className="p-6 flex justify-end">
        <button 
          form="phoneForm"
          type="submit" 
          className={`font-medium px-8 py-2.5 rounded-full transition-colors flex items-center justify-center min-w-[100px] gap-2 ${
            phoneNumber.replace(/[^0-9]/g, '').length === 10
              ? "bg-[#00a884] hover:bg-[#008f6f] text-white"
              : "bg-[#e5e5e5] hover:bg-[#d4d4d4] dark:bg-base-300 dark:hover:bg-base-300 text-base-content/40"
          }`}
          disabled={isUpdatingProfile || phoneNumber.replace(/[^0-9]/g, '').length !== 10}
        >
          {isUpdatingProfile ? <Loader2 className="animate-spin" size={16} /> : "Next"}
        </button>
      </div>
    </div>
  );
};

export default AddPhoneNumberPage;
