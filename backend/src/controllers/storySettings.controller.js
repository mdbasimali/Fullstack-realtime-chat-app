import StoryPrivacy from "../models/storyPrivacy.model.js";

// Utility function to get or create default settings
const getOrCreateStorySettings = async (userId) => {
  let settings = await StoryPrivacy.findOne({ userId });
  if (!settings) {
    settings = new StoryPrivacy({ userId });
    await settings.save();
  }
  return settings;
};

export const getStorySettings = async (req, res) => {
  try {
    const settings = await getOrCreateStorySettings(req.user._id);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in getStorySettings controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateStorySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Filter out fields we don't want updated directly
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    let settings = await getOrCreateStorySettings(userId);

    // Apply updates
    Object.keys(updates).forEach((key) => {
      settings[key] = updates[key];
    });

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in updateStorySettings controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
