"use client";

import { useEffect, useState } from "react";
import { ClientCard } from "@/components/ClientCard";
import { ClientOnboarding, CLIENT_ID_KEY } from "@/components/ClientOnboarding";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";

export function HomeClient() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("client");
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    setClientId(fromUrl ?? stored);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {clientId ? (
          <ClientCard clientId={clientId} />
        ) : (
          <ClientOnboarding onComplete={setClientId} />
        )}
      </div>
      <PwaUpdatePrompt />
    </>
  );
}
