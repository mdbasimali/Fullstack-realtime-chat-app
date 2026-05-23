export function formatMessageTime(date){
    return new Date(date).toLocaleTimeString("en-US",{
        hour:"numeric",
        minute:"2-digit",
        hour12:true,
    });
}

// Triggers native device vibration if supported
// Light tap: [10], Heavy tap: [30]
export function triggerHapticFeedback(pattern = [10]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors on unsupported devices
    }
  }
}