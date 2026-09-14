// admin/app/osint/page.tsx — review automated OSINT matches.
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface OsintMatch {
  id: string;
  source_type: string;
  source_url: string;
  title: string;
  snippet: string | null;
  match_score: number | null;
  person_id: string | null;
  full_name: string | null;
  published_at: string | null;
}

export default function OsintPage() {
  const [matches, setMatches] = useState<OsintMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ data: OsintMatch[] }>("/api/admin/osint/matches?min_score=0")
      .then((res) => setMatches(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, approved: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/admin/osint/matches/${id}/review`, { approved });
      setMessage(approved ? "Match approved." : "Match dismissed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">OSINT matches</h1>
        <p className="mt-1 text-xs text-gray-400">
          Automated scans (GDELT + Google News) fuzzy-matched against the
          registry. Every match needs human review — machine matching is
          never published directly.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-green-900 bg-green-950 p-3 text-sm text-green-300">
          {message}
        </p>
      )}

      {matches.length === 0 ? (
        <p className="text-sm text-gray-400">
          No unreviewed matches. The scans run every 6 h.
        </p>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li key={m.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="mr-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs uppercase">
                    {m.source_type}
                  </span>
                  {m.match_score !== null && (
                    <span className="mr-2 rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-300">
                      {m.match_score.toFixed(0)}% match
                    </span>
                  )}
                  {m.full_name && (
                    <span className="text-xs text-gray-400">
                      → {m.full_name}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={busyId === m.id}
                    onClick={() => review(m.id, true)}
                    className="btn-primary !px-2 !py-1 text-xs"
                  >
                    ✓ Approve
                  </button>
                  <button
                    disabled={busyId === m.id}
                    onClick={() => review(m.id, false)}
                    className="btn-ghost !px-2 !py-1 text-xs"
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>
              <a
                href={m.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-blue-400 hover:underline"
              >
                {m.title}
              </a>
              {m.snippet && (
                <p className="text-xs text-gray-400">{m.snippet}</p>
              )}
              <p className="text-xs text-gray-500">
                {m.source_url.slice(0, 100)}
                {m.source_url.length > 100 ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
