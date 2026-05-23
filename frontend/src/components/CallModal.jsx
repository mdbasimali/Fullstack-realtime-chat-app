import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  X, 
  ArrowLeft, 
  MoreHorizontal, 
  RefreshCw, 
  Info,
  Monitor,
  Maximize2,
  Minimize2,
  Loader2, UserPlus, Volume2, VolumeX
} from "lucide-react";

const ParticipantAudioTile = React.memo(({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !stream) return;

    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
});

ParticipantAudioTile.displayName = "ParticipantAudioTile";

const ParticipantVideoTile = React.memo(({ 
  id, 
  fullName, 
  profilePic, 
  stream, 
  isVideoOff, 
  isMuted, 
  isActiveSpeaker, 
  isLocal, 
  callType 
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream || isVideoOff || callType !== "video") return;

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    if ('autoPictureInPicture' in videoEl) {
      videoEl.autoPictureInPicture = true;
    }
  }, [stream, isVideoOff, callType]);

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden bg-[#1c1f26] border-2 shadow-xl transition-all duration-500 flex items-center justify-center aspect-video md:aspect-[4/3] ${
        isActiveSpeaker 
          ? "border-blue-500 shadow-[0_0_15px_rgba(0, 122, 255,0.4)] scale-[1.01]" 
          : "border-white/10"
      }`}
    >
      {/* Video rendering or connecting state */}
      {callType === "video" && stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        /* Avatar / Connecting View */
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {!isLocal && !stream ? (
              // Connecting Spinner
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/5 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt={fullName} 
                    className="w-16 h-16 rounded-full object-cover opacity-60"
                  />
                ) : (
                  <span className="text-sm font-bold text-blue-400 opacity-60">
                    {fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              // Normal Avatar
              <>
                {isActiveSpeaker && (
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                )}
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt={fullName} 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/10 shadow-lg animate-fade-in"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-2xl border-2 border-blue-500/20 shadow-lg">
                    {fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </>
            )}
          </div>
          <span className="text-sm font-semibold text-white/80">
            {!isLocal && !stream ? "Connecting..." : fullName}
          </span>
        </div>
      )}

      {/* Status Overlay Indicators */}
      {!isMinimized && (
        <>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5 border border-white/5">
            {isLocal && <span className="text-[10px] text-blue-400 font-bold uppercase mr-0.5">You</span>}
            <span className="truncate max-w-[80px]">{fullName}</span>
          </div>

          <div className="absolute top-3 right-3 flex gap-2">
            {isMuted && (
              <div className="bg-red-500/90 p-1.5 rounded-full text-white shadow-md">
                <MicOff size={12} />
              </div>
            )}
            {isVideoOff && (
              <div className="bg-red-500/90 p-1.5 rounded-full text-white shadow-md">
                <VideoOff size={12} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.fullName === nextProps.fullName &&
    prevProps.profilePic === nextProps.profilePic &&
    prevProps.stream === nextProps.stream &&
    prevProps.isVideoOff === nextProps.isVideoOff &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isActiveSpeaker === nextProps.isActiveSpeaker &&
    prevProps.isLocal === nextProps.isLocal &&
    prevProps.callType === nextProps.callType
  );
});

ParticipantVideoTile.displayName = "ParticipantVideoTile";

const DraggableSelfPreview = React.memo(({ 
  localStream, 
  isVideoOff, 
  isMirrored,
  isMinimized
}) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current && localStream) {
      if (videoRef.current.srcObject !== localStream) {
        videoRef.current.srcObject = localStream;
      }
      videoRef.current.play().catch((err) => console.log("Draggable video play error:", err));
    }
  }, [localStream]);

  // Adjust/clamp position on window resize to ensure preview doesn't float offscreen
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const minX = 16 - initialLeft;
      const maxX = (window.innerWidth - rect.width - 16) - initialLeft;
      const minY = 96 - initialTop;
      const maxY = (window.innerHeight - rect.height - 110) - initialTop;

      setOffset(prev => ({
        x: Math.max(minX, Math.min(maxX, prev.x)),
        y: Math.max(minY, Math.min(maxY, prev.y))
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [offset]);

  if (isVideoOff || !localStream) return null;

  const onStart = (clientX, clientY) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    startOffset.current = { x: offset.x, y: offset.y };
  };

  const onMove = (clientX, clientY) => {
    if (!dragStart.current.x) return; // Not active dragging
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    
    let newX = startOffset.current.x + dx;
    let newY = startOffset.current.y + dy;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const minX = 16 - initialLeft;
      const maxX = (window.innerWidth - rect.width - 16) - initialLeft;
      const minY = 96 - initialTop;
      const maxY = (window.innerHeight - rect.height - 110) - initialTop;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
    }

    setOffset({ x: newX, y: newY });
  };

  const onEnd = () => {
    setIsDragging(false);
    dragStart.current = { x: 0, y: 0 };

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const elementWidth = rect.width;
      const elementHeight = rect.height;

      const paddingX = 16;
      const paddingTop = 96;
      const paddingBottom = 110;

      const minX = paddingX;
      const maxX = screenWidth - elementWidth - paddingX;
      const minY = paddingTop;
      const maxY = screenHeight - elementHeight - paddingBottom;

      const targets = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: minX, y: maxY },
        { x: maxX, y: maxY }
      ];

      let closestTarget = targets[0];
      let minDistance = Infinity;

      targets.forEach(target => {
        const dist = Math.hypot(rect.left - target.x, rect.top - target.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = target;
        }
      });

      const finalX = closestTarget.x - initialLeft;
      const finalY = closestTarget.y - initialTop;

      setOffset({ x: finalX, y: finalY });
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    onStart(e.clientX, e.clientY);
    
    const handleMouseMove = (moveEvent) => {
      onMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      onEnd();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    onEnd();
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${isDragging ? 1.05 : 1})`,
        transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
        touchAction: "none"
      }}
      className={`fixed z-[80] w-[110px] md:w-[140px] aspect-[3/4] rounded-2xl overflow-hidden border-2 shadow-2xl cursor-grab active:cursor-grabbing top-28 right-6 select-none bg-[#1c1f26] pointer-events-auto transition-opacity duration-300 ${
        isDragging 
          ? "border-blue-500 shadow-[0_0_25px_rgba(0, 122, 255,0.6)]" 
          : "border-white/20 hover:border-blue-500/50 shadow-black/80"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover pointer-events-none ${isMirrored ? "scale-x-[-1]" : ""}`}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.localStream === nextProps.localStream &&
    prevProps.isVideoOff === nextProps.isVideoOff &&
    prevProps.isMirrored === nextProps.isMirrored
  );
});

