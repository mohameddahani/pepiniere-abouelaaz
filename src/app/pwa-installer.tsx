"use client";

import { useEffect } from "react";

export default function PWAInstaller() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg.scope);
          // Check for updates periodically
          setInterval(() => {
            reg.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
