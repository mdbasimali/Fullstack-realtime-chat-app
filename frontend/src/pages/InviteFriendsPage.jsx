import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Share2 } from "lucide-react";

const InviteFriendsPage = () => {
  const inviteText = "Let's switch to ChatZone:\nhttps://chatzone.app/install";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on ChatZone",
          text: "Let's switch to ChatZone:",
          url: "https://chatzone.app/install",
        });
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(inviteText);
      alert("Invite link copied to clipboard!");
    }
  };

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
          Invite friends
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto p-4 overflow-y-auto custom-scrollbar">
        
        {/* Invite Text Box */}
        <div className="bg-[#e9edf5] dark:bg-base-200 rounded-2xl p-5 mb-2 mt-2 mx-1">
          <p className="text-[16px] text-base-content whitespace-pre-line leading-relaxed">
            {inviteText}
          </p>
        </div>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="w-full flex items-center gap-6 px-5 py-4 hover:bg-base-200 transition-colors text-left rounded-xl mt-2"
        >
          <Share2 size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
          <span className="text-[16px] text-base-content font-medium">Share</span>
        </button>

      </div>
    </div>
  );
};

export default InviteFriendsPage;
