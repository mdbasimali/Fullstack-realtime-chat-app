import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useLocation } from "react-router-dom";
import { MessageCircle, Phone, Sparkles, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BottomNavbar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    selectedUser, 
    setSelectedUser, 
    users, 
    isContactsModalOpen, 
    isStoryViewerOpen 
  } = useChatstore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const location = useLocation();

  const unreadChatsCount = users.filter(
    (u) => u.lastMessage && !u.lastMessage.isRead && u.lastMessage.senderId !== authUser?._id
  ).length;

  // Show only on Home Page and when no sub-view is open
  const isVisible = 
    (location.pathname === "/" || location.pathname === "/join-group") && 
    !selectedUser && 
    !selectedGroup && 
    !isContactsModalOpen && 
    !isStoryViewerOpen;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="block md:hidden fixed bottom-4 left-4 right-4 z-40"
        >
          <nav className="py-2 px-3 flex justify-around items-center w-full glass-dock rounded-[24px]">
            
            {/* Chats Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("chats"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className={`dock-btn flex flex-col items-center gap-0.5 text-center group cursor-pointer ${activeTab === "chats" ? "dock-btn-active" : ""}`}
            >
              <div className={`icon-wrapper px-4 py-0.5 rounded-full transition-all relative ${
                activeTab === "chats" 
                  ? "active-glass-pill text-[#007aff]" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <MessageCircle size={18} className={activeTab === "chats" ? "fill-[#007aff] text-[#007aff]" : "text-base-content/60"} />
                {unreadChatsCount > 0 && (
                  <span className="absolute top-0.5 right-2 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm border border-base-100 animate-pulse">
                    {unreadChatsCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "chats" ? "active-dock-text font-bold" : "text-base-content/60"
              }`}>
                Chats
              </span>
            </button>

            {/* Groups Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("groups"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className={`dock-btn flex flex-col items-center gap-0.5 text-center group cursor-pointer ${activeTab === "groups" ? "dock-btn-active" : ""}`}
            >
              <div className={`icon-wrapper px-4 py-0.5 rounded-full transition-all ${
                activeTab === "groups" 
                  ? "active-glass-pill text-[#007aff]" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Users size={18} className={activeTab === "groups" ? "fill-[#007aff] text-[#007aff]" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "groups" ? "active-dock-text font-bold" : "text-base-content/60"
              }`}>
                Groups
              </span>
            </button>

            {/* Calls Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("calls"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className={`dock-btn flex flex-col items-center gap-0.5 text-center group cursor-pointer ${activeTab === "calls" ? "dock-btn-active" : ""}`}
            >
              <div className={`icon-wrapper px-4 py-0.5 rounded-full transition-all ${
                activeTab === "calls" 
                  ? "active-glass-pill text-[#007aff]" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Phone size={18} className={activeTab === "calls" ? "fill-[#007aff] text-[#007aff]" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "calls" ? "active-dock-text font-bold" : "text-base-content/60"
              }`}>
                Calls
              </span>
            </button>

            {/* Stories Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("stories"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className={`dock-btn flex flex-col items-center gap-0.5 text-center group cursor-pointer ${activeTab === "stories" ? "dock-btn-active" : ""}`}
            >
              <div className={`icon-wrapper px-4 py-0.5 rounded-full transition-all ${
                activeTab === "stories" 
                  ? "active-glass-pill text-[#007aff]" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Sparkles size={18} className={activeTab === "stories" ? "fill-[#007aff] text-[#007aff]" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "stories" ? "active-dock-text font-bold" : "text-base-content/60"
              }`}>
                Stories
              </span>
            </button>

          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BottomNavbar;
