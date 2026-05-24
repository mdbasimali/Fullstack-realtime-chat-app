import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import ChatAnimation from "../components/ChatAnimation";
import BottomNavbar from "../components/BottomNavbar";

const HomePage = () => {
  const { selectedUser, activeTab, users } = useChatstore();
  const { selectedGroup } = useGroupStore();
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
        <div className="flex w-full h-full overflow-hidden relative" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
          
          {/* Sidebar Pane */}
          {/* Mobile: scales down and dims when a chat opens. Desktop: always visible */}
          <div 
            className={`h-full flex-shrink-0 flex-col overflow-hidden w-full md:w-[var(--sidebar-width)] ${
              (!selectedUser && !selectedGroup) 
                ? 'translate-x-0 scale-100 opacity-100 md:opacity-100 brightness-100' 
                : '-translate-x-[15%] scale-[0.97] opacity-0 md:opacity-100 md:translate-x-0 md:scale-100 pointer-events-none md:pointer-events-auto brightness-75 md:brightness-100'
            } flex`}
            style={{ 
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease, filter 0.35s ease',
              willChange: 'transform, opacity, filter',
              transformOrigin: 'left center'
            }}
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
          {/* Mobile: slides in over the sidebar. Desktop: always visible side-by-side */}
          <div className={`h-full flex-col bg-base-100/50 overflow-hidden flex-1 absolute inset-0 z-20 md:relative md:inset-auto md:z-auto ${
            (!selectedUser && !selectedGroup) 
              ? 'translate-x-full md:translate-x-0 shadow-none' 
              : 'translate-x-0 shadow-[-15px_0_30px_rgba(0,0,0,0.1)] md:shadow-none'
          } flex`}
            style={{ 
              transition: `transform ${(!selectedUser && !selectedGroup) ? '0.4s' : '0.35s'} cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.4s ease`,
              willChange: 'transform, box-shadow'
            }}
          >
            {/* Always mount BOTH components to prevent DOM mounting cost during animation */}
            
            {/* Default Background Pane (No Chat Selected) */}
            <div 
              className={`absolute inset-0 flex flex-col z-10 transition-opacity duration-300 ${
                (!selectedUser && !selectedGroup) ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none'
              }`}
            >
              <NoChatSelected />
            </div>
            
            {/* Active Chat Pane */}
            <ChatAnimation routeKey={selectedUser?._id || selectedGroup?._id || null}>
               <ChatContainer />
            </ChatAnimation>
          </div>
        </div>

      </div>

      <BottomNavbar />

    </div>
  );
};

export default HomePage;
