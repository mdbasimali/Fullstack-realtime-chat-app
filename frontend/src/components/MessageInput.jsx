import React, { useRef, useState } from "react";
import { useChatstore } from "../store/useChatStore";
import { Image, Send, X, Smile, Mic, Plus } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const { sendMessage } = useChatstore();

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

      // Clear form IMMEDIATELY for instant feel
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await sendMessage(messageToSend);

      // Auto-refocus
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 10);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-3 md:p-4 w-full bg-base-100 shrink-0 border-t border-base-300 md:border-none">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
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

      <form onSubmit={handleSendMessage} className="flex items-center gap-3">
        {/* Beautiful Pill Input Container */}
        <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-base-200/60 dark:bg-base-950/40 border border-base-300/40 rounded-full">
          {/* Smiley Icon */}
          <button
            type="button"
            className="text-base-content/50 hover:text-primary transition-colors cursor-pointer"
            onClick={() => toast.success("Emoji selector coming soon! 😊")}
          >
            <Smile size={21} />
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
            className="flex-1 bg-transparent text-sm md:text-base border-none outline-none focus:outline-none placeholder-base-content/40 text-base-content"
            placeholder="ChatZone message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            ref={textInputRef}
          />

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Camera/Attachment Icon */}
          <button
            type="button"
            className={`hover:text-primary transition-colors cursor-pointer ${
              imagePreview ? "text-primary" : "text-base-content/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={21} />
          </button>

          {/* Mic/Voice Icon */}
          <button
            type="button"
            className="text-base-content/50 hover:text-primary transition-colors cursor-pointer"
            onClick={() => toast.success("Voice recording feature coming soon! 🎙️")}
          >
            <Mic size={21} />
          </button>
        </div>

        {/* Circular Action Button */}
        <button
          type="submit"
          onMouseDown={(e) => e.preventDefault()}
          className="btn btn-circle bg-primary hover:bg-primary/90 text-primary-content border-none flex items-center justify-center size-11 shrink-0"
        >
          {text.trim() || imagePreview ? (
            <Send size={18} className="ml-0.5" />
          ) : (
            <Plus size={22} onClick={() => fileInputRef.current?.click()} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
