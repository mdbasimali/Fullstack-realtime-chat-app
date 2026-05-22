import React, { useState } from "react";
import { ArrowLeft, Video, Phone, BellOff, Search, TimerOff, Edit2, Palette, Volume2, ShieldCheck, Ban, AlertTriangle, ChevronRight } from "lucide-react";
import { useChatstore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { useGroupStore } from "../store/useGroupStore";
import { getNickname } from "./ProfileModal";
import toast from "react-hot-toast";

const ContactDetailsSidebar = () => {
  const { selectedUser, setShowContactDetailsSidebar } = useChatstore();
  const { authUser } = useAuthStore();
  const { initiateCall } = useCallStore();
  const { groups } = useGroupStore();

  const [isClosing, setIsClosing] = useState(false);

  if (!selectedUser) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowContactDetailsSidebar(false);
      setIsClosing(false);
    }, 300); // Wait for animation
  };

  const currentNickname = getNickname(authUser?._id, selectedUser._id);
  const displayName = currentNickname || selectedUser.fullName;

  // Find groups in common
  const groupsInCommon = groups.filter(g => 
    g.members.some(m => m._id === selectedUser._id || m === selectedUser._id)
  );

  return (
    <div className={`absolute inset-y-0 right-0 w-full sm:w-[400px] bg-base-100 border-l border-base-200 z-[60] shadow-2xl flex flex-col ${isClosing ? 'animate-slide-right' : 'animate-slide-left'}`}>
      
      {/* Header */}
      <div className="flex items-center p-4 border-b border-base-200/50 safe-p-top">
        <button 
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#FAFAFA] dark:bg-[#1E1E1E]">
        
        {/* Profile Header Info */}
        <div className="flex flex-col items-center pt-6 pb-6 bg-base-100">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-base-200 shadow-sm mb-4">
            {selectedUser.profilePic ? (
              <img src={selectedUser.profilePic} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#E8F5E9] dark:bg-[#1B5E20] text-[#2E7D32] dark:text-[#A5D6A7] flex items-center justify-center font-semibold text-3xl">
                {selectedUser.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 cursor-pointer group">
            <h2 className="text-2xl font-medium text-base-content tracking-tight">{displayName}</h2>
            <ChevronRight size={20} className="text-base-content/40 group-hover:text-base-content/70 transition-colors" />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-6 mt-6 w-full">
            <button onClick={() => initiateCall(selectedUser, 'video')} className="flex flex-col items-center gap-2 group w-16">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] text-[#1A1A1A] dark:text-white flex items-center justify-center group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] transition-colors">
                <Video size={22} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-base-content/90">Video</span>
            </button>
            <button onClick={() => initiateCall(selectedUser, 'audio')} className="flex flex-col items-center gap-2 group w-16">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] text-[#1A1A1A] dark:text-white flex items-center justify-center group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] transition-colors">
                <Phone size={22} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-base-content/90">Audio</span>
            </button>
            <button onClick={() => toast.success("Notifications muted")} className="flex flex-col items-center gap-2 group w-16">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] text-[#1A1A1A] dark:text-white flex items-center justify-center group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] transition-colors">
                <BellOff size={22} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-base-content/90">Mute</span>
            </button>
            <button onClick={() => toast.success("Search in chat")} className="flex flex-col items-center gap-2 group w-16">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] text-[#1A1A1A] dark:text-white flex items-center justify-center group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] transition-colors">
                <Search size={22} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-base-content/90">Search</span>
            </button>
          </div>
        </div>

        {/* Options List */}
        <div className="mt-2 bg-base-100 flex flex-col py-1">
          <button className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
            <TimerOff size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-[16px] text-base-content/90">Disappearing messages</span>
              <span className="text-sm text-base-content/50 font-medium mt-0.5">Off</span>
            </div>
          </button>
          
          <button className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
            <Edit2 size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-base-content/90">Nickname</span>
          </button>
          
          <button className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
            <Palette size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-base-content/90">Chat color & wallpaper</span>
          </button>
          
          <button className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
            <Volume2 size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-base-content/90">Sounds & notifications</span>
          </button>
          
          <button className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
            <ShieldCheck size={24} className="text-base-content/80 shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-base-content/90">View safety number</span>
          </button>
        </div>

        {/* Groups in Common */}
        {groupsInCommon.length > 0 && (
          <div className="mt-2 bg-base-100 py-4">
            <h3 className="px-6 text-[13px] font-bold text-base-content/60 mb-3 tracking-wide">{groupsInCommon.length} group{groupsInCommon.length > 1 ? 's' : ''} in common</h3>
            <button className="flex items-center gap-5 px-6 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
              <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                <span className="text-xl">+</span>
              </div>
              <span className="text-[16px] text-base-content/90 font-medium">Add to a group</span>
            </button>
            {groupsInCommon.map(group => (
              <button key={group._id} className="flex items-center gap-5 px-6 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                <div className="w-10 h-10 rounded-full bg-[#FFF9C4] dark:bg-[#FBC02D]/20 text-[#F57F17] dark:text-[#FFF59D] flex items-center justify-center shrink-0 border border-[#FFF59D] dark:border-transparent">
                  <span className="font-bold text-sm">
                    {group.avatar ? (
                      <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      group.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                </div>
                <span className="text-[16px] text-base-content/90 font-medium truncate">{group.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Block / Report */}
        <div className="mt-2 bg-base-100 flex flex-col py-2 mb-8">
          <button onClick={() => toast.success("User blocked")} className="flex items-center gap-5 px-6 py-4 hover:bg-error/10 transition-colors w-full text-left">
            <Ban size={24} className="text-error shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-error">Block</span>
          </button>
          <button onClick={() => toast.success("Spam reported")} className="flex items-center gap-5 px-6 py-4 hover:bg-error/10 transition-colors w-full text-left">
            <AlertTriangle size={24} className="text-error shrink-0" strokeWidth={1.5} />
            <span className="text-[16px] text-error">Report spam</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContactDetailsSidebar;
