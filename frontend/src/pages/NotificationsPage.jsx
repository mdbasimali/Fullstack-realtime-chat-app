import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const NotificationsPage = () => {
  const [messagesNotif, setMessagesNotif] = useState(true);
  const [inChatSounds, setInChatSounds] = useState(true);
  const [callsNotif, setCallsNotif] = useState(true);
  const [callsVibrate, setCallsVibrate] = useState(true);
  const [contactJoins, setContactJoins] = useState(false);

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
          Notifications
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Messages Section */}
        <div className="flex flex-col mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Messages</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content font-medium">Notifications</span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={messagesNotif}
              onChange={(e) => setMessagesNotif(e.target.checked)}
            />
          </label>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Customize</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Change sound and vibration</span>
          </button>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content font-medium">In-chat sounds</span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={inChatSounds}
              onChange={(e) => setInChatSounds(e.target.checked)}
            />
          </label>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Repeat alerts</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Never</span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Show</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Name and message</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Calls Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Calls</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content font-medium">Notifications</span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={callsNotif}
              onChange={(e) => setCallsNotif(e.target.checked)}
            />
          </label>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Ringtone</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Default ringtone (74048)</span>
          </button>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content font-medium">Vibrate</span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={callsVibrate}
              onChange={(e) => setCallsVibrate(e.target.checked)}
            />
          </label>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Notification profiles Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Notification profiles</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Profiles</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 pr-4 leading-relaxed">
              Create a profile to receive notifications only from people and groups you choose.
            </span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Notify when... Section */}
        <div className="flex flex-col mt-2 mb-8">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Notify when...</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content font-medium">Contact joins ChatZone</span>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={contactJoins}
              onChange={(e) => setContactJoins(e.target.checked)}
            />
          </label>
        </div>

      </div>
    </div>
  );
};

export default NotificationsPage;
