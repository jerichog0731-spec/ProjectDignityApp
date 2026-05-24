"use client";

import { useEffect, useState } from "react";
import { ClientCard } from "@/components/ClientCard";
import { ClientOnboarding, CLIENT_ID_KEY } from "@/components/ClientOnboarding";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { RESOURCE_DEFINITIONS } from "@/lib/config/resources";
import type { ClientRecord } from "@/lib/types";
import { 
  RefreshCw, X, ArrowRight, User, Users, Lock, LogOut, CheckCircle, 
  AlertTriangle, ShieldAlert, KeyRound, QrCode, Search, Sparkles
} from "lucide-react";

const ROLE_KEY = "pdh_user_role";
const ADMIN_PIN_KEY = "pdh_admin_pin";

export function HomeClient() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  
  // Login & Onboarding States
  const [adminPinInput, setAdminPinInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Volunteer Dashboard States
  const [searchClientId, setSearchClientId] = useState("");
  const [searchedClient, setSearchedClient] = useState<ClientRecord | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dispenseLoading, setDispenseLoading] = useState<string | null>(null);
  const [dispenseSuccess, setDispenseSuccess] = useState<string | null>(null);
  const [emergencyBypass, setEmergencyBypass] = useState(false);

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
    // 1. Initial State Hydration
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("client");
    const storedClient = localStorage.getItem(CLIENT_ID_KEY);
    
    // Auto login if client URL matches
    if (fromUrl) {
      localStorage.setItem(ROLE_KEY, "client");
      localStorage.setItem(CLIENT_ID_KEY, fromUrl);
      setClientId(fromUrl);
      setRole("client");
    } else {
      setClientId(storedClient);
      setRole(localStorage.getItem(ROLE_KEY));
    }

    setReady(true);

    // 2. Simulated Splash Loader progress (0% to 100% in 1.5 seconds)
    const intervalTime = 15;
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setShowSplash(false);
          }, 300);
          return 100;
        }
        return prev + 1;
      });
    }, intervalTime);

    // 3. Detect Electron
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
      const api = (window as any).electronAPI;

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

  // Admin PIN Session Login
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);

    // Verify Admin PIN locally or hit serverless route
    try {
      const response = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "verification-only",
          category: "Hygiene",
          pin: adminPinInput
        })
      });
      
      const data = await response.json();
      
      // Since it's verification-only, we expect a 404 (client not found) if the PIN is CORRECT.
      // If the PIN is INCORRECT, it throws 403 (Invalid Admin PIN).
      if (response.status === 403) {
        setLoginError("Incorrect Admin PIN. Please try again.");
        return;
      }

      // If we got past 403, the PIN is authenticated!
      localStorage.setItem(ROLE_KEY, "volunteer");
      localStorage.setItem(ADMIN_PIN_KEY, adminPinInput);
      setRole("volunteer");
      setAdminPinInput("");
    } catch {
      setLoginError("Failed to authenticate PIN. Verify connection.");
    }
  }

  // Lookup client by ID
  async function handleClientLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!searchClientId.trim()) return;

    setSearchError(null);
    setSearchedClient(null);
    setSearchLoading(true);

    try {
      const response = await fetch(`/api/v1/clients/${searchClientId.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setSearchError(data.error ?? "Failed to lookup client profile.");
        return;
      }

      setSearchedClient(data.client || null);
    } catch {
      setSearchError("Network error. Verify local server connectivity.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Dispense supply items
  async function handleDispense(resourceId: string, category: "Hygiene" | "Laundry" | "Cleaning" | "Special") {
    if (!searchedClient) return;

    setDispenseLoading(resourceId);
    setDispenseSuccess(null);

    const pin = localStorage.getItem(ADMIN_PIN_KEY) || "";

    try {
      const response = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: searchedClient.ClientID,
          category,
          pin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Dispense transaction rejected.");
        return;
      }

      // Update client state locally with the new date timestamps returned
      setSearchedClient(data.client);
      setDispenseSuccess(category);
      
      // Auto-clear success message after 4s
      setTimeout(() => {
        setDispenseSuccess(null);
      }, 4000);
    } catch {
      alert("Network error executing dispense. Queue offline (Step 3).");
    } finally {
      setDispenseLoading(null);
    }
  }

  // Logout/Switch Role helper
  function handleLogout() {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(ADMIN_PIN_KEY);
    setRole(null);
    setSearchedClient(null);
    setSearchClientId("");
  }

  // Calculations for traffic-light cooldowns
  function getEligibilityStatus(
    lastDateStr: string | null,
    cooldownDays: number
  ): { isEligible: boolean; daysRemaining: number } {
    if (emergencyBypass) {
      return { isEligible: true, daysRemaining: 0 };
    }
    if (!lastDateStr) {
      return { isEligible: true, daysRemaining: 0 };
    }

    const lastDate = new Date(lastDateStr);
    const now = new Date();
    const msDiff = now.getTime() - lastDate.getTime();
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= cooldownDays) {
      return { isEligible: true, daysRemaining: 0 };
    }

    const remaining = Math.ceil(cooldownDays - daysDiff);
    return { isEligible: false, daysRemaining: remaining };
  }

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
            <div className="text-[10px] text-zinc-400 font-semibold mb-4 uppercase tracking-wider min-h-[16px] transition-all duration-300">
              {loadingProgress < 20 && "Initializing local database..."}
              {loadingProgress >= 20 && loadingProgress < 45 && "Loading C.O.R.E. desktop environment..."}
              {loadingProgress >= 45 && loadingProgress < 70 && "Establishing secure local server connection..."}
              {loadingProgress >= 70 && loadingProgress < 90 && "Checking for background software updates..."}
              {loadingProgress >= 90 && loadingProgress < 100 && "Configuring glassmorphism panels..."}
              {loadingProgress >= 100 && "C.O.R.E. Online"}
            </div>
            <div className="text-[11px] font-semibold text-[#ff6a00] tracking-widest uppercase">
              Restoring Dignity to Hobbs, NM
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col w-full relative z-10">
        
        {/* Persistent App Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#050c18]/45 backdrop-blur-md sticky top-9 z-50">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/logo.png" 
              alt="Project Dignity" 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "logo.png";
              }}
            />
            <div>
              <h1 className="font-heading text-sm font-extrabold text-white tracking-wide leading-none">
                PROJECT DIGNITY
              </h1>
              <span className="text-[9px] text-[#ff6a00] font-bold uppercase tracking-widest leading-none block mt-1">
                Hobbs, NM
              </span>
            </div>
          </div>

          {role && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg border border-white/5 hover:bg-white/5 bg-transparent cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          )}
        </header>

        {/* 2. Selection Screen (No persistent role logged in) */}
        {!role && (
          <main className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-140px)]">
            <div className="w-full max-w-2xl text-center space-y-8">
              <div>
                <span className="text-xs font-bold text-[#ff6a00] uppercase tracking-widest bg-[#ff6a00]/10 border border-[#ff6a00]/25 px-3 py-1 rounded-full">
                  C.O.R.E. Engine v0.1
                </span>
                <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mt-4 tracking-tight">
                  Welcome to Project Dignity
                </h2>
                <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-md mx-auto">
                  Select your portal mode to access resource cards or checkout supply dispensing logs.
                </p>
              </div>

              <div className="grid md:grid-template-columns md:grid-cols-2 gap-6 max-w-xl mx-auto">
                {/* Neighbor Card Portal */}
                <button
                  onClick={() => {
                    localStorage.setItem(ROLE_KEY, "client");
                    setRole("client");
                  }}
                  className="glass-panel p-6 bg-[#0d1b2a]/20 border border-white/5 hover:border-[#ff6a00]/50 hover:bg-[#0d1b2a]/45 flex flex-col items-center text-center group cursor-pointer transition-all duration-300 rounded-2xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] text-zinc-950 flex justify-center items-center mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-[#ff6a00] transition-colors">
                    Neighbor Portal
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Generate or view your anonymous digital QR card for weekly supply pickups.
                  </p>
                </button>

                {/* Volunteer/Staff Portal */}
                <div className="glass-panel p-6 bg-[#0d1b2a]/20 border border-white/5 hover:border-[#ff6a00]/50 hover:bg-[#0d1b2a]/45 flex flex-col items-center text-center rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-[#0d3873] text-white flex justify-center items-center mb-4 shadow-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white">
                    Volunteer Portal
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed mb-4">
                    Scan neighbor codes, check dispensing eligibility, and issue supplies.
                  </p>

                  <form onSubmit={handleAdminLogin} className="w-full flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={adminPinInput}
                        onChange={(e) => setAdminPinInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#ff6a00]/50 focus:outline-none transition-colors"
                        placeholder="Admin PIN"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] text-zinc-950 text-xs font-bold px-3 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  {loginError && (
                    <p className="text-[10px] text-red-400 font-bold mt-2 text-left w-full">
                      ⚠️ {loginError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* 3. Client Mode Layout */}
        {role === "client" && (
          <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-140px)]">
            <div className="w-full max-w-md">
              {clientId ? (
                <ClientCard clientId={clientId} />
              ) : (
                <ClientOnboarding onComplete={setClientId} />
              )}
            </div>
          </main>
        )}

        {/* 4. Volunteer/Staff Dashboard (Step 2 Interface) */}
        {role === "volunteer" && (
          <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
            
            {/* Lookup Section */}
            <div className="glass-panel p-6 bg-[#0d1b2a]/30 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-[#ff6a00]" />
                <h3 className="font-heading text-lg font-bold text-white">
                  Neighbor Lookup / QR Check-in
                </h3>
              </div>
              <form onSubmit={handleClientLookup} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={searchClientId}
                    onChange={(e) => setSearchClientId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#ff6a00]/50 focus:outline-none transition-colors"
                    placeholder="Enter Neighbor ID (e.g. PDH-XXXX or paste code)"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-gradient-to-r from-[#ff6a00] to-[#ffbc00] text-zinc-950 font-heading text-sm font-extrabold px-6 py-3 rounded-xl hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg shadow-[#ff6a00]/10"
                >
                  {searchLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify Neighbor"
                  )}
                </button>
              </form>
              {searchError && (
                <p className="text-xs text-red-400 font-semibold mt-3">
                  ❌ {searchError}
                </p>
              )}
            </div>

            {/* Neighbor Record Details & Dispensing Engine */}
            {searchedClient && (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Profile Card */}
                <div className="glass-panel p-6 bg-[#0d1b2a]/30 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Verified Profile
                    </span>
                    <h4 className="font-heading text-2xl font-bold text-white mt-1">
                      {searchedClient.FirstName}
                    </h4>
                    <p className="font-mono text-[10px] text-zinc-500 mt-1 uppercase tracking-wide">
                      ID: {searchedClient.ClientID}
                    </p>
                    
                    <div className="border-t border-white/5 mt-4 pt-4 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Household Size:</span>
                        <span className="text-white font-bold">{searchedClient.FamilySize} members</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Status:</span>
                        <span className="text-[#00e676] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                          Active Neighbor
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Override Mode */}
                  <div className="border-t border-white/5 mt-6 pt-4">
                    <label className="flex items-center gap-2.5 text-xs text-zinc-300 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emergencyBypass}
                        onChange={(e) => setEmergencyBypass(e.target.checked)}
                        className="rounded border-white/10 bg-white/5 text-[#ff6a00] focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-yellow-400 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Crisis Emergency Bypass
                      </span>
                    </label>
                    <p className="text-[9px] text-zinc-500 mt-1">
                      Overrides date locks for emergency dispensations.
                    </p>
                  </div>
                </div>

                {/* Eligibility Grid */}
                <div className="md:col-span-2 glass-panel p-6 bg-[#0d1b2a]/30 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="font-heading text-sm font-bold text-white tracking-wide uppercase">
                      Dispensing Eligibility Matrix
                    </h4>
                    {dispenseSuccess && (
                      <span className="text-xs font-semibold text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Issued {dispenseSuccess}!
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {RESOURCE_DEFINITIONS.map((res) => {
                      // Fetch matching Date
                      let lastDateStr: string | null = null;
                      if (res.id === "Hygiene") lastDateStr = searchedClient.LastHygieneDate ?? null;
                      if (res.id === "Laundry") lastDateStr = searchedClient.LastLaundryDate ?? null;
                      if (res.id === "Cleaning") lastDateStr = searchedClient.LastCleaningDate ?? null;
                      if (res.id === "Special") lastDateStr = searchedClient.LastSpecialDate ?? null;

                      const { isEligible, daysRemaining } = getEligibilityStatus(lastDateStr, res.cooldownDays);

                      return (
                        <div 
                          key={res.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all duration-300 ${
                            isEligible 
                              ? "bg-[#00e676]/5 border-[#00e676]/20" 
                              : "bg-[#ff4d4d]/5 border-[#ff4d4d]/20"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <h5 className="font-heading text-sm font-bold text-white">{res.label}</h5>
                              <span className={`w-2.5 h-2.5 rounded-full ${isEligible ? "bg-[#00e676] shadow-[0_0_8px_#00e676]" : "bg-[#ff4d4d] shadow-[0_0_8px_#ff4d4d]"}`} />
                            </div>
                            
                            <div className="text-[10px] text-zinc-400 mt-2 space-y-1">
                              <div className="flex justify-between">
                                <span>Cooldown:</span>
                                <span className="font-mono text-zinc-300">{res.cooldownDays} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last Dispense:</span>
                                <span className="font-mono text-zinc-300">{lastDateStr ? new Date(lastDateStr).toLocaleDateString() : "Never"}</span>
                              </div>
                            </div>
                          </div>

                          {isEligible ? (
                            <button
                              onClick={() => handleDispense(res.id, res.id)}
                              disabled={dispenseLoading !== null}
                              className="w-full bg-[#00e676] hover:bg-[#00c868] text-zinc-950 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all duration-200 cursor-pointer"
                            >
                              {dispenseLoading === res.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Dispense Supply"
                              )}
                            </button>
                          ) : (
                            <div className="w-full bg-[#ff4d4d]/10 border border-[#ff4d4d]/20 text-[#ff4d4d] text-center py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Locked for {daysRemaining} days
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </main>
        )}

      </div>

      {/* 5. PWA Web Update Prompt (Runs in standard browsers) */}
      {!isElectron && <PwaUpdatePrompt />}

      {/* 6. Electron Desktop Updater Glass Toast */}
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

              {updaterStatus === "downloading" && (
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-[#ff6a00] rounded-full transition-all duration-100"
                    style={{ width: `${updaterPercent}%` }}
                  />
                </div>
              )}

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
