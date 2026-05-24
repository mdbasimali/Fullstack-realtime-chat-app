import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import * as mediasoupClient from "mediasoup-client";

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
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
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
  iceCandidatesQueue: [],
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
  isGroupCall: false,
  groupId: null,
  groupPeers: {},
  activeSpeakerId: null,
  isGroupIncomingCall: false,
  groupCallInviteData: null,
  activeGroupCalls: {},
  device: null,
  sendTransport: null,
  recvTransport: null,
  producers: {},
  consumers: {},

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

      let hasVideo = false;
      let hasAudio = false;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        hasVideo = devices.some(device => device.kind === 'videoinput');
        hasAudio = devices.some(device => device.kind === 'audioinput');
      } catch (err) {
        console.warn("Failed to enumerate devices:", err);
        hasVideo = true; // Assume true and let getUserMedia fail if needed
        hasAudio = true;
      }

      let stream;
      
      const requestMedia = async (reqVideo, reqAudio) => {
        return await navigator.mediaDevices.getUserMedia({
          video: reqVideo ? { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false,
          audio: reqAudio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } : false,
        });
      };

      try {
        if (!hasVideo && !hasAudio) {
            throw new Error("No media devices found");
        }
        
        stream = await requestMedia(type === "video" && hasVideo, hasAudio);
        set({ isVideoOff: !(type === "video" && hasVideo), isMuted: !hasAudio });
      } catch (err) {
        console.warn(`setupMediaStream: constraints failed (video: ${type === "video" && hasVideo}, audio: ${hasAudio}), trying fallbacks...`, err);
        
        // Try audio only
        try {
            if (hasAudio) {
                stream = await requestMedia(false, true);
                set({ isVideoOff: true, isMuted: false });
            } else {
                throw new Error("No audio devices to fallback to");
            }
        } catch (audioErr) {
            console.warn("setupMediaStream: audio fallback failed, trying video only...", audioErr);
            // Try video only
            try {
                if (type === "video" && hasVideo) {
                    stream = await requestMedia(true, false);
                    set({ isVideoOff: false, isMuted: true });
                } else {
                    throw new Error("No video devices to fallback to");
                }
            } catch (videoErr) {
                console.error("setupMediaStream: all hardware media failed, using dummy stream...", videoErr);
                stream = createDummyStream();
                set({ isVideoOff: true, isMuted: true });
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

        // Update Group Peer Connections
        const { isGroupCall, groupPeers } = get();
        if (isGroupCall) {
          await Promise.all(
            Object.values(groupPeers).map(async (peer) => {
              if (peer.pc) {
                const senders = peer.pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === "video");
                if (videoSender) {
                  try {
                    await videoSender.replaceTrack(newVideoTrack);
                  } catch (e) {
                    console.error(`Error replacing track for group peer ${peer.socketId}:`, e);
                  }
                }
              }
            })
          );
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
          const { isGroupCall, groupPeers } = get();
          if (isGroupCall) {
            await Promise.all(
              Object.values(groupPeers).map(async (peer) => {
                if (peer.pc) {
                  const senders = peer.pc.getSenders();
                  const videoSender = senders.find(s => s.track && s.track.kind === "video");
                  if (videoSender) {
                    try {
                      await videoSender.replaceTrack(fallbackTrack);
                    } catch (e) {
                      console.error(`Error replacing fallback track for group peer ${peer.socketId}:`, e);
                    }
                  }
                }
              })
            );
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
      const stream = await get().setupMediaStream(type);
      if (!stream) {
        console.error("Failed to acquire any media stream for call.");
        get().resetCallState();
        return;
      }

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle" });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (type === "video" && !stream.getVideoTracks().length) {
        try {
          pc.addTransceiver("video", { direction: "recvonly" });
        } catch (e) {
          console.warn("Failed to add video transceiver in initiateCall:", e);
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("RTCPeerConnection connectionState changed:", pc.connectionState);
      };
      pc.oniceconnectionstatechange = () => {
        console.log("RTCPeerConnection iceConnectionState changed:", pc.iceConnectionState);
      };
      pc.onsignalingstatechange = () => {
        console.log("RTCPeerConnection signalingState changed:", pc.signalingState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: receiver._id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log("ontrack: received track", event.track.kind);
        const { remoteStream } = get();
        const existingTracks = remoteStream ? remoteStream.getTracks() : [];
        const newTracks = event.streams && event.streams[0] 
          ? event.streams[0].getTracks() 
          : [event.track];
        const allTracks = [...existingTracks];
        newTracks.forEach(track => {
          if (!allTracks.some(t => t.id === track.id)) {
            allTracks.push(track);
          }
        });
        set({ remoteStream: new MediaStream(allTracks) });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", { to: receiver._id, offer, type });

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
      const stream = await get().setupMediaStream(callType);
      if (!stream) {
        console.error("Failed to acquire any media stream for call.");
        get().resetCallState();
        return;
      }

      const pc = new RTCPeerConnection({ ...ICE_SERVERS, bundlePolicy: "max-bundle" });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onconnectionstatechange = () => {
        console.log("RTCPeerConnection connectionState changed:", pc.connectionState);
      };
      pc.oniceconnectionstatechange = () => {
        console.log("RTCPeerConnection iceConnectionState changed:", pc.iceConnectionState);
      };
      pc.onsignalingstatechange = () => {
        console.log("RTCPeerConnection signalingState changed:", pc.signalingState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: remoteUser._id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log("ontrack: received track", event.track.kind);
        const { remoteStream } = get();
        const existingTracks = remoteStream ? remoteStream.getTracks() : [];
        const newTracks = event.streams && event.streams[0] 
          ? event.streams[0].getTracks() 
          : [event.track];
        const allTracks = [...existingTracks];
        newTracks.forEach(track => {
          if (!allTracks.some(t => t.id === track.id)) {
            allTracks.push(track);
          }
        });
        set({ remoteStream: new MediaStream(allTracks) });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));

      // Drain queued ICE candidates
      const queue = get().iceCandidatesQueue || [];
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.error("Error adding queued ICE candidate in acceptCall:", e);
        }
      }
      set({ iceCandidatesQueue: [] });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", { to: remoteUser._id, answer, callId: pendingOffer?.callId || "" });

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
    const { remoteUser, callType, pendingOffer } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && remoteUser) {
      socket.emit("reject-call", { to: remoteUser._id, type: callType, callId: pendingOffer?.callId || "" });
    }
    get().resetCallState();
  },

  handleCallAccepted: async ({ answer }) => {
    stopAllSounds();
    const { pc } = get();
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Drain queued ICE candidates
        const queue = get().iceCandidatesQueue || [];
        for (const cand of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error("Error adding queued ICE candidate in handleCallAccepted:", e);
          }
        }
        set({ iceCandidatesQueue: [] });

        set({ callStatus: "ongoing", callStartTime: Date.now() });
      } catch (error) {
        console.error("Error setting remote description in handleCallAccepted:", error);
      }
    }
  },

  handleIceCandidate: async ({ candidate }) => {
    const { pc } = get();
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate directly:", e);
      }
    } else {
      console.log("Queueing ICE candidate (remoteDescription not set yet)");
      const { iceCandidatesQueue } = get();
      set({ iceCandidatesQueue: [...iceCandidatesQueue, candidate] });
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
      socket.emit("end-call", { 
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

  joinGroupCall: async (groupId, type) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera/Mic access requires HTTPS.");
      return;
    }

    // Set UI to joining to prevent modal from unmounting while we wait for permissions/devices
    set({
      isGroupCall: true,
      groupId,
      isInCall: true,
      callType: type,
      callStatus: "joining"
    });

    try {
      const stream = await get().setupMediaStream(type);
      if (!stream) {
        console.error("Failed to acquire any media stream for group call.");
        get().resetCallState();
        return;
      }

      set({
        localStream: stream,
        callStatus: "ongoing",
        callStartTime: Date.now()
      });

      // Active Speaker detection on self
      get().setupActiveSpeakerDetection(stream, "self");

      const socket = useAuthStore.getState().socket;
      if (!socket) return;
      
      socket.emit("join-room", { roomId: groupId }, async (response) => {
        try {
          console.log("SFU join-room response:", response);
          if (response.error) {
            console.error("Error joining room:", response.error);
            return;
          }

          console.log("Initializing Mediasoup device...");
          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: response.rtpCapabilities });
          set({ device });
          console.log("Mediasoup device loaded!");

          console.log("Creating Send Transport...");
          await get().createSendTransport(groupId);
          console.log("Creating Recv Transport...");
          await get().createRecvTransport(groupId);
          
          console.log("Fetching existing producers in the room...");
          socket.emit("get-producers", { roomId: groupId }, (prodRes) => {
            if (prodRes.producers && prodRes.producers.length > 0) {
              console.log("Found existing producers:", prodRes.producers);
              prodRes.producers.forEach(p => {
                get().handleGroupCallUserJoined({ userId: p.userId, socketId: p.socketId });
                get().consumeTrack(p.producerId, p.socketId, p.userId, p.kind);
              });
            } else {
              console.log("No existing producers found in the room.");
            }
          });
          
          console.log("Successfully joined SFU room!");
        } catch (sfuError) {
          console.error("Critical SFU Error in join-room callback:", sfuError);
        }
      });
    } catch (error) {
      console.error("Error joining group call:", error);
    }
  },

  createSendTransport: (groupId) => {
    return new Promise((resolve, reject) => {
      const { device, localStream, callType } = get();
      const socket = useAuthStore.getState().socket;

      socket.emit("create-transport", { roomId: groupId, direction: "send" }, async (params) => {
        if (params.error) {
          console.error(params.error);
          return reject(params.error);
        }

        const sendTransport = device.createSendTransport(params);
        
        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit("connect-transport", { roomId: groupId, transportId: sendTransport.id, dtlsParameters }, (res) => {
            if (res.error) errback(res.error);
            else callback();
          });
        });

        sendTransport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
          socket.emit("produce-track", { roomId: groupId, transportId: sendTransport.id, kind, rtpParameters }, (res) => {
            if (res.error) errback(res.error);
            else callback({ id: res.id });
          });
        });

        set({ sendTransport });

        // Produce Audio
        if (localStream.getAudioTracks().length > 0) {
          const audioProducer = await sendTransport.produce({ track: localStream.getAudioTracks()[0] });
          set((state) => ({ producers: { ...state.producers, [audioProducer.id]: audioProducer } }));
        }
        
        // Produce Video
        if (callType === "video" && localStream.getVideoTracks().length > 0) {
          const videoProducer = await sendTransport.produce({ track: localStream.getVideoTracks()[0] });
          set((state) => ({ producers: { ...state.producers, [videoProducer.id]: videoProducer } }));
        }

        resolve(sendTransport);
      });
    });
  },

  createRecvTransport: (groupId) => {
    return new Promise((resolve, reject) => {
      const { device } = get();
      const socket = useAuthStore.getState().socket;

      socket.emit("create-transport", { roomId: groupId, direction: "recv" }, async (params) => {
        if (params.error) {
          console.error(params.error);
          return reject(params.error);
        }

        const recvTransport = device.createRecvTransport(params);
        
        recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit("connect-transport", { roomId: groupId, transportId: recvTransport.id, dtlsParameters }, (res) => {
            if (res.error) errback(res.error);
            else callback();
          });
        });

        set({ recvTransport });
        resolve(recvTransport);
      });
    });
  },

  consumeTrack: async (producerId, socketId, userId, kind) => {
    const { device, recvTransport, groupId } = get();
    const socket = useAuthStore.getState().socket;
    if (!recvTransport) return;

    socket.emit("consume-track", { 
      roomId: groupId, 
      transportId: recvTransport.id, 
      producerId, 
      rtpCapabilities: device.rtpCapabilities 
    }, async (params) => {
      if (params.error) return console.error("Consume error:", params.error);

      const consumer = await recvTransport.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      });

      set((state) => ({ consumers: { ...state.consumers, [consumer.id]: consumer } }));

      // Attach track to peer
      set((state) => {
        const peers = { ...state.groupPeers };
        if (!peers[socketId]) {
          peers[socketId] = { userId, socketId, stream: new MediaStream() };
        }
        peers[socketId].stream.addTrack(consumer.track);
        return { groupPeers: peers };
      });

      // Resume on backend
      socket.emit("resume-consumer", { roomId: groupId, consumerId: consumer.id }, () => {
        console.log("Consumer resumed!");
      });
    });
  },

  handleGroupCallNewProducer: ({ producerId, socketId, userId, kind }) => {
    // A new track was published by someone else. Consume it!
    get().consumeTrack(producerId, socketId, userId, kind);
  },

  leaveGroupCall: () => {
    const { sendTransport, recvTransport, producers, consumers, localStream, groupId } = get();
    const socket = useAuthStore.getState().socket;
    
    if (socket && groupId) {
      socket.emit("leave-room", { roomId: groupId });
    }

    if (sendTransport) sendTransport.close();
    if (recvTransport) recvTransport.close();
    Object.values(producers).forEach(p => p.close());
    Object.values(consumers).forEach(c => c.close());

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    get().resetCallState();
  },

  handleGroupCallUserJoined: ({ userId, socketId }) => {
    set((state) => {
      const peers = { ...state.groupPeers };
      if (!peers[socketId]) {
        peers[socketId] = { 
          userId, 
          socketId, 
          stream: new MediaStream(),
          fullName: "User",
          profilePic: "/avatar.png"
        };
      }
      return { groupPeers: peers };
    });
  },

  handleGroupCallUserLeft: ({ userId, socketId }) => {
    set((state) => {
      const newPeers = { ...state.groupPeers };
      delete newPeers[socketId];
      return { groupPeers: newPeers };
    });
  },

  // Deleted legacy group mesh handlers: handleGroupCallUserJoined, handleGroupCallOffer, etc.

  setupActiveSpeakerDetection: (stream, socketIdOrSelf) => {
    try {
      if (!stream || stream.getAudioTracks().length === 0) {
        console.log("setupActiveSpeakerDetection: No audio track found in stream, skipping.");
        return;
      }
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;
      const checkVolume = () => {
        const { isInCall, isGroupCall } = get();
        if (!isInCall) {
          audioContext.close();
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 15) {
          speakingCounter++;
          if (speakingCounter > 4) { // Active for ~100ms
            if (get().activeSpeakerId !== socketIdOrSelf) {
              set({ activeSpeakerId: socketIdOrSelf });
              if (isGroupCall) {
                Object.keys(get().groupPeers).forEach(pId => {
                  get().optimizeGroupPeerBitrate(pId, pId === socketIdOrSelf);
                });
              }
            }
          }
        } else {
          speakingCounter = 0;
        }

        setTimeout(checkVolume, 250);
      };
      
      checkVolume();
    } catch (e) {
      console.log("AudioContext speaker detection error:", e);
    }
  },

  reconnectGroupPeer: async (socketId, userId) => {
    const { groupPeers } = get();
    const oldPeer = groupPeers[socketId];
    if (oldPeer) {
      if (oldPeer.pc) oldPeer.pc.close();
      set((state) => {
        const newPeers = { ...state.groupPeers };
        delete newPeers[socketId];
        return { groupPeers: newPeers };
      });
    }
    // Re-trigger peer setup
    get().handleGroupCallUserJoined({ userId, socketId });
  },

  handleGroupCallIncomingInvite: ({ groupId, fromUserId, fromUserName, fromUserPic, callType }) => {
    playSound("ringing");
    set({
      isGroupIncomingCall: true,
      groupCallInviteData: { groupId, fromUserId, fromUserName, fromUserPic, callType },
      callType,
      callStatus: "ringing"
    });
  },

  acceptGroupCallInvite: () => {
    stopAllSounds();
    const { groupCallInviteData } = get();
    if (groupCallInviteData) {
      const { groupId, callType } = groupCallInviteData;
      set({
        isGroupIncomingCall: false,
        groupCallInviteData: null
      });
      get().joinGroupCall(groupId, callType);
    }
  },

  rejectGroupCallInvite: () => {
    stopAllSounds();
    set({
      isGroupIncomingCall: false,
      groupCallInviteData: null,
      callStatus: "idle"
    });
  },

  resetCallState: () => {
    set({
      isInCall: false,
      isIncomingCall: false,
      iceCandidatesQueue: [],
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
      isGroupCall: false,
      groupId: null,
      groupPeers: {},
      activeSpeakerId: null,
      isGroupIncomingCall: false,
      groupCallInviteData: null,
      activeGroupCalls: {},
      device: null,
      sendTransport: null,
      recvTransport: null,
      producers: {},
      consumers: {},
    });
  },

  handleGroupCallActiveState: ({ groupId, isActive }) => {
    set((state) => {
      const activeGroupCalls = { ...state.activeGroupCalls };
      if (isActive) {
        activeGroupCalls[groupId] = true;
      } else {
        delete activeGroupCalls[groupId];
      }
      return { activeGroupCalls };
    });
  },

  setRemoteUser: (user) => set({ remoteUser: user }),
}));
