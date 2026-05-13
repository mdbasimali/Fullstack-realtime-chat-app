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
  Info 
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
    toggleMic,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isMirrored, setIsMirrored] = useState(true);

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
  }, [localStream, isInCall, callType, callStatus, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isInCall, callType, callStatus]);

  if (!isInCall && !isIncomingCall) return null;

  // Incoming Call UI
  if (isIncomingCall && !isInCall) {
    const avatarUrl = remoteUser?.profilePic || "/avatar.png";
    return (
      <div className="fixed inset-0 z-[999] flex flex-col justify-between items-center bg-[#0b0e11] text-white overflow-hidden animate-in fade-in duration-500 select-none font-sans py-24 px-6">
        
        {/* Ambient Blurred Background of Caller's Avatar */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-25 pointer-events-none transition-all duration-1000"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* Central Caller Avatar with concentric glowing rings */}
        <div className="flex-1 flex items-center justify-center mt-12">
          <div className="relative flex items-center justify-center">
            {/* Pulsating outer rings */}
            <div className="absolute w-[260px] h-[260px] rounded-full border border-blue-500/10 animate-[ping-slow_3s_infinite]" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-blue-500/20 animate-[ping-medium_2.5s_infinite]" />
            <div className="absolute w-[190px] h-[190px] rounded-full border-2 border-blue-500/35 animate-pulse" />
            
            {/* Inner border glow */}
            <div className="absolute w-[164px] h-[164px] rounded-full bg-blue-500/5 border border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]" />
            
            {/* Perfect circular avatar */}
            <div className="relative w-[150px] h-[150px] rounded-full border-4 border-slate-950/80 overflow-hidden shadow-2xl">
              <img 
                src={avatarUrl} 
                alt={remoteUser?.fullName} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Caller Information */}
        <div className="z-10 text-center mb-16">
          <h2 className="text-4xl font-semibold tracking-wide text-white drop-shadow-lg mb-2 animate-pulse">
            {remoteUser?.fullName || "Incoming Call"}
          </h2>
          <p className="text-white/60 font-light tracking-wide text-base">
            ProStream {callType === "video" ? "Video" : "Voice"} Call...
          </p>
        </div>

        {/* Bottom Call Actions Buttons (Side-by-side, no labels) */}
        <div className="z-10 flex justify-center items-center gap-20 w-full max-w-xs mb-10">
          {/* Decline Button (Soft coral pinkish red) */}
          <button
            onClick={rejectCall}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-[#ff8e86] hover:bg-[#ff7c73] hover:scale-105 active:scale-95 transition-all text-white shadow-[0_10px_25px_-5px_rgba(255,142,134,0.3)]"
            title="Decline"
          >
            <Phone size={28} className="rotate-[135deg]" />
          </button>

          {/* Accept Button (Vibrant turquoise green) */}
          <button
            onClick={acceptCall}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-[#0fb478] hover:bg-[#0da26c] hover:scale-105 active:scale-95 animate-[bounce-subtle_2s_infinite] transition-all text-white shadow-[0_10px_25px_-5px_rgba(15,180,120,0.4)]"
            title="Accept"
          >
            {callType === "video" ? <Video size={28} /> : <Phone size={28} />}
          </button>
        </div>

        {/* Extra styles for custom animations in incoming call screen */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes ping-slow {
            0% { transform: scale(0.9); opacity: 0.6; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes ping-medium {
            0% { transform: scale(0.9); opacity: 0.8; }
            100% { transform: scale(1.25); opacity: 0; }
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}} />

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
            /* Ongoing call: Remote stream is full screen background */
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Local View (Floating PIP) - only shown when call is ongoing AND remoteStream exists AND video is not off */}
          {callStatus === "ongoing" && remoteStream && localStream && !isVideoOff && (
            <div className="absolute top-24 right-6 w-[100px] md:w-[140px] aspect-[3/4] bg-[#1c1f26] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 animate-in fade-in zoom-in duration-300">
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
          {/* Option dots button */}
          <button className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all active:scale-95 shadow-lg">
            <MoreHorizontal size={22} />
          </button>

          {/* Switch camera / Flip stream / Mirror option button */}
          <button 
            onClick={() => setIsMirrored(!isMirrored)} 
            className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all active:scale-95 shadow-lg"
            title="Flip camera view"
          >
            <RefreshCw size={20} className={`${isMirrored ? "rotate-180" : ""} transition-transform duration-500`} />
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
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-ping-slower { animation: ping-slower 4s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}} />
    </div>
  );
};

export default CallModal;
