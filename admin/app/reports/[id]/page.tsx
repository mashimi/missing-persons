// admin/app/reports/[id]/page.tsx — decrypt + verify / reject / publish.
// The decrypted view is served by the API (which holds the PGP private
// key); this panel never sees private key material.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface DecryptedReport {
  full_name?: string;
  age?: number;
  gender?: string;
  last_seen_date?: string;
  location_name?: string;
  region?: string;
  district?: string;
  coordinates?: string;
  description?: string;
  circumstances?: string;
  contact?: string;
  photo_base64?: string;
  submitted_at?: string;
  locale?: string;
}

interface ReportDetail {
  id: string;
  source: string;
  sender_hint: string | null;
  status: string;
  created_at: string;
  report: DecryptedReport;
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [publishContact, setPublishContact] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<ReportDetail>(`/api/admin/reports/${params.id}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "verify" | "reject" | "publish", body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ status: string; person_id?: string }>(
        `/api/admin/reports/${params.id}/${action}`,
        body
      );
      setDone(
        res.person_id
          ? `${action} → published as case ${res.person_id}`
          : action
      );
      setTimeout(load, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link href="/reports" className="text-sm text-blue-400 hover:underline">
          ← Back to queue
        </Link>
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-gray-400">Decrypting…</p>;
  }

  const r = detail.report;

  const rows: [string, string | number | undefined][] = [
    ["Full name", r.full_name],
    ["Age", r.age],
    ["Gender", r.gender],
    ["Last seen", r.last_seen_date],
    ["Location", r.location_name],
    ["Region", r.region],
    ["District", r.district],
    ["Coordinates", r.coordinates],
    ["Tipster contact", r.contact ?? "(anonymous)"],
    ["Submitted", r.submitted_at],
    ["Locale", r.locale],
  ];

  return (
    <div className="space-y-6">
      <Link href="/reports" className="text-sm text-blue-400 hover:underline">
        ← Back to queue
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Report {detail.id.slice(0, 8)}…
        </h1>
        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs uppercase">
          {detail.status}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Received via {detail.source} at{" "}
        {new Date(detail.created_at).toLocaleString()}
        {detail.sender_hint
          ? ` · sender hash ${detail.sender_hint}`
          : " · anonymous"}
      </p>

      {done && (
        <p className="rounded-lg border border-green-900 bg-green-950 p-3 text-sm text-green-300">
          {done}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Decrypted content</h2>
        {rows.map(
          ([label, value]) =>
            value !== undefined &&
            value !== null &&
            value !== "" && (
              <div key={label} className="flex gap-2">
                <span className="w-36 shrink-0 text-gray-400">{label}:</span>
                <span className="text-gray-200">{String(value)}</span>
              </div>
            )
        )}

        {r.description && (
          <div>
            <span className="text-gray-400">Description:</span>
            <p className="mt-1 text-gray-200">{r.description}</p>
          </div>
        )}
        {r.circumstances && (
          <div>
            <span className="text-gray-400">Circumstances:</span>
            <p className="mt-1 whitespace-pre-line text-gray-200">
              {r.circumstances}
            </p>
          </div>
        )}
        {r.photo_base64 && (
          <div>
            <span className="text-gray-400">Photo:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${r.photo_base64}`}
              alt="Attached by tipster"
              className="mt-1 max-w-xs rounded-lg"
            />
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Actions</h2>

        {detail.status === "pending" && (
          <>
            <div>
              <label className="label" htmlFor="note">
                Verification note (2 sources / family confirmation)
              </label>
              <input
                id="note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => act("verify", { note })}
                className="btn-primary"
              >
                ✓ Verify
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  act("reject", { reason: note || "Could not be confirmed" })
                }
                className="btn-danger"
              >
                ✕ Reject
              </button>
            </div>
          </>
        )}

        {detail.status === "verified" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-gray-300">
              <input
                id="publishContact"
                type="checkbox"
                checked={publishContact}
                onChange={(e) => setPublishContact(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="publishContact">
                Publish the tipster contact as the family liaison (only with
                explicit family consent)
              </label>
            </div>
            <button
              disabled={busy}
              onClick={() =>
                act("publish", { publish_family_contact: publishContact })
              }
              className="btn-primary"
            >
              ⬆ Publish as public case
            </button>
          </div>
        )}

        {["rejected", "published"].includes(detail.status) && (
          <p className="text-sm text-gray-400">
            This report is {detail.status}. Nothing more to do.
          </p>
        )}
      </section>
    </div>
  );
}


