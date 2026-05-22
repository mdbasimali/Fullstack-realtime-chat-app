import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, History, Smartphone } from "lucide-react";

const BackupsPage = () => {
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
          Backups
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        
        <p className="px-6 py-4 text-[15px] text-base-content/80 leading-relaxed mb-4">
          Back up your message history so you never lose data when you get a new phone or reinstall ChatZone.
        </p>

        <div className="flex px-6 py-2 gap-5 items-start">
          <History size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-[16px] text-base-content font-medium">ChatZone Secure Backups</span>
            <span className="text-[14px] text-base-content/60 mt-1 leading-relaxed">
              Automatic backups with ChatZone's secure end-to-end encrypted storage service.
            </span>
            <button className="btn btn-sm rounded-full mt-5 w-fit px-6 bg-blue-100 hover:bg-blue-200 text-blue-700 border-none normal-case text-[14px] h-10">
              Set up
            </button>
          </div>
        </div>

        <div className="border-b border-base-200/60 my-6 mx-0" />

        <div className="px-6 py-2">
          <span className="text-[15px] font-bold text-base-content">Other ways to backup</span>
        </div>

        <button className="w-full px-6 py-4 flex items-center gap-5 hover:bg-base-200 transition-colors text-left mt-2">
          <Smartphone size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-[16px] text-base-content font-medium">On-device backups</span>
            <span className="text-[14px] text-base-content/60 mt-1">Save your backups to a folder on this device</span>
          </div>
        </button>

      </div>
    </div>
  );
};

export default BackupsPage;
