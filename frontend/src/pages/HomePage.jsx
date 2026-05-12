import { useChatstore } from "../store/useChatStore"
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatstore();

  return (
    <div className="h-screen bg-base-100 flex overflow-hidden">
      {/* Sidebar: Show full-width on mobile if no user selected, on desktop show side-by-side with fixed width */}
      <div className={`h-full border-r border-base-300 ${selectedUser ? "hidden md:block md:w-[380px] lg:w-[420px]" : "w-full md:w-[380px] lg:w-[420px]"} flex-shrink-0`}>
        <Sidebar />
      </div>
      
      {/* Chat Area: Show full-width on mobile if user is selected, on desktop show side-by-side */}
      <div className={`h-full flex-1 ${!selectedUser ? "hidden md:flex flex-col bg-base-100/50" : "flex flex-col"}`}>
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default HomePage;
