import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

// Cooldown tracker for group creations: { userId: timestamp }
const groupCreationCooldowns = new Map();
// In-flight locks for group creations to prevent duplicate clicks
const groupCreationLocks = new Set();

// Join throttling tracker to prevent spam joining/leaving
const groupJoinCooldowns = new Map();

/**
 * Create a new group with rate-limit and validation checks
 */
export const createGroup = async (req, res) => {
  const userId = req.user._id;
  const { name, description } = req.body;

  // 1. In-flight request lock
  if (groupCreationLocks.has(userId.toString())) {
    return res.status(429).json({ message: "Server busy. Please wait for your previous request to finish." });
  }

  // 2. Cooldown limit check (10 seconds)
  const lastCreated = groupCreationCooldowns.get(userId.toString());
  if (lastCreated && Date.now() - lastCreated < 10000) {
    const waitSeconds = Math.ceil((10000 - (Date.now() - lastCreated)) / 1000);
    return res.status(429).json({ message: `Too many requests. Please wait ${waitSeconds} seconds.` });
  }

  // 3. Validation
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Group name is required." });
  }
  if (name.length > 50) {
    return res.status(400).json({ message: "Group name must be 50 characters or less." });
  }
  if (description && description.length > 200) {
    return res.status(400).json({ message: "Description must be 200 characters or less." });
  }

  try {
    groupCreationLocks.add(userId.toString());

    // Create group with creator as the first member
    const newGroup = new Group({
      name: name.trim(),
      description: (description || "").trim(),
      creatorId: userId,
      members: [userId]
    });

    await newGroup.save();

    // Record creation timestamp
    groupCreationCooldowns.set(userId.toString(), Date.now());

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error in createGroup:", error);
    res.status(500).json({ message: "Server error during group creation." });
  } finally {
    groupCreationLocks.delete(userId.toString());
  }
};

/**
 * Get groups the logged-in user belongs to
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    // Find all groups where the user is a member, projection for lightweight load
    const groups = await Group.find({ members: userId })
      .select("name description creatorId members createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = groups.map((g) => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      creatorId: g.creatorId,
      membersCount: g.members.length,
      isMember: true,
      createdAt: g.createdAt,
    }));

    res.status(200).json(sanitized);
  } catch (error) {
    console.error("Error in getMyGroups:", error);
    res.status(500).json({ message: "Server error fetching groups." });
  }
};

/**
 * Explore public groups the user has not joined
 */
export const getExploreGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    // Fetch up to 20 groups where the user is NOT a member
    const groups = await Group.find({ members: { $ne: userId } })
      .select("name description creatorId members createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const sanitized = groups.map((g) => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      creatorId: g.creatorId,
      membersCount: g.members.length,
      isMember: false,
      createdAt: g.createdAt,
    }));

    res.status(200).json(sanitized);
  } catch (error) {
    console.error("Error in getExploreGroups:", error);
    res.status(500).json({ message: "Server error fetching explore groups." });
  }
};

/**
 * Join a group atomically (concurrency safe)
 */
export const joinGroup = async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;

  // Cooldown check (prevent rapid join/leave actions)
  const lastAction = groupJoinCooldowns.get(`${userId}_${groupId}`);
  if (lastAction && Date.now() - lastAction < 3000) {
    return res.status(429).json({ message: "Too many requests. Please wait." });
  }
  groupJoinCooldowns.set(`${userId}_${groupId}`, Date.now());

  try {
    // Perform atomic update checking size and existing membership simultaneously
    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: groupId,
        members: { $ne: userId },
        // Use MongoDB $expr to verify members size is less than maxMembers limit (100)
        $expr: { $lt: [{ $size: "$members" }, "$maxMembers"] }
      },
      { $addToSet: { members: userId } },
      { new: true }
    );

    if (updatedGroup) {
      // Let the socket room know a user joined
      io.to(`group_${groupId}`).emit("groupMemberJoined", {
        groupId,
        userId,
        membersCount: updatedGroup.members.length
      });

      return res.status(200).json({
        message: "Successfully joined group.",
        group: {
          _id: updatedGroup._id,
          name: updatedGroup.name,
          description: updatedGroup.description,
          creatorId: updatedGroup.creatorId,
          membersCount: updatedGroup.members.length,
          isMember: true
        }
      });
    }

    // If update failed, query the group to return the exact validation reason
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "You are already a member of this group." });
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: "Group is full (max 100 members)." });
    }

    res.status(400).json({ message: "Failed to join group." });
  } catch (error) {
    console.error("Error in joinGroup:", error);
    res.status(500).json({ message: "Server error during join operation." });
  }
};

/**
 * Leave a group
 */
export const leaveGroup = async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;

  try {
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Inform remaining members via socket
    io.to(`group_${groupId}`).emit("groupMemberLeft", {
      groupId,
      userId,
      membersCount: group.members.length
    });

    res.status(200).json({ message: "Successfully left the group." });
  } catch (error) {
    console.error("Error in leaveGroup:", error);
    res.status(500).json({ message: "Server error during leave operation." });
  }
};

/**
 * Fetch messages for a group (paginated / limited to last 30)
 */
export const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    // Ensure requesting user is a member of the group
    const isMember = await Group.findOne({ _id: groupId, members: userId });
    if (!isMember) {
      return res.status(403).json({ message: "Access denied. You are not a member of this group." });
    }

    // Lightweight paginated lookup
    const messages = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Return in chronological order
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error fetching group messages." });
  }
};

/**
 * Send a message to the group
 */
export const sendGroupMessage = async (req, res) => {
  const { groupId } = req.params;
  const senderId = req.user._id;
  const { text, image, messageType } = req.body;

  try {
    // Validate membership
    const group = await Group.findOne({ _id: groupId, members: senderId });
    if (!group) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    let imageUrl = "";
    if (image) {
      // Audio or general image file upload to Cloudinary
      const options = {};
      if (messageType === "audio") {
        options.resource_type = "video";
      }
      const uploadResponse = await cloudinary.uploader.upload(image, options);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      messageType: messageType || "text"
    });

    await newMessage.save();

    // Broadcast message to all active room subscribers
    io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error sending group message." });
  }
};
