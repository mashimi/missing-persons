# Building a Censorship-Resistant Missing Persons Registry

This is important human rights documentation work. Below is a practical architecture guide. I'll also flag critical safety considerations.

---

## 1. Core Principle: No Single Point of Failure

A traditional website (one server, one domain, one hosting company) can be shut down with one phone call. You need to remove every single point of control.

---

## 2. Decentralized Hosting (the site itself)

**Option A – IPFS + Filecoin (recommended starting point)**
- Build the site as a **static site** (Next.js static export, Hugo, or Astro).
- Pin it to **IPFS** using a pinning service like **Pinata**, **nft.storage**, or **web3.storage**.
- The content is addressed by a cryptographic hash, not a server location. No one can "delete" it.
- Anyone can re-host it.

**Option B – Arweave**
- Permanently stores data on-chain. Pay once, it's there forever.
- Good for critical records (photos, profiles) you never want lost.

**Option C – Tor Hidden Service (.onion)**
- Run a mirror as a Tor hidden service so it's accessible even under heavy internet censorship.

**Recommendation:** Use **all three** as mirrors of each other.

---

## 3. Decentralized Domain Name

A normal `.com` or `.tz` domain can be seized. Use:

- **ENS (Ethereum Name Service):** e.g. `missingpersons-tz.eth`
- **Unstoppable Domains:** e.g. `missingpersons-tz.crypto`
- **Handshake (HNS):** another decentralized DNS layer

These resolve to your IPFS hash. No registrar or government can revoke them.

You can also register a regular domain as a *convenience alias*, but never rely on it alone.

---

## 4. Database That Stays Updated

This is the hardest part. You need a database that is:
- Updatable (new cases added regularly)
- Resilient (can't be wiped by one authority)
- Accessible to contributors

**Practical architecture:**

| Layer | Technology | Purpose |
|---|---|---|
| Primary DB | **PostgreSQL** on a VPS (e.g. hosted outside Tanzania – Iceland, Switzerland, Netherlands) | Day-to-day editing, search, admin panel |
| Replication | **CockroachDB** or **Postgres streaming replication** across 2–3 servers in different countries | Redundancy |
| Immutable snapshot | Nightly export → pinned to **IPFS** and/or **Arweave** | Tamper-proof historical record |
| Decentralized sync | **Gun.js** or **OrbitDB** (peer-to-peer database) | Allows contributors to add data even if the main server is briefly unreachable |
| API layer | A simple REST or GraphQL API (Node.js / Python FastAPI) | Feeds the frontend |

**Update workflow:**
1. A trusted admin or verified contributor submits a new case via a web form or a simple admin panel.
2. Data is written to the primary Postgres DB.
3. A scheduled job (cron) re-exports the site + data to IPFS/Arweave every few hours.
4. The frontend pulls from the API; if the API is down, it falls back to the latest IPFS snapshot.

---

## 5. Frontend / What Visitors See

Build with **Next.js (static export)** or **Astro**:

- **Interactive map** (Leaflet.js + OpenStreetMap) showing locations of reported abductions.
- **Profile pages** per person: photo, name, age, last-seen date/location, circumstances, family contact (if consented).
- **Searchable/filterable list** of all cases.
- **Timeline view** of events.
- **Multilingual:** Swahili and English at minimum.
- **PWA** (Progressive Web App) so it works offline and can be "installed" on phones.

Host the built static files on IPFS. The site loads data from the API; if the API is unreachable, it shows the last cached snapshot.

---

## 6. Safety & Verification (Critical)

This is not just a tech project. Real people's lives are involved.

- **Verification process:** Every submission should require at least 2 independent sources or a family member's confirmation before publishing. Prevents misinformation and protects credibility.
- **Consent:** Get explicit consent from families before publishing photos and names. Some families may be in danger.
- **Anonymity for contributors:** Use Tor, encrypted channels (Signal), and do not log IPs.
- **Data minimisation:** Don't store more personal data than necessary.
- **Legal awareness:** Consult with a Tanzanian human-rights lawyer (or an org like the **Legal and Human Rights Centre – LHRC** in Dar es Salaam) about the legal landscape.
- **Operational security:** The team running the site should use pseudonyms, separate devices, and encrypted communication.

---

## 7. Suggested Tech Stack Summary

```
Frontend:       Next.js (static export) + Leaflet maps + Tailwind CSS
Backend/API:    Python FastAPI  or  Node.js/Express
Primary DB:     PostgreSQL (hosted in 2+ jurisdictions)
P2P fallback:   Gun.js or OrbitDB
Immutable store: IPFS (Pinata) + Arweave
Domain:         ENS (.eth) + a regular domain as alias
Access mirror:  Tor .onion service
CI/CD:          GitHub Actions → auto-deploy to IPFS on every push
Monitoring:     UptimeRobot + community mirrors
```

---

## 8. Getting Started – First Steps

1. **Form a small trusted team** (2–5 people, ideally including a lawyer and a journalist).
2. **Set up the GitHub repo** (use a private repo; consider hosting on a self-hosted Gitea instance for extra safety).
3. **Build a minimal static site** with 3–5 test profiles and deploy to IPFS via Pinata.
4. **Register an ENS domain** pointing to the IPFS hash.
5. **Set up the Postgres DB** on a VPS outside Tanzania.
6. **Build the submission/verification workflow.**
7. **Launch quietly**, test with a small community, then publicise through trusted civil-society networks.
8. **Document everything** so others can mirror the site independently.
 


# Full Starter Kit: Code + Pipeline + Schema

Below is everything you need to get a working prototype running. I've broken it into three major sections.

---

## PART 1 — Next.js + Leaflet Application

### 1.1 Project Scaffold

```bash
npx create-next-app@latest missing-persons-tz \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd missing-persons-tz
npm install leaflet react-leaflet @types/leaflet
npm install axios swr
npm install @pinata/sdk
npm install arweave
npm install pg @types/pg
npm install date-fns
```

### 1.2 `next.config.ts` — Enable Static Export for IPFS

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // produces a fully static /out folder
  images: { unoptimized: true }, // required for static export
  trailingSlash: true,
};

export default nextConfig;
```

### 1.3 Folder Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← home + map
│   ├── persons/
│   │   ├── page.tsx          ← searchable list
│   │   └── [id]/
│   │       └── page.tsx      ← individual profile
│   ├── submit/
│   │   └── page.tsx          ← report a disappearance
│   └── globals.css
├── components/
│   ├── MapView.tsx
│   ├── PersonCard.tsx
│   ├── PersonList.tsx
│   ├── SearchBar.tsx
│   └── Navbar.tsx
├── lib/
│   ├── api.ts
│   ├── types.ts
│   └── ipfs.ts
└── data/
    └── fallback-persons.json ← static snapshot for offline
```

### 1.4 Types — `src/lib/types.ts`

```ts
export interface Person {
  id: string;
  full_name: string;
  age: number | null;
  gender: "male" | "female" | "other" | "unknown";
  photo_url: string;
  last_seen_date: string;       // ISO 8601
  last_seen_location: Location;
  status: "missing" | "found_alive" | "found_deceased" | "unknown";
  description: string;
  circumstances: string;
  family_contact: string | null; // may be encrypted / withheld
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  district: string;
  country: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
```

### 1.5 API Helper — `src/lib/api.ts`

```ts
import axios from "axios";
import type { Person, PaginatedResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 10_000 });

export async function fetchPersons(
  page = 1,
  pageSize = 20,
  search = ""
): Promise<PaginatedResponse<Person>> {
  try {
    const { data } = await client.get("/api/persons", {
      params: { page, page_size: pageSize, search },
    });
    return data;
  } catch {
    // Fall back to bundled static snapshot (IPFS / offline)
    const fallback = await import("@/data/fallback-persons.json");
    return {
      data: fallback.default as Person[],
      total: fallback.default.length,
      page: 1,
      page_size: pageSize,
    };
  }
}

export async function fetchPerson(id: string): Promise<Person | null> {
  try {
    const { data } = await client.get(`/api/persons/${id}`);
    return data;
  } catch {
    return null;
  }
}
```

### 1.6 Map Component — `src/components/MapView.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/lib/types";

