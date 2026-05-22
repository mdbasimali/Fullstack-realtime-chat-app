import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowDown, Play, FileText, Headphones } from "lucide-react";
import { useChatstore } from "../store/useChatStore";

const ReviewStoragePage = () => {
  const [activeTab, setActiveTab] = useState("All");
  const { allMediaMessages, isAllMediaLoading, getAllMediaMessages } = useChatstore();

  useEffect(() => {
    getAllMediaMessages();
  }, [getAllMediaMessages]);

  const tabs = ["Media", "Files", "Audio", "All"];

  // Filter messages based on the active tab
  const getFilteredMessages = () => {
    switch (activeTab) {
      case "Media":
        return allMediaMessages.filter(m => m.messageType === "image" || m.messageType === "video");
      case "Files":
        return allMediaMessages.filter(m => m.messageType === "document" || m.messageType === "file");
      case "Audio":
        return allMediaMessages.filter(m => m.messageType === "audio" || m.messageType === "voice_call");
      case "All":
      default:
        return allMediaMessages;
    }
  };

  const filteredMessages = getFilteredMessages();

  // Helper to render individual media items
  const renderMediaItem = (msg) => {
    if (msg.messageType === "image") {
      return (
        <div key={msg._id} className="aspect-square relative w-full bg-base-200 overflow-hidden">
          <img src={msg.image} alt="Media" className="w-full h-full object-cover" />
        </div>
      );
    }
    if (msg.messageType === "video") {
      return (
        <div key={msg._id} className="aspect-square relative w-full bg-base-200 flex flex-col justify-end overflow-hidden">
          <video src={msg.image} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white/80" />
          </div>
        </div>
      );
    }
    if (msg.messageType === "audio" || msg.messageType === "voice_call") {
      return (
        <div key={msg._id} className="w-full p-3 flex items-center gap-4 bg-base-200 rounded-lg mb-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-base-content truncate">Audio Message</span>
            <span className="text-xs text-base-content/60">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(msg.createdAt))}</span>
          </div>
        </div>
      );
    }
    // Fallback/Files
    return (
      <div key={msg._id} className="w-full p-3 flex items-center gap-4 bg-base-200 rounded-lg mb-1">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <span className="text-sm font-medium text-base-content truncate">Document</span>
          <span className="text-xs text-base-content/60">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(msg.createdAt))}</span>
        </div>
      </div>
    );
  };

  const isGrid = activeTab === "Media" || activeTab === "All";
  const hasGridItems = filteredMessages.some(m => m.messageType === "image" || m.messageType === "video");
  const hasListItems = filteredMessages.some(m => !["image", "video"].includes(m.messageType));

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/data-storage/storage" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          All storage use
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex w-full px-2 pt-2 border-b border-transparent">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-3 text-[15px] font-medium transition-colors relative ${
              activeTab === tab ? "text-base-content" : "text-base-content/60"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-base-content rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* Filter */}
        <div className="px-5 py-6">
          <button className="flex items-center gap-1.5 text-[15px] font-bold text-base-content">
            Storage used
            <ArrowDown size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content State */}
        {isAllMediaLoading ? (
          <div className="flex-1 flex items-center justify-center pb-32">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center pb-32">
            <span className="text-[22px] text-base-content font-normal">No media</span>
          </div>
        ) : (
          <div className="px-0 flex flex-col pb-10">
            {/* Render Grid Items (Images/Videos) */}
            {isGrid && hasGridItems && (
              <div className="grid grid-cols-3 gap-[2px] mb-4">
                {filteredMessages
                  .filter(m => m.messageType === "image" || m.messageType === "video")
                  .map(msg => renderMediaItem(msg))}
              </div>
            )}
            
            {/* Render List Items (Audio/Files) */}
            {hasListItems && (
              <div className="flex flex-col gap-1 px-2">
                {filteredMessages
                  .filter(m => !["image", "video"].includes(m.messageType))
                  .map(msg => renderMediaItem(msg))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ReviewStoragePage;
