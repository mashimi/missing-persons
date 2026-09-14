// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import BloodStainsBackground from "@/components/BloodStainsBackground";
import { I18nProvider } from "@/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "Missing Persons Registry – Tanzania",
  description:
    "A censorship-resistant registry documenting enforced disappearances in Tanzania. Every name matters.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative bg-slate-50 text-gray-900 antialiased min-h-screen">
        <I18nProvider>
          <BloodStainsBackground />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 min-h-[70vh]">{children}</main>
            <Footer />
          </div>
          <PWAInstallPrompt />
          <ServiceWorkerRegistrar />
        </I18nProvider>
      </body>
    </html>
  );
}

