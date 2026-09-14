// src/components/PersonList.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PersonCard from "./PersonCard";
import SearchBar from "./SearchBar";
import { fetchPersons } from "@/lib/api";
import { cachePersons, getCachedPersons } from "@/lib/idb";
import type { Person } from "@/lib/types";

export default function PersonList() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Person["status"] | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersons(1, 500)
      .then(async (res) => {
        setPersons(res.data);
        // Keep a copy in IndexedDB for offline / API-down situations
        await cachePersons(res.data).catch(() => undefined);
      })
      .catch(async () => {
        setPersons(await getCachedPersons());
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return persons.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        (p.last_seen_location?.name ?? "").toLowerCase().includes(q) ||
        (p.last_seen_location?.region ?? "").toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.circumstances.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [persons, query, status]);

  return (
    <section>
      <div className="mb-6 space-y-4">
        <SearchBar initial={query} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter the list live…"
          aria-label="Filter cases"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-600 focus:outline-none md:w-96"
        />
        <div className="flex gap-2" role="tablist" aria-label="Filter by status">
          {(["all", "missing", "found_alive", "found_deceased", "unknown"] as const).map(
            (option) => (
              <button
                key={option}
                role="tab"
                aria-selected={status === option}
                onClick={() => setStatus(option)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  status === option
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option === "all"
                  ? "All"
                  : option.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading cases…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No cases match this filter yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500">
        {filtered.length} of {persons.length} cases shown
      </p>
    </section>
  );
}
