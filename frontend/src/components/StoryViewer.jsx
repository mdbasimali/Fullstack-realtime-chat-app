import React, { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useStoryStore } from "../store/useStoryStore";
import { useAuthStore } from "../store/useAuthStore";

const StoryViewer = ({ user, stories, authUser, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [storyDuration, setStoryDuration] = useState(5000);
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);
  
  // Swipe to close states
  const [touchStart, setTouchStart] = useState(null);
  const [translateY, setTranslateY] = useState(0);

  const { deleteStory, viewStory, getStories, stories: storeStories } = useStoryStore();
  const { socket } = useAuthStore();
  const isOwnStory = authUser && user._id === authUser._id;

  // Find dynamic version of stories from store to get updated views
  const myStoriesGroup = storeStories.find(s => {
    const sId = s.user?._id ? s.user._id.toString() : s.user?.toString();
    const uId = user?._id ? user._id.toString() : user?.toString();
    return sId === uId;
  });
  const activeStories = myStoriesGroup ? myStoriesGroup.stories : stories;
  const currentStory = activeStories[currentIndex] || activeStories[0] || stories[0];

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

  // Load latest stories for the owner to ensure view data is fresh
  useEffect(() => {
    if (isOwnStory) {
      getStories();
    }
  }, [isOwnStory, getStories]);

  // Subscribe to real-time views updates via socket
  useEffect(() => {
    if (!socket || !isOwnStory) return;

    const handleStoryViewed = ({ storyId, viewer }) => {
      useStoryStore.setState((state) => {
        const updatedStories = state.stories.map((group) => {
          const groupUserId = group.user?._id ? group.user._id.toString() : group.user?.toString();
          const targetUserId = user?._id ? user._id.toString() : user?.toString();
          
          if (groupUserId === targetUserId) {
            return {
              ...group,
              stories: group.stories.map((story) => {
                const sId = story._id ? story._id.toString() : story.toString();
                if (sId === storyId.toString()) {
                  const exists = story.views.some(v => {
                    const vId = v?._id ? v._id.toString() : v?.toString();
                    return vId === viewer._id.toString();
                  });
                  if (!exists) {
                    return {
                      ...story,
                      views: [...story.views, viewer]
                    };
                  }
                }
                return story;
              })
            };
          }
          return group;
        });
        return { stories: updatedStories };
      });
    };

    socket.on("storyViewed", handleStoryViewed);
    return () => {
      socket.off("storyViewed", handleStoryViewed);
    };
  }, [socket, isOwnStory, user._id]);

  const handleDelete = () => {
    setIsPaused(true);
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    onClose();
    await deleteStory(currentStory._id);
  };

  useEffect(() => {
    if (showDeleteConfirm || showViewsDrawer) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [showDeleteConfirm, showViewsDrawer]);

  useEffect(() => {
    setStoryDuration(5000);
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    setProgress(0);
  }, [storyDuration]);

  useEffect(() => {
    if (isPaused || showViewsDrawer) return;

    const duration = storyDuration;
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
  }, [currentIndex, isPaused, showViewsDrawer, storyDuration]);

  const handleNext = () => {
    if (currentIndex < activeStories.length - 1) {
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

  // Touch handlers for swipe to close
  const onTouchStartSwipe = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
    setIsPaused(true);
  };

  const onTouchMoveSwipe = (e) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientY;
    const diff = currentTouch - touchStart;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const onTouchEndSwipe = () => {
    if (touchStart === null) return;
    setIsPaused(false);
    
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
    setTouchStart(null);
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
      className={`fixed inset-0 z-[999] flex flex-col justify-between animate-in fade-in duration-300 text-white select-none group overscroll-none touch-pan-y ${getStatusBgColor(currentStory)}`}
      style={{ 
        transform: `translateY(${translateY}px)`,
        transition: translateY === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
      onTouchStart={onTouchStartSwipe}
      onTouchMove={onTouchMoveSwipe}
      onTouchEnd={onTouchEndSwipe}
    >
      {/* Top Header Section (Progress + Nav) */}
      <div className={`absolute top-0 inset-x-0 p-4 pt-3 z-50 ${currentStory.type === "text" ? "" : "bg-gradient-to-b from-black/25 to-transparent"}`}>
        {/* Progress Bar Indicators */}
        <div className="flex gap-1.5 mb-3.5">
          {activeStories.map((_, index) => (
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
          ) : currentStory.type === "video" ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                src={currentStory.content} 
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                loop
                controls={false}
                onLoadedMetadata={(e) => {
                  const dur = e.target.duration;
                  if (dur && !isNaN(dur)) {
                    setStoryDuration(Math.min(dur * 1000, 30000));
                  }
                }}
              />
              {currentStory.caption && (
                <div className="absolute bottom-24 inset-x-0 px-6 py-4 bg-black/40 backdrop-blur-sm text-white text-center font-medium rounded-xl max-w-lg mx-auto border border-white/5 shadow-xl">
                  {currentStory.caption}
                </div>
              )}
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
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowViewsDrawer(true);
            }}
            className="flex items-center gap-1.5 bg-[#202c33] hover:bg-[#2a3942] px-[18px] py-2.5 rounded-full border border-white/5 text-white shadow-xl min-w-[70px] justify-center transition-colors active:scale-95 text-white cursor-pointer"
          >
            <Eye size={18} className="text-white/95" />
            <span className="text-sm font-medium leading-none">{currentStory?.views?.length || 0}</span>
          </button>
        </div>
      )}

      {/* Slide-up Views Drawer */}
      {showViewsDrawer && (
        <div 
          className="fixed inset-0 bg-black/40 z-[100] animate-in fade-in duration-200 flex items-end justify-center"
          onClick={() => setShowViewsDrawer(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-[24px] text-slate-800 flex flex-col max-h-[50vh] animate-in slide-in-from-bottom duration-300 shadow-2xl pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <span className="font-bold text-base text-slate-900">
                Viewed by {currentStory?.views?.length || 0}
              </span>
              <button 
                onClick={() => setShowViewsDrawer(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              >
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {!currentStory?.views || currentStory.views.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <span className="text-sm font-medium">No views yet</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentStory.views.map((viewer) => (
                    <div key={viewer._id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-sm text-slate-600 border border-slate-200 shrink-0">
                        {viewer.profilePic ? (
                          <img src={viewer.profilePic} className="w-full h-full object-cover" alt={viewer.fullName} />
                        ) : (
                          <span className="uppercase">{getInitials(viewer.fullName)}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h5 className="font-semibold text-sm text-slate-800 leading-none">{viewer.fullName}</h5>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 8. Delete Confirmation Modal (WhatsApp Style) */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-6 animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
        >
          <div 
            className="bg-white rounded-[28px] w-full max-w-[320px] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[#3b4a54] text-[17px] font-medium mb-8">Delete 1 status update?</p>
            <div className="flex justify-end gap-8">
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[#008069] font-bold text-[15px] hover:opacity-80 transition-opacity uppercase tracking-wide cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={confirmDelete}
                className="text-[#008069] font-bold text-[15px] hover:opacity-80 transition-opacity uppercase tracking-wide cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
