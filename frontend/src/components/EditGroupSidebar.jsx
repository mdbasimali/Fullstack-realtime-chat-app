import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Loader2, X, Image as ImageIcon, Type, Users } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const EditGroupSidebar = ({ onClose }) => {
  const { selectedGroup, updateGroup, isUpdatingGroup } = useGroupStore();
  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [avatarPreview, setAvatarPreview] = useState(selectedGroup?.avatar || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  
  const fileInputRef = useRef(null);

  const emojis = ["❤️", "🏠", "🍉", "🍹", "🎉", "🎈", "📖", "💼", "🌅", "🏄", "⚽", "🏈"];

  const handleEmojiSelect = (emoji) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    // Background based on emoji index to add some color variety
    const colors = ["#fce4ec", "#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#ffebee"];
    const colorIndex = emojis.indexOf(emoji) % colors.length;
    
    ctx.fillStyle = colors[colorIndex];
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "250px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 256, 280); // slight y offset for centering

    const dataUrl = canvas.toDataURL("image/png");
    setAvatarPreview(dataUrl);
    setAvatarFile(dataUrl);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setAvatarPreview(reader.result);
        setAvatarFile(reader.result); // Base64 string for upload
      };
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    const updates = { name: name.trim() };
    if (description !== selectedGroup?.description) {
      updates.description = description.trim();
    }
    if (avatarFile) {
      updates.avatar = avatarFile;
    }

    const success = await updateGroup(selectedGroup._id, updates);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full md:max-w-[400px] md:static md:w-[400px] border-l border-base-300 bg-base-100 z-[60] flex flex-col h-full overflow-hidden animate-slide-in shrink-0 shadow-2xl">
      
      {isAvatarPickerOpen ? (
        <>
          {/* Avatar Picker Top Bar */}
          <div className="p-4 flex items-center bg-base-100">
            <button
              onClick={() => setIsAvatarPickerOpen(false)}
              className="p-2 hover:bg-base-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-base-content" />
            </button>
          </div>

          {/* Avatar Picker Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center">
            
            <div className="w-40 h-40 rounded-full bg-base-200 text-base-content/40 flex items-center justify-center overflow-hidden mb-8 border border-base-300">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Group Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-16 h-16 opacity-50" />
              )}
            </div>

            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary hover:bg-blue-100 transition-colors">
                  <Camera className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium text-base-content">Camera</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary hover:bg-blue-100 transition-colors">
                  <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium text-base-content">Photo</span>
              </button>

              <button 
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary hover:bg-blue-100 transition-colors">
                  <span className="text-xl font-bold">Aa</span>
                </div>
                <span className="text-[13px] font-medium text-base-content">Text</span>
              </button>
            </div>

            <div className="w-full h-[1px] bg-base-200 mb-6"></div>

            <div className="grid grid-cols-4 gap-4 w-full px-2">
              {emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="aspect-square flex items-center justify-center rounded-full hover:bg-base-200 transition-colors text-4xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          {/* Avatar Picker Save Button */}
          <div className="p-6 bg-base-100 flex justify-end">
            <button 
              onClick={() => setIsAvatarPickerOpen(false)}
              className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-primary px-8 py-3 rounded-full font-bold transition-colors"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Top Bar */}
          <div className="p-4 flex items-center gap-4 bg-base-100 border-b border-base-200">
            <button
              onClick={onClose}
              className="p-2 hover:bg-base-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-base-content" />
            </button>
            <h2 className="text-[20px] font-medium text-base-content">Edit group</h2>
          </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center">
        
        {/* Avatar Upload */}
        <div className="relative mb-10 group cursor-pointer" onClick={() => setIsAvatarPickerOpen(true)}>
          <div className="w-28 h-28 rounded-full bg-base-200 text-base-content/40 flex items-center justify-center overflow-hidden border-2 border-base-300">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Group Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-4xl font-bold uppercase text-primary">
                {name ? name.slice(0, 2) : "GR"}
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 right-0 bg-base-100 p-1.5 rounded-full shadow-md border border-base-300 hover:bg-base-200 transition-colors">
            <Camera className="w-5 h-5 text-base-content" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            className="hidden" 
            accept="image/*"
          />
        </div>

        {/* Inputs */}
        <div className="w-full space-y-4">
          <div className="form-control w-full">
            <label className="label pt-0 pb-1">
              <span className="label-text text-primary text-xs font-semibold">Group name</span>
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary/80 pb-2 text-[16px] text-base-content"
              placeholder="Enter group name"
            />
          </div>

          <div className="form-control w-full mt-6">
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-base-200/50 p-4 rounded-md focus:outline-none focus:bg-base-200 transition-colors text-[16px] text-base-content border-none"
              placeholder="Group description"
            />
            <label className="label pb-0 pt-2">
              <span className="label-text-alt text-base-content/60 text-[13px] leading-tight">
                Group descriptions will be visible to members of this group and people who have been invited.
              </span>
            </label>
          </div>
        </div>

      </div>

      <div className="p-6 bg-base-100 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isUpdatingGroup}
          className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-primary px-8 py-3 rounded-full font-bold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {isUpdatingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
        </button>
      </div>
        </>
      )}
    </div>
  );
};

export default EditGroupSidebar;
