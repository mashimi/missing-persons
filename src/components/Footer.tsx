// src/components/Footer.tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { mirrorLinks } from "@/lib/ipfs";

export default function Footer() {
  const { t } = useI18n();
  const [cid, setCid] = useState<string | null>(null);

  // The deployment pipeline writes the latest IPFS CID of the site next to
  // the build output; if present, offer mirror links.
  useEffect(() => {
    fetch("/ipfs-cid.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCid(data?.cid ?? null))
      .catch(() => undefined);
  }, []);

  return (
    <footer className="mt-16 bg-gray-100 text-sm">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <p className="text-gray-600">{t("footer.disclaimer")}</p>
        {cid && (
          <div>
            <p className="font-medium text-gray-700">{t("footer.mirror")}</p>
            <ul className="mt-2 space-y-1">
              {mirrorLinks(cid).map((mirror) => (
                <li key={mirror.label}>
                  <a
                    href={mirror.url}
                    rel="noreferrer noopener"
                    className="text-primary-700 hover:underline"
                  >
                    {mirror.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-500">IPFS CID: {cid}</p>
          </div>
        )}
        <p className="text-xs text-gray-500">
          {t("site.title")} — {t("site.tagline")}
        </p>
      </div>
    </footer>
  );
}
