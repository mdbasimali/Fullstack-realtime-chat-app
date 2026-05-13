import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
        "stun:stun.services.mozilla.com",
        "stun:global.stun.twilio.com:3478",
        "stun:stun.l.google.com:19302?transport=udp",
        "stun:stun.cloudflare.com:3478"
      ],
    },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turn:relay.metered.ca:80",
        "turn:relay.metered.ca:443",
        "turn:relay.metered.ca:443?transport=tcp"
      ],
      username: "openrelay",
      credential: "openrelay"
    },
    {
       urls: [
         "turn:18.191.223.12:3478?transport=udp",
         "turn:18.191.223.12:3478?transport=tcp"
       ],
       username: "guest",
       credential: "somepassword"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all"
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

  switchCamera: async () => {
    const { localStream, pc, callType } = get();
    if (!localStream || callType !== "video") return;

    const currentVideoTrack = localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return;

    const currentFacingMode = get().facingMode || "user";
    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      // Stop the old camera track to turn off physical camera light and release hardware
      currentVideoTrack.stop();

      // Create a brand new MediaStream combining the new video track and existing audio tracks
      const audioTracks = localStream.getAudioTracks();
      const newLocalStream = new MediaStream([newVideoTrack, ...audioTracks]);

      // Update the WebRTC Peer Connection tracks if active
      if (pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Update local stream state
      set({ 
        localStream: newLocalStream,
        facingMode: newFacingMode
      });
    } catch (error) {
      console.error("Error switching camera:", error);
      toast.error("Could not switch camera");
    }
  },

  initiateCall: async (receiver, type) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle", sdpSemantics: "unified-plan" });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice:candidate", { to: receiver._id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
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
      toast.error("Could not access camera/microphone. Please enable permissions in Settings -> Apps -> ChatZone -> Permissions!");
    }
  },

  handleIncomingCall: async ({ from, offer, type }) => {
    // Try to find the user in useChatstore's users list
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
    const { pendingOffer, remoteUser, callType } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle", sdpSemantics: "unified-plan" });
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
      toast.error("Could not access camera/microphone. Please enable permissions in Settings -> Apps -> ChatZone -> Permissions!");
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
    toast("Call ended");
    get().resetCallState();
  },

  handleCallRejected: () => {
    logMissedIfRinging(get);
    stopAllSounds();
    toast.error("Call rejected");
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
