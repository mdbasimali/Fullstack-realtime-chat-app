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
      console.log(`[Story] Uploading ${type} to Cloudinary via stream...`);

      try {
        // Robustly extract base64 data — MIME type may include codec params
        // e.g. "data:video/webm;codecs=vp9,opus;base64,XXXX" — simple regex breaks on this
        const base64Index = content.indexOf(';base64,');
        if (base64Index === -1) throw new Error('Invalid base64 data URL');
        const base64Data = content.slice(base64Index + 8); // 8 = length of ';base64,'
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadOptions = {
          folder: "stories",
          resource_type: type === "video" ? "video" : "image",
        };

        const uploadResponse = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });

        finalContent = uploadResponse.secure_url;
        console.log(`[Story] Cloudinary upload success: ${finalContent}`);
      } catch (uploadError) {
        console.error("[Story] Cloudinary upload error:", uploadError.message);
        return res.status(500).json({
          error: "Cloudinary upload failed",
          details: uploadError.message,
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

    // 1. Get contacts
    const user = await User.findById(userId);
    const contactIds = user.contacts || [];

    // 2. Combine unique IDs (Self + Contacts only)
    const targetUserIds = [...new Set([
      userId.toString(),
      ...contactIds.map(id => id.toString())
    ])];

    const stories = await Story.find({
      userId: { $in: targetUserIds },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName profilePic")
      .populate("views", "fullName profilePic");

    // Group stories by user (WhatsApp style)
    const groupedStoriesMap = stories.reduce((acc, story) => {
      if (!story.userId) return acc;
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

    res.status(200).json(Object.values(groupedStoriesMap));
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

export const likeStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const likeIndex = story.likes.indexOf(userId);
    let isLiked = false;

    if (likeIndex === -1) {
      // Like
      story.likes.push(userId);
      isLiked = true;
    } else {
      // Unlike
      story.likes.splice(likeIndex, 1);
      isLiked = false;
    }

    await story.save();

    // Notify story owner via socket
    const ownerSocketId = getReceiverSocketId(story.userId.toString());
    if (ownerSocketId && story.userId.toString() !== userId.toString()) {
      const liker = await User.findById(userId).select("fullName profilePic");
      io.to(ownerSocketId).emit("storyLiked", {
        storyId: story._id,
        liker: {
          _id: liker._id,
          fullName: liker.fullName,
          profilePic: liker.profilePic
        },
        isLiked
      });
    }

    res.status(200).json({ isLiked, likesCount: story.likes.length });
  } catch (error) {
    console.error("Error in likeStory controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
