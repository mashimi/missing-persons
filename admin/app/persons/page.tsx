// admin/app/persons/page.tsx — person records: list + create drafts.
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PersonRow {
  id: string;
  full_name: string;
  age: number | null;
  status: string;
  created_at: string;
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Create-draft form fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("unknown");
  const [lastSeenDate, setLastSeenDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [circumstances, setCircumstances] = useState("");

  async function load() {
    setError(null);
    try {
      const res = await api.get<{ data: PersonRow[] }>(
        "/api/persons?page=1&page_size=200"
      );
      setPersons(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post<{ id: string }>("/api/persons", {
        full_name: fullName,
        age: age ? Number(age) : null,
        gender,
        last_seen_date: lastSeenDate || null,
        location: locationName
          ? {
              name: locationName,
              region: region || null,
              district: district || null,
            }
          : null,
        circumstances: circumstances || null,
        status: "missing",
      });
      setMessage(`Draft created for ${fullName}`);
      setFullName("");
      setAge("");
      setGender("unknown");
      setLastSeenDate("");
      setLocationName("");
      setRegion("");
      setDistrict("");
      setCircumstances("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Persons</h1>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-green-900 bg-green-950 p-3 text-sm text-green-300">
          {message}
        </p>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">Records ({persons.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Age</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {persons.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-2 text-gray-200">{p.full_name}</td>
                  <td className="px-2 py-2">{p.age ?? "—"}</td>
                  <td className="px-2 py-2 capitalize">
                    {p.status.replace("_", " ")}
                  </td>
                  <td className="px-2 py-2 text-gray-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Create a draft case</h2>
        <form onSubmit={createDraft} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">
              Full name
            </label>
            <input
              id="p-name"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="p-age">
              Age
            </label>
            <input
              id="p-age"
              type="number"
              min="0"
              max="120"
              className="input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-gender">
              Gender
            </label>
            <select
              id="p-gender"
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-date">
              Last seen date
            </label>
            <input
              id="p-date"
              type="date"
              className="input"
              value={lastSeenDate}
              onChange={(e) => setLastSeenDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-loc">
              Location
            </label>
            <input
              id="p-loc"
              className="input"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-region">
                Region
              </label>
              <input
                id="p-region"
                className="input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="p-district">
                District
              </label>
              <input
                id="p-district"
                className="input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="p-circ">
              Circumstances
            </label>
            <textarea
              id="p-circ"
              rows={3}
              className="input"
              value={circumstances}
              onChange={(e) => setCircumstances(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Create draft"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Drafts stay unpublished until two independent sources (or family
              confirmation) are verified in the reports queue.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}


