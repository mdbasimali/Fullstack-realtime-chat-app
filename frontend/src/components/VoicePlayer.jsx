import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import toast from "react-hot-toast";

import { useChatstore } from "../store/useChatStore";

const VoicePlayer = ({ url, isMyMessage, message }) => {
  const [audioUrl, setAudioUrl] = useState(url);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (message && message.isEncrypted && url.startsWith("http")) {
      useChatstore.getState().decryptMediaUrl(message).then(decryptedUrl => {
        if (isMounted) setAudioUrl(decryptedUrl);
      });
    } else {
      setAudioUrl(url);
    }
    return () => { isMounted = false; };
  }, [url, message]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    
    const onError = () => {
      console.error("Audio error details:", audio.error);
      // Only notify if there's an actual load failure (code 3/4 are format/decoding issues, 4 is src not found)
      if (audio.error) {
        toast.error(`Audio failed to load: ${audio.error.message || "format unsupported"}`);
      }
    };

    // Audio might load before events register
    if (audio.readyState >= 1 && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.error("Audio play failed:", e);
          toast.error("Playback failed. Please click again or check browser permissions.");
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-3 py-1 px-1 rounded-2xl w-48 md:w-56 ${
      isMyMessage ? "text-primary-content" : "text-base-content"
    }`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isMyMessage 
            ? "bg-white/20 hover:bg-white/35 text-white" 
            : "bg-primary/15 hover:bg-primary/25 text-primary"
        }`}
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Progress & Duration */}
      <div className="flex-1 flex flex-col gap-0.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-current opacity-80 hover:opacity-100 transition-opacity ${
            isMyMessage ? "bg-white/30" : "bg-base-300"
          }`}
        />
        <div className="flex justify-between text-[9px] font-bold opacity-75">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;
