import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, X, RotateCw, Send, RefreshCw, User, Users, Check, Search, Image
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
  sendGroupMessage
}) => {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [caption, setCaption] = useState("");
  
  // Destinations state
  const [sendToStory, setSendToStory] = useState(false);
  const [sendToActive, setSendToActive] = useState(true);
  const [selectedDMs, setSelectedDMs] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  const videoRef = useRef(null);

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
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedImage]);

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
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

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

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);

    const promises = [];
    const sentDestNames = [];

    try {
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
      toast.success(`Photo sent to: ${sentDestNames.join(", ")}`);
      onClose();
    } catch (err) {
      console.error("Error sending captured image:", err);
      toast.error("Failed to send captured photo.");
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-fade-in select-none">
      <div className="bg-base-100 border border-base-300 w-full max-w-4xl rounded-[28px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90dvh] max-h-[800px] animate-scale-up">
        
        {/* Left Side: Camera viewport or Image preview */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden h-3/5 md:h-full">
          {/* Flash screen overlay */}
          <div 
            className={`absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-200 ${
              flashActive ? "opacity-100" : "opacity-0"
            }`}
          />

          {!capturedImage ? (
            // Live Stream
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
              
              {/* Bottom controls inside camera */}
              <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-8 z-15">
                {/* Flip camera */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer"
                  title="Flip camera"
                >
                  <RotateCw size={20} className="hover:rotate-45 transition-transform" />
                </button>

                {/* Shutter */}
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-[6px] border-white/30 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-90"
                  title="Capture"
                >
                  <div className="w-14 h-14 rounded-full bg-white hover:bg-neutral-100 transition-colors" />
                </button>

                {/* Cancel */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          ) : (
            // Captured Image Preview
            <>
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-cover"
              />
              
              {/* Retake Button overlay */}
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="absolute top-4 left-4 px-4 py-2 bg-black/60 hover:bg-black/85 text-white text-xs font-bold rounded-full flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                Retake
              </button>

              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/85 text-white rounded-full border border-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {/* Right Side: Options & Share settings */}
        <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l border-base-300 p-5 flex flex-col h-2/5 md:h-full bg-base-100/95">
          <header className="pb-3 border-b border-base-300 flex justify-between items-center shrink-0">
            <div className="text-left">
              <h3 className="font-extrabold text-base tracking-tight text-base-content">Share Captured Photo</h3>
              <p className="text-[10px] text-base-content/50">Choose where to send your capture</p>
            </div>
            {capturedImage && (
              <button 
                type="button" 
                onClick={onClose} 
                className="text-base-content/40 hover:text-base-content p-1 hover:bg-base-200 rounded-full transition-colors md:hidden"
              >
                <X size={18} />
              </button>
            )}
          </header>

          {!capturedImage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-base-content/40 py-8">
              <Camera size={36} className="opacity-35 mb-2.5 animate-pulse" />
              <p className="font-semibold text-xs">Awaiting Photo Capture</p>
              <p className="text-[10px] max-w-[200px] mt-0.5">Snaps can be posted to Stories or sent as messages to your contacts.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 py-4 space-y-4">
              
              {/* Caption field */}
              <div className="space-y-1 text-left shrink-0">
                <label className="text-[10px] font-bold text-base-content/60 uppercase tracking-wider px-1">Add Caption</label>
                <input 
                  type="text" 
                  placeholder="Say something about this snap... ✍️"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-base-200 border border-base-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs font-medium"
                />
              </div>

              {/* Destinations List */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-[10px] font-bold text-base-content/60 uppercase tracking-wider px-1 mb-2 text-left shrink-0">Destinations</label>
                
                <div className="flex flex-col space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  
                  {/* Option: Stories */}
                  <div 
                    onClick={() => setSendToStory(prev => !prev)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                      sendToStory 
                        ? "bg-primary/10 border-primary/45 text-primary" 
                        : "bg-base-200/50 border-base-300 text-base-content/80 hover:bg-base-200"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="p-2 rounded-lg bg-gradient-to-tr from-pink-500 to-indigo-500 text-white shadow-sm">
                        <Image size={15} />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs">My Story</h5>
                        <p className="text-[10px] opacity-70">Share status update with friends</p>
                      </div>
                    </div>
                    <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                      sendToStory ? "bg-primary border-primary text-primary-content" : "border-base-content/20"
                    }`}>
                      {sendToStory && <Check size={11} strokeWidth={4} />}
                    </div>
                  </div>

                  {/* Option: Active chat shortcut */}
                  {(selectedUser || selectedGroup) && (
                    <div 
                      onClick={() => setSendToActive(prev => !prev)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        sendToActive 
                          ? "bg-primary/10 border-primary/45 text-primary" 
                          : "bg-base-200/50 border-base-300 text-base-content/80 hover:bg-base-200"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 text-left min-w-0">
                        {selectedUser ? (
                          selectedUser.profilePic ? (
                            <img src={selectedUser.profilePic} className="w-8 h-8 rounded-full object-cover border border-base-300" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-100">
                              {getInitials(selectedUser.fullName)}
                            </div>
                          )
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-100">
                            {getInitials(selectedGroup.name)}
                          </div>
                        )}
                        <div className="truncate">
                          <h5 className="font-bold text-xs truncate">
                            {selectedUser ? selectedUser.fullName : selectedGroup.name}
                          </h5>
                          <p className="text-[10px] opacity-70">Currently active chat</p>
                        </div>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                        sendToActive ? "bg-primary border-primary text-primary-content" : "border-base-content/20"
                      }`}>
                        {sendToActive && <Check size={11} strokeWidth={4} />}
                      </div>
                    </div>
                  )}

                  {/* Search Other Chats */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 border border-base-300 rounded-lg mb-2">
                      <Search size={14} className="text-base-content/40" />
                      <input 
                        type="text" 
                        placeholder="Search other chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none placeholder-base-content/40"
                      />
                    </div>
                    
                    {/* Other DMs List */}
                    {filteredUsers.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        <span className="text-[9px] font-bold text-base-content/40 uppercase tracking-wider block text-left px-1">Contacts</span>
                        {filteredUsers.map(user => {
                          const isChecked = selectedDMs.includes(user._id);
                          return (
                            <div 
                              key={user._id}
                              onClick={() => toggleDMSelection(user._id)}
                              className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                isChecked ? "bg-base-200" : "hover:bg-base-200/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 text-left">
                                {user.profilePic ? (
                                  <img src={user.profilePic} className="w-6.5 h-6.5 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6.5 h-6.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xxs">
                                    {getInitials(user.fullName)}
                                  </div>
                                )}
                                <span className="text-xs font-semibold text-base-content truncate">{user.fullName}</span>
                              </div>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isChecked ? "bg-primary border-primary text-primary-content" : "border-base-content/20"
                              }`}>
                                {isChecked && <Check size={10} strokeWidth={4} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Other Groups List */}
                    {filteredGroups.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-base-content/40 uppercase tracking-wider block text-left px-1">Groups</span>
                        {filteredGroups.map(group => {
                          const isChecked = selectedGroups.includes(group._id);
                          return (
                            <div 
                              key={group._id}
                              onClick={() => toggleGroupSelection(group._id)}
                              className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                isChecked ? "bg-base-200" : "hover:bg-base-200/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 text-left">
                                <div className="w-6.5 h-6.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xxs border border-emerald-100/10">
                                  {getInitials(group.name)}
                                </div>
                                <span className="text-xs font-semibold text-base-content truncate">{group.name}</span>
                              </div>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isChecked ? "bg-primary border-primary text-primary-content" : "border-base-content/20"
                              }`}>
                                {isChecked && <Check size={10} strokeWidth={4} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredUsers.length === 0 && filteredGroups.length === 0 && searchQuery && (
                      <div className="py-6 text-center text-[10px] text-base-content/40">No matching chats found</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-base-300 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="btn btn-sm btn-ghost rounded-full px-4 text-xs normal-case cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending}
                  className="btn btn-sm btn-primary rounded-full px-5 text-xs font-bold normal-case shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isSending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <>
                      <Send size={13} />
                      Send
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CameraModal;
