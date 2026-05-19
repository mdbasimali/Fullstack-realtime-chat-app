import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"

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
  const { fullName, email, password, username } = req.body;
  try {
    if (!fullName || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ message: "Username already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      username,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();
      await autoLinkMatchedContacts(newUser);

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username,
        profilePic: newUser.profilePic,
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
        const user =await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"Invalid email or password"})
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if(!isPasswordCorrect){
             return res.status(400).json({message:"Invalid email or password"})
        }
        generateToken(user._id,res)

        res.status(200).json({
            _id:user._id,
            fullName:user.fullName,
            email:user.email,
            profilePic:user.profilePic,
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
    const { profilePic, fullName, phoneNumber, username, about } = req.body;
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
    res.status(200).json(req.user);
   }catch(error){
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({message:"Internal Server Error"});

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
    }

    // Generate JWT token
    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
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
  const redirectTo = req.query.redirect_to || "https://chatzone.cloudnexis.in";
  
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
    }

    // Generate JWT token
    generateToken(user._id, res);

    res.redirect(`${redirectTo}/?trigger_sync=true`);

  } catch (error) {
    console.error("Error in googleRedirect controller:", error.message);
    res.redirect(`${redirectTo}/login?error=server_error`);
  }
};



