import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const DataStoragePage = () => {
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
          Data and storage
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Top items */}
        <div className="flex flex-col mt-2 mb-2">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Manage storage</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">496 KB</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Media auto-download Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Media auto-download</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">When using mobile data</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Images, Audio</span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">When using Wi-Fi</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Images, Documents, Audio, Video</span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">When roaming</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">None</span>
          </button>

          <p className="px-6 py-2 text-[14px] text-base-content/60 leading-relaxed mb-2 pr-4">
            Voice messages and stickers (under 100 KB) are always auto-downloaded.
          </p>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Media quality Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Media quality</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Sent media quality</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Standard</span>
          </button>

          <p className="px-6 py-2 text-[14px] text-base-content/60 leading-relaxed mb-2">
            Sending high quality media will use more data.
          </p>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Calls Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Calls</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Use less data for calls</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Never</span>
          </button>

          <p className="px-6 py-2 text-[14px] text-base-content/60 leading-relaxed mb-2">
            Using less data may improve calls on bad networks
          </p>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Proxy Section */}
        <div className="flex flex-col mt-2 mb-8">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Proxy</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Use proxy</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Off</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default DataStoragePage;
