import { useState, useEffect, useRef } from "react";
import { Video, Phone, MoreVertical, ArrowLeft, Trash2, PhoneOff, UserPlus, X, Loader2, Info, Lock } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { useGroupStore } from "../store/useGroupStore";
import { getNickname } from "./ProfileModal";
import toast from "react-hot-toast";
import SafetyNumberModal from "./SafetyNumberModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, setShowContactDetailsSidebar, deleteConversation } = useChatstore();
  const { 
    selectedGroup, 
    setSelectedGroup, 
    leaveGroup, 
    showGroupDetailsSidebar,
    setShowGroupDetailsSidebar,
    setShowAddMembersSidebar,
    selectedGroupDetails,
    isFetchingGroupDetails,
    setShowGroupCallModal,
    setGroupCallType
  } = useGroupStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { initiateCall, activeGroupCalls, joinGroupCall } = useCallStore();

  const lastUserRef = useRef(selectedUser);
  const lastGroupRef = useRef(selectedGroup);
  
  if (selectedUser || selectedGroup) {
    lastUserRef.current = selectedUser;
    lastGroupRef.current = selectedGroup;
  }

  const safeUser = selectedUser || lastUserRef.current;
  const safeGroup = selectedGroup || lastGroupRef.current;

  const [nicknamesVersion, setNicknamesVersion] = useState(0);
  const [dropdownView, setDropdownView] = useState("main");
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSafetyNumberModal, setShowSafetyNumberModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleNicknameUpdate = () => setNicknamesVersion(v => v + 1);
    window.addEventListener("nicknamesUpdated", handleNicknameUpdate);
    return () => window.removeEventListener("nicknamesUpdated", handleNicknameUpdate);
  }, []);

  const handleGroupCallClick = (type) => {
    setGroupCallType(type);
    setShowGroupCallModal(true);
  };

  const handleBack = () => {
    if (safeGroup) {
      setSelectedGroup(null);
    } else {
      setSelectedUser(null);
    }
  };

  const activeAvatarName = safeGroup ? safeGroup.name : safeUser?.fullName;

  if (!safeUser && !safeGroup) return null;

  return (
    <>
    <div className="py-1.5 px-3 safe-p-1.5-top border-b border-base-300 bg-base-100/95 backdrop-blur-md flex items-center justify-between shadow-sm relative z-50">
      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors shrink-0"
          title="Back"
        >
          <ArrowLeft size={21} />
        </button>

        {/* Clickable Profile Block */}
        <div 
          onClick={() => {
            if (safeGroup) {
              setShowGroupDetailsSidebar(true);
            } else {
              setShowContactDetailsSidebar(true);
            }
          }}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-base-200/50 py-1 px-2 -ml-2 rounded-xl transition-colors"
        >
          {/* Avatar */}
          <div className="avatar shrink-0">
            <div className="size-8 rounded-full relative flex items-center justify-center bg-blue-100 dark:bg-blue-950/40 text-primary font-bold">
              {safeGroup ? (
                safeGroup.avatar ? (
                  <img
                    src={safeGroup.avatar}
                    alt={safeGroup.name}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  safeGroup.name.slice(0, 2).toUpperCase()
                )
              ) : (
                <img
                  src={safeUser.profilePic || "/avatar.png"}
                  alt={safeUser.fullName}
                  className="rounded-full object-cover"
                />
              )}
            </div>
          </div>

          {/* User / Group info */}
          <div className="text-left flex-1 min-w-0">
            <h3 className="font-semibold text-sm md:text-base leading-tight flex items-center gap-1.5 text-base-content">
              <span className="truncate">
                {safeGroup ? safeGroup.name : (getNickname(authUser?._id, safeUser._id) || safeUser.fullName)}
              </span>
              {!safeGroup && safeUser?.publicKey && (
                <Lock size={12} className="text-emerald-500 shrink-0" title="End-to-End Encrypted" />
              )}
            </h3>
            <p className="text-[11px] text-base-content/60 font-semibold mt-0.5 truncate">
              {safeGroup ? (
                `${safeGroup.membersCount} members`
              ) : onlineUsers.includes(safeUser._id) ? (
                <span className="text-emerald-500">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right Actions: Video Call, Phone Call, 3-Dot menu */}
      <div className="flex items-center gap-1.5">
        {!safeGroup && (
          <>
            <button 
              onClick={() => initiateCall(safeUser, "video")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Video Call"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => initiateCall(safeUser, "audio")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Voice Call"
            >
              <Phone size={20} />
            </button>
          </>
        )}

        {safeGroup && (
          <>
            {activeGroupCalls[safeGroup._id] && (
              <button 
                onClick={() => joinGroupCall(safeGroup._id, "video")}
                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-emerald-600/25 animate-pulse transition-all duration-300 mr-1"
                title="Join Active Group Call"
              >
                <Phone size={13} />
                <span className="hidden xs:inline sm:inline">Join</span>
              </button>
            )}
            <button 
              onClick={() => handleGroupCallClick("video")}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Group Video Call"
            >
              <Video size={19} />
            </button>
            <button 
              onClick={() => handleGroupCallClick("audio")}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Group Voice Call"
            >
              <Phone size={19} />
            </button>
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/85 transition-colors hidden sm:inline-flex"
              title="Add Member"
            >
              <UserPlus size={19} />
            </button>
            <button 
              onClick={() => setShowGroupDetailsSidebar(!showGroupDetailsSidebar)}
              className={`p-2 rounded-full hover:bg-base-200 transition-colors hidden sm:inline-flex ${showGroupDetailsSidebar ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-base-content/85"}`}
              title="Group Details"
            >
              <Info size={19} />
            </button>
          </>
        )}

        {/* Dropdown Options */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} onClick={() => setDropdownView("main")} className="btn btn-ghost btn-circle p-0 size-10 hover:bg-base-200 text-base-content/85 cursor-pointer flex items-center justify-center">
            <MoreVertical size={20} />
          </label>
          <ul ref={dropdownRef} tabIndex={0} className="dropdown-content menu p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-base-100 rounded-xl border border-base-200 w-56 z-50 mt-2 flex flex-col space-y-0.5 text-base-content/90">
            {dropdownView === "main" ? (
              safeGroup ? (
                <>
                  <li>
                    <button 
                      onClick={() => { setShowAddMembersSidebar(true); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Add members
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setShowGroupDetailsSidebar(!showGroupDetailsSidebar); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Group info
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Group media
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Search
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Mute notifications
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Disappearing messages
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Chat theme
                    </button>
                  </li>
                  <li>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        dropdownRef.current?.focus();
                        setDropdownView("more");
                      }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors flex justify-between items-center w-full"
                    >
                      More
                      <span className="text-base-content/40 opacity-70">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      New group
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setShowContactDetailsSidebar(true); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      View contact
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setShowSafetyNumberModal(true); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Verify Safety Number
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Search
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Media, links, and docs
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Mute notifications
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Disappearing messages
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Wallpaper
                    </button>
                  </li>
                  <li>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        dropdownRef.current?.focus();
                        setDropdownView("more");
                      }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors flex justify-between items-center w-full"
                    >
                      More
                      <span className="text-base-content/40 opacity-70">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </button>
                  </li>
                </>
              )
            ) : (
              safeGroup ? (
                <>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Clear chat
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Export chat
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Add shortcut
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Add to list
                    </button>
                  </li>
                  
                  <div className="divider my-0"></div>

                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Report
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={async () => {
                        const confirmLeave = window.confirm(`Are you sure you want to exit ${safeGroup.name}?`);
                        if (confirmLeave) {
                          await leaveGroup(safeGroup._id);
                        }
                        document.activeElement?.blur();
                      }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start"
                    >
                      Exit group
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        dropdownRef.current?.focus();
                        setDropdownView("main");
                      }}
                      className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-bold text-[15px] transition-colors flex items-center gap-2 w-full text-base-content/70"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Report
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Block
                    </button>
                  </li>
                  <li>
                    <button onClick={(e) => { 
                      e.preventDefault();
                      document.activeElement?.blur(); 
                      setShowClearModal(true);
                    }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start text-error">
                      Clear chat
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Export chat
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Add shortcut
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { toast.success("Feature coming soon!"); document.activeElement?.blur(); }} className="hover:bg-base-200 py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors justify-start">
                      Add to list
                    </button>
                  </li>
                </>
              )
            )}
          </ul>
        </div>
      </div>
    </div>

    {/* Modern Clear Chat Modal */}
    {showClearModal && safeUser && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-base-100 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="size-14 rounded-full bg-error/10 flex items-center justify-center text-error mb-4">
            <Trash2 size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">Clear Chat?</h3>
          <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
            This chat will be permanently deleted and cannot be recovered. This includes all messages, media, and attachments for everyone.
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => setShowClearModal(false)}
              disabled={isClearing}
              className="flex-1 btn btn-ghost rounded-2xl"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                setIsClearing(true);
                try {
                  await deleteConversation(safeUser._id);
                  toast.success("Chat permanently deleted");
                  setShowClearModal(false);
                } catch (error) {
                  toast.error("Failed to delete chat");
                } finally {
                  setIsClearing(false);
                }
              }}
              disabled={isClearing}
              className="flex-1 btn btn-error text-white rounded-2xl border-none shadow-lg shadow-error/20"
            >
              {isClearing ? <Loader2 className="animate-spin" size={20} /> : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Safety Number Modal */}
    <SafetyNumberModal 
      isOpen={showSafetyNumberModal}
      onClose={() => setShowSafetyNumberModal(false)}
    />
    </>
  );
};

export default ChatHeader;
