import React, { useEffect, useState, useRef } from "react";
import { useChatstore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { useStoryStore } from "../store/useStoryStore";
import { 
  Search, MoreVertical, Camera, Pencil, Users, Mail, X, 
  MessageSquare, Phone, Plus, Check, User, Settings, RefreshCw,
  LogOut, ArrowLeft, Trash2, Video, PhoneCall, PhoneOff, PhoneIncoming, PhoneMissed, Image,
  Pin, VolumeX, CheckCircle, FolderPlus, Archive, UserMinus, UserX, Ban
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import StoryViewer from "./StoryViewer";

const formatLastMessageTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  // Check if within 7 days
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, activeTab, setActiveTab, addContact, removeContact, blockContact, activeConversations, setActiveConversations, initializeActiveConversations, deleteConversation: deleteStoreConversation } = useChatstore();
  const { authUser, onlineUsers, logout } = useAuthStore();
  const { initiateCall } = useCallStore();

  // Navigation states
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [addContactInput, setAddContactInput] = useState("");
  const [dismissedCards, setDismissedCards] = useState(() => {
    const saved = localStorage.getItem(`dismissed_cards_${authUser?._id}`);
    return saved ? JSON.parse(saved) : [];
  });



  // Story Store
  const { stories, getStories, postStory, deleteStory, isStoriesLoading, isUploadingStory } = useStoryStore();

  const [viewingStory, setViewingStory] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [storyImage, setStoryImage] = useState(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyType, setStoryType] = useState("text"); // "text" or "image"
  const storyFileInputRef = useRef(null);

  // Call Logs State
  const [callLogs, setCallLogs] = useState(() => {
    if (!authUser?._id) return [];
    const saved = localStorage.getItem(`call_logs_${authUser._id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Recently Unfriended History State
  const [recentlyUnfriended, setRecentlyUnfriended] = useState(() => {
    if (!authUser?._id) return [];
    const saved = localStorage.getItem(`recently_unfriended_${authUser._id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showRecentlyUnfriendedModal, setShowRecentlyUnfriendedModal] = useState(false);

  // Long press / Context Menu states for Friends Tab
  const [activeMenuFriendId, setActiveMenuFriendId] = useState(null);
  const [activeMenuFriendUser, setActiveMenuFriendUser] = useState(null);
  const [friendMenuPosition, setFriendMenuPosition] = useState({ x: 0, y: 0 });
  const friendLongPressTimer = useRef(null);

  const startFriendLongPress = (e, targetUser) => {
    if (friendLongPressTimer.current) clearTimeout(friendLongPressTimer.current);

    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    friendLongPressTimer.current = setTimeout(() => {
      e.preventDefault();
      setFriendMenuPosition({ x: clientX, y: clientY });
      setActiveMenuFriendId(targetUser._id);
      setActiveMenuFriendUser(targetUser);
    }, 500);
  };

  const endFriendLongPress = () => {
    if (friendLongPressTimer.current) clearTimeout(friendLongPressTimer.current);
  };

  const handleFriendContextMenu = (e, targetUser) => {
    e.preventDefault();
    setFriendMenuPosition({ x: e.clientX, y: e.clientY });
    setActiveMenuFriendId(targetUser._id);
    setActiveMenuFriendUser(targetUser);
  };

  useEffect(() => {
    getUsers();
    getStories();
    if (authUser?._id) {
      initializeActiveConversations(authUser._id);
    }
  }, [getUsers, getStories, authUser?._id, initializeActiveConversations]);

  // Sync real-time call logs instantly when updated
  useEffect(() => {
    const handleSync = () => {
      if (authUser?._id) {
        const saved = localStorage.getItem(`call_logs_${authUser._id}`);
        setCallLogs(saved ? JSON.parse(saved) : []);
      }
    };
    window.addEventListener("callLogsUpdated", handleSync);
    return () => window.removeEventListener("callLogsUpdated", handleSync);
  }, [authUser?._id]);

  const handleManualRefresh = () => {
    getUsers();
    getStories();
    toast.success("Refreshing data... 🔄");
  };

  // Keep track of active conversation if user selects someone
  useEffect(() => {
    if (selectedUser && !activeConversations.includes(selectedUser._id)) {
      const updated = [...activeConversations, selectedUser._id];
      setActiveConversations(updated);
      localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
    }
  }, [selectedUser, activeConversations, authUser?._id]);

  // Dismiss cards handler
  const dismissCard = (cardId) => {
    const updated = [...dismissedCards, cardId];
    setDismissedCards(updated);
    localStorage.setItem(`dismissed_cards_${authUser?._id}`, JSON.stringify(updated));
    toast.success("Card dismissed");
  };

  // Extract initials for beautiful avatar placeholder (lowercase mr like the screenshot)
  const getInitials = (name) => {
    if (!name) return "us";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toLowerCase();
    }
    return name.slice(0, 2).toLowerCase();
  };

  const handleInviteFriends = () => {
    const inviteUrl = window.location.origin;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard! Share it with friends.");
  };

  const handleNewGroup = () => {
    toast.success("Group feature: Select contacts below to initialize a group!");
    setShowContactsModal(true);
  };

  const handleMarkAllRead = () => {
    toast.success("All conversations marked as read! ✔️");
  };

  const handleFilterUnread = () => {
    toast.success("Filtered to show unread chats! 🔍");
  };

  const handleNotificationProfile = () => {
    toast.success("Notification profile: Standard 🔔");
  };

  // Long-press and Right-click contextual menu states and event triggers
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef(null);

  const startLongPress = (e, userId) => {
    // Avoid double triggering
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    // Save event mouse/touch coordinates
    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    longPressTimer.current = setTimeout(() => {
      e.preventDefault();
      setMenuPosition({ x: clientX, y: clientY });
      setActiveMenuUserId(userId);
    }, 500); // 500ms long-press duration
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleContextMenu = (e, userId) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setActiveMenuUserId(userId);
  };

  // Remove and permanently delete a conversation from database and sidebar
  const deleteConversation = async (e, userId) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this conversation and all its messages?");
    if (!confirmDelete) return;

    await deleteStoreConversation(userId);
  };

  // Filter users for contact list drawer
  const filteredContacts = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active chats are the users we've exchanged messages with, filtered by search query
  const chatUsers = users.filter(user => 
    activeConversations.includes(user._id) && 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStoryImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setStoryImage(reader.result);
      setStoryType("image");
    };
    reader.readAsDataURL(file);
  };

  const createStory = async (e) => {
    e.preventDefault();
    if (storyType === "text" && !storyText.trim()) return;
    if (storyType === "image" && !storyImage) return;

    const success = await postStory({
      content: storyType === "text" ? storyText : storyImage,
      type: storyType,
      caption: storyType === "image" ? storyText : ""
    });

    if (success) {
      setStoryText("");
      setStoryImage(null);
      setStoryType("text");
      setShowStoryCreator(false);
    }
  };

  // Find current user's stories from the grouped list
  const myGroupedStories = stories.find(s => s.user._id === authUser._id);
  const otherStories = stories.filter(s => s.user._id !== authUser._id);

  return (
    <div className="h-full w-full flex flex-col bg-base-100 select-none relative">
      
      {/* 1. Sleek Signal Header */}
      <header className="p-4 border-b border-base-300 flex items-center justify-between bg-base-100/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Reactive Initials Profile Avatar */}
          <div className="relative group cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            {authUser?.profilePic ? (
              <img 
                src={authUser.profilePic} 
                alt={authUser.fullName} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-base shadow-sm hover:brightness-95 transition-all">
                {getInitials(authUser?.fullName)}
              </div>
            )}
            
            {/* Custom Settings/Profile dropdown */}
            {showProfileMenu && (
              <div className="absolute left-0 mt-3 w-64 bg-base-100 border border-base-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden py-1 divide-y divide-base-200 text-left">
                <div className="px-5 py-3">
                  <p className="font-bold text-[15px] text-slate-800 dark:text-slate-200 tracking-tight truncate">{authUser?.fullName || "Masudur Rahaman"}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{authUser?.email || "masudurrahamanrm@gmail.com"}</p>
                </div>
                <div className="py-1">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3.5 px-5 py-3.5 text-sm hover:bg-base-200 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User size={18} className="text-slate-500 dark:text-slate-400" /> 
                    <span>My Profile</span>
                  </Link>
                  <Link 
                    to="/settings" 
                    className="flex items-center gap-3.5 px-5 py-3.5 text-sm hover:bg-base-200 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings size={18} className="text-slate-500 dark:text-slate-400" /> 
                    <span>Settings</span>
                  </Link>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => { setShowProfileMenu(false); logout(); }} 
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 text-sm hover:bg-rose-50/30 dark:hover:bg-rose-950/10 text-rose-400 dark:text-rose-300 font-medium transition-colors text-left"
                  >
                    <LogOut size={18} className="text-rose-400 dark:text-rose-300" /> 
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Header Title based on Active Tab */}
          <h1 className="text-xl font-bold tracking-tight text-base-content">
            {activeTab === "chats" && "ChatZone"}
            {activeTab === "calls" && "Calls"}
            {activeTab === "friends" && "Friends"}
            {activeTab === "stories" && "Stories"}
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Toggle search input */}
          <div className="relative flex items-center">
            <input 
              type="text"
              name="sidebar-search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-0 focus:w-40 sm:focus:w-48 px-0 focus:px-3 py-1 text-sm bg-base-200 border border-transparent focus:border-base-300 rounded-full transition-all duration-300 opacity-0 focus:opacity-100 outline-none"
              id="search-input"
            />
            <button 
              onClick={handleManualRefresh}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors animate-fade-in"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={isUsersLoading || isStoriesLoading ? "animate-spin text-primary" : ""} />
            </button>
            <button 
              onClick={() => document.getElementById("search-input")?.focus()}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
              title="Search"
            >
              <Search size={21} />
            </button>
          </div>
          
          {activeTab === "friends" && (
            <button 
              onClick={() => setShowRecentlyUnfriendedModal(true)}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors animate-fade-in"
              title="Recently Unfriended"
            >
              <UserX size={21} />
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => {
                setShowThreeDotMenu(!showThreeDotMenu);
                setShowProfileMenu(false); // dismiss other dropdowns
              }}
              className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
              title="Menu"
            >
              <MoreVertical size={21} />
            </button>

            {/* Premium Signal 3-Dot Dropdown Menu Card */}
            {showThreeDotMenu && (
              <div className="absolute right-0 mt-2.5 top-11 w-56 bg-base-100 dark:bg-base-200 border border-base-200/80 dark:border-base-700 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden py-3 flex flex-col space-y-1 text-left animate-fade-in">
                <button 
                  onClick={() => { setShowThreeDotMenu(false); handleNewGroup(); }}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors"
                >
                  New group
                </button>
                <button 
                  onClick={() => { setShowThreeDotMenu(false); handleMarkAllRead(); }}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors"
                >
                  Mark all read
                </button>
                <button 
                  onClick={() => { setShowThreeDotMenu(false); handleInviteFriends(); }}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors"
                >
                  Invite friends
                </button>
                <button 
                  onClick={() => { setShowThreeDotMenu(false); handleFilterUnread(); }}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors"
                >
                  Filter unread chats
                </button>
                <Link 
                  to="/settings"
                  onClick={() => setShowThreeDotMenu(false)}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors block"
                >
                  Settings
                </Link>
                <button 
                  onClick={() => { setShowThreeDotMenu(false); handleNotificationProfile(); }}
                  className="w-full text-left px-6 py-2.5 text-sm font-semibold hover:bg-base-200 text-base-content/85 transition-colors"
                >
                  Notification profile
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Scrollable Body Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-24">
        
        {/* ==================== TABS: CHATS ==================== */}
        {activeTab === "chats" && (
          <div className={`${chatUsers.length === 0 ? "flex flex-col min-h-[66vh] justify-between space-y-6" : "space-y-4"}`}>
            
            {/* If no active conversations, show premium "No Chats Yet" empty state */}
            {chatUsers.length === 0 ? (
              <>
                {/* Centered Empty State Text */}
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2 animate-fade-in">
                  <h2 className="text-xl font-semibold text-base-content">No chats yet.</h2>
                  <p className="text-sm text-base-content/60 max-w-[280px]">
                    Get started by messaging a friend.
                  </p>
                </div>

                {/* "Get started" Quick Action Cards - Anchored to the bottom */}
                <div className="w-full text-left mt-auto animate-fade-in">
                  <h3 className="text-sm font-semibold text-base-content/80 mb-3 px-1">Get started</h3>
                  <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 snap-x snap-mandatory">
                    
                    {/* New Group Card - Pastel Orange */}
                    {!dismissedCards.includes("group") && (
                      <div className="flex-shrink-0 w-[210px] bg-[#FDF6ED] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col justify-between relative snap-start shadow-sm hover:shadow transition-shadow">
                        <button 
                          onClick={() => dismissCard("group")} 
                          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-amber-100/50 dark:hover:bg-amber-950/40 text-amber-900/40 dark:text-amber-200/40"
                        >
                          <X size={15} />
                        </button>
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
                            <Users size={20} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-950 dark:text-amber-200 text-sm">New group</h4>
                            <p className="text-xs text-amber-900/60 dark:text-amber-300/60 mt-0.5">Chat with multiple friends.</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleNewGroup}
                          className="mt-4 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline text-left"
                        >
                          Create group
                        </button>
                      </div>
                    )}

                    {/* Invite Friends Card - Pastel Green */}
                    {!dismissedCards.includes("invite") && (
                      <div className="flex-shrink-0 w-[210px] bg-[#EEF7F2] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between relative snap-start shadow-sm hover:shadow transition-shadow">
                        <button 
                          onClick={() => dismissCard("invite")} 
                          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-emerald-900/40 dark:text-emerald-200/40"
                        >
                          <X size={15} />
                        </button>
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                            <Mail size={20} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-emerald-950 dark:text-emerald-200 text-sm">Invite friends</h4>
                            <p className="text-xs text-emerald-900/60 dark:text-emerald-300/60 mt-0.5">Share ChatZone link with others.</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleInviteFriends}
                          className="mt-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline text-left"
                        >
                          Copy invite link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Active Chat List styled beautifully like Signal */
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Conversations</span>
                  <span className="text-xs text-primary font-medium">({chatUsers.length})</span>
                </div>
                {chatUsers.map((user) => {
                  const isOnline = onlineUsers.includes(user._id);
                  const isSelected = selectedUser?._id === user._id;

                  return (
                    <div
                      key={user._id}
                      onClick={() => {
                        // Prevent click action from firing if active menu is currently open
                        if (activeMenuUserId) return;
                        setSelectedUser(user);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, user._id)}
                      onTouchStart={(e) => startLongPress(e, user._id)}
                      onTouchEnd={endLongPress}
                      onMouseDown={(e) => startLongPress(e, user._id)}
                      onMouseUp={endLongPress}
                      className={`group w-full p-3.5 flex items-center justify-between rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                        isSelected 
                          ? "bg-primary/10 border border-primary/20 shadow-sm" 
                          : "hover:bg-base-200 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {user.profilePic ? (
                            <img
                              src={user.profilePic}
                              alt={user.fullName}
                              className="w-12 h-12 object-cover rounded-full border border-base-300 animate-fade-in"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-base border border-indigo-100 dark:border-indigo-900/20 shadow-sm">
                              {getInitials(user.fullName)}
                            </div>
                          )}
                          {isOnline && (
                            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-base-100 animate-pulse" />
                          )}
                        </div>

                        {/* Name & Last Message Preview */}
                        <div className="text-left min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <h4 className="font-bold text-base-content text-sm md:text-base truncate group-hover:text-primary transition-colors">
                              {user.fullName}
                            </h4>
                            {user.lastMessage && (
                              <span className="text-[10px] text-base-content/40 font-semibold whitespace-nowrap">
                                {formatLastMessageTime(user.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-0.5 min-w-0 gap-1">
                            <p className="text-xs text-base-content/50 truncate flex-1 min-w-0 font-medium leading-relaxed">
                              {user.lastMessage ? (
                                <>
                                  {user.lastMessage.senderId === authUser._id ? (
                                    <span className="inline-flex items-center align-middle mr-1.5 select-none">
                                      {user.lastMessage.isRead ? (
                                        <span className="flex -space-x-1 text-sky-500 dark:text-sky-400">
                                          <Check size={14} className="stroke-[3.5]" />
                                          <Check size={14} className="stroke-[3.5]" />
                                        </span>
                                      ) : (
                                        <Check size={14} className="stroke-[2.5] text-base-content/40" />
                                      )}
                                    </span>
                                  ) : null}
                                  {user.lastMessage.messageType === "voice_call" || user.lastMessage.messageType === "video_call" ? (
                                    <span className="flex items-center gap-1 text-primary/70 font-semibold">
                                      {user.lastMessage.messageType === "video_call" ? <Video size={13} /> : <Phone size={13} />}
                                      {user.lastMessage.messageType === "video_call" ? "Video call" : "Voice call"}
                                    </span>
                                  ) : user.lastMessage.image ? (
                                    <span className="italic flex items-center gap-1 text-primary/60">
                                      📷 Photo
                                    </span>
                                  ) : (
                                    user.lastMessage.text
                                  )}
                                </>
                              ) : (
                                <span className="text-base-content/30 italic">No messages yet</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Archive/Delete Action */}
                      <button
                        onClick={(e) => deleteConversation(e, user._id)}
                        className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-base-300 text-base-content/60 hover:text-error transition-all"
                        title="Archive Chat"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Signal Long-press Options Menu Popover Overlay */}
            {activeMenuUserId && (
              <div 
                className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => setActiveMenuUserId(null)}
                onContextMenu={(e) => { e.preventDefault(); setActiveMenuUserId(null); }}
              >
                <div 
                  style={{ 
                    top: Math.min(menuPosition.y, window.innerHeight - 340), 
                    left: Math.min(menuPosition.x, window.innerWidth - 240) 
                  }}
                  className="absolute bg-base-100 border border-base-300 shadow-2xl rounded-[24px] p-2 w-56 flex flex-col space-y-0.5 z-50 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1. Unread */}
                  <button 
                    onClick={() => {
                      toast.success("Chat marked as unread 💬");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <MessageSquare size={18} className="text-base-content/60" />
                    <span>Unread</span>
                  </button>

                  {/* 2. Pin */}
                  <button 
                    onClick={() => {
                      toast.success("Chat pinned 📌");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <Pin size={18} className="text-base-content/60 rotate-[45deg]" />
                    <span>Pin</span>
                  </button>

                  {/* 3. Mute */}
                  <button 
                    onClick={() => {
                      toast.success("Notifications muted 🔕");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <VolumeX size={18} className="text-base-content/60" />
                    <span>Mute</span>
                  </button>

                  {/* 4. Select */}
                  <button 
                    onClick={() => {
                      toast.success("Selected chat for multi-action ✅");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <CheckCircle size={18} className="text-base-content/60" />
                    <span>Select</span>
                  </button>

                  {/* 5. Add to folder */}
                  <button 
                    onClick={() => {
                      toast.success("Added to folder 📁");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <FolderPlus size={18} className="text-base-content/60" />
                    <span>Add to folder</span>
                  </button>

                  {/* 6. Archive */}
                  <button 
                    onClick={async () => {
                      const updated = activeConversations.filter(id => id !== activeMenuUserId);
                      setActiveConversations(updated);
                      localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                      toast.success("Chat archived 📥");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <Archive size={18} className="text-base-content/60" />
                    <span>Archive</span>
                  </button>

                  {/* 7. Delete */}
                  <button 
                    onClick={async () => {
                      const confirmDelete = window.confirm("Are you sure you want to permanently delete this conversation and all its messages?");
                      if (confirmDelete) {
                        await deleteStoreConversation(activeMenuUserId);
                      }
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-error/10 active:bg-error/20 text-error rounded-xl text-left text-sm font-bold transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TABS: CALLS ==================== */}
        {activeTab === "calls" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Recent Calls</span>
              {callLogs.length > 0 && (
                <button 
                  onClick={() => {
                    setCallLogs([]);
                    localStorage.setItem(`call_logs_${authUser?._id}`, JSON.stringify([]));
                    toast.success("Call log cleared");
                  }}
                  className="text-xs text-error/70 hover:text-error font-medium hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List Call History */}
            {callLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-base-content/50 font-medium">
                No recent calls. Call history will appear here once you make or receive calls.
              </div>
            ) : (
              <div className="space-y-1">
                {callLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-base-200 text-base-content/70">
                        {log.status === "missed" && <PhoneMissed className="text-error" size={18} />}
                        {log.status === "incoming" && <PhoneIncoming className="text-green-500" size={18} />}
                        {log.status === "outgoing" && <PhoneCall className="text-primary" size={18} />}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm text-base-content">{log.name}</h4>
                        <p className="text-xs text-base-content/60 mt-0.5 flex items-center gap-1">
                          {log.type === "video" ? "Video" : "Voice"} • {log.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          const targetUser = users.find(u => u.fullName === log.name);
                          if (targetUser) initiateCall(targetUser, log.type);
                          else toast.error("User offline/not found to call");
                        }}
                        className="p-2.5 rounded-full hover:bg-primary/10 hover:text-primary text-base-content/70 transition-all"
                        title={`Call ${log.name}`}
                      >
                        {log.type === "video" ? <Video size={18} /> : <Phone size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Call Action Help */}
            <div className="p-4 bg-base-200/50 rounded-2xl border border-base-300 text-center space-y-2">
              <Phone className="mx-auto text-primary size-7" />
              <h5 className="font-semibold text-sm">Free HD Calls</h5>
              <p className="text-xs text-base-content/60 max-w-[260px] mx-auto">
                Call any online contact in real-time with crystal-clear audio and video streams.
              </p>
            </div>
          </div>
        )}

        {/* ==================== TABS: STORIES ==================== */}
        {activeTab === "stories" && (
          <div className="space-y-5 animate-fade-in">
            
            {/* My Story Node */}
            <div className="flex items-center justify-between bg-base-200/40 p-3 rounded-2xl border border-base-300/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {authUser?.profilePic ? (
                    <img 
                      src={authUser.profilePic} 
                      alt="me" 
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-primary"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-primary">
                      {getInitials(authUser?.fullName)}
                    </div>
                  )}
                  <button 
                    onClick={() => setShowStoryCreator(true)}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-content rounded-full flex items-center justify-center ring-2 ring-base-100 hover:scale-105 transition-transform"
                    title="Add to story"
                  >
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-sm">My Story</h4>
                  <p className="text-xs text-base-content/60">
                    {myGroupedStories?.stories?.length > 0 
                      ? `${myGroupedStories.stories.length} status updates` 
                      : "Share a status update"}
                  </p>
                </div>
              </div>

              {myGroupedStories?.stories?.length > 0 && (
                <button 
                  onClick={() => setViewingStory({ 
                    name: authUser.fullName, 
                    user: authUser,
                    stories: myGroupedStories.stories 
                  })}
                  className="btn btn-xs btn-outline btn-primary rounded-full px-3"
                >
                  View Mine
                </button>
              )}
            </div>

            {/* Custom Story Creator Panel */}
            {showStoryCreator && (
              <form onSubmit={createStory} className="bg-base-200 p-4 rounded-2xl border border-base-300 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-base-content/70">
                    {storyType === "text" ? "Create Text Status" : "Create Image Status"}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      className="hidden"
                      ref={storyFileInputRef}
                      onChange={handleStoryImageChange}
                      accept="image/*"
                    />
                    <button 
                      type="button" 
                      onClick={() => storyFileInputRef.current?.click()}
                      className={`p-1.5 rounded-full transition-colors ${storyType === 'image' ? 'bg-primary text-white' : 'hover:bg-base-300 text-base-content/50'}`}
                      title="Add Image"
                    >
                      <Camera size={18} />
                    </button>
                    <button type="button" onClick={() => setShowStoryCreator(false)} className="text-base-content/50 hover:text-error">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {storyImage && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-base-300 mb-2">
                    <img src={storyImage} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      type="button" 
                      onClick={() => { setStoryImage(null); setStoryType("text"); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <textarea
                  placeholder={storyType === "text" ? "Type a status... 💭" : "Add a caption... ✍️"}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="textarea textarea-bordered w-full text-sm h-20 bg-base-100"
                  maxLength={160}
                  required={storyType === "text"}
                />

                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowStoryCreator(false);
                      setStoryImage(null);
                      setStoryType("text");
                      setStoryText("");
                    }} 
                    className="btn btn-sm btn-ghost rounded-full"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUploadingStory}
                    className="btn btn-sm btn-primary rounded-full px-4"
                  >
                    {isUploadingStory ? <span className="loading loading-spinner loading-xs"></span> : "Post"}
                  </button>
                </div>
              </form>
            )}

            {/* Friends Stories List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Recent updates</span>
              </div>
              
              {otherStories.length === 0 ? (
                <div className="py-8 text-center text-xs text-base-content/50 font-medium">
                  {isStoriesLoading ? "Loading updates..." : "No recent updates from contacts."}
                </div>
              ) : (
                <div className="space-y-1">
                  {otherStories.map((group) => (
                    <div 
                      key={group.user._id} 
                      onClick={() => setViewingStory({
                        name: group.user.fullName,
                        user: group.user,
                        stories: group.stories
                      })}
                      className="p-3 flex items-center justify-between rounded-2xl hover:bg-base-200 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Avatar with colorful ring representing dynamic stories */}
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary to-secondary ring-2 ring-transparent">
                          <div className="p-0.5 bg-base-100 rounded-full">
                            {group.user.profilePic ? (
                                <img src={group.user.profilePic} className="w-11 h-11 rounded-full object-cover" />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                                {getInitials(group.user.fullName)}
                                </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-sm">{group.user.fullName}</h4>
                          <p className="text-xs text-base-content/60 mt-0.5">
                            {group.stories.length} updates • Tap to view
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom My Stories History List */}
            {myGroupedStories?.stories?.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider px-1">Your Updates</span>
                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                  {myGroupedStories.stories.map((story) => (
                    <div key={story._id} className="p-3 bg-base-200/50 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-3 truncate">
                        {story.type === 'image' && (
                            <img src={story.content} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div className="text-left truncate">
                            <p className="text-sm font-medium truncate">{story.type === 'text' ? story.content : (story.caption || 'Image Status')}</p>
                            <p className="text-[10px] text-base-content/50 mt-0.5">
                                {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteStory(story._id); }}
                        className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-base-300 text-error/70 hover:text-error transition-all"
                        title="Delete story"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TABS: FRIENDS ==================== */}
        {activeTab === "friends" && (
          <div className="space-y-4 animate-fade-in pb-12">
            {/* Header / Add Friend area */}
            <div className="p-1.5 bg-base-200/50 rounded-2xl border border-base-300/30 space-y-3">
              <div className="flex gap-2 items-center px-1">
                <input 
                  type="text" 
                  placeholder="Add by email, phone, or @username..."
                  value={addContactInput}
                  onChange={(e) => setAddContactInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
                />
                <button 
                  onClick={async () => {
                    if (!addContactInput.trim()) {
                      toast.error("Please enter an email, phone, or username");
                      return;
                    }
                    const success = await addContact(addContactInput);
                    if (success) {
                      setAddContactInput("");
                    }
                  }}
                  className="btn btn-primary rounded-xl px-4 py-2.5 text-xs font-bold h-auto min-h-0 normal-case shadow-sm"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Friends Count */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Friends list</span>
              <span className="text-xs text-primary font-bold">({users.length})</span>
            </div>

            {/* List of Friends */}
            {isUsersLoading ? (
              <div className="text-center text-sm text-base-content/60 py-10">Loading friends...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 bg-base-200/20 rounded-2xl border border-dashed border-base-300/50">
                <Users className="mx-auto text-base-content/30" size={36} />
                <h3 className="font-semibold text-base-content text-sm">No friends added yet</h3>
                <p className="text-xs text-base-content/50 max-w-[200px] mx-auto font-medium">Add colleagues by their email, phone, or username to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {users
                  .filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((user) => {
                    const isOnline = onlineUsers.includes(user._id);
                    return (
                      <div 
                        key={user._id}
                        onClick={() => {
                          if (activeMenuFriendId) return;
                          setSelectedUser(user);
                          setActiveTab("chats");
                          // Add to active chat list in localStorage if not already present
                          if (!activeConversations.includes(user._id)) {
                            const updated = [...activeConversations, user._id];
                            setActiveConversations(updated);
                            localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                          }
                        }}
                        onContextMenu={(e) => handleFriendContextMenu(e, user)}
                        onTouchStart={(e) => startFriendLongPress(e, user)}
                        onTouchEnd={endFriendLongPress}
                        onMouseDown={(e) => startFriendLongPress(e, user)}
                        onMouseUp={endFriendLongPress}
                        className="p-3.5 flex items-center justify-between rounded-2xl bg-base-100 hover:bg-base-200 cursor-pointer border border-base-200/50 hover:border-base-300/20 transition-all duration-200 shadow-sm select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {user.profilePic ? (
                              <img
                                src={user.profilePic}
                                alt={user.fullName}
                                className="w-12 h-12 object-cover rounded-full border border-base-300 animate-fade-in"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-base border border-indigo-100 dark:border-indigo-900/20 shadow-sm">
                                {getInitials(user.fullName)}
                              </div>
                            )}
                            {isOnline && (
                              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-base-100 animate-pulse" />
                            )}
                          </div>
                          
                          <div className="text-left min-w-0">
                            <h4 className="font-bold text-sm text-base-content truncate group-hover:text-primary transition-colors">{user.fullName}</h4>
                            <p className="text-xs text-base-content/50 truncate mt-0.5">{user.email || user.username || "No status"}</p>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Quick Message / Chat Button */}
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setActiveTab("chats");
                              // Add to active chat list in localStorage if not already present
                              if (!activeConversations.includes(user._id)) {
                                const updated = [...activeConversations, user._id];
                                setActiveConversations(updated);
                                localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                              }
                            }}
                            className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all"
                            title="Chat with friend"
                          >
                            <MessageSquare size={16} className="fill-primary/20" />
                          </button>

                          {/* Delete/Remove Friend Button */}
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to remove ${user.fullName} from your friends?`)) {
                                const success = await removeContact(user._id);
                                if (success) {
                                  const record = {
                                    user: user,
                                    removedAt: new Date().toISOString()
                                  };
                                  const updated = [record, ...recentlyUnfriended.filter(r => r.user._id !== user._id)].slice(0, 20);
                                  setRecentlyUnfriended(updated);
                                  localStorage.setItem(`recently_unfriended_${authUser?._id}`, JSON.stringify(updated));
                                }
                              }
                            }}
                            className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all"
                            title="Remove friend"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Custom Tap-and-Hold / Long-press Friends Options Menu Popover Overlay */}
            {activeMenuFriendId && activeMenuFriendUser && (
              <div 
                className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => { setActiveMenuFriendId(null); setActiveMenuFriendUser(null); }}
                onContextMenu={(e) => { e.preventDefault(); setActiveMenuFriendId(null); setActiveMenuFriendUser(null); }}
              >
                <div 
                  style={{ 
                    top: Math.min(friendMenuPosition.y, window.innerHeight - 180), 
                    left: Math.min(friendMenuPosition.x, window.innerWidth - 240) 
                  }}
                  className="absolute bg-base-100 border border-base-300 shadow-2xl rounded-[24px] p-2 w-56 flex flex-col space-y-0.5 z-50 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 text-left border-b border-base-300/40 mb-1">
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Friend Options</span>
                    <h5 className="font-bold text-xs text-base-content truncate mt-0.5">{activeMenuFriendUser.fullName}</h5>
                  </div>

                  {/* 1. Unfriend */}
                  <button 
                    onClick={async () => {
                      const user = activeMenuFriendUser;
                      if (window.confirm(`Are you sure you want to remove ${user.fullName} from your friends?`)) {
                        const success = await removeContact(user._id);
                        if (success) {
                          const record = {
                            user: user,
                            removedAt: new Date().toISOString()
                          };
                          const updated = [record, ...recentlyUnfriended.filter(r => r.user._id !== user._id)].slice(0, 20);
                          setRecentlyUnfriended(updated);
                          localStorage.setItem(`recently_unfriended_${authUser?._id}`, JSON.stringify(updated));
                        }
                      }
                      setActiveMenuFriendId(null);
                      setActiveMenuFriendUser(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <UserMinus size={18} className="text-rose-500" />
                    <span>Unfriend</span>
                  </button>

                  {/* 2. Block */}
                  <button 
                    onClick={async () => {
                      const user = activeMenuFriendUser;
                      if (window.confirm(`Are you sure you want to block ${user.fullName}? They will be removed from your friends and won't be able to chat with you.`)) {
                        await blockContact(user._id);
                      }
                      setActiveMenuFriendId(null);
                      setActiveMenuFriendUser(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 rounded-xl text-left text-sm font-semibold transition-colors text-rose-600"
                  >
                    <Ban size={18} className="text-rose-600" />
                    <span>Block</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* 3. Floating Action Buttons (FABs) on Bottom Right */}
      <div className="absolute bottom-20 right-5 flex flex-col gap-3.5 z-20">
        {/* Camera FAB */}
        <button 
          onClick={() => {
            toast.success("Camera: Under active development!");
          }}
          className="w-12 h-12 rounded-2xl bg-base-200 hover:bg-base-300 text-base-content/80 hover:text-base-content flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Camera"
        >
          <Camera size={22} />
        </button>

        {/* Pencil FAB (Active Contacts modal selector) */}
        <button 
          onClick={() => setShowContactsModal(true)}
          className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 hover:brightness-95 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="New Message"
        >
          <Pencil size={21} />
        </button>
      </div>

      {/* 4. Bottom Navigation Bar */}
      <nav className="hidden md:flex absolute bottom-0 inset-x-0 bg-base-100/90 border-t border-base-300 p-2.5 justify-around items-center backdrop-blur-md z-10 animate-fade-in">
        {/* Chats Tab button */}
        <button 
          onClick={() => { setActiveTab("chats"); setSearchQuery(""); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "chats" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <MessageSquare size={21} className={activeTab === "chats" ? "fill-primary" : ""} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "chats" ? "text-primary font-bold" : "text-base-content/60"}`}>Chats</span>
        </button>

        {/* Calls Tab button */}
        <button 
          onClick={() => { setActiveTab("calls"); setSearchQuery(""); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "calls" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Phone size={21} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "calls" ? "text-primary font-bold" : "text-base-content/60"}`}>Calls</span>
        </button>

        {/* Friends Tab button */}
        <button 
          onClick={() => { setActiveTab("friends"); setSearchQuery(""); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "friends" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Users size={21} className={activeTab === "friends" ? "fill-primary" : ""} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "friends" ? "text-primary font-bold" : "text-base-content/60"}`}>Friends</span>
        </button>

        {/* Stories Tab button */}
        <button 
          onClick={() => { setActiveTab("stories"); setSearchQuery(""); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "stories" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Image size={21} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "stories" ? "text-primary font-bold" : "text-base-content/60"}`}>Stories</span>
        </button>
      </nav>

      {/* 5. Contact List / Message Select Modal Drawer */}
      {showContactsModal && (
        <div className="absolute inset-0 bg-base-100 z-50 flex flex-col animate-slide-up">
          <header className="p-4 border-b border-base-300 flex items-center gap-4 bg-base-100">
            <button 
              onClick={() => { setShowContactsModal(false); setSearchQuery(""); }}
              className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
            >
              <ArrowLeft size={21} />
            </button>
            <div className="text-left">
              <h2 className="text-lg font-bold">Select Contact</h2>
              <p className="text-xs text-base-content/50">Start a chat with any teammate</p>
            </div>
          </header>

          {/* Search Contacts */}
          <div className="p-3 bg-base-200/50 border-b border-base-300 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-base-100 border border-base-300 rounded-full">
              <Search size={18} className="text-base-content/40" />
              <input 
                type="text" 
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>

            {/* Premium "Add Contact" Area */}
            <div className="flex gap-2 items-center px-1">
               <input 
                type="text" 
                placeholder="Add by email, phone, or @username..."
                value={addContactInput}
                onChange={(e) => setAddContactInput(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl bg-base-100 border border-base-300 text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                onClick={async () => {
                  if (!addContactInput.trim()) {
                    toast.error("Please enter an email, phone, or username");
                    return;
                  }
                  const success = await addContact(addContactInput);
                  if (success) {
                    setAddContactInput("");
                  }
                }}
                className="btn btn-primary rounded-xl px-4 py-2 text-xs font-bold h-auto min-h-0 normal-case"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isUsersLoading ? (
              <div className="text-center text-sm text-base-content/60 py-10">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center text-sm text-base-content/60 py-10">No contacts found</div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((user) => (
                  <div 
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user);
                      setShowContactsModal(false);
                      setSearchQuery("");
                      setActiveTab("chats");
                      // Add to active chat list in localStorage
                      if (!activeConversations.includes(user._id)) {
                        const updated = [...activeConversations, user._id];
                        setActiveConversations(updated);
                        localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                      }
                    }}
                    className="p-3 flex items-center justify-between rounded-xl hover:bg-base-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        {user.profilePic ? (
                          <img
                            src={user.profilePic}
                            alt={user.fullName}
                            className="w-11 h-11 object-cover rounded-full border border-base-300"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                            {getInitials(user.fullName)}
                          </div>
                        )}
                        {onlineUsers.includes(user._id) && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm text-base-content">{user.fullName}</h4>
                        <p className="text-xs text-base-content/50">{user.email}</p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Story Viewer Overlay */}
      {viewingStory && (
        <StoryViewer 
            user={viewingStory.user}
            stories={viewingStory.stories}
            onClose={() => setViewingStory(null)}
        />
      )}

      {/* 7. Recently Unfriended History Overlay Modal */}
      {showRecentlyUnfriendedModal && (
        <div className="absolute inset-0 bg-base-100 z-50 flex flex-col animate-slide-up">
          <header className="p-4 border-b border-base-300 flex items-center gap-4 bg-base-100">
            <button 
              onClick={() => setShowRecentlyUnfriendedModal(false)}
              className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors animate-fade-in"
            >
              <ArrowLeft size={21} />
            </button>
            <div className="text-left">
              <h2 className="text-lg font-bold">Recently Unfriended</h2>
              <p className="text-xs text-base-content/50">Colleagues you've recently removed</p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {recentlyUnfriended.length === 0 ? (
              <div className="text-center py-20 px-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/40">
                  <UserX size={28} />
                </div>
                <h3 className="font-semibold text-base-content text-sm">History is clear</h3>
                <p className="text-xs text-base-content/50 max-w-[200px] mx-auto">You haven't removed any colleagues recently.</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">History Log</span>
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear your unfriend history?")) {
                        setRecentlyUnfriended([]);
                        localStorage.setItem(`recently_unfriended_${authUser?._id}`, JSON.stringify([]));
                      }
                    }}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-2.5">
                  {recentlyUnfriended.map((record) => (
                    <div 
                      key={record.user._id}
                      className="p-3.5 flex items-center justify-between rounded-2xl bg-base-200/45 border border-base-300/10 hover:border-base-300/35 hover:bg-base-200 transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {record.user.profilePic ? (
                            <img
                              src={record.user.profilePic}
                              alt={record.user.fullName}
                              className="w-11 h-11 object-cover rounded-full border border-base-300"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                              {getInitials(record.user.fullName)}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-left min-w-0">
                          <h4 className="font-bold text-sm text-base-content truncate">{record.user.fullName}</h4>
                          <p className="text-[10px] text-base-content/40 truncate mt-0.5">
                            Removed {new Date(record.removedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Add Back / Re-friend Button */}
                      <button 
                        onClick={async () => {
                          const success = await addContact(record.user.email || record.user.username);
                          if (success) {
                            const updated = recentlyUnfriended.filter(r => r.user._id !== record.user._id);
                            setRecentlyUnfriended(updated);
                            localStorage.setItem(`recently_unfriended_${authUser?._id}`, JSON.stringify(updated));
                          }
                        }}
                        className="btn btn-xs btn-primary rounded-lg px-2.5 py-1 font-semibold h-auto min-h-0 normal-case"
                        title="Add friend back"
                      >
                        Add Back
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Sidebar;
