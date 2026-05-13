import { useChatstore } from "../store/useChatStore";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import { MessageSquare, Phone, Image as ImageIcon, Users } from "lucide-react";

const HomePage = () => {
  const { selectedUser, setSelectedUser, activeTab, setActiveTab, subscribeToMessages, unsubscribeFromMessages } = useChatstore();

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="min-h-screen w-full bg-base-100 flex flex-col text-base-content">
      
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
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>

        {/* MOBILE VIEWPORT (Widths < md) */}
        <div className="flex md:hidden w-full h-full overflow-hidden">
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            {!selectedUser ? (
              <Sidebar />
            ) : (
              <ChatContainer />
            )}
          </div>
        </div>

      </div>

      {/* 2. Sticky Mobile Bottom Navigation Footer (Only on Mobile screens, hidden inside active chats) */}
      {!selectedUser && (
        <div className="block md:hidden flex-shrink-0">
          <nav className="bg-base-100/90 border-t border-base-300 p-2.5 flex justify-around items-center backdrop-blur-md z-30">
            
            {/* Chats Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("chats"); 
                setSelectedUser(null); // clears selected user to pop back to sidebar chats list
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

            {/* Calls Tab Button */}
            <button 
              onClick={() => { 
                setActiveTab("calls"); 
                setSelectedUser(null); // clears selected user to pop back to sidebar calls list
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
                setSelectedUser(null); // clears selected user to pop back to sidebar friends list
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
                setSelectedUser(null); // clears selected user to pop back to sidebar stories list
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
