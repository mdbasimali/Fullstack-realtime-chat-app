import cloudinary from "../lib/cloudinary.js";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const createStory = async (req, res) => {
  const userId = req.user._id;
  const { content, type, caption, bgColor } = req.body;
  
  console.log(`[Story] Create attempt - User: ${userId}, Type: ${type}, Content size: ${content?.length || 0}`);

  try {
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let finalContent = content;

    if (type === "image" || type === "video") {
      console.log(`[Story] Uploading ${type} to Cloudinary...`);
      const uploadOptions = {
        folder: "stories",
        resource_type: type === "video" ? "video" : "image",
        timeout: 120000, // 2 minute timeout for large video uploads
      };

      try {
        let uploadResponse;
        if (type === "video") {
          // Use upload_large for video to handle files > 10MB reliably
          uploadResponse = await cloudinary.uploader.upload_large(content, {
            ...uploadOptions,
            chunk_size: 6000000, // 6MB chunks
          });
        } else {
          uploadResponse = await cloudinary.uploader.upload(content, uploadOptions);
        }
        finalContent = uploadResponse.secure_url;
        console.log(`[Story] Cloudinary success: ${finalContent}`);
      } catch (uploadError) {
        console.error("[Story] Cloudinary error:", uploadError);
        return res.status(500).json({ 
          error: "Cloudinary upload failed", 
          details: uploadError.message,
          code: uploadError.http_code || 500
        });
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
    console.log(`[Story] Database save success: ${newStory._id}`);

    const populatedStory = await Story.findById(newStory._id).populate("userId", "fullName profilePic");

    if (!populatedStory) {
      console.error("[Story] Population failed");
      return res.status(500).json({ error: "Failed to retrieve story after saving" });
    }

    // Broadcast logic
    try {
      const user = await User.findById(userId);
      if (user && Array.isArray(user.contacts) && user.contacts.length > 0) {
        const storyData = populatedStory.toObject(); // Use toObject for cleaner serialization
        user.contacts.forEach(contactId => {
          if (!contactId) return;
          const socketId = getReceiverSocketId(contactId.toString());
          if (socketId) {
            io.to(socketId).emit("newStory", storyData);
          }
        });
        console.log(`[Story] Broadcast sent to ${user.contacts.length} contacts`);
      }
    } catch (socketError) {
      console.error("[Story] Socket broadcast failed:", socketError.message);
    }

    return res.status(201).json(populatedStory);
  } catch (error) {
    console.error("[Story] Final catch error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
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
