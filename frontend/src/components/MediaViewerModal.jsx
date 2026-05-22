import React, { useEffect } from 'react';
import { ArrowLeft, MoreVertical, Share2, Forward, Download } from 'lucide-react';
import { formatMessageTime } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const MediaViewerModal = ({ message, onClose, onDownload }) => {
  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!message) return null;

  const isVideo = message.messageType === 'video';
  const senderName = message.senderId?.fullName || "You";

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px]">{senderName}</span>
              <span className="text-[12px] opacity-70">{formatMessageTime(message.createdAt)}</span>
            </div>
          </div>
          <button className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={24} />
          </button>
        </div>

        {/* Media Content */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden cursor-pointer" 
          onClick={onClose}
        >
          {isVideo ? (
            <video
              src={message.image}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={message.image}
              alt="Media full view"
              className="max-w-full max-h-full object-contain cursor-default select-none"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between p-5 pb-8 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 w-full z-10">
          <button className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <Share2 size={24} />
          </button>
          
          <button onClick={() => onDownload(message.image, message.messageType)} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
            <Download size={24} />
          </button>

          <button className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors">
            <Forward size={24} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaViewerModal;
