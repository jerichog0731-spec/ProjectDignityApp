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
      <header className="text-center md:text-left">
        <h1 className="text-2xl font-bold text-white font-heading">Your digital Neighbor card</h1>
        {client ? (
          <p className="mt-1.5 text-sm text-zinc-300">
            Hi <span className="font-semibold text-[#ff6a00]">{client.FirstName}</span> — household of {client.FamilySize}
          </p>
        ) : null}
        <p className="mt-1 font-mono text-xs text-zinc-500 tracking-wider uppercase">{clientId}</p>
      </header>

      <div className="flex justify-center rounded-2xl border border-white/10 bg-white p-6 shadow-2xl transition-transform hover:scale-[1.01]">
        <QRCodeSVG value={cardUrl} size={200} level="M" includeMargin />
      </div>

      <p className="text-center text-xs text-zinc-400">
        Show this QR code to a volunteer at pickup.
      </p>

      {error ? (
        <p className="text-sm text-amber-400 text-center font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl p-3" role="alert">
          {error} (Offline mode active: QR contains your ID.)
        </p>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-[#0d1b2a]/30 backdrop-blur-md p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-white font-heading tracking-wide uppercase">
          Resource status
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Full eligibility (Step 2) uses the rules below from config.
        </p>
        <ul className="mt-4 space-y-3">
          {RESOURCE_DEFINITIONS.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center justify-between text-sm text-zinc-300 border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                {resource.label}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                every {resource.cooldownDays} days
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
