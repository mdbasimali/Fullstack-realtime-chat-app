import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.voiparound.com" },
    { urls: "stun:stun.voipbuster.com" },
    { urls: "stun:stun.voipstunt.com" },
    { urls: "stun:stun.voxgratia.org" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
  iceCandidatePoolSize: 20,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const RINGING_SOUND = new Audio("https://assets.mixkit.co/active_storage/sfx/1357/1357-preview.mp3"); // Classic 'Cring Cring' bell ring
const CALLING_SOUND = new Audio("https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3"); // Standard dial tone
RINGING_SOUND.loop = true;
CALLING_SOUND.loop = true;

const playSound = (type) => {
    try {
        stopAllSounds(); // Stop any existing sound before playing new one
        if (type === "ringing") {
            RINGING_SOUND.currentTime = 0;
            const playPromise = RINGING_SOUND.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay blocked. Sound will play on next interaction.", error);
                    // Fallback: Play on next click if blocked
                    const playOnInteraction = () => {
                        RINGING_SOUND.play();
                        window.removeEventListener('click', playOnInteraction);
                    };
                    window.addEventListener('click', playOnInteraction);
                });
            }
        } else if (type === "calling") {
            CALLING_SOUND.currentTime = 0;
            CALLING_SOUND.play().catch(e => console.log("Calling sound blocked:", e));
        }
    } catch (error) {
        console.error("Error playing sound:", error);
    }
};

const stopAllSounds = () => {
    RINGING_SOUND.pause();
    RINGING_SOUND.currentTime = 0;
    CALLING_SOUND.pause();
    CALLING_SOUND.currentTime = 0;
};

const addCallLog = (remoteUser, type, status) => {
  try {
    if (!remoteUser) return;
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;
    
    const activeKey = `call_logs_${authUser._id}`;
    const saved = localStorage.getItem(activeKey);
    const callLogs = saved ? JSON.parse(saved) : [];
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const newLog = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      name: remoteUser.fullName || "Unknown User",
      type: type || "audio",
      time: `${dateString}, ${timeString}`,
      status: status // 'outgoing', 'incoming', 'missed'
    };
    
    const updated = [newLog, ...callLogs];
    localStorage.setItem(activeKey, JSON.stringify(updated));
    
    window.dispatchEvent(new Event("callLogsUpdated"));
  } catch (e) {
    console.error("Error logging call:", e);
  }
};

const logMissedIfRinging = (get) => {
  try {
    const { isIncomingCall, callStatus, remoteUser, callType } = get();
    if (isIncomingCall && callStatus === "ringing" && remoteUser) {
      addCallLog(remoteUser, callType, "missed");
    }
  } catch (e) {
    console.error("Error logging missed call:", e);
  }
};

const createDummyStream = () => {
  let audioTrack;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    audioTrack = dst.stream.getAudioTracks()[0];
  } catch (e) {
    console.error("Failed to create dummy audio track:", e);
  }

  let videoTrack;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx2d = canvas.getContext("2d");
    if (ctx2d) {
      ctx2d.fillStyle = "black";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    }
    const videoStream = canvas.captureStream ? canvas.captureStream(10) : (canvas.webkitCaptureStream ? canvas.webkitCaptureStream(10) : null);
    if (videoStream) {
      videoTrack = videoStream.getVideoTracks()[0];
    }
  } catch (e) {
    console.error("Failed to create dummy video track:", e);
  }

  const tracks = [];
  if (audioTrack) {
    tracks.push(audioTrack);
  }
  if (videoTrack) {
    tracks.push(videoTrack);
  }
  return new MediaStream(tracks);
};

