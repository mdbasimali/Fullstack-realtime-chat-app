import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, X, RotateCw, Send, RefreshCw, User, Users, Check, Search, Image, Zap, ZapOff, ArrowLeft, Palette, Link, ArrowRight
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const CameraModal = ({ 
  isOpen, 
  onClose, 
  authUser,
  selectedUser,
  selectedGroup,
  users = [],
  groups = [],
  postStory,
  sendMessage,
  sendGroupMessage,
  setShowStoryCreator,
  setActiveTab
}) => {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [caption, setCaption] = useState("");
  
  // Text mode states
  const [activeMode, setActiveMode] = useState("camera"); // "camera" | "text"
  const [statusText, setStatusText] = useState("");
  const [textBgColorIndex, setTextBgColorIndex] = useState(0);
  const [showTextSharePanel, setShowTextSharePanel] = useState(false);

  const textBgColors = [
    "bg-[#c7a2c9]", // Pastel lavender
    "bg-[#7f66de]", // Soft purple
    "bg-[#5c9ca6]", // Soft teal
    "bg-[#df6976]", // Soft coral/red
    "bg-[#e5a05d]", // Soft orange/peach
    "bg-[#5c7da6]", // Soft blue
    "bg-[#6bb38a]", // Soft green
  ];
  
  // Destinations state
  const [sendToStory, setSendToStory] = useState(false);
  const [sendToActive, setSendToActive] = useState(true);
  const [selectedDMs, setSelectedDMs] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showShareDrawer, setShowShareDrawer] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    // Stop any existing stream tracks first
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Could not access camera. Please make sure camera permission is granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage && activeMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedImage, activeMode]);

  // Safely bind camera stream to video element whenever stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isOpen, activeMode]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCaption("");
      setSendToStory(false);
      setSendToActive(true);
      setSelectedDMs([]);
      setSelectedGroups([]);
      setSearchQuery("");
      setIsSending(false);
      setShowShareDrawer(false);
      setActiveMode("camera");
      setStatusText("");
      setTextBgColorIndex(0);
      setShowTextSharePanel(false);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    // Trigger flash animation
    const tempFlash = flashActive;
    if (tempFlash) {
      // Simulate real hardware flash by flashing screen white briefly
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 200);
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Mirror image if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(base64Image);
    stopCamera();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);

    const promises = [];
    const sentDestNames = [];

    try {
      if (activeMode === "text") {
        const textContent = statusText.trim();
        if (!textContent) {
          toast.error("Please enter some text status first.");
          setIsSending(false);
          return;
        }

        // 1. Post to Story
        if (sendToStory) {
          promises.push(
            postStory({
              content: textContent,
              type: "text",
              bgColor: textBgColors[textBgColorIndex],
            })
          );
          sentDestNames.push("Story");
        }

        // 2. Send to Active DM Chat
        if (sendToActive && selectedUser) {
          promises.push(
            sendMessage({
              text: textContent,
            })
          );
          sentDestNames.push(selectedUser.fullName);
        }

        // 3. Send to Active Group Chat
        if (sendToActive && selectedGroup) {
          promises.push(
            sendGroupMessage({
              text: textContent,
            })
          );
          sentDestNames.push(selectedGroup.name);
        }

        // 4. Send to Selected Other DMs
        selectedDMs.forEach(userId => {
          if (selectedUser && selectedUser._id === userId) return;
          
          const dmUser = users.find(u => u._id === userId);
          if (dmUser) {
            promises.push(
              axiosInstance.post(`/messages/send/${userId}`, {
                text: textContent,
              })
            );
            sentDestNames.push(dmUser.fullName);
          }
        });

        // 5. Send to Selected Other Groups
        selectedGroups.forEach(groupId => {
          if (selectedGroup && selectedGroup._id === groupId) return;
          
          const groupObj = groups.find(g => g._id === groupId);
          if (groupObj) {
            promises.push(
              axiosInstance.post(`/groups/${groupId}/send`, {
                text: textContent,
              })
            );
            sentDestNames.push(groupObj.name);
          }
        });

        if (promises.length === 0) {
          toast.error("Please select at least one destination to share.");
          setIsSending(false);
          return;
        }

        await Promise.all(promises);
        toast.success(`Status shared successfully!`);
        onClose();

      } else {
        // Camera/Photo Mode
        // 1. Post to Story
        if (sendToStory) {
          promises.push(
            postStory({
              content: capturedImage,
              type: "image",
              caption: caption.trim()
            })
          );
          sentDestNames.push("Story");
        }

        // 2. Send to Active DM Chat
        if (sendToActive && selectedUser) {
          promises.push(
            sendMessage({
              text: caption.trim(),
              image: capturedImage
            })
          );
          sentDestNames.push(selectedUser.fullName);
        }

        // 3. Send to Active Group Chat
        if (sendToActive && selectedGroup) {
          promises.push(
            sendGroupMessage({
              text: caption.trim(),
              image: capturedImage
            })
          );
          sentDestNames.push(selectedGroup.name);
        }

        // 4. Send to Selected Other DMs
        selectedDMs.forEach(userId => {
          // If it's already active chat, don't send twice
          if (selectedUser && selectedUser._id === userId) return;
          
          const dmUser = users.find(u => u._id === userId);
          if (dmUser) {
            promises.push(
              axiosInstance.post(`/messages/send/${userId}`, {
                text: caption.trim(),
                image: capturedImage
              })
            );
            sentDestNames.push(dmUser.fullName);
          }
        });

        // 5. Send to Selected Other Groups
        selectedGroups.forEach(groupId => {
          // If it's already active group, don't send twice
          if (selectedGroup && selectedGroup._id === groupId) return;
          
          const groupObj = groups.find(g => g._id === groupId);
          if (groupObj) {
            promises.push(
              axiosInstance.post(`/groups/${groupId}/send`, {
                text: caption.trim(),
                image: capturedImage
              })
            );
            sentDestNames.push(groupObj.name);
          }
        });

        if (promises.length === 0) {
          toast.error("Please select at least one destination to share.");
          setIsSending(false);
          return;
        }

        await Promise.all(promises);
        toast.success(`Photo shared successfully!`);
        onClose();
      }
    } catch (err) {
      console.error("Error sharing content:", err);
      toast.error("Failed to share.");
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  // Filter other users & groups based on search query
  const filteredUsers = users.filter(u => 
    (!selectedUser || u._id !== selectedUser._id) &&
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    (!selectedGroup || g._id !== selectedGroup._id) &&
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDMSelection = (userId) => {
    setSelectedDMs(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-md text-white select-none flex items-center justify-center animate-in fade-in duration-300">
      <div className="relative w-full h-full md:max-w-[420px] md:max-h-[850px] md:h-[92vh] md:rounded-[40px] md:border-8 md:border-neutral-800 md:shadow-2xl bg-black overflow-hidden flex flex-col justify-between">
      
      {!capturedImage ? (
        // Camera Viewport & Live Stream / Text composer with portrait mockup layout - edge-to-edge
        <div className="flex-1 w-full flex flex-col justify-between h-full">
          
          {activeMode === "camera" ? (
            /* Edge-to-edge camera viewfinder container */
            <div className="relative flex-1 w-full overflow-hidden bg-neutral-950">
              {/* Flash visual overlay */}
              <div 
                className={`absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-200 ${
                  flashActive ? "opacity-100" : "opacity-0"
                }`}
              />

              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />

              {/* Top-Right Flash Icon as in user screenshot */}
              <div className="absolute top-4 right-4 z-30">
                <button 
                  type="button"
                  onClick={() => setFlashActive(!flashActive)}
                  className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer hover:bg-black/50"
                  title="Toggle Flash"
                >
                  {flashActive ? (
                    <Zap size={20} className="text-yellow-400 fill-yellow-400" />
                  ) : (
                    <ZapOff size={20} className="text-white/90" />
                  )}
                </button>
              </div>

              {/* Top-Left Close/Back button for navigation accessibility */}
              <div className="absolute top-4 left-4 z-30">
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer hover:bg-black/50"
                  title="Close"
                >
                  <ArrowLeft size={20} className="text-white" />
                </button>
              </div>

              {/* Bottom Capturing controls (Flip, Shutter, Gallery) overlayed on video */}
              <div className="absolute bottom-6 inset-x-0 flex items-center justify-between px-8 z-30">
                {/* Flip camera Button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 active:scale-90 transition-all cursor-pointer hover:bg-black/55"
                  title="Flip camera"
                >
                  <RefreshCw size={22} className="text-white" />
                </button>

                {/* White Double Shutter Button */}
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-[76px] h-[76px] rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-transform cursor-pointer"
                  title="Capture"
                >
                  <div className="w-[58px] h-[58px] rounded-full bg-white hover:bg-neutral-100 transition-colors" />
                </button>

                {/* Hidden Input for Gallery selection */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
                />

                {/* Gallery Image Picker Button: Styled to look like the solid grey/white container in photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-zinc-700/60 border border-white/20 flex items-center justify-center active:scale-90 transition-transform cursor-pointer hover:bg-zinc-600/70"
                  title="Gallery"
                >
                  <Image size={22} className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            /* Text composer container with custom WhatsApp pastel background color - edge-to-edge */
            <div className={`relative flex-1 w-full flex flex-col justify-between pt-6 transition-colors duration-300 ${textBgColors[textBgColorIndex]}`}>
              {/* Empty top spacer to match mockup */}
              <div className="h-10 z-30 w-full" />

              {/* Center status creator textarea */}
              <div className="flex-1 flex items-center justify-center px-4 w-full">
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Tap to add text"
                  className="w-full bg-transparent text-center text-3xl md:text-4xl font-normal text-white placeholder-white/40 focus:outline-none resize-none px-2 leading-relaxed"
                  rows={4}
                  maxLength={250}
                  autoFocus
                />
              </div>

              {/* Bottom Overlays inside the colored background */}
              <div className="flex justify-between items-center px-6 pb-6 z-30 w-full">
                {/* Bottom Left controls */}
                <div className="flex items-center gap-3">
                  {/* Double circle color picker */}
                  <button
                    type="button"
                    onClick={() => setTextBgColorIndex(prev => (prev + 1) % textBgColors.length)}
                    className="w-[42px] h-[42px] rounded-full border-2 border-white flex items-center justify-center bg-transparent active:scale-95 transition-all cursor-pointer"
                    title="Change background color"
                  >
                    <div className="w-[28px] h-[28px] rounded-full bg-white" />
                  </button>

                  {/* Gray Link button */}
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-white/30"
                    title="Add link"
                  >
                    <Link size={18} className="text-white" />
                  </button>
                </div>

                {/* Bottom Right horizontal line */}
                <div className="w-12 h-[2px] bg-white/90 rounded-full" />
              </div>

              {/* Slide-up Destination Picker Drawer */}
              {showTextSharePanel && (
                <div className="absolute inset-x-4 bottom-4 bg-[#182229]/95 backdrop-blur-lg border border-white/10 rounded-3xl p-4 z-40 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
                  {/* Header with close button */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-sm font-semibold text-white/90">Share to</span>
                    <button 
                      type="button"
                      onClick={() => setShowTextSharePanel(false)}
                      className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 active:scale-95 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Horizontal Destinations select pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Target: Story */}
                    <button
                      type="button"
                      onClick={() => setSendToStory(prev => !prev)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        sendToStory 
                          ? "bg-[#008069] border-[#008069] text-white" 
                          : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500" />
                      <span>My Story</span>
                      {sendToStory && <Check size={12} strokeWidth={3} />}
                    </button>

                    {/* Target: Currently active DM/Group shortcut */}
                    {(selectedUser || selectedGroup) && (
                      <button
                        type="button"
                        onClick={() => setSendToActive(prev => !prev)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          sendToActive 
                            ? "bg-[#008069] border-[#008069] text-white" 
                            : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                        }`}
                      >
                        <span>{selectedUser ? selectedUser.fullName : selectedGroup.name} (Active)</span>
                        {sendToActive && <Check size={12} strokeWidth={3} />}
                      </button>
                    )}

                    {/* Toggle other contacts list drawer */}
                    <button
                      type="button"
                      onClick={() => setShowShareDrawer(!showShareDrawer)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedDMs.length > 0 || selectedGroups.length > 0
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                      }`}
                    >
                      <span>Share with others {selectedDMs.length + selectedGroups.length > 0 && `(${selectedDMs.length + selectedGroups.length})`}</span>
                      <Users size={12} />
                    </button>
                  </div>

                  {/* Collapsible Contacts list drawer */}
                  {showShareDrawer && (
                    <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 max-h-[140px] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-200">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg mb-2">
                        <Search size={12} className="text-white/40" />
                        <input 
                          type="text" 
                          placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-xs focus:outline-none placeholder-white/40 text-white"
                        />
                      </div>

                      {/* Other contacts DMs */}
                      {filteredUsers.length > 0 && (
                        <div className="space-y-1 mb-2">
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-left px-1">Contacts</span>
                          {filteredUsers.map(user => {
                            const isChecked = selectedDMs.includes(user._id);
                            return (
                              <div 
                                key={user._id}
                                onClick={() => toggleDMSelection(user._id)}
                                className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                  isChecked ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                                }`}
                              >
                                <span className="text-xs font-semibold truncate">{user.fullName}</span>
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                  isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20"
                                }`}>
                                  {isChecked && <Check size={8} strokeWidth={4} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Other groups */}
                      {filteredGroups.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-left px-1">Groups</span>
                          {filteredGroups.map(group => {
                            const isChecked = selectedGroups.includes(group._id);
                            return (
                              <div 
                                key={group._id}
                                onClick={() => toggleGroupSelection(group._id)}
                                className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                  isChecked ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                                }`}
                              >
                                <span className="text-xs font-semibold truncate">{group.name}</span>
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                  isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20"
                                }`}>
                                  {isChecked && <Check size={8} strokeWidth={4} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action/Send Button */}
                  <div className="flex items-center justify-end w-full">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={isSending || !statusText.trim() || !(sendToStory || (sendToActive && (selectedUser || selectedGroup)) || selectedDMs.length > 0 || selectedGroups.length > 0)}
                      className="w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008069] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      title="Send"
                    >
                      {isSending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Send size={20} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Panel containing Mode selector and home indicator */}
          <div className="h-20 w-full bg-black flex flex-col justify-center relative px-6">
            <div className="flex items-center justify-between w-full">
              {/* Left spacer to align switcher centrally */}
              <div className="w-10" />

              {/* Mode Switcher */}
              <div className="flex items-center gap-6 text-sm font-semibold">
                <button 
                  type="button"
                  onClick={() => {
                    setActiveMode("camera");
                    setShowShareDrawer(false);
                    setShowTextSharePanel(false);
                  }}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    activeMode === "camera" 
                      ? "bg-white text-black" 
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Camera
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setActiveMode("text");
                    setShowShareDrawer(false);
                    setShowTextSharePanel(false);
                  }}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    activeMode === "text" 
                      ? "bg-white text-black" 
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Text
                </button>
              </div>

              {/* Right Arrow Button (Text mode only) */}
              <div className="w-10 flex justify-end">
                {activeMode === "text" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (statusText.trim()) {
                        setShowTextSharePanel(true);
                      }
                    }}
                    disabled={!statusText.trim()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      statusText.trim() 
                        ? "bg-zinc-700 text-white hover:bg-zinc-600 cursor-pointer" 
                        : "bg-zinc-800/50 text-neutral-600 cursor-not-allowed"
                    }`}
                    title="Continue to share"
                  >
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Home indicator bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
      ) : (
        // Captured Image Preview Screen
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
          <img 
            src={capturedImage} 
            alt="Captured Preview" 
            className="w-full h-full object-cover md:object-contain"
          />

          {/* Top navigation overlay for preview */}
          <div className="absolute top-4 inset-x-0 px-4 flex justify-between items-center z-30">
            <button 
              type="button"
              onClick={() => setCapturedImage(null)}
              className="w-10 h-10 rounded-full bg-black/45 text-white flex items-center justify-center border border-white/5 active:scale-95 transition-transform cursor-pointer"
              title="Retake"
            >
              <ArrowLeft size={22} />
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/45 text-white flex items-center justify-center border border-white/5 active:scale-95 transition-transform cursor-pointer"
              title="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Bottom Share overlay panel */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-4 pb-7 z-30 flex flex-col gap-3.5">
            {/* Horizontal Destinations select pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Target: Story */}
              <button
                type="button"
                onClick={() => setSendToStory(prev => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  sendToStory 
                    ? "bg-[#008069] border-[#008069] text-white" 
                    : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500" />
                <span>My Story</span>
                {sendToStory && <Check size={12} strokeWidth={3} />}
              </button>

              {/* Target: Currently active DM/Group shortcut */}
              {(selectedUser || selectedGroup) && (
                <button
                  type="button"
                  onClick={() => setSendToActive(prev => !prev)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    sendToActive 
                      ? "bg-[#008069] border-[#008069] text-white" 
                      : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                  }`}
                >
                  <span>{selectedUser ? selectedUser.fullName : selectedGroup.name} (Active)</span>
                  {sendToActive && <Check size={12} strokeWidth={3} />}
                </button>
              )}

              {/* Toggle other contacts list drawer */}
              <button
                type="button"
                onClick={() => setShowShareDrawer(!showShareDrawer)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedDMs.length > 0 || selectedGroups.length > 0
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : "bg-black/45 border-white/10 text-white/80 hover:bg-black/60"
                }`}
              >
                <span>Share with others {selectedDMs.length + selectedGroups.length > 0 && `(${selectedDMs.length + selectedGroups.length})`}</span>
                <Users size={12} />
              </button>
            </div>

            {/* Collapsible Contacts list within the preview screen */}
            {showShareDrawer && (
              <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 max-h-[170px] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg mb-2">
                  <Search size={12} className="text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs focus:outline-none placeholder-white/40 text-white"
                  />
                </div>

                {/* Other contacts DMs */}
                {filteredUsers.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-left px-1">Contacts</span>
                    {filteredUsers.map(user => {
                      const isChecked = selectedDMs.includes(user._id);
                      return (
                        <div 
                          key={user._id}
                          onClick={() => toggleDMSelection(user._id)}
                          className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-xs font-semibold truncate">{user.fullName}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20"
                          }`}>
                            {isChecked && <Check size={8} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Other groups */}
                {filteredGroups.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-left px-1">Groups</span>
                    {filteredGroups.map(group => {
                      const isChecked = selectedGroups.includes(group._id);
                      return (
                        <div 
                          key={group._id}
                          onClick={() => toggleGroupSelection(group._id)}
                          className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-xs font-semibold truncate">{group.name}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20"
                          }`}>
                            {isChecked && <Check size={8} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Input & Send Bar */}
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Add a caption... ✍️"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 bg-black/45 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 text-white text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 placeholder-white/40"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !(sendToStory || (sendToActive && (selectedUser || selectedGroup)) || selectedDMs.length > 0 || selectedGroups.length > 0)}
                className="w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008069] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send"
              >
                {isSending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Send size={20} className="ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CameraModal;
