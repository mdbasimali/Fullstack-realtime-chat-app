import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import { useGroupStore } from "./useGroupStore";

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

export const useChatstore = create((set,get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  activeTab: "chats",
  setActiveTab: (activeTab) => {
    const authUser = useAuthStore.getState().authUser;
    if (authUser) {
      localStorage.setItem(`active_tab_${authUser._id}`, activeTab);
    }
    set({ activeTab });
  },

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

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
      
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
      set({ isUsersLoading: false });
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
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      get().getUsers(); // Update sidebar unread badge states and previews instantly!
    } catch (error) {
      console.error("GetMessages error:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, getUsers, activeConversations } = get();
    const authUser = useAuthStore.getState().authUser;
    
    // Support explicit receiverId (e.g., from story reply) or fallback to selectedUser
    const targetUserId = messageData.receiverId || selectedUser?._id;
    if (!authUser || !targetUserId) return;

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
      set({ messages: [...messages, optimisticMessage] });
    }

    try {
      const res = await axiosInstance.post(`/messages/send/${targetUserId}`, messageData);
      
      // 3. Replace the optimistic message if it was added
      if (isCurrentChat) {
        const updatedMessages = get().messages.map(m => 
          m._id === optimisticMessage._id ? res.data : m
        );
        set({ messages: updatedMessages });
      }
      
      // 4. Register as active conversation if not already
      const activeKey = `active_conversations_${authUser._id}`;
      if (!activeConversations.includes(targetUserId)) {
        const updated = [...activeConversations, targetUserId];
        localStorage.setItem(activeKey, JSON.stringify(updated));
        set({ activeConversations: updated });
      }

      getUsers(); // Refresh sidebar for lastMessage preview
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

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, getUsers } = get();
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return;

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({
          messages: [...messages, newMessage]
        });

        // Emit messageSeen over socket since we are actively in this user's chat window
        socket.emit("messageSeen", { senderId: selectedUser._id });
      } else if (newMessage.senderId !== authUser._id) {
        // Play notification sound & show toast when receiving a message in background/another chat
        playNotificationSound();
        const sender = get().users.find(u => u._id === newMessage.senderId);
        const senderName = sender ? sender.fullName : "New Contact";
        toast(`New message from ${senderName}: "${newMessage.text || "📷 Photo"}"`, {
          icon: "💬",
          duration: 3500,
        });
      }

      // Automatically register the sender as an active conversation
      const activeKey = `active_conversations_${authUser._id}`;
      const { activeConversations } = get();
      if (!activeConversations.includes(newMessage.senderId)) {
        const updated = [...activeConversations, newMessage.senderId];
        localStorage.setItem(activeKey, JSON.stringify(updated));
        set({ activeConversations: updated });
        getUsers();
      } else {
        getUsers();
      }
    });

    socket.on("messageDeleted", (messageId) => {
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
      get().getUsers();
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
      getUsers();
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

  deleteConversation: async (userId) => {
    try {
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return;

      // Call backend route to delete conversation from database
      await axiosInstance.delete(`/messages/conversation/${userId}`);

      // Clear local state if we are currently looking at this user's chat window
      const { selectedUser, activeConversations, getUsers } = get();
      if (selectedUser && selectedUser._id === userId) {
        set({ selectedUser: null, messages: [] });
      }

      // Filter out from activeConversations store state and localStorage
      const updated = activeConversations.filter(id => id !== userId);
      const activeKey = `active_conversations_${authUser._id}`;
      localStorage.setItem(activeKey, JSON.stringify(updated));
      set({ activeConversations: updated });

      // Refresh sidebar list
      getUsers();
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


  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) {
      // De-select group chat to prevent split screen or message blending
      useGroupStore.getState().setSelectedGroup(null);
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
}));
