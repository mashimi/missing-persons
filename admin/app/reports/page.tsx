// admin/app/reports/page.tsx — the encrypted-report review queue.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface ReportRow {
  id: string;
  source: string;
  status: string;
  created_at: string;
}

const STATUS_TABS = ["pending", "verified", "rejected", "published"];

export default function ReportsPage() {
  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ data: ReportRow[] }>(`/api/admin/reports?status=${status}`)
      .then((res) => setReports(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Encrypted reports</h1>

      <div className="flex gap-2" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={status === tab}
            onClick={() => setStatus(tab)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
              status === tab
                ? "bg-blue-600 text-white"
                : "border border-gray-700 text-gray-300 hover:bg-gray-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-400">No {status} reports.</p>
      ) : (
        <ul className="card divide-y divide-gray-800 text-sm">
          {reports.map((report) => (
            <li key={report.id} className="flex items-center justify-between py-3">
              <span className="text-gray-300">
                <span className="mr-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs uppercase">
                  {report.source}
                </span>
                {new Date(report.created_at).toLocaleString()}
              </span>
              <Link
                href={`/reports/${report.id}`}
                className="text-blue-400 hover:underline"
              >
                {status === "pending" ? "Review" : "Open"} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
