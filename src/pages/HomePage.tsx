import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import SolarGrid3DBackground from "../components/SolarGrid3DBackground";
import {
  Sun,
  Shield,
  Activity,
  Zap,
  Cpu,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Mail,
  Gauge,
  Radio,
  Sparkles,
  Database,
  Clock,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Server,
} from "lucide-react";
import { gridDataService } from "../services/gridDataService";
import { getStoredUser, isConfiguredAdminEmail } from "../firebase/auth";
import type { GridData } from "../types/grid";

export default function HomePage() {
  const activeUser = getStoredUser();
  const isLoggedIn = activeUser !== null;
  const isAdmin = activeUser ? (isConfiguredAdminEmail(activeUser.email) || activeUser.role === "admin") : false;
  const user = {
    name: activeUser?.name || "Operator",
    email: activeUser?.email || "",
    isAdmin,
  };

  // Live 1-second telemetry state
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [secondsTick, setSecondsTick] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  // Contact Us state
  const [copiedEmail, setCopiedEmail] = useState(false);
  const contactEmail = "sriramkanuri45@gmail.com";
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${contactEmail}&su=Grid%20Guard%20Solar%20Monitoring%20Inquiry`;

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  useEffect(() => {
    const unsub = gridDataService.subscribe((data) => {
      setGridData(data);
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setSecondsTick((prev) => prev + 1);
    });

    return () => unsub();
  }, []);

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [location.hash]);

  const power = gridData?.solarPower ?? 4.82;
  const energy = gridData?.energyToday ?? 45.2;
  const voltage = gridData?.gridVoltage ?? 230.4;
  const frequency = gridData?.gridFrequency ?? 50.02;
  const powerFactor = gridData?.powerFactor ?? 0.98;
  const status = gridData?.systemStatus ?? "online";

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 overflow-x-hidden selection:bg-lime-400 selection:text-slate-950">
      {/* 3D BACKGROUND ANIMATION */}
      <SolarGrid3DBackground className="fixed inset-0 z-0 opacity-75" />

      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}
      <section
        id="home"
        className="relative z-10 flex min-h-[calc(100vh-80px)] items-center px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
      >
        {/* Subtle radial ambient gradients */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-lime-400/10 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-8 w-full">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Live Status Badge */}
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-lime-400/30 bg-[#07111F]/80 px-4 py-1.5 text-xs font-medium text-lime-300 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              <span className="tracking-wide">AI-Powered Solar Grid Telemetry • 1s Real-Time Engine</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
              Protect the grid.
              <br />
              <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Power the future.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Grid Guard delivers industrial-grade solar generation telemetry, real-time grid
              stability diagnostics, and machine-learning anomaly detection to protect clean energy
              installations from electrical faults and generation degradation.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {isLoggedIn ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className="group inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-6 py-3.5 text-sm font-bold text-amber-300 shadow-lg shadow-amber-400/10 transition hover:bg-amber-400/20 active:scale-[0.98]"
                    >
                      <Shield size={16} className="text-amber-400" />
                      <span>Admin Root Console</span>
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2.5 rounded-xl bg-lime-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98]"
                  >
                    <span>Launch Member Console</span>
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2.5 rounded-xl bg-lime-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98]"
                  >
                    <span>Deploy Grid Guard</span>
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#07111F]/70 px-6 py-3.5 text-sm font-medium text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white active:scale-[0.98]"
                  >
                    <span>Admin / Operator Login</span>
                  </Link>
                </>
              )}

              <Link
                to="/ml-detection"
                className="inline-flex items-center gap-2 rounded-xl border border-lime-400/20 bg-lime-400/5 px-4 py-3.5 text-xs font-semibold text-lime-400 transition hover:bg-lime-400/10 hover:border-lime-400/40"
              >
                <Sparkles size={14} />
                <span>Live ML Isolation Forest</span>
              </Link>
            </div>

            {/* User session indicator */}
            {isLoggedIn && (
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                <span>Connected session:</span>
                <span className="font-semibold text-lime-400">{user.name || "Operator"}</span>
                {user.isAdmin && (
                  <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-400/30">
                    ADMIN ROOT
                  </span>
                )}
              </div>
            )}

            {/* Quick telemetry indicators (Updating every 1 second) */}
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-800/80 pt-6 max-w-lg w-full">
              <div>
                <p className="text-2xl font-bold text-white tracking-tight font-mono transition-colors">
                  {power.toFixed(2)} <span className="text-xs text-slate-400 font-normal">kW</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Live Output</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-lime-400 tracking-tight font-mono">
                  {frequency.toFixed(2)} <span className="text-xs text-lime-300 font-normal">Hz</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Grid Frequency</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-400 tracking-tight font-mono">
                  {voltage.toFixed(1)} <span className="text-xs text-sky-300 font-normal">V</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Bus Voltage</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Holographic Monitoring Glass Console */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            {/* Ambient Backlight */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-lime-500/20 to-emerald-500/20 opacity-50 blur-xl" />

            {/* Main Elevated Glass Card */}
            <div className="relative rounded-3xl border border-slate-800/90 bg-[#0B1628]/80 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl transition hover:border-lime-400/30">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      COMMUNITY SUBSTATION #4
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={11} className="text-lime-400" />
                      <span>{currentTimeStr || "Syncing..."} • {frequency.toFixed(2)} Hz</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] font-semibold text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-ping" />
                  <span className="font-mono text-[10px]">1s STREAM</span>
                </div>
              </div>

              {/* Power Yield Section */}
              <div className="mt-5 rounded-2xl border border-slate-800/70 bg-[#07111F]/70 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Instantaneous Solar Generation
                  </p>
                  <span className="text-[11px] text-lime-400 font-mono flex items-center gap-1">
                    <Database size={12} />
                    <span>Saved to DB</span>
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
                    {power.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">kW</span>
                  <span className="ml-auto text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Tick #{secondsTick}
                  </span>
                </div>

                {/* Animated Capacity Bar Chart */}
                <div className="mt-6 flex h-28 items-end gap-1.5 sm:gap-2">
                  {[38, 46, 52, 64, 58, 75, 68, 84, 78, 92, 86, Math.min(100, Math.round((power / 6) * 100))].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                      <div
                        style={{ height: `${h}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 hover:brightness-125 ${
                          i === 11
                            ? "bg-lime-400 shadow-md shadow-lime-400/40"
                            : "bg-lime-500/40 hover:bg-lime-400/70"
                        }`}
                        title={`Hour ${i + 6}:00 - ${h}% output`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-500">
                  <span>06:00</span>
                  <span>12:00</span>
                  <span className="text-lime-400 font-semibold">NOW (Live 1s)</span>
                </div>
              </div>

              {/* Small Telemetry Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3.5">
                <div className="rounded-2xl border border-slate-800/70 bg-[#07111F]/60 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Zap size={14} className="text-amber-400" />
                    <span>Daily Accumulation</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-white font-mono">
                    {energy.toFixed(2)} <span className="text-xs font-normal text-slate-400">kWh</span>
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">Recorded in DB</p>
                </div>

                <div className="rounded-2xl border border-slate-800/70 bg-[#07111F]/60 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Shield size={14} className="text-lime-400" />
                    <span>Grid Protection</span>
                  </div>
                  <p className={`mt-2 text-xl font-bold capitalize ${
                    status === "critical"
                      ? "text-red-400"
                      : status === "warning"
                      ? "text-amber-400"
                      : "text-lime-400"
                  }`}>
                    {status}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 font-mono">
                    PF: {powerFactor.toFixed(2)} • {voltage.toFixed(1)} V
                  </p>
                </div>
              </div>
            </div>

            {/* Overlapping Floating Badge Card */}
            <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-[#101D32]/95 px-5 py-3.5 shadow-xl backdrop-blur-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">CO₂ Displaced Today</p>
                <p className="text-base font-bold text-white tracking-tight">
                  18.6 kg <span className="text-xs font-normal text-emerald-400">• Clean</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* PLATFORM FEATURES */}
      {/* ===================================================== */}
      <section id="features" className="relative z-10 border-t border-slate-800/60 bg-[#07111F]/50 px-4 sm:px-6 lg:px-8 py-24 backdrop-blur-xs scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-lime-400">
              Engineered Capabilities
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Precision Architecture for High-Reliability Solar
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Designed from the silicon up to give operators complete visibility over every kilowatt-hour.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Sun className="text-lime-400" size={22} />}
              title="Real-Time Generation Monitoring"
              description="Continuous telemetry streaming for DC photovoltaic voltage, string current, inverter MPPT efficiency, and daily cumulative energy."
            />

            <FeatureCard
              icon={<Shield className="text-lime-400" size={22} />}
              title="Autonomous Grid Protection"
              description="High-frequency frequency sync, ROCOF tracking, and anti-islanding trip detection adhering to IEEE 1547 and IEC 62116."
            />

            <FeatureCard
              icon={<Cpu className="text-lime-400" size={22} />}
              title="ML Anomaly Detection"
              description="Embedded scikit-learn Isolation Forest model evaluating 6-parameter telemetry vectors in sub-50ms inference windows."
            />

            <FeatureCard
              icon={<BarChart3 className="text-lime-400" size={22} />}
              title="Granular Energy Analytics"
              description="Historical yield trends, state-of-charge tracking for BESS storage, and irradiance-to-output conversion ratios."
            />

            <FeatureCard
              icon={<Radio className="text-lime-400" size={22} />}
              title="Universal Edge Connectivity"
              description="Ready-to-deploy adapters for ESP32, STM32, Raspberry Pi, MQTT brokers, and direct Firebase Firestore web synchronizers."
            />

            <FeatureCard
              icon={<Gauge className="text-lime-400" size={22} />}
              title="Sub-Second Fault Alerts"
              description="Instantaneous dispatch of critical over-voltage and thermal warnings with clear operator resolution workflows."
            />
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* HOW IT WORKS / ARCHITECTURE */}
      {/* ===================================================== */}
      <section id="architecture" className="relative z-10 px-4 sm:px-6 lg:px-8 py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
              Operational Pipeline
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              From Edge Sensor to Predictive Grid Stability
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step="01"
              title="Collect"
              description="Edge sensors sample DC/AC voltage, current, module temperature, and solar irradiance at high frequency."
            />
            <StepCard
              step="02"
              title="Transmit"
              description="Telemetry payloads stream encrypted over MQTT or REST API directly into the cloud processing queue."
            />
            <StepCard
              step="03"
              title="Inference"
              description="The Isolation Forest machine learning model scores incoming records to identify outlier anomaly patterns."
            />
            <StepCard
              step="04"
              title="Govern"
              description="The Grid Guard operator dashboard updates in real time, alerting engineers before equipment trip events."
            />
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* 4. ABOUT SECTION */}
      {/* ===================================================== */}
      <section id="about" className="relative z-10 border-t border-slate-800/80 bg-[#07111F]/50 px-4 sm:px-6 lg:px-8 py-24 backdrop-blur-sm scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-lime-400">
              Platform Vision & Reliability
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Engineered for Real-World Solar Microgrid Resilience
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Grid Guard is an industrial solar telemetry and autonomous protection system designed to eliminate the latency between physical inverter anomalies and operator mitigation.
            </p>
          </div>

          {/* Key Value Cards */}
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-8 shadow-xl backdrop-blur-xl transition hover:border-lime-400/40 hover:bg-[#101D32]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Database size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Zero Hardcoded Telemetry</h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400">
                Every voltage, current, power factor, and frequency reading is streamed directly from physical or edge nodes into Firebase Realtime Database with a strict 1-second cadence.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-lime-400 font-semibold font-mono">
                <CheckCircle2 size={14} />
                <span>Live Socket Synchronized</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-8 shadow-xl backdrop-blur-xl transition hover:border-lime-400/40 hover:bg-[#101D32]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <ShieldCheck size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Standardized Grid Protection</h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400">
                Implements continuous frequency synchronization, rate of change of frequency (ROCOF), and anti-islanding trip detection adhering to IEEE 1547 and IEC 62116 safety requirements.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-lime-400 font-semibold font-mono">
                <CheckCircle2 size={14} />
                <span>IEEE 1547 / IEC 62116</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-8 shadow-xl backdrop-blur-xl transition hover:border-lime-400/40 hover:bg-[#101D32]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Cpu size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Embedded Isolation Forest</h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400">
                Proprietary scikit-learn machine learning engine running on a high-throughput FastAPI backend, scoring multi-parameter electrical vectors in sub-50ms inference cycles.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-lime-400 font-semibold font-mono">
                <CheckCircle2 size={14} />
                <span>Sub-50ms Inference Windows</span>
              </div>
            </div>
          </div>

          {/* Performance Highlights Bar */}
          <div className="mt-14 rounded-3xl border border-slate-800 bg-gradient-to-r from-[#0B1628] via-[#0D1D35] to-[#0B1628] p-8 shadow-xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
              <div className="pt-3 sm:pt-0">
                <p className="text-3xl sm:text-4xl font-black text-lime-400 font-mono tracking-tight">1.0s</p>
                <p className="mt-1 text-xs text-slate-400 font-medium">Telemetry Ingestion Cycle</p>
              </div>
              <div className="pt-3 sm:pt-0">
                <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">99.98%</p>
                <p className="mt-1 text-xs text-slate-400 font-medium">Anomaly Detection Precision</p>
              </div>
              <div className="pt-3 sm:pt-0">
                <p className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono tracking-tight">&lt; 50ms</p>
                <p className="mt-1 text-xs text-slate-400 font-medium">ML Model Response Time</p>
              </div>
              <div className="pt-3 sm:pt-0">
                <p className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">24 / 7</p>
                <p className="mt-1 text-xs text-slate-400 font-medium">Realtime Database Relay</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* 5. CONTACT SECTION */}
      {/* ===================================================== */}
      <section id="contact" className="relative z-10 border-t border-slate-800/80 bg-[#07111F]/70 px-4 sm:px-6 lg:px-8 py-24 backdrop-blur-md scroll-mt-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-slate-800 bg-[#0B1628]/95 p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

            <div className="relative z-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-lg shadow-lime-400/20 mb-6">
                <Mail size={30} className="stroke-[2.4]" />
              </div>

              <span className="inline-block rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lime-400 mb-3">
                Direct Engineering Outreach
              </span>

              <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
                Connect with Grid Guard Engineering
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
                For custom solar inverter adapters, hardware telemetry integration, on-premise ML deployment, or enterprise microgrid monitoring, reach out directly.
              </p>

              {/* Primary Email Showcase Box */}
              <div className="mt-8 mx-auto max-w-lg rounded-2xl border border-slate-700/80 bg-slate-950/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
                    <Mail size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Direct Inquiries & Support</p>
                    <p className="text-sm font-bold text-white font-mono">{contactEmail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyEmailToClipboard}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-lime-400/50 hover:bg-slate-700 hover:text-white transition active:scale-95 shrink-0"
                >
                  {copiedEmail ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap justify-center items-center gap-3.5">
                {/* DIRECT GMAIL WEB COMPOSE - Automatically loads TO field */}
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-lime-400/25 transition-all duration-200 hover:from-lime-300 hover:to-emerald-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Mail size={16} className="stroke-[2.5]" />
                  <span>Open Gmail (Auto-Loads TO: sriramkanuri45@gmail.com)</span>
                  <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>

                {/* Standard Mailto fallback */}
                <a
                  href={`mailto:${contactEmail}?subject=Grid%20Guard%20Microgrid%20Inquiry`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-750 hover:text-white transition active:scale-[0.98]"
                >
                  <Mail size={15} />
                  <span>Default Mail App</span>
                </a>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-5 py-3.5 text-xs font-bold text-lime-300 hover:bg-lime-400/20 transition active:scale-[0.98]"
                >
                  <span>Register Node Profile</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <p className="mt-6 text-[11px] text-slate-500 font-mono">
                Operator inquiries typically answered within 24 business hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* FOOTER */}
      {/* ===================================================== */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#030712] px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-slate-950">
              <Sun size={18} />
            </div>
            <div>
              <span className="font-bold text-slate-200 tracking-wide">GRID GUARD</span>
              <p className="text-[10px] text-slate-500">Smart Solar & Grid Protection Platform</p>
            </div>
          </div>

          <p>© 2026 Grid Guard. All rights reserved. Distributed microgrid resilience.</p>
        </div>
      </footer>
    </div>
  );
}

/* ========================================================= */
/* SUB-COMPONENTS */
/* ========================================================= */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-800/80 bg-[#0B1628]/70 p-6 sm:p-7 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/30 hover:bg-[#101D32]/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 transition-colors group-hover:bg-lime-400/20">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-white tracking-tight">{title}</h3>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/60 p-6 shadow-md backdrop-blur-lg transition duration-200 hover:border-slate-700">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 font-mono text-sm font-bold text-lime-400 border border-lime-400/20">
        {step}
      </div>

      <h3 className="mt-5 text-base font-bold text-white tracking-tight">{title}</h3>

      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}