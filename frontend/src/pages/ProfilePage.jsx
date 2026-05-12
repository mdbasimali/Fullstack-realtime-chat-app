import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Image as ImageIcon, Type, X, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// 12 beautiful, high-fidelity custom SVGs matching the cute Signal avatar designs
const SIGNAL_AVATARS = [
  {
    id: "green-face",
    name: "Green Face",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#E8F5E9" />
      <path d="M50,0 A50,50 0 0,1 100,50 L50,100 Z" fill="#81C784" />
      <circle cx="38" cy="45" r="4" fill="#2E7D32" />
      <path d="M35,62 Q45,72 55,62" stroke="#2E7D32" stroke-width="4" stroke-linecap="round" fill="none" />
    </svg>`
  },
  {
    id: "blue-face",
    name: "Blue Face",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#E3F2FD" />
      <path d="M50,0 A50,50 0 0,1 100,50 L50,100 Z" fill="#64B5F6" />
      <circle cx="38" cy="45" r="4" fill="#1565C0" />
      <path d="M35,62 Q45,72 55,62" stroke="#1565C0" stroke-width="4" stroke-linecap="round" fill="none" />
    </svg>`
  },
  {
    id: "orange-face",
    name: "Orange Face",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#FFF3E0" />
      <path d="M50,0 A50,50 0 0,1 100,50 L50,100 Z" fill="#FFB74D" />
      <circle cx="38" cy="45" r="4" fill="#E65100" />
      <path d="M35,62 Q45,72 55,62" stroke="#E65100" stroke-width="4" stroke-linecap="round" fill="none" />
    </svg>`
  },
  {
    id: "orange-fox",
    name: "Orange Fox",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#FFE0B2" />
      <polygon points="28,32 45,52 22,57" fill="#FB8C00" />
      <polygon points="72,32 55,52 78,57" fill="#FB8C00" />
      <polygon points="22,57 78,57 50,88" fill="#FF9800" />
      <polygon points="32,57 68,57 50,78" fill="#FFFFFF" />
      <circle cx="50" cy="82" r="5" fill="#212121" />
      <circle cx="38" cy="52" r="3.5" fill="#212121" />
      <circle cx="62" cy="52" r="3.5" fill="#212121" />
    </svg>`
  },
  {
    id: "tan-dog",
    name: "Tan Dog",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#F5F5DC" />
      <path d="M22,35 Q12,50 22,68" fill="#D2B48C" stroke="#8B4513" stroke-width="2" />
      <path d="M78,35 Q88,50 78,68" fill="#D2B48C" stroke="#8B4513" stroke-width="2" />
      <circle cx="50" cy="56" r="26" fill="#F5DEB3" />
      <circle cx="41" cy="48" r="3.5" fill="#000" />
      <circle cx="59" cy="48" r="3.5" fill="#000" />
      <ellipse cx="50" cy="59" r="7" rx="9" ry="5" fill="#8B4513" />
    </svg>`
  },
  {
    id: "red-wolf",
    name: "Red Wolf",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#FBE9E7" />
      <polygon points="18,40 50,12 82,40" fill="#FF7043" />
      <polygon points="22,46 78,46 50,82" fill="#FF7043" />
      <polygon points="32,46 68,46 50,76" fill="#FFFFFF" />
      <circle cx="38" cy="40" r="3.5" fill="#3E2723" />
      <circle cx="62" cy="40" r="3.5" fill="#3E2723" />
      <polygon points="45,76 55,76 50,82" fill="#3E2723" />
    </svg>`
  },
  {
    id: "blue-toucan",
    name: "Blue Toucan",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#E1F5FE" />
      <circle cx="44" cy="56" r="23" fill="#263238" />
      <circle cx="48" cy="54" r="16" fill="#FFFFFF" />
      <circle cx="44" cy="48" r="3.5" fill="#000000" />
      <path d="M50,40 Q88,45 72,70 Q50,62 50,40" fill="#FFCA28" stroke="#E65100" stroke-width="1" />
      <path d="M66,42 L55,56" stroke="#E65100" stroke-width="2" />
    </svg>`
  },
  {
    id: "pink-sloth",
    name: "Pink Sloth",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#F8BBD0" />
      <ellipse cx="50" cy="56" r="29" rx="29" ry="21" fill="#D7CCC8" />
      <ellipse cx="37" cy="52" r="11" rx="11" ry="8" fill="#8D6E63" transform="rotate(-15 37 52)" />
      <ellipse cx="63" cy="52" r="11" rx="11" ry="8" fill="#8D6E63" transform="rotate(15 63 52)" />
      <circle cx="37" cy="52" r="3.5" fill="#FFFFFF" />
      <circle cx="63" cy="52" r="3.5" fill="#FFFFFF" />
      <ellipse cx="50" cy="59" r="5.5" rx="5.5" ry="3.5" fill="#3E2723" />
    </svg>`
  },
  {
    id: "green-dino",
    name: "Green Dino",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#E8F5E9" />
      <polygon points="28,30 38,20 43,35" fill="#C8E6C9" />
      <polygon points="43,25 53,15 58,30" fill="#C8E6C9" />
      <path d="M28,66 Q28,35 64,35 Q74,35 74,50 Q74,60 59,60 Q54,76 28,76" fill="#4CAF50" />
      <circle cx="56" cy="45" r="3.5" fill="#FFFFFF" />
      <circle cx="56" cy="45" r="1.8" fill="#000000" />
      <circle cx="64" cy="52" r="3.5" fill="#FF8A80" />
    </svg>`
  },
  {
    id: "pink-pig",
    name: "Pink Pig",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#FCE4EC" />
      <polygon points="22,35 18,15 38,25" fill="#F8BBD0" />
      <polygon points="78,35 82,15 62,25" fill="#F8BBD0" />
      <circle cx="50" cy="56" r="26" fill="#FF80AB" />
      <circle cx="41" cy="48" r="3.5" fill="#212121" />
      <circle cx="59" cy="48" r="3.5" fill="#212121" />
      <ellipse cx="50" cy="61" r="8.5" rx="8.5" ry="5.5" fill="#FF4081" />
      <circle cx="47" cy="61" r="2.2" fill="#FFFFFF" />
      <circle cx="53" cy="61" r="2.2" fill="#FFFFFF" />
    </svg>`
  },
  {
    id: "spy-detective",
    name: "Spy Detective",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#ECEFF1" />
      <circle cx="50" cy="56" r="23" fill="#CFD8DC" />
      <circle cx="41" cy="53" r="7.5" stroke="#37474F" stroke-width="3" fill="none" />
      <circle cx="59" cy="53" r="7.5" stroke="#37474F" stroke-width="3" fill="none" />
      <line x1="48.5" y1="53" x2="51.5" y2="53" stroke="#37474F" stroke-width="3" />
      <path d="M23,40 L77,40 L67,20 L33,20 Z" fill="#37474F" />
      <ellipse cx="50" cy="40" r="29" rx="29" ry="4" fill="#37474F" />
    </svg>`
  },
  {
    id: "ghost",
    name: "White Ghost",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#F3E5F5" />
      <path d="M28,76 C28,40 72,40 72,76 C72,81 67,76 62,81 C57,76 52,81 47,76 C42,81 37,76 32,81 Z" fill="#FFFFFF" stroke="#D1C4E9" stroke-width="1.2" />
      <ellipse cx="44" cy="52" r="3" rx="2.2" ry="4.5" fill="#4A148C" />
      <ellipse cx="56" cy="52" r="3" rx="2.2" ry="4.5" fill="#4A148C" />
      <circle cx="50" cy="61" r="2.2" fill="#4A148C" />
    </svg>`
  }
];

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States for interactive editing
  const [selectedImg, setSelectedImg] = useState(authUser?.profilePic || "");
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [fullName, setFullName] = useState(authUser?.fullName || "Masudur Rahaman");
  const [showNameEdit, setShowNameEdit] = useState(false);

  // Extract lowercase initials (e.g. "mr" for Masudur Rahaman)
  const getInitials = (name) => {
    if (!name) return "mr";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toLowerCase();
    }
    return name.slice(0, 2).toLowerCase();
  };

  // Convert SVG string to data URL
  const convertSvgToDataUrl = (svgString) => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  };

  // Trigger file uploader for local photo selection
  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      setSelectedAvatarId(""); // clear avatar selection
      toast.success("Image selected! Click save to apply. 📸");
    };
  };

  // Select one of the beautiful vector avatars
  const handleAvatarSelect = (avatar) => {
    const dataUrl = convertSvgToDataUrl(avatar.svg);
    setSelectedImg(dataUrl);
    setSelectedAvatarId(avatar.id);
  };

  // Handle ultimate form Save
  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter a valid name");
      return;
    }
    try {
      await updateProfile({
        profilePic: selectedImg,
        fullName: fullName
      });
      toast.success("Profile saved successfully! 🌟");
      navigate("/"); // return to home dashboard
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-base-100 select-none overflow-hidden text-base-content">
      
      {/* 1. Sleek Signal Header */}
      <header className="p-4 border-b border-base-300 flex items-center bg-base-100/90 backdrop-blur sticky top-0 z-10">
        <Link 
          to="/" 
          className="p-1 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Cancel"
        >
          <X size={26} />
        </Link>
      </header>

      {/* Main Form scrollable panel */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-lg w-full mx-auto space-y-8 flex flex-col items-center custom-scrollbar">
        
        {/* Hidden File Input for photo uploads */}
        <input 
          type="file"
          ref={fileInputRef}
          id="profile-image-input"
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />

        {/* 2. Massive Avatar Circle */}
        <div className="relative group flex justify-center">
          {selectedImg ? (
            <img 
              src={selectedImg} 
              alt="Profile avatar" 
              className="w-40 h-40 rounded-full object-cover shadow-lg border-4 border-base-100"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-primary flex items-center justify-center font-bold text-5xl shadow-lg border-4 border-base-100 capitalize">
              {getInitials(fullName)}
            </div>
          )}
        </div>

        {/* 3. Action Triad (Camera, Photo, Text) */}
        <div className="flex items-center justify-center gap-6 py-2">
          
          {/* Camera Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button 
              onClick={handlePhotoClick}
              className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 text-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 transition-all shadow-xs"
              title="Camera upload"
            >
              <Camera size={22} className="stroke-[1.8]" />
            </button>
            <span className="text-xs font-semibold text-base-content/60">Camera</span>
          </div>

          {/* Photo Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button 
              onClick={handlePhotoClick}
              className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 text-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 transition-all shadow-xs"
              title="Photo gallery"
            >
              <ImageIcon size={22} className="stroke-[1.8]" />
            </button>
            <span className="text-xs font-semibold text-base-content/60">Photo</span>
          </div>

          {/* Text/Name Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button 
              onClick={() => setShowNameEdit(!showNameEdit)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-xs ${
                showNameEdit 
                  ? "bg-primary text-primary-content border-primary" 
                  : "bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 text-primary border-indigo-100 dark:border-indigo-900/30"
              }`}
              title="Edit Profile Name"
            >
              <Type size={22} className="stroke-[1.8]" />
            </button>
            <span className="text-xs font-semibold text-base-content/60">Text</span>
          </div>

        </div>

        {/* Name input expansion box */}
        {showNameEdit && (
          <div className="w-full bg-base-200 border border-base-300 p-4 rounded-2xl space-y-2 animate-fade-in text-left">
            <label className="text-xxs font-extrabold text-base-content/50 uppercase tracking-wider block">Modify Screen Name</label>
            <input 
              type="text"
              className="w-full px-4 py-2.5 rounded-xl bg-base-100 border border-base-300 font-semibold text-sm outline-none focus:border-primary transition-all"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
        )}

        {/* Divider line */}
        <div className="w-full border-b border-base-300 my-2" />

        {/* 4. Avatars Grid */}
        <div className="w-full text-left space-y-4">
          <div className="grid grid-cols-4 gap-4 px-1 justify-items-center">
            {SIGNAL_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar)}
                className={`w-16 h-16 rounded-full overflow-hidden border-3 transition-all relative ${
                  selectedAvatarId === avatar.id 
                    ? "border-primary scale-105 shadow-md" 
                    : "border-transparent hover:scale-102"
                }`}
                title={avatar.name}
              >
                <div 
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: avatar.svg }}
                />
                
                {/* Visual Check Indicator */}
                {selectedAvatarId === avatar.id && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="bg-primary text-primary-content rounded-full p-0.5">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 5. Bottom floating Save pill button */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          onClick={handleSave}
          disabled={isUpdatingProfile}
          className="btn btn-primary rounded-full px-8 py-3.5 shadow-lg font-bold text-sm tracking-wide normal-case hover:brightness-105 h-auto min-h-0 flex items-center gap-1.5"
        >
          {isUpdatingProfile ? "Saving..." : "Save"}
        </button>
      </div>

    </div>
  );
};

export default ProfilePage;
