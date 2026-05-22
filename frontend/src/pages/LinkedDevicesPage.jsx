import React, { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { 
  ArrowLeft, Laptop, Smartphone, Trash2, X, 
  ShieldAlert, Loader2, Lock 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";

const LinkedDevicesIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6 mx-auto">
    {/* Laptop screen */}
    <rect x="30" y="30" width="90" height="60" rx="6" fill="#eff6ff" stroke="#4338ca" strokeWidth="2.5" />
    {/* Laptop base */}
    <path d="M 15 95 L 135 95" stroke="#4338ca" strokeWidth="4" strokeLinecap="round" />
    <path d="M 30 90 L 120 90" stroke="#4338ca" strokeWidth="2" />
    
    {/* Phone */}
    <rect x="130" y="45" width="35" height="50" rx="8" fill="#eff6ff" stroke="#4338ca" strokeWidth="2.5" />
    
    {/* Chat bubbles */}
    <rect x="90" y="15" width="55" height="16" rx="8" fill="#eff6ff" stroke="#4338ca" strokeWidth="2.5" />
    <rect x="75" y="40" width="45" height="16" rx="8" fill="#eff6ff" stroke="#4338ca" strokeWidth="2.5" />
    <rect x="100" y="65" width="50" height="16" rx="8" fill="#eff6ff" stroke="#4338ca" strokeWidth="2.5" />
  </svg>
);

const LinkedDevicesPage = () => {
  const navigate = useNavigate();
  const { 
    linkedDevices, 
    isFetchingDevices, 
    getLinkedDevices, 
    revokeDevice, 
    linkDevice 
  } = useAuthStore();

  const [scanning, setScanning] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  
  const html5QrCodeRef = useRef(null);
  const qrRegionId = "qr-reader-viewport";

  useEffect(() => {
    getLinkedDevices();
  }, [getLinkedDevices]);

  const startScanner = async () => {
    setScanning(true);
    // Let the DOM render the viewport container first
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
          },
          async (decodedText) => {
            // Found a QR code
            await handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Ignore debug spam
          }
        );
      } catch (err) {
        console.error("Error starting camera:", err);
        toast.error("Camera access failed. Please grant permission.");
        setScanning(false);
      }
    }, 400);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    if (navigator.vibrate) {
      navigator.vibrate([100]); // Short vibration feedback
    }
    
    await stopScanner();
    setIsLinking(true);

    try {
      await linkDevice(decodedText);
      toast.success("Device linked successfully!");
      getLinkedDevices();
    } catch (err) {
      toast.error(err || "Failed to link device");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    toast.promise(
      revokeDevice(sessionId),
      {
        loading: "Logging out device...",
        success: "Session revoked successfully!",
        error: "Failed to revoke device",
      }
    );
    setConfirmRevoke(null);
  };

  useEffect(() => {
    return () => {
      // Clean up scanning if page unmounts
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const getDeviceIcon = (os = "") => {
    const lowerOS = os.toLowerCase();
    if (lowerOS.includes("windows") || lowerOS.includes("mac") || lowerOS.includes("linux")) {
      return <Laptop className="size-6 text-base-content/80" />;
    }
    return <Smartphone className="size-6 text-base-content/80" />;
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden text-base-content font-sans">
      {/* Header */}
      <header className="px-4 py-3 safe-top flex items-center gap-6 bg-base-100 sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 -ml-2 rounded-full hover:bg-base-200 text-base-content transition-colors"
          title="Back to Settings"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </Link>
        <h1 className="text-[22px] font-normal tracking-tight">Linked devices</h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full mx-auto overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* Top Hero Section */}
        <div className="flex flex-col items-center pt-10 px-6 text-center">
          <LinkedDevicesIllustration />

          <p className="text-[15px] text-base-content font-medium mb-1">
            Use this ChatZone account on desktop or iPad.
          </p>
          <a href="#" className="text-blue-600 font-medium text-[14px] mb-8 hover:underline">
            Learn more
          </a>

          <button
            onClick={startScanner}
            disabled={isLinking}
            className="w-full py-3.5 bg-blue-100 text-blue-900 rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
          >
            {isLinking && <Loader2 className="size-5 animate-spin" />}
            Link a new device
          </button>
        </div>

        {/* Divider */}
        <div className="w-full border-b border-base-200/60 my-6" />

        {/* List Header */}
        <div className="px-6 flex-1 flex flex-col">
          <h3 className="text-[16px] font-bold text-base-content mb-6 text-left">
            My linked devices
          </h3>

          {isFetchingDevices ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-primary opacity-40" />
            </div>
          ) : linkedDevices.length === 0 ? (
            <div className="text-center py-6 text-[14px] text-base-content/60 font-medium">
              No linked devices
            </div>
          ) : (
            <div className="space-y-4">
              {linkedDevices.map((device) => (
                <div 
                  key={device.sessionId}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-base-200/50 rounded-full">
                      {getDeviceIcon(device.os)}
                    </div>
                    <div className="text-left">
                      <p className="text-[15px] font-semibold text-base-content">{device.deviceName}</p>
                      <p className="text-[13px] text-base-content/60 mt-0.5">
                        Last active {new Date(device.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmRevoke(device.sessionId)}
                    className="p-2 rounded-full text-base-content/40 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Log out device"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-auto pt-10 pb-8 flex items-start justify-center gap-2 text-base-content/60 text-[12px] text-center px-4">
            <Lock size={14} className="shrink-0 mt-0.5" strokeWidth={2} />
            <span className="max-w-[250px] leading-tight">Messages and chat info are protected by end-to-end encryption on all devices</span>
          </div>
        </div>

      </div>

      {/* Confirmation Dialog Modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-base-100 border border-base-300 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-error">
              <ShieldAlert className="size-6" />
              <h3 className="text-lg font-bold">Log out device?</h3>
            </div>
            <p className="text-xs text-base-content/75 text-left leading-relaxed">
              Are you sure you want to log out this linked device? Any unsaved chats or drafts will be disconnected immediately.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="btn btn-sm btn-ghost rounded-full px-4"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                className="btn btn-sm btn-error text-white rounded-full px-4"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Camera Scanner Overlay */}
      {scanning && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between">
          {/* Top Bar inside Camera */}
          <div className="p-4 flex items-center justify-between text-white bg-black/45 backdrop-blur-md">
            <h2 className="text-sm font-bold tracking-wide">Scan Desktop QR</h2>
            <button
              onClick={stopScanner}
              className="p-2 rounded-full hover:bg-white/10 text-white/95 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Camera Viewport Container */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-neutral">
            {/* html5-qrcode reader element */}
            <div 
              id={qrRegionId} 
              className="w-full h-full max-w-md"
              style={{ minHeight: "280px" }}
            ></div>

            {/* Custom Overlay Scanning Frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[250px] h-[250px] border-2 border-primary/60 rounded-3xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Neon Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl -mb-1 -mr-1"></div>

                {/* Laser Animation line */}
                <div className="absolute top-2 w-[90%] h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>
              </div>
            </div>
          </div>

          {/* Bottom Bar Inside Camera */}
          <div className="p-6 bg-black/45 backdrop-blur-md text-white/70 text-xs text-center space-y-2">
            <p className="font-semibold text-white">To Link Device:</p>
            <p className="max-w-xs mx-auto text-xxs">
              Open chatzone.cloudnexis.in on your computer and point your camera at the QR code displayed there.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedDevicesPage;