// react-leaflet needs the browser; we load it dynamically
export default function MapView({ persons }: { persons: Person[] }) {
  const [MapLib, setMapLib] = useState<any>(null);

  useEffect(() => {
    // Dynamic import avoids SSR issues with Leaflet
    import("react-leaflet").then((mod) => setMapLib(mod));
    import("leaflet/dist/leaflet.css");
  }, []);

  if (!MapLib) return <div className="h-[500px] animate-pulse bg-gray-800 rounded-xl" />;

  const { MapContainer, TileLayer, Marker, Popup, Circle } = MapLib;

  return (
    <MapContainer
      center={[-6.369, 34.8888]}   // centre of Tanzania
      zoom={6}
      style={{ height: "500px", width: "100%", borderRadius: "0.75rem" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {persons.map((p) => {
        const { latitude, longitude } = p.last_seen_location;
        return (
          <Marker key={p.id} position={[latitude, longitude]}>
            <Popup>
              <div className="text-sm">
                <img
                  src={p.photo_url}
                  alt={p.full_name}
                  className="w-16 h-16 rounded-full object-cover mb-1"
                />
                <strong>{p.full_name}</strong>
                <br />
                Last seen: {new Date(p.last_seen_date).toLocaleDateString("sw-TZ")}
                <br />
                <a href={`/persons/${p.id}`}>View profile →</a>
              </div>
            </Popup>
            {/* 2 km radius circle to show approximate area */}
            <Circle
              center={[latitude, longitude]}
              radius={2000}
              pathOptions={{ color: "#ef4444", fillOpacity: 0.1 }}
            />
          </Marker>
        );
      })}
    </MapContainer>
  );
}
```

### 1.7 Person Card — `src/components/PersonCard.tsx`

```tsx
import type { Person } from "@/lib/types";

const statusColor: Record<string, string> = {
  missing: "bg-red-600",
  found_alive: "bg-green-600",
  found_deceased: "bg-gray-600",
  unknown: "bg-yellow-600",
};

export default function PersonCard({ person }: { person: Person }) {
  return (
    <a
      href={`/persons/${person.id}/`}
      className="block bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-red-500 transition"
    >
      <img
        src={person.photo_url}
        alt={person.full_name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">{person.full_name}</h3>
          <span
            className={`${statusColor[person.status]} text-xs px-2 py-0.5 rounded-full text-white`}
          >
            {person.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          Age: {person.age ?? "Unknown"} · {person.last_seen_location.region}
        </p>
        <p className="text-gray-500 text-xs">
          Last seen: {new Date(person.last_seen_date).toLocaleDateString("sw-TZ")}
        </p>
      </div>
    </a>
  );
}
```

### 1.8 Home Page — `src/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PersonCard from "@/components/PersonCard";
import SearchBar from "@/components/SearchBar";
import { fetchPersons } from "@/lib/api";
import type { Person } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPersons(1, 100, search).then((res) => setPersons(res.data));
  }, [search]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="text-center py-16 px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold">
          Watu Waliofuranywa Tanzania
        </h1>
        <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
          Dokumenting enforced disappearances. Every name matters. Every story
          deserves to be seen.
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Missing Persons Registry · Tanzania
        </p>
      </section>

      {/* Map */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <h2 className="text-2xl font-bold mb-4">📍 Where They Were Taken</h2>
        <MapView persons={persons} />
      </section>

      {/* Search + List */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold mb-4">
          📋 Registry ({persons.length} cases)
        </h2>
        <SearchBar value={search} onChange={setSearch} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {persons.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
```

### 1.9 Search Bar — `src/components/SearchBar.tsx`

```tsx
export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="search"
      placeholder="Search by name, region, or keyword…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-md px-4 py-2 rounded-lg bg-gray-800 text-white
                 placeholder-gray-500 border border-gray-700 focus:ring-2
                 focus:ring-red-500 outline-none"
    />
  );
}
```

### 1.10 Person Detail — `src/app/persons/[id]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPerson } from "@/lib/api";
import type { Person } from "@/lib/types";

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (id) fetchPerson(id).then(setPerson);
  }, [id]);

  if (!person)
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white max-w-3xl mx-auto px-4 py-12">
      <a href="/" className="text-red-400 hover:underline text-sm">← Back to registry</a>

      <div className="mt-6 flex flex-col md:flex-row gap-8">
        <img
          src={person.photo_url}
          alt={person.full_name}
          className="w-56 h-56 object-cover rounded-xl"
        />
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold">{person.full_name}</h1>
          <p className="text-gray-400">
            Age {person.age ?? "?"} · {person.gender}
          </p>
          <p>
            <span className="text-gray-500">Status:</span>{" "}
            <span className="capitalize text-red-400 font-semibold">
              {person.status.replace("_", " ")}
            </span>
          </p>
          <p>
            <span className="text-gray-500">Last seen:</span>{" "}
            {new Date(person.last_seen_date).toLocaleDateString("sw-TZ", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
          <p>
            <span className="text-gray-500">Location:</span>{" "}
            {person.last_seen_location.name},{" "}
            {person.last_seen_location.district},{" "}
            {person.last_seen_location.region}
          </p>
          {person.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {person.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-800 px-2 py-1 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-2">Circumstances</h2>
        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
          {person.circumstances}
        </p>
      </section>

      <section className="mt-8 p-4 bg-gray-900 rounded-lg">
        <h3 className="font-semibold text-yellow-400">
          Have information about this case?
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          Contact the family liaison or submit a tip through our secure channel.
          Your identity will be protected.
        </p>
      </section>
    </main>
  );
}
```

### 1.11 Root Layout — `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missing Persons Registry – Tanzania",
  description:
    "Documenting enforced disappearances in Tanzania. Every name matters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw">
      <body className="bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
```

---

## PART 2 — IPFS Deployment Pipeline

### 2.1 Pinata Upload Script — `scripts/deploy-ipfs.mjs`

```js
// scripts/deploy-ipfs.mjs
import pinataSDK from "@pinata/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../out");

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

async function deploy() {
  console.log("⬆️  Uploading /out to IPFS via Pinata…");

  const result = await pinata.pinFromFS(OUT_DIR, {
    pinataMetadata: {
      name: `missing-persons-tz-${Date.now()}`,
    },
    pinataOptions: {
      wrapWithDirectory: false,
    },
  });

  const cid = result.IpfsHash;
  console.log(`✅  Deployed!`);
  console.log(`   IPFS CID : ${cid}`);
  console.log(`   Gateway  : https://ipfs.io/ipfs/${cid}`);
  console.log(`   Pinata   : https://gateway.pinata.cloud/ipfs/${cid}`);

  // Write the CID so the next step (ENS update) can read it
  const fs = await import("fs");
  fs.writeFileSync(".ipfs-cid", cid);
}

deploy().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 2.2 ENS Update Script — `scripts/update-ens.mjs`

```js
// scripts/update-ens.mjs
// Updates the ENS content hash to point at the new IPFS CID.
// Requires: npm install ethers @ensdomains/ensjs

import { ethers } from "ethers";
import { ENS } from "@ensdomains/ensjs";
import fs from "fs";

const cid = fs.readFileSync(".ipfs-cid", "utf-8").trim();
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);

const ens = new ENS({ provider, ensAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" });

async function update() {
  const name = "missingpersons-tz.eth";
  console.log(`🔗 Setting contenthash for ${name} → ipfs://${cid}`);

  const resolver = await ens.name(name).getResolver();
  const tx = await resolver.setContenthash(`ipfs://${cid}`, { from: wallet.address });
  await tx.wait();
  console.log("✅  ENS updated.");
}

update().catch(console.error);
```

### 2.3 Arweave Archive Script — `scripts/archive-arweave.mjs`

```js
// scripts/archive-arweave.mjs
// Permanently archives the JSON data snapshot on Arweave.

import Arweave from "arweave";
import fs from "fs";
import path from "path";

const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });

const key = JSON.parse(fs.readFileSync(process.env.ARWEAVE_KEY_FILE, "utf-8"));
const dataPath = path.resolve("data/snapshot.json");   // nightly DB export

async function archive() {
  const data = fs.readFileSync(dataPath);

  const tx = await arweave.createTransaction({ data }, key);
  tx.addTag("Content-Type", "application/json");
  tx.addTag("App-Name", "missing-persons-tz");
  tx.addTag("Snapshot-Date", new Date().toISOString().slice(0, 10));

  await arweave.transactions.sign(tx, key);
  const res = await arweave.transactions.post(tx);

  console.log(`✅  Archived on Arweave. Tx: ${tx.id}`);
  console.log(`   https://arweave.net/${tx.id}`);
}

archive().catch(console.error);
```

### 2.4 GitHub Actions Workflow — `.github/workflows/deploy.yml`

```yaml
name: Build → IPFS → ENS

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 */6 * * *"   # also redeploy every 6 hours (picks up DB changes)
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install deps
        run: npm ci

      # 1. Fetch latest data from API → write static JSON fallback
      - name: Fetch live data snapshot
        run: |
          mkdir -p src/data
          curl -s "${{ secrets.API_URL }}/api/persons?page=1&page_size=500" \
            | jq '.data' > src/data/fallback-persons.json
          cp src/data/fallback-persons.json data/snapshot.json

      # 2. Build static site
      - name: Build Next.js static export
        run: npm run build

      # 3. Upload to IPFS via Pinata
      - name: Deploy to IPFS
        run: node scripts/deploy-ipfs.mjs
        env:
          PINATA_API_KEY: ${{ secrets.PINATA_API_KEY }}
          PINATA_SECRET_KEY: ${{ secrets.PINATA_SECRET_KEY }}

      # 4. Update ENS record
      - name: Update ENS
        run: node scripts/update-ens.mjs
        env:
          ETH_RPC_URL: ${{ secrets.ETH_RPC_URL }}
          ETH_PRIVATE_KEY: ${{ secrets.ETH_PRIVATE_KEY }}

      # 5. Archive snapshot on Arweave (daily only)
      - name: Archive to Arweave
        if: github.event_name == 'schedule'
        run: node scripts/archive-arweave.mjs
        env:
          ARWEAVE_KEY_FILE: ${{ secrets.ARWEAVE_KEY_FILE }}

      # 6. Notify mirrors
      - name: Ping mirror nodes
        run: |
          CID=$(cat .ipfs-cid)
          curl -X POST "${{ secrets.MIRROR_WEBHOOK }}?cid=$CID"
```

### 2.5 Environment Variables (`.env.local`)

```env
# API
NEXT_PUBLIC_API_URL=https://api.yourserver.example

# Pinata (IPFS pinning)
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx

# ENS / Ethereum
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
ETH_PRIVATE_KEY=0xYOUR_KEY

# Arweave
ARWEAVE_KEY_FILE=./arweave-key.json
```

---

## PART 3 — Database Schema (PostgreSQL)

### 3.1 Full Migration SQL — `migrations/001_initial.sql`

```sql
-- ============================================================
--  Missing Persons Registry – Tanzania
--  PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";   -- for spatial queries

-- ---------- ENUMS ----------
CREATE TYPE gender_enum   AS ENUM ('male','female','other','unknown');
CREATE TYPE status_enum   AS ENUM ('missing','found_alive','found_deceased','unknown');
CREATE TYPE report_status AS ENUM ('pending','under_review','verified','rejected');
CREATE TYPE contributor_role AS ENUM ('admin','editor','reporter','family');
CREATE TYPE media_type    AS ENUM ('photo','video','document','audio');

-- ---------- LOCATIONS ----------
CREATE TABLE locations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,          -- "Mwanza bus station"
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    geom          GEOMETRY(POINT, 4326)
                  GENERATED ALWAYS AS (
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                  ) STORED,
    region        VARCHAR(100) NOT NULL,          -- "Mwanza"
    district      VARCHAR(100),
    country       VARCHAR(100) DEFAULT 'Tanzania',
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_locations_geom   ON locations USING GIST (geom);
CREATE INDEX idx_locations_region ON locations (region);

