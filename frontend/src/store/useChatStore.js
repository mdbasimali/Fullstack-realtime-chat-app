import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatstore = create((set,get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  activeTab: "chats",
  setActiveTab: (activeTab) => set({ activeTab }),

  activeConversations: [],
  setActiveConversations: (activeConversations) => set({ activeConversations }),
  initializeActiveConversations: (userId) => {
    if (!userId) return;
    const saved = localStorage.getItem(`active_conversations_${userId}`);
    set({ activeConversations: saved ? JSON.parse(saved) : [] });
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  addContact: async (contactInput) => {
    try {
      const res = await axiosInstance.post("/messages/add-contact", { contactInput });
      toast.success(res.data.message || "Contact added!");
      get().getUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add contact");
      return false;
    }
  },

  removeContact: async (contactId) => {
    try {
      const res = await axiosInstance.post("/messages/remove-contact", { contactId });
      toast.success(res.data.message || "Contact removed!");
      get().getUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove contact");
      return false;
    }
  },

  blockContact: async (contactId) => {
    try {
      const res = await axiosInstance.post("/messages/block-contact", { contactId });
      toast.success(res.data.message || "Contact blocked successfully!");
      get().getUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block contact");
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
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage:async(messageData)=>{
    const {selectedUser,messages,getUsers}=get()
    try{
      const res =await axiosInstance.post(`/messages/send/${selectedUser._id}`,messageData);
      set({messages:[...messages,res.data]});
      getUsers(); // Refresh sidebar items to show our newly sent message as the lastMessage instantly!
    }catch(error){
      toast.error(error.response.data.message);
    }
  },
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");

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

      // Show high-fidelity toast notification if we are not actively in their chat window
      if (!selectedUser || selectedUser._id !== newMessage.senderId) {
        toast.success("New message received! 💬", {
          duration: 3000,
          position: "top-right"
        });
      }
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

      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  },


  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