DraggableSelfPreview.displayName = "DraggableSelfPreview";

const DraggableVideoContainer = React.memo(({
  callType,
  remoteStream,
  remoteUser,
  formatDuration,
  duration,
  isMuted,
  isVideoOff,
  setIsMinimized,
  isMinimized,
  remoteVideoRef,
  manualFullView
}) => {
  const containerRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    // Reset offset when returning to full screen
    if (!isMinimized) {
      setOffset({ x: 0, y: 0 });
    }
  }, [isMinimized]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !isMinimized) return;
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const minX = 16 - initialLeft;
      const maxX = (window.innerWidth - rect.width - 16) - initialLeft;
      const minY = 96 - initialTop;
      const maxY = (window.innerHeight - rect.height - 110) - initialTop;

      setOffset(prev => ({
        x: Math.max(minX, Math.min(maxX, prev.x)),
        y: Math.max(minY, Math.min(maxY, prev.y))
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [offset, isMinimized]);

  const onStart = (clientX, clientY) => {
    if (!isMinimized) return;
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: clientX, y: clientY };
    startOffset.current = { x: offset.x, y: offset.y };
  };

  const onMove = (clientX, clientY) => {
    if (!dragStart.current.x || !isMinimized) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true;
    }

    let newX = startOffset.current.x + dx;
    let newY = startOffset.current.y + dy;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const minX = 16 - initialLeft;
      const maxX = (window.innerWidth - rect.width - 16) - initialLeft;
      const minY = 96 - initialTop;
      const maxY = (window.innerHeight - rect.height - 110) - initialTop;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
    }

    setOffset({ x: newX, y: newY });
  };

  const onEnd = () => {
    if (!isMinimized) return;
    setIsDragging(false);
    dragStart.current = { x: 0, y: 0 };

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialLeft = rect.left - offset.x;
      const initialTop = rect.top - offset.y;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const elementWidth = rect.width;
      const elementHeight = rect.height;

      const paddingX = 16;
      const paddingTop = 96;
      const paddingBottom = 110;

      const minX = paddingX;
      const maxX = screenWidth - elementWidth - paddingX;
      const minY = paddingTop;
      const maxY = screenHeight - elementHeight - paddingBottom;

      const targets = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: minX, y: maxY },
        { x: maxX, y: maxY }
      ];

      let closestTarget = targets[0];
      let minDistance = Infinity;

      targets.forEach(target => {
        const dist = Math.hypot(rect.left - target.x, rect.top - target.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = target;
        }
      });

      const finalX = closestTarget.x - initialLeft;
      const finalY = closestTarget.y - initialTop;

      setOffset({ x: finalX, y: finalY });
    }
  };

  const handleMouseDown = (e) => {
    if (!isMinimized) return;
    e.preventDefault();
    onStart(e.clientX, e.clientY);
    
    const handleMouseMove = (moveEvent) => {
      onMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      onEnd();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e) => {
    if (!isMinimized) return;
    if (e.touches.length === 1) {
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isMinimized) return;
    if (e.touches.length === 1) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleClick = (e) => {
    if (!isMinimized) return;
    if (hasMoved.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    setIsMinimized(false);
  };

  const containerClasses = isMinimized
    ? `fixed top-24 right-6 w-24 h-32 z-[1000] bg-[#1c1f26] rounded-2xl overflow-hidden border-2 cursor-pointer select-none animate-in zoom-in fade-in pointer-events-auto ${
        isDragging 
          ? "border-primary shadow-[0_0_25px_rgba(168,85,247,0.6)] cursor-grabbing" 
          : "border-primary shadow-2xl cursor-grab active:cursor-grabbing"
      }`
    : "absolute inset-0 flex items-center justify-center bg-black overflow-hidden z-10 pointer-events-auto";

  const videoClasses = isMinimized
    ? "w-full h-full object-cover pointer-events-none"
    : `w-full h-full transition-all duration-500 ${manualFullView ? "object-contain bg-black shadow-2xl" : "object-cover"}`;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={onEnd}
      onClick={handleClick}
      style={{
        transform: isMinimized ? `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${isDragging ? 1.05 : 1})` : 'none',
        transition: isDragging || !isMinimized ? "none" : "transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
        touchAction: isMinimized ? "none" : "auto"
      }}
      className={containerClasses}
    >
      {callType === "video" && remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={videoClasses}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 pointer-events-none bg-[#1c1f26]">
           <img src={remoteUser?.profilePic || "/avatar.png"} className={isMinimized ? "w-12 h-12 rounded-full object-cover" : "w-32 h-32 rounded-full object-cover"} alt="user" />
           {isMinimized && <span className="text-[10px] text-white/70">{formatDuration(duration)}</span>}
        </div>
      )}
      {/* Indicators on bubble */}
      {isMinimized && (
        <div className="absolute top-1 right-1 flex gap-1 pointer-events-none">
          {isMuted && <MicOff size={10} className="text-red-500" />}
          {isVideoOff && <VideoOff size={10} className="text-red-500" />}
        </div>
      )}

    </div>
  );
});

