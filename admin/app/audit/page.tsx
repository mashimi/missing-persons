// admin/app/audit/page.tsx — full audit trail (every admin action).
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuditRow {
  id: number;
  actor: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: AuditRow[] }>("/api/admin/audit?page=1&page_size=100")
      .then((res) => setRows(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Audit trail</h1>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No audit entries yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Actor</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Entity</th>
                <th className="px-2 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 text-gray-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-2">{row.actor}</td>
                  <td className="px-2 py-2">{row.action}</td>
                  <td className="px-2 py-2 text-gray-400">
                    {row.entity}
                    {row.entity_id
                      ? ` · ${String(row.entity_id).slice(0, 8)}…`
                      : ""}
                  </td>
                  <td className="max-w-xs truncate px-2 py-2 text-gray-500">
                    {JSON.stringify(row.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
