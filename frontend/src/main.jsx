import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

// Register the service worker for PWA support
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

// Cold start routing interceptor to completely prevent flashing
const isFirstRender = sessionStorage.getItem("pwa_first_render");
if (!isFirstRender) {
  sessionStorage.setItem("pwa_first_render", "true");
  
  const currentPath = window.location.pathname;
  const allowedColdStartRoutes = ["/", "/login", "/signup", "/setup-pin", "/create-pin"];
  
  // If Chrome PWA restored a deep nested route on cold start, force back to home BEFORE React renders
  if (!allowedColdStartRoutes.includes(currentPath)) {
    window.history.replaceState(null, '', '/');
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
