import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Cloud, FileText, Waves } from "lucide-react";

const AppIconPage = () => {
  const icons = [
    { name: "ChatZone", bg: "bg-blue-600 text-white", Icon: MessageSquare, outline: true },
    { name: "ChatZone", bg: "bg-blue-500 text-white", Icon: MessageSquare, outline: false },
    { name: "ChatZone", bg: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white", Icon: MessageSquare, outline: true },
    { name: "ChatZone", bg: "bg-slate-900 text-blue-400", Icon: MessageSquare, outline: false },
    { name: "ChatZone", bg: "bg-gradient-to-tr from-green-400 to-purple-900 text-white", Icon: MessageSquare, outline: false },
    { name: "ChatZone", bg: "bg-blue-500 text-white", Icon: MessageSquare, filled: true },
    { name: "ChatZone", bg: "bg-white text-orange-500 shadow-md", Icon: MessageSquare, filled: true },
    { name: "ChatZone", bg: "bg-yellow-400 text-white", Icon: MessageSquare, filled: true },
    { name: "News", bg: "bg-green-500 text-white", Icon: FileText, outline: false },
    { name: "Notes", bg: "bg-yellow-100 text-green-500 shadow-sm", Icon: FileText, outline: false },
    { name: "Weather", bg: "bg-indigo-500 text-white", Icon: Cloud, outline: false },
    { name: "Waves", bg: "bg-blue-500 text-white", Icon: Waves, outline: false },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/appearance" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">App Icon</h1>
      </header>

      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-2 px-6">
        <p className="text-[15px] text-base-content/80 leading-relaxed mb-8">
          Select an app icon and name, which will be visible on your phone's home screen and app drawer. 
          Notifications will always display the default ChatZone icon and name. <a href="#" className="text-blue-600 font-medium">Learn more</a>
        </p>

        <div className="grid grid-cols-4 gap-y-8 gap-x-4 pb-10">
          {icons.map((icon, i) => (
            <div key={i} className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
              <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center ${icon.bg}`}>
                <icon.Icon size={32} strokeWidth={icon.outline ? 1.5 : 2.5} className={icon.filled ? "fill-current" : ""} />
              </div>
              <span className="text-[13px] font-medium text-base-content/80">{icon.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppIconPage;
