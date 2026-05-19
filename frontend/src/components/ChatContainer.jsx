import React, { useEffect, useRef } from "react";
import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { formatMessageTime } from "../lib/utils";
import { 
  User, Phone, Users, Check, Video, PhoneMissed, 
  PhoneOutgoing, PhoneIncoming, X, Calendar, Crown, Loader2
} from "lucide-react";
import VoicePlayer from "./VoicePlayer";

const getSenderColor = (senderId) => {
  const colors = [
    "text-indigo-500 dark:text-indigo-400",
    "text-rose-500 dark:text-rose-400",
    "text-emerald-500 dark:text-emerald-400",
    "text-amber-500 dark:text-amber-400",
    "text-sky-500 dark:text-sky-400",
    "text-fuchsia-500 dark:text-fuchsia-400",
    "text-teal-500 dark:text-teal-400"
  ];
  if (!senderId) return colors[0];
  const idStr = typeof senderId === "object" ? senderId._id : senderId;
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const ChatContainer = () => {
  const {
    messages: dmMessages,
    getMessages,
    isMessagesLoading: isDmMessagesLoading,
    selectedUser,
  } = useChatstore();

  const {
    selectedGroup,
    messages: groupMessages,
    isMessagesLoading: isGroupMessagesLoading,
    showGroupDetailsSidebar,
    setShowGroupDetailsSidebar,
    selectedGroupDetails,
    isFetchingGroupDetails,
    fetchGroupDetails,
  } = useGroupStore();

  const messages = selectedGroup ? groupMessages : dmMessages;
  const isMessagesLoading = selectedGroup ? isGroupMessagesLoading : isDmMessagesLoading;
  
  const { initiateCall } = useCallStore();
  const { authUser, onlineUsers } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser?._id, getMessages]);

  useEffect(() => {
    if (selectedGroup?._id && showGroupDetailsSidebar) {
      fetchGroupDetails(selectedGroup._id);
    }
  }, [selectedGroup?._id, showGroupDetailsSidebar, fetchGroupDetails]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-base-100">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full relative bg-base-100">
      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatHeader />

        {/* Messages Stream View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-1">
          
          {/* Large, Beautiful Profile Onboarding Card */}
          {selectedUser && (
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
          )}

          {selectedGroup && (
            <div className="flex flex-col items-center justify-center p-6 mb-8 mt-4 bg-base-200/30 dark:bg-base-950/20 border border-base-300/40 rounded-[32px] max-w-[340px] md:max-w-md mx-auto text-center space-y-4 shadow-xs animate-fade-in">
              {selectedGroup.avatar ? (
                <img
                  src={selectedGroup.avatar}
                  alt={selectedGroup.name}
                  className="w-20 h-20 rounded-[24px] object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-[24px] bg-indigo-100 dark:bg-indigo-950 text-primary flex items-center justify-center font-extrabold text-3xl shadow-md">
                  {selectedGroup.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center justify-center gap-1.5 text-base-content leading-tight">
                  {selectedGroup.name}
                </h3>
                <p className="text-xs font-semibold text-base-content/50 px-4 mt-1">
                  {selectedGroup.description || "No description provided."}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[11px] font-bold bg-primary/10 text-primary px-3 py-0.5 rounded-full">
                    {selectedGroup.membersCount} members
                  </span>
                  {selectedGroup.creatorId === authUser?._id && (
                    <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-0.5 rounded-full">
                      Group Creator
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((message, idx) => {
            const isMyMessage = message.senderId === authUser._id || message.senderId?._id === authUser._id;
            const prevMessage = idx > 0 ? messages[idx - 1] : null;
            
            const currentDate = new Date(message.createdAt).toDateString();
            const prevDate = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
            const isSameDay = currentDate === prevDate;

            const isSameSender = isSameDay && prevMessage && (
              (prevMessage.senderId === message.senderId || prevMessage.senderId?._id === message.senderId?._id)
            );

            return (
              <React.Fragment key={message._id}>
                {/* Dynamic Date Separator */}
                {!isSameDay && (
                  <div className="flex items-center justify-center py-4 animate-fade-in w-full">
                    <span className="px-3 py-1 bg-base-200/60 dark:bg-base-900/60 border border-base-300/40 text-[10px] font-bold text-base-content/60 rounded-full tracking-wide uppercase">
                      {currentDate === new Date().toDateString() 
                        ? "Today" 
                        : currentDate === new Date(Date.now() - 86400000).toDateString() 
                          ? "Yesterday" 
                          : new Date(message.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}

                <div
                  className={`flex w-full items-end gap-2.5 ${isMyMessage ? "justify-end" : "justify-start"} ${
                    isSameSender ? "mt-1" : "mt-3.5"
                  }`}
                  ref={idx === messages.length - 1 ? messageEndRef : null}
                >
                  {/* Left Avatar for other users in group */}
                  {selectedGroup && !isMyMessage && (
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      {!isSameSender ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-base-300 shadow-xs">
                          {message.senderId?.profilePic ? (
                            <img src={message.senderId.profilePic} alt={message.senderId.fullName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (message.senderId?.fullName || "G").charAt(0).toUpperCase()
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMyMessage ? "items-end" : "items-start"} space-y-1`}>
                    
                    {/* Sender Name above message bubble */}
                    {selectedGroup && !isMyMessage && !isSameSender && (
                      <span className={`text-[11px] font-bold px-1.5 ${getSenderColor(message.senderId)}`}>
                        {message.senderId?.fullName || "Group Member"}
                      </span>
                    )}

                    {/* Glassmorphism/premium style message card */}
                    <div className={`p-3.5 px-4 rounded-[22px] shadow-xs relative flex flex-col group transition-all ${
                      isMyMessage 
                        ? "bg-primary text-primary-content rounded-tr-[4px]" 
                        : "bg-base-200 text-base-content rounded-tl-[4px]"
                    }`}>
                      {message.image && message.messageType !== "audio" && (
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="max-w-full max-h-[300px] rounded-2xl mb-2 shadow-xs object-cover"
                        />
                      )}
                      {message.messageType === "audio" && message.image && (
                        <VoicePlayer url={message.image} isMyMessage={isMyMessage} />
                      )}
                      {message.text && message.messageType === "text" && (
                        <p className="text-sm md:text-base font-medium whitespace-pre-wrap leading-relaxed">
                          {message.text}
                        </p>
                      )}

                      {/* Call Log render */}
                      {(message.messageType === "voice_call" || message.messageType === "video_call") && (
                        <div 
                          onClick={() => initiateCall(selectedUser, message.messageType === "video_call" ? "video" : "audio")}
                          className={`flex items-center gap-3 py-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all p-2 rounded-xl ${isMyMessage ? "hover:bg-white/10" : "hover:bg-base-300/30"}`}
                        >
                          <div className={`p-2.5 rounded-full ${isMyMessage ? "bg-white/20" : "bg-base-300/50"}`}>
                            {message.messageType === "video_call" ? <Video size={20} /> : <Phone size={20} />}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm md:text-base font-bold">
                              {message.messageType === "video_call" ? "Video call" : "Voice call"}
                            </p>
                            <p className="text-[11px] opacity-80 font-semibold flex items-center gap-1">
                              {message.callStatus === "rejected" || message.callStatus === "missed" ? (
                                <>
                                  <PhoneMissed size={12} className="text-error" />
                                  <span>{isMyMessage ? "No answer" : "Missed call"}</span>
                                </>
                              ) : (
                                <>
                                  {isMyMessage ? <PhoneOutgoing size={12} /> : <PhoneIncoming size={12} />}
                                  <span>{message.callDuration ? `${Math.floor(message.callDuration / 60)}m ${message.callDuration % 60}s` : "No answer"}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Bubble timestamp & status indicator */}
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] self-end font-semibold opacity-75">
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {isMyMessage && (
                          <span className="inline-flex items-center ml-0.5">
                            {message.isRead ? (
                              <div className="flex -space-x-1 text-sky-400 dark:text-sky-300">
                                <Check size={12} className="stroke-[3.5]" />
                                <Check size={12} className="stroke-[3.5]" />
                              </div>
                            ) : (
                              <Check size={12} className="stroke-[3] text-white/50" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <MessageInput />
      </div>

      {/* Group Details Sidebar */}
      {selectedGroup && showGroupDetailsSidebar && (
        <div className="fixed inset-y-0 right-0 w-full max-w-sm md:static md:w-80 border-l border-base-300 bg-base-100/95 backdrop-blur-md flex flex-col h-full overflow-hidden shadow-xl z-40 animate-fade-in shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100/40">
            <h3 className="font-extrabold text-base text-base-content flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span>Group Details</span>
            </h3>
            <button
              onClick={() => setShowGroupDetailsSidebar(false)}
              className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Details Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            {/* Avatar & Basic details */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="size-20 rounded-full relative flex items-center justify-center bg-indigo-100 dark:bg-indigo-950/40 text-primary font-bold text-2xl shadow-sm border border-base-300">
                {selectedGroup.avatar ? (
                  <img
                    src={selectedGroup.avatar}
                    alt={selectedGroup.name}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  selectedGroup.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-base-content">{selectedGroup.name}</h4>
                <p className="text-xs text-base-content/50 mt-1 max-w-[240px] mx-auto">
                  {selectedGroup.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Created info */}
            <div className="bg-base-200/40 border border-base-300/50 rounded-2xl p-4 space-y-2.5 text-xs text-left">
              <div className="flex items-center gap-2.5 text-base-content/75">
                <Calendar className="size-4 text-base-content/55" />
                <span>Created {new Date(selectedGroup.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2.5 text-base-content/75">
                <Crown className="size-4 text-amber-500" />
                <span>
                  Creator: {selectedGroup.creatorId === authUser?._id ? "You" : "Group Creator"}
                </span>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-bold text-base-content/60 uppercase tracking-wider">
                  Members ({selectedGroupDetails?.members?.length || selectedGroup.membersCount}/100)
                </h5>
              </div>

              {isFetchingGroupDetails ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-[11px] text-base-content/50">Loading member status...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedGroupDetails?.members?.map((member) => {
                    const isOnline = onlineUsers.includes(member._id);
                    const isCreator = selectedGroup.creatorId === member._id;
                    const isMe = authUser?._id === member._id;
                    return (
                      <div key={member._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-base-200/50 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar with Online status dot */}
                          <div className="relative">
                            {member.profilePic ? (
                              <img
                                src={member.profilePic}
                                alt={member.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-base-300"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                                {member.fullName.charAt(0)}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-base-100 ${isOnline ? "bg-emerald-500" : "bg-base-300"}`} />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-xs font-semibold text-base-content truncate">
                              {member.fullName} {isMe && "(You)"}
                            </p>
                            <p className="text-[10px] text-base-content/50 truncate">
                              {isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                        {isCreator && (
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;