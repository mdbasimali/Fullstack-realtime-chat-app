import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useChatstore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { Loader, Video, Phone, X, Loader2 } from "lucide-react"
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import CallModal from "./components/CallModal";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { AnimatePresence, motion } from "framer-motion";

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.1, ease: "easeOut" }}
    className="h-full w-full flex flex-col"
  >
    {children}
  </motion.div>
);

// Lazy load pages for faster initial load
const HomePage = React.lazy(() => import("./pages/HomePage"));
const SignUpPage = React.lazy(() => import("./pages/SignUpPage"));
const CreatePinPage = React.lazy(() => import("./pages/CreatePinPage"));
const ChangePinPage = React.lazy(() => import("./pages/ChangePinPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const AccountPage = React.lazy(() => import("./pages/AccountPage"));
const AppearancePage = React.lazy(() => import("./pages/AppearancePage"));
const ChatColorWallpaperPage = React.lazy(() => import("./pages/ChatColorWallpaperPage"));
const AppIconPage = React.lazy(() => import("./pages/AppIconPage"));
const StoriesPage = React.lazy(() => import("./pages/StoriesPage"));
const MyStoryPage = React.lazy(() => import("./pages/MyStoryPage"));
const StoryConnectionsPage = React.lazy(() => import("./pages/StoryConnectionsPage"));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const BackupsPage = React.lazy(() => import("./pages/BackupsPage"));
const ChatsPage = React.lazy(() => import("./pages/ChatsPage"));
const ChatsSettingsPage = React.lazy(() => import("./pages/ChatsSettingsPage"));
const DataStoragePage = React.lazy(() => import("./pages/DataStoragePage"));
const StoragePage = React.lazy(() => import("./pages/StoragePage"));
const ReviewStoragePage = React.lazy(() => import("./pages/ReviewStoragePage"));
const InviteFriendsPage = React.lazy(() => import("./pages/InviteFriendsPage"));
const HelpPage = React.lazy(() => import("./pages/HelpPage"));
const ContactUsPage = React.lazy(() => import("./pages/ContactUsPage"));
const TermsPrivacyPage = React.lazy(() => import("./pages/TermsPrivacyPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const LinkedDevicesPage = React.lazy(() => import("./pages/LinkedDevicesPage"));
// import axios from "axios";

const App = () => {
  const {authUser,checkAuth,isCheckingAuth,onlineUsers}=useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedUser, setSelectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatstore();
  const { 
    showGroupCallModal, 
    setShowGroupCallModal, 
    groupCallType, 
    selectedGroupDetails, 
    isFetchingGroupDetails 
  } = useGroupStore();
  const { initiateCall } = useCallStore();
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());

  useEffect(() => {
    if (!showGroupCallModal) {
      setSelectedMemberIds(new Set());
    }
  }, [showGroupCallModal]);

  const toggleMemberSelection = (id) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Extract Google redirect token synchronously on initial load to avoid race conditions
  const queryParams = new URLSearchParams(window.location.search);
  const redirectToken = queryParams.get("token");
  if (redirectToken) {
    localStorage.setItem("token", redirectToken);
  }

  console.log({onlineUsers});

  // Handle native Android hardware back button & system navigation gesture swipes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupBackButton = async () => {
      const backListener = await CapApp.addListener("backButton", (data) => {
        const { isInCall, isMinimized, setIsMinimized } = useCallStore.getState();

        // If in an active call, always prioritize minimizing it
        if (isInCall && !isMinimized) {
          setIsMinimized(true);
          return;
        }

        const currentPath = window.location.pathname;
        if (currentPath === "/") {
          const { selectedUser, activeTab } = useChatstore.getState();
          
          if (selectedUser) {
            useChatstore.getState().setSelectedUser(null);
          } else if (activeTab !== "chats") {
            useChatstore.getState().setActiveTab("chats");
          } else {
            // Only exit if NO active call
            if (!isInCall) {
              CapApp.exitApp();
            }
          }
        } else if (currentPath === "/settings" || currentPath === "/profile") {
          navigate("/");
        } else {
          if (data.canGoBack) {
            window.history.back();
          } else if (!isInCall) {
            CapApp.exitApp();
          }
        }
      });
      return backListener;
    };

    const listenerPromise = setupBackButton();

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);

  useEffect(()=>{
    checkAuth();
  },[checkAuth]);

  const { socket } = useAuthStore();
  const { 
    handleIncomingCall, 
    handleCallAccepted, 
    handleCallRejected, 
    handleCallEnded, 
    handleIceCandidate,
    handleScreenShareStarted,
    handleScreenShareStopped,
    handleActiveSync,
    handleGroupCallUserJoined,
    handleGroupCallOffer,
    handleGroupCallAnswer,
    handleGroupCallIceCandidate,
    handleGroupCallUserLeft,
    handleGroupCallIncomingInvite,
    handleGroupCallActiveState,
  } = useCallStore();

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("ice:candidate", handleIceCandidate);
    socket.on("call:screen-share-started", handleScreenShareStarted);
    socket.on("call:screen-share-stopped", handleScreenShareStopped);
    socket.on("call:active-sync", handleActiveSync);

    socket.on("group-call:user-joined", handleGroupCallUserJoined);
    socket.on("group-call:offer", handleGroupCallOffer);
    socket.on("group-call:answer", handleGroupCallAnswer);
    socket.on("group-call:ice-candidate", handleGroupCallIceCandidate);
    socket.on("group-call:user-left", handleGroupCallUserLeft);
    socket.on("group-call:incoming-invite", handleGroupCallIncomingInvite);
    socket.on("group-call:active-state", handleGroupCallActiveState);

    // Connect ONLY after all listeners are attached to prevent race conditions
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("ice:candidate");
      socket.off("call:screen-share-started");
      socket.off("call:screen-share-stopped");
      socket.off("call:active-sync");

      socket.off("group-call:user-joined");
      socket.off("group-call:offer");
      socket.off("group-call:answer");
      socket.off("group-call:ice-candidate");
      socket.off("group-call:user-left");
      socket.off("group-call:incoming-invite");
      socket.off("group-call:active-state");
    };
  }, [
    socket, 
    handleIncomingCall, 
    handleCallAccepted, 
    handleCallRejected, 
    handleCallEnded, 
    handleIceCandidate, 
    handleScreenShareStarted, 
    handleScreenShareStopped, 
    handleActiveSync,
    handleGroupCallUserJoined,
    handleGroupCallOffer,
    handleGroupCallAnswer,
    handleGroupCallIceCandidate,
    handleGroupCallUserLeft,
    handleGroupCallIncomingInvite,
    handleGroupCallActiveState,
  ]);

  // Subscribe to global group events
  useEffect(() => {
    if (!socket) return;

    const handleGroupCreated = (newGroup) => {
      const { groups } = useGroupStore.getState();
      if (!groups.some(g => g._id === newGroup._id)) {
        useGroupStore.setState({ groups: [newGroup, ...groups] });
      }
      
      // Auto-subscribe the socket to the new group's room
      socket.emit("group:join-room", newGroup._id);
    };

    socket.on("groupCreated", handleGroupCreated);

    return () => {
      socket.off("groupCreated", handleGroupCreated);
    };
  }, [socket]);

  // Subscribe to message events globally
  useEffect(() => {
    if (socket) {
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  // Warn user before refresh during a call
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const { isInCall } = useCallStore.getState();
      if (isInCall) {
        e.preventDefault();
        e.returnValue = "You are in an active call. Refreshing will disconnect you.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("call") === "true") {
      // The socket connection will automatically trigger the 'call:incoming' 
      // event via the backend's new pendingCalls re-sync logic.
      
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }

    if (params.get("trigger_sync") === "true") {
      localStorage.setItem("trigger_contact_sync", "true");
      import("react-hot-toast").then(({ default: toast }) => {
        toast.success("Welcome to ChatZone!");
      });
      if (params.get("isNewUser") === "true") {
        navigate("/create-pin");
      } else {
        window.history.replaceState({}, document.title, "/");
      }
    }

    const code = params.get("code");
    if (code && authUser) {
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
      
      const performJoin = async () => {
        const success = await useGroupStore.getState().joinGroupByInviteCode(code);
        if (success) {
          useChatstore.getState().setActiveTab("groups");
        }
      };
      performJoin();
    }
  }, [location, authUser]);

  console.log({authUser});

  if(isCheckingAuth && !authUser)return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin"/>
    </div>
  );

  const showNavbar = !["/", "/settings", "/settings/account", "/settings/account/change-pin", "/settings/chats", "/settings/appearance", "/settings/appearance/chat-color", "/settings/appearance/app-icon", "/settings/devices", "/settings/chats", "/settings/stories", "/settings/stories/my-story", "/settings/stories/connections", "/settings/notifications", "/settings/privacy", "/settings/backups", "/settings/data-storage", "/settings/data-storage/storage", "/settings/data-storage/storage/review", "/settings/invite", "/settings/help", "/settings/help/contact", "/settings/help/terms", "/profile", "/join-group", "/login", "/signup", "/create-pin"].includes(location.pathname);

  return (
    <div data-theme={theme} className="h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <div className="flex-1 flex flex-col min-h-0">
        <React.Suspense fallback={null}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper>{authUser ? <HomePage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/join-group" element={<PageWrapper>{authUser ? <HomePage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/signup" element={<PageWrapper>{!authUser ? <SignUpPage />:<Navigate to="/" />}</PageWrapper>} />
              <Route path="/create-pin" element={<PageWrapper>{authUser ? <CreatePinPage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/login" element={<PageWrapper>{!authUser ? <LoginPage />:<Navigate to="/" />}</PageWrapper>} />
              <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
              <Route path="/settings/account" element={<PageWrapper>{authUser ? <AccountPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/account/change-pin" element={<PageWrapper>{authUser ? <ChangePinPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/chats" element={<PageWrapper>{authUser ? <ChatsSettingsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance" element={<PageWrapper>{authUser ? <AppearancePage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/chat-color" element={<PageWrapper>{authUser ? <ChatColorWallpaperPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/app-icon" element={<PageWrapper>{authUser ? <AppIconPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/devices" element={<PageWrapper>{authUser ? <LinkedDevicesPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/chats" element={<PageWrapper>{authUser ? <ChatsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories" element={<PageWrapper>{authUser ? <StoriesPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/my-story" element={<PageWrapper>{authUser ? <MyStoryPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/connections" element={<PageWrapper>{authUser ? <StoryConnectionsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/notifications" element={<PageWrapper>{authUser ? <NotificationsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/privacy" element={<PageWrapper>{authUser ? <PrivacyPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/backups" element={<PageWrapper>{authUser ? <BackupsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/data-storage" element={<PageWrapper>{authUser ? <DataStoragePage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/data-storage/storage" element={<PageWrapper>{authUser ? <StoragePage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/data-storage/storage/review" element={<PageWrapper>{authUser ? <ReviewStoragePage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/invite" element={<PageWrapper>{authUser ? <InviteFriendsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/help" element={<PageWrapper>{authUser ? <HelpPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/help/contact" element={<PageWrapper>{authUser ? <ContactUsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/help/terms" element={<PageWrapper>{authUser ? <TermsPrivacyPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/profile" element={<PageWrapper>{authUser ? <ProfilePage />:<Navigate to="/login" />}</PageWrapper>} />
            </Routes>
          </AnimatePresence>
        </React.Suspense>
      </div>
      
      <CallModal />

      {/* Group Call Member Picker Modal */}
      {showGroupCallModal && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowGroupCallModal(false)}
        >
          <div 
            className="bg-base-100 border border-base-300 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-5 border-b border-base-200 flex justify-between items-center bg-base-150">
              <div className="text-left">
                <h3 className="text-base font-extrabold text-base-content tracking-tight flex items-center gap-2">
                  {groupCallType === "video" ? <Video className="text-indigo-500 fill-indigo-500/10" size={20} /> : <Phone className="text-emerald-500 fill-emerald-500/10" size={20} />}
                  <span>Group {groupCallType === "video" ? "Video" : "Voice"} Call</span>
                </h3>
                <p className="text-xs text-base-content/50 mt-0.5">Select a member to start a call</p>
              </div>
              <button 
                onClick={() => setShowGroupCallModal(false)}
                className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-4 max-h-[350px] overflow-y-auto space-y-2">
              {isFetchingGroupDetails ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="size-8 animate-spin text-primary opacity-60" />
                  <span className="text-xs text-base-content/50 font-medium">Fetching group members...</span>
                </div>
              ) : !selectedGroupDetails?.members || selectedGroupDetails.members.length <= 1 ? (
                <div className="text-center py-10 text-xs text-base-content/40 font-medium">
                  No other members in this group to call.
                </div>
              ) : (
                selectedGroupDetails.members
                  .filter((m) => m._id !== authUser?._id)
                  .map((member) => (
                    <div 
                      key={member._id}
                      onClick={() => toggleMemberSelection(member._id)}
                      className={`p-3 flex items-center justify-between rounded-2xl border transition-all duration-200 cursor-pointer ${
                        selectedMemberIds.has(member._id)
                          ? "bg-purple-500/10 border-purple-500/30"
                          : "bg-base-200/40 border-base-200/50 hover:bg-base-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.profilePic ? (
                          <img 
                            src={member.profilePic} 
                            alt={member.fullName} 
                            className="w-10 h-10 rounded-full object-cover border border-base-300"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-100 dark:border-indigo-900/20 shadow-sm">
                            {member.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        
                        <div className="text-left min-w-0">
                          <h4 className="font-bold text-xs text-base-content truncate">{member.fullName}</h4>
                          <p className="text-[10px] text-base-content/40 truncate">@{member.username || "username"}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        selectedMemberIds.has(member._id)
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-base-content/20"
                      }`}>
                        {selectedMemberIds.has(member._id) && (
                          <svg className="w-3.5 h-3.5 stroke-2 stroke-current fill-none" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {selectedMemberIds.size > 0 && (
              <div className="p-4 border-t border-base-200 bg-base-150 animate-in slide-in-from-bottom duration-200">
                <button
                  onClick={() => {
                    const idsArray = Array.from(selectedMemberIds);
                    setShowGroupCallModal(false);
                    
                    // Start calling
                    const { joinGroupCall } = useCallStore.getState();
                    joinGroupCall(selectedGroupDetails._id, groupCallType);

                    // Signal members
                    if (socket) {
                      socket.emit("group-call:invite", {
                        groupId: selectedGroupDetails._id,
                        invitedUserIds: idsArray,
                        callType: groupCallType
                      });
                    }
                  }}
                  className={`w-full py-3 px-4 rounded-[18px] text-xs font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    groupCallType === "video"
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  {groupCallType === "video" ? <Video size={16} /> : <Phone size={16} />}
                  <span>Start Group Call ({selectedMemberIds.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
