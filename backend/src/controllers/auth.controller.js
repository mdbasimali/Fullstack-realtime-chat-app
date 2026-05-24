import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import { verifyFirebaseToken } from "../lib/firebase.js";

const autoLinkMatchedContacts = async (newUser) => {
  try {
    const userEmail = newUser.email ? newUser.email.trim().toLowerCase() : "";
    const userPhone = newUser.phoneNumber ? newUser.phoneNumber.trim().replace(/[^a-zA-Z0-9+]/g, "") : "";

    if (!userEmail && !userPhone) return;

    const searchConditions = [];
    if (userEmail) {
      searchConditions.push({ "syncedContacts.email": userEmail });
    }
    if (userPhone) {
      searchConditions.push({ "syncedContacts.phoneNumber": userPhone });
    }

    if (searchConditions.length === 0) return;

    // Find all users who have the new user in their syncedContacts and do not have them in contacts
    const usersToUpdate = await User.find({
      _id: { $ne: newUser._id },
      $or: searchConditions
    });

    if (usersToUpdate.length > 0) {
      await Promise.all(
        usersToUpdate.map(async (u) => {
          if (!u.contacts.some(cid => cid.toString() === newUser._id.toString())) {
            u.contacts.push(newUser._id);
            await u.save();
          }
        })
      );
    }
  } catch (err) {
    console.error("Error in autoLinkMatchedContacts:", err);
  }
};


