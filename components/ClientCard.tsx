"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ClientRecord } from "@/lib/types";
import { RESOURCE_DEFINITIONS } from "@/lib/config/resources";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false },
);

type Props = {
  clientId: string;
};

export function ClientCard({ clientId }: Props) {
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/v1/clients/${clientId}`);
        const data = (await response.json()) as {
          client?: ClientRecord;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not load your card.");
          return;
        }
        setClient(data.client ?? null);
      } catch {
        if (!cancelled) setError("Network error loading your card.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?client=${clientId}`
      : clientId;

  return (
    <section className="w-full max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Your digital card</h1>
        {client ? (
          <p className="mt-1 text-sm text-zinc-600">
            Hi {client.FirstName} — household of {client.FamilySize}
          </p>
        ) : null}
        <p className="mt-1 font-mono text-xs text-zinc-500">{clientId}</p>
      </header>

      <div className="flex justify-center rounded-2xl border border-zinc-200 bg-white p-6">
        <QRCodeSVG value={cardUrl} size={200} level="M" includeMargin />
      </div>

      <p className="text-center text-xs text-zinc-500">
        Show this code to a volunteer at pickup.
      </p>

      {error ? (
        <p className="text-sm text-amber-800" role="alert">
          {error} (QR still works offline with your ID.)
        </p>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-800">
          Resource status
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Full eligibility (Step 2) uses the rules below from config.
        </p>
        <ul className="mt-3 space-y-2">
          {RESOURCE_DEFINITIONS.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center justify-between text-sm text-zinc-700"
            >
              <span>{resource.label}</span>
              <span className="text-xs text-zinc-500">
                every {resource.cooldownDays}d
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
