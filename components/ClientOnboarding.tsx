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
    <section className="w-full max-w-md glass-panel p-6 shadow-2xl bg-[#0d1b2a]/30 border border-white/10 backdrop-blur-md rounded-2xl">
      <h1 className="text-2xl font-bold text-white font-heading">Welcome to C.O.R.E.</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Enter your first name and household size to receive your digital card
        and QR code.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-semibold text-zinc-300"
          >
            First name <span className="text-[#ff6a00]">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-[#ff6a00]/50 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/20 transition-all duration-200"
            placeholder="Your first name"
          />
        </div>

        <div>
          <label
            htmlFor="familySize"
            className="block text-sm font-semibold text-zinc-300"
          >
            Family size <span className="text-[#ff6a00]">*</span>
          </label>
          <input
            id="familySize"
            name="familySize"
            type="number"
            min={1}
            required
            value={familySize}
            onChange={(e) => setFamilySize(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-[#ff6a00]/50 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/20 transition-all duration-200"
            placeholder="e.g. 3"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-400 font-semibold" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-60 cursor-pointer shadow-lg hover:shadow-[#ff6a00]/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
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