-- ---------- PERSONS ----------
CREATE TABLE persons (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name          VARCHAR(255) NOT NULL,
    aliases            TEXT[],                     -- other names
    age                SMALLINT,
    gender             gender_enum DEFAULT 'unknown',
    photo_url          TEXT,                       -- IPFS CID preferred
    ipfs_photo_hash    VARCHAR(100),              -- immutable reference
    last_seen_date     DATE NOT NULL,
    last_seen_location UUID REFERENCES locations(id),
    status             status_enum DEFAULT 'missing',
    description        TEXT,                      -- physical description
    circumstances      TEXT,                      -- what happened
    occupation         VARCHAR(255),
    family_contact     TEXT,                      -- encrypted at rest
    family_contact_enc BOOLEAN DEFAULT FALSE,
    tags               TEXT[] DEFAULT '{}',       -- e.g. {'journalist','activist'}
    is_public          BOOLEAN DEFAULT TRUE,      -- family consent flag
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_persons_status     ON persons (status);
CREATE INDEX idx_persons_name_trgm  ON persons USING GIN (to_tsvector('simple', full_name));
CREATE INDEX idx_persons_tags       ON persons USING GIN (tags);
CREATE INDEX idx_persons_last_seen  ON persons (last_seen_date DESC);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER persons_updated
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------- REPORTS (submissions / tips) ----------
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id       UUID REFERENCES persons(id) ON DELETE CASCADE,
    reporter_name   VARCHAR(255),               -- can be NULL (anonymous)
    reporter_contact TEXT,                       -- Signal / email, encrypted
    description     TEXT NOT NULL,
    evidence_urls   TEXT[],                      -- IPFS hashes of evidence
    status          report_status DEFAULT 'pending',
    ipfs_hash       VARCHAR(100),               -- immutable copy of report
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_person ON reports (person_id);
CREATE INDEX idx_reports_status ON reports (status);

-- ---------- VERIFICATION ----------
CREATE TABLE verifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id     UUID REFERENCES reports(id) ON DELETE CASCADE,
    verifier_id   UUID REFERENCES contributors(id),
    verdict       report_status NOT NULL,
    notes         TEXT,
    verified_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------- CONTRIBUTORS / ADMINS ----------
CREATE TABLE contributors (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(100) UNIQUE NOT NULL,
    public_key    TEXT,                          -- for signing / auth
    role          contributor_role DEFAULT 'reporter',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------- MEDIA ----------
CREATE TABLE media (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id     UUID REFERENCES persons(id) ON DELETE CASCADE,
    media_type    media_type NOT NULL,
    url           TEXT NOT NULL,                 -- IPFS CID
    ipfs_hash     VARCHAR(100) NOT NULL,
    caption       TEXT,
    uploaded_by   UUID REFERENCES contributors(id),
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_person ON media (person_id);

-- ---------- AUDIT LOG ----------
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL,
    record_id   UUID NOT NULL,
    action      VARCHAR(20) NOT NULL,           -- INSERT / UPDATE / DELETE
    changed_by  UUID REFERENCES contributors(id),
    diff        JSONB,                          -- what changed
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_record ON audit_log (table_name, record_id);

-- ---------- NIGHTLY SNAPSHOT TRACKING ----------
CREATE TABLE snapshots (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipfs_cid      VARCHAR(100) NOT NULL,
    arweave_tx    VARCHAR(100),
    record_count  INT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Entity Relationship Diagram (text)

```
contributors ──1:N──► reports
                       │
                       │ N:1
                       ▼
                    persons ◄──1:N── media
                       │
                       │ N:1
                       ▼
                   locations

reports ──1:N──► verifications ◄──N:1── contributors

audit_log  (tracks every change on every table)
snapshots  (tracks each IPFS/Arweave archive)
```

### 3.3 Useful Views

```sql
-- Public-facing view: only consented, verified, missing persons
CREATE VIEW v_public_persons AS
SELECT
    p.id, p.full_name, p.age, p.gender,
    p.photo_url, p.last_seen_date, p.status,
    p.description, p.circumstances, p.tags,
    l.name   AS location_name,
    l.latitude, l.longitude,
    l.region, l.district
FROM persons p
LEFT JOIN locations l ON l.id = p.last_seen_location
WHERE p.is_public = TRUE
  AND p.status = 'missing';

-- Region summary for the map / dashboard
CREATE VIEW v_region_counts AS
SELECT
    l.region,
    COUNT(*) AS total_missing,
    MIN(p.last_seen_date) AS earliest,
    MAX(p.last_seen_date) AS latest
FROM persons p
JOIN locations l ON l.id = p.last_seen_location
WHERE p.status = 'missing'
GROUP BY l.region
ORDER BY total_missing DESC;
```

### 3.4 Row-Level Security (optional hardening)

```sql
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Public can only see consented records
CREATE POLICY public_read ON persons
  FOR SELECT
  USING (is_public = TRUE);

-- Only editors/admins can insert or update
CREATE POLICY editor_write ON persons
  FOR ALL
  TO editor_role
  USING (TRUE);
```

---

## PART 4 — Backend API (FastAPI, minimal)

```python
# api/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg, os, json

app = FastAPI(title="Missing Persons API – TZ")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATABASE_URL = os.getenv("DATABASE_URL")
pool = None

@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)

@app.get("/api/persons")
async def list_persons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = "",
    region: str | None = None,
):
    offset = (page - 1) * page_size
    params = []
    where = ["is_public = TRUE"]

    if search:
        params.append(f"%{search}%")
        where.append(f"(full_name ILIKE ${len(params)} OR description ILIKE ${len(params)})")
    if region:
        params.append(region)
        where.append(f"region = ${len(params)}")

    where_sql = " AND ".join(where)

    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f"SELECT count(*) FROM v_public_persons WHERE {where_sql}", *params
        )
        rows = await conn.fetch(
            f"""SELECT * FROM v_public_persons
                WHERE {where_sql}
                ORDER BY last_seen_date DESC
                LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
            *params, page_size, offset,
        )

    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@app.get("/api/persons/{person_id}")
async def get_person(person_id: str):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM v_public_persons WHERE id = $1", person_id
        )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(404)
    return dict(row)

@app.get("/api/stats/regions")
async def region_stats():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM v_region_counts")
    return [dict(r) for r in rows]
```

Run it:

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

---

## PART 5 — Nightly Snapshot Cron (on the server)

```bash
#!/usr/bin/env bash
# /etc/cron.d/missing-persons-snapshot
# Runs at 02:00 UTC every day

0 2 * * * www-data /opt/missing-persons/scripts/snapshot.sh >> /var/log/mp-snapshot.log 2>&1
```

```bash
#!/usr/bin/env bash
# scripts/snapshot.sh
set -euo pipefail

psql "$DATABASE_URL" \
  -c "COPY (SELECT json_agg(row_to_json(v)) FROM v_public_persons v) TO STDOUT" \
  > /opt/missing-persons/data/snapshot.json

node /opt/missing-persons/scripts/archive-arweave.mjs
node /opt/missing-persons/scripts/deploy-ipfs.mjs
```

---

## Quick-Start Checklist

| # | Task | Done? |
|---|------|-------|
| 1 | `create-next-app` + install deps | ☐ |
| 2 | Copy components & pages into `src/` | ☐ |
| 3 | Run `migrations/001_initial.sql` on Postgres | ☐ |
| 4 | Stand up FastAPI on a VPS (Iceland / NL) | ☐ |
| 5 | Seed 3-5 test persons, verify the UI renders | ☐ |
| 6 | Add Pinata + Arweave keys to `.env` | ☐ |
| 7 | Push to GitHub → Actions deploys to IPFS | ☐ |
| 8 | Register ENS domain, point to first CID | ☐ |
| 9 | Set up Tor `.onion` mirror | ☐ |
| 10 | Nightly cron for DB snapshot + Arweave archive | ☐ |
| 11 | Share with trusted civil-society orgs for beta | ☐ |

---

 


# PART 6–8: i18n + Secure Submission + PWA

These three layers build directly on the code from Parts 1–5. I'll give you every file you need.

---

## PART 6 — Internationalisation (Swahili / English)

Because the site uses `output: "export"`, the cleanest approach is a **client-side locale context** with JSON dictionaries. No server routing changes needed.

### 6.1 Locale Dictionaries

```
src/
└── i18n/
    ├── index.ts
    ├── locales/
    │   ├── en.json
    │   └── sw.json
    └── I18nProvider.tsx
```

**`src/i18n/locales/en.json`**

```json
{
  "site.title": "Missing Persons Registry – Tanzania",
  "site.tagline": "Documenting enforced disappearances. Every name matters.",
  "nav.home": "Home",
  "nav.registry": "Registry",
  "nav.map": "Map",
  "nav.submit": "Report a Case",
  "nav.about": "About",

  "home.heading": "People Who Have Been Disappeared in Tanzania",
  "home.map_title": "Where They Were Taken",
  "home.registry_title": "Registry",
  "home.cases": "{count} cases documented",
  "home.search_placeholder": "Search by name, region, or keyword…",

  "person.age": "Age",
  "person.gender": "Gender",
  "person.status": "Status",
  "person.last_seen": "Last seen",
  "person.location": "Location",
  "person.circumstances": "Circumstances",
  "person.back": "← Back to registry",
  "person.tip_heading": "Have information about this case?",
  "person.tip_body": "Contact the family liaison or submit a tip through our secure channel. Your identity will be protected.",

  "status.missing": "Missing",
  "status.found_alive": "Found alive",
  "status.found_deceased": "Found deceased",
  "status.unknown": "Unknown",

  "gender.male": "Male",
  "gender.female": "Female",
  "gender.other": "Other",
  "gender.unknown": "Unknown",

  "submit.heading": "Report a Disappearance",
  "submit.intro": "Your submission is encrypted end-to-end before it leaves your device. You may remain anonymous.",
  "submit.name_label": "Full name of the missing person",
  "submit.age_label": "Age (approximate is fine)",
  "submit.gender_label": "Gender",
  "submit.date_label": "Date last seen",
  "submit.location_label": "Where were they last seen?",
  "submit.region_label": "Region",
  "submit.district_label": "District",
  "submit.coords_label": "GPS coordinates (optional)",
  "submit.description_label": "Physical description",
  "submit.circumstances_label": "What happened? Describe the circumstances.",
  "submit.photo_label": "Upload a photo (encrypted before upload)",
  "submit.contact_label": "Your contact (optional – Signal number or email)",
  "submit.consent_label": "I confirm I have the family's consent to share this information.",
  "submit.anonymous_note": "You do NOT need to provide your name. The form works over Tor for maximum anonymity.",
  "submit.encrypt_note": "🔒 Your data is encrypted with PGP in your browser before transmission.",
  "submit.send": "Submit Encrypted Report",
  "submit.sending": "Encrypting & sending…",
  "submit.success": "Thank you. Your report has been received. A case reference will appear once verified.",
  "submit.error": "Something went wrong. Please try again or use the Tor form.",

  "footer.disclaimer": "This registry is maintained by civil-society volunteers. Data is verified before publication.",
  "footer.mirror": "Mirror sites",
  "footer.language": "Language",

  "pwa.install": "Install this app",
  "pwa.offline": "You are offline. Showing the last cached version."
}
```

**`src/i18n/locales/sw.json`**

```json
{
  "site.title": "Rejista ya Watu Waliopotea – Tanzania",
  "site.tagline": "Kurekodi uteshaji wa watu. Kila jina lina umuhimu.",
  "nav.home": "Nyumbani",
  "nav.registry": "Rejista",
  "nav.map": "Ramani",
  "nav.submit": "Ripoti Tukio",
  "nav.about": "Kuhusu",

  "home.heading": "Watu Walioteswa na Kufichwa Tanzania",
  "home.map_title": "Walipochukuliwa",
  "home.registry_title": "Rejista",
  "home.cases": "Visa {count} vimeandikwa",
  "home.search_placeholder": "Tafuta kwa jina, mkoa, au neno…",

  "person.age": "Umri",
  "person.gender": "Jinsia",
  "person.status": "Hali",
  "person.last_seen": "Alionekana mwisho",
  "person.location": "Mahali",
  "person.circumstances": "Mazingira",
  "person.back": "← Rudi kwenye rejista",
  "person.tip_heading": "Una taarifa kuhusu tukio hili?",
  "person.tip_body": "Wasiliana na mwakilishi wa familia au tuma taarifa kupitia njia yetu salama. Utambulisho wako utalindwa.",

  "status.missing": "Ametoweka",
  "status.found_alive": "Amepatikana hai",
  "status.found_deceased": "Amepatikana amefariki",
  "status.unknown": "Haijulikani",

  "gender.male": "Me",
  "gender.female": "Ke",
  "gender.other": "Nyingine",
  "gender.unknown": "Haijulikani",

  "submit.heading": "Ripoti Kutoweka kwa Mtu",
  "submit.intro": "Taarifa zako zinasimbwa kwa usalama kabla ya kutoka kwenye kifaa chako. Unaweza kubaki bila jina.",
  "submit.name_label": "Jina kamili la mtu aliyetoweka",
  "submit.age_label": "Umri (makadirio yanatosha)",
  "submit.gender_label": "Jinsia",
  "submit.date_label": "Tarehe alipoonekana mwisho",
  "submit.location_label": "Alionekana mwisho wapi?",
  "submit.region_label": "Mkoa",
  "submit.district_label": "Wilaya",
  "submit.coords_label": "Viwratibu vya GPS (hiari)",
  "submit.description_label": "Maelezo ya mwili",
  "submit.circumstances_label": "Nini kilifanyika? Eleza mazingira.",
  "submit.photo_label": "Pakia picha (inasimbwa kabla ya kupakia)",
  "submit.contact_label": "Mawasiliano yako (hiari – namba ya Signal au barua pepe)",
  "submit.consent_label": "Ninathibitisha nina ruhusa ya familia kushiriki taarifa hizi.",
  "submit.anonymous_note": "Huhitaji jina lako. Fomu inafanya kazi kupitia Tor kwa usiri zaidi.",
  "submit.encrypt_note": "🔒 Data yako inasimbwa kwa PGP kwenye kivinjari chako kabla ya kutumwa.",
  "submit.send": "Tuma Ripoti Iliyosimbwa",
  "submit.sending": "Inasimba na kutuma…",
  "submit.success": "Asante. Ripoti yako imepokelewa. Kumbukumbu ya kesi itaonekana baada ya kuthibitishwa.",
  "submit.error": "Hitilafu imetokea. Tafadhali jaribu tena au tumia fomu ya Tor.",

  "footer.disclaimer": "Rejista hii inasimamiwa na wajitolea wa jamii ya kiraia. Data inathibitishwa kabla ya kuchapishwa.",
  "footer.mirror": "Tovuti mbadala",
  "footer.language": "Lugha",

  "pwa.install": "Sakinisha programu hii",
  "pwa.offline": "Uko nje ya mtandao. Inaonyesha toleo la mwisho lililohifadhiwa."
}
```

### 6.2 i18n Provider — `src/i18n/I18nProvider.tsx`

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "./locales/en.json";
import sw from "./locales/sw.json";

type Locale = "en" | "sw";
type Messages = Record<string, string>;

const dictionaries: Record<Locale, Messages> = { en, sw };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx>({
  locale: "sw",
  setLocale: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("sw"); // default Swahili

  useEffect(() => {
    const saved = localStorage.getItem("mp-tz-locale") as Locale | null;
    if (saved && (saved === "en" || saved === "sw")) setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("mp-tz-locale", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let msg = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          msg = msg.replaceAll(`{${k}}`, String(v));
        }
      }
      return msg;
    },
    [locale]
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
```

### 6.3 Language Switcher — `src/components/LanguageSwitcher.tsx`

```tsx
"use client";
import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex gap-1 text-sm">
      {(["sw", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2 py-0.5 rounded ${
            locale === l
              ? "bg-red-600 text-white font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {l === "sw" ? "SW" : "EN"}
        </button>
      ))}
    </div>
  );
}
```

### 6.4 Navbar — `src/components/Navbar.tsx`

```tsx
"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const { t } = useI18n();
  return (
    <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="font-bold text-red-500 text-lg">
          {t("site.title")}
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-300 hover:text-white">{t("nav.home")}</Link>
          <Link href="/persons/" className="text-gray-300 hover:text-white">{t("nav.registry")}</Link>
          <Link href="/submit/" className="text-gray-300 hover:text-white">{t("nav.submit")}</Link>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
```

### 6.5 Updated Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "Missing Persons Registry – Tanzania",
  description: "Documenting enforced disappearances in Tanzania.",
  manifest: "/manifest.json",
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className="bg-gray-950 antialiased min-h-screen flex flex-col">
        <I18nProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <PWAInstallPrompt />
        </I18nProvider>
        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () =>
                  navigator.serviceWorker.register('/sw.js')
                );
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
```

### 6.6 Footer — `src/components/Footer.tsx`

```tsx
"use client";
import { useI18n } from "@/i18n/I18nProvider";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-gray-800 py-8 px-4 text-center text-sm text-gray-500 space-y-2">
      <p>{t("footer.disclaimer")}</p>
      <p>
        {t("footer.mirror")}:{" "}
        <a href="https://ipfs.io/ipfs/Qm..." className="text-red-400">IPFS</a>{" · "}
        <a href="http://abc123.onion" className="text-red-400">Tor</a>{" · "}
        <a href="https://missingpersons-tz.eth" className="text-red-400">ENS</a>
      </p>
      <p className="text-gray-700">
        CC BY-NC 4.0 · {new Date().getFullYear()}
      </p>
    </footer>
  );
}
```

---

## PART 7 — Secure Submission Form (Tor + PGP)

### 7.1 Install OpenPGP

```bash
npm install openpgp@5
```

> Version 5 is the last stable UMD/browser-friendly release. V6 requires bundler tweaks.

### 7.2 PGP Key Management — `src/lib/pgp.ts`

```ts
import * as openpgp from "openpgp";

// The server's PUBLIC key (embedded so anyone can encrypt to it).
// Generate the keypair offline; keep the private key air-gapped.
export const SERVER_PUBLIC_KEY_ARMORED = `-----BEGIN PGP PUBLIC KEY BLOCK-----
...paste your server's public key here...
-----END PGP PUBLIC KEY BLOCK-----`;

let _pubKey: openpgp.Key | null = null;

async function getPublicKey(): Promise<openpgp.Key> {
  if (!_pubKey) {
    _pubKey = await openpgp.readKey({ armoredKey: SERVER_PUBLIC_KEY_ARMORED });
  }
  return _pubKey;
}

/**
 * Encrypt a JSON payload with the server's PGP public key.
 * Returns an armored ASCII string that ONLY the server can decrypt.
 */
export async function encryptPayload(data: Record<string, unknown>): Promise<string> {
  const pubKey = await getPublicKey();
  const message = await openpgp.createMessage({
    text: JSON.stringify(data, null, 2),
  });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: pubKey,
    format: "armored",
  });
  return encrypted as string;
}

/**
 * Encrypt a File (photo) as base64 inside the PGP message.
 */
export async function encryptFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const b64 = btoa(
    new Uint8Array(buf).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
  );
  return encryptPayload({
    filename: file.name,
    mime: file.type,
    data_base64: b64,
  });
}
```

### 7.3 Submission Form — `src/app/submit/page.tsx`

```tsx
"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { encryptPayload, encryptFile } from "@/lib/pgp";

export default function SubmitPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    try {
      const fd = new FormData(e.currentTarget);

      // Build the plaintext payload
      const payload: Record<string, unknown> = {
        full_name: fd.get("full_name"),
        age: fd.get("age") || null,
        gender: fd.get("gender"),
        last_seen_date: fd.get("last_seen_date"),
        location_name: fd.get("location_name"),
        region: fd.get("region"),
        district: fd.get("district"),
        coordinates: fd.get("coordinates") || null,
        description: fd.get("description"),
        circumstances: fd.get("circumstances"),
        reporter_contact: fd.get("reporter_contact") || null,
        consent: fd.get("consent") === "on",
        submitted_at: new Date().toISOString(),
      };

      // Encrypt the text payload
      const encryptedText = await encryptPayload(payload);

      // Encrypt the photo if provided
      let encryptedPhoto: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        encryptedPhoto = await encryptFile(file);
      }

      // Send to API (works over Tor if accessed via .onion)
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_payload: encryptedText,
          encrypted_photo: encryptedPhoto,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white border border-gray-700 " +
    "focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-500";

  return (
    <main className="min-h-screen bg-gray-950 text-white max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">{t("submit.heading")}</h1>
      <p className="text-gray-400 mb-1">{t("submit.intro")}</p>
      <p className="text-yellow-500 text-sm mb-8">{t("submit.encrypt_note")}</p>
      <p className="text-gray-600 text-xs mb-8">{t("submit.anonymous_note")}</p>

      {status === "done" && (
        <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 mb-6 text-green-300">
          {t("submit.success")}
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-300">
          {t("submit.error")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.name_label")} *</label>
          <input name="full_name" required className={inputCls} />
        </div>

        {/* Age + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("submit.age_label")}</label>
            <input name="age" type="number" min="0" max="120" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("submit.gender_label")}</label>
            <select name="gender" className={inputCls}>
              <option value="unknown">{t("gender.unknown")}</option>
              <option value="male">{t("gender.male")}</option>
              <option value="female">{t("gender.female")}</option>
              <option value="other">{t("gender.other")}</option>
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.date_label")} *</label>
          <input name="last_seen_date" type="date" required className={inputCls} />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.location_label")}</label>
          <input name="location_name" className={inputCls} placeholder="e.g. Kariakoo market" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("submit.region_label")}</label>
            <input name="region" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("submit.district_label")}</label>
            <input name="district" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.coords_label")}</label>
          <input name="coordinates" className={inputCls} placeholder="-6.8235, 39.2698" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.description_label")}</label>
          <textarea name="description" rows={3} className={inputCls} />
        </div>

        {/* Circumstances */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.circumstances_label")} *</label>
          <textarea name="circumstances" rows={5} required className={inputCls} />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.photo_label")}</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="text-gray-400 text-sm file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:bg-gray-700
                       file:text-white file:cursor-pointer"
          />
        </div>

        {/* Reporter contact (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("submit.contact_label")}</label>
          <input name="reporter_contact" className={inputCls} placeholder="+255 7XX XXX XXX" />
        </div>

        {/* Consent */}
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input name="consent" type="checkbox" required className="mt-1 accent-red-500" />
          {t("submit.consent_label")}
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50
                     font-bold text-white transition"
        >
          {status === "sending" ? t("submit.sending") : t("submit.send")}
        </button>
      </form>
    </main>
  );
}
```

### 7.4 Backend Endpoint for Encrypted Reports

```python
# api/reports.py  (add to the FastAPI app)

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class EncryptedReport(BaseModel):
    encrypted_payload: str          # PGP-armored ciphertext
    encrypted_photo: str | None = None

@router.post("/api/reports")
async def receive_report(body: EncryptedReport):
    """
    Stores the encrypted blob as-is.  The server NEVER decrypts.
    Decryption happens on an air-gapped machine by a trusted reviewer.
    """
    import uuid, datetime

    report_id = str(uuid.uuid4())

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO reports (id, description, evidence_urls, status, ipfs_hash)
            VALUES ($1, '[ENCRYPTED]', $2, 'pending', $3)
            """,
            report_id,
            [body.encrypted_payload],          # store ciphertext in evidence
            None,
        )

        # Optionally pin ciphertext to IPFS for immutability
        # ipfs_hash = await pin_to_ipfs(body.encrypted_payload.encode())

    return {"status": "received", "report_id": report_id}
```

### 7.5 Tor Hidden Service Setup

**On the server (`/etc/tor/torrc`):**

```ini
# Serve the Next.js static site + API over Tor
HiddenServiceDir /var/lib/tor/missing_persons_tz/
HiddenServicePort 80 127.0.0.1:3000    # static site (serve /out with nginx)
HiddenServicePort 443 127.0.0.1:8000   # FastAPI

# Second service for API only (optional)
HiddenServiceDir /var/lib/tor/missing_persons_api/
HiddenServicePort 80 127.0.0.1:8000
```

```bash
sudo systemctl restart tor
cat /var/lib/tor/missing_persons_tz/hostname
# → abc123xyz456.onion
```

**Nginx in front of the static export:**

```nginx
# /etc/nginx/sites-available/missing-persons
server {
    listen 127.0.0.1:3000;
    root /opt/missing-persons/out;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' https://ipfs.io data:;";
}
```

### 7.6 Generate the PGP Keypair (offline, one-time)

```bash
# On an air-gapped machine (no network)
gpg --full-generate-key
#   Name:  Missing Persons TZ
#   Email: reports@missingpersons-tz.example
#   Size:  4096
#   Expiry: 0 (never)

# Export PUBLIC key → embed in src/lib/pgp.ts
gpg --armor --export "Missing Persons TZ" > server-pub.asc

# Export PRIVATE key → store on encrypted USB, NEVER on the server
gpg --armor --export-secret-keys "Missing Persons TZ" > server-priv.asc

# Encrypt the private key with a strong passphrase
gpg --symmetric --cipher-algo AES256 server-priv.asc
```

> **Critical rule:** The private key never touches an internet-connected machine. Decryption of reports happens on the air-gapped machine only.

---

## PART 8 — PWA + Mobile Optimisation

### 8.1 Web App Manifest — `public/manifest.json`

```json
{
  "name": "Missing Persons Registry – Tanzania",
  "short_name": "MPR-TZ",
  "description": "Documenting enforced disappearances in Tanzania",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait-primary",
  "lang": "sw",
  "dir": "ltr",
  "icons": [
    { "src": "/icons/icon-72.png",  "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96.png",  "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Report a Disappearance",
      "short_name": "Report",
      "url": "/submit/",
      "icons": [{ "src": "/icons/icon-96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 8.2 Service Worker — `public/sw.js`

```js
const CACHE_NAME = "mpr-tz-v1";
const STATIC_ASSETS = [
  "/",
  "/persons/",
  "/submit/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
];

// ---------- INSTALL ----------
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching shell");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---------- FETCH ----------
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Skip non-GET and API calls
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) {
    // Network-first for API, fall back to cached snapshot
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || Response.error()))
    );
    return;
  }

  // Stale-while-revalidate for pages & static assets
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => {
          // If both cache and network fail, show offline page
          if (request.mode === "navigate") {
            return caches.match("/offline.html");
          }
          return Response.error();
        });

      return cached || network;
    })
  );
});

