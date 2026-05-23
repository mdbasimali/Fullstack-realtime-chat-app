import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Copy, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const StoriesPage = () => {
  const { authUser } = useAuthStore();
  const [viewReceipts, setViewReceipts] = useState(true);
  const [showTurnOffModal, setShowTurnOffModal] = useState(false);
  const [showNewStoryModal, setShowNewStoryModal] = useState(false);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans relative">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Stories
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        <p className="px-6 py-4 text-[15px] text-base-content/80 leading-relaxed">
          Story updates automatically disappear after 24 hours. Choose who can view your story or create new stories with specific viewers or groups.
        </p>

        <div className="flex flex-col mb-4 mt-2">
          <div className="px-6 py-2">
            <span className="text-[14px] font-bold text-base-content">Stories</span>
          </div>

          <button 
            onClick={() => setShowNewStoryModal(true)}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-base-200 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-base-200/80 border border-base-300 flex items-center justify-center shrink-0">
              <Plus size={24} className="text-base-content/70" />
            </div>
            <span className="text-[16px] text-base-content font-medium">New story</span>
          </button>

          <Link to="/settings/stories/my-story" className="w-full px-6 py-4 flex items-center gap-4 hover:bg-base-200 transition-colors text-left">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-medium text-[16px]">
              {authUser?.fullName ? authUser.fullName.slice(0, 2).toLowerCase() : "mr"}
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content font-medium">My Story</span>
              <span className="text-[14px] text-base-content/60 mt-0.5">Tap to choose your viewers</span>
            </div>
          </Link>
        </div>

        <div className="border-b border-base-200/60 my-2 mx-0" />

        <label className="w-full px-6 py-6 flex items-start justify-between hover:bg-base-200 transition-colors cursor-pointer text-left gap-4">
          <div className="flex flex-col">
            <span className="text-[16px] text-base-content font-medium">View receipts</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
              See and share when stories are viewed. If disabled, you won't see when others view your story.
            </span>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary toggle-md shrink-0 mt-1"
            checked={viewReceipts}
            onChange={(e) => setViewReceipts(e.target.checked)}
          />
        </label>

        <div className="border-b border-base-200/60 my-2 mx-0" />

        <button 
          onClick={() => setShowTurnOffModal(true)}
          className="w-full px-6 py-6 flex flex-col hover:bg-base-200 transition-colors text-left"
        >
          <span className="text-[16px] text-base-content font-medium">Turn off stories</span>
          <span className="text-[14px] text-base-content/60 mt-0.5 leading-relaxed">
            If you opt out of stories you will no longer be able to share or view stories.
          </span>
        </button>

      </div>

      {/* Turn off stories modal */}
      {showTurnOffModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-base-100 rounded-3xl w-[90%] max-w-sm p-6 shadow-2xl animate-scale-up">
            <h3 className="text-[20px] font-normal text-base-content mb-4">Turn off stories?</h3>
            <p className="text-[15px] text-base-content/80 leading-relaxed mb-8">
              You will no longer be able to share or view stories. Story updates you have recently shared will also be deleted.
            </p>
            <div className="flex justify-end gap-6 text-[15px] font-medium">
              <button 
                onClick={() => setShowTurnOffModal(false)}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowTurnOffModal(false)}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                Turn off stories
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New story type modal */}
      {showNewStoryModal && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end p-0 animate-fade-in"
          onClick={() => setShowNewStoryModal(false)}
        >
          <div 
            className="bg-base-200 w-full rounded-t-[28px] overflow-hidden shadow-2xl animate-slide-up pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 bg-base-300 rounded-full"></div>
            </div>
            <div className="px-6 pb-2 text-center">
              <h3 className="text-[20px] font-normal text-base-content">Choose your story type</h3>
            </div>
            
            <div className="flex flex-col mt-4">
              <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-base-300/50 transition-colors text-left">
                <div className="w-12 h-12 rounded-full bg-base-100 border border-base-300 flex items-center justify-center shrink-0">
                  <Copy size={22} className="text-base-content/80" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] text-base-content font-medium">New custom story</span>
                  <span className="text-[14px] text-base-content/60 mt-0.5">Visible only to specific people</span>
                </div>
              </button>

              <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-base-300/50 transition-colors text-left">
                <div className="w-12 h-12 rounded-full bg-base-100 border border-base-300 flex items-center justify-center shrink-0">
                  <Users size={22} className="text-base-content/80" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] text-base-content font-medium">Group story</span>
                  <span className="text-[14px] text-base-content/60 mt-0.5">Share to an existing group</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesPage;
