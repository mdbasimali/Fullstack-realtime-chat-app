import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
 { 
  email:{
    type:String,
    required:true,
    unique:true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  fullName:{
    type:String,
    required:true,
  },
  password:{
    type:String,
    required:true,
    minlength:6,
  },
  profilePic:{
    type:String,
    default:""
  },
  phoneNumber:{
    type:String,
    default:""
  },
  about:{
    type:String,
    default:"Available"
  },
  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  pushSubscriptions: [
    {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
  ],
  syncedContacts: [
    {
      name: String,
      email: { type: String, lowercase: true, trim: true },
      phoneNumber: { type: String, trim: true }
    }
  ],
    linkedDevices: [
      {
        sessionId: { type: String, required: true },
        deviceName: { type: String, required: true },
        browser: String,
        os: String,
        ip: String,
        lastActive: { type: Date, default: Date.now }
      }
    ],
    pin: {
      type: String,
      default: ""
    }
  },
{timestamps:true}
 
);

const User = mongoose.model("User",userSchema);

export default User;