// ---------- BACKGROUND SYNC (for offline submissions) ----------
self.addEventListener("sync", (e) => {
  if (e.tag === "retry-report") {
    e.waitUntil(retryReport());
  }
});

async function retryReport() {
  const db = await openIndexedDB();
  const pending = await db.getAll("pending-reports");
  for (const report of pending) {
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      await db.delete("pending-reports", report.id);
    } catch {
      break; // still offline, retry later
    }
  }
}

function openIndexedDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open("mpr-tz-offline", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending-reports", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
  });
}
```

### 8.3 Offline Fallback Page — `public/offline.html`

```html
<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline – MPR-TZ</title>
  <style>
    body { background:#0a0a0a; color:#fff; font-family:system-ui;
           display:flex; align-items:center; justify-content:center;
           min-height:100vh; text-align:center; padding:1rem; }
    h1 { font-size:1.5rem; }
    p  { color:#999; }
  </style>
</head>
<body>
  <div>
    <h1>📡 Nje ya Mtandao / Offline</h1>
    <p>You are offline. Showing the last cached version.<br/>
       Uko nje ya mtandao. Inaonyesha toleo la mwisho.</p>
    <p><a href="/" style="color:#ef4444;">← Retry / Jaribu tena</a></p>
  </div>
</body>
</html>
```

### 8.4 PWA Install Prompt — `src/components/PWAInstallPrompt.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function PWAInstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4
                    bg-gray-800 border border-gray-700 rounded-xl p-4
                    shadow-2xl z-50 flex items-center justify-between gap-4">
      <span className="text-sm text-gray-200">{t("pwa.install")}</span>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            deferred?.prompt();
            const { outcome } = await deferred?.userChoice;
            if (outcome === "accepted") setShowBanner(false);
            setDeferred(null);
          }}
          className="px-4 py-1.5 bg-red-600 rounded-lg text-white text-sm font-semibold"
        >
          {t("pwa.install")}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="px-3 py-1.5 text-gray-400 text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

