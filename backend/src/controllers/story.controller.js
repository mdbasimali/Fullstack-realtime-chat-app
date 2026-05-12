import cloudinary from "../lib/cloudinary.js";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";

export const createStory = async (req, res) => {
  try {
    const { content, type, caption } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let finalContent = content;

    if (type === "image") {
      const uploadResponse = await cloudinary.uploader.upload(content, {
        folder: "stories",
      });
      finalContent = uploadResponse.secure_url;
    }

    const newStory = new Story({
      userId,
      content: finalContent,
      type,
      caption,
    });

    await newStory.save();

    // Populate user info before sending back
    const populatedStory = await Story.findById(newStory._id).populate("userId", "fullName profilePic");

    res.status(201).json(populatedStory);
  } catch (error) {
    console.error("Error in createStory controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStories = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Get user's own stories + their contacts' stories
    const targetUserIds = [userId, ...(user.contacts || [])];

    const stories = await Story.find({
      userId: { $in: targetUserIds },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName profilePic");

    // Group stories by user (WhatsApp style)
    const groupedStories = stories.reduce((acc, story) => {
      const uid = story.userId._id.toString();
      if (!acc[uid]) {
        acc[uid] = {
          user: story.userId,
          stories: [],
        };
      }
      acc[uid].stories.push(story);
      return acc;
    }, {});

    res.status(200).json(Object.values(groupedStories));
  } catch (error) {
    console.error("Error in getStories controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findOneAndDelete({ _id: id, userId });

    if (!story) {
      return res.status(404).json({ message: "Story not found or unauthorized" });
    }

    res.status(200).json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error in deleteStory controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
