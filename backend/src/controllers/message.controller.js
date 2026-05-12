import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

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

       // Merge contacts and interacted user IDs
       const allTargetUserIds = [...new Set([...contactIds.map(id => id.toString()), ...interactedUserIds.map(id => id.toString())])];

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

export const getMessages = async(req,res) =>{
    try{
      const { id:userToChatId }=req.params
      const myId=req.user._id;

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
    const {text,image}=req.body;
    const {id: receiverId}=req.params;
    const senderId=req.user._id;

    let imageUrl;
    if(image){
        //upload base64 image to cloudinary
        const uploadResponse=await cloudinary.uploader.upload(image);
        imageUrl=uploadResponse.secure_url;
    }
  
    const newMessage=new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
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