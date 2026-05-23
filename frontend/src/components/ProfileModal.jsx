import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Video, Phone, Edit2, ShieldCheck, User, Ban, ChevronRight, Info, X, Check, Mail, AtSign, PhoneCall, ChevronDown, Link, UserCircle, Users } from 'lucide-react';
import { useChatstore } from '../store/useChatStore';
import { useGroupStore } from '../store/useGroupStore';
import { useCallStore } from '../store/useCallStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

// Shared nickname utilities so other components can read nicknames
export const getNickname = (authUserId, friendId) => {
  if (!authUserId || !friendId) return null;
  try {
    const stored = localStorage.getItem(`nicknames_${authUserId}`);
    if (!stored) return null;
    const nicknames = JSON.parse(stored);
    return nicknames[friendId] || null;
  } catch {
    return null;
  }
};

export const setNicknameStorage = (authUserId, friendId, nickname) => {
  if (!authUserId || !friendId) return;
  try {
    const stored = localStorage.getItem(`nicknames_${authUserId}`);
    const nicknames = stored ? JSON.parse(stored) : {};
    if (nickname && nickname.trim()) {
      nicknames[friendId] = nickname.trim();
    } else {
      delete nicknames[friendId];
    }
    localStorage.setItem(`nicknames_${authUserId}`, JSON.stringify(nicknames));
    // Dispatch a custom event so other components can react
    window.dispatchEvent(new Event("nicknamesUpdated"));
  } catch {
    // silently fail
  }
};

