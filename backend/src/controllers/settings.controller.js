import UserSettings from "../models/userSettings.model.js";

// Utility function to get or create default settings
const getOrCreateSettings = async (userId) => {
  let settings = await UserSettings.findOne({ userId });
  if (!settings) {
    settings = new UserSettings({ userId });
    await settings.save();
  }
  return settings;
};

export const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user._id);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in getSettings controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Filter out fields we don't want updated directly like _id, userId
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    let settings = await getOrCreateSettings(userId);

    // Apply updates
    Object.keys(updates).forEach((key) => {
      settings[key] = updates[key];
    });

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in updateSettings controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
