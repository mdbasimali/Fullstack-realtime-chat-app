import https from "https";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";

export const getUsersForSidebar = async(req,res)=>{
    try{
       const loggedInUserId = req.user._id;

       // Find all unique user IDs that have sent a message to or received a message from the logged-in user
       const messageUserIds = await Message.distinct("senderId", { receiverId: loggedInUserId });
       const messageUserIds2 = await Message.distinct("receiverId", { senderId: loggedInUserId });
       
       // Merge unique IDs
       const interactedUserIds = [...new Set([...messageUserIds, ...messageUserIds2])].filter(id => id != null);

       const loggedInUser = await User.findById(loggedInUserId);
       const contactIds = loggedInUser.contacts || [];
       const blockedIds = loggedInUser.blockedUsers || [];

       // Merge contacts and interacted user IDs
       const allTargetUserIds = [...new Set([...contactIds.filter(id => id != null).map(id => id.toString()), ...interactedUserIds.filter(id => id != null).map(id => id.toString())])]
         .filter(id => !blockedIds.filter(bid => bid != null).map(bid => bid.toString()).includes(id));

       const filteredUsers = await User.find({
         _id: { $in: allTargetUserIds, $ne: loggedInUserId }
       }).select("-password");

       // Find the last message exchanged for each user to show in sidebar previews
       const usersWithLastMessage = await Promise.all(
         filteredUsers.map(async (user) => {
           const lastMsg = await Message.findOne({
             $or: [
               { senderId: loggedInUserId, receiverId: user._id },
               { senderId: user._id, receiverId: loggedInUserId }
             ]
           })
           .sort({ createdAt: -1 })
           .lean();

           return {
             ...user.toObject(),
             lastMessage: lastMsg || null
           };
         })
       );

       // Sort users list so that the one with the most recent message is always at the top
       usersWithLastMessage.sort((a, b) => {
         const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
         const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
         return timeB - timeA;
       });

       res.status(200).json(usersWithLastMessage);
    }catch(error){
       console.error("Error in getUsersForSidebar: ", error.message)
       res.status(500).json({error: "Internal server error"});
    }
};

export const addContact = async (req, res) => {
  try {
    const { contactInput } = req.body;
    const loggedInUserId = req.user._id;

    if (!contactInput || !contactInput.trim()) {
      return res.status(400).json({ message: "Email, phone number, or username is required" });
    }

    const inputClean = contactInput.trim();
    const usernameClean = inputClean.startsWith("@") ? inputClean.substring(1) : inputClean;

    const contactUser = await User.findOne({
      $or: [
        { email: inputClean },
        { phoneNumber: inputClean },
        { username: inputClean },
        { username: usernameClean }
      ]
    }).select("-password");

    if (!contactUser) {
      return res.status(404).json({ message: "User not found with this email, phone, or username" });
    }

    if (contactUser._id.toString() === loggedInUserId.toString()) {
      return res.status(400).json({ message: "You cannot add yourself as a contact" });
    }

    const loggedInUser = await User.findById(loggedInUserId);

    if (!loggedInUser.contacts) {
      loggedInUser.contacts = [];
    }

    if (loggedInUser.contacts.includes(contactUser._id)) {
      return res.status(400).json({ message: "User is already in your contacts" });
    }

    loggedInUser.contacts.push(contactUser._id);
    await loggedInUser.save();

    res.status(200).json({ message: "Contact added successfully", contact: contactUser });
  } catch (error) {
    console.error("Error in addContact: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const loggedInUserId = req.user._id;

    if (!contactId) {
      return res.status(400).json({ message: "Contact ID is required" });
    }

    const loggedInUser = await User.findById(loggedInUserId);
    if (!loggedInUser || !loggedInUser.contacts) {
      return res.status(404).json({ message: "User or contacts not found" });
    }

    loggedInUser.contacts = loggedInUser.contacts.filter(
      (id) => id.toString() !== contactId.toString()
    );
    await loggedInUser.save();

    res.status(200).json({ message: "Contact removed successfully" });
  } catch (error) {
    console.error("Error in removeContact: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const blockContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const loggedInUserId = req.user._id;

    if (!contactId) {
      return res.status(400).json({ message: "Contact ID is required" });
    }

    const loggedInUser = await User.findById(loggedInUserId);
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!loggedInUser.blockedUsers) {
      loggedInUser.blockedUsers = [];
    }

    if (!loggedInUser.blockedUsers.includes(contactId)) {
      loggedInUser.blockedUsers.push(contactId);
    }

    if (loggedInUser.contacts) {
      loggedInUser.contacts = loggedInUser.contacts.filter(
        (id) => id.toString() !== contactId.toString()
      );
    }

    await loggedInUser.save();

    res.status(200).json({ message: "Contact blocked successfully" });
  } catch (error) {
    console.error("Error in blockContact: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async(req,res) =>{
    try{
      const { id:userToChatId }=req.params
      const myId=req.user._id;

      // Mark all unread incoming messages from this user as read
      await Message.updateMany(
        { senderId: userToChatId, receiverId: myId, isRead: false },
        { $set: { isRead: true } }
      );

      // Notify the other user that their messages have been read
      const otherUserSocketId = getReceiverSocketId(userToChatId);
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("messagesRead", {
          readBy: myId,
          senderId: userToChatId,
        });
      }

      const messages = await Message.find({
        $or:[
            {senderId:myId, receiverId:userToChatId},
            {senderId:userToChatId, receiverId:myId}
        ]
      })
      .sort({ createdAt: 1 })
      .populate("storyId");
      
     res.status(200).json(messages)
    }catch(error){
         console.log("Error in getMessages controller: ", error.message)
         res.status(500).json({error: "Internal server error"});
    }
};

export const sendMessage = async(req,res)=>{
   try{
    const {text,image,messageType,storyId}=req.body;
    const {id: receiverId}=req.params;
    const senderId=req.user._id;

    let imageUrl;
    if(image){
        // Robustly extract base64 data — MIME type may include codec params
        // e.g. "data:video/webm;codecs=vp9,opus;base64,XXXX" — simple regex breaks on this
        const base64Index = image.indexOf(';base64,');
        if (base64Index === -1) throw new Error('Invalid base64 data URL');
        const base64Data = image.slice(base64Index + 8);
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadOptions = {
            resource_type: messageType === "audio" || messageType === "video" ? "video" : "image",
        };
        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
            stream.end(buffer);
        });
        imageUrl = uploadResponse.secure_url;
    }
  
    const newMessage=new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        messageType: messageType || (image ? "image" : "text"),
        storyId: storyId || undefined,
    });
    await newMessage.save();

    // Populate storyId before sending via socket
    const populatedMessage = await Message.findById(newMessage._id).populate("storyId");

    // socket.io
    const receiverSocketId =getReceiverSocketId(receiverId);
    if(receiverSocketId){
        io.to(receiverSocketId).emit("newMessage",populatedMessage)
    }
    

    res.status(201).json(populatedMessage)
   }catch(error){
       console.log("Error in sendMessages controllers: ",error.message);
       res.status(500).json({error: "Internal server error"});
   }
};

