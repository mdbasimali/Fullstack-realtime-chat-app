import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";

const CHAT_COLORS = [
  { id: "auto", name: "Auto", value: "auto", display: "#007aff" },
  { id: "blue", name: "Blue", value: "#2563eb", display: "#2563eb" },
  { id: "red", name: "Red", value: "#dc2626", display: "#dc2626" },
  { id: "orange", name: "Orange", value: "#ea580c", display: "#ea580c" },
  { id: "olive", name: "Olive", value: "#65634e", display: "#65634e" },
  { id: "green", name: "Green", value: "#16a34a", display: "#16a34a" },
  { id: "emerald", name: "Emerald", value: "#059669", display: "#059669" },
  { id: "teal", name: "Teal", value: "#0d9488", display: "#0d9488" },
  { id: "ocean", name: "Ocean", value: "#0284c7", display: "#0284c7" },
  { id: "indigo", name: "Indigo", value: "#4f46e5", display: "#4f46e5" },
  { id: "purple", name: "Purple", value: "#9333ea", display: "#9333ea" },
  { id: "pink", name: "Pink", value: "#db2777", display: "#db2777" },
  { id: "rose", name: "Rose", value: "#be123c", display: "#be123c" },
  { id: "slate", name: "Slate", value: "#475569", display: "#475569" },
  { id: "rust", name: "Rust", value: "#b45309", display: "#b45309" },
  { id: "darkslate", name: "Dark Slate", value: "#334155", display: "#334155" },
  { id: "grad1", name: "Gradient 1", value: "linear-gradient(135deg, #ec4899, #8b5cf6)", display: "linear-gradient(135deg, #ec4899, #8b5cf6)" },
  { id: "grad2", name: "Gradient 2", value: "linear-gradient(135deg, #0f766e, #0369a1)", display: "linear-gradient(135deg, #0f766e, #0369a1)" },
  { id: "grad3", name: "Gradient 3", value: "linear-gradient(135deg, #a855f7, #4f46e5)", display: "linear-gradient(135deg, #a855f7, #4f46e5)" },
  { id: "grad4", name: "Gradient 4", value: "linear-gradient(135deg, #16a34a, #047857)", display: "linear-gradient(135deg, #16a34a, #047857)" },
  { id: "grad5", name: "Gradient 5", value: "linear-gradient(135deg, #ef4444, #f97316)", display: "linear-gradient(135deg, #ef4444, #f97316)" },
  { id: "grad6", name: "Gradient 6", value: "linear-gradient(135deg, #3b82f6, #2563eb)", display: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  { id: "grad7", name: "Gradient 7", value: "linear-gradient(135deg, #ea580c, #b91c1c)", display: "linear-gradient(135deg, #ea580c, #b91c1c)" },
];

const ChatColorPage = () => {
  const { chatColor, setChatColor } = useThemeStore();
  const { updateProfile } = useAuthStore();

  const handleSelectColor = (colorValue) => {
    setChatColor(colorValue);
    updateProfile({ chatColor: colorValue });
  };

  const activeColorValue = chatColor === "auto" ? "#007aff" : chatColor;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/appearance/chat-color" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-medium text-base-content">
          Chat color
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* Preview Area */}
        <div className="bg-base-200/40 p-4 pb-8 flex flex-col gap-3">
          <div className="self-start max-w-[85%] px-4 py-3 bg-base-100 rounded-2xl rounded-tl-sm shadow-sm border border-base-200/50">
            <p className="text-[15px] text-base-content mb-1">Here's a preview of the chat color.</p>
            <p className="text-[11px] text-base-content/50">Now</p>
          </div>
          
          <div 
            className="self-end max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm"
            style={{ background: activeColorValue }}
          >
            <p className="text-[15px] text-white mb-1 drop-shadow-sm">The color is visible to only you.</p>
            <div className="flex justify-end items-center gap-1">
              <p className="text-[11px] text-white/80">Now</p>
              <div className="flex -space-x-1">
                <Check size={12} className="text-white/80" />
                <Check size={12} className="text-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Color Grid */}
        <div className="flex-1 bg-base-100 pt-6 px-6 pb-12">
          <div className="grid grid-cols-4 gap-x-6 gap-y-6 max-w-[400px] mx-auto">
            {CHAT_COLORS.map((c) => (
              <div key={c.id} className="flex justify-center">
                <button
                  onClick={() => handleSelectColor(c.value)}
                  className={`relative rounded-full transition-transform active:scale-95 ${
                    chatColor === c.value ? "w-[60px] h-[60px]" : "w-14 h-14"
                  }`}
                  style={{
                    background: c.display,
                    boxShadow: chatColor === c.value ? "0 0 0 2px var(--fallback-b1,oklch(var(--b1))), 0 0 0 4px currentColor" : "none",
                    color: c.display
                  }}
                >
                  {c.id === "auto" && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[13px] font-bold">
                      Auto
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatColorPage;
