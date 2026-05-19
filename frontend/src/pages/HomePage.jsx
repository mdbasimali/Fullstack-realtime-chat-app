import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import { MessageSquare, Phone, Image as ImageIcon, Users, Layers } from "lucide-react";

const HomePage = () => {
  const { selectedUser, setSelectedUser, activeTab, setActiveTab, subscribeToMessages, unsubscribeFromMessages } = useChatstore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();
  const { socket } = useAuthStore();

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-base-100 flex flex-col overflow-hidden text-base-content">
      
      {/* 1. Core Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP SPLIT VIEWPORT (Widths >= md) */}
        <div className="hidden md:flex w-full h-full overflow-hidden">
          {/* Left Sidebar Pane */}
          <div className="w-[380px] lg:w-[420px] h-full flex-shrink-0 border-r border-base-300">
            <Sidebar />
          </div>
          {/* Right Chat Container Pane */}
          <div className="flex-1 h-full flex flex-col bg-base-100/50 overflow-hidden">
            {(!selectedUser && !selectedGroup) ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>

        {/* MOBILE VIEWPORT (Widths < md) */}
        <div className="flex md:hidden w-full h-full overflow-hidden">
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            {(!selectedUser && !selectedGroup) ? (
              <Sidebar />
            ) : (
              <ChatContainer />
            )}
          </div>
        </div>

      </div>

      {/* 2. Sticky Mobile Bottom Navigation Footer (Only on Mobile screens, hidden inside active chats) */}
      {(!selectedUser && !selectedGroup) && (
        <div className="block md:hidden flex-shrink-0">
          <nav className="bg-base-100/90 border-t border-base-300 p-2.5 flex justify-around items-center backdrop-blur-md z-30">
            
            {/* Chats Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("chats"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className="flex flex-col items-center gap-1 text-center group cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all ${
                activeTab === "chats" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <MessageSquare size={20} className={activeTab === "chats" ? "fill-primary text-primary" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "chats" ? "text-primary" : "text-base-content/60"
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
              className="flex flex-col items-center gap-1 text-center group cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all ${
                activeTab === "groups" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Layers size={20} className={activeTab === "groups" ? "text-primary" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "groups" ? "text-primary" : "text-base-content/60"
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
              className="flex flex-col items-center gap-1 text-center group cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all ${
                activeTab === "calls" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Phone size={20} className={activeTab === "calls" ? "fill-primary text-primary" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "calls" ? "text-primary" : "text-base-content/60"
              }`}>
                Calls
              </span>
            </button>

            {/* Friends Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("friends"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className="flex flex-col items-center gap-1 text-center group cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all ${
                activeTab === "friends" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <Users size={20} className={activeTab === "friends" ? "text-primary" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "friends" ? "text-primary" : "text-base-content/60"
              }`}>
                Friends
              </span>
            </button>

            {/* Stories Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("stories"); 
                setSelectedUser(null);
                setSelectedGroup(null);
              }}
              className="flex flex-col items-center gap-1 text-center group cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all ${
                activeTab === "stories" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" 
                  : "text-base-content/60 group-hover:text-base-content"
              }`}>
                <ImageIcon size={20} className={activeTab === "stories" ? "fill-primary text-primary" : "text-base-content/60"} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all ${
                activeTab === "stories" ? "text-primary" : "text-base-content/60"
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
