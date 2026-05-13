import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

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
      const res = await axiosInstance.post("/stories", storyData);
      
      // Update local state
      const { stories } = get();
      const userId = res.data.userId._id;
      
      const userStoryIndex = stories.findIndex(s => s.user._id === userId);
      
      if (userStoryIndex > -1) {
        const updatedStories = [...stories];
        updatedStories[userStoryIndex].stories.unshift(res.data);
        set({ stories: updatedStories });
      } else {
        set({ 
          stories: [{ user: res.data.userId, stories: [res.data] }, ...stories] 
        });
      }
      
      return true;
    } catch (error) {
      console.error("Post story error:", error);
      return false;
    } finally {
      set({ isUploadingStory: false });
    }
  },

  deleteStory: async (storyId) => {
    try {
      await axiosInstance.delete(`/stories/${storyId}`);
      // Refresh stories
      get().getStories();
    } catch (error) {
      console.error("Delete story error:", error);
    }
  }
}));
