import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useChatstore } from "../store/useChatStore";
import toast from "react-hot-toast";

const ContactUsPage = () => {
  const navigate = useNavigate();
  const { users, getUsers, sendMessage, setSelectedUser } = useChatstore();

  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("Please select an option");
  const [feeling, setFeeling] = useState(5); // 1 to 5
  const [includeLog, setIncludeLog] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const handleNext = async () => {
    if (!message.trim()) return;
    setIsSending(true);

    try {
      // Try to find a user named "Support" or username "support"
      let supportUser = users.find(u => u.username?.toLowerCase() === "support" || u.fullName?.toLowerCase() === "support");
      
      if (supportUser) {
        await sendMessage({
          receiverId: supportUser._id,
          text: `[Support Request: ${reason}]\nFeeling: ${feeling}/5\nInclude Log: ${includeLog}\n\n${message}`
        });
        toast.success("Support request sent!");
        setSelectedUser(supportUser);
        navigate("/"); // Navigate to chat section to make it visible
      } else {
        toast.error("Support account not found in database.");
      }
    } catch (err) {
      toast.error("Failed to send request.");
    } finally {
      setIsSending(false);
    }
  };

  // Emojis mapping
  const emojis = [
    { id: 1, src: "😀" },
    { id: 2, src: "🙂" },
    { id: 3, src: "😐" },
    { id: 4, src: "🙁" },
    { id: 5, src: "😠" },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings/help" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Help
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar flex flex-col">
        
        <div className="px-5 py-2 flex-1">
          <h2 className="text-[14px] font-bold text-base-content mb-3">Contact us</h2>
          
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-40 bg-base-200/50 rounded-md p-3 text-[16px] text-base-content resize-none border border-transparent focus:border-primary focus:outline-none mb-6"
            placeholder="Tell us what's going on"
          />

          <h3 className="text-[14px] text-base-content font-medium mb-2">Tell us why you're reaching out.</h3>
          
          <div className="relative mb-6 pb-2">
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full appearance-none bg-transparent text-[16px] text-base-content font-medium border-none focus:outline-none z-10 relative cursor-pointer"
            >
              <option>Please select an option</option>
              <option>Something's Not Working</option>
              <option>Feature Request</option>
              <option>Question</option>
              <option>Feedback</option>
              <option>Payments</option>
              <option>Donations & Badges</option>
              <option>ChatZone Android Backup</option>
              <option>Other</option>
            </select>
            <ChevronDown size={20} className="absolute right-0 top-0 text-base-content pointer-events-none z-0" />
          </div>

          <h3 className="text-[14px] text-base-content font-medium mb-4">How do you feel? (Optional)</h3>
          
          <div className="flex items-center gap-3 mb-8">
            {emojis.map((emoji) => (
              <button
                key={emoji.id}
                onClick={() => setFeeling(emoji.id)}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-3xl transition-all ${
                  feeling === emoji.id ? "bg-blue-600 shadow-md scale-105" : "bg-base-200 hover:bg-base-300"
                }`}
              >
                {emoji.src}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeLog} 
                onChange={(e) => setIncludeLog(e.target.checked)}
                className="checkbox checkbox-primary checkbox-sm rounded border-2"
              />
              <span className="text-[14px] text-base-content/80 font-medium">Include debug log.</span>
            </label>
            <button className="text-[14px] text-blue-600 font-medium">What's this?</button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 flex items-center justify-between mt-auto bg-base-100">
          <button className="text-[15px] text-blue-700 font-medium px-2">
            Have you read our FAQ yet?
          </button>
          <button 
            disabled={!message.trim() || isSending}
            onClick={handleNext}
            className="px-6 py-2.5 rounded-full font-medium text-[15px] transition-colors disabled:bg-base-200 disabled:text-base-content/40 bg-primary text-primary-content"
          >
            {isSending ? "Sending..." : "Next"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContactUsPage;
