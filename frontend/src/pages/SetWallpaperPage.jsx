import React, { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const PRESET_COLORS = [
  "#df748a", "#e4966b", "#a19e88",
  "#8aa989", "#1b6243", "#38c3de",
  "#819cb4", "#3e408e", "#ce82eb",
  "#eba2c6", "#64464a", "#9a9a9d",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(to top, #48c6ef 0%, #6f86d6 100%)",
  "linear-gradient(120deg, #f6d365 0%, #fda085 100%)",
];

const SetWallpaperPage = () => {
  const navigate = useNavigate();
  const { setChatWallpaper } = useThemeStore();
  const { updateProfile } = useAuthStore();
  const fileInputRef = useRef(null);

  const handleSelectPreset = (color) => {
    setChatWallpaper(color);
    updateProfile({ chatWallpaper: color });
    toast.success("Wallpaper updated");
    navigate(-1);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Optional: Check size limit (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setChatWallpaper(reader.result); // Save Base64 to state/localStorage instantly
      updateProfile({ chatWallpaper: reader.result }); // Push to backend/cloudinary
      toast.success("Custom wallpaper set");
      navigate(-1);
    };
    reader.onerror = () => {
      toast.error("Failed to load image");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10 border-b border-base-200/50">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-normal text-base-content">
          Chat color & wallpaper
        </h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar">
        
        {/* Choose from photos */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-6 py-6 flex items-center gap-4 hover:bg-base-200 transition-colors cursor-pointer"
        >
          <ImageIcon size={24} className="text-base-content/80" />
          <span className="text-[16px] text-base-content font-medium">Choose from photos</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 mx-0" />

        {/* Presets Grid */}
        <div className="p-6 pb-24">
          <h2 className="text-lg font-bold text-base-content mb-6">Presets</h2>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Default Wallpaper Option */}
            <div 
              onClick={() => handleSelectPreset("default")}
              className="aspect-[4/5] rounded-2xl cursor-pointer hover:opacity-90 active:scale-95 transition-all bg-base-200 border border-base-300 flex items-center justify-center relative overflow-hidden chat-wallpaper"
            >
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center font-bold text-white shadow-sm">
                Default
              </div>
            </div>

            {/* Presets */}
            {PRESET_COLORS.map((color, index) => (
              <div
                key={index}
                onClick={() => handleSelectPreset(color)}
                className="aspect-[4/5] rounded-2xl cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                style={{ background: color }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SetWallpaperPage;
