"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { validateOnboarding } from "@/lib/validation";

const CLIENT_ID_KEY = "pdh_client_id";

type Props = {
  onComplete: (clientId: string) => void;
};

export function ClientOnboarding({ onComplete }: Props) {
  const [firstName, setFirstName] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validated = validateOnboarding(firstName, familySize);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: validated.firstName,
          familySize: validated.familySize,
        }),
      });

      const data = (await response.json()) as {
        client?: { ClientID: string };
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not create your digital card.");
        return;
      }

      const clientId = data.client?.ClientID;
      if (!clientId) {
        setError("Unexpected response from server.");
        return;
      }

      localStorage.setItem(CLIENT_ID_KEY, clientId);
      onComplete(clientId);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-zinc-900">Welcome to C.O.R.E.</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your first name and household size to receive your digital card
        and QR code.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-800"
          >
            First name <span className="text-red-600">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Your first name"
          />
        </div>

        <div>
          <label
            htmlFor="familySize"
            className="block text-sm font-medium text-zinc-800"
          >
            Family size <span className="text-red-600">*</span>
          </label>
          <input
            id="familySize"
            name="familySize"
            type="number"
            min={1}
            required
            value={familySize}
            onChange={(e) => setFamilySize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="e.g. 3"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Creating card…
            </>
          ) : (
            "Generate My Digital Card"
          )}
        </button>
      </form>
    </section>
  );
}

export { CLIENT_ID_KEY };
