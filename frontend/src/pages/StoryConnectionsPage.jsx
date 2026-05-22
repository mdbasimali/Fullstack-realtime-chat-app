import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserCircle2 } from "lucide-react";
import { useChatstore } from "../store/useChatStore";

const StoryConnectionsPage = () => {
  const { users, getUsers, isUsersLoading } = useChatstore();

  useEffect(() => {
    if (users.length === 0) {
      getUsers();
    }
  }, [getUsers, users.length]);

  const connections = useMemo(() => {
    if (!users || users.length === 0) return [];

    const grouped = users.reduce((acc, user) => {
      const name = user.fullName || user.username || "Unknown";
      const letter = name.charAt(0).toUpperCase();
      
      if (!acc[letter]) {
        acc[letter] = { letter, users: [] };
      }
      
      const initials = name.slice(0, 2).toUpperCase();
      acc[letter].users.push({
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
  }, [users]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/stories/my-story" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          All ChatZone connections
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar pt-4 px-6">
        
        {isUsersLoading && connections.length === 0 ? (
          <div className="flex justify-center pt-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center text-base-content/60 pt-8">
            No connections found.
          </div>
        ) : (
          connections.map((group, idx) => (
            <div key={idx} className="mb-6">
              <div className="text-[15px] font-bold text-base-content mb-4">{group.letter}</div>
              <div className="flex flex-col gap-6">
                {group.users.map((user, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {user.pic ? (
                      <img src={user.pic} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-[16px] ${user.color}`}>
                        {user.initials}
                      </div>
                    )}
                    <span className="text-[16px] text-base-content font-medium flex items-center gap-2">
                      {user.name} <UserCircle2 size={16} className="text-base-content/50" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
};

export default StoryConnectionsPage;
