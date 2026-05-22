import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSettingsStore } from "../store/useSettingsStore";

const ChatsSettingsPage = () => {
  const { settings, fetchSettings, updateSetting, isLoading } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading && !settings) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Fallbacks if not fully loaded yet
  const safeSettings = settings || {};

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
          Chats
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        
        {/* Toggle Settings Section */}
        <div className="flex flex-col mb-4">
          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Generate link previews</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">Retrieve link previews directly from websites for messages you send.</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md"
              checked={safeSettings.generateLinkPreviews ?? true}
              onChange={(e) => updateSetting("generateLinkPreviews", e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Use address book photos</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">Display contact photos from your address book if available</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={safeSettings.useAddressBookPhotos ?? false}
              onChange={(e) => updateSetting("useAddressBookPhotos", e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Keep muted chats archived</span>
              <span className="text-[14px] text-base-content/60 block mt-0.5">Muted chats that are archived will remain archived when a new message arrives.</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={safeSettings.keepMutedChatsArchived ?? false}
              onChange={(e) => updateSetting("keepMutedChatsArchived", e.target.checked)}
            />
          </label>
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 my-2 mx-0" />

        {/* Chat Folders Section */}
        <div className="flex flex-col mt-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">Chat folders</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Add or edit folders</span>
            <span className="text-[14px] text-base-content/60 block mt-0.5">2 folders</span>
          </button>
        </div>

        {/* Export Chat History Section */}
        <div className="flex flex-col mt-4">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left bg-base-200/50">
            <span className="text-[16px] text-base-content font-medium">Export chat history</span>
            <span className="text-[14px] text-base-content/60 block mt-0.5">Export a machine-readable JSON copy of all your chats. Disappearing messages will not be exported.</span>
          </button>
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 my-2 mx-0 mt-4" />

        {/* Keyboard Section */}
        <div className="flex flex-col mt-4">
          <div className="px-6 py-3">
            <span className="text-[14px] font-bold text-base-content">Keyboard</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <div className="pr-4">
              <span className="text-[16px] text-base-content font-medium block">Use system emoji</span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md"
              checked={safeSettings.useSystemEmoji ?? false}
              onChange={(e) => updateSetting("useSystemEmoji", e.target.checked)}
            />
          </label>
        </div>

      </div>
    </div>
  );
};

export default ChatsSettingsPage;
