import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal text-base-content">
          Help
        </h1>
      </header>

      {/* Main Panel */}
      <div className="flex-1 w-full mx-auto pb-16 overflow-y-auto custom-scrollbar">
        
        {/* Support items */}
        <div className="flex flex-col mt-2 mb-2">
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Support center</span>
            <ExternalLink size={20} className="text-base-content/60" strokeWidth={1.5} />
          </button>
          <button 
            onClick={() => navigate('/settings/help/contact')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-base-content font-medium">Contact us</span>
          </button>
        </div>

        <div className="border-b border-base-200/60 mx-0" />

        {/* Info Section */}
        <div className="flex flex-col mt-2 mb-4">
          <button className="w-full px-6 py-4 flex flex-col hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Version</span>
            <span className="text-[14px] text-base-content/60 mt-0.5">8.10.2</span>
          </button>
          
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Debug log</span>
          </button>

          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left">
            <span className="text-[16px] text-base-content font-medium">Licenses</span>
          </button>

          <button 
            onClick={() => navigate('/settings/help/terms')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-base-200 transition-colors text-left"
          >
            <span className="text-[16px] text-base-content font-medium">Terms & Privacy Policy</span>
            <ExternalLink size={20} className="text-base-content/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Footer info */}
        <div className="px-6 py-2">
          <p className="text-[14px] text-base-content/60 leading-relaxed">
            Copyright ChatZone Messenger<br />
            Licensed under the GNU AGPLv3<br />
            ChatZone is a 501c3 nonprofit
          </p>
        </div>

      </div>
    </div>
  );
};

export default HelpPage;
