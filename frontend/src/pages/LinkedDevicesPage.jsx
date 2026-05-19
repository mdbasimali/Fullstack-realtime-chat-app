import React, { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { 
  ArrowLeft, Laptop, Smartphone, Trash2, Camera, X, 
  ShieldAlert, QrCode, Loader2, Info 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";

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
      return <Laptop className="size-6 text-primary" />;
    }
    return <Smartphone className="size-6 text-primary" />;
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-base-100 select-none overflow-hidden text-base-content">
      {/* Header */}
      <header className="p-4 safe-top border-b border-base-300 flex items-center gap-4 bg-base-100/90 backdrop-blur sticky top-0 z-10">
        <Link 
          to="/settings" 
          className="p-2 rounded-full hover:bg-base-200 text-base-content/80 transition-colors"
          title="Back to Settings"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Linked Devices</h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-xl w-full mx-auto p-5 pb-16 space-y-6 overflow-y-auto custom-scrollbar relative">
        {/* Intro Info Banner */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex gap-3 text-left">
          <Info className="text-primary size-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-primary">Multi-Device Link</h4>
            <p className="text-base-content/75 leading-relaxed">
              Use ChatZone on other devices (Desktop, Web Browser) without keeping your phone online. Scan the QR code to link a device.
            </p>
          </div>
        </div>

        {/* Link Button */}
        <div className="flex flex-col items-center justify-center py-4">
          <button
            onClick={startScanner}
            disabled={isLinking}
            className="btn btn-primary rounded-full px-6 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-102 transition-transform"
          >
            {isLinking ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <QrCode className="size-5" />
            )}
            Link a Device
          </button>
        </div>

        {/* List Header */}
        <div className="space-y-3 text-left">
          <h3 className="text-xs font-bold text-base-content/50 uppercase tracking-wider px-1">
            Active Devices ({linkedDevices.length})
          </h3>

          {isFetchingDevices ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-primary opacity-40" />
            </div>
          ) : linkedDevices.length === 0 ? (
            <div className="text-center py-10 bg-base-200/30 rounded-2xl border border-dashed border-base-300">
              <Laptop className="size-10 mx-auto text-base-content/20 mb-2" />
              <p className="text-sm font-semibold text-base-content/50">No linked devices found</p>
              <p className="text-xs text-base-content/40 mt-1">Scan QR code on desktop to add one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedDevices.map((device) => (
                <div 
                  key={device.sessionId}
                  className="p-4 bg-base-200/50 border border-base-300 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-base-100 rounded-xl border border-base-300">
                      {getDeviceIcon(device.os)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{device.deviceName}</p>
                      <p className="text-xxs text-base-content/50 mt-0.5">
                        Last Active: {new Date(device.lastActive).toLocaleDateString()} {new Date(device.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xxs text-base-content/40 mt-0.5">IP: {device.ip}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmRevoke(device.sessionId)}
                    className="p-2 rounded-xl text-error hover:bg-error/10 transition-colors"
                    title="Log out device"
                  >
                    <Trash2 className="size-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
