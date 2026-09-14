// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export default function Navbar() {
  const { t } = useI18n();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/persons/", label: t("nav.registry") },
    { href: "/submit/", label: t("nav.submit") },
    { href: "/about/", label: t("nav.about") },
  ];

  return (
    <nav className="bg-primary-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          {t("site.title")}
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-200 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
