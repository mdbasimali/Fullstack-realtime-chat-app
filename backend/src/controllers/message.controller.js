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
       const interactedUserIds = [...new Set([...messageUserIds, ...messageUserIds2])];

       const loggedInUser = await User.findById(loggedInUserId);
       const contactIds = loggedInUser.contacts || [];
       const blockedIds = loggedInUser.blockedUsers || [];

       // Merge contacts and interacted user IDs
       const allTargetUserIds = [...new Set([...contactIds.map(id => id.toString()), ...interactedUserIds.map(id => id.toString())])]
         .filter(id => !blockedIds.map(bid => bid.toString()).includes(id));

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

      const messages =await Message.find({
        $or:[
            {senderId:myId, receiverId:userToChatId},
            {senderId:userToChatId, receiverId:myId}
        ]
      })
      
     res.status(200).json(messages)
    }catch(error){
         console.log("Error in getMessages controller: ", error.message)
         res.status(500).json({error: "Internal server error"});
    }
};

export const sendMessage = async(req,res)=>{
   try{
    const {text,image,messageType}=req.body;
    const {id: receiverId}=req.params;
    const senderId=req.user._id;

    let imageUrl;
    if(image){
        // For audio uploads, we must explicitly set resource_type: "video" (Cloudinary stores audio under the video category)
        // to prevent it from defaulting to "raw" which blocks browser streaming.
        const uploadOptions = {
            resource_type: messageType === "audio" ? "video" : "auto"
        };
        const uploadResponse=await cloudinary.uploader.upload(image, uploadOptions);
        imageUrl=uploadResponse.secure_url;
    }
  
    const newMessage=new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        messageType: messageType || (image ? "image" : "text"),
    });
    await newMessage.save();

    // socket.io
    const receiverSocketId =getReceiverSocketId(receiverId);
    if(receiverSocketId){
        io.to(receiverSocketId).emit("newMessage",newMessage)
    }
    

    res.status(201).json(newMessage)
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

    let canDelete = false;
    if (message.senderId.toString() === myId.toString() || message.receiverId?.toString() === myId.toString()) {
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
      const targetUserId = message.senderId.toString() === myId.toString() ? message.receiverId : message.senderId;
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