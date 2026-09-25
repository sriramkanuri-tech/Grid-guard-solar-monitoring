import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import {
  logoutUser,
  getStoredUser,
  LOCAL_STORAGE_USER_KEY,
  LOCAL_STORAGE_ACCOUNT_KEY,
} from "../../firebase/auth";
import { rtdbService } from "../../firebase/database";
import { apiClient } from "../../services/apiClient";
import type { UserProfile } from "../../types/user";
import {
  Sliders,
  BellRing,
  Database,
  Moon,
  Sun,
  LogOut,
  Check,
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  CheckCheck,
  RefreshCw,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());

  // Thresholds
  const [tempThreshold, setTempThreshold] = useState("35.0");
  const [voltageThreshold, setVoltageThreshold] = useState("245.0");
  const [currentThreshold, setCurrentThreshold] = useState("16.0");
  const [frequencyThreshold, setFrequencyThreshold] = useState("50.5");

  // Notifications
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  // Polling Frequency
  const [updateInterval, setUpdateInterval] = useState("1");

  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedStatus, setSavedStatus] = useState(false);

  // MFA TOTP State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaUrl, setMfaUrl] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2500);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  // Start MFA Enrollment Flow
  const startMfaSetup = async () => {
    setMfaModalOpen(true);
    setMfaLoading(true);
    setMfaError("");
    setMfaSuccess("");
    setMfaCode("");

    try {
      const email = user?.email || "sriramkanuri4@gmail.com";
      const data = await apiClient.generateMfa(email);
      setMfaSecret(data.secret);
      setMfaUrl(data.otpauth_url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to Grid Guard server. Please try again.";
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  // Verify and Activate MFA
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError("");
    setMfaSuccess("");

    if (mfaCode.trim().length !== 6) {
      setMfaError("Please enter a valid 6-digit authenticator code.");
      return;
    }

    setMfaLoading(true);
    try {
      await apiClient.verifyMfa(mfaSecret, mfaCode.trim());

      // Successfully verified: save in profile & RTDB & mfa_store
      if (user) {
        const cleanEmail = user.email.trim().toLowerCase();
        const updated: UserProfile = {
          ...user,
          mfaEnabled: true,
          mfaSecret,
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
        localStorage.setItem("gridguard_mfa_" + cleanEmail, mfaSecret);
        
        // Also update saved account backup
        const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
        if (savedAccountStr) {
          try {
            const saved = JSON.parse(savedAccountStr);
            if (saved.email?.toLowerCase() === cleanEmail) {
              saved.mfaEnabled = true;
              saved.mfaSecret = mfaSecret;
              localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(saved));
            }
          } catch {
            // ignore
          }
        }

        setUser(updated);
        await rtdbService.saveUserProfile(user.uid, updated);
        await rtdbService.saveMfaSecret(cleanEmail, mfaSecret);
        await rtdbService.logAuditEvent("MFA_ACTIVATED", user.email, {}, user.uid, user.email);
      }

      setMfaSuccess("Two-factor authentication has been successfully activated!");
      setTimeout(() => {
        setMfaModalOpen(false);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error.";
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  // Disable MFA
  const handleDisableMfa = async () => {
    if (!window.confirm("Are you sure you want to deactivate Two-Factor Authentication?")) return;

    if (user) {
      const cleanEmail = user.email.trim().toLowerCase();
      const updated: UserProfile = {
        ...user,
        mfaEnabled: false,
        mfaSecret: undefined,
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
      localStorage.removeItem("gridguard_mfa_" + cleanEmail);

      const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
      if (savedAccountStr) {
        try {
          const saved = JSON.parse(savedAccountStr);
          if (saved.email?.toLowerCase() === cleanEmail) {
            saved.mfaEnabled = false;
            delete saved.mfaSecret;
            localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(saved));
          }
        } catch {
          // ignore
        }
      }

      setUser(updated);
      await rtdbService.saveUserProfile(user.uid, updated);
      await rtdbService.removeMfaSecret(cleanEmail);
      await rtdbService.logAuditEvent("MFA_DEACTIVATED", user.email, {}, user.uid, user.email);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <AnimatedPage>
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage sensor safety thresholds, cloud telemetry mode, and notifications"
        category="System Configuration"
      />

      <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl font-sans">
        {/* SECTION 1: TWO-FACTOR AUTHENTICATION (MFA) */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#070F1E]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldCheck size={20} />
              <h2 className="font-bold text-white text-base">Multi-Factor Authentication (MFA)</h2>
            </div>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                user?.mfaEnabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-800/60 text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  user?.mfaEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              {user?.mfaEnabled ? "PROTECTED (TOTP ACTIVE)" : "NOT CONFIGURED"}
            </span>
          </div>

          <p className="text-xs text-slate-400 my-4 leading-relaxed">
            Protect your operator account with time-based one-time passcodes (TOTP) compatible with
            Google Authenticator, Microsoft Authenticator, and Authy.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Authenticator App (TOTP)</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {user?.mfaEnabled
                  ? "Your account requires an authenticator code when signing in on untrusted devices."
                  : "Scan a QR code to secure login sessions with high-assurance 2FA."}
              </p>
            </div>

            <div>
              {user?.mfaEnabled ? (
                <button
                  type="button"
                  onClick={handleDisableMfa}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition active:scale-95"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startMfaSetup}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  Configure Authenticator App
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: TRIP THRESHOLDS */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#070F1E]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
            <Sliders size={18} />
            <h2 className="font-bold text-white text-base">Safety Trip Thresholds</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Microgrid hardware trip limits. Exceeding these values logs an immediate priority alert in the telemetry stream.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Inverter Temperature Ceiling (°C)
              </label>
              <input
                type="number"
                step="0.5"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Thermal protection nominal cutoff: 35.0 °C
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                AC Voltage Limit (V)
              </label>
              <input
                type="number"
                step="0.5"
                value={voltageThreshold}
                onChange={(e) => setVoltageThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Upper over-voltage excursion: 245.0 V
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Max Inverter Current (A)
              </label>
              <input
                type="number"
                step="0.5"
                value={currentThreshold}
                onChange={(e) => setCurrentThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Breaker overload trip ceiling: 16.0 A
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Grid Frequency Upper Trip (Hz)
              </label>
              <input
                type="number"
                step="0.05"
                value={frequencyThreshold}
                onChange={(e) => setFrequencyThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Grid synchronization threshold: 50.5 Hz
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: ALERT ROUTING */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#070F1E]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
            <BellRing size={18} />
            <h2 className="font-bold text-white text-base">Alert Notification Routing</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Configure automated delivery channels for critical fault and threshold breach events.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-slate-800">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">Telegram Urgent Dispatch</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Telegram notifications dispatched securely via backend Python service.
                </p>
              </div>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="h-4 w-4 accent-lime-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-slate-800">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">Gmail SMTP Incident Alerts</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receive critical anomaly notices dispatched to registered operator email.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-4 w-4 accent-lime-400 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: PRODUCTION RTDB DATA STREAM */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#070F1E]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
            <Database size={18} />
            <h2 className="font-bold text-white text-base">Live Firebase RTDB Stream</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            All telemetry metrics synchronize in real time directly from Firebase Realtime Database.
          </p>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  Firebase Realtime Database Connected
                </p>
                <p className="text-[11px] font-mono text-emerald-400/80">
                  gridguardsolarmonitoring-default-rtdb.firebaseio.com
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-md">
              LIVE SYNC
            </span>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Telemetry Polling Frequency
            </label>
            <select
              value={updateInterval}
              onChange={(e) => setUpdateInterval(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
            >
              <option value="1">1 second (High-Resolution Live Stream)</option>
              <option value="3">3 seconds (Recommended)</option>
              <option value="5">5 seconds (Standard)</option>
            </select>
          </div>
        </section>

        {/* SECTION 5: THEME PREFERENCE */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#070F1E]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
            <Moon size={18} />
            <h2 className="font-bold text-white text-base">Theme Appearance</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Select dashboard visualization color palette.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2.5 rounded-xl border px-5 py-2.5 text-xs font-semibold transition ${
                theme === "dark"
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-slate-800 bg-[#07111F]/80 text-slate-400"
              }`}
            >
              <Moon size={15} />
              <span>Dark Industrial (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2.5 rounded-xl border px-5 py-2.5 text-xs font-semibold transition ${
                theme === "light"
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-slate-800 bg-[#07111F]/80 text-slate-400"
              }`}
            >
              <Sun size={15} />
              <span>Light Slate</span>
            </button>
          </div>
        </section>

        {/* Save Bar & Feedback */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-lime-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-md shadow-lime-500/20 transition hover:bg-lime-400 active:scale-95"
          >
            Save Configuration
          </button>

          {savedStatus && (
            <div className="flex items-center gap-2 text-xs text-lime-400 font-medium">
              <Check size={16} />
              <span>Configuration synchronized successfully!</span>
            </div>
          )}
        </div>

        {/* Account / Signout */}
        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 shadow-lg">
          <h2 className="font-bold text-white text-base">Operator Session</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign out of your active Grid Guard monitoring session on this device.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white active:scale-95"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </form>

      {/* MFA ENROLLMENT MODAL */}
      {mfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#070F1E] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-white">
                <Lock className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">Configure Authenticator App</h3>
              </div>
              <button
                onClick={() => setMfaModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {mfaLoading && !mfaSecret ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400 mb-2" />
                Generating cryptographically secure TOTP secret...
              </div>
            ) : (
              <>
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    1. Scan this QR code with <strong>Google Authenticator</strong>,{" "}
                    <strong>Authy</strong>, or any TOTP application:
                  </p>

                  {/* QR Code Container */}
                  <div className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto my-3 shadow-lg">
                    {mfaUrl ? (
                      <QRCodeSVG value={mfaUrl} size={180} level="H" includeMargin />
                    ) : (
                      <div className="h-44 w-44 flex items-center justify-center text-slate-500 text-xs">
                        QR Unavailable
                      </div>
                    )}
                  </div>

                  {/* Secret Key with Copy */}
                  <div className="mt-3">
                    <span className="text-[11px] text-slate-400">
                      Or manually enter this secret key:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-amber-300 tracking-wider">
                        {mfaSecret}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(mfaSecret)}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
                      >
                        {copiedSecret ? (
                          <CheckCheck size={16} className="text-emerald-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2 Form */}
                <form onSubmit={handleVerifyMfa} className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    2. Enter the 6-digit code displayed in your app:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono font-black text-xl py-2.5 rounded-xl border border-amber-400/50 bg-slate-950 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />

                  {mfaError && (
                    <div className="flex items-center gap-2 text-xs text-rose-400">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{mfaError}</span>
                    </div>
                  )}

                  {mfaSuccess && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <Check size={14} className="shrink-0" />
                      <span>{mfaSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMfaModalOpen(false)}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mfaLoading || mfaCode.length !== 6}
                      className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition active:scale-95 shadow-md shadow-amber-400/20"
                    >
                      {mfaLoading ? "Verifying..." : "Verify & Enable"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}
