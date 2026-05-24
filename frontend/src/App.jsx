import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useChatstore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { Loader, Video, Phone, X, Loader2 } from "lucide-react"
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import CallModal from "./components/CallModal";
import AppLockScreen from "./components/AppLockScreen";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { AnimatePresence, motion } from "framer-motion";

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ x: "100%", opacity: 0, scale: 0.96, zIndex: 50 }}
    animate={{ x: 0, opacity: 1, scale: 1, zIndex: 100, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
    exit={{ x: "-25%", opacity: 0, scale: 0.94, zIndex: 10 }}
    transition={{ duration: 0.56, ease: [0.25, 1, 0.5, 1] }}
    style={{ willChange: "transform, opacity" }}
    className="h-full w-full flex flex-col absolute inset-0 bg-base-100"
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
const AddPhoneNumberPage = React.lazy(() => import("./pages/AddPhoneNumberPage"));
const AppearancePage = React.lazy(() => import("./pages/AppearancePage"));
const ChatColorWallpaperPage = React.lazy(() => import("./pages/ChatColorWallpaperPage"));
const SetWallpaperPage = React.lazy(() => import("./pages/SetWallpaperPage"));
const ChatColorPage = React.lazy(() => import("./pages/ChatColorPage"));
const AppIconPage = React.lazy(() => import("./pages/AppIconPage"));
const StoriesPage = React.lazy(() => import("./pages/StoriesPage"));
const MyStoryPage = React.lazy(() => import("./pages/MyStoryPage"));
const StoryConnectionsPage = React.lazy(() => import("./pages/StoryConnectionsPage"));
const StoryUserSelectionPage = React.lazy(() => import("./pages/StoryUserSelectionPage"));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const BackupsPage = React.lazy(() => import("./pages/BackupsPage"));
const ChatsPage = React.lazy(() => import("./pages/ChatsPage"));
const ChatsSettingsPage = React.lazy(() => import("./pages/ChatsSettingsPage"));
const StorySettingsPage = React.lazy(() => import("./pages/StorySettingsPage"));
const DataStoragePage = React.lazy(() => import("./pages/DataStoragePage"));
const StoragePage = React.lazy(() => import("./pages/StoragePage"));
const ReviewStoragePage = React.lazy(() => import("./pages/ReviewStoragePage"));
const InviteFriendsPage = React.lazy(() => import("./pages/InviteFriendsPage"));
const HelpPage = React.lazy(() => import("./pages/HelpPage"));
const ContactUsPage = React.lazy(() => import("./pages/ContactUsPage"));
const TermsPrivacyPage = React.lazy(() => import("./pages/TermsPrivacyPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const LinkedDevicesPage = React.lazy(() => import("./pages/LinkedDevicesPage"));
// import axios from "axios";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers, isAppLocked, initAppLockListener } = useAuthStore();
  const { theme, chatColor, chatWallpaper, setChatColor, setChatWallpaper } = useThemeStore();
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
          const { selectedGroup } = useGroupStore.getState();
          
          if (selectedUser) {
            useChatstore.getState().setSelectedUser(null);
          } else if (selectedGroup) {
            useGroupStore.getState().setSelectedGroup(null);
          } else if (activeTab !== "chats") {
            useChatstore.getState().setActiveTab("chats");
          } else {
            // Only exit if NO active call
            if (!isInCall) {
              if (!window.exitAppPrompted) {
                window.exitAppPrompted = true;
                import("react-hot-toast").then(({ default: toast }) => {
                  toast("Press back again to exit", { id: 'exit-toast', duration: 2000 });
                });
                setTimeout(() => window.exitAppPrompted = false, 2000);
              } else {
                CapApp.exitApp();
              }
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

  // Handle PWA / Mobile Web hardware back button navigation
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Native handled above

    // Initialize history stack trick to trap the back button
    if (!window.hasSetupPwaNavigation) {
      window.hasSetupPwaNavigation = true;
      const currentState = window.history.state || {};
      window.history.replaceState({ ...currentState, appState: 'root' }, '');
      window.history.pushState({ appState: 'forward' }, '');
    }

    const handlePopState = (e) => {
      if (e.state && e.state.appState === 'root') {
        const { isInCall, isMinimized } = useCallStore.getState();
        const { selectedUser, activeTab } = useChatstore.getState();
        const { selectedGroup } = useGroupStore.getState();

        let handled = false;

        if (isInCall && !isMinimized) {
          useCallStore.getState().setIsMinimized(true);
          handled = true;
        } else if (selectedUser) {
          useChatstore.getState().setSelectedUser(null);
          handled = true;
        } else if (selectedGroup) {
          useGroupStore.getState().setSelectedGroup(null);
          handled = true;
        } else if (activeTab !== "chats") {
          useChatstore.getState().setActiveTab("chats");
          handled = true;
        }

        if (handled) {
          window.history.pushState({ appState: 'forward' }, '');
        } else {
          if (window.location.pathname === '/') {
            if (!window.exitAppPrompted) {
              window.exitAppPrompted = true;
              import("react-hot-toast").then(({ default: toast }) => {
                toast("Press back again to exit", { id: 'exit-toast', duration: 2000 });
              });
              
              window.history.pushState({ appState: 'forward' }, '');
              
              setTimeout(() => {
                window.exitAppPrompted = false;
              }, 2000);
            } else {
              window.history.back(); // Proceed to exit
            }
          } else {
            window.history.pushState({ appState: 'forward' }, '');
            navigate('/', { replace: true });
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sync user's stored wallpaper & color down to the client theme store
  useEffect(() => {
    if (authUser) {
      if (authUser.chatColor && authUser.chatColor !== chatColor) {
        setChatColor(authUser.chatColor);
      }
      if (authUser.chatWallpaper && authUser.chatWallpaper !== chatWallpaper) {
        setChatWallpaper(authUser.chatWallpaper);
      }
    }
  }, [authUser, setChatColor, setChatWallpaper]);

  // Lock logic
  useEffect(()=>{
    initAppLockListener();
  },[checkAuth, initAppLockListener]);

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
    handleGroupCallUserLeft,
    handleGroupCallNewProducer,
    handleGroupCallIncomingInvite,
    handleGroupCallActiveState,
  } = useCallStore();

  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call:screen-share-started", handleScreenShareStarted);
    socket.on("call:screen-share-stopped", handleScreenShareStopped);
    socket.on("call:active-sync", handleActiveSync);

    socket.on("participant-joined", handleGroupCallUserJoined);
    socket.on("new-producer", handleGroupCallNewProducer);
    
    
    socket.on("participant-left", handleGroupCallUserLeft);
    socket.on("group-call:incoming-invite", handleGroupCallIncomingInvite);
    socket.on("group-call:active-state", handleGroupCallActiveState);

    // Connect ONLY after all listeners are attached to prevent race conditions
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("call-rejected");
      socket.off("call-ended");
      socket.off("ice-candidate");
      socket.off("call:screen-share-started");
      socket.off("call:screen-share-stopped");
      socket.off("call:active-sync");

      socket.off("participant-joined");
      socket.off("new-producer");
      
      
      socket.off("participant-left");
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
      window.history.replaceState({}, document.title, "/");
      const performJoin = async () => {
        const success = await useGroupStore.getState().joinGroupByInviteCode(code);
        if (success) {
          useChatstore.getState().setActiveTab("groups");
        }
      };
      performJoin();
    }

    // Handle incoming chat notifications
    const chatId = params.get("chatId");
    if (chatId && authUser) {
      window.history.replaceState({}, document.title, "/");
      useChatstore.getState().setActiveTab("chats");
      // Find the user in our global lists or just set the ID and let the store fetch
      useChatstore.getState().setSelectedUserId(chatId);
    }

    // Handle incoming group notifications
    const groupId = params.get("groupId");
    if (groupId && authUser) {
      window.history.replaceState({}, document.title, "/");
      useChatstore.getState().setActiveTab("groups");
      // Try to find the group in loaded groups, or just set a minimal object
      const groups = useGroupStore.getState().groups;
      const foundGroup = groups.find(g => g._id === groupId);
      useGroupStore.getState().setSelectedGroup(foundGroup || { _id: groupId });
    }
  }, [location, authUser, navigate]);

  console.log({authUser});

  if(isCheckingAuth && !authUser)return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin"/>
    </div>
  );

  return (
    <div data-theme={theme} className="h-screen flex flex-col">
      {isAppLocked && <AppLockScreen />}
      
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <React.Suspense fallback={null}>
          <AnimatePresence>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper>{authUser ? <HomePage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/join-group" element={<PageWrapper>{authUser ? <HomePage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/signup" element={<PageWrapper>{!authUser ? <SignUpPage />:<Navigate to="/" />}</PageWrapper>} />
              <Route path="/create-pin" element={<PageWrapper>{authUser ? <CreatePinPage />:<Navigate to="/login" />}</PageWrapper>} />
              <Route path="/login" element={<PageWrapper>{!authUser ? <LoginPage />:<Navigate to="/" />}</PageWrapper>} />
              <Route path="/settings" element={<PageWrapper>{authUser ? <SettingsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/account" element={<PageWrapper>{authUser ? <AccountPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/account/change-pin" element={<PageWrapper>{authUser ? <ChangePinPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/account/add-number" element={<PageWrapper>{authUser ? <AddPhoneNumberPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/chats" element={<PageWrapper>{authUser ? <ChatsSettingsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance" element={<PageWrapper>{authUser ? <AppearancePage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/chat-color" element={<PageWrapper>{authUser ? <ChatColorWallpaperPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/wallpaper" element={<PageWrapper>{authUser ? <SetWallpaperPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/chat-color/picker" element={<PageWrapper>{authUser ? <ChatColorPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/appearance/app-icon" element={<PageWrapper>{authUser ? <AppIconPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/devices" element={<PageWrapper>{authUser ? <LinkedDevicesPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/chats" element={<PageWrapper>{authUser ? <ChatsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories" element={<PageWrapper>{authUser ? <StoriesPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/my-story" element={<PageWrapper>{authUser ? <MyStoryPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/connections" element={<PageWrapper>{authUser ? <StoryConnectionsPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/privacy-except" element={<PageWrapper>{authUser ? <StoryUserSelectionPage /> : <Navigate to="/login" />}</PageWrapper>} />
              <Route path="/settings/stories/privacy-only" element={<PageWrapper>{authUser ? <StoryUserSelectionPage /> : <Navigate to="/login" />}</PageWrapper>} />
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
              <Route path="/profile/about" element={<PageWrapper>{authUser ? <AboutPage />:<Navigate to="/login" />}</PageWrapper>} />
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
                  {groupCallType === "video" ? <Video className="text-blue-500 fill-blue-500/10" size={20} /> : <Phone className="text-emerald-500 fill-emerald-500/10" size={20} />}
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
                          ? "bg-blue-500/10 border-blue-500/30"
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
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm border border-blue-100 dark:border-blue-900/20 shadow-sm">
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
                          ? "bg-blue-600 border-blue-600 text-white"
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
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
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
