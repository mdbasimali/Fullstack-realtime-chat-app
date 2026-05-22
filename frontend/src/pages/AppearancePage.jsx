import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const AppearancePage = () => {
  const { theme, setTheme } = useThemeStore();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [fontSize, setFontSize] = useState("Normal");

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Appearance
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2">
        
        <div className="flex flex-col">
          
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Language</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">System default</span>
          </button>

          <button 
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
            onClick={() => setShowThemeSelector(!showThemeSelector)}
          >
            <span className="text-[16px] text-base-content font-medium">Theme</span>
            <span className="text-[14px] text-base-content/60 mt-0.5 capitalize">{theme}</span>
          </button>

          {/* Theme Selector Grid (Expandable) */}
          {showThemeSelector && (
            <div className="px-6 py-2 bg-base-200/30">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${theme === t ? "border-primary bg-primary/10" : "border-base-300 hover:bg-base-100"}`}
                  >
                    <div className="relative h-6 w-full rounded-md overflow-hidden" data-theme={t}>
                      <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                        <div className="rounded bg-primary size-2"></div>
                        <div className="rounded bg-secondary size-2"></div>
                        <div className="rounded bg-accent size-2"></div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-center capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link to="/settings/appearance/chat-color" className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Chat color & wallpaper</span>
          </Link>

          <Link to="/settings/appearance/app-icon" className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">App Icon</span>
          </Link>

          <button 
            onClick={() => setShowFontSizeModal(true)}
            className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-base-content font-medium">Message font size</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">{fontSize}</span>
          </button>

          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Navigation bar size</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">Normal</span>
          </button>

        </div>
      </div>

      {/* Font Size Modal */}
      {showFontSizeModal && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowFontSizeModal(false)}
        >
          <div 
            className="bg-base-200 w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl animate-slide-up sm:animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-[20px] font-normal text-base-content">Message font size</h3>
            </div>
            
            <div className="flex flex-col pb-4">
              {["Small", "Normal", "Large", "Extra large"].map((size) => (
                <label 
                  key={size} 
                  className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-base-300/50 cursor-pointer transition-colors"
                >
                  <input 
                    type="radio" 
                    name="fontSize" 
                    className="radio radio-primary radio-md border-2" 
                    checked={fontSize === size}
                    onChange={() => {
                      setFontSize(size);
                      setTimeout(() => setShowFontSizeModal(false), 200);
                    }}
                  />
                  <span className="text-[16px] text-base-content">{size}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearancePage;
