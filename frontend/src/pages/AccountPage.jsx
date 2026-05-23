import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const AccountPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const [pinReminders, setPinReminders] = useState(true);
  const [registrationLock, setRegistrationLock] = useState(false);

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
            onClick={() => navigate('/settings/account/delete')}
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-rose-500 font-medium">Delete account</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AccountPage;
