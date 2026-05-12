import React, { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, Maximize2, Minimize2 } from "lucide-react";

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
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isInCall]);

  if (!isInCall && !isIncomingCall) return null;

  // Incoming Call UI
  if (isIncomingCall && !isInCall) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-base-200 rounded-[2rem] shadow-2xl p-10 max-w-sm w-full text-center border border-white/10">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            <div className="avatar">
                <div className="w-32 h-32 rounded-full ring-4 ring-primary ring-offset-base-200 ring-offset-4 relative z-10">
                <img src={remoteUser?.profilePic || "/avatar.png"} alt={remoteUser?.fullName} />
                </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-1">{remoteUser?.fullName}</h2>
          <p className="text-primary font-medium animate-pulse mb-10 tracking-widest uppercase text-sm">
            WhatsApp {callType} Call...
          </p>
          
          <div className="flex justify-around items-center w-full">
            <div className="flex flex-col items-center gap-2">
                <button
                onClick={rejectCall}
                className="btn btn-circle btn-error btn-lg shadow-lg hover:scale-110 transition-transform"
                >
                <PhoneOff size={28} />
                </button>
                <span className="text-xs font-semibold opacity-60">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
                <button
                onClick={acceptCall}
                className="btn btn-circle btn-success btn-lg shadow-lg animate-bounce hover:scale-110 transition-transform"
                >
                {callType === "video" ? <Video size={28} /> : <Phone size={28} />}
                </button>
                <span className="text-xs font-semibold opacity-60">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Call UI
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b141a] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>
      
      <div className="relative w-full h-full flex flex-col items-center py-10 px-4">
        
        {/* Call Info (Top) */}
        <div className="z-10 text-center mb-auto">
            <div className="avatar mb-4">
                <div className={`w-24 h-24 rounded-full border-2 border-white/20 ${callType === 'audio' ? 'w-40 h-40' : ''} transition-all duration-700`}>
                    <img src={remoteUser?.profilePic || "/avatar.png"} alt={remoteUser?.fullName} />
                </div>
            </div>
            <h2 className="text-3xl font-semibold mb-1">{remoteUser?.fullName}</h2>
            <div className="flex items-center justify-center gap-2">
                <span className="text-primary text-sm font-bold tracking-widest uppercase animate-pulse">
                    {callStatus}
                </span>
            </div>
        </div>

        {/* Video Streams Container */}
        {callType === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-[#111b21] flex items-center justify-center">
                         <div className="w-40 h-40 rounded-full overflow-hidden opacity-20">
                            <img src={remoteUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover" />
                         </div>
                    </div>
                )}

                {/* Local View (Floating) */}
                {localStream && (
                    <div className="absolute top-10 right-6 w-[120px] md:w-[180px] aspect-[3/4] bg-[#2a3942] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-20">
                         <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
            </div>
        )}

        {/* Audio Visualizer / Large Avatar (for Audio Call) */}
        {callType === "audio" && (
            <div className="flex-1 flex items-center justify-center w-full">
                 <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping-slow"></div>
                    <div className="absolute -inset-10 rounded-full bg-primary/5 animate-ping-slower"></div>
                    <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <img src={remoteUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover" />
                    </div>
                 </div>
            </div>
        )}

        {/* Bottom Controls Bar */}
        <div className="mt-auto z-50 flex items-center gap-4 md:gap-10 px-8 py-6 bg-[#202c33]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl animate-in slide-in-from-bottom-10 duration-700">
           <button className="btn btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10">
                <MicOff size={24} />
           </button>
           
           <button className="btn btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10">
                <VideoOff size={24} />
           </button>

           <button
            onClick={endCall}
            className="btn btn-circle btn-error btn-lg hover:scale-110 transition-transform shadow-[0_0_30px_rgba(239,68,68,0.4)]"
           >
            <PhoneOff size={32} />
           </button>

           <button className="btn btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10">
                <Maximize2 size={24} />
           </button>
           
           <button className="btn btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10">
                <X size={24} />
           </button>
        </div>

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