### 8.5 Mobile-Responsive CSS Additions — `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---- Mobile-first PWA tweaks ---- */

/* Safe-area padding for notched phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  body {
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav {
    padding-top: env(safe-area-inset-top);
  }
}

/* Prevent text selection on buttons for app-like feel */
button, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Ensure map tiles don't flash white in dark mode */
.leaflet-tile {
  filter: brightness(0.85) contrast(1.1);
}
.leaflet-container {
  background: #111;
}

/* Touch-friendly form inputs */
@media (max-width: 640px) {
  input, select, textarea {
    font-size: 16px !important;   /* prevents iOS zoom on focus */
  }
}
```

### 8.6 `tailwind.config.ts` — Ensure PWA-Safe Settings

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## PART 9 — Updated `next.config.ts` with PWA Headers

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,

  // PWA headers (applied when served via nginx / IPFS gateway)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "img-src 'self' data: https://ipfs.io https://gateway.pinata.cloud; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

> Note: with `output: "export"` the `headers()` config is only a reference; you apply the actual headers in **nginx** or via `_headers` files on IPFS. The important point is that `sw.js` must be served with `Cache-Control: no-cache`.

---

## PART 10 — Complete File Tree (Final)

```
missing-persons-tz/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   └── icons/
│       ├── icon-72.png … icon-512.png
│       └── icon-512.png  (maskable)
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← I18nProvider + Navbar + Footer + PWA
│   │   ├── page.tsx            ← Home (map + list)
│   │   ├── globals.css         ← Tailwind + mobile PWA tweaks
│   │   ├── persons/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── submit/
│   │       └── page.tsx        ← PGP-encrypted form
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── MapView.tsx
│   │   ├── PersonCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── PWAInstallPrompt.tsx
│   ├── i18n/
│   │   ├── I18nProvider.tsx
│   │   └── locales/
│   │       ├── en.json
│   │       └── sw.json
│   ├── lib/
│   │   ├── api.ts
│   │   ├── pgp.ts              ← OpenPGP encryption
│   │   ├── types.ts
│   │   └── ipfs.ts
│   └── data/
│       └── fallback-persons.json
├── scripts/
│   ├── deploy-ipfs.mjs
│   ├── update-ens.mjs
│   ├── archive-arweave.mjs
│   └── snapshot.sh
├── migrations/
│   └── 001_initial.sql
├── api/
│   ├── main.py                 ← FastAPI
│   └── reports.py              ← encrypted report endpoint
├── .github/workflows/
│   └── deploy.yml
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env.local
```

---

## Build & Verify Checklist

| # | Step | Command / Action |
|---|------|-----------------|
| 1 | Dev server | `npm run dev` → verify SW, EN, map, form |
| 2 | Static build | `npm run build` → inspect `/out` |
| 3 | Test offline | Disable network in DevTools → offline page appears |
| 4 | Test PGP | Submit form → verify ciphertext in Network tab |
| 5 | Test i18n | Toggle SW/EN → all strings switch |
| 6 | Lighthouse PWA | Score ≥ 90, installable |
| 7 | IPFS deploy | Push to `main` → Actions uploads to Pinata |
| 8 | Tor test | `curl http://abc123.onion` returns the site |
| 9 | Air-gapped decrypt | Decrypt a test report on the offline machine |
| 10 | Mobile QA | Test on a real Android + iOS device |

---

 


# PART 11–13: Signal Bot + Admin Dashboard + OSINT Enrichment

These three systems close the loop: **tips flow in** (Signal), **humans verify** (Dashboard), and **machines enrich** (OSINT). All three integrate with the existing FastAPI backend and PostgreSQL schema.

---

## PART 11 — Signal Bot for Anonymous Tips

### 11.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tipster (any phone)                                    │
│  sends Signal message to +255 7XX XXX XXX              │
└────────────────────┬────────────────────────────────────┘
                     │  encrypted (Signal protocol)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  signal-cli-rest-api  (Docker, on your server)         │
│  receives → POSTs webhook to bot service               │
└────────────────────┬────────────────────────────────────┘
                     │  HTTP POST (localhost only)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  signal_bot.py  (Python service)                       │
│  parse → validate → PGP-encrypt → store → auto-reply   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI  /api/reports   +   PostgreSQL                │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Docker Compose — `docker-compose.signal.yml`

```yaml
version: "3.8"

services:
  signal-cli-rest-api:
    image: bbernhard/signal-cli-rest-api:latest
    container_name: signal-cli-rest-api
    restart: unless-stopped
    environment:
      - MODE=native          # uses native signal-cli binary
    volumes:
      - signal-data:/home/.local/share/signal-cli
    ports:
      - "127.0.0.1:8080:8080"   # bind to localhost only
    networks:
      - internal

  signal-bot:
    build:
      context: ./bot
      dockerfile: Dockerfile
    container_name: signal-bot
    restart: unless-stopped
    depends_on:
      - signal-cli-rest-api
    environment:
      - SIGNAL_API=http://signal-cli-rest-api:8080
      - BOT_NUMBER=+255700000000
      - FASTAPI_URL=http://host.docker.internal:8000
      - PGP_PUBLIC_KEY_FILE=/keys/server-pub.asc
      - LOG_LEVEL=WARNING
    volumes:
      - ./bot/keys:/keys:ro
    networks:
      - internal

networks:
  internal:
    driver: bridge

volumes:
  signal-data:
```

### 11.3 Register the Bot Number (one-time)

```bash
# Start signal-cli-rest-api first
docker compose -f docker-compose.signal.yml up signal-cli-rest-api -d

# Register the phone number (you'll receive an SMS code)
curl -X POST http://127.0.0.1:8080/v1/register/+255700000000

# Verify with the code from SMS
curl -X POST http://127.0.0.1:8080/v1/verify/+255700000000 \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### 11.4 Signal Bot Service — `bot/signal_bot.py`

```python
"""
Signal Bot – receives tips, parses them, encrypts, and stores.
Runs as a long-lived process polling the signal-cli-rest-api webhook.
"""

import os
import re
import json
import uuid
import logging
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx
import gnupg
from fastapi import FastAPI, Request
from pydantic import BaseModel

# ── Config ──────────────────────────────────────────────
SIGNAL_API   = os.getenv("SIGNAL_API", "http://127.0.0.1:8080")
BOT_NUMBER   = os.getenv("BOT_NUMBER", "+255700000000")
FASTAPI_URL  = os.getenv("FASTAPI_URL", "http://127.0.0.1:8000")
PGP_KEY_FILE = os.getenv("PGP_PUBLIC_KEY_FILE", "./keys/server-pub.asc")
LOG_LEVEL    = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(level=getattr(logging, LOG_LEVEL))
log = logging.getLogger("signal-bot")

# ── PGP Setup ───────────────────────────────────────────
gpg = gnupg.GPG()
with open(PGP_KEY_FILE) as f:
    gpg.import_keys(f.read())

def pgp_encrypt(plaintext: str) -> str:
    """Encrypt with the server's public key. Only the air-gapped machine can decrypt."""
    encrypted = gpg.encrypt(plaintext, recipients="reports@missingpersons-tz.example",
                            always_trust=True, armor=True)
    return str(encrypted)

# ── Message Parsing ─────────────────────────────────────
# Expected format (flexible):
#   JINA: John Doe
#   UMRI: 34
#   TAREHE: 2025-01-15
#   MAHALI: Mwanza, bus station
#   MKOA: Mwanza
#   MAELEZO: He was taken by men in plain clothes...

FIELD_MAP = {
    "jina":       "full_name",
    "name":       "full_name",
    "umri":       "age",
    "age":        "age",
    "jinsia":     "gender",
    "gender":     "gender",
    "tarehe":     "last_seen_date",
    "date":       "last_seen_date",
    "mahali":     "location_name",
    "location":   "location_name",
    "mkoa":       "region",
    "region":     "region",
    "wilaya":     "district",
    "district":   "district",
    "maelezo":    "circumstances",
    "description":"circumstances",
    "circumstances":"circumstances",
    "simu":       "reporter_contact",
    "contact":    "reporter_contact",
}

