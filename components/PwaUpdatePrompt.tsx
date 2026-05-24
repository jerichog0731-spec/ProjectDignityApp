"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function PwaUpdatePrompt() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setRegistration(reg);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const hasUpdate = Boolean(registration?.waiting);

  if (!hasUpdate) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-lg"
    >
      <p className="text-sm font-medium text-blue-950">
        A new version of C.O.R.E. is ready.
      </p>
      <p className="mt-1 text-sm text-blue-800">
        Refresh to get the latest features and fixes.
      </p>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        onClick={() => {
          registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Update now
      </button>
    </div>
  );
}
