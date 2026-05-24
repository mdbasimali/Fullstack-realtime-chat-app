import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import { useGroupStore } from "./useGroupStore";

const idbStorage = {
  getItem: async (name) => {
    return (await get(name)) || null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime);
    osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.22);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.22);
  } catch (e) {
    console.error("Failed to play notification sound:", e);
  }
};

export const useChatstore = create(
  persist(
    (set, get) => ({
  messages: [],
  messageCache: {}, // { userId: [messages] }
  scrollCache: {}, // { chatId: scrollTop }
  setScrollCache: (chatId, pos) => set((state) => ({ scrollCache: { ...state.scrollCache, [chatId]: pos } })),
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  showContactDetailsSidebar: false,
  setShowContactDetailsSidebar: (val) => set({ showContactDetailsSidebar: val }),
  activeTab: "chats",
  setActiveTab: (activeTab) => {
    const authUser = useAuthStore.getState().authUser;
    if (authUser) {
      localStorage.setItem(`active_tab_${authUser._id}`, activeTab);
    }
    set({ activeTab });
  },

  isContactsModalOpen: false,
  setIsContactsModalOpen: (val) => set({ isContactsModalOpen: val }),
  
  isStoryViewerOpen: false,
  setIsStoryViewerOpen: (val) => set({ isStoryViewerOpen: val }),

  isSubViewOpen: false,
  setIsSubViewOpen: (val) => set({ isSubViewOpen: val }),

  sidebarSearchQuery: "",
  setSidebarSearchQuery: (val) => set({ sidebarSearchQuery: val }),

  isProfileModalOpen: false,
  setIsProfileModalOpen: (val) => set({ isProfileModalOpen: val }),

  activeConversations: [],
  setActiveConversations: (activeConversations) => set({ activeConversations }),
  initializeActiveConversations: (userId) => {
    if (!userId) return;
    const saved = localStorage.getItem(`active_conversations_${userId}`);
    set({ activeConversations: saved ? JSON.parse(saved) : [] });

    // Restore active tab
    const savedTab = localStorage.getItem(`active_tab_${userId}`);
    if (savedTab) {
      set({ activeTab: savedTab });
    }

    // Restore selected user if saved
    const savedSelectedId = localStorage.getItem(`selected_user_${userId}`);
    if (savedSelectedId) {
      // We will find and set the user in getUsers or a separate call
      get().setSelectedUserId(savedSelectedId);
    }
  },

  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),

  currentUserId: null,
  setCurrentUserId: (id) => {
    const { currentUserId, clearChatStore } = get();
    if (currentUserId && currentUserId !== id) {
      clearChatStore();
    }
    set({ currentUserId: id });
  },

  clearChatStore: () => {
    set({
      messages: [],
      messageCache: {},
      scrollCache: {},
      users: [],
      selectedUser: null,
      activeConversations: [],
      selectedUserId: null,
    });
  },

  globalUsers: [],
  isGlobalSearching: false,
  searchGlobalUsers: async (query) => {
    set({ isGlobalSearching: true });
    try {
      const res = await axiosInstance.get(`/messages/global-search?q=${query}`);
      set({ globalUsers: res.data });
    } catch (error) {
      console.error("Global search error:", error);
    } finally {
      set({ isGlobalSearching: false });
    }
  },
  clearGlobalSearch: () => set({ globalUsers: [] }),

  getUsers: async (silent = false) => {
    const isActuallySilent = silent || get().users.length > 0;
    if (!isActuallySilent) set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
      
      // Decrypt the last messages for the sidebar preview
      const { _decryptMessages } = get();
      const messagesToDecrypt = res.data.map(u => u.lastMessage).filter(m => m && m.isEncrypted && m.text);
      if (messagesToDecrypt.length > 0) {
        const decryptedMessages = await _decryptMessages(messagesToDecrypt);
        const decryptedMap = {};
        decryptedMessages.forEach(m => { decryptedMap[m._id] = m; });
        const newUsers = res.data.map(u => {
          if (u.lastMessage && decryptedMap[u.lastMessage._id]) {
            return { ...u, lastMessage: decryptedMap[u.lastMessage._id] };
          }
          return u;
        });
        set({ users: newUsers });
      }

      // Auto-populate activeConversations for users with lastMessage
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        const activeKey = `active_conversations_${authUser._id}`;
        const { activeConversations } = get();
        let updated = [...activeConversations];
        let changed = false;
        res.data.forEach(u => {
          if (u.lastMessage && !updated.includes(u._id)) {
            updated.push(u._id);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(activeKey, JSON.stringify(updated));
          set({ activeConversations: updated });
        }
      }
      
      // Auto-select user if we have a persisted ID
      const { selectedUserId, selectedUser, getMessages } = get();
      if (selectedUserId && !selectedUser) {
        const userToRestore = res.data.find(u => u._id === selectedUserId);
        if (userToRestore) {
          set({ selectedUser: userToRestore });
          getMessages(userToRestore._id);
        }
      }
    } catch (error) {
      console.error("GetUsers error:", error);
    } finally {
      if (!isActuallySilent) set({ isUsersLoading: false });
    }
  },
  
  addContact: async (contactInput) => {
    try {
      const res = await axiosInstance.post("/messages/add-contact", { contactInput });
      get().getUsers();
      return true;
    } catch (error) {
      console.error("AddContact error:", error);
      return false;
    }
  },

  syncContacts: async (contacts) => {
    try {
      const res = await axiosInstance.post("/messages/sync-contacts", { contacts });
      get().getUsers();
      return { success: true, matchedUsers: res.data.matchedUsers, matchedCount: res.data.matchedCount };
    } catch (error) {
      console.error("SyncContacts error:", error);
      return { success: false, error: error?.response?.data?.message || "Sync failed" };
    }
  },

  removeContact: async (contactId) => {
    try {
      const res = await axiosInstance.post("/messages/remove-contact", { contactId });
      get().getUsers();
      return true;
    } catch (error) {
      console.error("RemoveContact error:", error);
      return false;
    }
  },

  blockContact: async (contactId) => {
    try {
      const res = await axiosInstance.post("/messages/block-contact", { contactId });
      get().getUsers();
      return true;
    } catch (error) {
      console.error("BlockContact error:", error);
      return false;
    }
  },
  
  getMessages: async (userId) => {
    const cachedMessages = get().messageCache[userId] || [];
    const hasCached = !!get().messageCache[userId];
    if (!hasCached) {
      set({ isMessagesLoading: true });
    }
    
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const decryptedData = await get()._decryptMessages(res.data);
      
      set((state) => {
        // Merge: keep any socket-delivered messages that arrived during this API fetch
        const currentMessages = state.messageCache[userId] || state.messages;
        const fetchedIds = new Set(decryptedData.map(m => m._id));
        const socketOnlyMessages = currentMessages.filter(
          m => !m.isOptimistic && !fetchedIds.has(m._id)
        );
        const finalMessages = [...decryptedData, ...socketOnlyMessages];

        // Prevent unnecessary array reference change if messages are identical (by length and last message ID)
        const isIdentical = currentMessages.length === finalMessages.length && 
          (finalMessages.length === 0 || currentMessages[currentMessages.length - 1]._id === finalMessages[finalMessages.length - 1]._id);

        if (isIdentical && hasCached) {
          return { isMessagesLoading: false }; // No change needed
        }

        const newCache = { ...state.messageCache, [userId]: finalMessages };
        // Only update `messages` if this user is still the selected user
        if (state.selectedUser && state.selectedUser._id === userId) {
          return { 
            messages: finalMessages, 
            messageCache: newCache,
            isMessagesLoading: false 
          };
        }
        return { messageCache: newCache, isMessagesLoading: false };
      });
      get().getUsers(true); // Silent refresh - no loading spinner
    } catch (error) {
      console.error("GetMessages error:", error);
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, getUsers, activeConversations } = get();
    const authUser = useAuthStore.getState().authUser;
    
    // Support explicit receiverId (e.g., from story reply) or fallback to selectedUser
    const targetUserId = messageData.receiverId || selectedUser?._id;
    if (!authUser || !targetUserId) return;

    let payload = { ...messageData };
    let isEncrypted = false;
    let iv = null;

    try {
      const { getMyPrivateKey, deriveSharedKey, encryptAES } = await import("../lib/crypto");
      const privateKeyJwk = await getMyPrivateKey(authUser._id);
      const otherUser = get().users.find(u => u._id === targetUserId) || get().globalUsers.find(u => u._id === targetUserId);

      if (privateKeyJwk && otherUser && otherUser.publicKey) {
        const sharedKey = await deriveSharedKey(privateKeyJwk, otherUser.publicKey);
        if (sharedKey) {
          if (payload.text) {
            const encryptedText = await encryptAES(payload.text, sharedKey);
            payload.text = encryptedText.ciphertextB64;
            iv = encryptedText.ivB64;
            isEncrypted = true;
          }
          if (payload.image) {
            // Encrypt the entire data URI
            const encryptedImage = await encryptAES(payload.image, sharedKey);
            // Prefix with generic octet-stream so the backend can accept it as base64
            payload.image = `data:application/octet-stream;base64,${encryptedImage.ciphertextB64}`;
            if (!iv) iv = encryptedImage.ivB64;
            isEncrypted = true;
          }
        }
      }
    } catch (err) {
      console.error("Encryption failed before sending:", err);
    }

    if (isEncrypted) {
      payload.isEncrypted = true;
      payload.iv = iv;
    }

    // 1. Create an Optimistic Message for Instant UI Feedback
    const optimisticMessage = {
      _id: Date.now().toString(), // temporary ID
      senderId: authUser._id,
      receiverId: targetUserId,
      text: messageData.text,
      image: messageData.image,
      messageType: messageData.messageType || (messageData.image ? "image" : "text"),
      storyId: messageData.storyId,
      createdAt: new Date().toISOString(),
      isOptimistic: true, 
    };

    // 2. Update local state immediately if we are in the correct chat window
    const isCurrentChat = selectedUser && selectedUser._id === targetUserId;
    if (isCurrentChat) {
      const newMessages = [...messages, optimisticMessage];
      set(state => ({ 
        messages: newMessages,
        messageCache: { ...state.messageCache, [targetUserId]: newMessages }
      }));
    } else {
      const existingCache = get().messageCache[targetUserId];
      if (existingCache) {
        set(state => ({
          messageCache: { ...state.messageCache, [targetUserId]: [...existingCache, optimisticMessage] }
        }));
      }
    }

    try {
      const res = await axiosInstance.post(`/messages/send/${targetUserId}`, payload);
      const [decryptedRes] = await get()._decryptMessages([res.data]);
      
      // 3. Replace the optimistic message if it was added
      if (isCurrentChat) {
        const updatedMessages = get().messages.map(m => 
          m._id === optimisticMessage._id ? decryptedRes : m
        );
        set(state => ({ 
          messages: updatedMessages,
          messageCache: { ...state.messageCache, [targetUserId]: updatedMessages }
        }));
      } else {
        const existingCache = get().messageCache[targetUserId];
        if (existingCache) {
          const updatedCache = existingCache.map(m => m._id === optimisticMessage._id ? decryptedRes : m);
          set(state => ({
            messageCache: { ...state.messageCache, [targetUserId]: updatedCache }
          }));
        }
      }
      
      // 4. Register as active conversation if not already
      const activeKey = `active_conversations_${authUser._id}`;
      if (!activeConversations.includes(targetUserId)) {
        const updated = [...activeConversations, targetUserId];
        localStorage.setItem(activeKey, JSON.stringify(updated));
        set({ activeConversations: updated });
      }

      // Optimistically update the lastMessage in the users array for immediate sidebar UI update
      const { users } = get();
      const userExists = users.some(u => u._id === targetUserId);
      if (userExists) {
        set({
          users: users.map(u => 
            u._id === targetUserId ? { ...u, lastMessage: decryptedRes } : u
          )
        });
      } else {
        getUsers(true);
      }
      
      return true;
    } catch (error) {
      // 5. If sending fails, remove the optimistic message
      if (isCurrentChat) {
        set({ messages: get().messages.filter(m => m._id !== optimisticMessage._id) });
      }
      console.error("SendMessage error:", error);
      throw error;
    }
  },
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageDeleted");

    socket.on("newMessage", async (rawMessage) => {
      // Decrypt incoming message
      const [newMessage] = await get()._decryptMessages([rawMessage]);

      // Always read the FRESHEST state at the moment the event fires
      const { selectedUser, getUsers } = get();
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return;

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        // Deduplicate: only add if this message doesn't already exist in the current messages array
        const currentMessages = get().messages;
        const alreadyExists = currentMessages.some(m => m._id === newMessage._id);
        if (!alreadyExists) {
          const newMessages = [...currentMessages, newMessage];
          set(state => ({ 
            messages: newMessages,
            messageCache: { ...state.messageCache, [newMessage.senderId]: newMessages }
          }));
        }

        // Emit messageSeen over socket since we are actively in this user's chat window
        socket.emit("messageSeen", { senderId: selectedUser._id });
      } else {
        if (newMessage.senderId !== authUser._id) {
          // Play notification sound & show toast when receiving a message in background/another chat
          playNotificationSound();
          const sender = get().users.find(u => u._id === newMessage.senderId);
          const senderName = sender ? sender.fullName : "New Contact";
          toast(`New message from ${senderName}: "${newMessage.text || "📷 Photo"}"`, {
            icon: "💬",
            duration: 3500,
          });
        }
        // Add to cache if it exists, so when they open it, it's there
        const existingCache = get().messageCache[newMessage.senderId];
        if (existingCache) {
          const alreadyExists = existingCache.some(m => m._id === newMessage._id);
          if (!alreadyExists) {
             set(state => ({
               messageCache: { ...state.messageCache, [newMessage.senderId]: [...existingCache, newMessage] }
             }));
          }
        }
      }

      // Automatically register the sender as an active conversation
      const activeKey = `active_conversations_${authUser._id}`;
      const { activeConversations, users } = get();
      
      // Optimistically update the lastMessage in the users array
      const userExists = users.some(u => u._id === newMessage.senderId);
      if (userExists) {
        set({ 
          users: users.map(u => 
            u._id === newMessage.senderId ? { ...u, lastMessage: newMessage } : u
          ) 
        });
      }

      if (!activeConversations.includes(newMessage.senderId)) {
        const updated = [...activeConversations, newMessage.senderId];
        localStorage.setItem(activeKey, JSON.stringify(updated));
        set({ activeConversations: updated });
        if (!userExists) getUsers(true); // Only fetch if user wasn't in list at all
      } else if (!userExists) {
        getUsers(true);
      }
    });

    socket.on("messageDeleted", (messageId) => {
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
      get().getUsers(true);
    });

    // Handle real-time read notifications from the recipient
    socket.on("messagesRead", ({ readBy }) => {
      const { selectedUser, messages, getUsers } = get();
      if (selectedUser && selectedUser._id === readBy) {
        // Mark all sent messages as read in local state
        const updatedMessages = messages.map((msg) => {
          if (msg.receiverId === readBy && !msg.isRead) {
            return { ...msg, isRead: true };
          }
          return msg;
        });
        set({ messages: updatedMessages });
      }
      // Also refresh sidebar list so that the lastMessage checkmark turns blue instantly
      getUsers(true);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesRead");
      socket.off("messageDeleted");
    }
  },

  removeConversationFromCache: (userId) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const { selectedUser, activeConversations, messageCache, getUsers } = get();
    
    if (selectedUser && selectedUser._id === userId) {
      set({ selectedUser: null, messages: [] });
    }

    const updated = activeConversations.filter(id => id !== userId);
    const activeKey = `active_conversations_${authUser._id}`;
    localStorage.setItem(activeKey, JSON.stringify(updated));

    const newCache = { ...messageCache };
    delete newCache[userId];

    set({ 
      activeConversations: updated,
      messageCache: newCache 
    });

    getUsers();
  },

  deleteConversation: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/conversation/${userId}`);
      get().removeConversationFromCache(userId);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/message/${messageId}`);
      const { messages } = get();
      set({ messages: messages.filter(m => m._id !== messageId) });
      get().getUsers();
    } catch (error) {
      console.error("DeleteMessage error:", error);
      throw error;
    }
  },

  clearCallLogs: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/call-logs/${userId}`);
      const { messages } = get();
      set({ 
        messages: messages.filter(m => 
          !(m.messageType === "voice_call" || m.messageType === "video_call")
        ) 
      });
    } catch (error) {
      console.error("ClearCallLogs error:", error);
    }
  },

  _decryptMessages: async (messagesToDecrypt) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser || !messagesToDecrypt || messagesToDecrypt.length === 0) return messagesToDecrypt;
    
    try {
      const { getMyPrivateKey, deriveSharedKey, decryptAES } = await import("../lib/crypto");
      const privateKeyJwk = await getMyPrivateKey(authUser._id);
      if (!privateKeyJwk) return messagesToDecrypt;

      const { users, globalUsers } = get();
      
      const decryptedMessages = await Promise.all(messagesToDecrypt.map(async (msg) => {
        if (!msg.isEncrypted || !msg.iv) return msg;
        
        const senderIdStr = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
        const receiverIdStr = typeof msg.receiverId === "object" ? msg.receiverId._id : msg.receiverId;
        const otherUserId = senderIdStr === authUser._id ? receiverIdStr : senderIdStr;
        const otherUser = users.find(u => u._id === otherUserId) || globalUsers.find(u => u._id === otherUserId);
        if (!otherUser || !otherUser.publicKey) return msg;

        const sharedKey = await deriveSharedKey(privateKeyJwk, otherUser.publicKey);
        if (!sharedKey) return msg;

        let decryptedText = msg.text;
        if (msg.text) {
           decryptedText = await decryptAES(msg.text, msg.iv, sharedKey);
        }

        return { ...msg, text: decryptedText, isDecryptedLocally: true };
      }));
      return decryptedMessages;
    } catch (err) {
      console.error("Error decrypting messages:", err);
      return messagesToDecrypt;
    }
  },

  decryptMediaUrl: async (message) => {
    if (!message || !message.image || !message.isEncrypted || !message.image.startsWith("http")) return message.image;

    try {
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return message.image;

      const { getMyPrivateKey, deriveSharedKey, decryptAES } = await import("../lib/crypto");
      const privateKeyJwk = await getMyPrivateKey(authUser._id);
      if (!privateKeyJwk) return message.image;

      const senderIdStr = typeof message.senderId === "object" ? message.senderId._id : message.senderId;
      const receiverIdStr = typeof message.receiverId === "object" ? message.receiverId._id : message.receiverId;
      const otherUserId = senderIdStr === authUser._id ? receiverIdStr : senderIdStr;
      const { users, globalUsers } = get();
      const otherUser = users.find(u => u._id === otherUserId) || globalUsers.find(u => u._id === otherUserId);
      if (!otherUser || !otherUser.publicKey) return message.image;

      const sharedKey = await deriveSharedKey(privateKeyJwk, otherUser.publicKey);
      if (!sharedKey) return message.image;

      // Fetch the binary ciphertext from Cloudinary
      const response = await fetch(message.image);
      const arrayBuffer = await response.arrayBuffer();

      // Convert to base64 for decryptAES
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      // Chunking to prevent Maximum Call Stack Size Exceeded for large files
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      const cipherTextB64 = window.btoa(binary);

      const decryptedDataUri = await decryptAES(cipherTextB64, message.iv, sharedKey);
      if (decryptedDataUri && decryptedDataUri.startsWith("data:")) {
        return decryptedDataUri;
      }
      return null;
    } catch (error) {
      console.error("Failed to decrypt media:", error);
      return null;
    }
  },

  setSelectedUser: (selectedUser) => {
    // Trigger native haptic feedback on chat selection
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([10]); } catch (e) {}
    }

    if (selectedUser) {
      const cachedMessages = get().messageCache[selectedUser._id] || [];
      set({ 
        selectedUser, 
        messages: cachedMessages, 
        isMessagesLoading: cachedMessages.length === 0, 
        showContactDetailsSidebar: false 
      });
      // De-select group chat to prevent split screen or message blending
      useGroupStore.getState().setSelectedGroup(null);
    } else {
      set({ selectedUser: null, messages: [], showContactDetailsSidebar: false });
    }
    const authUser = useAuthStore.getState().authUser;
    if (authUser) {
      if (selectedUser) {
        localStorage.setItem(`selected_user_${authUser._id}`, selectedUser._id);
        set({ selectedUserId: selectedUser._id });
      } else {
        localStorage.removeItem(`selected_user_${authUser._id}`);
        set({ selectedUserId: null });
      }
    }
  },

  allMediaMessages: [],
  isAllMediaLoading: false,
  getAllMediaMessages: async () => {
    set({ isAllMediaLoading: true });
    try {
      const res = await axiosInstance.get("/messages/media/all");
      set({ allMediaMessages: res.data });
    } catch (error) {
      console.error("getAllMediaMessages error:", error);
    } finally {
      set({ isAllMediaLoading: false });
    }
  },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        messageCache: state.messageCache,
        activeConversations: state.activeConversations,
        scrollCache: state.scrollCache,
        activeTab: state.activeTab,
        currentUserId: state.currentUserId,
        users: state.users,
        globalUsers: state.globalUsers
      }),
    }
  )
);
