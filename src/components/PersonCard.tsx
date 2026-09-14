// src/components/PersonCard.tsx
import Link from "next/link";
import type { Person } from "@/lib/types";
import MemorialCandle from "@/components/MemorialCandle";

const STATUS_LABELS: Record<Person["status"], string> = {
  missing: "Missing",
  found_alive: "Found alive",
  found_deceased: "Found deceased",
  unknown: "Unknown",
};

export default function PersonCard({ person }: { person: Person }) {
  const isMissing = person.status === "missing";

  return (
    <Link
      href={`/persons/${person.id}/`}
      className={`group relative block overflow-hidden rounded-xl border bg-white/95 backdrop-blur-sm shadow-sm transition hover:shadow-lg ${
        isMissing
          ? "border-amber-200/80 hover:border-amber-400 hover:shadow-amber-500/10"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {person.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo_url}
            alt={person.full_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-amber-50/60 p-4">
            <MemorialCandle size="lg" showLabel={true} label="Vigil" interactive={false} />
          </div>
        )}


        {/* Small vigil candle badge on photo top-right for missing persons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-gray-900/80 px-2.5 py-1 backdrop-blur-md border border-amber-500/40 shadow-md">
          <MemorialCandle size="sm" interactive={false} label={`Vigil for ${person.full_name}`} />
          <span className="text-[11px] font-medium text-amber-300">
            {isMissing ? "Vigil" : "Remembrance"}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
            {person.full_name}
          </h3>
          <span className={`status-badge status-${person.status}`}>
            {STATUS_LABELS[person.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {person.age != null ? `${person.age} yrs · ` : ""}
          {person.last_seen_location?.name ?? "Unknown location"}
        </p>
        <p className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Last seen {person.last_seen_date}</span>
          {isMissing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Candle Lit
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

