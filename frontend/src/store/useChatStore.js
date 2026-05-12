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
  
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage:async(messageData)=>{
    const {selectedUser,messages}=get()
    try{
      const res =await axiosInstance.post(`/messages/send/${selectedUser._id}`,messageData);
      set({messages:[...messages,res.data]})

    }catch(error){
      toast.error(error.response.data.message);
    }
  },
  
  subscribeToMessages:()=>{
    const socket=useAuthStore.getState().socket;
    if(!socket) return;

    socket.off("newMessage");

    socket.on("newMessage",(newMessage)=>{
      const { selectedUser, messages, getUsers } = get();
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return;

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({
          messages: [...messages, newMessage]
        });
      }

      // Automatically register the sender as an active conversation
      const activeKey = `active_conversations_${authUser._id}`;
      const { activeConversations, getUsers } = get();
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
  },
  unsubscribeFromMessages:()=>{
    const socket=useAuthStore.getState().socket;
    if(socket) socket.off("newMessage");
  },


  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