export const deleteConversation = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.id;

    // Delete all messages exchanged between these two users
    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    });

    res.status(200).json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    console.log("Error in deleteConversation controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const myId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const senderIdStr = message.senderId?._id ? message.senderId._id.toString() : message.senderId?.toString();
    const receiverIdStr = message.receiverId?._id ? message.receiverId._id.toString() : message.receiverId?.toString();

    let canDelete = false;
    if (senderIdStr === myId.toString() || receiverIdStr === myId.toString()) {
      canDelete = true;
    } else if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group && group.creatorId.toString() === myId.toString()) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    await Message.findByIdAndDelete(id);

    // Notify other clients in real-time via Socket.io
    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("groupMessageDeleted", { messageId: id, groupId: message.groupId });
    } else {
      const targetUserId = senderIdStr === myId.toString() ? receiverIdStr : senderIdStr;
      const receiverSocketId = getReceiverSocketId(targetUserId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", id);
      }
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearCallLogs = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: otherId } = req.params;

    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ],
      messageType: { $in: ["voice_call", "video_call"] }
    });

    res.status(200).json({ message: "Call logs cleared successfully" });
  } catch (error) {
    console.log("Error in clearCallLogs controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: "URL parameter is required" });
    }

    if (!url.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ message: "Invalid download source" });
    }

    https.get(url, (fileStream) => {
      if (fileStream.statusCode !== 200) {
        return res.status(fileStream.statusCode).json({ message: "Failed to fetch remote file" });
      }

      const urlParts = url.split("/");
      const filename = urlParts[urlParts.length - 1] || "downloaded-file.jpg";

      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", fileStream.headers["content-type"] || "application/octet-stream");

      fileStream.pipe(res);
    }).on("error", (err) => {
      console.error("HTTP fetch error in downloadFile:", err);
      res.status(500).json({ message: "Error downloading file" });
    });
  } catch (error) {
    console.error("Error in downloadFile controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const syncContacts = async (req, res) => {
  try {
    const { contacts } = req.body; // array of { email, phoneNumber, name }
    const loggedInUserId = req.user._id;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: "Contacts list must be an array" });
    }

    // Format contacts for saving
    const formattedSyncedContacts = contacts.map(c => ({
      name: c.name || "",
      email: c.email ? c.email.trim().toLowerCase() : "",
      phoneNumber: c.phoneNumber ? c.phoneNumber.trim().replace(/[^a-zA-Z0-9+]/g, "") : ""
    })).filter(c => c.email || c.phoneNumber);

    // Save the synced contacts list to the current user
    await User.findByIdAndUpdate(loggedInUserId, {
      $set: { syncedContacts: formattedSyncedContacts }
    });

    const emails = formattedSyncedContacts.map(c => c.email).filter(Boolean);
    const phoneNumbers = formattedSyncedContacts.map(c => c.phoneNumber).filter(Boolean);

    // Find registered users matching any of the emails or phone numbers
    // Excluding the current logged-in user!
    const matchedUsers = await User.find({
      _id: { $ne: loggedInUserId },
      $or: [
        { email: { $in: emails } },
        { phoneNumber: { $in: phoneNumbers } }
      ]
    }).select("-password");

    if (matchedUsers.length > 0) {
      const matchedIds = matchedUsers.map(u => u._id);
      
      // Add all matched users to the current user's contacts
      await User.findByIdAndUpdate(loggedInUserId, {
        $addToSet: { contacts: { $each: matchedIds } }
      });
    }

    res.status(200).json({
      message: "Contacts synchronized successfully",
      matchedCount: matchedUsers.length,
      matchedUsers
    });
  } catch (error) {
    console.error("Error in syncContacts controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};