def parse_tip(text: str) -> dict:
    """Parse a free-form or structured Signal message into fields."""
    fields = {}
    lines = text.strip().split("\n")
    free_text_parts = []

    for line in lines:
        matched = False
        for keyword, field_name in FIELD_MAP.items():
            pattern = rf"^{re.escape(keyword)}\s*[:=]\s*(.+)$"
            m = re.match(pattern, line.strip(), re.IGNORECASE)
            if m:
                fields[field_name] = m.group(1).strip()
                matched = True
                break
        if not matched and line.strip():
            free_text_parts.append(line.strip())

    # Anything not matched as a field goes into circumstances
    if free_text_parts:
        extra = "\n".join(free_text_parts)
        fields["circumstances"] = fields.get("circumstances", "") + "\n" + extra

    fields.setdefault("submitted_at", datetime.now(timezone.utc).isoformat())
    fields.setdefault("source", "signal")
    return fields

# ── FastAPI Webhook Receiver ────────────────────────────
app = FastAPI(title="Signal Bot Webhook")

class SignalEnvelope(BaseModel):
    source: str
    sourceNumber: str
    message: Optional[str] = None
    timestamp: Optional[int] = None
    attachments: list = []

@app.post("/signal/webhook")
async def receive_signal(envelope: SignalEnvelope):
    sender = envelope.sourceNumber
    text   = envelope.message or ""
    ts     = envelope.timestamp

    if not text and not envelope.attachments:
        await send_signal(sender, "Samahani, sikuelewa. Tuma taarifa kwa format:\n"
                                    "JINA: ...\nUMRI: ...\nTAREHE: ...\nMAHALI: ...\nMAELEZO: ...")
        return {"status": "ignored"}

    log.info(f"Tip from {sender[:6]}***: {text[:80]}…")

    # 1. Parse
    fields = parse_tip(text)

    # 2. Hash the sender number (we do NOT store the raw number)
    sender_hash = hashlib.sha256(sender.encode()).hexdigest()[:16]
    fields["reporter_contact"] = f"signal:{sender_hash}"

    # 3. Encrypt the entire payload
    plaintext = json.dumps(fields, ensure_ascii=False, indent=2)
    ciphertext = pgp_encrypt(plaintext)

    # 4. Store via FastAPI
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{FASTAPI_URL}/api/reports", json={
            "encrypted_payload": ciphertext,
            "encrypted_photo": None,
            "source": "signal",
        })
        resp.raise_for_status()
        report_id = resp.json().get("report_id", "unknown")

    # 5. Auto-reply
    await send_signal(
        sender,
        f"Asante. Ripoti yako imepokelewa.\n"
        f"Kumbukumbu: {report_id[:8]}…\n"
        f"Taarifa zako zimesimbwa kwa usalama.\n"
        f"Thank you. Your tip has been received and encrypted."
    )

    return {"status": "stored", "report_id": report_id}


async def send_signal(number: str, message: str):
    """Send a Signal message via signal-cli-rest-api."""
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            f"{SIGNAL_API}/v2/send",
            json={
                "message": message,
                "number": BOT_NUMBER,
                "recipients": [number],
            },
        )

# ── Startup: register webhook ──────────────────────────
@app.on_event("startup")
async def register_webhook():
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SIGNAL_API}/v1/receive/{BOT_NUMBER}",
            json={"webhook_url": "http://signal-bot:9090/signal/webhook"},
        )
    log.info("Webhook registered with signal-cli-rest-api")

# ── Run ─────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9090)
```

### 11.5 Bot Dockerfile — `bot/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn httpx python-gnupg pydantic

COPY signal_bot.py .
EXPOSE 9090

CMD ["uvicorn", "signal_bot:app", "--host", "0.0.0.0", "--port", "9090"]
```

### 11.6 Tipster Instructions (auto-reply / printed card)

```
📱 HOW TO SEND A TIP VIA SIGNAL

Send a Signal message to: +255 7XX XXX XXX

Format (Swahili or English):

  JINA: Full name of missing person
  UMRI: Age
  TAREHE: Date last seen (YYYY-MM-DD)
  MAHALI: Where they were last seen
  MKOA: Region
  WILAYA: District
  MAELEZO: What happened

Example:
  JINA: Joseph Mwangi
  UMRI: 42
  TAREHE: 2025-06-10
  MAHALI: Bus stand, Mwanza
  MKOA: Mwanza
  MAELEZO: Alipanda gari la polisi bila namba, hakurudi.

You do NOT need to give your name.
Your message is end-to-end encrypted by Signal.
```

---

## PART 12 — Admin Verification Dashboard

### 12.1 Architecture

```
/admin  (separate Next.js app or protected route)
  ├── /admin/login          ← TOTP + password
  ├── /admin/dashboard      ← stats overview
  ├── /admin/reports        ← pending / under-review queue
  ├── /admin/reports/[id]   ← single report detail + verify/reject
  ├── /admin/persons        ← CRUD for person records
  ├── /admin/persons/[id]   ← edit person
  ├── /admin/media          ← media manager
  ├── /admin/users          ← contributor management
  └── /admin/audit          ← audit log viewer
```

### 12.2 Auth — TOTP + Session (`api/auth.py`)

```python
# api/auth.py
import os, secrets, time, hashlib, hmac
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import pyotp

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# In production: store in DB, not env
ADMIN_USERS = {
    "admin": {
        "password_hash": os.getenv("ADMIN_PW_HASH"),  # bcrypt
        "totp_secret":   os.getenv("ADMIN_TOTP_SECRET"),
        "role": "admin",
    },
    "editor1": {
        "password_hash": os.getenv("EDITOR_PW_HASH"),
        "totp_secret":   os.getenv("EDITOR_TOTP_SECRET"),
        "role": "editor",
    },
}

SESSIONS: dict[str, dict] = {}  # token → {user, role, expires}

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str

@router.post("/login")
async def login(body: LoginRequest):
    user = ADMIN_USERS.get(body.username)
    if not user:
        raise HTTPException(401)

    # 1. Verify password (bcrypt)
    import bcrypt
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401)

    # 2. Verify TOTP
    totp = pyotp.TOTP(user["totp_secret"])
    if not totp.verify(body.totp_code, valid_window=1):
        raise HTTPException(401, "Invalid TOTP")

    # 3. Create session
    token = secrets.token_urlsafe(48)
    SESSIONS[token] = {
        "user": body.username,
        "role": user["role"],
        "expires": datetime.utcnow() + timedelta(hours=8),
    }
    return {"token": token, "role": user["role"]}


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    session = SESSIONS.get(creds.credentials)
    if not session or session["expires"] < datetime.utcnow():
        raise HTTPException(401, "Session expired")
    return session
```

### 12.3 Report Verification Endpoints (`api/verification.py`)

```python
# api/verification.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from api.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

class VerdictRequest(BaseModel):
    verdict: str          # "verified" | "rejected" | "under_review"
    notes: str = ""

@router.get("/reports")
async def list_reports(
    status: str = "pending",
    page: int = 1,
    user: dict = Depends(get_current_user),
):
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(403)

    offset = (page - 1) * 20
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            "SELECT count(*) FROM reports WHERE status = $1", status
        )
        rows = await conn.fetch(
            """SELECT r.id, r.status, r.created_at, r.source,
                      v.verdict AS last_verdict, v.notes AS last_notes
               FROM reports r
               LEFT JOIN verifications v ON v.report_id = r.id
               WHERE r.status = $1
               ORDER BY r.created_at DESC
               LIMIT 20 OFFSET $2""",
            status, offset,
        )
    return {"data": [dict(r) for r in rows], "total": total}


@router.get("/reports/{report_id}")
async def get_report(report_id: UUID, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(403)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM reports WHERE id = $1", report_id
        )
    if not row:
        raise HTTPException(404)
    return dict(row)


@router.post("/reports/{report_id}/verify")
async def verify_report(
    report_id: UUID,
    body: VerdictRequest,
    user: dict = Depends(get_current_user),
):
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(403)

    async with pool.acquire() as conn:
        # Insert verification record
        await conn.execute(
            """INSERT INTO verifications (report_id, verifier_id, verdict, notes)
               VALUES ($1, (SELECT id FROM contributors WHERE username = $2), $3, $4)""",
            report_id, user["user"], body.verdict, body.notes,
        )
        # Update report status
        new_status = {
            "verified": "verified",
            "rejected": "rejected",
            "under_review": "under_review",
        }.get(body.verdict, "pending")

        await conn.execute(
            "UPDATE reports SET status = $1 WHERE id = $2",
            new_status, report_id,
        )
        # Audit log
        await conn.execute(
            """INSERT INTO audit_log (table_name, record_id, action, changed_by, diff)
               VALUES ('reports', $1, 'VERIFY',
                       (SELECT id FROM contributors WHERE username = $2),
                       $3::jsonb)""",
            report_id, user["user"],
            f'{{"verdict":"{body.verdict}","notes":"{body.notes}"}}',
        )

    return {"status": new_status}


@router.post("/reports/{report_id}/create-person")
async def create_person_from_report(
    report_id: UUID,
    user: dict = Depends(get_current_user),
):
    """
    After decryption on the air-gapped machine, an admin manually
    enters the decrypted fields here to create a person record.
    The encrypted blob is NEVER decrypted on this server.
    """
    if user["role"] != "admin":
        raise HTTPException(403)

    # This endpoint would accept the decrypted fields via a secure form.
    # For safety, the actual decryption happens offline.
    # The admin copies the decrypted data into this form manually.
    return {"message": "Use the offline decryption workflow, then enter data here."}
```

### 12.4 Admin Dashboard Frontend — `admin/` (separate Next.js app)

```bash
npx create-next-app@latest mpr-admin --typescript --tailwind --app --src-dir
cd mpr-admin
npm install axios qrcode.react recharts date-fns
```

**`admin/src/app/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/auth/login", {
        username, password, totp_code: totp,
      });
      localStorage.setItem("admin_token", data.token);
      router.push("/admin/dashboard");
    } catch {
      setError("Invalid credentials or TOTP code.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-8
                                              bg-gray-900 rounded-2xl">
        <h1 className="text-2xl font-bold text-white text-center">
          🔐 Admin Login
        </h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white
                     border border-gray-700 focus:ring-2 focus:ring-red-500 outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white
                     border border-gray-700 focus:ring-2 focus:ring-red-500 outline-none"
        />
        <input
          placeholder="TOTP Code (6 digits)"
          value={totp}
          onChange={(e) => setTotp(e.target.value)}
          maxLength={6}
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white
                     border border-gray-700 focus:ring-2 focus:ring-red-500 outline-none
                     text-center text-2xl tracking-widest"
        />
        <button
          type="submit"
          className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg
                     font-bold text-white transition"
        >
          Sign In
        </button>
      </form>
    </main>
  );
}
```

**`admin/src/app/admin/dashboard/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#6b7280"];

interface Stats {
  total_persons: number;
  pending_reports: number;
  verified_reports: number;
  by_region: { region: string; total_missing: number }[];
  by_status: { status: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    axios
      .get("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStats(r.data));
  }, []);

