import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
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
      toast.error(error.response?.data?.message || "Failed to load stories");
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
      
      toast.success("Story posted successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post story");
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
      toast.success("Story deleted");
    } catch (error) {
      toast.error("Failed to delete story");
    }
  }
}));
