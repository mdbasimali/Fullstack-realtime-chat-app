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
  username:{
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

},
{timestamps:true}
 
);

const User = mongoose.model("User",userSchema);

export default User;