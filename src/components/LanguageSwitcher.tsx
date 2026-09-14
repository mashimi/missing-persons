// src/components/LanguageSwitcher.tsx
"use client";

import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("footer.language")}
    >
      <button
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          locale === "en"
            ? "bg-white/20 text-white"
            : "text-gray-300 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("sw")}
        aria-pressed={locale === "sw"}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          locale === "sw"
            ? "bg-white/20 text-white"
            : "text-gray-300 hover:text-white"
        }`}
      >
        SW
      </button>
    </div>
  );
}
