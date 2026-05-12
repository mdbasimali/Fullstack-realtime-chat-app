import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, ArrowLeft, ShieldCheck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="h-screen w-full flex flex-col bg-base-100 select-none overflow-y-auto">
      {/* Back button and Header */}
      <header className="p-4 border-b border-base-300 flex items-center gap-4 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/" 
          className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Back"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-base-content">
          Profile
        </h1>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-xl w-full mx-auto p-5 pb-16 space-y-6">
        <div className="bg-base-200/50 border border-base-300 rounded-3xl p-6 space-y-8 shadow-xs">
          
          {/* profile-pic upload section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-base-100 shadow-md"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-1 right-1 
                  bg-primary text-primary-content hover:scale-105
                  p-2.5 rounded-full cursor-pointer 
                  transition-all duration-200 shadow-md
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
                title="Update photo"
              >
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-base-content/60">
                {isUpdatingProfile ? "Uploading picture..." : "Click camera button to upload new photo"}
              </p>
            </div>
          </div>

          {/* User Fields */}
          <div className="space-y-4">
            <div className="p-4 bg-base-100 border border-base-300 rounded-2xl flex items-center gap-4 text-left">
              <div className="p-2.5 rounded-xl bg-base-200 text-base-content/70">
                <User size={20} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xxs font-bold text-base-content/40 uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-semibold text-base-content truncate">{authUser?.fullName}</p>
              </div>
            </div>

            <div className="p-4 bg-base-100 border border-base-300 rounded-2xl flex items-center gap-4 text-left">
              <div className="p-2.5 rounded-xl bg-base-200 text-base-content/70">
                <Mail size={20} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xxs font-bold text-base-content/40 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-semibold text-base-content truncate">{authUser?.email}</p>
              </div>
            </div>
          </div>
            
          {/* Account Details Box */}
          <div className="p-5 bg-base-200 border border-base-300 rounded-2xl space-y-4 text-left">
            <h2 className="text-xs font-extrabold text-base-content/60 uppercase tracking-wider">Account Information</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-base-300/60">
                <span className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
                  <Calendar size={14} /> Member Since
                </span>
                <span className="font-bold text-sm text-base-content">
                  {authUser?.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0]}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Account Status
                </span>
                <span className="font-bold text-sm text-green-500">Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
