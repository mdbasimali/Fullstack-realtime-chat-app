import { useChatstore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { User, Phone, Users, Check } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
  } = useChatstore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-100">
      <ChatHeader />

      {/* Messages Stream View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        
        {/* Large, Beautiful Profile Onboarding Card */}
        <div className="flex flex-col items-center justify-center p-6 mb-8 mt-4 bg-base-200/30 dark:bg-base-950/20 border border-base-300/40 rounded-[32px] max-w-[340px] md:max-w-md mx-auto text-center space-y-4 shadow-xs animate-fade-in">
          {selectedUser.profilePic ? (
            <img 
              src={selectedUser.profilePic} 
              alt={selectedUser.fullName} 
              className="w-20 h-20 rounded-full object-cover shadow-xs ring-2 ring-primary/10" 
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-2xl shadow-xs">
              {selectedUser.fullName.slice(0, 2).toLowerCase()}
            </div>
          )}
          <div className="space-y-1">
            <h3 className="font-bold text-lg flex items-center justify-center gap-1.5 text-base-content leading-tight">
              {selectedUser.fullName}
              <span className="p-0.5 rounded-full border border-base-300 bg-base-200/50 inline-flex items-center justify-center text-base-content/60">
                <User size={13} />
              </span>
            </h3>
            {selectedUser.phoneNumber && (
              <p className="text-xs font-semibold text-base-content/60 flex items-center justify-center gap-1.5">
                <Phone size={13} className="text-base-content/40" /> {selectedUser.phoneNumber}
              </p>
            )}
            <p className="text-xs font-semibold text-base-content/50 flex items-center justify-center gap-1.5">
              <Users size={13} className="text-base-content/40" /> No groups in common
            </p>
          </div>
        </div>

        {/* Centered Date Separator */}
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 bg-base-200/50 text-[11px] font-bold text-base-content/50 rounded-full tracking-wide">
            Today
          </span>
        </div>

        {/* Message bubbles */}
        {messages.map((message, idx) => {
          const isMyMessage = message.senderId === authUser._id;
          return (
            <div
              key={message._id}
              className={`flex w-full ${isMyMessage ? "justify-end" : "justify-start"}`}
              ref={idx === messages.length - 1 ? messageEndRef : null}
            >
              <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMyMessage ? "items-end" : "items-start"} space-y-1`}>
                
                {/* Beautiful custom styled message card */}
                <div className={`p-3.5 px-4 rounded-[22px] shadow-xs relative flex flex-col group transition-all ${
                  isMyMessage 
                    ? "bg-primary text-primary-content rounded-tr-[4px]" 
                    : "bg-base-200 text-base-content rounded-tl-[4px]"
                }`}>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="max-w-full max-h-[300px] rounded-2xl mb-2 shadow-xs object-cover"
                    />
                  )}
                  {message.text && (
                    <p className="text-sm md:text-base font-medium whitespace-pre-wrap leading-relaxed">
                      {message.text}
                    </p>
                  )}

                  {/* Bubble timestamp & status indicator */}
                  <div className={`flex items-center gap-1 mt-1.5 text-[10px] self-end font-semibold opacity-75`}>
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {isMyMessage && (
                      <Check size={12} className="stroke-[3]" />
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;