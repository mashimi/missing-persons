// next.config.mjs — Next 14 (TS config files are Next 15+).
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // produces a fully static /out folder
  images: { unoptimized: true }, // required for static export
  trailingSlash: true,

  // Keep `next lint` out of CI builds: it walks up past the repo root and
  // picks up any stray machine-wide .eslintrc (e.g. C:\.eslintrc.cjs).
  // Run `npm run lint` explicitly instead.
  eslint: { ignoreDuringBuilds: true },

  // PART 9 — PWA + Tor-friendly headers.
  // NOTE: with output: "export", Next.js does not emit these headers itself;
  // they must be set by the CDN / reverse proxy / IPFS gateway that serves
  // the files. They are kept here as the canonical reference configuration.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/offline.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
