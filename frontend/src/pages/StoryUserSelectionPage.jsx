import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Search, X } from "lucide-react";
import { useChatstore } from "../store/useChatStore";
import { useStorySettingsStore } from "../store/useStorySettingsStore";

const StoryUserSelectionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname.includes("except") ? "EXCEPT" : "ONLY";
  
  const { users, getUsers, isUsersLoading } = useChatstore();
  const { storySettings, updateStorySetting } = useStorySettingsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (users.length === 0) {
      getUsers();
    }
  }, [getUsers, users.length]);

  useEffect(() => {
    if (storySettings) {
      if (mode === "EXCEPT") {
        setSelectedIds(storySettings.excludedUsers || []);
      } else {
        setSelectedIds(storySettings.allowedUsers || []);
      }
    }
  }, [storySettings, mode]);

  const toggleSelection = (userId) => {
    setSelectedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]); // Deselect all if everything is already selected
    } else {
      setSelectedIds(users.map(u => u._id)); // Select all
    }
  };

  const handleSave = async () => {
    if (mode === "EXCEPT") {
      await updateStorySetting("excludedUsers", selectedIds);
      await updateStorySetting("privacyType", "EXCEPT");
    } else {
      await updateStorySetting("allowedUsers", selectedIds);
      await updateStorySetting("privacyType", "ONLY");
    }
    navigate("/settings/stories/my-story");
  };

  const selectedUsersData = useMemo(() => {
    return selectedIds.map(id => {
      const u = users.find(user => user._id === id);
      return u ? {
        id: u._id,
        name: u.fullName || u.username || "Unknown",
        pic: u.profilePic,
        initials: (u.fullName || u.username || "U").slice(0, 2).toUpperCase(),
        color: "bg-base-200 text-base-content"
      } : null;
    }).filter(Boolean);
  }, [selectedIds, users]);

  const connections = useMemo(() => {
    if (!users || users.length === 0) return [];

    let filtered = users;
    if (searchQuery.trim() !== "") {
      filtered = users.filter(u => 
        (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const grouped = filtered.reduce((acc, user) => {
      const name = user.fullName || user.username || "Unknown";
      const letter = name.charAt(0).toUpperCase();
      
      if (!acc[letter]) {
        acc[letter] = { letter, users: [] };
      }
      
      const initials = name.slice(0, 2).toUpperCase();
      acc[letter].users.push({
        id: user._id,
        name,
        pic: user.profilePic,
        initials,
        color: "bg-base-200 text-base-content"
      });
      return acc;
    }, {});

    const sortedGroups = Object.values(grouped).sort((a, b) => a.letter.localeCompare(b.letter));
    
    sortedGroups.forEach(group => {
      group.users.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [users, searchQuery]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans relative">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <button 
          onClick={() => navigate("/settings/stories/my-story")}
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <h1 className="text-[20px] font-normal text-base-content">
          {mode === "EXCEPT" ? "All except..." : "Only share with..."}
        </h1>
      </header>

      {/* Search box */}
      <div className="px-4 py-2">
        <div className="bg-base-200/60 rounded-full flex items-center px-4 py-2.5">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none ml-1 w-full text-[15px] text-base-content placeholder-base-content/50"
          />
        </div>
      </div>

      {/* Selected Chips Area */}
      {selectedUsersData.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto custom-scrollbar scrollbar-hide">
          {selectedUsersData.map(u => (
            <div key={u.id} className="flex items-center gap-2 bg-base-200/80 rounded-full pl-1 pr-3 py-1 shrink-0">
              {u.pic ? (
                <img src={u.pic} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${u.color}`}>
                  {u.initials}
                </div>
              )}
              <span className="text-[13px] font-medium text-base-content">{u.name.split(' ')[0]}</span>
              <X 
                size={14} 
                className="text-base-content/60 cursor-pointer hover:text-base-content" 
                onClick={() => toggleSelection(u.id)} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Contacts header & Select All */}
      <div className="flex items-center justify-between px-4 py-3 mt-1">
        <span className="font-semibold text-[15px] text-base-content">Contacts</span>
        <button 
          onClick={handleSelectAll}
          className="bg-base-200/80 hover:bg-base-300 px-4 py-1.5 rounded-full text-[13px] font-medium text-base-content transition-colors"
        >
          {selectedIds.length === users.length && users.length > 0 ? "Deselect all" : "Select all"}
        </button>
      </div>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-24 overflow-y-auto custom-scrollbar px-4">
        
        {isUsersLoading && connections.length === 0 ? (
          <div className="flex justify-center pt-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center text-base-content/60 pt-8">
            No contacts found.
          </div>
        ) : (
          connections.map((group, idx) => (
            <div key={idx} className="mb-6">
              <div className="text-[14px] font-bold text-base-content/90 mb-4 ml-1">{group.letter}</div>
              <div className="flex flex-col gap-6">
                {group.users.map((user, i) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <div 
                      key={i} 
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleSelection(user.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {user.pic ? (
                            <img src={user.pic} alt={user.name} className="w-11 h-11 rounded-full object-cover" />
                          ) : (
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] ${user.color}`}>
                              {user.initials}
                            </div>
                          )}
                          {/* Mini checkmark badge on avatar (optional, like light mode screenshot) */}
                          {isSelected && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-[1.5px] border-base-100">
                              <Check size={10} className="text-primary-content" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        
                        <div className="text-[16px] text-base-content font-medium">
                          {user.name}
                        </div>
                      </div>

                      {/* Right Checkbox */}
                      <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-base-content/40 group-hover:border-base-content/60'}`}>
                        {isSelected && <Check size={14} className="text-primary-content" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

      </div>

      {/* Floating Done Button */}
      <div className="absolute bottom-6 right-6 z-20">
        <button 
          onClick={handleSave}
          className="bg-base-content text-base-100 hover:bg-base-content/90 px-6 py-3 rounded-full font-medium shadow-xl text-[15px] transition-all hover:scale-105 active:scale-95"
        >
          Done
        </button>
      </div>

    </div>
  );
};

export default StoryUserSelectionPage;
