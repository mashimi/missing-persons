// src/lib/pgp.ts
// PART 7 — PGP encryption of reports in the browser.
// The report is encrypted with the SERVER public key before it leaves the
// device. The plaintext never crosses the network; the server holds the
// private key offline and only decrypts during admin verification.
import * as openpgp from "openpgp";

const PUBLIC_KEY_URL =
  process.env.NEXT_PUBLIC_PGP_PUBLIC_KEY_URL ?? "/keys/server-pub.asc";

let cachedKey: openpgp.PublicKey | null = null;

export async function loadServerPublicKey(): Promise<openpgp.PublicKey> {
  if (cachedKey) return cachedKey;

  const res = await fetch(PUBLIC_KEY_URL);
  if (!res.ok) {
    throw new Error("Could not load the server PGP public key");
  }
  const armored = await res.text();
  cachedKey = await openpgp.readKey({ armoredKey: armored });
  return cachedKey;
}

export interface ReportPayload {
  // The missing person
  full_name: string;
  age: number | null;
  gender: "male" | "female" | "other" | "unknown";
  last_seen_date: string;
  location_name: string;
  region: string;
  district: string;
  coordinates: string | null;
  description: string;
  circumstances: string;
  photo_base64: string | null;
  // The tipster (optional / anonymous)
  contact: string | null;
  consent_given: boolean;
  submitted_at: string;
  locale: string;
}

export async function encryptReport(
  payload: ReportPayload
): Promise<string> {
  const key = await loadServerPublicKey();

  const message = await openpgp.createMessage({
    text: JSON.stringify(payload),
  });

  const ciphertext = await openpgp.encrypt({
    message,
    encryptionKeys: key,
    format: "armored",
  });

  // openpgp types model armored output as WebStream<string> | string; with
  // a string input (as here) the result is always an armored string.
  return ciphertext as string;
}
