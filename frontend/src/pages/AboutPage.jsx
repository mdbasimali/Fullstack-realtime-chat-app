import React, { useState } from "react";
import { ArrowLeft, X, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const predefinedAbouts = [
  { emoji: "👋", text: "Speak freely" },
  { emoji: "🤐", text: "Encrypted" },
  { emoji: "🙏", text: "Be kind" },
  { emoji: "☕", text: "Coffee lover" },
  { emoji: "👍", text: "Free to chat" },
  { emoji: "📵", text: "Taking a break" },
  { emoji: "🚀", text: "Working on something new" },
];

const AboutPage = () => {
  const navigate = useNavigate();
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const [aboutText, setAboutText] = useState(authUser?.about || "");

  const handleSave = async () => {
    if (!aboutText.trim()) {
      return toast.error("Please enter a few words about yourself");
    }
    await updateProfile({ about: aboutText.trim() });
    navigate(-1);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-base-100 font-sans">
      {/* Header */}
      <div className="flex items-center p-4 safe-p-top bg-base-100">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-normal text-base-content tracking-tight ml-3">About</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col">
        <div className="w-full flex flex-col">
          
          {/* Custom Input */}
          <div className="flex items-center gap-4 border-b-2 border-[#1e88e5] pb-2 mb-8 mt-4">
            <button className="text-base-content/60 hover:text-base-content transition-colors flex-shrink-0">
              <Smile size={24} />
            </button>
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[16px] text-base-content placeholder-base-content/40"
              placeholder="Write a few words about yourself..."
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
            />
            {aboutText && (
              <button 
                onClick={() => setAboutText("")}
                className="text-base-content/50 hover:text-base-content transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Predefined Options */}
          <div className="space-y-1">
            {predefinedAbouts.map((item, index) => (
              <button
                key={index}
                onClick={() => setAboutText(item.text)}
                className="w-full flex items-center gap-5 py-3 hover:bg-base-200/50 rounded-xl transition-colors text-left"
              >
                <span className="text-[24px] flex-shrink-0">{item.emoji}</span>
                <span className="text-[16px] font-medium text-base-content truncate">{item.text}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Floating Save Button */}
      <div className="p-6 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isUpdatingProfile || !aboutText.trim() || aboutText === authUser?.about}
          className={`font-semibold px-8 py-3 rounded-full transition-colors flex items-center justify-center min-w-[100px] gap-2 ${
            aboutText.trim() && aboutText !== authUser?.about
              ? "bg-[#d4e4f7] text-[#1565c0] hover:bg-[#c3d8f2]"
              : "bg-[#f0f2f5] text-base-content/30 dark:bg-base-200 dark:text-base-content/40"
          }`}
        >
          {isUpdatingProfile ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default AboutPage;
