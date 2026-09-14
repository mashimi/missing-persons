// scripts/deploy-ipfs.mjs
// PART 2.1 — Pin the static build to IPFS via Pinata.
// Usage:  PINATA_JWT=... node scripts/deploy-ipfs.mjs
// Requires: `npm run build` (an out/ folder with the static export).
import { existsSync } from "node:fs";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) {
  console.error("✖ PINATA_JWT is not set (see .env.example)");
  process.exit(1);
}

const OUT_DIR = path.resolve("out");
if (!existsSync(OUT_DIR)) {
  console.error("✖ out/ not found — run `npm run build` first");
  process.exit(1);
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

console.log("→ Collecting files from out/ …");
const form = new FormData();
let fileCount = 0;
let totalBytes = 0;

for await (const file of walk(OUT_DIR)) {
  // Relative path acts as the directory name for Pinata's folder pinning
  const rel = path.relative(OUT_DIR, file).split(path.sep).join("/");
  const buf = await readFile(file);
  form.append("file", new Blob([buf]), rel);
  fileCount += 1;
  totalBytes += buf.length;
}

console.log(`→ Pinning ${fileCount} files (${(totalBytes / 1024 / 1024).toFixed(1)} MiB) to IPFS …`);

const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
  method: "POST",
  headers: { Authorization: `Bearer ${PINATA_JWT}` },
  body: form,
});

if (!res.ok) {
  console.error(`✖ Pinata error ${res.status}:`, await res.text());
  process.exit(1);
}

const json = await res.json();
const cid = json.IpfsHash;

console.log("✔ Pinned to IPFS");
console.log(`  CID:     ${cid}`);
console.log(`  Gateway: https://ipfs.io/ipfs/${cid}/`);

await writeFile(
  "deploy-info.json",
  JSON.stringify(
    {
      cid,
      pinned_at: new Date().toISOString(),
      files: fileCount,
      bytes: totalBytes,
    },
    null,
    2
  )
);

// Leave the CID where the site's footer can pick it up on the next build
await writeFile(
  path.join("public", "ipfs-cid.json"),
  JSON.stringify({ cid }, null, 2)
);

console.log("✔ deploy-info.json + public/ipfs-cid.json written");
