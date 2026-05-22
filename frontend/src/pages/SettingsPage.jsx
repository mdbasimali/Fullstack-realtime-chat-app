import React, { useState } from "react";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import { THEMES } from "../constants";
import { 
  ArrowLeft, CircleUser, MonitorSmartphone, Heart, Sun, 
  MessageCircle, Copy, Bell, Lock, History, Info, ShieldCheck, LogOut,
  PieChart, CreditCard, HelpCircle, Mail, Search, MoreVertical, Camera
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [expandedSection, setExpandedSection] = useState(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState("Never");
  
  const [enterIsSend, setEnterIsSend] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const getInitials = (name) => {
    if (!name) return "mr";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toLowerCase();
    }
    return name.slice(0, 2).toLowerCase();
  };

  const toggleSection = (sectionName) => {
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };

  const handleBackupNow = () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          setLastBackupTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " Today");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const MenuItem = ({ icon: Icon, label, onClick, expandedContent }) => (
    <div className="w-full">
      <button 
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center gap-6 hover:bg-base-200 transition-colors text-left"
      >
        <Icon size={24} strokeWidth={1.5} className="text-base-content/80 shrink-0" />
        <span className="text-[16px] text-base-content font-medium">{label}</span>
      </button>
      {expandedContent && expandedSection === label.toLowerCase() && (
        <div className="px-16 pb-4 pt-1 animate-fade-in text-left">
          {expandedContent}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center justify-between bg-base-100 sticky top-0 z-10">
        <Link 
          to="/" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-base-200 text-base-content transition-colors">
            <Search size={24} strokeWidth={2} />
          </button>
          <button className="p-2 -mr-2 rounded-full hover:bg-base-200 text-base-content transition-colors">
            <MoreVertical size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Profile Summary */}
        <div 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center pt-6 pb-8 px-4 cursor-pointer hover:bg-base-200 transition-colors"
        >
          <div className="relative mb-4">
            {authUser?.profilePic ? (
              <img 
                src={authUser.profilePic} 
                alt={authUser.fullName} 
                className="w-[110px] h-[110px] rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-[110px] h-[110px] rounded-full bg-[#f4e6ff] text-[#9b2cfa] flex items-center justify-center font-normal text-[48px] shadow-sm">
                {getInitials(authUser?.fullName)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-[34px] h-[34px] bg-[#1e88e5] rounded-full flex items-center justify-center ring-4 ring-base-100 shadow-sm text-white">
              <Camera size={18} strokeWidth={2} />
            </div>
          </div>

          <div className="text-center flex flex-col items-center max-w-full">
            <h2 className="text-[24px] font-semibold text-base-content leading-tight mb-1 truncate px-4">
              {authUser?.fullName || "User"}
            </h2>
            <p className="text-[15px] text-base-content/60 font-medium truncate px-4">
              {authUser?.phoneNumber ? (
                <span>{authUser.phoneNumber}</span>
              ) : (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/settings/account/add-number');
                  }}
                  className="cursor-pointer hover:text-[#1e88e5] hover:underline transition-colors"
                >
                  No phone number added
                </span>
              )}
              {authUser?.username ? <span> • @{authUser.username}</span> : null}
            </p>
          </div>
        </div>

        {/* Group 1 */}
        <div className="flex flex-col mt-2">
          <MenuItem 
            icon={CircleUser} 
            label="Account" 
            onClick={() => navigate('/settings/account')}
          />
          <MenuItem 
            icon={MonitorSmartphone} 
            label="Linked devices" 
            onClick={() => navigate('/settings/devices')}
          />
          <MenuItem 
            icon={Heart} 
            label="Donate to ChatZone" 
            onClick={() => console.log("Donate clicked")}
          />
        </div>

        {/* Divider */}
        <div className="border-b border-base-200/60 my-2 mx-4" />

        {/* Group 2 */}
        <div className="flex flex-col">
          <MenuItem 
            icon={Sun} 
            label="Appearance" 
            onClick={() => navigate('/settings/appearance')}
          />
          <MenuItem 
            icon={MessageCircle} 
            label="Chats" 
            onClick={() => navigate('/settings/chats')}
          />
          <MenuItem 
            icon={Copy} 
            label="Stories" 
            onClick={() => navigate('/settings/stories')}
          />
          <MenuItem 
            icon={Bell} 
            label="Notifications" 
            onClick={() => navigate('/settings/notifications')}
          />
          <MenuItem 
            icon={Lock} 
            label="Privacy" 
            onClick={() => navigate('/settings/privacy')}
          />
          <MenuItem 
            icon={History} 
            label="Backups" 
            onClick={() => navigate('/settings/backups')}
          />

          {/* Divider */}
          <div className="border-b border-base-200/60 my-2 mx-4" />

          <MenuItem 
            icon={PieChart} 
            label="Data and storage" 
            onClick={() => navigate('/settings/data-storage')}
          />
          <MenuItem 
            icon={CreditCard} 
            label="Payments" 
            onClick={() => console.log("Payments clicked")}
          />
          <MenuItem 
            icon={HelpCircle} 
            label="Help" 
            onClick={() => navigate('/settings/help')}
          />
          <MenuItem 
            icon={Mail} 
            label="Invite your friends" 
            onClick={() => navigate('/settings/invite')}
          />

          <MenuItem 
            icon={LogOut} 
            label="Logout" 
            onClick={logout}
          />
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
