import React, { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-base-100 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-bounce-in">
          <div className="avatar mb-4">
            <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={remoteUser?.profilePic || "/avatar.png"} alt={remoteUser?.fullName} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">{remoteUser?.fullName}</h2>
          <p className="text-base-content/70 mb-8">Incoming {callType} call...</p>
          <div className="flex justify-center gap-6">
            <button
              onClick={rejectCall}
              className="btn btn-circle btn-error btn-lg"
              title="Reject"
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={acceptCall}
              className="btn btn-circle btn-success btn-lg animate-pulse"
              title="Accept"
            >
              {callType === "video" ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Call UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-500">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] mx-auto flex flex-col p-4">
        {/* Remote Video (Background) */}
        <div className="relative flex-1 bg-neutral rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          {callType === "video" ? (
            remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-neutral-content">
                <div className="avatar">
                    <div className="w-32 h-32 rounded-full">
                        <img src={remoteUser?.profilePic || "/avatar.png"} alt={remoteUser?.fullName} />
                    </div>
                </div>
                <p className="text-xl font-medium">{callStatus === 'calling' ? 'Calling...' : 'Connecting...'}</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-6 text-neutral-content">
              <div className="avatar animate-pulse">
                <div className="w-48 h-48 rounded-full ring ring-primary">
                  <img src={remoteUser?.profilePic || "/avatar.png"} alt={remoteUser?.fullName} />
                </div>
              </div>
              <h2 className="text-3xl font-bold">{remoteUser?.fullName}</h2>
              <p className="text-xl opacity-70 capitalize">{callStatus}...</p>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {callType === "video" && localStream && (
            <div className="absolute top-6 right-6 w-1/4 max-w-[240px] aspect-video bg-base-300 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl z-10">
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

        {/* Controls Overlay */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-base-100/20 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
          {/* <button className="btn btn-circle btn-ghost text-white hover:bg-white/20">
            <Mic size={24} />
          </button>
          <button className="btn btn-circle btn-ghost text-white hover:bg-white/20">
            <VideoOff size={24} />
          </button> */}
          <button
            onClick={endCall}
            className="btn btn-circle btn-error btn-lg hover:scale-110 transition-transform shadow-lg"
          >
            <PhoneOff size={32} />
          </button>
        </div>

        {/* Remote Info (Top Left) */}
        <div className="absolute top-10 left-10 text-white drop-shadow-lg">
            <h3 className="text-2xl font-bold">{remoteUser?.fullName}</h3>
            <div className="flex items-center gap-2 opacity-80">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium uppercase tracking-wider">{callStatus}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
