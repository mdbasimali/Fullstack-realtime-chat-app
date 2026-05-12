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

       res.status(200).json(filteredUsers);
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
      return res.status(400).json({ message: "Email or Phone number is required" });
    }

    const inputClean = contactInput.trim();

    const contactUser = await User.findOne({
      $or: [
        { email: inputClean },
        { phoneNumber: inputClean }
      ]
    }).select("-password");

    if (!contactUser) {
      return res.status(404).json({ message: "User not found with this email or phone number" });
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
       console.lod("Error in sedMessages controllers: ",error.message);
       res.status(500).json({error: "Internal server error"});
   }
};