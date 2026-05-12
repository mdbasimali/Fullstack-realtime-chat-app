import { Video, Phone, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatstore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* right side (vide call + Close) button */}
        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => initiateCall(selectedUser, "audio")}
            className="btn btn-ghost btn-circle btn-sm md:btn-md text-base-content/70 hover:text-primary transition-colors"
            title="Audio Call"
          >
            <Phone size={20} />
          </button>
          <button 
            onClick={() => initiateCall(selectedUser, "video")}
            className="btn btn-ghost btn-circle btn-sm md:btn-md text-base-content/70 hover:text-primary transition-colors"
            title="Video Call"
          >
            <Video size={20} />
          </button>
          <button 
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-circle btn-sm md:btn-md text-base-content/70 hover:text-error transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};
export default ChatHeader;
