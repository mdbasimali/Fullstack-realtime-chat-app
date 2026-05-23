import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

const ChatColorWallpaperPage = () => {
  const [dimsWallpaper, setDimsWallpaper] = useState(false);
  const { chatColor, chatWallpaper } = useThemeStore();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/appearance" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Chat color & wallpaper
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        {/* Mockup */}
        <div className="bg-base-200/50 py-8 flex justify-center items-center mb-4">
          <div 
            className="w-[220px] h-[400px] bg-base-100 rounded-[28px] shadow-sm border border-base-200 p-4 flex flex-col relative overflow-hidden chat-wallpaper"
            style={{ 
              background: chatWallpaper !== "default" ? (chatWallpaper.startsWith("data:") || chatWallpaper.startsWith("http") ? `url(${chatWallpaper}) center/cover no-repeat` : chatWallpaper) : undefined 
            }}
          >
            <div className="flex items-center gap-3 mb-6 relative z-10 bg-base-100/60 p-2 -mx-2 -mt-2 rounded-b-xl backdrop-blur-sm">
              <div className="w-7 h-7 rounded-full bg-primary/20"></div>
              <div className="text-[12px] font-bold">Contact name</div>
              <div className="ml-auto flex gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-base-content/30"></div>
                <div className="w-3 h-3 rounded-full border-2 border-base-content/30"></div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
              <div className="self-center px-4 py-1 bg-base-200 rounded-full text-[10px] text-base-content/60 font-medium">Today</div>
              
              <div className="self-start max-w-[85%] px-4 py-4 bg-base-200 rounded-2xl rounded-tl-sm">
                <div className="w-24 h-2.5 bg-base-content/10 rounded-full"></div>
              </div>
              
              <div 
                className="self-end max-w-[85%] px-4 py-5 rounded-2xl rounded-tr-sm"
                style={{ background: chatColor === "auto" ? "#007aff" : chatColor }}
              >
                <div className="w-28 h-2.5 bg-white/40 rounded-full"></div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex items-center gap-3">
              <div className="flex-1 h-8 bg-base-200 rounded-full"></div>
              <div 
                className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[14px]"
                style={{ background: chatColor === "auto" ? "#007aff" : chatColor }}
              >+</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <Link to="/settings/appearance/chat-color/picker" className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Chat color</span>
            <div 
              className="w-5 h-5 rounded-full" 
              style={{ background: chatColor === "auto" ? "#007aff" : chatColor }}
            ></div>
          </Link>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Reset chat colors</span>
          </button>

          {/* Divider */}
          <div className="border-b border-base-200/60 my-2 mx-0" />

          <Link to="/settings/appearance/wallpaper" className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Set wallpaper</span>
          </Link>

          <label className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors cursor-pointer text-left">
            <span className="text-[16px] text-base-content/50 font-medium block">Dark mode dims wallpaper</span>
            <input 
              type="checkbox" 
              className="toggle toggle-md opacity-50"
              checked={dimsWallpaper}
              onChange={(e) => setDimsWallpaper(e.target.checked)}
              disabled
            />
          </label>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Reset wallpapers</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatColorWallpaperPage;
