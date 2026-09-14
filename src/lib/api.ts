// src/lib/api.ts
import axios from "axios";
import type { Person, PaginatedResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 10_000 });

export async function fetchPersons(
  page = 1,
  pageSize = 20,
  search = ""
): Promise<PaginatedResponse<Person>> {
  try {
    const { data } = await client.get("/api/persons", {
      params: { page, page_size: pageSize, search },
    });
    return data;
  } catch {
    // Fall back to bundled static snapshot (IPFS / offline)
    const fallback = await import("@/data/fallback-persons.json");
    const persons = fallback.default as Person[];
    return {
      data: persons,
      total: persons.length,
      page: 1,
      page_size: pageSize,
    };
  }
}

export async function fetchPerson(id: string): Promise<Person | null> {
  try {
    const { data } = await client.get(`/api/persons/${id}`);
    return data;
  } catch {
    // Try the bundled snapshot, then the IndexedDB cache
    const fallback = await import("@/data/fallback-persons.json");
    const persons = fallback.default as Person[];
    const match = persons.find((p) => p.id === id);
    if (match) return match;

    const cached = await import("./idb");
    return cached.getCachedPerson(id);
  }
}
