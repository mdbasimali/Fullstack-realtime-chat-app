import { Video, Phone, X, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatstore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  return (
    <div className="p-3.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back button - Visible only on mobile */}
          <button
            onClick={() => setSelectedUser(null)}
            className="md:hidden p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors mr-1"
            title="Back to chats"
          >
            <ArrowLeft size={20} />
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
            <h3 className="font-semibold text-sm md:text-base leading-tight">{selectedUser.fullName}</h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              {onlineUsers.includes(selectedUser._id) ? (
                <span className="text-green-500 font-medium">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        {/* right side (audio call + video call + Close on desktop) button */}
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => initiateCall(selectedUser, "audio")}
            className="p-2.5 rounded-full hover:bg-primary/10 hover:text-primary text-base-content/70 transition-colors"
            title="Audio Call"
          >
            <Phone size={19} />
          </button>
          <button 
            onClick={() => initiateCall(selectedUser, "video")}
            className="p-2.5 rounded-full hover:bg-primary/10 hover:text-primary text-base-content/70 transition-colors"
            title="Video Call"
          >
            <Video size={19} />
          </button>
          <button 
            onClick={() => setSelectedUser(null)}
            className="hidden md:flex p-2.5 rounded-full hover:bg-error/10 hover:text-error text-base-content/70 transition-colors"
            title="Close Chat"
          >
            <X size={19} />
          </button>
        </div>

      </div>
    </div>
  );
};
export default ChatHeader;
