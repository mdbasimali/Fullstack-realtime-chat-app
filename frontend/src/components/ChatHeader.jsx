import { Video, Phone, MoreVertical, ArrowLeft, User, Trash2, PhoneOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatstore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  return (
    <div className="p-3 border-b border-base-300 bg-base-100 flex items-center justify-between shrink-0 sticky top-0 z-[50] shadow-sm">
      <div className="flex items-center gap-3">
        {/* Back button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Back to chats"
        >
          <ArrowLeft size={21} />
        </button>

        {/* Avatar */}
        <div className="avatar">
          <div className="size-10 rounded-full relative">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
              alt={selectedUser.fullName}
              className="rounded-full object-cover"
            />
          </div>
        </div>

        {/* User info */}
        <div className="text-left">
          <h3 className="font-semibold text-sm md:text-base leading-tight flex items-center gap-1.5 text-base-content">
            {selectedUser.fullName}
            <span className="p-0.5 rounded-full border border-base-300 bg-base-200/50 inline-flex items-center justify-center text-base-content/60 cursor-pointer">
              <User size={12} />
            </span>
          </h3>
          <p className="text-[11px] text-base-content/60 font-semibold mt-0.5">
            {onlineUsers.includes(selectedUser._id) ? (
              <span className="text-emerald-500">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Right Actions: Video Call, Phone Call, 3-Dot menu */}
      <div className="flex items-center gap-1.5">
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

        {/* Dropdown Options */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle p-0 size-10 hover:bg-base-200 text-base-content/85 cursor-pointer flex items-center justify-center">
            <MoreVertical size={20} />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-2xl border border-base-300 w-52 z-30 mt-1">
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
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
