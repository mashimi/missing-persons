// src/app/persons/page.tsx
import type { Metadata } from "next";
import PersonList from "@/components/PersonList";

export const metadata: Metadata = {
  title: "Registry – Missing Persons Registry – Tanzania",
  description:
    "Searchable list of all documented disappearance cases in Tanzania.",
};

export default function PersonsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">The Registry</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Every documented case. Each one is verified against at least two
          independent sources — or confirmed by family — before publication.
        </p>
      </header>
      <PersonList />
    </div>
  );
}
