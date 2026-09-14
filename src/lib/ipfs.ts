// src/lib/ipfs.ts
// Helpers for building mirror links to the latest IPFS CID.
// The deploy pipeline writes the current CID to /ipfs-cid.json in the out
// folder; the footer uses this module to offer independent mirror links.

const GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs/";

export interface Mirror {
  label: string;
  url: string;
}

export function gatewayFor(cid: string, gateway = GATEWAY): string {
  return `${gateway.replace(/\/$/, "")}/${cid}`;
}

export function mirrorLinks(cid: string): Mirror[] {
  const base = cid.replace(/^ipfs:\/\//, "");
  return [
    { label: "IPFS (ipfs.io)", url: gatewayFor(base) },
    { label: "IPFS (Cloudflare)", url: gatewayFor(base, "https://cloudflare-ipfs.com/ipfs/") },
    { label: "IPFS (dweb.link)", url: gatewayFor(base, "https://dweb.link/ipfs/") },
    { label: "ENS (.eth)", url: "https://app.ens.domains/name/missingpersons-tz.eth" },
  ];
}
