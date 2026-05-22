import React, { useEffect, useRef, useState } from "react";
import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { formatMessageTime } from "../lib/utils";
import { 
  Phone, Users, Check, Video, PhoneMissed, 
  PhoneOutgoing, PhoneIncoming, X, Calendar, Crown, Loader2,
  Copy, Download, Trash2
} from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import MediaViewerModal from "./MediaViewerModal";

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
    deleteMessage,
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
    deleteGroupMessage,
  } = useGroupStore();

  const messages = selectedGroup ? groupMessages : dmMessages;
  const isMessagesLoading = selectedGroup ? isGroupMessagesLoading : isDmMessagesLoading;
  
  const { initiateCall } = useCallStore();
  const { authUser, onlineUsers } = useAuthStore();
  const messageEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const [contextMenu, setContextMenu] = useState(null); // { message, x, y, isMobile }
  const [viewingMedia, setViewingMedia] = useState(null);
  const touchTimeoutRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const hasTriggeredLongPressRef = useRef(false);

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    setContextMenu({
      message,
      x: e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0),
      y: e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0),
      isMobile,
    });
  };

  const handleTouchStart = (e, message) => {
    hasTriggeredLongPressRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }

    touchTimeoutRef.current = setTimeout(() => {
      hasTriggeredLongPressRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setContextMenu({
        message,
        x: touch.clientX,
        y: touch.clientY,
        isMobile: true,
      });
    }, 450); // 450ms long press delay
  };

  const handleTouchEnd = (e) => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    if (hasTriggeredLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (diffX > 20 || diffY > 20) {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
    setContextMenu(null);
  };

  const handleDownloadImage = async (imageUrl, messageType = "image") => {
    const isVideo = messageType === "video";
    const toastId = toast.loading(isVideo ? "Preparing video download..." : "Preparing download...");
    try {
      let blob;
      // 1. Try direct fetch first (Cloudinary supports CORS, public asset)
      try {
        const res = await fetch(imageUrl, { mode: "cors" });
        if (!res.ok) throw new Error("Direct fetch failed");
        blob = await res.blob();
      } catch (directErr) {
        console.warn("Direct fetch from Cloudinary failed, calling authenticated backend proxy...", directErr);
        // 2. Fall back to backend download proxy using axiosInstance (injects auth credentials/headers automatically)
        const response = await axiosInstance.get(`/messages/download?url=${encodeURIComponent(imageUrl)}`, {
          responseType: "blob"
        });
        blob = response.data;
      }

      if (!blob) throw new Error("Could not retrieve file blob");

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      
      let filename = isVideo ? `chat-video-${Date.now()}.mp4` : `chat-image-${Date.now()}.jpg`;
      if (!isVideo) {
        if (imageUrl.toLowerCase().includes(".png")) filename = `chat-image-${Date.now()}.png`;
        else if (imageUrl.toLowerCase().includes(".gif")) filename = `chat-image-${Date.now()}.gif`;
        else if (imageUrl.toLowerCase().includes(".webp")) filename = `chat-image-${Date.now()}.webp`;
      } else {
        if (imageUrl.toLowerCase().includes(".webm")) filename = `chat-video-${Date.now()}.webm`;
        else if (imageUrl.toLowerCase().includes(".mov")) filename = `chat-video-${Date.now()}.mov`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success(isVideo ? "Video saved to gallery!" : "Image saved to gallery!", { id: toastId });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(isVideo ? "Failed to download video" : "Failed to download image", { id: toastId });
    }
    setContextMenu(null);
  };

  const handleDeleteMessage = async (message) => {
    if (!message) return;
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        if (selectedGroup) {
          await deleteGroupMessage(message._id);
        } else {
          await deleteMessage(message._id);
        }
        toast.success("Message deleted");
      } catch (err) {
        toast.error("Failed to delete message");
      }
      setContextMenu(null);
    }
  };

  // Reset initial load flag when switching chats
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [selectedUser?._id, selectedGroup?._id]);

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
      if (isInitialLoadRef.current) {
        // First load: jump instantly to bottom, no scroll animation
        messageEndRef.current.scrollIntoView({ behavior: "instant" });
        isInitialLoadRef.current = false;
      } else {
        // New messages: smooth scroll
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

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
                    {(() => {
                      const isTextOnly = message.messageType === "text" && !message.image;
                      const isImageOrVideo = message.image && (message.messageType === "image" || message.messageType === "video");
                      const isMediaOnly = isImageOrVideo && !message.text;

                      const paddingClass = isTextOnly 
                        ? "p-2 pb-0.5 px-3.5 pr-[54px]" 
                        : isMediaOnly 
                          ? "p-[2px]" // tiny 2px frame or 0? user said "no frame". Let's use p-[2px] for WhatsApp style, or p-0. Let's use p-0.5. Actually, p-0 is safest for "no frame". Wait, if p-0, timestamp needs absolute pos.
                          : "p-2 px-2";

                      return (
                        <div
                          onContextMenu={(e) => handleContextMenu(e, message)}
                          onTouchStart={(e) => handleTouchStart(e, message)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchMove}
                          style={{
                            WebkitTouchCallout: "none",
                            WebkitUserSelect: "none",
                            KhtmlUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            userSelect: "none"
                          }}
                          className={`rounded-[20px] shadow-xs relative flex flex-col group transition-all cursor-pointer select-none active:opacity-95 overflow-hidden ${paddingClass} ${
                            isMyMessage 
                              ? "bg-[#6057CA] text-white rounded-tr-[4px]" 
                              : "bg-base-200 text-base-content rounded-tl-[4px]"
                          }`}
                        >
                          {message.image && message.messageType !== "audio" && message.messageType !== "video" && (
                            <img
                              src={message.image}
                              alt="Attachment"
                              onClick={(e) => { e.stopPropagation(); setViewingMedia(message); }}
                              className={`max-w-[260px] md:max-w-[320px] max-h-[350px] object-cover pointer-events-auto select-none cursor-pointer ${isMediaOnly ? "rounded-[18px]" : "rounded-2xl mb-1"} ${isMediaOnly ? "" : "w-full"}`}
                            />
                          )}
                          {message.image && message.messageType === "video" && (
                            <video
                              src={message.image}
                              controls
                              playsInline
                              onClick={(e) => { e.stopPropagation(); setViewingMedia(message); }}
                              className={`max-w-[260px] md:max-w-[320px] max-h-[350px] object-cover cursor-pointer ${isMediaOnly ? "rounded-[18px]" : "rounded-2xl mb-1"} ${isMediaOnly ? "" : "w-full"}`}
                            />
                          )}
                          {message.messageType === "audio" && message.image && (
                            <VoicePlayer url={message.image} isMyMessage={isMyMessage} />
                          )}

                          {/* Story Reply Render */}
                          {message.messageType === "story_reply" && message.storyId && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black/5 dark:bg-white/5 flex flex-col min-w-[140px] max-w-[200px]">
                               <div className="flex gap-2 p-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-bold truncate ${isMyMessage ? "text-primary-content/80" : "text-primary"}`}>
                                      {isMyMessage ? "You" : (selectedUser?.fullName || "Contact")} • Status
                                    </p>
                                    <p className="text-[10px] line-clamp-2 opacity-70 italic">
                                      {message.storyId.type === "text" ? message.storyId.content : (message.storyId.caption || "Photo/Video status")}
                                    </p>
                                  </div>
                                  {message.storyId.type !== "text" && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-black/5">
                                      <img 
                                        src={message.storyId.content} 
                                        alt="status" 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                               </div>
                               <div className={`h-[3px] w-full ${isMyMessage ? "bg-primary-content/20" : "bg-primary/20"}`} />
                            </div>
                          )}

                          {message.text && (message.messageType === "text" || message.messageType === "story_reply") && (
                            <p className="text-sm md:text-base font-medium whitespace-pre-wrap leading-relaxed break-words select-none">
                              {message.text}
                            </p>
                          )}
                          {message.text && isImageOrVideo && (
                            <p className="text-sm md:text-base font-medium whitespace-pre-wrap leading-relaxed break-words select-none px-1 pb-1">
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
                          <div className={`${
                            isTextOnly 
                              ? "absolute bottom-1 right-2 flex items-center gap-1 text-[9px] font-semibold opacity-70"
                              : isMediaOnly
                                ? "absolute bottom-1.5 right-2 flex items-center gap-1 text-[9px] font-semibold text-white px-1.5 py-[2px] rounded-full bg-black/40 backdrop-blur-sm shadow-sm"
                                : "flex items-center gap-1 mt-0.5 mb-0.5 mr-1 text-[10px] self-end font-semibold opacity-75 pr-1"
                          }`}>
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {isMyMessage && (
                              <span className="inline-flex items-center ml-0.5">
                                {message.isRead ? (
                                  <div className="flex -space-x-1 text-sky-400 dark:text-sky-300">
                                    <Check size={11} className="stroke-[3.5]" />
                                    <Check size={11} className="stroke-[3.5]" />
                                  </div>
                                ) : (
                                  <Check size={11} className={`stroke-[3] ${isMediaOnly ? "text-white/80" : "text-white/50"}`} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <MessageInput />

        {/* Custom Context Menu / Mobile Bottom Sheet Overlay */}
        {contextMenu && (
          <>
            {/* Backdrop to close the menu on click */}
            <div 
              className="fixed inset-0 z-50 bg-black/25 dark:bg-black/45 animate-fade-in"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />

            {contextMenu.isMobile ? (
              /* Mobile Bottom Sheet Drawer */
              <div className="fixed inset-x-0 bottom-0 z-[60] bg-base-100 rounded-t-[28px] p-5 pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.18)] border-t border-base-300 animate-slide-up max-w-md mx-auto">
                {/* Drag Handle indicator */}
                <div className="w-12 h-1 bg-base-300 rounded-full mx-auto mb-5" />
                
                <div className="space-y-1">
                  {contextMenu.message.text && (
                    <button 
                      onClick={() => handleCopyText(contextMenu.message.text)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-base-200 rounded-xl text-left text-base font-semibold transition-all active:scale-[0.98] text-base-content"
                    >
                      <Copy size={20} className="opacity-70" />
                      <span>Copy Text</span>
                    </button>
                  )}
                  
                  {contextMenu.message.image && (
                    <button 
                      onClick={() => handleDownloadImage(contextMenu.message.image, contextMenu.message.messageType)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-base-200 rounded-xl text-left text-base font-semibold transition-all active:scale-[0.98] text-base-content"
                    >
                      <Download size={20} className="opacity-70" />
                      <span>{contextMenu.message.messageType === "video" ? "Save Video to Gallery" : "Save Image to Gallery"}</span>
                    </button>
                  )}
                  
                  {(contextMenu.message.senderId === authUser._id || 
                    contextMenu.message.senderId?._id === authUser._id || 
                    (selectedGroup && selectedGroup.creatorId === authUser._id)) && (
                    <button 
                      onClick={() => handleDeleteMessage(contextMenu.message)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-error/10 text-error rounded-xl text-left text-base font-bold transition-all active:scale-[0.98]"
                    >
                      <Trash2 size={20} className="text-error" />
                      <span>Delete Message</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setContextMenu(null)}
                    className="w-full flex items-center justify-center py-3.5 mt-2 bg-base-200 hover:bg-base-300 rounded-xl text-base font-semibold transition-all active:scale-[0.98] text-base-content"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Desktop/Laptop Context Menu at Cursor Position */
              <div 
                style={{ 
                  top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`, 
                  left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px` 
                }}
                className="fixed z-[60] w-48 bg-base-100 border border-base-300 rounded-2xl shadow-xl p-1.5 animate-fade-in text-base-content"
              >
                {contextMenu.message.text && (
                  <button 
                    onClick={() => handleCopyText(contextMenu.message.text)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-xl hover:bg-base-200 text-left transition-colors"
                  >
                    <Copy size={16} className="opacity-70" />
                    <span>Copy Text</span>
                  </button>
                )}
                
                {contextMenu.message.image && (
                  <button 
                    onClick={() => handleDownloadImage(contextMenu.message.image, contextMenu.message.messageType)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-xl hover:bg-base-200 text-left transition-colors"
                  >
                    <Download size={16} className="opacity-70" />
                    <span>{contextMenu.message.messageType === "video" ? "Download Video" : "Download Image"}</span>
                  </button>
                )}
                
                {(contextMenu.message.senderId === authUser._id || 
                  contextMenu.message.senderId?._id === authUser._id || 
                  (selectedGroup && selectedGroup.creatorId === authUser._id)) && (
                  <button 
                    onClick={() => handleDeleteMessage(contextMenu.message)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-error rounded-xl hover:bg-error/10 text-left transition-colors"
                  >
                    <Trash2 size={16} className="text-error" />
                    <span>Delete Message</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {viewingMedia && (
        <MediaViewerModal
          message={viewingMedia}
          onClose={() => setViewingMedia(null)}
          onDownload={handleDownloadImage}
        />
      )}

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

            {/* Invite Links / Code Section */}
            <div className="bg-base-200/40 border border-base-300/50 rounded-2xl p-4 space-y-3 text-left animate-fade-in">
              <span className="text-xs font-bold text-base-content/60 uppercase tracking-widest block">Invite to Group</span>
              
              {/* Invite Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider block">Invite Code</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-base-300/60 p-2 rounded-xl text-center font-mono font-bold text-sm tracking-wider text-primary border border-base-300">
                    {selectedGroupDetails?.inviteCode || selectedGroup.inviteCode || "N/A"}
                  </code>
                  <button
                    onClick={() => {
                      const code = selectedGroupDetails?.inviteCode || selectedGroup.inviteCode;
                      if (code) {
                        navigator.clipboard.writeText(code);
                        toast.success("Invite code copied!");
                      }
                    }}
                    className="btn btn-xs btn-outline border-base-300 hover:bg-base-200 rounded-lg py-1.5 px-2.5 h-auto text-[10px] font-bold"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider block">Invite Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join-group?code=${selectedGroupDetails?.inviteCode || selectedGroup.inviteCode || ""}`}
                    className="flex-1 bg-base-300/60 p-2 rounded-xl text-xs text-base-content/75 border border-base-300 focus:outline-none truncate"
                  />
                  <button
                    onClick={() => {
                      const code = selectedGroupDetails?.inviteCode || selectedGroup.inviteCode;
                      if (code) {
                        navigator.clipboard.writeText(`${window.location.origin}/join-group?code=${code}`);
                        toast.success("Invite link copied!");
                      }
                    }}
                    className="btn btn-xs btn-outline border-base-300 hover:bg-base-200 rounded-lg py-1.5 px-2.5 h-auto text-[10px] font-bold"
                  >
                    Copy
                  </button>
                </div>
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