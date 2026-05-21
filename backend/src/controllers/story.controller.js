import cloudinary from "../lib/cloudinary.js";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const createStory = async (req, res) => {
  try {
    const { content, type, caption, bgColor } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let finalContent = content;

    if (type === "image" || type === "video") {
      const uploadOptions = {
        folder: "stories",
      };
      if (type === "video") {
        uploadOptions.resource_type = "video";
      }
      try {
        const uploadResponse = await cloudinary.uploader.upload(content, uploadOptions);
        finalContent = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error in createStory:", uploadError);
        return res.status(500).json({ error: "Failed to upload media to Cloudinary" });
      }
    }

    const newStory = new Story({
      userId,
      content: finalContent,
      type,
      caption,
      bgColor,
    });

    await newStory.save();

    // Populate user info before sending back
    const populatedStory = await Story.findById(newStory._id).populate("userId", "fullName profilePic");

    if (!populatedStory) {
      throw new Error("Failed to retrieve story after saving");
    }

    // Real-time broadcast: notify contacts that a new story was posted
    const user = await User.findById(userId);
    if (user && Array.isArray(user.contacts) && user.contacts.length > 0) {
      const storyData = populatedStory.toJSON();
      user.contacts.forEach(contactId => {
        if (!contactId) return;
        const socketId = getReceiverSocketId(contactId.toString());
        if (socketId) {
          io.to(socketId).emit("newStory", storyData);
        }
      });
    }

    res.status(201).json(populatedStory);
  } catch (error) {
    console.error("Error in createStory controller:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
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
      .populate("userId", "fullName profilePic")
      .populate("views", "fullName profilePic");

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

export const viewStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Add user ID to views if they are not the creator and have not viewed it already
    const hasViewed = story.views.some(v => v.toString() === userId.toString());
    if (story.userId.toString() !== userId.toString() && !hasViewed) {
      story.views.push(userId);
      await story.save();

      // Emit real-time storyViewed event to the owner of the story
      const ownerSocketId = getReceiverSocketId(story.userId.toString());
      if (ownerSocketId) {
        const viewer = await User.findById(userId).select("fullName profilePic");
        if (viewer) {
          io.to(ownerSocketId).emit("storyViewed", {
            storyId: story._id,
            viewer: {
              _id: viewer._id,
              fullName: viewer.fullName,
              profilePic: viewer.profilePic
            }
          });
        }
      }
    }

    res.status(200).json({ message: "Story view registered successfully" });
  } catch (error) {
    console.error("Error in viewStory controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
