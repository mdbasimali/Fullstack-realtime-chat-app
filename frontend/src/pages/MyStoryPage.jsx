import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const MyStoryPage = () => {
  const [privacyMode, setPrivacyMode] = useState("all");
  const [allowReplies, setAllowReplies] = useState(true);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/stories" 
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
        
        <div className="px-6 py-4">
          <span className="text-[16px] font-bold text-base-content">Who can view this story</span>
        </div>

        <div className="flex flex-col mb-4">
          <label className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors cursor-pointer text-left">
            <input 
              type="radio" 
              name="privacy" 
              className="radio radio-primary border-2" 
              checked={privacyMode === "all"}
              onChange={() => setPrivacyMode("all")}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">All ChatZone connections</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">7 viewers</span>
            </div>
            <Link to="/settings/stories/connections" className="text-blue-600 font-medium text-[15px] p-2" onClick={(e) => e.stopPropagation()}>
              View
            </Link>
          </label>

          <label className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors cursor-pointer text-left">
            <input 
              type="radio" 
              name="privacy" 
              className="radio radio-primary border-2" 
              checked={privacyMode === "except"}
              onChange={() => setPrivacyMode("except")}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">All except...</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">Hide your story from specific people</span>
            </div>
          </label>

          <label className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors cursor-pointer text-left">
            <input 
              type="radio" 
              name="privacy" 
              className="radio radio-primary border-2" 
              checked={privacyMode === "only"}
              onChange={() => setPrivacyMode("only")}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">Only share with...</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">Only share with selected people</span>
            </div>
          </label>
        </div>

        <p className="px-6 py-2 text-[14px] text-base-content/70 leading-relaxed mb-4">
          Choose who can view your story. Changes won't affect stories you've already sent. <a href="#" className="font-bold text-base-content">Learn more</a>
        </p>

        <div className="border-b border-base-200/60 my-4 mx-0" />

        <div className="px-6 py-4">
          <span className="text-[16px] font-bold text-base-content">Replies & reactions</span>
        </div>

        <label className="w-full px-6 py-2 flex items-start justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
          <div className="flex flex-col">
            <span className="text-[16px] text-base-content font-medium">Allow replies & reactions</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
              Let people who can view your story react and reply
            </span>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary toggle-md shrink-0 mt-1"
            checked={allowReplies}
            onChange={(e) => setAllowReplies(e.target.checked)}
          />
        </label>

      </div>
    </div>
  );
};

export default MyStoryPage;
