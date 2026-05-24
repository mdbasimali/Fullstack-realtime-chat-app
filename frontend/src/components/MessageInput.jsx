import React, { useRef, useState, useEffect } from "react";
import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { Paperclip, Send, X, Smile, Mic, Trash2, Check, Keyboard } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "./EmojiPicker";
import { triggerHapticFeedback } from "../lib/utils";

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

  const { sendMessage, selectedUser } = useChatstore();
  const { selectedGroup, sendGroupMessage } = useGroupStore();

  const lastUserRef = useRef(selectedUser);
  const lastGroupRef = useRef(selectedGroup);
  if (selectedUser) lastUserRef.current = selectedUser;
  if (selectedGroup) lastGroupRef.current = selectedGroup;

  const safeUser = selectedUser || lastUserRef.current;
  const safeGroup = selectedGroup || lastGroupRef.current;

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
    triggerHapticFeedback([10, 30]);
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
            const sendPromise = safeGroup
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
    
    triggerHapticFeedback([15]);

    try {
      const messageToSend = {
        text: text.trim(),
        image: imagePreview,
      };

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (safeGroup) {
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

  if (!safeUser && !safeGroup) return null;

  return (
    <div className="w-full z-20 bg-base-100/95 dark:bg-base-900/95 backdrop-blur-xl border-t border-base-200/50 dark:border-base-800/50 shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="w-full max-w-3xl mx-auto px-3 py-2 md:px-6 md:py-3">
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
            <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2 md:py-2.5 bg-base-200/50 dark:bg-base-800/50 border border-base-300/50 dark:border-base-700/50 shadow-sm rounded-full relative">

              {/* Emoji/Keyboard Button */}
              <button
                type="button"
                className={`flex-shrink-0 hover:text-primary transition-colors cursor-pointer p-1 rounded-full ${
                  showEmojiPicker 
                    ? "bg-primary/10 text-primary" 
                    : "text-base-content/50"
                }`}
                onClick={() => setShowEmojiPicker((prev) => !prev)}
              >
                {showEmojiPicker ? (
                  <Keyboard size={24} strokeWidth={1.5} />
                ) : (
                  <Smile size={24} strokeWidth={1.5} />
                )}
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
                  className={`btn-tactile flex-shrink-0 hover:text-primary transition-colors cursor-pointer text-base-content/50 ${isUploadingAudio ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    triggerHapticFeedback([10]);
                    fileInputRef.current?.click();
                  }}

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
            className="btn-tactile flex-shrink-0 flex items-center justify-center size-[42px] md:size-[48px] rounded-full transition-all duration-200 active:scale-90 shadow-sm cursor-pointer"
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

        {showEmojiPicker && (
          <div className="w-full h-[300px] mt-3 animate-fade-in">
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
