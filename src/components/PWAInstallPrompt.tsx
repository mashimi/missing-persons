// src/components/PWAInstallPrompt.tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

export default function PWAInstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 m-4 mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{t("pwa.install")}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              window.localStorage.setItem(DISMISS_KEY, "1");
              setDeferredPrompt(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
          <button
            onClick={async () => {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t("pwa.install")}
          </button>
        </div>
      </div>
    </div>
  );
}
