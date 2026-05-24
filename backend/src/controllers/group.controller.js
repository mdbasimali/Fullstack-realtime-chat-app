import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId, sendPushNotification } from "../lib/socket.js";
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
  const { name, description, avatar, members } = req.body;

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

    // Upload avatar if present
    let avatarUrl = "";
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      avatarUrl = uploadResponse.secure_url;
    }

    // Process members list (always include creator)
    let initialMembers = [userId];
    if (Array.isArray(members)) {
      // Filter out duplicate user IDs and creator ID
      const cleanedMembers = [...new Set(members)].filter(
        (id) => id && id.toString() !== userId.toString()
      );
      initialMembers = [...initialMembers, ...cleanedMembers];
    }

    // Limit initial members to max capacity (100)
    if (initialMembers.length > 100) {
      initialMembers = initialMembers.slice(0, 100);
    }

    // Create group
    const newGroup = new Group({
      name: name.trim(),
      description: (description || "").trim(),
      creatorId: userId,
      members: initialMembers,
      avatar: avatarUrl,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    });

    await newGroup.save();

    // Record creation timestamp
    groupCreationCooldowns.set(userId.toString(), Date.now());

    // Build standard return format matching getMyGroups
    const returnGroup = {
      _id: newGroup._id,
      name: newGroup.name,
      description: newGroup.description,
      creatorId: newGroup.creatorId,
      membersCount: newGroup.members.length,
      avatar: newGroup.avatar,
      inviteCode: newGroup.inviteCode,
      isMember: true,
      createdAt: newGroup.createdAt
    };

    // Broadcast "groupCreated" event to all online members
    initialMembers.forEach(mId => {
      const socketId = getReceiverSocketId(mId.toString());
      if (socketId) {
        io.to(socketId).emit("groupCreated", returnGroup);
      }
    });

    res.status(201).json(returnGroup);
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
      .select("name description creatorId members avatar inviteCode createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = groups.map((g) => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      creatorId: g.creatorId,
      membersCount: g.members.length,
      avatar: g.avatar,
      inviteCode: g.inviteCode,
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
 * Join a group using invite code or link
 */
export const joinGroupByInvite = async (req, res) => {
  const userId = req.user._id;
  const { inviteCode } = req.params;

  try {
    const codeCleaned = inviteCode.trim().toUpperCase();
    const group = await Group.findOne({ inviteCode: codeCleaned });
    if (!group) {
      return res.status(404).json({ message: "Invalid invite code or link." });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "You are already a member of this group." });
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: "Group is full (max 100 members)." });
    }

    // Add user atomically
    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: group._id,
        members: { $ne: userId }
      },
      { $addToSet: { members: userId } },
      { new: true }
    );

    if (updatedGroup) {
      // Let the socket room know a user joined
      io.to(`group_${group._id}`).emit("groupMemberJoined", {
        groupId: group._id,
        userId,
        membersCount: updatedGroup.members.length
      });

      return res.status(200).json({
        message: "Successfully joined group via invite.",
        group: {
          _id: updatedGroup._id,
          name: updatedGroup.name,
          description: updatedGroup.description,
          creatorId: updatedGroup.creatorId,
          membersCount: updatedGroup.members.length,
          avatar: updatedGroup.avatar,
          inviteCode: updatedGroup.inviteCode,
          isMember: true
        }
      });
    }

    res.status(400).json({ message: "Failed to join group." });
  } catch (error) {
    console.error("Error in joinGroupByInvite:", error);
    res.status(500).json({ message: "Server error during invite join operation." });
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
      .populate("senderId", "fullName username profilePic")
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
      // Robustly extract base64 data — MIME type may include codec params
      // e.g. "data:video/webm;codecs=vp9,opus;base64,XXXX" — simple regex breaks on this
      const base64Index = image.indexOf(';base64,');
      if (base64Index === -1) throw new Error('Invalid base64 data URL');
      const base64Data = image.slice(base64Index + 8);
      const buffer = Buffer.from(base64Data, 'base64');
      const options = {
        resource_type: messageType === "audio" || messageType === "video" ? "video" : "image",
      };
      const uploadResponse = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        stream.end(buffer);
      });
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

    // Populate sender details for socket broadcast
    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "fullName username profilePic");

    // Broadcast message to all active room subscribers
    io.to(`group_${groupId}`).emit("newGroupMessage", populatedMessage);

    // Web Push Notification for offline/background users
    const sender = await User.findById(senderId).select("fullName profilePic");
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        sendPushNotification(memberId, {
          title: `${sender?.fullName} in ${group.name}`,
          body: text || (image ? "Sent an image" : "New message"),
          data: {
            type: "new_group_message",
            from: senderId,
            senderPic: sender?.profilePic || group.avatar,
            groupId: groupId
          }
        });
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error sending group message." });
  }
};

