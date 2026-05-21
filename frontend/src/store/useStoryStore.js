import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useStoryStore = create((set, get) => ({
  stories: [], // Array of { user, stories: [] }
  isStoriesLoading: false,
  isUploadingStory: false,

  getStories: async () => {
    set({ isStoriesLoading: true });
    try {
      const res = await axiosInstance.get("/stories");
      set({ stories: res.data });
    } catch (error) {
      console.error("Load stories error:", error);
    } finally {
      set({ isStoriesLoading: false });
    }
  },

  postStory: async (storyData) => {
    set({ isUploadingStory: true });
    try {
      const isVideo = storyData.type === "video";
      const res = await axiosInstance.post("/stories", storyData, {
        // Videos can take a long time to upload — extend timeout to 3 minutes
        timeout: isVideo ? 180000 : 30000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      
      // Update local state
      const { stories } = get();
      const newStory = res.data;
      const userId = newStory.userId._id;
      
      const userStoryIndex = stories.findIndex(s => s.user._id === userId);
      
      if (userStoryIndex > -1) {
        const updatedStories = [...stories];
        // Avoid duplicates if real-time event already added it
        if (!updatedStories[userStoryIndex].stories.some(s => s._id === newStory._id)) {
          updatedStories[userStoryIndex].stories.unshift(newStory);
          set({ stories: updatedStories });
        }
      } else {
        set({ 
          stories: [{ user: newStory.userId, stories: [newStory] }, ...stories] 
        });
      }
      
      return true;
    } catch (error) {
      console.error("Post story error:", error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || "Failed to post story";
      toast.error(errorMsg);
      return false;
    } finally {
      set({ isUploadingStory: false });
    }
  },

  subscribeToStories: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newStory", (newStory) => {
      const { stories } = get();
      const userId = newStory.userId._id;
      
      const userStoryIndex = stories.findIndex(s => s.user._id === userId);
      
      if (userStoryIndex > -1) {
        // Only add if not already present (to avoid race with postStory success)
        if (!stories[userStoryIndex].stories.some(s => s._id === newStory._id)) {
          const updatedStories = [...stories];
          updatedStories[userStoryIndex].stories.unshift(newStory);
          set({ stories: updatedStories });
        }
      } else {
        set({ 
          stories: [{ user: newStory.userId, stories: [newStory] }, ...stories] 
        });
      }
    });

    socket.on("storyViewed", ({ storyId, viewer }) => {
      const { stories } = get();
      const updatedStories = stories.map(group => ({
        ...group,
        stories: group.stories.map(story => {
          if (story._id === storyId) {
            // Add viewer if not already there
            const hasViewed = story.views.some(v => v._id === viewer._id || v === viewer._id);
            if (!hasViewed) {
              return { ...story, views: [...story.views, viewer] };
            }
          }
          return story;
        })
      }));
      set({ stories: updatedStories });
    });
  },

  unsubscribeFromStories: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newStory");
      socket.off("storyViewed");
    }
  },

  deleteStory: async (storyId) => {
    try {
      await axiosInstance.delete(`/stories/${storyId}`);
      // Refresh stories
      get().getStories();
      toast.success("Story deleted");
    } catch (error) {
      console.error("Delete story error:", error);
      toast.error("Failed to delete story");
    }
  },

  viewStory: async (storyId) => {
    try {
      await axiosInstance.post(`/stories/${storyId}/view`);
    } catch (error) {
      console.error("View story error:", error);
    }
  }
}));