export const useCallStore = create((set, get) => ({
  isInCall: false,
  isIncomingCall: false,
  callType: null, // 'audio' or 'video'
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  pc: null,
  callStatus: "idle", // 'idle', 'calling', 'ringing', 'ongoing'
  isMuted: false,
  isVideoOff: false,
  callStartTime: null,
  facingMode: "user", // 'user' or 'environment'
  isSharingScreen: false,
  isRemoteSharingScreen: false,
  isMinimized: false,
  screenStream: null,

  toggleMic: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      set({ isVideoOff: !isVideoOff });
    }
  },

  setIsMinimized: (val) => set({ isMinimized: val }),
  handleScreenShareStarted: () => set({ isRemoteSharingScreen: true }),
  handleScreenShareStopped: () => set({ isRemoteSharingScreen: false }),

  handleActiveSync: async ({ partner, type }) => {
    const { isInCall } = get();
    if (!isInCall) {
      console.log("🔄 Restoring active call session with", partner.fullName);
      
      set({
        remoteUser: partner,
        callType: type || "video",
        callStatus: "ongoing",
        isInCall: true,
      });

      const stream = await get().setupMediaStream(type || "video");
      if (stream) {
        console.log("✅ Media restored, re-negotiating...");
        setTimeout(() => {
          get().startCall(partner, type || "video");
        }, 1500);
      }
    }
  },

  setupMediaStream: async (type = "video") => {
    try {
      const { localStream, facingMode } = get();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: type === "video" ? { 
            facingMode: facingMode || "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        set({ isVideoOff: type !== "video" });
      } catch (err) {
        console.warn("setupMediaStream: video/audio constraints failed, trying fallback...", err);
        if (type === "video") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            set({ isVideoOff: true });
          } catch (audioErr) {
            console.error("setupMediaStream: audio failed too, using dummy stream...", audioErr);
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          }
        } else {
          try {
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          } catch (dummyErr) {
            console.error("Dummy stream setup failed:", dummyErr);
          }
        }
      }

      set({ localStream: stream });
      return stream;
    } catch (error) {
      console.error("Error setting up media stream:", error);
      return null;
    }
  },

  switchCamera: async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera access requires HTTPS.");
      return;
    }

    const { localStream, pc, callType } = get();
    if (!localStream || callType !== "video") return;

      const currentVideoTrack = localStream.getVideoTracks()[0];
      const currentFacingMode = get().facingMode || "user";
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user";

      // Stop the current track FIRST to release hardware lock on some mobile devices
      if (currentVideoTrack) {
        currentVideoTrack.stop();
      }

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        // Combine new video with existing audio
        const audioTracks = localStream.getAudioTracks();
        const newLocalStream = new MediaStream([newVideoTrack, ...audioTracks]);

        // Update Peer Connection
        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }

        set({ 
          localStream: newLocalStream,
          facingMode: newFacingMode
        });
      } catch (error) {
        console.error("New camera request failed, trying to restore old one:", error);
        // Fallback: try to get the original camera back if the switch failed
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode },
          audio: false
        });
        const fallbackTrack = fallbackStream.getVideoTracks()[0];
        if (fallbackTrack) {
          const audioTracks = localStream.getAudioTracks();
          set({ localStream: new MediaStream([fallbackTrack, ...audioTracks]) });
          if (pc) {
            const videoSender = pc.getSenders().find(s => s.track && s.track.kind === "video");
            if (videoSender) await videoSender.replaceTrack(fallbackTrack);
          }
        }
      }
  },

  initiateCall: async (receiver, type) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera access requires HTTPS.");
      return;
    }

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: type === "video",
          audio: true,
        });
      } catch (err) {
        console.warn("initiateCall constraints failed, trying fallback...", err);
        if (type === "video") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            set({ isVideoOff: true });
          } catch (audioErr) {
            console.error("initiateCall audio failed, using dummy stream...", audioErr);
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          }
        } else {
          try {
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          } catch (dummyErr) {
            console.error("Dummy stream failed in initiateCall:", dummyErr);
          }
        }
      }

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle" });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice:candidate", { to: receiver._id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        set({ remoteStream });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:user", { to: receiver._id, offer, type });

      playSound("ringing");

      addCallLog(receiver, type, "outgoing");

      set({
        isInCall: true,
        callType: type,
        remoteUser: receiver,
        localStream: stream,
        pc,
        callStatus: "calling",
      });
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  },

  handleIncomingCall: async ({ from, offer, type }) => {
    const { isInCall, remoteUser } = get();
    
    // Auto-reconnect: if already in call with this person, accept automatically
    if (isInCall && remoteUser?._id === from) {
      console.log("🔄 Auto-accepting reconnection offer from partner...");
      set({ pendingOffer: offer });
      setTimeout(() => {
        get().acceptCall();
      }, 500);
      return;
    }

    // Normal incoming call
    const { useChatstore } = await import("./useChatStore");
    const users = useChatstore.getState().users;
    const sender = users.find(u => u._id === from);

    playSound("ringing");

    set({
      isIncomingCall: true,
      remoteUser: sender || { _id: from, fullName: "Unknown User" },
      callType: type,
      pendingOffer: offer,
      callStatus: "ringing",
    });
  },

  acceptCall: async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera access requires HTTPS.");
      return;
    }

    const { pendingOffer, remoteUser, callType } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
      } catch (err) {
        console.warn("acceptCall constraints failed, trying fallback...", err);
        if (callType === "video") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            set({ isVideoOff: true });
          } catch (audioErr) {
            console.error("acceptCall audio failed, using dummy stream...", audioErr);
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          }
        } else {
          try {
            stream = createDummyStream();
            set({ isVideoOff: true, isMuted: true });
          } catch (dummyErr) {
            console.error("Dummy stream failed in acceptCall:", dummyErr);
          }
        }
      }

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle" });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice:candidate", { to: remoteUser._id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:accepted", { to: remoteUser._id, answer });

      stopAllSounds();

      addCallLog(remoteUser, callType, "incoming");

      set({
        isInCall: true,
        isIncomingCall: false,
        localStream: stream,
        pc,
        callStatus: "ongoing",
        pendingOffer: null,
        callStartTime: Date.now(),
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      get().rejectCall();
    }
  },

  rejectCall: () => {
    logMissedIfRinging(get);
    stopAllSounds();
    const { remoteUser, callType } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && remoteUser) {
      socket.emit("call:rejected", { to: remoteUser._id, type: callType });
    }
    get().resetCallState();
  },

  handleCallAccepted: async ({ answer }) => {
    stopAllSounds();
    const { pc } = get();
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      set({ callStatus: "ongoing", callStartTime: Date.now() });
    }
  },

  handleIceCandidate: async ({ candidate }) => {
    const { pc } = get();
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    }
  },

  toggleScreenShare: async () => {
    const { isSharingScreen, localStream, pc, facingMode, remoteUser } = get();
    const socket = useAuthStore.getState().socket;
    
    if (!isSharingScreen) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen Sharing is NOT supported on this browser or requires HTTPS.");
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenTrack.onended = () => {
          get().stopScreenShare();
        };

        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
          }
        }

        // Notify remote user
        if (socket && remoteUser) {
          socket.emit("call:screen-share-started", { to: remoteUser._id });
        }

        const audioTracks = localStream ? localStream.getAudioTracks() : [];
        const newLocalStream = new MediaStream([screenTrack, ...audioTracks]);

        set({ 
          isSharingScreen: true,
          localStream: newLocalStream,
          screenStream,
          isVideoOff: false
        });
      } catch (error) {
        console.error("Error starting screen share:", error);
      }
    } else {
      await get().stopScreenShare();
    }
  },

  stopScreenShare: async () => {
    const { screenStream, localStream, pc, facingMode, remoteUser } = get();
    const socket = useAuthStore.getState().socket;
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    // Notify remote user
    if (socket && remoteUser) {
      socket.emit("call:screen-share-stopped", { to: remoteUser._id });
    }

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode || "user" },
        audio: true
      });

      const cameraTrack = cameraStream.getVideoTracks()[0];
      
      if (pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === "video");
        if (videoSender && cameraTrack) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }

      set({ 
        isSharingScreen: false,
        localStream: cameraStream,
        screenStream: null
      });
    } catch (error) {
      console.error("Error reverting to camera:", error);
      set({ isSharingScreen: false, screenStream: null });
    }
  },

  endCall: () => {
    logMissedIfRinging(get);
    stopAllSounds();
    const { remoteUser, pc, localStream, callStartTime, callType, callStatus } = get();
    const socket = useAuthStore.getState().socket;
    
    let duration = 0;
    if (callStartTime && callStatus === "ongoing") {
      duration = Math.floor((Date.now() - callStartTime) / 1000);
    }

    if (socket && remoteUser) {
      socket.emit("call:ended", { 
        to: remoteUser._id, 
        type: callType, 
        duration,
        status: callStatus === "ongoing" ? "ended" : "missed"
      });
    }

    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());

    get().resetCallState();
  },

  handleCallEnded: () => {
    logMissedIfRinging(get);
    stopAllSounds();
    const { pc, localStream } = get();
    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    get().resetCallState();
  },

  handleCallRejected: () => {
    logMissedIfRinging(get);
    stopAllSounds();
    get().endCall();
  },

  resetCallState: () => {
    set({
      isInCall: false,
      isIncomingCall: false,
      callType: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      pc: null,
      callStatus: "idle",
      pendingOffer: null,
      isMuted: false,
      isVideoOff: false,
      callStartTime: null,
      facingMode: "user",
    });
  },

  setRemoteUser: (user) => set({ remoteUser: user }),
}));
