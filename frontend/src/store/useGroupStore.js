import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatstore } from "./useChatStore";
import toast from "react-hot-toast";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  messages: [],
  isGroupsLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,
  showGroupDetailsSidebar: false,
  setShowGroupDetailsSidebar: (show) => set({ showGroupDetailsSidebar: show }),
  selectedGroupDetails: null,
  isFetchingGroupDetails: false,
  showGroupCallModal: false,
  setShowGroupCallModal: (show) => set({ showGroupCallModal: show }),
  groupCallType: "video",
  setGroupCallType: (type) => set({ groupCallType: type }),

  fetchGroups: async (silent = false) => {
    const isActuallySilent = silent || get().groups.length > 0;
    if (!isActuallySilent) set({ isGroupsLoading: true });
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
      if (!isActuallySilent) set({ isGroupsLoading: false });
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
        inviteCode: res.data.inviteCode,
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

  joinGroupByInviteCode: async (inviteCode) => {
    try {
      const res = await axiosInstance.post(`/groups/join-invite/${inviteCode}`);
      const joinedGroup = res.data.group;

      // Add to joined list
      set({
        groups: [joinedGroup, ...get().groups]
      });

      toast.success("Successfully joined the group! 🥳");

      // Auto-join socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group:join-room", joinedGroup._id);
      }

      get().setSelectedGroup(joinedGroup);
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to join group via invite.";
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
      
      // Swap optimistic message with the database stored object (or filter out if already appended by socket)
      const currentMessages = get().messages;
      const isAlreadyAppended = currentMessages.some(m => m._id === res.data._id);
      
      const updated = isAlreadyAppended
        ? currentMessages.filter(m => m._id !== optimisticMessage._id)
        : currentMessages.map(m => m._id === optimisticMessage._id ? res.data : m);

      set({ messages: updated });
    } catch (error) {
      // Revert if request fails
      set({ messages: get().messages.filter(m => m._id !== optimisticMessage._id) });
      toast.error("Failed to send message to the group.");
      console.error("Error sending group message:", error);
      throw error;
    }
  },

  setSelectedGroup: (group) => {
    if (group) {
      set({ selectedGroup: group, showGroupDetailsSidebar: false, selectedGroupDetails: null, messages: [], isMessagesLoading: true });
      // Clean DM selection state to prevent duplicate chat renders
      useChatstore.getState().setSelectedUser(null);
      get().fetchGroupMessages(group._id);
      get().subscribeToGroupMessages(group._id);
      get().fetchGroupDetails(group._id);
    } else {
      get().unsubscribeFromGroupMessages();
      set({ selectedGroup: null, showGroupDetailsSidebar: false, selectedGroupDetails: null, messages: [] });
    }
  },

  subscribeToGroupMessages: (groupId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
    socket.off("groupMemberJoined");
    socket.off("groupMemberLeft");
    socket.off("groupMessageDeleted");
    socket.off("groupUpdated");

    // Make sure socket is subbed to this room channel
    socket.emit("group:join-room", groupId);

    socket.on("newGroupMessage", (message) => {
      const { selectedGroup, messages } = get();
      if (selectedGroup && message.groupId === selectedGroup._id) {
        const senderIdStr = typeof message.senderId === "object" ? message.senderId._id : message.senderId;

        // Check if this message is a duplicate of a local optimistic message
        const isDuplicateOfOptimistic = messages.some(m => {
          if (!m.isOptimistic || m.senderId !== senderIdStr) return false;
          if (message.messageType === "text") {
            return m.text === message.text;
          }
          const mImage = m.image || "";
          const msgImage = message.image || "";
          return mImage === msgImage;
        });

        if (isDuplicateOfOptimistic) return;

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

    socket.on("groupMessageDeleted", ({ messageId }) => {
      const { messages } = get();
      set({ messages: messages.filter((msg) => msg._id !== messageId) });
    });

    socket.on("groupUpdated", (updatedData) => {
      const { selectedGroup, groups } = get();
      const updatedGroups = groups.map(g => g._id === updatedData.groupId ? { ...g, ...updatedData } : g);
      set({ groups: updatedGroups });

      if (selectedGroup && selectedGroup._id === updatedData.groupId) {
        set({ selectedGroup: { ...selectedGroup, ...updatedData } });
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
    socket.off("groupMessageDeleted");
    socket.off("groupUpdated");
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
  },

  fetchGroupDetails: async (groupId) => {
    set({ isFetchingGroupDetails: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/details`);
      set({ selectedGroupDetails: res.data });
    } catch (error) {
      console.error("Error fetching group details:", error);
      toast.error("Failed to load group details.");
    } finally {
      set({ isFetchingGroupDetails: false });
    }
  },

  deleteGroupMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/message/${messageId}`);
      const { messages } = get();
      set({ messages: messages.filter((msg) => msg._id !== messageId) });
    } catch (error) {
      console.error("deleteGroupMessage error:", error);
      throw error;
    }
  },

  isUpdatingGroup: false,
  updateGroup: async (groupId, updateData) => {
    set({ isUpdatingGroup: true });
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/update`, updateData);
      const updatedGroup = res.data;

      // Update in our groups list
      const updatedGroups = get().groups.map(g => g._id === groupId ? { ...g, name: updatedGroup.name, description: updatedGroup.description, avatar: updatedGroup.avatar } : g);
      set({ groups: updatedGroups });

      // Update active selectedGroup details
      const selected = get().selectedGroup;
      if (selected && selected._id === groupId) {
        set({ selectedGroup: { ...selected, name: updatedGroup.name, description: updatedGroup.description, avatar: updatedGroup.avatar } });
      }

      toast.success("Group updated successfully! ✨");
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update group.";
      toast.error(errorMsg);
      return false;
    } finally {
      set({ isUpdatingGroup: false });
    }
  }
}));
