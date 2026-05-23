import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useChatstore } from "../store/useChatStore";

const StoragePage = () => {
  const [applyLimits, setApplyLimits] = useState(true);
  const navigate = useNavigate();
  const { allMediaMessages, isAllMediaLoading, getAllMediaMessages } = useChatstore();

  useEffect(() => {
    getAllMediaMessages();
  }, [getAllMediaMessages]);

  const { totalBytes, photoBytes, videoBytes, fileBytes, audioBytes } = useMemo(() => {
    let photos = 0, videos = 0, files = 0, audios = 0;
    allMediaMessages.forEach(msg => {
      if (msg.messageType === "image") photos += 2.5 * 1024 * 1024;
      else if (msg.messageType === "video") videos += 15 * 1024 * 1024;
      else if (msg.messageType === "audio" || msg.messageType === "voice_call") audios += 1 * 1024 * 1024;
      else if (msg.messageType === "document" || msg.messageType === "file") files += 5 * 1024 * 1024;
    });
    return {
      totalBytes: photos + videos + files + audios,
      photoBytes: photos,
      videoBytes: videos,
      fileBytes: files,
      audioBytes: audios
    };
  }, [allMediaMessages]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getPercent = (bytes) => {
    if (totalBytes === 0) return 0;
    return (bytes / totalBytes) * 100;
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10 border-b border-base-200">
        <Link 
          to="/settings/data-storage" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Storage
        </h1>
      </header>

      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar flex flex-col pb-16">
        
        {/* Storage usage */}
        <div className="px-5 py-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-2">
            <h2 className="text-[15px] font-bold text-base-content">Storage usage</h2>
          </div>
          
          <div className="w-full flex justify-end mb-4">
            {isAllMediaLoading ? (
               <span className="loading loading-spinner loading-md text-primary"></span>
            ) : (
               <span className="text-[42px] font-normal text-base-content tracking-wider">{formatBytes(totalBytes)}</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-8 bg-gray-500 rounded-full mb-4 flex overflow-hidden">
            {totalBytes === 0 ? (
              <div className="w-full h-full bg-gray-500" />
            ) : (
              <>
                <div style={{ width: `${getPercent(photoBytes)}%` }} className="h-full bg-blue-500 transition-all duration-500" />
                <div style={{ width: `${getPercent(videoBytes)}%` }} className="h-full bg-teal-300 transition-all duration-500" />
                <div style={{ width: `${getPercent(fileBytes)}%` }} className="h-full bg-pink-600 transition-all duration-500" />
                <div style={{ width: `${getPercent(audioBytes)}%` }} className="h-full bg-blue-600 transition-all duration-500" />
              </>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-5 mb-8">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-base-content">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Photos
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-base-content">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-300"></span> Videos
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-base-content">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-600"></span> Files
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-base-content">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Audio
            </div>
          </div>

          <button 
            onClick={() => navigate('/settings/data-storage/storage/review')}
            className="px-6 py-2.5 bg-[#dbe4f9] text-[#142d5f] font-medium rounded-full hover:bg-[#ccd8f4] transition-colors"
          >
            Review storage
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0 mt-2" />

        {/* Chat limits */}
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-bold text-base-content mb-4">Chat limits</h2>

          <button className="w-full py-3 flex flex-col hover:bg-base-200 transition-colors text-left -mx-5 px-5">
            <span className="text-[16px] text-base-content font-medium">Keep messages</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Forever</span>
          </button>

          <button className="w-full py-3 flex flex-col hover:bg-base-200 transition-colors text-left -mx-5 px-5">
            <span className="text-[16px] text-base-content font-medium">Chat length limit</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">None</span>
          </button>

          <div className="w-full py-3 flex items-center justify-between hover:bg-base-200 transition-colors -mx-5 px-5">
            <div className="flex flex-col pr-4">
              <span className="text-[16px] text-base-content font-medium">Apply limits to linked devices</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-snug">
                When enabled, chat limits will also delete messages from your linked devices.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary"
              checked={applyLimits}
              onChange={() => setApplyLimits(!applyLimits)}
            />
          </div>
        </div>

        <div className="border-b border-base-200/60 mx-0 mt-4" />

        <button className="w-full px-5 py-6 flex items-center hover:bg-base-200 transition-colors text-left">
          <span className="text-[16px] text-base-content font-medium">Delete message history</span>
        </button>

      </div>
    </div>
  );
};

export default StoragePage;
