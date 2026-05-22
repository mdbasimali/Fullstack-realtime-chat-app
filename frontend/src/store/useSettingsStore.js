import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useSettingsStore = create((set, get) => ({
  settings: null,
  isLoading: false,
  isUpdating: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/settings");
      set({ settings: res.data });
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Don't toast here as it runs on mount
    } finally {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    // Optimistic UI update
    const previousSettings = get().settings;
    set({
      settings: { ...previousSettings, [key]: value },
      isUpdating: true,
    });

    try {
      await axiosInstance.patch("/settings", { [key]: value });
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      toast.error(`Failed to update ${key}`);
      // Rollback on failure
      set({ settings: previousSettings });
    } finally {
      set({ isUpdating: false });
    }
  },
}));
