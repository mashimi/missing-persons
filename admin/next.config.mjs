/** @type {import('next').NextConfig} */
const nextConfig = {
  // The admin panel is NOT exported statically and MUST NOT be hosted on
  // IPFS. It talks to the FastAPI admin endpoints and is served from a
  // private network / behind VPN only.
  reactStrictMode: true,
};

export default nextConfig;