  if (!stats) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-8">
      <h1 className="text-3xl font-extrabold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Persons", value: stats.total_persons, color: "text-red-400" },
          { label: "Pending Reports", value: stats.pending_reports, color: "text-yellow-400" },
          { label: "Verified Reports", value: stats.verified_reports, color: "text-green-400" },
          { label: "Regions Affected", value: stats.by_region.length, color: "text-blue-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 rounded-xl p-5">
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-gray-500 text-sm mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar: missing by region */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="font-bold mb-4">Missing by Region</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.by_region}>
              <XAxis dataKey="region" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" />
              <Tooltip />
              <Bar dataKey="total_missing" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: by status */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="font-bold mb-4">Case Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.by_status} dataKey="count" nameKey="status"
                   cx="50%" cy="50%" outerRadius={100} label>
                {stats.by_status.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-4">
        <Link href="/admin/reports" className="px-4 py-2 bg-yellow-600 rounded-lg font-semibold">
          📋 Review Reports
        </Link>
        <Link href="/admin/persons" className="px-4 py-2 bg-blue-600 rounded-lg font-semibold">
          👤 Manage Persons
        </Link>
        <Link href="/admin/audit" className="px-4 py-2 bg-gray-700 rounded-lg font-semibold">
          📜 Audit Log
        </Link>
      </div>
    </div>
  );
}
```

**`admin/src/app/admin/reports/page.tsx`** — Report Queue

```tsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

type Tab = "pending" | "under_review" | "verified" | "rejected";