DraggableVideoContainer.displayName = "DraggableVideoContainer";

const CallModal = () => {
  const { authUser } = useAuthStore();
  const {
    isInCall,
    isIncomingCall,
    callType,
    remoteUser,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    callStatus,
    isMuted,
    isVideoOff,
    isSharingScreen,
    isRemoteSharingScreen,
    isMinimized,
    setIsMinimized,
    toggleMic,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
    facingMode,
    isGroupCall,
    groupPeers,
    activeSpeakerId,
    leaveGroupCall,
    isGroupIncomingCall,
    groupCallInviteData,
    acceptGroupCallInvite,
    rejectGroupCallInvite,
    groupId,
  } = useCallStore();

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const remoteAudioElRef = useRef(null);

  const applyAudioOutput = async (audioEl, speakerOn) => {
    if (!audioEl) return;
    try {
      if (typeof audioEl.setSinkId === "function") {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (speakerOn) {
          // Explicitly try to find a loudspeaker
          const speaker = devices.find(
            (d) => d.kind === "audiooutput" && 
              (d.label.toLowerCase().includes("speaker") && !d.label.toLowerCase().includes("ear"))
          );
          await audioEl.setSinkId(speaker ? speaker.deviceId : "");
        } else {
          // Explicitly try to find an earpiece
          const earpiece = devices.find(
            (d) => d.kind === "audiooutput" &&
              (d.label.toLowerCase().includes("earpiece") ||
               d.label.toLowerCase().includes("receiver") ||
               d.label.toLowerCase().includes("ear speaker"))
          );
          // "default" is often the earpiece during a WebRTC communication session on mobile
          try {
            await audioEl.setSinkId(earpiece ? earpiece.deviceId : "default");
          } catch (e) {
            if (!earpiece) await audioEl.setSinkId(""); // fallback if "default" is invalid
          }
        }
      } else {
        toast.error("Browser doesn't support changing speaker/earpiece.", { id: "audio-err", duration: 3000 });
      }
    } catch (err) {
      console.warn("Audio output routing error:", err);
      if (err.name === 'NotAllowedError') {
        toast.error("Audio routing blocked by browser permissions.", { id: "audio-err" });
      } else {
        toast.error("Cannot toggle earpiece on this device.", { id: "audio-err" });
      }
    }
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    applyAudioOutput(remoteAudioElRef.current, next);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberIdentifier.trim() || !groupId) return;

    setIsSubmitting(true);
    try {
      const { useGroupStore } = await import("../store/useGroupStore");
      const success = await useGroupStore.getState().addMemberToGroup(groupId, memberIdentifier.trim());
      if (success) {
        setMemberIdentifier("");
        setShowAddMemberModal(false);
      }
    } catch (err) {
      console.error("Failed to add participant:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const localVideoRef = React.useCallback((el) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch((err) => console.log("localVideoRef play error:", err));
    }
  }, [localStream]);

  const remoteVideoElRef = useRef(null);

  const remoteVideoRef = React.useCallback((el) => {
    remoteVideoElRef.current = el;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch((err) => console.log("remoteVideoRef play error:", err));
    }
  }, [remoteStream]);

  // Native PiP is handled automatically by el.autoPictureInPicture = true on the pipVideoRef

  const hiddenLocalVideoRef = useRef(null);
  const pipCanvasRef = useRef(null);
  const pipVideoRef = useRef(null);

  // Bind local stream to hidden local video for PiP compositing
  useEffect(() => {
    if (hiddenLocalVideoRef.current && localStream) {
      hiddenLocalVideoRef.current.srcObject = localStream;
      hiddenLocalVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Canvas Compositing Loop for PiP
  useEffect(() => {
    if (callType !== "video" || callStatus !== "ongoing") return;
    
    let animationFrameId;
    const canvas = pipCanvasRef.current;
    const pipVideo = pipVideoRef.current;
    const remoteVideo = remoteVideoElRef.current;
    const localVideo = hiddenLocalVideoRef.current;
    
    if (!canvas || !pipVideo || !remoteVideo || !localVideo) return;
    
    const ctx = canvas.getContext('2d');
    
    // Initialize the PiP stream
    if (!pipVideo.srcObject) {
      const stream = canvas.captureStream(30);
      pipVideo.srcObject = stream;
      pipVideo.play().catch(() => {});
      if ('autoPictureInPicture' in pipVideo) {
        pipVideo.autoPictureInPicture = true;
      }
    }
    
    const drawFrame = () => {
      // Draw remote video as full background
      if (remoteVideo.readyState >= 2) {
        ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#1c1f26';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Overlay local video in the bottom right corner
      if (!isVideoOff && localVideo.readyState >= 2) {
        const pipW = 180;
        const pipH = 240;
        const margin = 24;
        const x = canvas.width - pipW - margin;
        const y = canvas.height - pipH - margin;
        
        ctx.save();
        // Create rounded clip path
        ctx.beginPath();
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + pipW - 16, y);
        ctx.quadraticCurveTo(x + pipW, y, x + pipW, y + 16);
        ctx.lineTo(x + pipW, y + pipH - 16);
        ctx.quadraticCurveTo(x + pipW, y + pipH, x + pipW - 16, y + pipH);
        ctx.lineTo(x + 16, y + pipH);
        ctx.quadraticCurveTo(x, y + pipH, x, y + pipH - 16);
        ctx.lineTo(x, y + 16);
        ctx.quadraticCurveTo(x, y, x + 16, y);
        ctx.closePath();
        ctx.clip();

        if (isMirrored) {
          ctx.translate(x + pipW, y);
          ctx.scale(-1, 1);
          ctx.drawImage(localVideo, 0, 0, pipW, pipH);
        } else {
          ctx.drawImage(localVideo, x, y, pipW, pipH);
        }
        ctx.restore();
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, pipW, pipH);
      }
      
      animationFrameId = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [callType, callStatus, isVideoOff, isMirrored]);

  const remoteAudioRef = React.useCallback((el) => {
    remoteAudioElRef.current = el;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      // Rely on the OS to handle WebRTC routing (usually earpiece) natively upon connection.
      // Only programmatically override the sink ID if the user explicitly toggles the speaker button.
      el.play().catch((err) => console.log("remoteAudioRef play error:", err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStream]);

  const [duration, setDuration] = useState(0);
  const [isMirrored, setIsMirrored] = useState(true);
  const [manualFullView, setManualFullView] = useState(false);

  // Sync manual toggle with remote status
  useEffect(() => {
    if (isRemoteSharingScreen) {
      setManualFullView(true);
    }
  }, [isRemoteSharingScreen]);

  // Sync mirroring: Mirror front camera (selfie) but NOT rear camera or screen share
  useEffect(() => {
    setIsMirrored(facingMode === "user" && !isSharingScreen);
  }, [facingMode, isSharingScreen]);

  useEffect(() => {
    let interval;
    if (callStatus === "ongoing") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isInCall && !isIncomingCall && !isGroupIncomingCall) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch((err) => {
          console.error("Failed to exit PiP on call end:", err);
        });
      }
    }
  }, [isInCall, isIncomingCall, isGroupIncomingCall]);

  if (!isInCall && !isIncomingCall && !isGroupIncomingCall) return null;

  // Minimized View (Bubble) logic is now handled by DraggableVideoContainer continuously.

  // Incoming Group Call UI
  if (isGroupIncomingCall) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
        {/* Blurred background */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-35 scale-110 pointer-events-none" 
          style={{ backgroundImage: `url(${groupCallInviteData?.fromUserPic || "/avatar.png"})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0b141a] pointer-events-none"></div>

        {/* Top Info section */}
        <div className="z-10 text-center pt-20 px-6">
          <span className="text-sm font-semibold tracking-widest text-blue-400 uppercase animate-pulse">
            Incoming Group {callType === "video" ? "Video" : "Voice"} Call
          </span>
          <h2 className="text-3xl font-bold mt-2 text-white drop-shadow-md">
            {groupCallInviteData?.fromUserName || "Group Member"}
          </h2>
          <span className="text-sm text-white/60 block mt-1">Inviting you to join the call...</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="z-10 flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping-slow"></div>
            <div className="absolute -inset-10 rounded-full bg-blue-500/10 animate-ping-slower"></div>
            <div className="avatar animate-bounce-slow">
              <div className="w-40 h-40 rounded-full ring-4 ring-blue-500 ring-offset-[#0b141a] ring-offset-4 relative z-10 overflow-hidden shadow-2xl">
                <img 
                  src={groupCallInviteData?.fromUserPic || "/avatar.png"} 
                  alt="Caller" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="z-10 w-full px-10 pb-16 flex flex-col items-center">
          <div className="flex justify-around items-center w-full max-w-sm mb-10">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={rejectGroupCallInvite}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 shadow-lg hover:scale-110 active:scale-95 transition-all text-white"
                title="Decline"
              >
                <Phone size={28} className="rotate-[135deg]" />
              </button>
              <span className="text-xs font-semibold text-white/70">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptGroupCallInvite}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 shadow-lg animate-bounce hover:scale-110 active:scale-95 transition-all text-white"
                title="Accept & Join"
              >
                {callType === "video" ? <Video size={28} /> : <Phone size={28} />}
              </button>
              <span className="text-xs font-semibold text-white/70">Join</span>
            </div>
          </div>
          <div className="w-32 h-1.5 bg-white/25 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Incoming Call UI
  if (isIncomingCall && !isInCall) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
        {/* Blown-up, blurred background of caller's profile pic */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-35 scale-110 pointer-events-none" 
          style={{ backgroundImage: `url(${remoteUser?.profilePic || "/avatar.png"})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0b141a] pointer-events-none"></div>

        {/* Top Info section */}
        <div className="z-10 text-center pt-20 px-6">
          <span className="text-sm font-semibold tracking-widest text-[#00a884] uppercase animate-pulse">
            Incoming {callType === "video" ? "Video" : "Voice"} Call
          </span>
          <h2 className="text-3xl font-bold mt-2 text-white drop-shadow-md">
            {remoteUser?.fullName || "WhatsApp Friend"}
          </h2>
          <span className="text-sm text-white/60 block mt-1">Ringing...</span>
        </div>

        {/* Pulsing Avatar in center */}
        <div className="z-10 flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping-slow"></div>
            <div className="absolute -inset-10 rounded-full bg-primary/10 animate-ping-slower"></div>
            <div className="avatar animate-bounce-slow">
              <div className="w-40 h-40 rounded-full ring-4 ring-primary ring-offset-[#0b141a] ring-offset-4 relative z-10 overflow-hidden shadow-2xl">
                <img 
                  src={remoteUser?.profilePic || "/avatar.png"} 
                  alt={remoteUser?.fullName} 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel Actions */}
        <div className="z-10 w-full px-10 pb-16 flex flex-col items-center">
          <div className="flex justify-around items-center w-full max-w-sm mb-10">
            {/* Decline Action */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 shadow-lg hover:scale-110 active:scale-95 transition-all text-white"
                title="Decline"
              >
                <Phone size={28} className="rotate-[135deg]" />
              </button>
              <span className="text-xs font-semibold text-white/70">Decline</span>
            </div>

            {/* Accept Action */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-[#00a884] hover:bg-[#008f70] shadow-lg animate-bounce hover:scale-110 active:scale-95 transition-all text-white"
                title="Accept"
              >
                {callType === "video" ? <Video size={28} /> : <Phone size={28} />}
              </button>
              <span className="text-xs font-semibold text-white/70">Accept</span>
            </div>
          </div>

          {/* Modern OS Gesture Bar Indicator */}
          <div className="w-32 h-1.5 bg-white/25 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Group Call View with responsive mesh video/audio grid
  if (isGroupCall) {
    // Collect all participants (including local user "self")
    const participantsList = Object.entries(groupPeers).map(([socketId, peer]) => ({
      id: socketId,
      fullName: peer.fullName,
      profilePic: peer.profilePic,
      stream: peer.stream,
      isVideoOff: false,
      isMuted: false,
    }));
    /* const ignoredList = [
      {
        id: "self",
        fullName: "You",
        profilePic: authUser?.profilePic,
        stream: localStream,
        isVideoOff: isVideoOff,
        isMuted: isMuted,
      },
      ...Object.entries(groupPeers).map(([socketId, peer]) => ({
        id: socketId,
        fullName: peer.fullName,
        profilePic: peer.profilePic,
        stream: peer.stream,
        isVideoOff: false,
        isMuted: false,
      }))
    ]; */

    return (
      <div className="fixed inset-0 z-[999] flex flex-col bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
        {/* Hidden audio elements for all group participants - ONLY for audio calls */}
        {callType === "audio" && Object.entries(groupPeers).map(([socketId, peer]) => (
          peer.stream && (
            <ParticipantAudioTile key={socketId} stream={peer.stream} />
          )
        ))}

        {/* Top Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between w-full px-6 pt-12 pb-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              title="Minimize call"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold tracking-wide text-white drop-shadow-md">
                Group Chat Call
              </h2>
              <span className="text-sm font-light text-white/80">
                {formatDuration(duration)} • {participantsList.length} participant{participantsList.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Video Grid - Spanning Full Height with safe paddings */}
        <div className="absolute inset-0 px-4 pt-28 pb-28 flex items-center justify-center overflow-y-auto">
          {participantsList.length === 0 ? (
            <div className="text-center p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md max-w-sm animate-pulse">
              <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-bold text-white mb-1">Waiting for others</h3>
              <p className="text-xs text-white/55">The call will automatically start as soon as participants join.</p>
            </div>
          ) : (
            <div className={`grid gap-4 w-full h-full max-w-6xl mx-auto items-center justify-center ${
            participantsList.length === 1 ? "grid-cols-1 max-h-[80vh]" :
            participantsList.length === 2 ? "grid-cols-1 md:grid-cols-2 max-h-[80vh]" :
            participantsList.length <= 4 ? "grid-cols-2 max-h-[85vh]" :
            "grid-cols-2 md:grid-cols-3 max-h-[85vh]"
          }`}>
            {participantsList.map((participant) => (
              <ParticipantVideoTile 
                key={participant.id}
                id={participant.id}
                fullName={participant.fullName}
                profilePic={participant.profilePic}
                stream={participant.stream}
                isVideoOff={participant.isVideoOff}
                isMuted={participant.isMuted}
                isActiveSpeaker={activeSpeakerId === participant.id}
                isLocal={false}
                callType={callType}
              />
            ))}
          </div>
          )}
        </div>

        {/* Floating Capsule Control Panel */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#1c1f26]/80 backdrop-blur-xl border border-white/10 rounded-full py-3 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-around z-30 transition-all duration-300">
          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isVideoOff 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isVideoOff ? "Turn video on" : "Turn video off"}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* Microphone Toggle Button */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isMuted 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isMuted ? "Unmute mic" : "Mute mic"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Camera Switch (Flip) for Mobile */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            title="Switch Camera"
          >
            <RefreshCw size={18} className={`${facingMode === "user" ? "" : "rotate-180"} transition-transform duration-500`} />
          </button>

          {/* Speaker / Earpiece Toggle */}
          <button
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isSpeakerOn
                ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isSpeakerOn ? "Switch to Earpiece" : "Switch to Speaker"}
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Add Participant Button */}
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            title="Add Participant"
          >
            <UserPlus size={18} />
          </button>

          {/* Leave / Hang Up Button */}
          <button
            onClick={leaveGroupCall}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 text-white transition-all duration-300 active:scale-95 shadow-lg shadow-red-500/20"
            title="Leave Call"
          >
            <Phone size={20} className="rotate-[135deg]" />
          </button>
        </div>

        {/* Add Participant Modal Overlay */}
        {showAddMemberModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in pointer-events-auto"
            onClick={() => { setShowAddMemberModal(false); setMemberIdentifier(""); }}
          >
            <div 
              className="bg-[#1c1f26] border border-white/10 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="text-left">
                  <h3 className="text-base font-extrabold text-white tracking-tight">Add Call Participant</h3>
                  <p className="text-xs text-white/50 mt-0.5 font-light">Invite by email or username</p>
                </div>
                <button 
                  onClick={() => { setShowAddMemberModal(false); setMemberIdentifier(""); }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </header>

              <form onSubmit={handleAddMemberSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-white/70 tracking-wide uppercase px-1">Colleague Identifier</label>
                  <input 
                    type="text" 
                    placeholder="e.g. john@example.com or john_doe" 
                    value={memberIdentifier}
                    onChange={(e) => setMemberIdentifier(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-2xl bg-black/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-white placeholder-white/30"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddMemberModal(false); setMemberIdentifier(""); }}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/5 text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !memberIdentifier.trim()}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Inviting...</span>
                      </>
                    ) : (
                      <span>Invite</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Floating Draggable Self Video Preview */}
        <DraggableSelfPreview 
          localStream={localStream}
          isVideoOff={isVideoOff}
          isMirrored={isMirrored}
          isMinimized={false}
        />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[999] flex flex-col text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none ${isMinimized ? "pointer-events-none bg-transparent" : "bg-[#0b141a]"}`}>
      
      {/* Audio element to play remote stream audio in audio calls. */}
      {remoteStream && callType === "audio" && (
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline 
          style={{ width: 1, height: 1, position: 'absolute', opacity: 0.01, pointerEvents: 'none' }}
        />
      )}

      {/* Video Streams Container (Continuously Rendered) */}
      {callType === "video" && (
        <div className={`absolute inset-0 ${isMinimized ? "pointer-events-none bg-transparent" : "bg-black"}`}>
          {/* Background View */}
          {callStatus !== "ongoing" || !remoteStream ? (
            localStream && !isVideoOff && !isMinimized ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-all duration-500 ${isMirrored ? "scale-x-[-1]" : ""}`}
              />
            ) : (
              <div className={`w-full h-full flex flex-col items-center justify-center gap-4 ${isMinimized ? "bg-transparent" : "bg-[#0b141a]"}`}>
                {!isMinimized && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                      <div className="w-32 h-32 rounded-full overflow-hidden border border-white/10 shadow-2xl">
                        <img src={remoteUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover" alt={remoteUser?.fullName} />
                      </div>
                    </div>
                    {isVideoOff && <span className="text-sm text-white/50">Your camera is off</span>}
                  </>
                )}
              </div>
            )
          ) : (
            /* Ongoing call: Remote stream wrapper */
            <>
              <DraggableVideoContainer
                callType={callType}
                remoteStream={remoteStream}
                remoteUser={remoteUser}
                formatDuration={formatDuration}
                duration={duration}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                setIsMinimized={setIsMinimized}
                isMinimized={isMinimized}
                remoteVideoRef={remoteVideoRef}
                manualFullView={manualFullView}
              />
              
              {/* Overlay info and toggle (only shown when NOT minimized) */}
              {!isMinimized && (
                <>
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                    <button 
                      onClick={() => setManualFullView(!manualFullView)}
                      className="px-4 py-2 rounded-full bg-black/35 backdrop-blur-xl flex items-center gap-2 text-white border border-white/10 shadow-2xl active:scale-95 transition-all group text-xs font-semibold uppercase tracking-wider"
                    >
                      {manualFullView ? (
                        <><Minimize2 size={14} className="text-primary" /> <span>Fit to Screen</span></>
                      ) : (
                        <><Maximize2 size={14} className="text-white/70" /> <span>Zoom to Fill</span></>
                      )}
                    </button>
                  </div>

                  {isRemoteSharingScreen && (
                    <div className="absolute top-36 left-0 right-0 z-30 flex justify-center pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-white/90">
                          {remoteUser?.fullName}'s screen
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Local View (Floating PIP) */}
          {callStatus === "ongoing" && remoteStream && (
            <DraggableSelfPreview localStream={localStream} isVideoOff={isVideoOff} isMirrored={isMirrored} isMinimized={isMinimized} />
          )}
        </div>
      )}

      {/* Audio Call UI background */}
      {callType === "audio" && !isMinimized && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1c24] to-[#080d11] flex flex-col items-center justify-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping-slow"></div>
            <div className="absolute -inset-10 rounded-full bg-primary/5 animate-ping-slower"></div>
            <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <img src={remoteUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover" alt={remoteUser?.fullName} />
            </div>
          </div>
        </div>
      )}

      {/* When Minimized but it's an Audio Call, render the bubble here because audio doesn't use DraggableVideoContainer */}
      {callType === "audio" && isMinimized && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="fixed top-24 right-6 w-24 h-32 z-[1000] bg-[#1c1f26] rounded-2xl overflow-hidden border-2 border-primary shadow-2xl cursor-pointer animate-in zoom-in fade-in flex flex-col items-center justify-center gap-1"
        >
          <img src={remoteUser?.profilePic || "/avatar.png"} className="w-12 h-12 rounded-full object-cover" alt="user" />
          <span className="text-[10px] text-white/70">{formatDuration(duration)}</span>
          <div className="absolute top-1 right-1 flex gap-1 pointer-events-none">
            {isMuted && <MicOff size={10} className="text-red-500" />}
          </div>
        </div>
      )}

      {/* Rest of full-screen UI controls - Only render when NOT minimized */}
      {!isMinimized && (
      <>
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between w-full px-6 pt-12 pb-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              title="Minimize call"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold tracking-wide text-white drop-shadow-md">
                {remoteUser?.fullName || "Chat User"}
              </h2>
              <span className="text-sm font-light text-white/85 drop-shadow-sm">
                {callStatus === "ongoing" 
                  ? formatDuration(duration) 
                  : callStatus === "calling" 
                    ? "Calling..." 
                    : callStatus === "ringing" 
                      ? "Ringing..." 
                      : callStatus}
              </span>
            </div>
          </div>
          
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors pointer-events-auto">
            <Info className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Floating Capsule Control Panel */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#1c1f26]/80 backdrop-blur-xl border border-white/10 rounded-full py-3 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-around z-30 transition-all duration-300">
          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isVideoOff 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isVideoOff ? "Turn video on" : "Turn video off"}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* Microphone Toggle Button */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isMuted 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isMuted ? "Unmute mic" : "Mute mic"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Camera Switch (Flip) for Mobile */}
          {callType === "video" && (
            <button
              onClick={switchCamera}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              title="Switch Camera"
            >
              <RefreshCw size={18} className={`${facingMode === "user" ? "" : "rotate-180"} transition-transform duration-500`} />
            </button>
          )}

          {/* Speaker / Earpiece Toggle */}
          <button
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isSpeakerOn
                ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isSpeakerOn ? "Switch to Earpiece" : "Switch to Speaker"}
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Screen Share (Desktop only) */}
          {callType === "video" && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && (
            <button 
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
                isSharingScreen 
                  ? "bg-primary text-primary-content border-primary" 
                  : "bg-white/10 border-white/10 text-white hover:bg-white/20"
              }`}
              title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
            >
              <Monitor size={18} />
            </button>
          )}

          {/* End Call / Hang Up Button */}
          <button
            onClick={endCall}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 text-white transition-all duration-300 active:scale-95 shadow-lg shadow-red-500/20"
            title="End Call"
          >
            <Phone size={20} className="rotate-[135deg]" />
          </button>
        </div>
      </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ping-slow {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes ping-slower {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(2); opacity: 0; }
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-ping-slower { animation: ping-slower 4s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}} />

      {/* Hidden elements for Canvas Compositing (Native PiP) */}
      <canvas ref={pipCanvasRef} width={720} height={1280} className="hidden" />
      <video ref={hiddenLocalVideoRef} muted playsInline autoPlay className="hidden" />
      <video 
        ref={pipVideoRef} 
        muted 
        playsInline 
        autoPlay
        style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none' }} 
      />
    </div>
  );
};

export default CallModal;
