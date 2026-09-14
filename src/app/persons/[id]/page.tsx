// src/app/persons/[id]/page.tsx
import Link from "next/link";
import MapView from "@/components/MapView";
import MemorialCandle from "@/components/MemorialCandle";
import { fetchPerson, fetchPersons } from "@/lib/api";
import type { Person } from "@/lib/types";

// For static export: pre-render every published case that the API knows
// about at build time. New cases are picked up on the next nightly rebuild.
export async function generateStaticParams() {
  try {
    const res = await fetchPersons(1, 500);
    return res.data.map((person: Person) => ({ id: person.id }));
  } catch {
    return [];
  }
}

export default async function PersonPage({
  params,
}: {
  params: { id: string };
}) {
  const person = await fetchPerson(params.id);

  if (!person) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Record not found</h1>
        <p className="mt-2 text-gray-600">
          This case may not be published yet, or the link is wrong.
        </p>
        <Link
          href="/persons/"
          className="mt-4 inline-block text-primary-700 hover:underline"
        >
          ← Back to registry
        </Link>
      </div>
    );
  }

  const loc = person.last_seen_location;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/persons/"
        className="text-sm text-primary-700 hover:underline"
      >
        ← Back to registry
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          {person.photo_url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={person.photo_url}
                alt={person.full_name}
                className="w-full rounded-xl object-cover shadow-sm"
              />
              <div className="mt-3 flex items-center justify-center rounded-xl bg-amber-50/90 border border-amber-200 p-2.5 backdrop-blur-sm">
                <MemorialCandle
                  size="md"
                  showLabel={true}
                  label="Light a Vigil Candle"
                  interactive={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl bg-amber-50/80 border border-amber-200 p-6 text-center shadow-inner">
              <MemorialCandle
                size="lg"
                showLabel={true}
                label="Light a Vigil Candle"
                interactive={true}
              />
            </div>
          )}

        </div>

        <div className="md:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {person.full_name}
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100/90 border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
              <MemorialCandle size="sm" interactive={false} />
              <span>Vigil Active</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
            <span className={`status-badge status-${person.status}`}>
              {person.status.replaceAll("_", " ")}
            </span>
            {person.age != null && (
              <span className="rounded-full bg-gray-100 px-3 py-1">
                Age {person.age}
              </span>
            )}
            {person.gender !== "unknown" && (
              <span className="rounded-full bg-gray-100 px-3 py-1">
                {person.gender}
              </span>
            )}
          </div>


          <dl className="mt-6 space-y-2 text-sm">
            <div>
              <dt className="inline font-semibold">Last seen: </dt>
              <dd className="inline text-gray-700">{person.last_seen_date}</dd>
            </div>
            {loc && (
              <div>
                <dt className="inline font-semibold">Location: </dt>
                <dd className="inline text-gray-700">
                  {loc.name}
                  {loc.region ? `, ${loc.region}` : ""}
                  {loc.district ? `, ${loc.district}` : ""}
                </dd>
              </div>
            )}
            {person.description && (
              <div>
                <dt className="inline font-semibold">Description: </dt>
                <dd className="inline text-gray-700">{person.description}</dd>
              </div>
            )}
          </dl>

          <h2 className="mt-8 text-lg font-semibold">Circumstances</h2>
          <p className="mt-2 whitespace-pre-line text-gray-700">
            {person.circumstances || "Details withheld for family safety."}
          </p>

          <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="font-semibold">Have information about this case?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Contact the family liaison or submit a tip through our secure
              channel. Your identity will be protected.
            </p>
            <Link
              href="/submit/"
              className="mt-3 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Submit a tip →
            </Link>
          </section>
        </div>
      </div>

      {loc && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Where they were seen</h2>
          <MapView persons={[person]} height="320px" />
        </section>
      )}
    </div>
  );
}