export default function ReportsQueue() {
  const [tab, setTab] = useState<Tab>("pending");
  const [reports, setReports] = useState<any[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";

  useEffect(() => {
    axios
      .get(`/api/admin/reports?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setReports(r.data.data));
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Report Queue</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "under_review", "verified", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
              tab === t ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500">
              <th className="p-3">ID</th>
              <th className="p-3">Source</th>
              <th className="p-3">Received</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                <td className="p-3">{r.source ?? "web"}</td>
                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600/20 text-yellow-400">
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/reports/${r.id}`}
                    className="text-red-400 hover:underline"
                  >
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**`admin/src/app/admin/reports/[id]/page.tsx`** — Verify / Reject

```tsx
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [verdict, setVerdict] = useState("verified");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    axios
      .get(`/api/admin/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setReport(r.data));
  }, [id]);

  async function submitVerdict() {
    await axios.post(
      `/api/admin/reports/${id}/verify`,
      { verdict, notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setDone(true);
  }

  if (!report) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Report {id?.slice(0, 8)}…</h1>
      <p className="text-gray-500 text-sm mb-6">
        Received: {new Date(report.created_at).toLocaleString()} · Source: {report.source}
      </p>

      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-300 text-sm">
        ⚠️ The payload below is <strong>PGP-encrypted</strong>. Decrypt it on the
        air-gapped machine, then enter the verified data into the Person form.
        NEVER paste decrypted data into this server.
      </div>

      <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-400 overflow-auto max-h-64 mb-6">
        {report.evidence_urls?.[0]?.slice(0, 200)}…
      </pre>

      {done ? (
        <p className="text-green-400">✅ Verdict recorded.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4">
            {["verified", "under_review", "rejected"].map((v) => (
              <button
                key={v}
                onClick={() => setVerdict(v)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  verdict === v ? "bg-red-600" : "bg-gray-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Verification notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white
                       border border-gray-700 outline-none"
          />
          <button
            onClick={submitVerdict}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
          >
            Submit Verdict
          </button>
        </div>
      )}
    </div>
  );
}
```

### 12.5 Admin Layout with Auth Guard

```tsx
// admin/src/app/admin/layout.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/login");
    } else {
      setAuthed(true);
    }
  }, []);

  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 p-4 space-y-3">
        <h2 className="font-bold text-red-500 text-lg mb-6">MPR Admin</h2>
        {[
          ["/admin/dashboard", "📊 Dashboard"],
          ["/admin/reports", "📋 Reports"],
          ["/admin/persons", "👤 Persons"],
          ["/admin/media", "🖼 Media"],
          ["/admin/users", "👥 Users"],
          ["/admin/audit", "📜 Audit Log"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="block px-3 py-2 rounded-lg text-sm text-gray-300
                       hover:bg-gray-800 hover:text-white transition"
          >
            {label}
          </Link>
        ))}
        <button
          onClick={() => { localStorage.removeItem("admin_token"); router.push("/login"); }}
          className="mt-8 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-400"
        >
          🚪 Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## PART 13 — Automated OSINT Enrichment

### 13.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Celery Beat (scheduler)                   │
│   every 6 h: scan GDELT + Google News RSS                  │
│   every 12 h: geocode new locations                        │
│   daily: fuzzy-match new names against existing records    │
│   daily: generate alert digest → send via Signal bot       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              osint_worker.py  (Celery worker)               │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ GDELT API   │  │ Google News  │  │ Nominatim        │  │
│  │ fetcher     │  │ RSS parser   │  │ geocoder         │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Fuzzy Name Matcher  (rapidfuzz)             │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                  │
│                         ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     PostgreSQL:  osint_matches + persons + locations  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                  │
│                         ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Signal Bot  →  alert admins of new matches       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 Install Dependencies

```bash
pip install celery[redis] requests feedparser rapidfuzz \
            geopy beautifulsoup4 lxml schedule
```

### 13.3 Database Addition — `migrations/002_osint.sql`

```sql
-- OSINT matches: links external articles/mentions to person records
CREATE TABLE osint_matches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id       UUID REFERENCES persons(id) ON DELETE CASCADE,
    source_type     VARCHAR(50) NOT NULL,   -- 'gdelt','google_news','rss','manual'
    source_url      TEXT NOT NULL,
    title           TEXT,
    snippet         TEXT,
    published_at    TIMESTAMPTZ,
    match_score     REAL,                   -- 0-100 fuzzy score
    reviewed        BOOLEAN DEFAULT FALSE,
    reviewed_by     UUID REFERENCES contributors(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_osint_person ON osint_matches (person_id);
CREATE INDEX idx_osint_reviewed ON osint_matches (reviewed);
CREATE INDEX idx_osint_created ON osint_matches (created_at DESC);

-- Geocoding cache
CREATE TABLE geocode_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query           TEXT UNIQUE NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    formatted       TEXT,
    fetched_at      TIMESTAMPTZ DEFAULT now()
);
```

### 13.4 Celery Config — `osint/celery_app.py`

```python
from celery import Celery
from celery.schedules import crontab

celery_app = Celery("osint")
celery_app.config_from_object({
    "broker_url": "redis://localhost:6379/0",
    "result_backend": "redis://localhost:6379/1",
    "timezone": "Africa/Dar_es_Salaam",
})

celery_app.conf.beat_schedule = {
    # Scan news sources every 6 hours
    "scan-gdelt": {
        "task": "osint.tasks.scan_gdelt",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "scan-google-news": {
        "task": "osint.tasks.scan_google_news",
        "schedule": crontab(minute=15, hour="*/6"),
    },
    # Geocode un-geocoded locations every 12 hours
    "geocode-locations": {
        "task": "osint.tasks.geocode_pending",
        "schedule": crontab(minute=0, hour="*/12"),
    },
    # Fuzzy-match new articles daily at 03:00
    "fuzzy-match": {
        "task": "osint.tasks.fuzzy_match_names",
        "schedule": crontab(hour=3, minute=0),
    },
    # Daily alert digest at 07:00
    "daily-alerts": {
        "task": "osint.tasks.send_daily_alert",
        "schedule": crontab(hour=7, minute=0),
    },
}

celery_app.autodiscover_tasks(["osint"])
```

### 13.5 OSINT Tasks — `osint/tasks.py`

```python
"""
Celery tasks for OSINT enrichment.
All tasks are read-only against external sources and write only to the local DB.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

import requests
import feedparser
from geopy.geocoders import Nominatim
from rapidfuzz import fuzz, process
from celery import shared_task
from bs4 import BeautifulSoup

log = logging.getLogger("osint")

# ── DB helper (asyncpg sync wrapper) ───────────────────
import psycopg2, os
DB_URL = os.getenv("DATABASE_URL")

def db():
    return psycopg2.connect(DB_URL)

# ── 1. GDELT Scanner ───────────────────────────────────
GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

@shared_task
def scan_gdelt():
    """
    Query GDELT for news articles mentioning disappearances in Tanzania.
    Keywords in both English and Swahili.
    """
    queries = [
        "Tanzania disappearance",
        "Tanzania abduction",
        "Tanzania enforced disappearance",
        "Tanzania missing person",
        "Tanzania kutoweka",
        "Tanzania utekaji",
        "Tanzania afya haki",
    ]

    seen_urls = _get_seen_urls("gdelt")
    new_articles = []

    for q in queries:
        try:
            resp = requests.get(GDELT_DOC_API, params={
                "query": q,
                "mode": "artlist",
                "format": "json",
                "maxrecords": 25,
                "timespan": "1440",  # last 24 hours
            }, timeout=15)
            data = resp.json()

            for art in data.get("articles", []):
                url = art.get("url", "")
                if url in seen_urls:
                    continue
                new_articles.append({
                    "source_type": "gdelt",
                    "source_url": url,
                    "title": art.get("title", ""),
                    "snippet": art.get("title", ""),  # GDELT doesn't give snippets
                    "published_at": art.get("seendate", ""),
                })
                seen_urls.add(url)
        except Exception as e:
            log.warning(f"GDELT query '{q}' failed: {e}")

    if new_articles:
        _store_articles(new_articles)
        log.info(f"GDELT: {len(new_articles)} new articles stored")

    return len(new_articles)


# ── 2. Google News RSS ─────────────────────────────────
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

@shared_task
def scan_google_news():
    queries = [
        "Tanzania missing person",
        "Tanzania abduction",
        "Tanzania enforced disappearance",
        "mtu kutoweka Tanzania",
        "utekaji Tanzania",
    ]
    seen_urls = _get_seen_urls("google_news")
    new_articles = []

    for q in queries:
        try:
            url = f"{GOOGLE_NEWS_RSS}?q={requests.utils.quote(q)}&hl=sw&gl=TZ&ceid=TZ:sw"
            feed = feedparser.parse(url)

            for entry in feed.entries[:20]:
                link = entry.get("link", "")
                if link in seen_urls:
                    continue
                new_articles.append({
                    "source_type": "google_news",
                    "source_url": link,
                    "title": entry.get("title", ""),
                    "snippet": _strip_html(entry.get("summary", "")),
                    "published_at": entry.get("published", ""),
                })
                seen_urls.add(link)
        except Exception as e:
            log.warning(f"Google News query '{q}' failed: {e}")

    if new_articles:
        _store_articles(new_articles)
        log.info(f"Google News: {len(new_articles)} new articles stored")

    return len(new_articles)


# ── 3. Geocode Pending Locations ───────────────────────
@shared_task
def geocode_pending():
    """Geocode locations that don't have coordinates yet."""
    geolocator = Nominatim(user_agent="mpr-tz-osint", timeout=10)

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, region, district
        FROM locations
        WHERE latitude IS NULL OR longitude IS NULL
        LIMIT 50
    """)
    rows = cur.fetchall()

    updated = 0
    for loc_id, name, region, district in rows:
        query = f"{name}, {district}, {region}, Tanzania"
        try:
            result = geolocator.geocode(query)
            if result:
                cur.execute(
                    "UPDATE locations SET latitude=%s, longitude=%s WHERE id=%s",
                    (result.latitude, result.longitude, loc_id),
                )
                updated += 1
        except Exception as e:
            log.warning(f"Geocode failed for '{query}': {e}")

    conn.commit()
    conn.close()
    log.info(f"Geocoded {updated}/{len(rows)} locations")
    return updated


# ── 4. Fuzzy Name Matching ─────────────────────────────
@shared_task
def fuzzy_match_names():
    """
    For each new OSINT article, try to match mentioned names
    against the persons table using fuzzy string matching.
    """
    conn = db()
    cur = conn.cursor()

    # Get all person names
    cur.execute("SELECT id, full_name FROM persons")
    persons = cur.fetchall()
    if not persons:
        return 0

    person_names = {row[0]: row[1] for row in persons}
    name_list = list(person_names.values())

    # Get unreviewed OSINT articles
    cur.execute("""
        SELECT id, title, snippet FROM osint_matches
        WHERE reviewed = FALSE AND match_score IS NULL
        LIMIT 100
    """)
    articles = cur.fetchall()

    matches_found = 0
    for art_id, title, snippet in articles:
        text = f"{title} {snippet}".lower()

        # Try each person name
        best_score = 0
        best_person_id = None

        for pid, pname in person_names.items():
            score = fuzz.partial_ratio(pname.lower(), text)
            if score > best_score:
                best_score = score
                best_person_id = pid

        if best_score >= 70 and best_person_id:
            cur.execute(
                """UPDATE osint_matches
                   SET person_id = %s, match_score = %s
                   WHERE id = %s""",
                (best_person_id, best_score, art_id),
            )
            matches_found += 1

    conn.commit()
    conn.close()
    log.info(f"Fuzzy matching: {matches_found} potential matches from {len(articles)} articles")
    return matches_found


# ── 5. Daily Alert Digest ──────────────────────────────
@shared_task
def send_daily_alert():
    """
    Compile new matches from the last 24 h and send a digest
    to admin Signal numbers via the Signal bot.
    """
    conn = db()
    cur = conn.cursor()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    cur.execute("""
        SELECT om.title, om.source_url, om.match_score,
               p.full_name, om.source_type
        FROM osint_matches om
        JOIN persons p ON p.id = om.person_id
        WHERE om.created_at > %s AND om.reviewed = FALSE
        ORDER BY om.match_score DESC
        LIMIT 20
    """, (cutoff,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return 0

    lines = [f"🔔 OSINT Alert – {len(rows)} new potential matches\n"]
    for title, url, score, name, source in rows:
        lines.append(f"• {name} ({score:.0f}% match)\n  {title}\n  {url}\n")

    message = "\n".join(lines)

    # Send via Signal bot API
    import httpx
    admin_numbers = os.getenv("ALERT_SIGNAL_NUMBERS", "").split(",")
    for num in admin_numbers:
        num = num.strip()
        if not num:
            continue
        try:
            httpx.post(
                f"{os.getenv('SIGNAL_API','http://127.0.0.1:8080')}/v2/send",
                json={
                    "message": message,
                    "number": os.getenv("BOT_NUMBER", ""),
                    "recipients": [num],
                },
                timeout=10,
            )
        except Exception as e:
            log.warning(f"Failed to send alert to {num}: {e}")

    return len(rows)


# ── Helpers ─────────────────────────────────────────────
def _get_seen_urls(source_type: str) -> set:
    conn = db()
    cur = conn.cursor()
    cur.execute(
        "SELECT source_url FROM osint_matches WHERE source_type = %s",
        (source_type,),
    )
    urls = {row[0] for row in cur.fetchall()}
    conn.close()
    return urls


def _store_articles(articles: list[dict]):
    conn = db()
    cur = conn.cursor()
    for art in articles:
        cur.execute(
            """INSERT INTO osint_matches
               (source_type, source_url, title, snippet, published_at)
               VALUES (%(source_type)s, %(source_url)s, %(title)s,
                       %(snippet)s, %(published_at)s)
               ON CONFLICT DO NOTHING""",
            art,
        )
    conn.commit()
    conn.close()


def _strip_html(html: str) -> str:
    return BeautifulSoup(html, "lxml").get_text(separator=" ", strip=True)[:500]
```

### 13.6 Run the OSINT Stack

```bash
# Terminal 1 – Redis
redis-server

# Terminal 2 – Celery worker
celery -A osint.celery_app worker --loglevel=info --concurrency=2

# Terminal 3 – Celery beat (scheduler)
celery -A osint.celery_app beat --loglevel=info
```

### 13.7 OSINT Admin Panel Endpoint (add to FastAPI)

```python
# api/osint.py
from fastapi import APIRouter, Depends, Query
from uuid import UUID
from api.auth import get_current_user

router = APIRouter(prefix="/admin/osint", tags=["osint"])

@router.get("/matches")
async def list_matches(
    reviewed: bool = False,
    min_score: float = 70,
    page: int = 1,
    user: dict = Depends(get_current_user),
):
    offset = (page - 1) * 20
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT om.*, p.full_name, p.photo_url
               FROM osint_matches om
               LEFT JOIN persons p ON p.id = om.person_id
               WHERE om.reviewed = $1 AND om.match_score >= $2
               ORDER BY om.match_score DESC
               LIMIT 20 OFFSET $3""",
            reviewed, min_score, offset,
        )
    return [dict(r) for r in rows]


@router.post("/matches/{match_id}/review")
async def review_match(
    match_id: UUID,
    approved: bool,
    user: dict = Depends(get_current_user),
):
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE osint_matches
               SET reviewed = TRUE,
                   reviewed_by = (SELECT id FROM contributors WHERE username = $2)
               WHERE id = $1""",
            match_id, user["user"],
        )
        if approved:
            # Link the article to the person permanently
            await conn.execute(
                "UPDATE osint_matches SET person_id = person_id WHERE id = $1",
                match_id,
            )
    return {"status": "reviewed", "approved": approved}
```

---

## PART 14 — Updated `docker-compose.yml` (Full Stack)

```yaml
version: "3.8"

services:
  # ── Core ───────────────────────────────────────────
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: missing_persons
      POSTGRES_USER: mp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports: ["127.0.0.1:5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["127.0.0.1:6379:6379"]

  fastapi:
    build: ./api
    environment:
      DATABASE_URL: postgresql://mp:${DB_PASSWORD}@postgres/missing_persons
    depends_on: [postgres, redis]
    ports: ["127.0.0.1:8000:8000"]

  # ── Signal Bot ─────────────────────────────────────
  signal-cli-rest-api:
    image: bbernhard/signal-cli-rest-api:latest
    volumes: [signal-data:/home/.local/share/signal-cli]
    ports: ["127.0.0.1:8080:8080"]

  signal-bot:
    build: ./bot
    depends_on: [signal-cli-rest-api, fastapi]
    environment:
      SIGNAL_API: http://signal-cli-rest-api:8080
      BOT_NUMBER: ${BOT_NUMBER}
      FASTAPI_URL: http://fastapi:8000
      PGP_PUBLIC_KEY_FILE: /keys/server-pub.asc
    volumes: [./bot/keys:/keys:ro]

  # ── OSINT ──────────────────────────────────────────
  celery-worker:
    build: ./osint
    command: celery -A osint.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://mp:${DB_PASSWORD}@postgres/missing_persons
      REDIS_URL: redis://redis:6379/0
      SIGNAL_API: http://signal-cli-rest-api:8080
      BOT_NUMBER: ${BOT_NUMBER}
    depends_on: [postgres, redis, signal-cli-rest-api]

  celery-beat:
    build: ./osint
    command: celery -A osint.celery_app beat --loglevel=info
    depends_on: [redis]

  # ── Tor ────────────────────────────────────────────
  tor:
    image: dperson/torproxy:latest
    volumes:
      - ./tor/torrc:/etc/tor/torrc
      - tor-data:/var/lib/tor
    depends_on: [fastapi]
    ports: ["127.0.0.1:9050:9050"]

volumes:
  pgdata:
  signal-data:
  tor-data:
```

---

## PART 15 — Final System Diagram

```
                         ┌──────────────────────┐
                         │   TIPSTER / FAMILY    │
                         │  Signal / Web Form    │
                         └────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
     ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐
     │  Signal Bot    │  │  Web Form    │  │  Tor .onion     │
     │  (encrypted)   │  │  (PGP)       │  │  mirror         │
     └───────┬────────┘  └──────┬───────┘  └────────┬────────┘
             │                  │                    │
             └──────────────────┼────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │    FastAPI Backend     │
                    │  /api/reports         │
                    │  /api/persons         │
                    │  /api/admin/*         │
                    │  /api/admin/osint/*   │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  PostgreSQL  │  │  Redis       │  │  IPFS /      │
     │  + PostGIS   │  │  (Celery)    │  │  Arweave     │
     └──────┬───────┘  └──────┬───────┘  └──────────────┘
            │                 │
            │         ┌───────┴────────┐
            │         ▼                ▼
            │  ┌────────────┐  ┌────────────┐
            │  │  Celery    │  │  Celery    │
            │  │  Worker    │  │  Beat      │
            │  │  (OSINT)   │  │  (sched)   │
            │  └────────────┘  └────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────────┐
   │              ADMIN DASHBOARD                    │
   │  /admin/dashboard  → stats, charts             │
   │  /admin/reports    → verify / reject queue     │
   │  /admin/persons    → CRUD person records       │
   │  /admin/osint      → review auto-matches       │
   │  /admin/audit      → full audit trail          │
   └─────────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────────┐
   │         OSINT ENRICHMENT (automated)            │
   │  • GDELT news scan          every 6 h          │
   │  • Google News RSS          every 6 h          │
   │  • Geocoding (Nominatim)    every 12 h         │
   │  • Fuzzy name matching      daily 03:00        │
   │  • Signal alert digest      daily 07:00        │
   └─────────────────────────────────────────────────┘
```

---

## Deployment Checklist (Parts 11–13)

| # | Task | Status |
|---|------|--------|
| 1 | `docker compose up postgres redis` – verify DB | ☐ |
| 2 | Run `migrations/001_initial.sql` + `002_osint.sql` | ☐ |
| 3 | `docker compose up signal-cli-rest-api` – register bot number | ☐ |
| 4 | Generate PGP keypair on air-gapped machine | ☐ |
| 5 | Place `server-pub.asc` in `bot/keys/` | ☐ |
| 6 | `docker compose up signal-bot` – send test tip | ☐ |
| 7 | `docker compose up fastapi` – verify `/api/reports` | ☐ |
| 8 | `docker compose up celery-worker celery-beat` | ☐ |
| 9 | Build admin dashboard, test login + TOTP | ☐ |
| 10 | Submit a test tip via Signal → verify encrypted storage | ☐ |
| 11 | Wait for first GDELT/Google News scan → check `osint_matches` | ☐ |
| 12 | Verify Signal alert digest arrives at admin number | ☐ |
| 13 | Configure Tor hidden service, test `.onion` access | ☐ |
| 14 | Run Lighthouse PWA audit on public site ≥ 90 | ☐ |
| 15 | End-to-end: tip → encrypt → store → verify → publish → OSINT match | ☐ |

---

 