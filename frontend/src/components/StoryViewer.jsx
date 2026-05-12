import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const StoryViewer = ({ user, stories, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toLowerCase();
  };

  return (
    <div className="fixed inset-0 bg-black z-[999] flex flex-col justify-between animate-in fade-in duration-300 text-white select-none">
      
      {/* Top Navigation & Progress Bars */}
      <div className="absolute top-0 inset-x-0 p-4 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex gap-1.5 mb-4">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{ 
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center font-bold overflow-hidden">
              {user.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt={user.fullName} />
              ) : (
                getInitials(user.fullName)
              )}
            </div>
            <div className="text-left">
              <h4 className="font-bold text-sm leading-tight">{user.fullName}</h4>
              <p className="text-[10px] text-white/70 uppercase tracking-tighter">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Navigation Tap Areas */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-40 cursor-pointer" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-40 cursor-pointer" onClick={handleNext} />

        {/* Content */}
        <div className="w-full max-w-lg px-4 flex flex-col items-center">
          {currentStory.type === "text" ? (
            <div className="w-full aspect-[9/16] max-h-[80vh] bg-gradient-to-tr from-primary via-purple-600 to-secondary rounded-[2rem] p-8 flex items-center justify-center shadow-2xl">
              <p className="text-2xl md:text-3xl font-bold text-center leading-relaxed whitespace-pre-wrap">
                {currentStory.content}
              </p>
            </div>
          ) : (
            <div className="relative w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
              <img 
                src={currentStory.content} 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl" 
                alt="Story" 
              />
              {currentStory.caption && (
                <div className="absolute bottom-10 inset-x-0 px-6 py-4 bg-black/40 backdrop-blur-md text-white text-center font-medium rounded-t-2xl">
                  {currentStory.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Navigation Buttons (Visible on Hover/Desktop) */}
        <button 
          onClick={handlePrev}
          className="absolute left-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all opacity-0 md:group-hover:opacity-100 hidden md:block"
        >
          <ChevronLeft size={30} />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all opacity-0 md:group-hover:opacity-100 hidden md:block"
        >
          <ChevronRight size={30} />
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-6 text-center text-xs text-white/40 font-medium tracking-wide">
        Tap left to go back • Tap right for next
      </div>
    </div>
  );
};

export default StoryViewer;
