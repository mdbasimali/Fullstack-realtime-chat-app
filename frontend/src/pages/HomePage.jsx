import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import { MessageCircle, Phone, Sparkles, Users } from "lucide-react";

const HomePage = () => {
  const { selectedUser, setSelectedUser, activeTab, setActiveTab, users } = useChatstore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();
  const { socket, authUser } = useAuthStore();

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarWidth");
    return saved ? parseInt(saved, 10) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = Math.max(260, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    localStorage.setItem("sidebarWidth", sidebarWidth.toString());
  }, [sidebarWidth]);

  const resetWidth = useCallback(() => {
    setSidebarWidth(380);
  }, []);

  const unreadChatsCount = users.filter(u => u.lastMessage && !u.lastMessage.isRead && u.lastMessage.senderId !== authUser?._id).length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-base-100 flex flex-col overflow-hidden text-base-content relative">
      
      {/* Resizing Overlay (for smooth drag cursor across elements) */}
      {isResizing && (
        <div className="fixed inset-0 cursor-col-resize z-[9999] select-none pointer-events-auto bg-transparent" />
      )}

      {/* 1. Core Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* UNIFIED RESPONSIVE VIEWPORT */}
        <div className="flex w-full h-full overflow-hidden" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
          
          {/* Sidebar Pane */}
          {/* Mobile: hidden when a chat is open. Desktop: always visible */}
          <div 
            className={`h-full flex-shrink-0 flex-col overflow-hidden relative w-full md:w-[var(--sidebar-width)] ${
              (!selectedUser && !selectedGroup) ? 'flex' : 'hidden md:flex'
            }`}
          >
            <Sidebar />
          </div>

          {/* Resizer Handle (Desktop only) */}
          <div
            onMouseDown={startResizing}
            onDoubleClick={resetWidth}
            className="hidden md:block w-1.5 cursor-col-resize h-full select-none flex-shrink-0 relative group z-30"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-base-300 group-hover:bg-primary group-hover:w-[3px] group-active:bg-primary group-active:w-[3px] transition-all" />
          </div>

          {/* Chat Container Pane */}
          {/* Mobile: hidden when NO chat is selected. Desktop: always visible */}
          <div className={`h-full flex-col bg-base-100/50 overflow-hidden flex-1 ${
            (!selectedUser && !selectedGroup) ? 'hidden md:flex' : 'flex'
          }`}>
            {(!selectedUser && !selectedGroup) ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>

      </div>

      {/* 2. Sticky Mobile Bottom Navigation Footer (Only on Mobile screens, hidden inside active chats) */}
      {(!selectedUser && !selectedGroup) && (
        <div className="block md:hidden fixed bottom-4 left-4 right-4 z-40">
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
        </div>
      )}

    </div>
  );
};

export default HomePage;
