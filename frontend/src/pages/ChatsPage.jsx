import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ChatsPage = () => {
  const [linkPreviews, setLinkPreviews] = useState(true);
  const [addressBookPhotos, setAddressBookPhotos] = useState(false);
  const [keepArchived, setKeepArchived] = useState(false);
  const [useSystemEmoji, setUseSystemEmoji] = useState(false);

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
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Top items */}
        <div className="flex flex-col mt-2 mb-4">
          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Generate link previews</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                Retrieve link previews directly from websites for messages you send.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-md shrink-0"
              checked={linkPreviews}
              onChange={(e) => setLinkPreviews(e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Use address book photos</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
                Display contact photos from your address book if available
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={addressBookPhotos}
              onChange={(e) => setAddressBookPhotos(e.target.checked)}
            />
          </label>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">Keep muted chats archived</span>
              <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed pr-2">
                Muted chats that are archived will remain archived when a new message arrives.
              </span>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={keepArchived}
              onChange={(e) => setKeepArchived(e.target.checked)}
            />
          </label>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Chat folders Section */}
        <div className="flex flex-col mt-2 mb-2">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Chat folders</span>
          </div>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Add or edit folders</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">2 folders</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Export chat history Section */}
        <div className="flex flex-col mt-2 mb-2">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Export chat history</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed pr-2">
              Export a machine-readable JSON copy of all your chats. Disappearing messages will not be exported.
            </span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Keyboard Section */}
        <div className="flex flex-col mt-2 mb-8">
          <div className="px-6 py-4">
            <span className="text-[14px] font-bold text-base-content">Keyboard</span>
          </div>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
            <span className="text-[16px] text-base-content font-medium">Use system emoji</span>
            <input 
              type="checkbox" 
              className="toggle toggle-md shrink-0"
              checked={useSystemEmoji}
              onChange={(e) => setUseSystemEmoji(e.target.checked)}
            />
          </label>
        </div>

      </div>
    </div>
  );
};

export default ChatsPage;
