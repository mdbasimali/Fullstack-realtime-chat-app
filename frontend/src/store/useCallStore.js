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

export const useCallStore = create((set, get) => ({
  isInCall: false,
  isIncomingCall: false,
  callType: null, // 'audio' or 'video'
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  pc: null,
  callStatus: "idle", // 'idle', 'calling', 'ringing', 'ongoing'

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
    const { remoteUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && remoteUser) {
      socket.emit("call:rejected", { to: remoteUser._id });
    }
    get().resetCallState();
  },

  handleCallAccepted: async ({ answer }) => {
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
    const { pc, localStream } = get();
    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    toast("Call ended");
    get().resetCallState();
  },

  handleCallRejected: () => {
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
    });
  },

  setRemoteUser: (user) => set({ remoteUser: user }),
}));
