// src/components/ServiceWorkerRegistrar.tsx
"use client";

import { useEffect } from "react";

// Registers the PWA service worker (PART 8).
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
