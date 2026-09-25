import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import { logoutUser } from "../../firebase/auth";
import { isFirebaseConfigured } from "../../firebase/config";
import {
  Sliders,
  BellRing,
  Database,
  Moon,
  Sun,
  LogOut,
  Check,
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  // Thresholds
  const [tempThreshold, setTempThreshold] = useState("30.0");
  const [humidityThreshold, setHumidityThreshold] = useState("75");
  const [pressureThreshold, setPressureThreshold] = useState("1025");
  const [voltageThreshold, setVoltageThreshold] = useState("235.0");

  // Notifications
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  // Data Mode
  const [dataMode, setDataMode] = useState<"demo" | "firebase">("demo");
  const [updateInterval, setUpdateInterval] = useState("3");

  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [savedStatus, setSavedStatus] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2500);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  return (
    <AnimatedPage>
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage sensor safety thresholds, cloud telemetry mode, and notifications"
        category="Settings"
        isDemo={dataMode === "demo"}
      />

      <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
        {/* System Settings: Thresholds */}
        <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <Sliders size={20} />
            <h2 className="font-semibold text-white text-lg">System Thresholds</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Automatic safety trip limits. Exceeding these values logs an alert in Firestore.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Temperature Threshold (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard nominal ceiling: 30.0 °C
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Humidity Threshold (%)
              </label>
              <input
                type="number"
                value={humidityThreshold}
                onChange={(e) => setHumidityThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Relative humidity limit: 75%
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Pressure Threshold (hPa)
              </label>
              <input
                type="number"
                value={pressureThreshold}
                onChange={(e) => setPressureThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Atmospheric chamber maximum: 1025 hPa
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Voltage Threshold (V)
              </label>
              <input
                type="number"
                step="0.5"
                value={voltageThreshold}
                onChange={(e) => setVoltageThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Grid upper nominal boundary: 235.0 V
              </span>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <BellRing size={20} />
            <h2 className="font-semibold text-white text-lg">Notification Settings</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Configure delivery channels for critical fault and threshold breach events.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-950/50 p-4 border border-slate-800/80">
              <div>
                <p className="text-sm font-medium text-white">Telegram Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Telegram alerts dispatched securely via backend Cloud Function (tokens never exposed in frontend).
                </p>
              </div>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="h-5 w-5 accent-lime-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-950/50 p-4 border border-slate-800/80">
              <div>
                <p className="text-sm font-medium text-white">Email Incident Summaries</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receive daily performance digest and critical shutdown alerts via email.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-5 w-5 accent-lime-400 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Data Mode & Interval */}
        <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <Database size={20} />
            <h2 className="font-semibold text-white text-lg">Data Telemetry Mode</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Switch between local smooth emulation and live Firebase Firestore stream.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                dataMode === "demo"
                  ? "border-lime-400/40 bg-lime-400/10 text-white"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="datamode"
                value="demo"
                checked={dataMode === "demo"}
                onChange={() => setDataMode("demo")}
                className="mt-1 accent-lime-400"
              />
              <div>
                <p className="font-semibold text-white text-sm">Demo Mode</p>
                <p className="text-xs text-slate-400 mt-1">
                  Local dynamic simulation without needing physical sensors connected.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                dataMode === "firebase"
                  ? "border-lime-400/40 bg-lime-400/10 text-white"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="datamode"
                value="firebase"
                checked={dataMode === "firebase"}
                onChange={() => setDataMode("firebase")}
                className="mt-1 accent-lime-400"
              />
              <div>
                <p className="font-semibold text-white text-sm">Live Firebase Mode</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isFirebaseConfigured
                    ? "Firestore realtime sync enabled."
                    : "Firebase not yet connected; will fallback gracefully to demo."}
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-medium text-slate-300">
              Telemetry Refresh Interval (Seconds)
            </label>
            <select
              value={updateInterval}
              onChange={(e) => setUpdateInterval(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
            >
              <option value="1">1 second (High Frequency)</option>
              <option value="3">3 seconds (Recommended)</option>
              <option value="5">5 seconds (Standard)</option>
              <option value="10">10 seconds (Bandwidth Saver)</option>
            </select>
          </div>
        </section>

        {/* Theme Preference */}
        <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <Moon size={20} />
            <h2 className="font-semibold text-white text-lg">Theme Appearance</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Select dashboard visualization color palette.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium transition ${
                theme === "dark"
                  ? "border-lime-400 bg-lime-400/10 text-lime-300"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              <Moon size={16} />
              Dark Navy (Default)
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium transition ${
                theme === "light"
                  ? "border-lime-400 bg-lime-400/10 text-lime-300"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              <Sun size={16} />
              Light Slate
            </button>
          </div>
        </section>

        {/* Save Bar & Feedback */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-300"
          >
            Save Configuration
          </button>

          {savedStatus && (
            <div className="flex items-center gap-2 text-xs text-lime-400">
              <Check size={16} />
              <span>Settings updated successfully!</span>
            </div>
          )}
        </div>

        {/* Account / Signout */}
        <section className="animate-item rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="font-semibold text-white text-base">Account Session</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign out of your active Grid Guard monitoring session on this device.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </section>
      </form>
    </AnimatedPage>
  );
}
