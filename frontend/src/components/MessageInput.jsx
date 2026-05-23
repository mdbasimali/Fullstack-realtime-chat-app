import React, { useRef, useState, useEffect } from "react";
import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { Paperclip, Send, X, Smile, Mic, Trash2, Check } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "./EmojiPicker";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const { sendMessage } = useChatstore();
  const { selectedGroup, sendGroupMessage } = useGroupStore();

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast.error("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Detect supported mimeType dynamically to support iOS/Safari and various mobile browsers
      const options = {};
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "audio/aac",
        "audio/wav"
      ];

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Request chunks every 250ms (critical for iOS Safari compatibility)
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
      toast.success("Voice recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error("Microphone access denied. Please grant permission in browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        toast.error("No microphone detected. Please connect a recording device.");
      } else {
        toast.error("Failed to access microphone.");
      }
    }
  };

  const stopRecording = (shouldSend) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    clearInterval(recordingIntervalRef.current);
    const mediaRecorder = mediaRecorderRef.current;
    const finalDuration = recordingDuration;

    mediaRecorder.onstop = async () => {
      // Release microphone tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      if (shouldSend && audioChunksRef.current.length > 0) {
        const mimeType = mediaRecorder.mimeType ? mediaRecorder.mimeType.split(";")[0] : "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          try {
            setIsUploadingAudio(true);
            const sendPromise = selectedGroup
              ? sendGroupMessage({
                  text: `Voice note (${formatDuration(finalDuration)})`,
                  image: base64Audio,
                  messageType: "audio",
                })
              : sendMessage({
                  text: `Voice note (${formatDuration(finalDuration)})`,
                  image: base64Audio,
                  messageType: "audio",
                });

            await toast.promise(sendPromise, {
              loading: "Uploading voice note...",
              success: "Voice note sent successfully! 🎙️",
              error: "Failed to upload voice note.",
            });
          } catch (err) {
            console.error("Failed to send voice note:", err);
          } finally {
            setIsUploadingAudio(false);
          }
        };
      }
    };

    mediaRecorder.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleEmojiSelect = (emoji) => {
    const input = textInputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setText(newText);
      
      // Auto reposition selection cursor
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
      }, 10);
    } else {
      setText((prev) => prev + emoji);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return; 
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      const messageToSend = {
        text: text.trim(),
        image: imagePreview,
      };

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (selectedGroup) {
        await sendGroupMessage(messageToSend);
      } else {
        await sendMessage(messageToSend);
      }

      setTimeout(() => {
        textInputRef.current?.focus();
      }, 10);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pt-2 pb-4 md:px-6 md:pt-3 md:pb-6 w-full bg-transparent max-w-3xl mx-auto pointer-events-none" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-2xl border border-base-300"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-base-300
                 flex items-center justify-center shadow-xs"
              type="button"
            >
              <X className="size-3.5 text-base-content/70" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 min-w-0 pointer-events-auto">
        {isRecording ? (
          /* Glassmorphic Pulse Recording Pill */
          <div className="flex-1 flex items-center justify-between gap-4 px-4 py-2 bg-red-50/70 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-full">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400">
                Recording Voice ({formatDuration(recordingDuration)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Discard / Delete */}
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors cursor-pointer"
                title="Discard Recording"
              >
                <Trash2 size={17} />
              </button>

              {/* Stop & Send */}
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-xs cursor-pointer"
                title="Send Recording"
              >
                <Check size={17} />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar */
          <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2 md:py-2.5 bg-base-100 dark:bg-base-900 border border-base-200 dark:border-base-800 shadow-sm rounded-full relative">
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            {/* Emoji Button */}
            <button
              type="button"
              className={`flex-shrink-0 hover:text-primary transition-colors cursor-pointer ${
                showEmojiPicker ? "text-primary" : "text-base-content/50"
              }`}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <Smile size={24} strokeWidth={1.5} />
            </button>

            {/* Text Input */}
            <input
              type="text"
              name="chat-message-text"
              id="chat-message-text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck="true"
              data-lpignore="true"
              className="flex-1 min-w-0 bg-transparent text-[15px] md:text-[16px] border-none outline-none focus:outline-none placeholder-base-content/40 text-base-content px-1"
              placeholder="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              ref={textInputRef}
              disabled={isUploadingAudio}
            />

            {/* Attachment Button (Paperclip) - Only show if NO text */}
            {!text.trim() && (
              <button
                type="button"
                disabled={isUploadingAudio}
                className={`flex-shrink-0 hover:text-primary transition-colors cursor-pointer text-base-content/50 ${isUploadingAudio ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={22} strokeWidth={1.5} />
              </button>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={isUploadingAudio}
            />
          </div>
        )}

        {/* Send / Mic Button */}
        <button
          type={text.trim() || imagePreview ? "submit" : "button"}
          onClick={text.trim() || imagePreview ? undefined : startRecording}
          disabled={isUploadingAudio}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-shrink-0 flex items-center justify-center size-[42px] md:size-[48px] rounded-full transition-all duration-200 active:scale-90 shadow-sm cursor-pointer"
          style={{
            background: "#2AABEE", // Telegram Blue
            color: "#fff",
            border: "none",
            opacity: isUploadingAudio ? 0.7 : 1,
          }}
        >
          {isUploadingAudio ? (
            <span className="loading loading-spinner loading-xs" style={{ color: "#fff" }} />
          ) : text.trim() || imagePreview ? (
            <Send size={20} strokeWidth={2} style={{ marginLeft: "2px" }} />
          ) : (
            <Mic size={22} strokeWidth={1.5} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
