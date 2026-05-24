"use client";

import { useEffect, useState } from "react";
import { ClientCard } from "@/components/ClientCard";
import { ClientOnboarding, CLIENT_ID_KEY } from "@/components/ClientOnboarding";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { RefreshCw, X, ArrowRight, Activity } from "lucide-react";

export function HomeClient() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  
  // Splash Screen States
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Desktop Updater States
  const [isElectron, setIsElectron] = useState(false);
  const [updaterStatus, setUpdaterStatus] = useState<string | null>(null);
  const [updaterPercent, setUpdaterPercent] = useState<number>(0);
  const [updaterVersion, setUpdaterVersion] = useState<string>("");
  const [updaterError, setUpdaterError] = useState<string>("");

  useEffect(() => {
    // Check Client ID
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("client");
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    setClientId(fromUrl ?? stored);
    setReady(true);

    // Simulate Splash Loader progress (0% to 100% in 2 seconds)
    const intervalTime = 20; // 20ms * 100 = 2000ms
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setShowSplash(false);
          }, 400); // Small delay to enjoy the 100% state
          return 100;
        }
        return prev + 1;
      });
    }, intervalTime);

    // Detect Electron
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
      const api = (window as any).electronAPI;

      // Register updater state listener
      api.onUpdateStatus((status: string, payload?: any) => {
        setUpdaterStatus(status);
        if (status === "available" && typeof payload === "string") {
          setUpdaterVersion(payload);
        } else if (status === "downloading" && typeof payload === "number") {
          setUpdaterPercent(payload);
        } else if (status === "error" && typeof payload === "string") {
          setUpdaterError(payload);
        }
      });
    }

    return () => clearInterval(timer);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500 bg-[#050c18] min-h-screen">
        Loading C.O.R.E…
      </div>
    );
  }

  return (
    <>
      {/* 1. Splash Screen Loader */}
      {showSplash && (
        <div 
          className="fixed inset-0 z-[12000] flex flex-col justify-center items-center bg-radial from-[#0c1a30] to-[#030812] transition-opacity duration-500 ease-out"
          style={{ opacity: loadingProgress >= 100 ? 0 : 1 }}
        >
          <div className="text-center w-full max-w-sm px-6">
            <div className="relative w-40 h-40 mx-auto mb-8 flex justify-center items-center">
              <img 
                src="/assets/logo.png" 
                alt="Project Dignity Hobbs Logo" 
                className="w-full h-full object-contain z-10 animate-logo-pulse"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "logo.png";
                }}
              />
              <div className="absolute inset-2 bg-radial from-[#ff6a00]/30 to-transparent filter blur-xl rounded-full z-0 animate-glow-pulse" />
            </div>
            
            <div className="w-full h-1 bg-white/5 rounded-full mb-3 overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,106,0,0.6)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            <div className="font-heading text-2xl font-bold tracking-wider text-white mb-1">
              {loadingProgress}%
            </div>
            <div className="text-[11px] font-semibold text-[#ff6a00] tracking-widest uppercase">
              Restoring Dignity to Hobbs, NM
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Onboarding & Card Portal */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo badge on main screen */}
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/assets/logo.png" 
              alt="Project Dignity" 
              className="w-16 h-16 object-contain mb-3 drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "logo.png";
              }}
            />
            <h2 className="font-heading text-xl font-bold tracking-wide text-white">
              Project Dignity Hobbs
            </h2>
            <p className="text-xs text-[#ff6a00] font-bold uppercase tracking-wider mt-1">
              C.O.R.E. Engine
            </p>
          </div>

          {clientId ? (
            <ClientCard clientId={clientId} />
          ) : (
            <ClientOnboarding onComplete={setClientId} />
          )}
        </div>
      </main>

      {/* 3. PWA Web Update Prompt (Runs in standard browsers) */}
      {!isElectron && <PwaUpdatePrompt />}

      {/* 4. Electron Desktop Updater Glass Toast */}
      {isElectron && updaterStatus && updaterStatus !== "idle" && (
        <div className="fixed bottom-6 right-6 w-80 z-[10000] glass-panel bg-[#0d1b2a]/70 border border-white/10 backdrop-blur-lg rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-4 transition-all duration-500 animate-slide-in">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#ff6a00]/15 text-[#ff6a00] flex justify-center items-center">
              <RefreshCw className={`w-4 h-4 ${updaterStatus === "checking" || updaterStatus === "downloading" ? "animate-spin" : ""}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-xs font-bold text-white uppercase tracking-wider">
                {updaterStatus === "checking" && "Checking for updates"}
                {updaterStatus === "available" && "New Update Found"}
                {updaterStatus === "downloading" && "Downloading Update"}
                {updaterStatus === "downloaded" && "Update Ready"}
                {updaterStatus === "error" && "Updater Error"}
                {updaterStatus === "not-available" && "App Up to Date"}
              </h4>
              
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {updaterStatus === "checking" && "Checking remote GitHub packages..."}
                {updaterStatus === "available" && `Downloading version ${updaterVersion || "latest"}...`}
                {updaterStatus === "downloading" && `Downloading installation files... (${updaterPercent}%)`}
                {updaterStatus === "downloaded" && "Install files downloaded. Restart to apply updates."}
                {updaterStatus === "error" && `Could not download: ${updaterError || "Network issue"}`}
                {updaterStatus === "not-available" && "You are running the latest desktop build."}
              </p>

              {/* Progress bar during download */}
              {updaterStatus === "downloading" && (
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-[#ff6a00] rounded-full transition-all duration-100"
                    style={{ width: `${updaterPercent}%` }}
                  />
                </div>
              )}

              {/* Action buttons */}
              {updaterStatus === "downloaded" && (
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).electronAPI) {
                      (window as any).electronAPI.restartApp();
                    }
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] text-zinc-950 font-heading text-xs font-semibold py-2 px-3 rounded-lg shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  Restart & Update Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button 
              onClick={() => setUpdaterStatus("idle")}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
