import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatstore } from "./useChatStore";
import toast from "react-hot-toast";

export const useGroupStore = create((set, get) => ({
  groups: [],
  exploreGroups: [],
  selectedGroup: null,
  messages: [],
  isGroupsLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,

  fetchGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });

      // Socket sync: Tell backend to join all these group rooms
      const socket = useAuthStore.getState().socket;
      if (socket && res.data.length > 0) {
        socket.emit("group:join-rooms", res.data.map(g => g._id));
      }
    } catch (error) {
      console.error("Error fetching joined groups:", error);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  fetchExploreGroups: async () => {
    try {
      const res = await axiosInstance.get("/groups/explore");
      set({ exploreGroups: res.data });
    } catch (error) {
      console.error("Error fetching explore groups:", error);
    }
  },

  createGroup: async (groupData) => {
    const { isCreatingGroup } = get();
    if (isCreatingGroup) return false;

    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created successfully! 🎉");
      
      // Auto-join this new group socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group:join-room", res.data._id);
      }
      
      // Select the new group
      get().setSelectedGroup({
        _id: res.data._id,
        name: res.data.name,
        description: res.data.description,
        creatorId: res.data.creatorId,
        membersCount: 1,
        isMember: true
      });
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to create group.";
      toast.error(errorMsg);
      return false;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  joinGroup: async (groupId) => {
    try {
      const res = await axiosInstance.post(`/groups/join/${groupId}`);
      const joinedGroup = res.data.group;

      // Update explore list (remove joined one) and add to joined list
      set({
        exploreGroups: get().exploreGroups.filter(g => g._id !== groupId),
        groups: [joinedGroup, ...get().groups]
      });

      toast.success("Successfully joined the group! 🥳");

      // Auto-join socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group:join-room", groupId);
      }

      get().setSelectedGroup(joinedGroup);
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to join group.";
      toast.error(errorMsg);
      return false;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/leave/${groupId}`);

      // Remove from groups list
      set({
        groups: get().groups.filter(g => g._id !== groupId),
        selectedGroup: null,
        messages: []
      });

      toast.success("You have left the group.");

      // Leave socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group:leave-room", groupId);
      }

      // Refresh explore groups to make it joinable again
      get().fetchExploreGroups();
      return true;
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group.");
      return false;
    }
  },

  fetchGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error fetching group messages:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup, messages } = get();
    const authUser = useAuthStore.getState().authUser;
    if (!authUser || !selectedGroup) return;

    // Create optimistic group message for instant UI render
    const optimisticMessage = {
      _id: Date.now().toString(),
      senderId: authUser._id,
      groupId: selectedGroup._id,
      text: messageData.text,
      image: messageData.image,
      messageType: messageData.messageType || "text",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/send`, messageData);
      
      // Swap optimistic message with the database stored object
      const updated = get().messages.map(m => m._id === optimisticMessage._id ? res.data : m);
      set({ messages: updated });
    } catch (error) {
      // Revert if request fails
      set({ messages: get().messages.filter(m => m._id !== optimisticMessage._id) });
      toast.error("Failed to send message to the group.");
      console.error("Error sending group message:", error);
    }
  },

  setSelectedGroup: (group) => {
    set({ selectedGroup: group });
    if (group) {
      // Clean DM selection state to prevent duplicate chat renders
      useChatstore.getState().setSelectedUser(null);
      get().fetchGroupMessages(group._id);
      get().subscribeToGroupMessages(group._id);
    } else {
      get().unsubscribeFromGroupMessages();
      set({ messages: [] });
    }
  },

  subscribeToGroupMessages: (groupId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
    socket.off("groupMemberJoined");
    socket.off("groupMemberLeft");

    // Make sure socket is subbed to this room channel
    socket.emit("group:join-room", groupId);

    socket.on("newGroupMessage", (message) => {
      const { selectedGroup, messages } = get();
      if (selectedGroup && message.groupId === selectedGroup._id) {
        // Prevent duplicate insertions
        if (!messages.some(m => m._id === message._id)) {
          set({ messages: [...messages, message] });
        }
      }
    });

    socket.on("groupMemberJoined", ({ groupId: eventGroupId, membersCount }) => {
      const { selectedGroup, groups } = get();
      const updatedGroups = groups.map(g => g._id === eventGroupId ? { ...g, membersCount } : g);
      set({ groups: updatedGroups });

      if (selectedGroup && selectedGroup._id === eventGroupId) {
        set({ selectedGroup: { ...selectedGroup, membersCount } });
      }
    });

    socket.on("groupMemberLeft", ({ groupId: eventGroupId, membersCount }) => {
      const { selectedGroup, groups } = get();
      const updatedGroups = groups.map(g => g._id === eventGroupId ? { ...g, membersCount } : g);
      set({ groups: updatedGroups });

      if (selectedGroup && selectedGroup._id === eventGroupId) {
        set({ selectedGroup: { ...selectedGroup, membersCount } });
      }
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    const { selectedGroup } = get();
    if (selectedGroup) {
      socket.emit("group:leave-room", selectedGroup._id);
    }

    socket.off("newGroupMessage");
    socket.off("groupMemberJoined");
    socket.off("groupMemberLeft");
  },

  addMemberToGroup: async (groupId, identifier) => {
    try {
      const payload = {};
      if (identifier.includes("@")) {
        payload.email = identifier.trim();
      } else {
        payload.username = identifier.trim();
      }

      const res = await axiosInstance.post(`/groups/${groupId}/add-member`, payload);
      const updatedGroup = res.data.group;

      // Update in our groups list
      const updatedGroups = get().groups.map(g => g._id === groupId ? { ...g, membersCount: updatedGroup.membersCount } : g);
      set({ groups: updatedGroups });

      // Update active selectedGroup details
      const selected = get().selectedGroup;
      if (selected && selected._id === groupId) {
        set({ selectedGroup: { ...selected, membersCount: updatedGroup.membersCount } });
      }

      toast.success(res.data.message || "Member added successfully! 🎉");
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to add member.";
      toast.error(errorMsg);
      return false;
    }
  }
}));
