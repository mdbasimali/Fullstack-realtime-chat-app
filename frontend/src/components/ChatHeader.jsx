import { useState } from "react";
import { Video, Phone, MoreVertical, ArrowLeft, User, Trash2, PhoneOff, UserPlus, X, Loader2, Info } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { useGroupStore } from "../store/useGroupStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatstore();
  const { 
    selectedGroup, 
    setSelectedGroup, 
    leaveGroup, 
    addMemberToGroup,
    showGroupDetailsSidebar,
    setShowGroupDetailsSidebar,
    selectedGroupDetails,
    isFetchingGroupDetails,
    setShowGroupCallModal,
    setGroupCallType
  } = useGroupStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGroupCallClick = (type) => {
    setGroupCallType(type);
    setShowGroupCallModal(true);
  };

  const handleBack = () => {
    if (selectedGroup) {
      setSelectedGroup(null);
    } else {
      setSelectedUser(null);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberIdentifier.trim()) return;

    setIsSubmitting(true);
    const success = await addMemberToGroup(selectedGroup._id, memberIdentifier.trim());
    setIsSubmitting(false);

    if (success) {
      setMemberIdentifier("");
      setShowAddMemberModal(false);
    }
  };

  const activeAvatarName = selectedGroup ? selectedGroup.name : selectedUser?.fullName;

  return (
    <div className="p-3 safe-p-3-top border-b border-base-300 bg-base-100/95 backdrop-blur-md flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Back"
        >
          <ArrowLeft size={21} />
        </button>

        {/* Avatar */}
        <div className="avatar">
          <div className="size-10 rounded-full relative flex items-center justify-center bg-indigo-100 dark:bg-indigo-950/40 text-primary font-bold">
            {selectedGroup ? (
              selectedGroup.avatar ? (
                <img
                  src={selectedGroup.avatar}
                  alt={selectedGroup.name}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                selectedGroup.name.slice(0, 2).toUpperCase()
              )
            ) : (
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="rounded-full object-cover"
              />
            )}
          </div>
        </div>

        {/* User / Group info */}
        <div className="text-left">
          <h3 className="font-semibold text-sm md:text-base leading-tight flex items-center gap-1.5 text-base-content">
            {selectedGroup ? selectedGroup.name : selectedUser.fullName}
            {!selectedGroup && (
              <span className="p-0.5 rounded-full border border-base-300 bg-base-200/50 inline-flex items-center justify-center text-base-content/60 cursor-pointer">
                <User size={12} />
              </span>
            )}
          </h3>
          <p className="text-[11px] text-base-content/60 font-semibold mt-0.5">
            {selectedGroup ? (
              `${selectedGroup.membersCount} members`
            ) : onlineUsers.includes(selectedUser._id) ? (
              <span className="text-emerald-500">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Right Actions: Video Call, Phone Call, 3-Dot menu */}
      <div className="flex items-center gap-1.5">
        {!selectedGroup && (
          <>
            <button 
              onClick={() => initiateCall(selectedUser, "video")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Video Call"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => initiateCall(selectedUser, "audio")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Voice Call"
            >
              <Phone size={20} />
            </button>
          </>
        )}

        {selectedGroup && (
          <>
            <button 
              onClick={() => handleGroupCallClick("video")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Group Video Call"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => handleGroupCallClick("audio")}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Group Voice Call"
            >
              <Phone size={20} />
            </button>
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
              title="Add Member"
            >
              <UserPlus size={20} />
            </button>
            <button 
              onClick={() => setShowGroupDetailsSidebar(!showGroupDetailsSidebar)}
              className={`p-2.5 rounded-full hover:bg-base-200 transition-colors ${showGroupDetailsSidebar ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-base-content/85"}`}
              title="Group Details"
            >
              <Info size={20} />
            </button>
          </>
        )}

        {/* Dropdown Options */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle p-0 size-10 hover:bg-base-200 text-base-content/85 cursor-pointer flex items-center justify-center">
            <MoreVertical size={20} />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-2xl border border-base-300 w-52 z-30 mt-1">
            {selectedGroup ? (
              <li>
                <button 
                  onClick={async () => {
                    const confirmLeave = window.confirm(`Are you sure you want to leave ${selectedGroup.name}?`);
                    if (confirmLeave) {
                      await leaveGroup(selectedGroup._id);
                    }
                  }}
                  className="text-error hover:bg-error/10 active:bg-error/20 flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold"
                >
                  <Trash2 size={16} />
                  Leave Group
                </button>
              </li>
            ) : (
              <>
                <li>
                  <button 
                    onClick={async () => {
                      const confirmDelete = window.confirm("Are you sure you want to permanently delete this conversation and all its messages?");
                      if (confirmDelete) {
                        await useChatstore.getState().deleteConversation(selectedUser._id);
                      }
                    }}
                    className="text-error hover:bg-error/10 active:bg-error/20 flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold"
                  >
                    <Trash2 size={16} />
                    Delete Chat
                  </button>
                </li>
                <li>
                  <button 
                    onClick={async () => {
                      const confirmClear = window.confirm("Are you sure you want to clear all call logs from this chat?");
                      if (confirmClear) {
                        await useChatstore.getState().clearCallLogs(selectedUser._id);
                      }
                    }}
                    className="hover:bg-base-200 flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold"
                  >
                    <PhoneOff size={16} className="text-base-content/60" />
                    Clear Call Logs
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-base-100 border border-base-300 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl animate-scale-up">
            <header className="px-6 py-5 border-b border-base-200 flex justify-between items-center bg-base-150">
              <div className="text-left">
                <h3 className="text-base font-extrabold text-base-content tracking-tight">Add Group Member</h3>
                <p className="text-xs text-base-content/50 mt-0.5">Add by email or username</p>
              </div>
              <button 
                onClick={() => { setShowAddMemberModal(false); setMemberIdentifier(""); }}
                className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleAddMemberSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase px-1">Colleague Identifier</label>
                <input 
                  type="text" 
                  placeholder="e.g. john@example.com or john_doe" 
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-2xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddMemberModal(false); setMemberIdentifier(""); }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-base-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !memberIdentifier.trim()}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold btn-primary flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
