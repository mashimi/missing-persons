// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import PersonCard from "@/components/PersonCard";
import SearchBar from "@/components/SearchBar";
import { fetchPersons } from "@/lib/api";
import { cachePersons, getCachedPersons } from "@/lib/idb";
import { useI18n } from "@/i18n/I18nProvider";
import type { Person } from "@/lib/types";

export default function HomePage() {
  const { t } = useI18n();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersons(1, 100)
      .then(async (res) => {
        setPersons(res.data);
        await cachePersons(res.data).catch(() => undefined);
      })
      .catch(async () => {
        setPersons(await getCachedPersons());
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("home.heading")}
        </h1>
        <p className="mt-2 max-w-2xl text-gray-600">{t("site.tagline")}</p>
        <p className="mt-1 text-sm font-medium text-primary-700">
          {t("home.cases", { count: loading ? "…" : persons.length })}
        </p>
        <div className="mt-6 max-w-xl">
          <SearchBar />
        </div>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-xl font-semibold">{t("home.map_title")}</h2>
        <MapView persons={persons} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("home.registry_title")}</h2>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : persons.length === 0 ? (
          <p className="text-gray-500">
            No published cases yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {persons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
