// src/components/SearchBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/persons?search=${encodeURIComponent(value)}`);
      }}
      className="flex w-full items-center gap-2"
    >
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, region, or keyword…"
        aria-label="Search cases"
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
      />
      <button
        type="submit"
        className="whitespace-nowrap rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition hover:bg-primary-700"
      >
        Search
      </button>
    </form>
  );
}
