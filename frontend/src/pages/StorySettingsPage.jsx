import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Circle } from "lucide-react";
import { useStorySettingsStore } from "../store/useStorySettingsStore";

const StorySettingsPage = () => {
  const { storySettings, fetchStorySettings, updateStorySetting } = useStorySettingsStore();

  useEffect(() => {
    fetchStorySettings();
  }, [fetchStorySettings]);

  const safeSettings = storySettings || {};
  const currentPrivacyType = safeSettings.privacyType || "ALL";

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
          My Story
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        
        {/* Who can view this story Section */}
        <div className="flex flex-col mb-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">Who can view this story</span>
          </div>

          <div 
            className={`w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors cursor-pointer text-left ${currentPrivacyType === "ALL" ? "bg-base-200/50" : ""}`}
            onClick={() => updateStorySetting("privacyType", "ALL")}
          >
            <div className="flex items-center gap-4">
              <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 transition-colors ${currentPrivacyType === "ALL" ? "border-primary" : "border-base-content/40"}`}>
                {currentPrivacyType === "ALL" && <div className="w-[10px] h-[10px] rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <span className="text-[16px] text-base-content font-medium block">All ChatZone connections</span>
                <span className="text-[14px] text-base-content/60 block mt-0.5">7 viewers</span>
              </div>
              <button 
                className="text-[15px] font-medium text-primary hover:text-primary-focus transition-colors"
                onClick={(e) => { e.stopPropagation(); console.log("View clicked"); }}
              >
                View
              </button>
            </div>
          </div>

          <div 
            className={`w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors cursor-pointer text-left ${currentPrivacyType === "EXCEPT" ? "bg-base-200/50" : ""}`}
            onClick={() => updateStorySetting("privacyType", "EXCEPT")}
          >
            <div className="flex items-center gap-4">
              <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 transition-colors ${currentPrivacyType === "EXCEPT" ? "border-primary" : "border-base-content/40"}`}>
                {currentPrivacyType === "EXCEPT" && <div className="w-[10px] h-[10px] rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <span className="text-[16px] text-base-content font-medium block">All except...</span>
                <span className="text-[14px] text-base-content/60 block mt-0.5">Hide your story from specific people</span>
              </div>
            </div>
          </div>

          <div 
            className={`w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors cursor-pointer text-left ${currentPrivacyType === "ONLY" ? "bg-base-200/50" : ""}`}
            onClick={() => updateStorySetting("privacyType", "ONLY")}
          >
            <div className="flex items-center gap-4">
              <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 transition-colors ${currentPrivacyType === "ONLY" ? "border-primary" : "border-base-content/40"}`}>
                {currentPrivacyType === "ONLY" && <div className="w-[10px] h-[10px] rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <span className="text-[16px] text-base-content font-medium block">Only share with...</span>
                <span className="text-[14px] text-base-content/60 block mt-0.5">Only share with selected people</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <p className="text-[14px] text-base-content/60 leading-relaxed">
              Choose who can view your story. Changes won't affect stories you've already sent. <span className="font-bold cursor-pointer text-base-content hover:underline">Learn more</span>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 my-2 mx-0" />

        {/* Replies & reactions Section */}
        <div className="flex flex-col mt-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">Replies & reactions</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Allow replies & reactions</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">Let people who can view your story react and reply</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={safeSettings.allowRepliesAndReactions ?? true}
              onChange={(e) => updateStorySetting("allowRepliesAndReactions", e.target.checked)}
            />
          </label>
        </div>

      </div>
    </div>
  );
};

export default StorySettingsPage;
