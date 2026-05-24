import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, AtSign, Hash, Check, Loader2 } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatstore } from "../store/useChatStore";
import toast from "react-hot-toast";

const AddMembersSidebar = ({ onClose }) => {
  const { selectedGroup, selectedGroupDetails, addMembersToGroup } = useGroupStore();
  const { users } = useChatstore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out users who are already in the group
  const existingMemberIds = new Set(
    selectedGroupDetails?.members?.map((m) => m._id) || selectedGroup?.members || []
  );

  const availableUsers = useMemo(() => {
    return users.filter((user) => !existingMemberIds.has(user._id));
  }, [users, existingMemberIds]);

  // Filter by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter((user) => 
      user.fullName?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  }, [searchQuery, availableUsers]);

  // Group by first letter
  const groupedUsers = useMemo(() => {
    const groups = {};
    filteredUsers.forEach((user) => {
      const firstLetter = (user.fullName?.[0] || "?").toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(user);
    });
    // Sort keys alphabetically
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }, [filteredUsers]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) => 
      prev.includes(userId) 
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDone = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsSubmitting(true);
    
    // Add all selected members at once
    const success = await addMembersToGroup(selectedGroup._id, selectedUsers);

    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full md:max-w-[400px] md:static md:w-[400px] border-l border-base-300 bg-base-100 z-50 flex flex-col h-full overflow-hidden animate-slide-left shrink-0 shadow-2xl">
      {/* Top Bar */}
      <div className="p-4 flex items-center gap-4 bg-base-100">
        <button
          onClick={onClose}
          className="p-2 hover:bg-base-200 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-base-content" />
        </button>
        <span className="text-[20px] font-medium text-base-content">
          {selectedUsers.length === 0 ? "1 member" : `${selectedUsers.length + 1} members`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* Search Bar */}
        <div className="px-6 py-2">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Name, username or number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-base-200/60 dark:bg-base-200/40 text-base-content placeholder-base-content/50 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-[15px]"
            />
            <div className="absolute right-4 flex items-center gap-1 opacity-40">
              <div className="w-1 h-1 bg-current rounded-full" />
              <div className="w-1 h-1 bg-current rounded-full" />
              <div className="w-1 h-1 bg-current rounded-full" />
            </div>
          </div>
        </div>

        {/* Find by options */}
        {!searchQuery && (
          <div className="flex flex-col px-4 mt-2">
            <div className="flex items-center gap-4 p-3 hover:bg-base-200/50 rounded-2xl cursor-pointer transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center justify-center">
                <AtSign className="w-5 h-5" />
              </div>
              <span className="text-[16px] font-medium text-base-content">Find by username</span>
            </div>
            <div className="flex items-center gap-4 p-3 hover:bg-base-200/50 rounded-2xl cursor-pointer transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <span className="text-[16px] font-medium text-base-content">Find by phone number</span>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="px-4 mt-6 pb-24">
          <h3 className="text-[14px] font-bold text-base-content mb-4 px-2">Contacts</h3>
          
          {Object.entries(groupedUsers).map(([letter, usersInGroup]) => (
            <div key={letter} className="mb-6">
              <div className="text-[15px] font-bold text-base-content/80 px-2 mb-2">
                {letter}
              </div>
              <div className="flex flex-col gap-1">
                {usersInGroup.map((user) => {
                  const isSelected = selectedUsers.includes(user._id);
                  return (
                    <div 
                      key={user._id} 
                      onClick={() => toggleUserSelection(user._id)}
                      className="flex items-center justify-between p-2 hover:bg-base-200/50 rounded-2xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={user.profilePic || "/avatar.png"} 
                          alt={user.fullName} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                        <span className="text-[16px] font-medium text-base-content">
                          {user.fullName}
                        </span>
                      </div>
                      
                      {/* Custom Checkbox */}
                      <div className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                        isSelected 
                          ? "bg-primary border-primary text-white" 
                          : "border-base-content/30"
                      }`}>
                        {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-base-content/50">
              No contacts found
            </div>
          )}
        </div>
      </div>

      {/* Done Button */}
      {selectedUsers.length > 0 && (
        <div className="absolute bottom-6 right-6 z-10 animate-scale-in">
          <button
            onClick={handleDone}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-focus text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-primary/30 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Done</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddMembersSidebar;
