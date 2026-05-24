import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatstore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useCallStore } from "../store/useCallStore";

const MINIMIZE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const usePWALifecycle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Determine if this is a fresh app launch / full PWA cold start
    const isSessionActive = sessionStorage.getItem("pwa_session_active");
    
    // We only perform cold start resets on the very first mount of the app
    if (!isSessionActive) {
      sessionStorage.setItem("pwa_session_active", "true");

      // 1. Clear ALL persisted selected user keys from localStorage since authUser isn't loaded yet
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("selected_user_")) {
          localStorage.removeItem(key);
        }
      });

      // 2. Clear modal states from stores
      useChatstore.getState().setSelectedUser(null);
      useChatstore.getState().setSelectedUserId(null);
      useChatstore.getState().setIsContactsModalOpen(false);
      useChatstore.getState().setIsStoryViewerOpen(false);
      useChatstore.getState().setIsSubViewOpen(false);
      useChatstore.getState().setIsProfileModalOpen(false);
      
      useGroupStore.getState().setSelectedGroup(null);
      useGroupStore.getState().setShowGroupCallModal(false);

      useCallStore.getState().setIsMinimized(false);

      const currentPath = window.location.pathname;
      const allowedColdStartRoutes = ["/", "/login", "/signup", "/setup-pin", "/create-pin"];
      
      // If the app is launched into a deep nested route or settings, intercept and reset
      if (!allowedColdStartRoutes.includes(currentPath)) {
        // 3. Redirect strictly to Home
        navigate("/", { replace: true });
        
        // 4. Purge history cleanly
        if (window.history && window.history.pushState) {
          window.history.pushState({ appState: 'forward' }, '');
        }
      }
    }

    // Handle visibility change for smart minimize vs kill
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // App backgrounded
        localStorage.setItem("pwa_last_hidden_time", Date.now().toString());
      } else if (document.visibilityState === "visible") {
        // App foregrounded
        const lastHiddenStr = localStorage.getItem("pwa_last_hidden_time");
        if (lastHiddenStr) {
          const lastHiddenTime = parseInt(lastHiddenStr, 10);
          const timeInBackground = Date.now() - lastHiddenTime;

          if (timeInBackground > MINIMIZE_THRESHOLD_MS) {
            // App was backgrounded for a long time, we could potentially auto-minimize the chat here.
            // But WhatsApp preserves chat state if the process wasn't killed, so we do nothing, letting it be native.
            // The cold-start block above handles actual process kills.
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate]);
};