const ProfileModal = ({ profile, onClose }) => {
  const { setSelectedUser } = useChatstore();
  const { groups, setSelectedGroup, leaveGroup, setShowGroupCallModal, setGroupCallType } = useGroupStore();
  const { initiateCall } = useCallStore();
  const { authUser } = useAuthStore();

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [viewMode, setViewMode] = useState('main');
  
  const [dragYState, setDragYState] = useState(0);
  const dragY = useRef(0);
  const setDragY = (val) => {
    dragY.current = val;
    setDragYState(val);
  };

  useEffect(() => {
    setViewMode('main');
    setDragY(0);
  }, [profile]);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const nicknameInputRef = useRef(null);

  if (!profile) return null;

  const isGroup = !!profile.members;
  const name = isGroup ? profile.name : profile.fullName;
  const pic = isGroup ? profile.avatar : profile.profilePic;

  // Read current nickname
  const currentNickname = !isGroup ? getNickname(authUser?._id, profile._id) : null;

  const getInitials = (n) => {
    if (!n) return "us";
    const parts = n.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toLowerCase();
    }
    return n.slice(0, 2).toLowerCase();
  };

  const handleMessage = () => {
    if (isGroup) {
      setSelectedGroup(profile);
    } else {
      setSelectedUser(profile);
    }
    onClose();
  };

  const handleVideoCall = () => {
    if (isGroup) {
      setGroupCallType('video');
      setShowGroupCallModal(true);
    } else {
      initiateCall(profile, 'video');
    }
    onClose();
  };

  const handleAudioCall = () => {
    if (isGroup) {
      setGroupCallType('audio');
      setShowGroupCallModal(true);
    } else {
      initiateCall(profile, 'audio');
    }
    onClose();
  };

  const handleLeaveGroup = () => {
    if (window.confirm(`Are you sure you want to leave ${name}?`)) {
      leaveGroup(profile._id);
      onClose();
    }
  };

  const openNicknameEditor = () => {
    setNicknameValue(currentNickname || "");
    setIsEditingNickname(true);
    setTimeout(() => nicknameInputRef.current?.focus(), 100);
  };

  const saveNickname = () => {
    setNicknameStorage(authUser?._id, profile._id, nicknameValue);
    setIsEditingNickname(false);
    if (nicknameValue.trim()) {
      toast.success(`Nickname set to "${nicknameValue.trim()}" ✏️`);
    } else {
      toast.success("Nickname removed");
    }
  };

  const cancelNicknameEdit = () => {
    setIsEditingNickname(false);
    setNicknameValue("");
  };

  const displayName = currentNickname || name;

  const commonGroups = (!isGroup && groups) ? groups.filter(g => 
    g.members && g.members.some(m => m === profile._id || (m._id && m._id === profile._id))
  ) : [];
  const commonGroupsText = commonGroups.length > 0 
    ? `${commonGroups.length} group${commonGroups.length > 1 ? 's' : ''} in common`
    : "No groups in common";

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;

    // Don't drag if we are scrolling down inside the list
    const scrollable = e.target.closest('.overflow-y-auto');
    if (scrollable && scrollable.scrollTop > 0) {
      touchStartY.current = e.touches[0].clientY; // Reset start Y to prevent jumping when reached top
      return;
    }

    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (dragY.current > 80) {
      setDragY(window.innerHeight); // Animate off screen
      setTimeout(() => onClose(), 300);
    } else {
      setDragY(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div 
        className="w-full sm:w-[400px] bg-base-100 sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `translateY(${dragYState}px)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
          // Check if clicking inside scrollable content
          const scrollable = e.target.closest('.overflow-y-auto');
          if (scrollable && scrollable.scrollTop > 0) return;

          const startY = e.clientY;
          isDragging.current = true;

          const onMouseMove = (ev) => {
            if (!isDragging.current) return;
            const diff = ev.clientY - startY;
            if (diff > 0) setDragY(diff);
          };

          const onMouseUp = (ev) => {
            isDragging.current = false;
            const finalDiff = ev.clientY - startY;
            if (finalDiff > 80 || dragY.current > 80) {
              setDragY(window.innerHeight); // Animate off screen
              setTimeout(() => onClose(), 300);
            } else {
              setDragY(0);
            }
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1 rounded-full bg-base-300"></div>
        </div>

        {viewMode === 'main' ? (
          <>
            <div className="flex flex-col items-center pt-4 sm:pt-10 px-6 pb-6">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-base-200 shadow-sm">
            {pic ? (
              <img src={pic} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-3xl">
                {getInitials(name)}
              </div>
            )}
          </div>

          {/* Name + Nickname */}
          <div className="mt-4 flex flex-col items-center gap-1">
            <div 
              onClick={() => { if (!isGroup) setViewMode('detailed'); }}
              className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <h2 className="text-xl sm:text-2xl font-medium text-base-content">{displayName}</h2>
              {!isGroup && <User size={20} className="text-base-content/70" />}
              <ChevronRight size={20} className="text-base-content/40" />
            </div>
            {currentNickname && !isGroup && (
              <p className="text-xs text-base-content/50 font-medium">{name}</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-6 mt-6 w-full justify-center">
            <button onClick={handleMessage} className="flex flex-col items-center gap-2.5 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] flex items-center justify-center transition-colors">
                <MessageSquare size={24} className="text-[#1A1A1A] dark:text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-base-content/90">Message</span>
            </button>
            <button onClick={handleVideoCall} className="flex flex-col items-center gap-2.5 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] flex items-center justify-center transition-colors">
                <Video size={24} className="text-[#1A1A1A] dark:text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-base-content/90">Video</span>
            </button>
            <button onClick={handleAudioCall} className="flex flex-col items-center gap-2.5 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EAF6] dark:bg-[#282A36] group-hover:bg-[#DEDFF1] dark:group-hover:bg-[#343644] flex items-center justify-center transition-colors">
                <Phone size={24} className="text-[#1A1A1A] dark:text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-base-content/90">Audio</span>
            </button>
          </div>
        </div>

        {/* List Options */}
        <div className="border-t border-base-200/60 bg-[#FAFAFA] dark:bg-[#1E1E1E] flex-1 overflow-y-auto pt-2 pb-6">
          {!isGroup ? (
            <div className="flex flex-col">
              {/* Nickname - with inline editor */}
              {isEditingNickname ? (
                <div className="flex items-center gap-3 px-6 py-3">
                  <Edit2 size={24} className="text-primary shrink-0" strokeWidth={1.5} />
                  <input
                    ref={nicknameInputRef}
                    type="text"
                    value={nicknameValue}
                    onChange={(e) => setNicknameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNickname();
                      if (e.key === "Escape") cancelNicknameEdit();
                    }}
                    placeholder="Enter a nickname..."
                    maxLength={30}
                    className="flex-1 px-3 py-2 rounded-xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  />
                  <button
                    onClick={saveNickname}
                    className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Save"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={cancelNicknameEdit}
                    className="p-2 rounded-full hover:bg-base-200 text-base-content/50 transition-colors"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={openNicknameEditor} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                  <Edit2 size={24} className="text-base-content/80" strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-[16px] text-base-content/90">Nickname</span>
                    {currentNickname && (
                      <span className="text-xs text-primary/70 font-medium mt-0.5">{currentNickname}</span>
                    )}
                  </div>
                </button>
              )}

              <button onClick={() => toast.success("Safety number verified ✓")} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                <ShieldCheck size={24} className="text-base-content/80" strokeWidth={1.5} />
                <span className="text-[16px] text-base-content/90">View safety number</span>
              </button>
              <button onClick={() => setShowContactInfo(!showContactInfo)} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                <User size={24} className="text-base-content/80" strokeWidth={1.5} />
                <span className="text-[16px] text-base-content/90 flex-1">Phone contact info</span>
                <ChevronDown size={18} className={`text-base-content/40 transition-transform duration-200 ${showContactInfo ? "rotate-180" : ""}`} />
              </button>
              {showContactInfo && (
                <div className="px-6 pb-3 space-y-3 animate-fade-in">
                  {/* Email */}
                  {profile.email && (
                    <div className="flex items-center gap-4 py-2.5 px-4 bg-base-200/40 dark:bg-base-200/20 rounded-xl">
                      <Mail size={18} className="text-primary/70 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider">Email</p>
                        <p className="text-sm text-base-content/90 font-medium truncate">{profile.email}</p>
                      </div>
                    </div>
                  )}
                  {/* Username */}
                  {profile.username && (
                    <div className="flex items-center gap-4 py-2.5 px-4 bg-base-200/40 dark:bg-base-200/20 rounded-xl">
                      <AtSign size={18} className="text-primary/70 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider">Username</p>
                        <p className="text-sm text-base-content/90 font-medium truncate">@{profile.username}</p>
                      </div>
                    </div>
                  )}
                  {/* Phone */}
                  {profile.phoneNumber && (
                    <div className="flex items-center gap-4 py-2.5 px-4 bg-base-200/40 dark:bg-base-200/20 rounded-xl">
                      <PhoneCall size={18} className="text-primary/70 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider">Phone</p>
                        <p className="text-sm text-base-content/90 font-medium truncate">{profile.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                  {/* About */}
                  {profile.about && (
                    <div className="flex items-center gap-4 py-2.5 px-4 bg-base-200/40 dark:bg-base-200/20 rounded-xl">
                      <Info size={18} className="text-primary/70 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider">About</p>
                        <p className="text-sm text-base-content/90 font-medium truncate">{profile.about}</p>
                      </div>
                    </div>
                  )}
                  {/* No info fallback */}
                  {!profile.email && !profile.username && !profile.phoneNumber && !profile.about && (
                    <p className="text-xs text-base-content/40 text-center py-2 font-medium">No contact info available</p>
                  )}
                </div>
              )}
              <button onClick={() => toast.success("User blocked")} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left mt-1">
                <Ban size={24} className="text-base-content/80" strokeWidth={1.5} />
                <span className="text-[16px] text-base-content/90">Block</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <button onClick={() => toast.success("Group info coming soon!")} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                <Info size={24} className="text-base-content/80" strokeWidth={1.5} />
                <span className="text-[16px] text-base-content/90">Group info</span>
              </button>
              <button onClick={handleLeaveGroup} className="flex items-center gap-5 px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left mt-1 text-red-500">
                <Ban size={24} className="text-red-500/80" strokeWidth={1.5} />
                <span className="text-[16px] text-red-500/90">Leave group</span>
              </button>
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="flex flex-col h-[85vh] sm:h-[600px] overflow-y-auto custom-scrollbar pb-10 animate-fade-in">
            {/* Very large avatar */}
            <div className="w-full flex justify-center mt-6 mb-8">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-md">
                {pic ? (
                  <img src={pic} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-6xl">
                    {getInitials(name)}
                  </div>
                )}
              </div>
            </div>

            {/* About header */}
            <div className="px-6 mb-2">
              <h2 className="text-3xl font-medium text-base-content tracking-tight">About</h2>
              {profile.about && (
                <p className="text-base-content/80 mt-1 text-[16px] leading-relaxed">
                  {profile.about}
                </p>
              )}
            </div>

            {/* Rows */}
            <div className="flex flex-col mt-2">
              <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                <User size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                <span className="text-[17px] text-base-content font-medium">{displayName}</span>
              </div>
              
              <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                <Link size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                <span className="text-[17px] text-base-content font-medium">Signal connection &gt;</span>
              </div>
              
              <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                <UserCircle size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                <span className="text-[17px] text-base-content font-medium">{displayName} is in your phone contacts</span>
              </div>
              
              {profile.email && (
                <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                  <Mail size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-[17px] text-base-content font-medium">{profile.email}</span>
                </div>
              )}
              
              {profile.username && (
                <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                  <AtSign size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-[17px] text-base-content font-medium">@{profile.username}</span>
                </div>
              )}

              {profile.phoneNumber && (
                <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                  <Phone size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-[17px] text-base-content font-medium">{profile.phoneNumber}</span>
                </div>
              )}
              
              <div className="flex items-center gap-5 px-6 py-3 hover:bg-base-200/50 transition-colors cursor-pointer">
                <Users size={24} className="text-base-content/70 shrink-0" strokeWidth={1.5} />
                <span className="text-[17px] text-base-content font-medium">{commonGroupsText}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
