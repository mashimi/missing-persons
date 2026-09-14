// scripts/update-ens.mjs
// PART 2.2 — Point the ENS domain at the latest IPFS CID.
// Usage:  ENS_PRIVATE_KEY=... node scripts/update-ens.mjs [CID]
// Reads the CID from deploy-info.json (written by deploy-ipfs.mjs).
import { readFileSync } from "node:fs";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  concat,
  decodeBase58,
  hexlify,
  namehash,
} from "ethers";

const PRIVATE_KEY = process.env.ENS_PRIVATE_KEY;
const DOMAIN = process.env.ENS_DOMAIN ?? "missingpersons-tz.eth";
const PROVIDER_URL =
  process.env.ENS_PROVIDER_URL ?? "https://eth.llamarpc.com";

// Canonical ENS contracts on Ethereum mainnet
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const REGISTRY_ABI = ["function resolver(bytes32 node) view returns (address)"];
const RESOLVER_ABI = [
  "function setContenthash(bytes32 node, bytes hash)",
  "function contenthash(bytes32 node) view returns (bytes memory)",
];

const cidArg = process.argv[2];
const cid =
  cidArg ?? JSON.parse(readFileSync("deploy-info.json", "utf8")).cid;

if (!cid) {
  console.error("✖ No CID given and deploy-info.json not found");
  process.exit(1);
}

if (!cid.startsWith("Qm")) {
  console.error("✖ Expected a CIDv0 (Qm…). Convert CIDv1 first if needed.");
  process.exit(1);
}

// ENS contenthash for IPFS: 0xe3010170 + the CIDv0 multihash bytes
const contenthash = hexlify(concat(["0xe3010170", decodeBase58(cid)]));

console.log(`→ Updating ${DOMAIN} → ipfs://${cid}`);

const provider = new JsonRpcProvider(PROVIDER_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

const registry = new Contract(ENS_REGISTRY, REGISTRY_ABI, wallet);
const node = namehash(DOMAIN);
const resolverAddress = await registry.resolver(node);

if (resolverAddress === "0x0000000000000000000000000000000000000000") {
  console.error(
    `✖ ${DOMAIN} has no resolver set. Set it up in the ENS manager first.`
  );
  process.exit(1);
}

const resolver = new Contract(resolverAddress, RESOLVER_ABI, wallet);

const current = await resolver.contenthash(node).catch(() => "0x");
if (current === contenthash) {
  console.log("✔ Already up to date — nothing to do");
  process.exit(0);
}

const tx = await resolver.setContenthash(node, contenthash);
console.log(`→ Sent tx ${tx.hash} — waiting for confirmation…`);
await tx.wait();

console.log(`✔ ${DOMAIN} now resolves to ipfs://${cid}`);
