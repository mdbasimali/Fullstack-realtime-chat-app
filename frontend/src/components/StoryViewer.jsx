import React, { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useStoryStore } from "../store/useStoryStore";

const StoryViewer = ({ user, stories, authUser, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { deleteStory, viewStory } = useStoryStore();
  const currentStory = stories[currentIndex];
  const isOwnStory = authUser && user._id === authUser._id;

  // Curated list of premium WhatsApp-style background colors for text status updates
  const getStatusBgColor = (story) => {
    if (story.type !== "text") return "bg-black";
    if (story.bgColor && story.bgColor.startsWith("bg-")) return story.bgColor;
    
    const colors = [
      "bg-[#c7a2c9]", // Pastel lavender (matches screenshot)
      "bg-[#7f66de]", // Soft purple
      "bg-[#5c9ca6]", // Soft teal
      "bg-[#df6976]", // Soft coral/red
      "bg-[#e5a05d]", // Soft orange/peach
      "bg-[#5c7da6]", // Soft blue
      "bg-[#6bb38a]", // Soft green
    ];
    
    // Stable selection based on story ID or text content
    const idStr = story._id || "";
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Helper to map the green plus badge ring color to the story background color
  const getBadgeRingColor = (story) => {
    if (story.type !== "text") return "ring-black";
    
    const bgToRing = {
      "bg-[#c7a2c9]": "ring-[#c7a2c9]",
      "bg-[#7f66de]": "ring-[#7f66de]",
      "bg-[#5c9ca6]": "ring-[#5c9ca6]",
      "bg-[#df6976]": "ring-[#df6976]",
      "bg-[#e5a05d]": "ring-[#e5a05d]",
      "bg-[#5c7da6]": "ring-[#5c7da6]",
      "bg-[#6bb38a]": "ring-[#6bb38a]",
    };
    
    const bg = getStatusBgColor(story);
    return bgToRing[bg] || "ring-black";
  };

  // Track story view if it's not the owner's story
  useEffect(() => {
    if (currentStory && authUser && user._id !== authUser._id) {
      viewStory(currentStory._id);
    }
  }, [currentIndex, currentStory, authUser, user._id, viewStory]);

  const handleDelete = async () => {
    if (window.confirm("Delete this status update?")) {
      onClose();
      await deleteStory(currentStory._id);
    }
  };

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;

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
  }, [currentIndex, isPaused]);

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

  const formatStoryTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className={`fixed inset-0 z-[999] flex flex-col justify-between animate-in fade-in duration-300 text-white select-none group ${getStatusBgColor(currentStory)}`}
    >
      {/* Top Header Section (Progress + Nav) */}
      <div className={`absolute top-0 inset-x-0 p-4 pt-3 z-50 ${currentStory.type === "text" ? "" : "bg-gradient-to-b from-black/25 to-transparent"}`}>
        {/* Progress Bar Indicators */}
        <div className="flex gap-1.5 mb-3.5">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-[3px] bg-white/35 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{ 
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Navigation / User Info Row */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 transition-colors -ml-1 text-white"
              title="Go back"
            >
              <ArrowLeft size={24} />
            </button>

            {/* User Avatar with Green plus badge for own stories */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold overflow-hidden">
                {user.profilePic ? (
                  <img src={user.profilePic} className="w-full h-full object-cover" alt={user.fullName} />
                ) : (
                  <span className="uppercase">{getInitials(user.fullName)}</span>
                )}
              </div>
              {isOwnStory && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-[#008069] text-white rounded-full flex items-center justify-center ring-2 ${getBadgeRingColor(currentStory)} text-[10px] font-bold`}>
                  +
                </span>
              )}
            </div>

            {/* User Details */}
            <div className="text-left">
              <h4 className="font-semibold text-[15px] leading-tight text-white">
                {isOwnStory ? "My status" : user.fullName}
              </h4>
              <p className="text-xs text-white/80 mt-0.5">
                {formatStoryTime(currentStory.createdAt)}
              </p>
            </div>
          </div>

          {/* Menu Options */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors text-white ${showMenu ? "bg-white/10" : ""}`}
            >
              <MoreVertical size={24} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-50 py-1 text-left animate-in fade-in zoom-in-95 duration-100">
                {isOwnStory ? (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-white/5 transition-colors font-semibold"
                  >
                    <Trash2 size={16} />
                    <span>Delete status</span>
                  </button>
                ) : (
                  <div className="px-4 py-3 text-xs text-white/60">
                    Active for 24 hours
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center relative cursor-pointer"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Invisible Tap Areas for Navigation */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-40" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-40" onClick={handleNext} />

        {/* Content Wrapper */}
        <div className="w-full h-full flex flex-col items-center justify-center">
          {currentStory.type === "text" ? (
            <div className="w-full max-w-xl px-10 flex items-center justify-center min-h-[40vh]">
              <p className="text-3xl md:text-4xl font-normal text-center leading-relaxed whitespace-pre-wrap select-text text-white">
                {currentStory.content}
              </p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={currentStory.content} 
                className="w-full h-full object-contain" 
                alt="Story" 
              />
              {currentStory.caption && (
                <div className="absolute bottom-24 inset-x-0 px-6 py-4 bg-black/40 backdrop-blur-sm text-white text-center font-medium rounded-xl max-w-lg mx-auto border border-white/5 shadow-xl">
                  {currentStory.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Navigation Buttons (Visible on Desktop hover) */}
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="absolute left-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all opacity-0 md:group-hover:opacity-100 hidden md:block z-50 text-white"
        >
          <ChevronLeft size={30} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="absolute right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all opacity-0 md:group-hover:opacity-100 hidden md:block z-50 text-white"
        >
          <ChevronRight size={30} />
        </button>
      </div>

      {/* Views Pill Badge at Bottom Center */}
      {isOwnStory && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center z-50">
          <div className="flex items-center gap-1.5 bg-[#202c33] px-[18px] py-2.5 rounded-full border border-white/5 text-white shadow-xl min-w-[70px] justify-center">
            <Eye size={18} className="text-white/95" />
            <span className="text-sm font-medium leading-none">{currentStory.views?.length || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
