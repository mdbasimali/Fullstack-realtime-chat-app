import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
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
  Loader2
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
  }, [stream, isVideoOff, callType]);

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden bg-[#1c1f26] border-2 shadow-xl transition-all duration-500 flex items-center justify-center aspect-video md:aspect-[4/3] ${
        isActiveSpeaker 
          ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-[1.01]" 
          : "border-white/10"
      }`}
    >
      {/* Video rendering */}
      {callType === "video" && stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        /* Avatar View */
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {isActiveSpeaker && (
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
            )}
            {profilePic ? (
              <img 
                src={profilePic} 
                alt={fullName} 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/10 shadow-lg animate-fade-in"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-2xl border-2 border-purple-500/20 shadow-lg">
                {fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-white/80">{fullName}</span>
        </div>
      )}

      {/* Status Overlay Indicators */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5 border border-white/5">
        {isLocal && <span className="text-[10px] text-purple-400 font-bold uppercase mr-0.5">You</span>}
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
  } = useCallStore();

  const localVideoRef = React.useCallback((el) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch((err) => console.log("localVideoRef play error:", err));
    }
  }, [localStream]);

  const remoteVideoRef = React.useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch((err) => console.log("remoteVideoRef play error:", err));
    }
  }, [remoteStream]);

  const remoteAudioRef = React.useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch((err) => console.log("remoteAudioRef play error:", err));
    }
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

  if (!isInCall && !isIncomingCall) return null;

  // Minimized View (Bubble)
  if (isMinimized && isInCall) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed top-24 right-6 w-24 h-32 z-[1000] bg-[#1c1f26] rounded-2xl overflow-hidden border-2 border-primary shadow-2xl cursor-pointer animate-in zoom-in fade-in"
      >
        {callType === "video" && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
             <img src={remoteUser?.profilePic || "/avatar.png"} className="w-12 h-12 rounded-full object-cover" alt="user" />
             <span className="text-[10px] text-white/70">{formatDuration(duration)}</span>
          </div>
        )}
        {/* Indicators on bubble */}
        <div className="absolute top-1 right-1 flex gap-1">
          {isMuted && <MicOff size={10} className="text-red-500" />}
          {isVideoOff && <VideoOff size={10} className="text-red-500" />}
        </div>
      </div>
    );
  }

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
          <span className="text-sm font-semibold tracking-widest text-purple-400 uppercase animate-pulse">
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
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping-slow"></div>
            <div className="absolute -inset-10 rounded-full bg-purple-500/10 animate-ping-slower"></div>
            <div className="avatar animate-bounce-slow">
              <div className="w-40 h-40 rounded-full ring-4 ring-purple-500 ring-offset-[#0b141a] ring-offset-4 relative z-10 overflow-hidden shadow-2xl">
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
                className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 shadow-lg animate-bounce hover:scale-110 active:scale-95 transition-all text-white"
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
    const participantsList = [
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
    ];

    return (
      <div className="fixed inset-0 z-[999] flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
        {/* Hidden audio elements for all group participants */}
        {Object.entries(groupPeers).map(([socketId, peer]) => (
          peer.stream && (
            <ParticipantAudioTile key={socketId} stream={peer.stream} />
          )
        ))}

        {/* Top Header */}
        <div className="z-10 flex items-center justify-between w-full px-6 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-4">
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

        {/* Dynamic Video Grid */}
        <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-2 flex items-center justify-center overflow-y-auto">
          <div className={`grid gap-4 w-full h-full max-h-[70vh] ${
            participantsList.length === 1 ? "grid-cols-1" :
            participantsList.length === 2 ? "grid-cols-1 md:grid-cols-2" :
            participantsList.length <= 4 ? "grid-cols-2" :
            "grid-cols-2 md:grid-cols-3"
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
                isLocal={participant.id === "self"}
                callType={callType}
              />
            ))}
          </div>
        </div>

        {/* Bottom Drawer Control Panel */}
        <div className="z-20 bg-[#1c1f26]/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] w-full flex flex-col pt-3 pb-6 px-10">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>

          <div className="flex items-center justify-around w-full mb-4">
            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                isVideoOff 
                  ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                  : "bg-[#2f313d] hover:bg-[#3d4052] text-white"
              }`}
              title={isVideoOff ? "Turn video on" : "Turn video off"}
            >
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>

            {/* Microphone Toggle Button */}
            <button
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                isMuted 
                  ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                  : "bg-[#2f313d] hover:bg-[#3d4052] text-white"
              }`}
              title={isMuted ? "Unmute mic" : "Mute mic"}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Leave / Hang Up Button */}
            <button
              onClick={leaveGroupCall}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 text-white transition-all duration-300 active:scale-95 shadow-lg shadow-red-500/20"
              title="Leave Call"
            >
              <Phone size={26} className="rotate-[135deg]" />
            </button>
          </div>
          <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
      
      {/* Hidden audio element to play remote stream audio in all call types */}
      {remoteStream && (
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline 
          className="hidden" 
        />
      )}

      {/* Video Streams Container */}
      {callType === "video" && (
        <div className="absolute inset-0 bg-black">
          {/* Background View */}
          {callStatus !== "ongoing" || !remoteStream ? (
            localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-all duration-500 ${isMirrored ? "scale-x-[-1]" : ""}`}
              />
            ) : (
              <div className="w-full h-full bg-[#0b141a] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                  <div className="w-32 h-32 rounded-full overflow-hidden border border-white/10 shadow-2xl">
                    <img src={remoteUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover" alt={remoteUser?.fullName} />
                  </div>
                </div>
                {isVideoOff && <span className="text-sm text-white/50">Your camera is off</span>}
              </div>
            )
          ) : (
            /* Ongoing call: Remote stream */
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              {/* Overlay info and toggle */}
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
                <button 
                  onClick={() => setManualFullView(!manualFullView)}
                  className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-xl flex items-center gap-2 text-white border border-white/10 shadow-2xl active:scale-95 transition-all group"
                >
                  {manualFullView ? (
                    <><Minimize2 size={16} className="text-primary" /> <span className="text-[11px] font-medium uppercase tracking-wider">Fit to Screen</span></>
                  ) : (
                    <><Maximize2 size={16} className="text-white/70" /> <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">Zoom to Fill</span></>
                  )}
                </button>
              </div>

              {isRemoteSharingScreen && (
                <div className="absolute top-16 left-0 right-0 z-30 flex justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-b-2xl border-x border-b border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-white/90">
                      {remoteUser?.fullName}'s screen
                    </span>
                  </div>
                </div>
              )}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full transition-all duration-500 ${manualFullView ? "object-contain bg-black shadow-2xl" : "object-cover"}`}
              />
            </div>
          )}

          {/* Local View (Floating PIP) */}
          {callStatus === "ongoing" && remoteStream && localStream && !isVideoOff && (
            <div className={`absolute z-[60] transition-all duration-500 ease-in-out rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl top-24 right-6 ${
              manualFullView ? "w-[85px]" : "w-[100px] md:w-[140px]"
            } aspect-[3/4]`}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isMirrored ? "scale-x-[-1]" : ""}`}
              />
            </div>
          )}
        </div>
      )}

      {/* Audio Call UI background */}
      {callType === "audio" && (
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

      {/* Top Header Overlay */}
      <div className="z-10 flex items-center justify-between w-full px-6 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
        <div className="flex items-center gap-4">
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
            <span className="text-sm font-light text-white/80 drop-shadow-sm">
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
        
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <Info className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Overlay Video Action Buttons (Over mid-bottom section, but above the bottom drawer) */}
      {callType === "video" && (
        <div className="z-10 flex justify-between items-end w-full px-8 mb-6 pointer-events-auto mt-auto">
          {/* Left Side: Screen Share toggle button */}
          {navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia ? (
            <button 
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-all active:scale-95 shadow-lg ${
                isSharingScreen ? "bg-primary text-primary-content" : "bg-black/40 text-white hover:bg-black/60"
              }`}
              title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
            >
              <Monitor size={22} />
            </button>
          ) : (
            <div className="w-12" />
          )}

          {/* Right Side: Camera Switch */}
          <div className="flex flex-col gap-3">
            {/* Switch camera button */}
            <button 
              onClick={switchCamera} 
              className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all active:scale-95 shadow-lg"
              title="Switch Camera"
            >
              <RefreshCw size={20} className={`${facingMode === "user" ? "" : "rotate-180"} transition-transform duration-500`} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Control Drawer/Panel */}
      <div className="z-20 bg-[#1c1f26]/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom duration-500 w-full flex flex-col pt-3 pb-6 px-10">
        {/* Drawer Drag Handle Pill */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>

        {/* Buttons Row */}
        <div className="flex items-center justify-around w-full mb-4">
          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isVideoOff 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-[#2f313d] hover:bg-[#3d4052] text-white"
            }`}
            title={isVideoOff ? "Turn video on" : "Turn video off"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>

          {/* Microphone Toggle Button */}
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isMuted 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30" 
                : "bg-[#2f313d] hover:bg-[#3d4052] text-white"
            }`}
            title={isMuted ? "Unmute mic" : "Mute mic"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* End Call / Hang Up Button */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-red-600 text-white transition-all duration-300 active:scale-95 shadow-lg shadow-red-500/20"
            title="End Call"
          >
            <Phone size={26} className="rotate-[135deg]" />
          </button>
        </div>

        {/* Modern OS Gesture Bar Indicator */}
        <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-1"></div>
      </div>

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
    </div>
  );
};

export default CallModal;
