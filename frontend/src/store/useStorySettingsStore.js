import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useStorySettingsStore = create((set, get) => ({
  storySettings: null,

  fetchStorySettings: async () => {
    try {
      const res = await axiosInstance.get("/story-settings");
      set({ storySettings: res.data });
    } catch (error) {
      console.error("Error fetching story settings:", error);
    }
  },

  updateStorySetting: async (key, value) => {
    // Optimistic UI update
    const previousSettings = get().storySettings;
    set({
      storySettings: { ...previousSettings, [key]: value },
    });

    try {
      await axiosInstance.patch("/story-settings", { [key]: value });
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      toast.error(`Failed to save privacy settings`);
      // Rollback on failure
      set({ storySettings: previousSettings });
    }
  },
}));
