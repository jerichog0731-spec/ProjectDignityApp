"use client";

import { useEffect, useState } from "react";

export function Titlebar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  const api = (window as any).electronAPI;

  return (
    <div 
      className="fixed top-0 left-0 w-full h-9 bg-[#040a14]/90 backdrop-blur-md flex justify-between items-center z-[11000] border-b border-white/5 select-none"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div className="flex items-center pl-4 gap-2">
        <img 
          src="/assets/logo.png" 
          alt="Logo" 
          className="w-4 h-4 object-contain" 
          onError={(e) => {
            // fallback if path differs
            (e.target as HTMLImageElement).src = "logo.png";
          }}
        />
        <span className="font-sans text-[11px] font-semibold tracking-wider text-zinc-400">
          Project Dignity C.O.R.E.
        </span>
      </div>
      
      <div 
        className="flex h-full"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={() => api.minimize()}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Minimize"
        >
          <svg viewBox="0 0 10 1" width="10" height="1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={() => api.maximize()}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Maximize"
        >
          <svg viewBox="0 0 10 10" width="9" height="9">
            <rect width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          onClick={() => api.close()}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
          title="Close"
        >
          <svg viewBox="0 0 10 10" width="9" height="9">
            <path d="M 0,0 L 10,10 M 10,0 L 0,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
