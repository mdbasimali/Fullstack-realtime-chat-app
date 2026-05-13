import React from 'react'
import { MessageSquare } from 'lucide-react'

const NoChatSelected = () => {
  return (
    <div className='w-full flex-1 flex flex-col items-center justify-center p-8 bg-base-100/50 relative overflow-hidden select-none'>
        {/* Subtle background gradients for premium glassmorphism effect */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className='max-w-md text-center space-y-6 z-10'>
            {/* Animated Icon Display */}
            <div className='flex justify-center gap-4 mb-2'>
                <div className='relative'>
                    <div className='w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 shadow-sm animate-pulse'>
                      <MessageSquare className="w-10 h-10 text-primary fill-primary/10"/>
                    </div>
                </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-2">
                <h2 className='text-2xl font-extrabold tracking-tight text-base-content'>
                  ChatZone Desktop
                </h2>
                <p className='text-sm text-base-content/60 max-w-[280px] mx-auto leading-relaxed'>
                  Select a contact from the sidebar or click the pencil icon to begin a secure chat session.
                </p>
            </div>
    
        </div>
      
    </div>
  )
}

export default NoChatSelected
