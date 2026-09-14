// admin/app/login/page.tsx — password + TOTP login (PART 12.2 flow).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password, totp);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6"
      >
        <h1 className="text-lg font-semibold">Admin sign-in</h1>
        <p className="text-xs text-gray-400">
          Password + TOTP (2FA). Every attempt is audited.
        </p>

        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            autoComplete="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="totp">
            TOTP code (6 digits)
          </label>
          <input
            id="totp"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="input tracking-widest"
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
