import React, { useEffect, useState, useRef } from "react";
import { useChatstore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { useStoryStore } from "../store/useStoryStore";
import { useGroupStore } from "../store/useGroupStore";
import { 
  Search, MoreVertical, Camera, UserPlus, Users, Mail, X, 
  MessageSquare, Phone, Plus, Check, User, Settings, 
  LogOut, ArrowLeft, Trash2, Video, PhoneCall, PhoneOff, PhoneIncoming, PhoneMissed, Image,
  Pin, VolumeX, CheckCircle, FolderPlus, Archive, UserMinus, UserX, Ban,
  Layers, Compass, Loader2, Pencil, Lock, Megaphone, ListFilter,
  Grip, AtSign, Hash, RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import StoryViewer from "./StoryViewer";
import CameraModal from "./CameraModal";
import ProfileModal, { getNickname } from "./ProfileModal";
import ContactListSkeleton from "./skeletons/ContactListSkeleton";

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

const formatStoryTime = (createdAt) => {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, activeTab, setActiveTab, addContact, removeContact, blockContact, activeConversations, setActiveConversations, initializeActiveConversations, deleteConversation: deleteStoreConversation, syncContacts, sendMessage, globalUsers, isGlobalSearching, searchGlobalUsers, clearGlobalSearch } = useChatstore();
  const { authUser, onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();
  const navigate = useNavigate();

  const unreadChatsCount = users.filter(u => u.lastMessage && !u.lastMessage.isRead && u.lastMessage.senderId !== authUser?._id).length;

  // Pinned Chats local state
  const [pinnedChats, setPinnedChats] = useState(() => {
    const saved = localStorage.getItem(`pinned_chats_${authUser?._id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Contact Sync local state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStep, setSyncStep] = useState("ask"); // "ask" | "syncing" | "matched" | "fallback"

  // Camera Modal state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const [nicknamesVersion, setNicknamesVersion] = useState(0);
  const [matchedContacts, setMatchedContacts] = useState([]);
  const [manualEmails, setManualEmails] = useState("");
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [vcfFile, setVcfFile] = useState(null);
  const vcfInputRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("trigger_contact_sync") === "true") {
      localStorage.removeItem("trigger_contact_sync");
      setShowSyncModal(true);
      setSyncStep("ask");
    }
  }, []);

  const parseVCF = (text) => {
    const parsed = [];
    const cards = text.split("BEGIN:VCARD");
    for (const card of cards) {
      if (!card.includes("END:VCARD")) continue;
      const nameMatch = card.match(/FN:(.+)/);
      const emailMatches = [...card.matchAll(/EMAIL.*:(.+)/g)];
      const telMatches = [...card.matchAll(/TEL.*:(.+)/g)];

      const name = nameMatch ? nameMatch[1].trim() : "";
      const emails = emailMatches.map(m => m[1].trim());
      const tels = telMatches.map(m => m[1].trim().replace(/[^a-zA-Z0-9+]/g, ""));

      const maxLen = Math.max(emails.length, tels.length);
      for (let i = 0; i < maxLen; i++) {
        parsed.push({
          name: name || `Contact ${parsed.length + 1}`,
          email: emails[i] || "",
          phoneNumber: tels[i] || ""
        });
      }
    }
    return parsed;
  };

  const handleNativeContactSync = async () => {
    if (!navigator.contacts || !navigator.contacts.select) {
      setSyncStep("fallback");
      return;
    }

    setIsSyncingContacts(true);
    setSyncStep("syncing");

    try {
      const props = ["name", "email", "tel"];
      const opts = { multiple: true };
      const nativeContacts = await navigator.contacts.select(props, opts);
      
      const formatted = nativeContacts.map(c => ({
        name: c.name?.[0] || "",
        email: c.email?.[0] || "",
        phoneNumber: c.tel?.[0] || ""
      }));

      if (formatted.length === 0) {
        toast.error("No contacts selected");
        setSyncStep("ask");
        setIsSyncingContacts(false);
        return;
      }

      const res = await syncContacts(formatted);
      if (res.success) {
        setMatchedContacts(res.matchedUsers || []);
        setSyncStep("matched");
      } else {
        toast.error(res.error || "Sync failed");
        setSyncStep("ask");
      }
    } catch (err) {
      console.error("Native Contact Picker failed:", err);
      setSyncStep("fallback");
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleVCFUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVcfFile(file);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const parsed = parseVCF(text);
      if (parsed.length === 0) {
        toast.error("Could not find any contacts in the VCF file");
        return;
      }

      setIsSyncingContacts(true);
      setSyncStep("syncing");

      const res = await syncContacts(parsed);
      if (res.success) {
        setMatchedContacts(res.matchedUsers || []);
        setSyncStep("matched");
      } else {
        toast.error(res.error || "Sync failed");
        setSyncStep("fallback");
      }
      setIsSyncingContacts(false);
    };
    reader.readAsText(file);
  };

  const handleManualEmailSync = async (e) => {
    e.preventDefault();
    if (!manualEmails.trim()) {
      toast.error("Please enter some emails or phone numbers");
      return;
    }

    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const phoneRegex = /\+?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/g;

    const emails = manualEmails.match(emailRegex) || [];
    const phones = manualEmails.match(phoneRegex) || [];

    const parsedContacts = [];
    emails.forEach(email => parsedContacts.push({ email, phoneNumber: "", name: email }));
    phones.forEach(phone => parsedContacts.push({ email: "", phoneNumber: phone, name: phone }));

    if (parsedContacts.length === 0) {
      toast.error("No valid emails or phone numbers found");
      return;
    }

    setIsSyncingContacts(true);
    setSyncStep("syncing");

    const res = await syncContacts(parsedContacts);
    if (res.success) {
      setMatchedContacts(res.matchedUsers || []);
      setSyncStep("matched");
    } else {
      toast.error(res.error || "Sync failed");
      setSyncStep("fallback");
    }
    setIsSyncingContacts(false);
  };

  // Group Store integrations
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    fetchGroups,
    createGroup,
    leaveGroup,
    isGroupsLoading,
    isCreatingGroup,
    joinGroupByInviteCode,
    sendGroupMessage
  } = useGroupStore();

  // Group Creation local state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [groupAvatarPreview, setGroupAvatarPreview] = useState(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const groupAvatarInputRef = useRef(null);

  const handleGroupAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleFriendSelection = (userId) => {
    setSelectedFriendIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const filteredFriendsForGroup = users.filter(user => 
    user.fullName.toLowerCase().includes(friendSearchQuery.toLowerCase())
  );

  // Load groups when switching to groups tab
  useEffect(() => {
    if (activeTab === "groups") {
      fetchGroups();
    }
  }, [activeTab, fetchGroups]);

  // Navigation states
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [addContactInput, setAddContactInput] = useState("");

  // Global Search Debounce
  useEffect(() => {
    const query = searchQuery.trim();
    if (query) {
      const timer = setTimeout(() => {
        searchGlobalUsers(query);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      clearGlobalSearch();
    }
  }, [searchQuery, searchGlobalUsers, clearGlobalSearch]);

  const threeDotMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (threeDotMenuRef.current && !threeDotMenuRef.current.contains(event.target)) {
        setShowThreeDotMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [dismissedCards, setDismissedCards] = useState(() => {
    const saved = localStorage.getItem(`dismissed_cards_${authUser?._id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Invite Join state
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const handleJoinGroupByInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    let code = inviteCodeInput.trim();
    try {
      const url = new URL(code);
      const urlCode = url.searchParams.get("code");
      if (urlCode) {
        code = urlCode;
      }
    } catch (_) {
      // Input is code directly
    }

    const success = await joinGroupByInviteCode(code);
    if (success) {
      setShowJoinGroupModal(false);
      setInviteCodeInput("");
    }
  };

  // Story Store
  const { stories, getStories, postStory, deleteStory, isStoriesLoading, isUploadingStory, subscribeToStories, unsubscribeFromStories } = useStoryStore();

  const [viewingStory, setViewingStory] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [storyImage, setStoryImage] = useState(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showMyUpdatesHistory, setShowMyUpdatesHistory] = useState(false);
  const [storyType, setStoryType] = useState("text"); // "text" or "image"
  const storyFileInputRef = useRef(null);
  const [cameraInitialMode, setCameraInitialMode] = useState("camera");
  const [activeStoryMenuId, setActiveStoryMenuId] = useState(null);
  const [storyToDelete, setStoryToDelete] = useState(null);

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
  const lastMouseUpTime = useRef(0);

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
    lastMouseUpTime.current = Date.now();
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
    subscribeToStories();
    if (authUser?._id) {
      initializeActiveConversations(authUser._id);
    }

    return () => {
      unsubscribeFromStories();
    };
  }, [getUsers, getStories, subscribeToStories, unsubscribeFromStories, authUser?._id, initializeActiveConversations]);

  // Listen for nickname updates to re-render
  useEffect(() => {
    const handleNicknameUpdate = () => setNicknamesVersion(v => v + 1);
    window.addEventListener("nicknamesUpdated", handleNicknameUpdate);
    return () => window.removeEventListener("nicknamesUpdated", handleNicknameUpdate);
  }, []);

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
    setShowCreateGroupModal(true);
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      return toast.error("Group name is required");
    }
    if (newGroupName.length > 50) {
      return toast.error("Group name must be 50 characters or less");
    }

    const success = await createGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      avatar: groupAvatarPreview,
      members: selectedFriendIds
    });

    if (success) {
      setNewGroupName("");
      setNewGroupDesc("");
      setGroupAvatarPreview(null);
      setSelectedFriendIds([]);
      setFriendSearchQuery("");
      setShowCreateGroupModal(false);
    }
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
  const [activeMenuGroupId, setActiveMenuGroupId] = useState(null);
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

  const startGroupLongPress = (e, groupId) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    let clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    longPressTimer.current = setTimeout(() => {
      e.preventDefault();
      setMenuPosition({ x: clientX, y: clientY });
      setActiveMenuGroupId(groupId);
    }, 500);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    lastMouseUpTime.current = Date.now();
  };

  const handleContextMenu = (e, userId) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setActiveMenuUserId(userId);
  };

  const handleGroupContextMenu = (e, groupId) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setActiveMenuGroupId(groupId);
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
    user.isContact && user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active chats are the users we've exchanged messages with, filtered by search query
  const chatUsers = users.filter(user => 
    (user.lastMessage || activeConversations.includes(user._id)) && 
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
  const myGroupedStories = stories.find(s => s.user._id.toString() === authUser?._id?.toString());
  const otherStories = stories.filter(s => s.user._id.toString() !== authUser?._id?.toString());

  return (
    <div className="h-full w-full flex flex-col bg-base-100 select-none relative">
      
      {/* 1. Sleek Signal Header */}
      <header className="safe-top bg-base-100/90 backdrop-blur sticky top-0 z-10 flex flex-col">
        
        {/* Top Row: Avatar, Title, Actions */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Reactive Initials Profile Avatar */}
            <div className="relative group">
              <div className="cursor-pointer" onClick={() => navigate('/settings')}>
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
              </div>
            </div>

            {/* Dynamic Header Title based on Active Tab */}
            <h1 className="text-xl font-bold tracking-tight text-[#1e88e5]">
              {activeTab === "chats" && "ChatZone"}
              {activeTab === "calls" && "Calls"}
              {activeTab === "friends" && "Friends"}
              {activeTab === "stories" && "Stories"}
            </h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {activeTab === "friends" && (
              <button 
                onClick={() => setShowRecentlyUnfriendedModal(true)}
                className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors animate-fade-in"
                title="Recently Unfriended"
              >
                <UserX size={21} />
              </button>
            )}
            
            <div className="relative" ref={threeDotMenuRef}>
              <button 
                onClick={() => {
                  setShowThreeDotMenu(!showThreeDotMenu);
                }}
                className="p-2 -mr-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
                title="Menu"
              >
                <MoreVertical size={24} />
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
        </div>

        {/* Bottom Row: Persistent Search Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-base-200/70 rounded-full transition-colors hover:bg-base-200">
            <Search size={20} className="text-base-content/50 shrink-0" />
            <input 
              type="text"
              name="sidebar-search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Search Chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[16px] focus:outline-none placeholder:text-base-content/50"
            />
          </div>
        </div>
      </header>

      {/* 2. Scrollable Body Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-24">
        {/* ==================== TABS: CHATS ==================== */}
        {activeTab === "chats" && (
          <div className="space-y-4">
            
            {/* If loading users, show skeleton */}
            {isUsersLoading ? (
              <ContactListSkeleton count={6} />
            ) : chatUsers.length === 0 ? (
              searchQuery.trim().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 animate-fade-in">
                  <h2 className="text-xl font-semibold text-base-content">No chats yet.</h2>
                  <p className="text-sm text-base-content/60 max-w-[280px]">
                    Get started by messaging a friend.
                  </p>
                </div>
              ) : null
            ) : (
              /* Active Chat List styled beautifully like Signal */
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Conversations</span>
                  <span className="text-xs text-primary font-medium">({chatUsers.length})</span>
                </div>
                {[...chatUsers].sort((a, b) => {
                  const aPinned = pinnedChats.includes(a._id);
                  const bPinned = pinnedChats.includes(b._id);
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  return 0;
                }).map((user) => {
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
                        <div 
                          className="relative flex-shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileModalData(user);
                          }}
                        >
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
                            <h4 className="font-bold text-base-content text-sm md:text-base truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {getNickname(authUser?._id, user._id) || user.fullName}
                              {pinnedChats.includes(user._id) && <Pin size={12} className="text-base-content/40 rotate-[45deg] shrink-0" />}
                            </h4>
                            {user.lastMessage && (
                              <span className="text-[10px] text-base-content/40 font-semibold whitespace-nowrap">
                                {formatLastMessageTime(user.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-0.5 min-w-0 gap-1">
                            <p className={`text-xs truncate flex-1 min-w-0 font-medium leading-relaxed ${
                              user.lastMessage && !user.lastMessage.isRead && user.lastMessage.senderId !== authUser._id
                                ? "text-base-content font-bold"
                                : "text-base-content/50"
                            }`}>
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
                                  ) : user.lastMessage.messageType === "video" ? (
                                    <span className="italic flex items-center gap-1 text-primary/60">
                                      🎥 Video
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
                            
                            {user.lastMessage && !user.lastMessage.isRead && user.lastMessage.senderId !== authUser._id && (
                              <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 ml-2 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* GLOBAL SEARCH RESULTS FOR CHATS TAB */}
            {searchQuery.trim().length > 0 && activeTab === "chats" && (
              <div className="pt-2 animate-fade-in">
                <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider px-1 mb-3">Global search</h3>
                
                {isGlobalSearching ? (
                  <div className="text-center text-sm text-base-content/60 py-6 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-primary" />
                    Searching...
                  </div>
                ) : globalUsers.length === 0 ? (
                  <div className="text-center text-sm text-base-content/60 py-6">No users found</div>
                ) : (
                  <div className="space-y-1">
                    {globalUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user._id);
                      return (
                        <div 
                          key={user._id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery("");
                            if (!activeConversations.includes(user._id)) {
                              const updated = [...activeConversations, user._id];
                              setActiveConversations(updated);
                              localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                            }
                          }}
                          className="group w-full p-3.5 flex items-center justify-between rounded-2xl cursor-pointer transition-all duration-200 select-none hover:bg-base-200 border border-transparent"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0 cursor-pointer">
                              {user.profilePic ? (
                                <img
                                  src={user.profilePic}
                                  alt={user.fullName}
                                  className="w-12 h-12 object-cover rounded-full border border-base-300"
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
                            
                            {/* Name and Username */}
                            <div className="text-left min-w-0 flex-1 flex flex-col justify-center">
                              <h4 className="font-bold text-base-content text-sm md:text-base truncate group-hover:text-primary transition-colors">
                                {user.fullName}
                              </h4>
                              <p className="text-[13px] text-[#1e88e5] truncate mt-0.5">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Custom Signal Long-press Options Menu Popover Overlay */}
            {activeMenuUserId && (
              <div 
                className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => {
                  if (Date.now() - lastMouseUpTime.current < 150) return;
                  setActiveMenuUserId(null);
                }}
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
                      const isPinned = pinnedChats.includes(activeMenuUserId);
                      const updated = isPinned 
                        ? pinnedChats.filter(id => id !== activeMenuUserId) 
                        : [...pinnedChats, activeMenuUserId];
                      setPinnedChats(updated);
                      localStorage.setItem(`pinned_chats_${authUser?._id}`, JSON.stringify(updated));
                      toast.success(isPinned ? "Chat unpinned" : "Chat pinned 📌");
                      setActiveMenuUserId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-base-content/90"
                  >
                    <Pin size={18} className="text-base-content/60 rotate-[45deg]" />
                    <span>{pinnedChats.includes(activeMenuUserId) ? "Unpin" : "Pin"}</span>
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

        {/* ==================== TABS: GROUPS ==================== */}
        {activeTab === "groups" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Actions */}
            <div className="flex justify-between items-center px-1">
              <div className="text-left">
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider block">Groups</span>
                <span className="text-[11px] text-base-content/40 mt-0.5 block">
                  {groups.length} Joined
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowJoinGroupModal(true)}
                  className="btn btn-sm btn-ghost border border-base-300/60 hover:bg-base-200 rounded-full px-3 flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <UserPlus size={14} className="text-primary" />
                  <span>Join</span>
                </button>
                <button 
                  onClick={() => setShowCreateGroupModal(true)}
                  className="btn btn-sm btn-primary rounded-full px-3 flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                >
                  <Plus size={14} />
                  <span>Create</span>
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isGroupsLoading ? (
              <ContactListSkeleton count={4} />
            ) : (
              <div className="space-y-6">
                
                {/* 1. Joined Groups */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-base-content/40 uppercase tracking-widest px-1">My Groups</span>
                  {groups.length === 0 ? (
                    <div className="p-4 bg-base-200/30 rounded-2xl border border-base-300/40 text-center text-xs text-base-content/50 font-medium">
                      You haven't joined any groups yet. Create one or join using an invite code!
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {groups.map((group) => {
                        const isSelected = selectedGroup?._id === group._id;
                        return (
                          <div
                            key={group._id}
                            onClick={() => {
                              if (activeMenuGroupId) return;
                              setSelectedGroup(group);
                            }}
                            onContextMenu={(e) => handleGroupContextMenu(e, group._id)}
                            onTouchStart={(e) => startGroupLongPress(e, group._id)}
                            onTouchEnd={endLongPress}
                            onMouseDown={(e) => startGroupLongPress(e, group._id)}
                            onMouseUp={endLongPress}
                            className={`group w-full p-3.5 flex items-center justify-between rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                              isSelected 
                                ? "bg-indigo-50 dark:bg-indigo-950/20 border border-primary/20" 
                                : "hover:bg-base-200/55 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Avatar */}
                              {group.avatar ? (
                                <img
                                  src={group.avatar}
                                  alt={group.name}
                                  className="w-11 h-11 rounded-full object-cover border border-base-300 shadow-sm shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileModalData(group);
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950 text-primary flex items-center justify-center font-bold text-base shadow-sm shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileModalData(group);
                                  }}
                                >
                                  {group.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              {/* Details */}
                              <div className="text-left min-w-0 flex-1">
                                <h4 className={`font-bold text-[15px] truncate group-hover:text-primary transition-colors ${isSelected ? "text-primary" : "text-base-content"}`}>
                                  {group.name}
                                </h4>
                                <p className="text-[11.5px] text-base-content/50 truncate mt-0.5">
                                  {group.description || "No description provided."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Members Count Badge */}
                              <span className="text-[10px] bg-base-300/60 text-base-content/70 px-2 py-0.5 rounded-full font-bold">
                                {group.membersCount} members
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Custom Group Long-press Options Menu Popover Overlay */}
            {activeMenuGroupId && (
              <div 
                className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => {
                  if (Date.now() - lastMouseUpTime.current < 150) return;
                  setActiveMenuGroupId(null);
                }}
                onContextMenu={(e) => { e.preventDefault(); setActiveMenuGroupId(null); }}
              >
                <div 
                  style={{ 
                    top: Math.min(menuPosition.y, window.innerHeight - 340), 
                    left: Math.min(menuPosition.x, window.innerWidth - 240) 
                  }}
                  className="absolute bg-base-100 border border-base-300 shadow-2xl rounded-[24px] p-2 w-56 flex flex-col space-y-0.5 z-50 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Leave Group */}
                  <button 
                    onClick={() => {
                      const group = groups.find(g => g._id === activeMenuGroupId);
                      if (group && window.confirm(`Are you sure you want to leave ${group.name}?`)) {
                        leaveGroup(group._id);
                      }
                      setActiveMenuGroupId(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-xl text-left text-sm font-semibold transition-colors text-error"
                  >
                    <LogOut size={18} />
                    <span>Leave Group</span>
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
            <div 
              onClick={() => {
                if (myGroupedStories?.stories?.length > 0) {
                  setShowMyUpdatesHistory(true);
                } else {
                  setCameraInitialMode("camera");
                  setShowCameraModal(true);
                }
              }}
              className="flex items-center justify-between bg-base-200/40 p-3 rounded-2xl border border-base-300/50 hover:bg-base-200/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCameraInitialMode("camera");
                    setShowCameraModal(true);
                  }}
                  className="relative cursor-pointer"
                >
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
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCameraInitialMode("camera");
                      setShowCameraModal(true); 
                    }}
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setViewingStory({ 
                      name: authUser.fullName, 
                      user: authUser,
                      stories: myGroupedStories.stories,
                      initialIndex: 0
                    }); 
                  }}
                  className="btn btn-xs btn-outline btn-primary rounded-full px-3"
                >
                  View Mine
                </button>
              )}
            </div>

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

            {/* Sync Contacts Callout Box */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
              <div className="text-left space-y-1">
                <h4 className="text-xs font-bold text-base-content">Sync Device Contacts</h4>
                <p className="text-[10px] text-base-content/60 leading-relaxed font-medium">
                  Automatically match friends already registered on ChatZone.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowSyncModal(true);
                  setSyncStep("ask");
                }}
                className="btn btn-xs btn-primary rounded-xl font-bold px-3 normal-case shadow-sm"
              >
                Sync Now
              </button>
            </div>

            {/* Friends Count */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Friends list</span>
              <span className="text-xs text-primary font-bold">({users.filter(u => u.isContact).length})</span>
            </div>

            {/* List of Friends */}
            {isUsersLoading ? (
              <ContactListSkeleton count={6} />
            ) : users.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 bg-base-200/20 rounded-2xl border border-dashed border-base-300/50">
                <Users className="mx-auto text-base-content/30" size={36} />
                <h3 className="font-semibold text-base-content text-sm">No friends added yet</h3>
                <p className="text-xs text-base-content/50 max-w-[200px] mx-auto font-medium">Add colleagues by their email, phone, or username to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {users
                  .filter(u => u.isContact)
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
                            <h4 className="font-bold text-sm text-base-content truncate group-hover:text-primary transition-colors">{getNickname(authUser?._id, user._id) || user.fullName}</h4>
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
                onClick={() => { 
                  if (Date.now() - lastMouseUpTime.current < 150) return;
                  setActiveMenuFriendId(null); 
                  setActiveMenuFriendUser(null); 
                }}
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
      <div className="absolute bottom-[12%] right-5 flex flex-col gap-3.5 z-20">
        {/* Camera FAB */}
        {activeTab === "stories" && (
          <button 
            onClick={() => {
              setCameraInitialMode("camera");
              setShowCameraModal(true);
            }}
            className="w-14 h-14 rounded-full bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-neutral-100 dark:border-zinc-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Camera"
          >
            <Camera size={24} className="stroke-[1.5]" />
          </button>
        )}

        {/* Add Friend FAB (Active Contacts modal selector) */}
        {activeTab !== "stories" && (
          <button 
            onClick={() => setShowContactsModal(true)}
            className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 hover:brightness-95 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="Add Friend"
          >
            <UserPlus size={21} />
          </button>
        )}
      </div>

      {/* 4. Bottom Navigation Bar */}
      <nav className="hidden md:flex absolute bottom-0 inset-x-0 bg-base-100/90 border-t border-base-300 p-2.5 justify-around items-center backdrop-blur-md z-10 animate-fade-in">
        {/* Chats Tab button */}
        <button 
          onClick={() => { setActiveTab("chats"); setSearchQuery(""); setSelectedUser(null); setSelectedGroup(null); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all relative ${activeTab === "chats" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <MessageSquare size={21} className={activeTab === "chats" ? "fill-primary" : ""} />
            {unreadChatsCount > 0 && (
              <span className="absolute top-0.5 right-2 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm border border-base-100 animate-pulse">
                {unreadChatsCount}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "chats" ? "text-primary font-bold" : "text-base-content/60"}`}>Chats</span>
        </button>

        {/* Groups Tab button */}
        <button 
          onClick={() => { setActiveTab("groups"); setSearchQuery(""); setSelectedUser(null); setSelectedGroup(null); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "groups" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Layers size={21} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "groups" ? "text-primary font-bold" : "text-base-content/60"}`}>Groups</span>
        </button>

        {/* Calls Tab button */}
        <button 
          onClick={() => { setActiveTab("calls"); setSearchQuery(""); setSelectedUser(null); setSelectedGroup(null); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "calls" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Phone size={21} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "calls" ? "text-primary font-bold" : "text-base-content/60"}`}>Calls</span>
        </button>

        {/* Friends Tab button */}
        <button 
          onClick={() => { setActiveTab("friends"); setSearchQuery(""); setSelectedUser(null); setSelectedGroup(null); }}
          className="flex flex-col items-center gap-1 text-center group cursor-pointer"
        >
          <div className={`px-5 py-1 rounded-full transition-all ${activeTab === "friends" ? "bg-indigo-100 dark:bg-indigo-950/40 text-primary" : "text-base-content/60 group-hover:text-base-content"}`}>
            <Users size={21} className={activeTab === "friends" ? "fill-primary" : ""} />
          </div>
          <span className={`text-[11px] font-semibold tracking-wide transition-all ${activeTab === "friends" ? "text-primary font-bold" : "text-base-content/60"}`}>Friends</span>
        </button>

        {/* Stories Tab button */}
        <button 
          onClick={() => { setActiveTab("stories"); setSearchQuery(""); setSelectedUser(null); setSelectedGroup(null); }}
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
          <header className="p-4 flex items-center justify-between bg-base-100">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => { setShowContactsModal(false); setSearchQuery(""); }}
                className="hover:bg-base-200 p-1 -ml-1 rounded-full text-base-content transition-colors"
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <h2 className="text-[18px] font-semibold text-base-content">New message</h2>
            </div>
            <button className="text-base-content hover:bg-base-200 p-1 -mr-1 rounded-full transition-colors">
              <MoreVertical size={22} strokeWidth={2.5} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
            {/* Search Box */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-base-200/50 rounded-2xl">
                <input 
                  type="text" 
                  placeholder="Name, username or number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[16px] focus:outline-none placeholder:text-base-content/50"
                />
                <Grip size={20} className="text-base-content/50 shrink-0" />
              </div>
            </div>

            {/* Actions */}
            {searchQuery.length === 0 && (
              <div className="px-4 pb-4 pt-2 space-y-2">
                <button className="flex items-center gap-4 w-full group text-left px-1 py-1.5 hover:bg-base-200 rounded-xl transition-colors">
                  <div className="w-[44px] h-[44px] rounded-full bg-base-200 text-base-content/80 flex items-center justify-center shrink-0 border border-base-300">
                    <Users size={22} className="stroke-[1.5]" />
                  </div>
                  <span className="text-[16px] font-medium text-base-content tracking-tight">New group</span>
                </button>
                <button className="flex items-center gap-4 w-full group text-left px-1 py-1.5 hover:bg-base-200 rounded-xl transition-colors">
                  <div className="w-[44px] h-[44px] rounded-full bg-base-200 text-base-content/80 flex items-center justify-center shrink-0 border border-base-300">
                    <AtSign size={22} className="stroke-[1.5]" />
                  </div>
                  <span className="text-[16px] font-medium text-base-content tracking-tight">Find by username</span>
                </button>
                <button className="flex items-center gap-4 w-full group text-left px-1 py-1.5 hover:bg-base-200 rounded-xl transition-colors">
                  <div className="w-[44px] h-[44px] rounded-full bg-base-200 text-base-content/80 flex items-center justify-center shrink-0 border border-base-300">
                    <Hash size={22} className="stroke-[1.5]" />
                  </div>
                  <span className="text-[16px] font-medium text-base-content tracking-tight">Find by phone number</span>
                </button>
                <button 
                  onClick={() => {
                    setShowSyncModal(true);
                    if (navigator.contacts && navigator.contacts.select) {
                      handleNativeContactSync();
                    } else {
                      setSyncStep("fallback");
                    }
                  }}
                  className="flex items-center gap-4 w-full group text-left px-1 py-1.5 hover:bg-base-200 rounded-xl transition-colors"
                >
                  <div className="w-[44px] h-[44px] rounded-full bg-base-200 text-base-content/80 flex items-center justify-center shrink-0 border border-base-300">
                    <RefreshCw size={22} className={`stroke-[1.5] ${isUsersLoading ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-base-content tracking-tight">Refresh contacts</span>
                    <span className="text-[13px] text-base-content/60">Missing someone? Try refreshing</span>
                  </div>
                </button>
              </div>
            )}

            {/* Contact List / Global Search */}
            {searchQuery.trim().length > 0 ? (
              <div className="px-4 py-3 space-y-2 animate-fade-in">
                <h3 className="text-[13px] font-semibold text-base-content/50 mb-3 tracking-wide">Global search</h3>
                
                {isGlobalSearching ? (
                  <ContactListSkeleton count={3} />
                ) : globalUsers.length === 0 ? (
                  <div className="text-center text-sm text-base-content/60 py-10">No users found</div>
                ) : (
                  <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
                    {globalUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user._id);
                      return (
                        <div 
                          key={user._id}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowContactsModal(false);
                            setSearchQuery("");
                            setActiveTab("chats");
                            if (!activeConversations.includes(user._id)) {
                              const updated = [...activeConversations, user._id];
                              setActiveConversations(updated);
                              localStorage.setItem(`active_conversations_${authUser?._id}`, JSON.stringify(updated));
                            }
                          }}
                          className="p-3 flex items-center justify-between hover:bg-base-200 cursor-pointer transition-colors border-b border-base-200 last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {user.profilePic ? (
                                <img
                                  src={user.profilePic}
                                  alt={user.fullName}
                                  className="w-[46px] h-[46px] object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-[46px] h-[46px] rounded-full bg-[#f4a034] text-white flex items-center justify-center font-medium text-[18px]">
                                  {getInitials(user.fullName)}
                                </div>
                              )}
                            </div>
                            <div className="text-left flex flex-col justify-center">
                              <h4 className="font-semibold text-[15px] text-base-content leading-snug mb-[1px]">{user.fullName}</h4>
                              <p className="text-[14px] text-[#1e88e5] leading-snug">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3">
                {isUsersLoading ? (
                  <ContactListSkeleton count={6} />
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center text-sm text-base-content/60 py-10">No contacts found</div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const grouped = {};
                      [...filteredContacts]
                        .sort((a, b) => a.fullName.localeCompare(b.fullName))
                        .forEach(user => {
                          const letter = user.fullName.charAt(0).toUpperCase();
                          if (!grouped[letter]) grouped[letter] = [];
                          grouped[letter].push(user);
                        });
                      
                      return Object.keys(grouped).sort().map(letter => (
                        <div key={letter} className="mb-2">
                          <h4 className="text-[14px] font-bold text-base-content mb-3 px-1">{letter}</h4>
                          <div className="space-y-1">
                            {grouped[letter].map(user => {
                              const isOnline = onlineUsers.includes(user._id);
                              return (
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
                          className="p-2 -mx-2 flex items-center justify-between rounded-xl hover:bg-base-200 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {user.profilePic ? (
                                <img
                                  src={user.profilePic}
                                  alt={user.fullName}
                                  className="w-[46px] h-[46px] object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-[46px] h-[46px] rounded-full bg-[#f4a034] text-white flex items-center justify-center font-medium text-[18px]">
                                  {getInitials(user.fullName)}
                                </div>
                              )}
                            </div>
                            <div className="text-left flex flex-col justify-center">
                              <h4 className="font-semibold text-[15px] text-base-content leading-snug mb-[1px]">{user.fullName}</h4>
                              <p className={`text-[13px] leading-snug ${isOnline ? "text-[#1e88e5]" : "text-base-content/50"}`}>
                                {isOnline ? "online" : "last seen recently"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
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
            authUser={authUser}
            onClose={() => setViewingStory(null)}
            initialIndex={viewingStory.initialIndex || 0}
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
      {/* Create Group Modal */}
      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="absolute inset-0 bg-base-100 z-50 flex flex-col animate-slide-up">
          <header className="p-4 border-b border-base-300 flex items-center gap-4 bg-base-100">
            <button 
              type="button"
              onClick={() => { 
                setShowCreateGroupModal(false); 
                setNewGroupName(""); 
                setNewGroupDesc(""); 
                setGroupAvatarPreview(null); 
                setSelectedFriendIds([]); 
                setFriendSearchQuery("");
              }}
              className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
            >
              <ArrowLeft size={21} />
            </button>
            <div className="text-left">
              <h2 className="text-lg font-bold text-base-content">Create New Group</h2>
              <p className="text-xs text-base-content/50 mt-0.5">Bring your team together in one thread</p>
            </div>
          </header>

          <form onSubmit={handleCreateGroupSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {/* Group Avatar Upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                {groupAvatarPreview ? (
                  <img 
                    src={groupAvatarPreview} 
                    alt="Group Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-base-200 border-2 border-dashed border-base-300 flex flex-col items-center justify-center text-base-content/40 hover:border-primary hover:text-primary transition-colors">
                    <Camera size={22} className="text-base-content/55" />
                    <span className="text-[10px] mt-1 font-semibold">Add Image</span>
                  </div>
                )}
                {groupAvatarPreview && (
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-semibold">
                    Change
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={groupAvatarInputRef} 
                onChange={handleGroupAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase px-1">Group Name</label>
              <input 
                type="text" 
                placeholder="e.g. Project Apollo" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={50}
                required
                disabled={isCreatingGroup}
                className="w-full px-4 py-3 rounded-2xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase px-1">Description (Optional)</label>
              <textarea 
                placeholder="Brief overview of what this group is about..."
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                maxLength={200}
                disabled={isCreatingGroup}
                rows={2}
                className="w-full px-4 py-3 rounded-2xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
              />
            </div>

            {/* Select Members Checklist */}
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase">Add Members ({selectedFriendIds.length})</label>
                {selectedFriendIds.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setSelectedFriendIds([])} 
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Friend Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-base-content/40" />
                <input 
                  type="text"
                  placeholder="Search friends to add..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-base-200 border border-base-300 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              {/* Scrollable Friends list */}
              <div className="max-h-48 overflow-y-auto custom-scrollbar border border-base-300 rounded-2xl bg-base-150 p-2 space-y-1">
                {filteredFriendsForGroup.length === 0 ? (
                  <div className="text-center py-6 text-xs text-base-content/40">
                    No friends found.
                  </div>
                ) : (
                  filteredFriendsForGroup.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend._id);
                    return (
                      <div 
                        key={friend._id}
                        onClick={() => toggleFriendSelection(friend._id)}
                        className={`p-2 flex items-center justify-between rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-base-200 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {friend.profilePic ? (
                            <img 
                              src={friend.profilePic} 
                              alt={friend.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-base-300"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {friend.fullName.charAt(0)}
                            </div>
                          )}
                          <div className="text-left min-w-0">
                            <p className="text-xs font-semibold text-base-content truncate">{friend.fullName}</p>
                            <p className="text-[10px] text-base-content/50 truncate">@{friend.username || "user"}</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}} // toggled via parent div click
                          className="checkbox checkbox-xs checkbox-primary rounded-md pointer-events-none"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { 
                  setShowCreateGroupModal(false); 
                  setNewGroupName(""); 
                  setNewGroupDesc(""); 
                  setGroupAvatarPreview(null); 
                  setSelectedFriendIds([]); 
                  setFriendSearchQuery("");
                }}
                disabled={isCreatingGroup}
                className="px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-base-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingGroup || !newGroupName.trim()}
                className="px-6 py-2.5 rounded-full text-sm font-semibold btn-primary flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Group</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Join Group Modal */}
      {showJoinGroupModal && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setShowJoinGroupModal(false); setInviteCodeInput(""); }}
        >
          <div 
            className="bg-base-100 border border-base-300 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-5 border-b border-base-200 flex justify-between items-center bg-base-150">
              <div className="text-left">
                <h3 className="text-lg font-extrabold text-base-content tracking-tight">Join Private Group</h3>
                <p className="text-xs text-base-content/50 mt-0.5">Enter an invite code or link to join</p>
              </div>
              <button 
                onClick={() => { 
                  setShowJoinGroupModal(false); 
                  setInviteCodeInput("");
                }}
                className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleJoinGroupByInviteSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase px-1">Invite Code or Link</label>
                <input 
                  type="text" 
                  placeholder="e.g. A1B2C3D4 or url" 
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { 
                    setShowJoinGroupModal(false); 
                    setInviteCodeInput("");
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-base-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteCodeInput.trim()}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold btn-primary flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <span>Join Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONTACT SYNC SYSTEM ==================== */}
      {showSyncModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => { setShowSyncModal(false); setSyncStep("ask"); }}
        >
          <div 
            className="bg-base-100 border border-base-200/80 dark:border-base-850 w-full max-w-lg rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <header className="px-6 py-5 border-b border-base-200/60 dark:border-base-800 flex justify-between items-center bg-base-50/50 dark:bg-base-950/20">
              <div>
                <h3 className="text-lg font-extrabold text-base-content tracking-tight">Sync Contacts</h3>
                <p className="text-xs text-base-content/50 mt-0.5">Find your friends on ChatZone</p>
              </div>
              <button 
                onClick={() => { 
                  setShowSyncModal(false); 
                  setSyncStep("ask");
                }}
                className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            {/* Modal Body */}
            <div className="p-6">
              
              {/* Step 1: Ask */}
              {syncStep === "ask" && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
                    <UserPlus size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-base-content">Discover Registered Contacts</h4>
                    <p className="text-xs text-base-content/60 max-w-sm mx-auto leading-relaxed">
                      By allowing ChatZone to sync your contacts, we will match emails and phone numbers to add friends automatically.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      onClick={() => setShowSyncModal(false)}
                      className="btn btn-ghost rounded-full px-6 text-xs font-semibold"
                    >
                      Maybe Later
                    </button>
                    <button
                      onClick={handleNativeContactSync}
                      className="btn btn-primary rounded-full px-8 text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      Sync Contacts
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Syncing Loader */}
              {syncStep === "syncing" && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-base-content">Matching Contacts...</h4>
                    <p className="text-xs text-base-content/50">Checking registers on ChatZone securely</p>
                  </div>
                </div>
              )}

              {/* Step 3: Fallback Options */}
              {syncStep === "fallback" && (
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-base-content">Import Contacts</h4>
                    <p className="text-xs text-base-content/50">Native contact sync is not supported on this device. Choose a fallback method:</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option A: VCF Upload */}
                    <div className="p-5 bg-base-200/50 hover:bg-base-200 border border-base-300/40 rounded-2xl text-center space-y-3 transition-colors cursor-pointer" onClick={() => vcfInputRef.current?.click()}>
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                        <Layers size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-base-content">Upload VCF File</h5>
                        <p className="text-[10px] text-base-content/50 mt-1 leading-normal">Export from Google/Apple Contacts & upload here</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".vcf" 
                        ref={vcfInputRef} 
                        onChange={handleVCFUpload} 
                        className="hidden" 
                      />
                      <button className="btn btn-xs btn-outline btn-neutral rounded-lg text-[9px] pointer-events-none">Choose File</button>
                    </div>

                    {/* Option B: Manual List */}
                    <div className="p-5 bg-base-200/50 hover:bg-base-200 border border-base-300/40 rounded-2xl text-center space-y-3 transition-colors cursor-pointer" onClick={() => setSyncStep("manual_input")}>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                        <Mail size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-base-content">Paste Emails</h5>
                        <p className="text-[10px] text-base-content/50 mt-1 leading-normal">Manually enter a list of emails / phone numbers</p>
                      </div>
                      <button className="btn btn-xs btn-outline btn-neutral rounded-lg text-[9px] pointer-events-none">Enter List</button>
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button onClick={() => setSyncStep("ask")} className="text-xs text-base-content/65 hover:underline font-semibold flex items-center gap-1">
                      <ArrowLeft size={14} /> Back to permissions
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3.5: Manual Input Field */}
              {syncStep === "manual_input" && (
                <form onSubmit={handleManualEmailSync} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-base-content/70 tracking-wide uppercase px-1">Emails / Phone Numbers</label>
                    <textarea 
                      placeholder="Paste values here (e.g. friend1@gmail.com, +15550192834)" 
                      value={manualEmails}
                      onChange={(e) => setManualEmails(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl bg-base-200 border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs font-semibold"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={() => setSyncStep("fallback")} className="text-xs text-base-content/65 hover:underline font-semibold flex items-center gap-1">
                      <ArrowLeft size={14} /> Back
                    </button>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowSyncModal(false); setSyncStep("ask"); }} className="btn btn-sm btn-ghost rounded-full px-4 text-xs font-bold">Cancel</button>
                      <button type="submit" className="btn btn-sm btn-primary rounded-full px-6 text-xs font-bold">Sync</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 4: Matched Users List */}
              {syncStep === "matched" && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-base-content">
                      {matchedContacts.length > 0 
                        ? `Found ${matchedContacts.length} matched users!` 
                        : "No contacts found yet"}
                    </h4>
                    <p className="text-xs text-base-content/50">
                      {matchedContacts.length > 0 
                        ? "These users are registered on ChatZone and have been added to your friends list." 
                        : "None of your synced contacts are currently registered on ChatZone."}
                    </p>
                  </div>

                  {matchedContacts.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto custom-scrollbar border border-base-200 dark:border-base-800 rounded-2xl p-2 space-y-1 bg-base-200/20">
                      {matchedContacts.map((contact) => (
                        <div key={contact._id} className="p-2.5 flex items-center gap-3 hover:bg-base-200/50 rounded-xl transition-colors">
                          {contact.profilePic ? (
                            <img src={contact.profilePic} className="w-9 h-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {getInitials(contact.fullName)}
                            </div>
                          )}
                          <div className="text-left flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-base-content truncate">{contact.fullName}</h5>
                            <p className="text-[10px] text-base-content/50 truncate">@{contact.username}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold">Added</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-base-200/30 rounded-2xl border border-dashed border-base-300 text-center space-y-3">
                      <p className="text-xs text-base-content/60 font-medium">Invite your contacts by sharing the ChatZone web link!</p>
                      <button onClick={handleInviteFriends} className="btn btn-xs btn-primary rounded-xl px-4 font-bold shadow-sm">Copy Invitation Link</button>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setShowSyncModal(false);
                        setSyncStep("ask");
                      }}
                      className="btn btn-sm btn-primary rounded-full px-8 text-xs font-bold shadow-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal 
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        initialMode={cameraInitialMode}
        authUser={authUser}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        users={users}
        groups={groups}
        postStory={postStory}
        sendMessage={sendMessage}
        sendGroupMessage={sendGroupMessage}
        setShowStoryCreator={setShowStoryCreator}
        setActiveTab={setActiveTab}
      />

      {/* Profile Details Modal */}
      <ProfileModal 
        profile={profileModalData} 
        onClose={() => setProfileModalData(null)} 
      />

      {/* My Statuses History Overlay Modal */}
      {showMyUpdatesHistory && (
        <div className="absolute inset-0 bg-base-100 z-50 flex flex-col animate-slide-up">
          <header className="p-4 border-b border-base-300 flex items-center gap-4 bg-base-100">
            <button 
              onClick={() => setShowMyUpdatesHistory(false)}
              className="p-1.5 rounded-full hover:bg-base-200 text-base-content/80 transition-colors animate-fade-in"
            >
              <ArrowLeft size={21} />
            </button>
            <div className="text-left">
              <h2 className="text-lg font-bold">My status</h2>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-24 relative">
            {!myGroupedStories || myGroupedStories.stories.length === 0 ? (
              <div className="text-center py-20 px-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/40">
                  <Image size={28} />
                </div>
                <h3 className="font-semibold text-base-content text-sm">No updates posted</h3>
                <p className="text-xs text-base-content/50 max-w-[200px] mx-auto">Statuses you share will appear here for 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Your Updates</span>
                  <span className="text-xs font-semibold text-base-content/50">
                    {myGroupedStories.stories.length} updates
                  </span>
                </div>

                <div className="space-y-3">
                  {myGroupedStories.stories.map((story, index) => (
                    <div 
                      key={story._id}
                      onClick={() => setViewingStory({ 
                        name: authUser.fullName, 
                        user: authUser,
                        stories: myGroupedStories.stories,
                        initialIndex: index
                      })}
                      className="p-3.5 bg-base-200/40 rounded-2xl flex items-center justify-between border border-base-300/30 hover:bg-base-200/60 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Story Content Thumbnail */}
                        <div className="flex-shrink-0">
                          {story.type === "image" ? (
                            <img 
                              src={story.content} 
                              alt="story" 
                              className="w-12 h-12 rounded-full object-cover border border-base-300 shadow-sm"
                            />
                          ) : story.type === "video" ? (
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-base-300 shadow-sm bg-neutral-800">
                               <img 
                                  src={story.content.replace(/\.[^/.]+$/, ".jpg")} 
                                  alt="video thumb" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=100&auto=format&fit=crop"; // fallback
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Video size={14} className="text-white fill-white/20" />
                                </div>
                            </div>
                          ) : (
                            <div className={`w-12 h-12 rounded-full ${story.bgColor || "bg-primary"} border border-base-300 shadow-sm flex items-center justify-center p-1.5 overflow-hidden`}>
                              <span className="text-[8px] text-white font-black leading-[1.1] text-center line-clamp-3 uppercase tracking-tighter">
                                {story.content}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-bold text-base-content">
                            {story.views?.length || 0} {story.views?.length === 1 ? 'view' : 'views'}
                          </p>
                          <p className="text-xs text-base-content/55 mt-0.5">
                            {formatStoryTime(story.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveStoryMenuId(activeStoryMenuId === story._id ? null : story._id); 
                          }}
                          className="p-2 rounded-full hover:bg-base-300 text-base-content/75 hover:text-base-content transition-all"
                          title="Options"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {/* Story delete popover menu */}
                        {activeStoryMenuId === story._id && (
                          <>
                            <div 
                              className="fixed inset-0 z-45" 
                              onClick={(e) => { e.stopPropagation(); setActiveStoryMenuId(null); }}
                            />
                            <div className="absolute right-0 mt-1 w-32 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 py-1 text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStoryMenuId(null);
                                  setStoryToDelete(story);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 text-xs font-bold transition-colors text-left"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encryption Disclaimer */}
            <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center max-w-[280px] mx-auto text-[11px] leading-tight text-base-content/40 font-medium select-none">
              <div className="flex items-center gap-1.5">
                <Lock size={12} className="shrink-0 text-base-content/30" />
                <span>
                  Your status updates are <span className="text-emerald-600/80 dark:text-emerald-400/80 font-bold">end-to-end encrypted</span>.
                </span>
              </div>
              <span className="block px-4">They will disappear after 24 hours.</span>
            </div>
          </div>

          {/* Floating Action Buttons for Status overlay */}
          <div className="absolute bottom-6 right-6 flex flex-col items-center gap-3.5 z-20">
            {/* Pencil FAB */}
            <button 
              onClick={() => {
                setCameraInitialMode("text");
                setShowCameraModal(true);
              }}
              className="w-11 h-11 rounded-full bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-neutral-100 dark:border-zinc-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Add text status"
            >
              <Pencil size={18} className="stroke-[2.5]" />
            </button>

            {/* Camera FAB */}
            <button 
              onClick={() => {
                setCameraInitialMode("camera");
                setShowCameraModal(true);
              }}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Add photo status"
            >
              <Camera size={22} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Modal (WhatsApp Style) */}
      {storyToDelete && (
        <div 
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-6 animate-in fade-in duration-200"
          onClick={() => setStoryToDelete(null)}
        >
          <div 
            className="bg-white rounded-[28px] w-full max-w-[320px] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[#3b4a54] text-[17px] font-medium mb-8">Delete 1 status update?</p>
            <div className="flex justify-end gap-8">
              <button 
                type="button"
                onClick={() => setStoryToDelete(null)}
                className="text-[#008069] font-bold text-[15px] hover:opacity-80 transition-opacity uppercase tracking-wide cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const id = storyToDelete._id;
                  setStoryToDelete(null);
                  await deleteStory(id);
                }}
                className="text-[#008069] font-bold text-[15px] hover:opacity-80 transition-opacity uppercase tracking-wide cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
