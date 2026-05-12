import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const RINGING_SOUND = new Audio("https://raw.githubusercontent.com/shubham-kumar-2000/Whatsapp-Clone-React-Native/master/src/assets/sounds/whatsapp_ringtone.mp3");
const CALLING_SOUND = new Audio("https://www.soundjay.com/phone/phone-calling-1.mp3");
RINGING_SOUND.loop = true;
CALLING_SOUND.loop = true;

const playSound = (type) => {
    try {
        if (type === "ringing") {
            RINGING_SOUND.currentTime = 0;
            RINGING_SOUND.play().catch(e => console.log("Audio play failed:", e));
        } else if (type === "calling") {
            CALLING_SOUND.currentTime = 0;
            CALLING_SOUND.play().catch(e => console.log("Audio play failed:", e));
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

  initiateCall: async (receiver, type) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
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

      playSound("calling");

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
      toast.error("Could not access camera/microphone");
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

      const pc = new RTCPeerConnection(ICE_SERVERS);
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

      set({
        isInCall: true,
        isIncomingCall: false,
        localStream: stream,
        pc,
        callStatus: "ongoing",
        pendingOffer: null,
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Could not access camera/microphone");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    stopAllSounds();
    const { remoteUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && remoteUser) {
      socket.emit("call:rejected", { to: remoteUser._id });
    }
    get().resetCallState();
  },

  handleCallAccepted: async ({ answer }) => {
    stopAllSounds();
    const { pc } = get();
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      set({ callStatus: "ongoing" });
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
    stopAllSounds();
    const { remoteUser, pc, localStream } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && remoteUser) {
      socket.emit("call:ended", { to: remoteUser._id });
    }

    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());

    get().resetCallState();
  },

  handleCallEnded: () => {
    stopAllSounds();
    const { pc, localStream } = get();
    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    toast("Call ended");
    get().resetCallState();
  },

  handleCallRejected: () => {
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
    });
  },

  setRemoteUser: (user) => set({ remoteUser: user }),
}));
