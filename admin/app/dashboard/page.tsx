// admin/app/dashboard/page.tsx — stats + pending report queue.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface CaseStats {
  total_cases?: number;
  missing?: number;
  found_alive?: number;
  found_deceased?: number;
  last_30_days?: number;
  last_7_days?: number;
}

interface ReportRow {
  id: string;
  source: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CaseStats>("/api/stats")
      .then(setStats)
      .catch((err) => setError(err.message));
    api
      .get<{ data: ReportRow[] }>("/api/admin/reports?status=pending")
      .then((res) => setReports(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: "Total published cases", value: stats?.total_cases },
    { label: "Missing", value: stats?.missing },
    { label: "Found alive", value: stats?.found_alive },
    { label: "Found deceased", value: stats?.found_deceased },
    { label: "New in last 30 days", value: stats?.last_30_days },
    { label: "New in last 7 days", value: stats?.last_7_days },
    { label: "Pending reports", value: reports.length },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="text-2xl font-bold">
              {card.value ?? (stats ? "0" : "…")}
            </div>
            <div className="mt-1 text-xs text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Pending reports</h2>
          <Link href="/reports" className="text-sm text-blue-400 hover:underline">
            Open queue →
          </Link>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">No pending reports.</p>
        ) : (
          <ul className="divide-y divide-gray-800 text-sm">
            {reports.slice(0, 5).map((report) => (
              <li key={report.id} className="flex items-center justify-between py-2">
                <span className="text-gray-300">
                  {report.source} · {new Date(report.created_at).toLocaleString()}
                </span>
                <Link
                  href={`/reports/${report.id}`}
                  className="text-blue-400 hover:underline"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