export const signup = async (req, res) => {
  const { fullName, email, password, username, phoneNumber } = req.body;
  try {
    if (!fullName || !email || !password || !username || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ message: "Username already exists" });

    const cleanPhone = phoneNumber.trim();
    const phoneExists = await User.findOne({ phoneNumber: cleanPhone });
    if (phoneExists) return res.status(400).json({ message: "Phone number already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      username,
      phoneNumber: cleanPhone,
    });

    if (newUser) {
      // generate jwt token here
      const token = generateToken(newUser._id, res);
      await newUser.save();
      await autoLinkMatchedContacts(newUser);

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username,
        phoneNumber: newUser.phoneNumber,
        profilePic: newUser.profilePic,
        token: token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async(req,res)=>{
    const {email,password}=req.body
    try{
        // email field can contain either an email or a username
        const user = await User.findOne({
            $or: [
                { email: email }, 
                { username: { $regex: new RegExp(`^${email}$`, "i") } }
            ]
        });
        if(!user){
            return res.status(400).json({message:"Invalid credentials"})
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if(!isPasswordCorrect){
             return res.status(400).json({message:"Invalid credentials"})
        }
        const token = generateToken(user._id,res)

        res.status(200).json({
            _id:user._id,
            fullName:user.fullName,
            email:user.email,
            profilePic:user.profilePic,
            token: token,
        })
    }catch(error){
        console.log("Error in login controller",error.message);
        res.status(500).json({message:"Internal Server Error"});

    }
};

export const logout =(req,res)=>{
   try{
    res.cookie("jwt", "", {
      maxAge: 0,
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    res.status(200).json({message:"logged out successfully"});

   }catch(error){
     console.log("Error in logout controller",error.message);
     res.status(500).json({message:"Internal Server Error"});
   }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, phoneNumber, username, about, chatColor, chatWallpaper } = req.body;
    const userId = req.user._id;

    const updateData = {};

    if (profilePic) {
      // If it's already uploaded on Cloudinary, do not re-upload
      if (profilePic.startsWith("http")) {
        updateData.profilePic = profilePic;
      } else {
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        updateData.profilePic = uploadResponse.secure_url;
      }
    }

    if (fullName && fullName.trim()) {
      updateData.fullName = fullName;
    }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
    }

    if (username !== undefined) {
      updateData.username = username;
    }

    if (about !== undefined) {
      updateData.about = about;
    }

    if (chatColor !== undefined) {
      updateData.chatColor = chatColor;
    }

    if (chatWallpaper !== undefined) {
      if (chatWallpaper.startsWith("data:")) {
        const uploadResponse = await cloudinary.uploader.upload(chatWallpaper);
        updateData.chatWallpaper = uploadResponse.secure_url;
      } else {
        updateData.chatWallpaper = chatWallpaper;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update parameters provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (updateData.email || updateData.phoneNumber) {
      await autoLinkMatchedContacts(updatedUser);
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const checkAuth = (req,res)=>{
  try{
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1] || req.query.token;
    res.status(200).json({ ...req.user.toObject(), token });
   }catch(error){
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({message:"Internal Server Error"});

    }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    // Check if another user has this username
    const currentUserId = req.user ? req.user._id : null;
    
    const query = { username: { $regex: new RegExp(`^${username}$`, "i") } };
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }
    
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(200).json({ available: false, message: "Username is already taken" });
    }
    
    return res.status(200).json({ available: true, message: "Username is available" });
  } catch (error) {
    console.error("Error in checkUsername controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const googleAuth = async (req, res) => {
  const { credential } = req.body;
  try {
    if (!credential) {
      return res.status(400).json({ message: "Credential token is required" });
    }

    // Verify token with Google's public tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return res.status(400).json({ message: "Invalid Google credential token" });
    }

    const payload = await response.json();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "Google account does not share email information" });
    }

    let user = await User.findOne({ email });
    let isNewUserFlag = false;

    if (!user || !user.pin) {
      isNewUserFlag = true;
    }

    if (!user) {
      // Create user if not registered
      const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      let username = emailPrefix;
      let isUnique = false;
      while (!isUnique) {
        const existing = await User.findOne({ username });
        if (!existing) {
          isUnique = true;
        } else {
          username = emailPrefix + Math.floor(Math.random() * 10000);
        }
      }

      // Generate a secure random password since schema requires password
      const generatedPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      user = new User({
        email,
        fullName: name || emailPrefix,
        username,
        password: hashedPassword,
        profilePic: picture || "",
      });
      await user.save();
      await autoLinkMatchedContacts(user);
    } else {
      // Update profile picture if user doesn't have one but Google provides one
      if (picture && !user.profilePic) {
        user.profilePic = picture;
        await user.save();
      }
    }

    // Generate JWT token
    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      token: token,
      isNewUser: isNewUserFlag,
    });

  } catch (error) {
    console.error("Error in googleAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGoogleClientId = (req, res) => {
  try {
    res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
  } catch (error) {
    console.error("Error in getGoogleClientId controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const googleRedirect = async (req, res) => {
  const { credential } = req.body;
  
  // Resolve frontend URL dynamically based on request host to avoid query params in login_uri
  const host = req.get("host") || "";
  let redirectTo = "https://chatzone.cloudnexis.in";
  if (host.includes("localhost") || host.includes("127.0.0.1") || /^[0-9.x]+/.test(host)) {
    const hostname = host.split(":")[0];
    redirectTo = `http://${hostname}:5173`;
  }
  
  try {
    if (!credential) {
      return res.redirect(`${redirectTo}/login?error=no_credential`);
    }

    // Verify token with Google's public tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return res.redirect(`${redirectTo}/login?error=invalid_token`);
    }

    const payload = await response.json();
    const { email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${redirectTo}/login?error=no_email`);
    }

    let user = await User.findOne({ email });
    let isNewUserFlag = false;

    if (!user || !user.pin) {
      isNewUserFlag = true;
    }

    if (!user) {
      isNewUserFlag = true;
      // Create user if not registered
      const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      let username = emailPrefix;
      let isUnique = false;
      while (!isUnique) {
        const existing = await User.findOne({ username });
        if (!existing) {
          isUnique = true;
        } else {
          username = emailPrefix + Math.floor(Math.random() * 10000);
        }
      }

      // Generate a secure random password since schema requires password
      const generatedPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      user = new User({
        email,
        fullName: name || emailPrefix,
        username,
        password: hashedPassword,
        profilePic: picture || "",
      });
      await user.save();
      await autoLinkMatchedContacts(user);
    } else {
      // Update profile picture if user doesn't have one but Google provides one
      if (picture && !user.profilePic) {
        user.profilePic = picture;
        await user.save();
      }
    }

    // Generate JWT token
    const token = generateToken(user._id, res);

    res.redirect(`${redirectTo}/?token=${token}&trigger_sync=true${isNewUserFlag ? '&isNewUser=true' : ''}`);

  } catch (error) {
    console.error("Error in googleRedirect controller:", error.message);
    res.redirect(`${redirectTo}/login?error=server_error`);
  }
};





import jwt from "jsonwebtoken";
import { qrSessions, io, getReceiverSocketId } from "../lib/socket.js";

export const linkDevice = async (req, res) => {
  try {
    const { sessionId, deviceName, browser, os } = req.body;
    const myId = req.user._id;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const session = qrSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({ message: "QR Code session expired or invalid" });
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Save linked device details to database
    const newDevice = {
      sessionId,
      deviceName: deviceName || `${browser || "Unknown"} on ${os || "Device"}`,
      browser: browser || "Unknown",
      os: os || "Unknown",
      ip: ip || "Unknown",
      lastActive: new Date()
    };

    // Prevent duplicate session id
    await User.findByIdAndUpdate(myId, {
      $pull: { linkedDevices: { sessionId } }
    });

    const user = await User.findByIdAndUpdate(myId, {
      $push: { linkedDevices: newDevice }
    }, { new: true });

    // Generate JWT session token for linked device
    const token = jwt.sign({ userId: myId, sessionId }, process.env.JWT_SECRET, {
      expiresIn: "30d"
    });

    // Notify the desktop client via Socket.io
    io.to(session.socketId).emit("qr:linked", { token, user });

    // Clean up pending session
    qrSessions.delete(sessionId);

    res.status(200).json({ message: "Device linked successfully", device: newDevice });
  } catch (error) {
    console.error("Error in linkDevice:", error);
    res.status(500).json({ message: "Server error linking device" });
  }
};

export const getLinkedDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("linkedDevices");
    res.status(200).json(user.linkedDevices || []);
  } catch (error) {
    console.error("Error in getLinkedDevices:", error);
    res.status(500).json({ message: "Server error fetching linked devices" });
  }
};

export const revokeLinkedDevice = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const myId = req.user._id;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    // Remove from database
    await User.findByIdAndUpdate(myId, {
      $pull: { linkedDevices: { sessionId } }
    });

    // Notify linked device client to logout instantly
    io.emit("session:revoked", { sessionId });

    res.status(200).json({ message: "Device session revoked successfully" });
  } catch (error) {
    console.error("Error in revokeLinkedDevice:", error);
    res.status(500).json({ message: "Server error revoking device session" });
  }
};

export const firebaseLogin = async (req, res) => {
  const { idToken } = req.body;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID Token is required" });
    }

    // Verify token
    const decodedToken = await verifyFirebaseToken(idToken, firebaseProjectId);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number not verified in token" });
    }

    // Normalize phone number (strip whitespace and confirm formatting)
    const normalizedPhone = phoneNumber.trim();

    // Check if user exists in database
    let user = await User.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      // Create a mock email & unique username to satisfy database constraints
      const cleanPhone = normalizedPhone.replace("+", "");
      const mockEmail = `${cleanPhone}@chatzone.in`;
      let username = `user_${cleanPhone}`;

      // Check for duplicate username
      let usernameExists = await User.findOne({ username });
      let counter = 1;
      while (usernameExists) {
        username = `user_${cleanPhone}_${counter}`;
        usernameExists = await User.findOne({ username });
        counter++;
      }

      // Check if email somehow exists
      const emailExists = await User.findOne({ email: mockEmail });
      if (emailExists) {
        return res.status(400).json({ message: "An account with this phone already exists under a virtual email conflict." });
      }

      // Hash a random password (since password is required)
      const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      user = new User({
        email: mockEmail,
        username,
        fullName: `User ${cleanPhone.slice(-10)}`, // Standard clean display name
        password: hashedPassword,
        phoneNumber: normalizedPhone,
        profilePic: "",
      });

      await user.save();
      await autoLinkMatchedContacts(user);
    }

    // Generate local JWT token
    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      phoneNumber: user.phoneNumber,
      token: token,
    });
  } catch (error) {
    console.error("Error in firebaseLogin controller:", error.message);
    res.status(500).json({ message: error.message || "Authentication failed" });
  }
};

export const createPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user._id;

    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin.toString(), salt);

    await User.findByIdAndUpdate(userId, { pin: hashedPin });

    res.status(200).json({ message: "PIN created successfully" });
  } catch (error) {
    console.error("Error in createPin controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePin = async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    const userId = req.user._id;

    if (!oldPin || !newPin) {
      return res.status(400).json({ message: "Both old and new PINs are required" });
    }

    const user = await User.findById(userId);
    
    if (!user.pin) {
      return res.status(400).json({ message: "No PIN is currently set for this account" });
    }

    const isMatch = await bcrypt.compare(oldPin.toString(), user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current PIN" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPin = await bcrypt.hash(newPin.toString(), salt);

    user.pin = hashedNewPin;
    await user.save();

    res.status(200).json({ message: "PIN changed successfully" });
  } catch (error) {
    console.error("Error in changePin controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user._id;

    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }

    const user = await User.findById(userId);
    
    if (!user.pin) {
      return res.status(400).json({ message: "No PIN is currently set for this account" });
    }

    const isMatch = await bcrypt.compare(pin.toString(), user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect PIN" });
    }

    res.status(200).json({ message: "PIN verified successfully" });
  } catch (error) {
    console.error("Error in verifyPin controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

import Group from "../models/group.model.js";
import Story from "../models/story.model.js";
import DeletedAccount from "../models/deletedAccount.model.js";


export const deleteAccount = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify PIN
    if (user.pin) {
      if (!pin) return res.status(400).json({ message: "PIN is required to delete account" });
      const isMatch = await bcrypt.compare(pin.toString(), user.pin);
      if (!isMatch) return res.status(400).json({ message: "Incorrect PIN" });
    }

    // ---- INLINE DELETION (no Redis/BullMQ needed) ----

    // Phase 1: Remove from other users' contacts and blocked lists
    await User.updateMany(
      { contacts: userId },
      { $pull: { contacts: userId } }
    );
    await User.updateMany(
      { blockedUsers: userId },
      { $pull: { blockedUsers: userId } }
    );

    // Phase 2: Groups Cleanup
    const userGroups = await Group.find({ members: userId });
    for (const group of userGroups) {
      group.members = group.members.filter(m => m.toString() !== userId.toString());

      // If user was the creator, transfer ownership to next member
      if (group.creatorId && group.creatorId.toString() === userId.toString()) {
        if (group.members.length > 0) {
          group.creatorId = group.members[0];
        }
      }
      await group.save();
    }

    // Phase 3: Stories Cleanup
    await Story.deleteMany({ userId });

    // Phase 4: Create deleted account record (for audit trail only)
    await DeletedAccount.create({
      userId,
      deletedAt: new Date(),
      scheduledPermanentDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "completed"
    });

    // Phase 5: HARD DELETE — completely remove user from MongoDB
    await User.findByIdAndDelete(userId);

    // Clear JWT cookie
    res.cookie("jwt", "", { maxAge: 0 });

    // Force disconnect socket
    const socketId = getReceiverSocketId(userId);
    if (socketId) {
      io.to(socketId).emit("forceLogout", { reason: "account_deleted" });
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.disconnect(true);
    }

    // Notify connected clients
    io.emit("userDeleted", { userId });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user._id;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    await User.findByIdAndUpdate(userId, { publicKey });

    res.status(200).json({ message: "Public key uploaded successfully" });
  } catch (error) {
    console.error("Error in uploadPublicKey:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