/**
 * Add a member to the group directly
 */
export const addMember = async (req, res) => {
  const { groupId } = req.params;
  const { userId, userIds, email, username } = req.body;
  const currentUserId = req.user._id;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Verify requesting user is a member
    if (!group.members.some(id => id.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: "Only group members can add new users." });
    }

    let targetUserIds = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else if (userId) {
      targetUserIds = [userId];
    } else {
      let query = {};
      if (email) query.email = email.trim().toLowerCase();
      else if (username) query.username = username.trim();
      else {
        return res.status(400).json({ message: "User ID(s), email, or username is required." });
      }

      const foundUser = await User.findOne(query);
      if (!foundUser) {
        return res.status(404).json({ message: "User not found." });
      }
      targetUserIds = [foundUser._id.toString()];
    }

    // Filter out users who are already in the group
    const newMembers = targetUserIds.filter(
      id => !group.members.some(memberId => memberId.toString() === id.toString())
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "All specified users are already members." });
    }

    if (group.members.length + newMembers.length > group.maxMembers) {
      return res.status(400).json({ message: `Cannot add members. Exceeds max limit of ${group.maxMembers}.` });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId },
      { $addToSet: { members: { $each: newMembers } } },
      { new: true }
    );

    if (updatedGroup) {
      // Notify via socket for each new member
      newMembers.forEach(id => {
        io.to(`group_${groupId}`).emit("groupMemberJoined", {
          groupId,
          userId: id,
          membersCount: updatedGroup.members.length
        });
      });

      return res.status(200).json({
        message: newMembers.length > 1 ? `Successfully added ${newMembers.length} members.` : "User added successfully.",
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

    res.status(400).json({ message: "Failed to add member(s) to the group." });
  } catch (error) {
    console.error("Error in addMember:", error);
    res.status(500).json({ message: "Server error adding group member." });
  }
};

/**
 * Get full group details including populated members list
 */
export const getGroupDetails = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId)
      .populate("members", "_id fullName username profilePic")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Verify requesting user is a member
    const isMember = group.members.some(m => m._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroupDetails:", error);
    res.status(500).json({ message: "Server error fetching group details." });
  }
};

/**
 * Update group details (name, description, avatar)
 */
export const updateGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;
  const { name, description, avatar } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // Verify requesting user is a member
    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "Only group members can edit the group." });
    }

    if (name) {
      if (name.length > 50) return res.status(400).json({ message: "Group name must be 50 characters or less." });
      group.name = name.trim();
    }
    
    if (description !== undefined) {
      if (description.length > 200) return res.status(400).json({ message: "Description must be 200 characters or less." });
      group.description = description.trim();
    }

    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      group.avatar = uploadResponse.secure_url;
    }

    await group.save();

    // Broadcast the update to the room
    io.to(`group_${groupId}`).emit("groupUpdated", {
      groupId: group._id,
      name: group.name,
      description: group.description,
      avatar: group.avatar
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in updateGroup:", error);
    res.status(500).json({ message: "Server error updating group." });
  }
};
