import { Video, Phone, MoreVertical, ArrowLeft, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatstore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  return (
    <div className="p-3.5 border-b border-base-300 bg-base-100 flex items-center justify-between sticky top-0 z-10">
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
        <button 
          onClick={() => setSelectedUser(null)}
          className="p-2.5 rounded-full hover:bg-base-200 text-base-content/85 transition-colors"
          title="More options"
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
