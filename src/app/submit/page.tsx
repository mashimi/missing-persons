// src/app/submit/page.tsx
// PART 7 — Secure Submission Form (PGP in the browser; works over Tor).
"use client";

import { useState } from "react";
import { encryptReport } from "@/lib/pgp";
import { useI18n } from "@/i18n/I18nProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type FormState = "idle" | "sending" | "success" | "error";

export default function SubmitPage() {
  const { t, locale } = useI18n();

  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Person fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] =
    useState<"male" | "female" | "other" | "unknown">("unknown");
  const [lastSeenDate, setLastSeenDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [description, setDescription] = useState("");
  const [circumstances, setCircumstances] = useState("");
  // Tipster fields (all optional — anonymous by default)
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrorMessage(null);

    try {
      let photoBase64: string | null = null;
      if (photo) {
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result);
            resolve(result.slice(result.indexOf(",") + 1)); // strip data: prefix
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(photo);
        });
      }

      // 1. Build the payload — everything is assembled client-side.
      const payload = {
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        gender,
        last_seen_date: lastSeenDate,
        location_name: locationName.trim(),
        region: region.trim(),
        district: district.trim(),
        coordinates: coordinates.trim() || null,
        description: description.trim(),
        circumstances: circumstances.trim(),
        photo_base64: photoBase64,
        contact: contact.trim() || null,
        consent_given: consent,
        submitted_at: new Date().toISOString(),
        locale,
      };

      // 2. Encrypt with the server public key — BEFORE it leaves the device.
      const encryptedBlob = await encryptReport(payload);

      // 3. Send only the ciphertext.
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_blob: encryptedBlob,
          source: "web",
          sender_hint: null,
        }),
      });

      if (!res.ok) throw new Error(`API responded ${res.status}`);

      setState("success");
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("submit.heading")}
        </h1>
        <p className="mt-2 text-gray-600">{t("submit.intro")}</p>
        <p className="mt-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
          🔒 {t("submit.encrypt_note")}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {t("submit.anonymous_note")}
        </p>
      </header>

      {state === "success" ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
          ✅ {t("submit.success")}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">
            The missing person
          </legend>

          <div>
            <label className={labelClass} htmlFor="full_name">
              {t("submit.name_label")}
            </label>
            <input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="age">
                {t("submit.age_label")}
              </label>
              <input
                id="age"
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="gender">
                {t("submit.gender_label")}
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as typeof gender)
                }
                className={inputClass}
              >
                <option value="unknown">{t("gender.unknown")}</option>
                <option value="male">{t("gender.male")}</option>
                <option value="female">{t("gender.female")}</option>
                <option value="other">{t("gender.other")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="last_seen_date">
              {t("submit.date_label")}
            </label>
            <input
              id="last_seen_date"
              type="date"
              required
              value={lastSeenDate}
              onChange={(e) => setLastSeenDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="location_name">
              {t("submit.location_label")}
            </label>
            <input
              id="location_name"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="region">
                {t("submit.region_label")}
              </label>
              <input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="district">
                {t("submit.district_label")}
              </label>
              <input
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="coordinates">
              {t("submit.coords_label")}
            </label>
            <input
              id="coordinates"
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              placeholder="-6.37, 34.89"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="description">
              {t("submit.description_label")}
            </label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="circumstances">
              {t("submit.circumstances_label")}
            </label>
            <textarea
              id="circumstances"
              rows={4}
              required
              value={circumstances}
              onChange={(e) => setCircumstances(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="photo">
              {t("submit.photo_label")}
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className={inputClass}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">
            About you (optional)
          </legend>

          <div>
            <label className={labelClass} htmlFor="contact">
              {t("submit.contact_label")}
            </label>
            <input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="consent"
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="consent" className="text-sm text-gray-700">
              {t("submit.consent_label")}
            </label>
          </div>
        </fieldset>

        {state === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t("submit.error")}
            {errorMessage && (
              <span className="block text-xs text-red-500">
                ({errorMessage})
              </span>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-lg bg-primary-600 px-4 py-3 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {state === "sending" ? t("submit.sending") : t("submit.send")}
        </button>
      </form>
      )}
    </div>
  );
}


