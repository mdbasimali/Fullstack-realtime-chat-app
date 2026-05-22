import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStorySettingsStore } from "../store/useStorySettingsStore";

const MyStoryPage = () => {
  const navigate = useNavigate();
  const { storySettings, fetchStorySettings, updateStorySetting } = useStorySettingsStore();
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);

  useEffect(() => {
    fetchStorySettings();
  }, [fetchStorySettings]);

  const safeSettings = storySettings || {};
  const privacyMode = safeSettings.privacyType?.toLowerCase() || "all";
  const allowReplies = safeSettings.allowRepliesAndReactions ?? true;
  const excludedCount = safeSettings.excludedUsers?.length || 0;
  const allowedCount = safeSettings.allowedUsers?.length || 0;

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
              onChange={() => updateStorySetting("privacyType", "ALL")}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">All ChatZone connections</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">7 viewers</span>
            </div>
            <Link to="/settings/stories/connections" className="text-blue-600 font-medium text-[15px] p-2" onClick={(e) => e.stopPropagation()}>
              View
            </Link>
          </label>

          <label 
            className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors cursor-pointer text-left"
            onClick={(e) => {
              if (e.target.type !== 'radio') {
                e.preventDefault();
                navigate("/settings/stories/privacy-except");
              }
            }}
          >
            <input 
              type="radio" 
              name="privacy" 
              className="radio radio-primary border-2" 
              checked={privacyMode === "except"}
              onChange={() => {
                updateStorySetting("privacyType", "EXCEPT");
                navigate("/settings/stories/privacy-except");
              }}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">All except...</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">
                {excludedCount > 0 ? `${excludedCount} excluded` : "Hide your story from specific people"}
              </span>
            </div>
          </label>

          <label 
            className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors cursor-pointer text-left"
            onClick={(e) => {
              if (e.target.type !== 'radio') {
                e.preventDefault();
                navigate("/settings/stories/privacy-only");
              }
            }}
          >
            <input 
              type="radio" 
              name="privacy" 
              className="radio radio-primary border-2" 
              checked={privacyMode === "only"}
              onChange={() => {
                updateStorySetting("privacyType", "ONLY");
                navigate("/settings/stories/privacy-only");
              }}
            />
            <div className="flex flex-col flex-1">
              <span className="text-[16px] text-base-content font-medium">Only share with...</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">
                {allowedCount > 0 ? `${allowedCount} selected` : "Only share with selected people"}
              </span>
            </div>
          </label>
        </div>

        <p className="px-6 py-2 text-[14px] text-base-content/70 leading-relaxed mb-4">
          Choose who can view your story. Changes won't affect stories you've already sent.{" "}
          <button onClick={() => setShowLearnMoreModal(true)} className="font-bold text-base-content cursor-pointer hover:underline">
            Learn more
          </button>
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
            onChange={(e) => updateStorySetting("allowRepliesAndReactions", e.target.checked)}
          />
        </label>

      </div>

      {/* Learn More Modal (Bottom Sheet) */}
      {showLearnMoreModal && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end p-0 animate-fade-in"
          onClick={() => setShowLearnMoreModal(false)}
        >
          <div 
            className="bg-base-100 w-full rounded-t-[28px] shadow-2xl animate-slide-up pb-8 px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-6">
              <div className="w-10 h-1 bg-base-300 rounded-full"></div>
            </div>

            {/* Logo area */}
            <div className="flex justify-center mb-8">
              <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="size-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
            </div>

            <div className="text-[16px] text-base-content leading-relaxed space-y-6 max-w-md mx-auto">
              <p>
                <span className="font-bold">ChatZone Connections</span> are people you've chosen to trust, either by:
              </p>
              
              <ul className="space-y-4 relative pl-4">
                <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-base-300"></div>
                <li className="flex items-center gap-4 relative">
                  <div className="absolute -left-[5px] w-1.5 h-6 bg-base-300 rounded-full"></div>
                  Starting a chat
                </li>
                <li className="flex items-center gap-4 relative">
                  <div className="absolute -left-[5px] w-1.5 h-6 bg-base-300 rounded-full"></div>
                  Accepting a message request
                </li>
                <li className="flex items-center gap-4 relative">
                  <div className="absolute -left-[5px] w-1.5 h-6 bg-base-300 rounded-full"></div>
                  Having them in your phone contacts
                </li>
              </ul>

              <p className="pt-2">
                Your connections can see your name and photo, and can see posts to My Story unless you hide it from them.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyStoryPage;
