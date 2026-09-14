// scripts/archive-arweave.mjs
// PART 2.3 — Permanently archive the static build on Arweave (pay once, forever).
// Usage:  ARWEAVE_WALLET_PATH=./wallet.json node scripts/archive-arweave.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Arweave from "arweave";

const WALLET_PATH = process.env.ARWEAVE_WALLET_PATH ?? "./wallet.json";
if (!existsSync(WALLET_PATH)) {
  console.error(
    `✖ Arweave wallet not found at ${WALLET_PATH} — download a keyfile from https://arweave.app`
  );
  process.exit(1);
}

if (!existsSync("out")) {
  console.error("✖ out/ not found — run `npm run build` first");
  process.exit(1);
}

// Bundle the site as a single zip (Arweave stores one data item per tx;
// larger multi-file sites should use ANS-104 bundles — see README).
const ZIP = "site.zip";
if (!existsSync(ZIP)) {
  console.log("→ Zipping out/ → site.zip …");
  try {
    // Linux/CI: zip is available. On Windows: use PowerShell Compress-Archive.
    if (process.platform === "win32") {
      execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Compress-Archive -Path 'out/*' -DestinationPath '${ZIP}' -Force`,
        ],
        { stdio: "inherit" }
      );
    } else {
      execFileSync("zip", ["-r", `-X`, `../${ZIP}`, "."], {
        cwd: "out",
        stdio: "inherit",
      });
    }
  } catch (err) {
    console.error("✖ Zipping failed:", err.message);
    process.exit(1);
  }
}

const arweave = Arweave.init({
  host: process.env.ARWEAVE_HOST ?? "arweave.net",
  port: Number(process.env.ARWEAVE_PORT ?? 443),
  protocol: process.env.ARWEAVE_PROTOCOL ?? "https",
});

const wallet = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
const data = readFileSync(ZIP);

console.log(`→ Creating Arweave transaction (${(data.length / 1024 / 1024).toFixed(1)} MiB) …`);
const tx = await arweave.createTransaction({ data }, wallet);

tx.addTag("Content-Type", "application/zip");
tx.addTag("App-Name", "missing-persons-tz");
tx.addTag("Site", "Missing Persons Registry – Tanzania");
tx.addTag("Unix-Time", String(Math.floor(Date.now() / 1000)));

await arweave.transactions.sign(tx, wallet);

console.log(`→ Uploading tx ${tx.id} …`);
const uploader = await arweave.transactions.getUploader(tx);
while (!uploader.isComplete) {
  await uploader.uploadChunk();
  process.stdout.write(
    `\r  ${(uploader.pctChunks).toFixed(0)}% uploaded`
  );
}
console.log("");

const price = await arweave.transactions.getPrice(data.length).catch(() => null);

console.log("✔ Archived on Arweave (permanent)");
console.log(`  Tx:  https://arweave.net/${tx.id}`);
if (price) {
  console.log(`  Fee: ${arweave.ar.winstonToAr(price)} AR`);
}

writeFileSync(
  "arweave-info.json",
  JSON.stringify({ tx: tx.id, archived_at: new Date().toISOString() }, null, 2)
);
