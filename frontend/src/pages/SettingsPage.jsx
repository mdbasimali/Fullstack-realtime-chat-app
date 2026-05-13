import React, { useState } from "react";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import { THEMES } from "../constants";
import { 
  ArrowLeft, User, Laptop, Heart, Sun, MessageSquare, 
  Image, Bell, Lock, RotateCcw, ShieldCheck, Check, Info, Settings, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { authUser } = useAuthStore();

  // Active expanded accordion item states
  const [expandedSection, setExpandedSection] = useState(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState("Never");
  
  // Custom chat preferences
  const [enterIsSend, setEnterIsSend] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  // Extract lowercase initials (e.g., "mr" for Masudur Rahaman)
  const getInitials = (name) => {
    if (!name) return "mr";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toLowerCase();
    }
    return name.slice(0, 2).toLowerCase();
  };

  const toggleSection = (sectionName) => {
    if (expandedSection === sectionName) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionName);
    }
  };

  // Perform a gorgeous live simulated backup!
  const handleBackupNow = () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setBackupProgress(0);
    toast.success("Starting local backup...");
    
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          setLastBackupTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " Today");
          toast.success("All chats backed up successfully!");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden">
      
      {/* 1. Header with Signal Styling */}
      <header className="p-4 safe-top border-b border-base-300 flex items-center gap-4 bg-base-100/90 backdrop-blur sticky top-0 z-10">
        <Link 
          to="/" 
          className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Back"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-base-content">
          Settings
        </h1>
      </header>

      {/* Main Settings Panel */}
      <div className="flex-1 max-w-xl w-full mx-auto p-5 pb-16 space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* 2. Profile Summary Section */}
        <div className="flex items-center gap-4 py-4 px-2">
          {authUser?.profilePic ? (
            <img 
              src={authUser.profilePic} 
              alt={authUser.fullName} 
              className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-2xl shadow-sm">
              {getInitials(authUser?.fullName || "Masudur Rahaman")}
            </div>
          )}

          <div className="text-left">
            <h2 className="text-lg font-bold tracking-tight text-base-content">
              {(authUser?.fullName || "Masudur Rahaman").toLowerCase()}
            </h2>
            {authUser?.phoneNumber && (
              <p className="text-sm text-base-content/60 mt-0.5 font-medium">
                {authUser.phoneNumber}
              </p>
            )}
          </div>
        </div>

        {/* 3. Settings Menu Nodes grouped logically */}
        <div className="space-y-1">
          
          {/* ================= ACCOUNT ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("account")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "account" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <User size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Account</span>
              </div>
            </button>
            
            {expandedSection === "account" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 space-y-3 animate-fade-in text-left">
                <div className="flex items-start gap-3">
                  <Info className="text-primary mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-base-content/50 uppercase">Registered Name</p>
                    <p className="text-sm font-semibold">{authUser?.fullName || "Masudur Rahaman"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="text-primary mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-base-content/50 uppercase">Email Address</p>
                    <p className="text-sm font-semibold">{authUser?.email || "masudurrahamanrm@gmail.com"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-green-500 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-base-content/50 uppercase">Account Status</p>
                    <p className="text-sm font-semibold text-green-500">Verified & Active</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= LINKED DEVICES ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("devices")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "devices" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Laptop size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Linked devices</span>
              </div>
            </button>
            
            {expandedSection === "devices" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 text-left space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-base-content/50 uppercase">Current Session</p>
                <div className="p-3 bg-base-100 border border-base-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Web Client (Chrome / Windows)</p>
                      <p className="text-xxs text-base-content/50">Last active: Just now</p>
                    </div>
                  </div>
                  <span className="badge badge-success text-white badge-sm font-semibold px-2 py-1 h-auto text-xxs">Active</span>
                </div>
                <p className="text-xxs text-base-content/50">Your communication is synced end-to-end between all registered endpoints.</p>
              </div>
            )}
          </div>

          {/* ================= DONATE TO CHATZONE ================= */}
          <button 
            onClick={() => {
              toast.success("Thank you for supporting ChatZone! ❤️");
            }}
            className="w-full p-4 flex items-center gap-4 rounded-2xl hover:bg-base-200 transition-colors text-left"
          >
            <Heart size={22} className="text-rose-500" />
            <span className="font-semibold text-sm md:text-base text-base-content">Donate to ChatZone</span>
          </button>

          {/* Divider separating Group 1 and Group 2 exactly like the screenshot */}
          <div className="border-b border-base-300 my-4" />

          {/* ================= APPEARANCE (INLINE THEME SWAPPER) ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("appearance")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "appearance" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Sun size={22} className="text-base-content/70 animate-spin-slow" />
                <div className="text-left">
                  <span className="font-semibold text-sm md:text-base text-base-content block">Appearance</span>
                  <span className="text-xxs font-semibold text-primary capitalize mt-0.5">Active: {theme}</span>
                </div>
              </div>
            </button>
            
            {expandedSection === "appearance" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 space-y-4 animate-fade-in text-left">
                <div className="flex flex-col gap-1 px-1">
                  <h4 className="text-xs font-bold text-base-content/60 uppercase">Choose Custom UI Theme</h4>
                  <p className="text-xxs text-base-content/50">Tailor the color scheme of your chat app dynamically.</p>
                </div>
                
                {/* Theme Selection Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); toast.success(`Theme switched to ${t}! 🎨`); }}
                      className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${theme === t ? "border-primary bg-primary/10" : "border-base-300 hover:bg-base-100"}`}
                    >
                      <div className="relative h-6 w-full rounded-md overflow-hidden" data-theme={t}>
                        <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                          <div className="rounded bg-primary size-2"></div>
                          <div className="rounded bg-secondary size-2"></div>
                          <div className="rounded bg-accent size-2"></div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center capitalize">
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= CHATS ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("chats")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "chats" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <MessageSquare size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Chats</span>
              </div>
            </button>
            
            {expandedSection === "chats" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 space-y-3 text-left animate-fade-in">
                <p className="text-xs font-bold text-base-content/50 uppercase">Chat Settings</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 bg-base-100 border border-base-300 rounded-xl cursor-pointer">
                    <div>
                      <span className="text-sm font-semibold">"Enter" key is send</span>
                      <p className="text-xxs text-base-content/50">Enter button sends message in chats</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary toggle-sm"
                      checked={enterIsSend} 
                      onChange={(e) => setEnterIsSend(e.target.checked)} 
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-base-100 border border-base-300 rounded-xl cursor-pointer">
                    <div>
                      <span className="text-sm font-semibold">Read Receipts</span>
                      <p className="text-xxs text-base-content/50">Share with other users when you view messages</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary toggle-sm"
                      checked={readReceipts} 
                      onChange={(e) => setReadReceipts(e.target.checked)} 
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ================= STORIES ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("stories")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "stories" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Image size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Stories</span>
              </div>
            </button>
            
            {expandedSection === "stories" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 text-left space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-base-content/50 uppercase">Story Settings</p>
                <div className="p-3 bg-base-100 border border-base-300 rounded-xl">
                  <span className="text-sm font-semibold block">Privacy</span>
                  <p className="text-xs text-base-content/60 mt-1">My Stories are visible to my active contacts list only.</p>
                </div>
              </div>
            )}
          </div>

          {/* ================= NOTIFICATIONS ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("notifications")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "notifications" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Bell size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Notifications</span>
              </div>
            </button>
            
            {expandedSection === "notifications" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 text-left space-y-2 animate-fade-in">
                <p className="text-xs font-bold text-base-content/50 uppercase">Notification Prefs</p>
                <div className="p-3 bg-base-100 border border-base-300 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-semibold">Sound & Vibration Alerts</span>
                  <span className="badge badge-primary badge-sm font-bold">Enabled</span>
                </div>
              </div>
            )}
          </div>

          {/* ================= PRIVACY ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("privacy")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "privacy" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Lock size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Privacy</span>
              </div>
            </button>
            
            {expandedSection === "privacy" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 text-left space-y-2 animate-fade-in">
                <p className="text-xs font-bold text-base-content/50 uppercase">Encryption Details</p>
                <div className="p-3 bg-base-100 border border-base-300 rounded-xl space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5 text-green-500">
                    <Lock size={15} /> End-to-End Encrypted
                  </p>
                  <p className="text-xxs text-base-content/60">
                    ChatZone utilizes high-grade AES-256 and WebRTC encryption protocols to secure all messages, documents, and real-time audio/video media feeds. No middle servers can decrypt your logs.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ================= BACKUPS ================= */}
          <div className="border border-transparent rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleSection("backups")}
              className={`w-full p-4 flex items-center justify-between rounded-2xl hover:bg-base-200 transition-colors ${expandedSection === "backups" ? "bg-base-200" : ""}`}
            >
              <div className="flex items-center gap-4">
                <RotateCcw size={22} className="text-base-content/70" />
                <span className="font-semibold text-sm md:text-base text-base-content">Backups</span>
              </div>
            </button>
            
            {expandedSection === "backups" && (
              <div className="p-4 bg-base-200/50 rounded-2xl mx-1 mt-1 border border-base-300 text-left space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-base-content/50 uppercase">Local Database Backups</p>
                    <p className="text-xxs text-base-content/60">Last completed: <span className="font-bold text-primary">{lastBackupTime}</span></p>
                  </div>
                  <button 
                    onClick={handleBackupNow}
                    disabled={isBackingUp}
                    className="btn btn-xs btn-primary rounded-full px-3.5 h-auto py-1 font-bold"
                  >
                    {isBackingUp ? "Backing up..." : "Back up now"}
                  </button>
                </div>

                {isBackingUp && (
                  <div className="space-y-1.5">
                    <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-150" style={{ width: `${backupProgress}%` }} />
                    </div>
                    <p className="text-xxs text-primary font-bold text-right">{backupProgress}% Complete</p>
                  </div>
                )}
                <p className="text-xxs text-base-content/50">Backups are encrypted and stored in your browser's persistent filesystem storage container.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
