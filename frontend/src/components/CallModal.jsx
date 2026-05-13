import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
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
  Monitor
} from "lucide-react";

const CallModal = () => {
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
    toggleMic,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
    facingMode,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isMirrored, setIsMirrored] = useState(true);

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

  // Re-bind stream to video element when stream or status changes, or when refs are bound/mounted
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall, callType, callStatus, isVideoOff, isSharingScreen]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isInCall, callType, callStatus, isRemoteSharingScreen]);

  if (!isInCall && !isIncomingCall) return null;

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

  // Active Call UI
  return (
    <div className="fixed inset-0 z-[999] flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden animate-in fade-in duration-300 font-sans select-none">
      
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
                className={`max-w-full max-h-full transition-all duration-500 ${isRemoteSharingScreen ? "object-contain shadow-2xl" : "w-full h-full object-cover"}`}
              />
            </div>
          )}

          {/* Local View (Floating PIP) */}
          {callStatus === "ongoing" && remoteStream && localStream && !isVideoOff && (
            <div className={`absolute z-40 transition-all duration-700 ease-in-out rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl ${
              isRemoteSharingScreen 
                ? "bottom-32 right-4 w-[75px] aspect-[3/4]" 
                : "top-24 right-6 w-[100px] md:w-[140px] aspect-[3/4]"
            }`}>
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
          {/* Hidden audio element to play remote stream */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        </div>
      )}

      {/* Top Header Overlay */}
      <div className="z-10 flex items-center justify-between w-full px-6 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={endCall} 
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            title="End call"
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
        <div className="z-10 flex justify-between items-center w-full px-8 mb-4 pointer-events-auto mt-auto">
          {/* Screen Share toggle button - Only show if supported (usually desktop only) */}
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
            <div className="w-12" /> // Spacer if not supported
          )}

          {/* Switch camera / Flip stream / Mirror option button */}
          <button 
            onClick={switchCamera} 
            className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all active:scale-95 shadow-lg"
            title="Switch Camera (Front/Back)"
          >
            <RefreshCw size={20} className={`${facingMode === "user" ? "" : "rotate-180"} transition-transform duration-500`} />
          </button>
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
