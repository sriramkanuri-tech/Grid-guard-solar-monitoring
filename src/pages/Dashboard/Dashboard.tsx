import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedPage from "../../components/AnimatedPage";
import StatCard from "../../components/StatCard";
import LiveDatabaseFeed from "../../components/LiveDatabaseFeed";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import { getStoredUser, subscribeToAuth, isConfiguredAdminEmail } from "../../firebase/auth";
import type { GridData } from "../../types/grid";
import type { UserProfile } from "../../types/user";
import {
  Sun,
  Zap,
  Plug,
  BatteryCharging,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [grid, setGrid] = useState<GridData>(gridDataService.getInitialData());
  const [hourlyBars, setHourlyBars] = useState<number[]>(energyService.getHourlyBars());
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => setUser(u));
    const unsubGrid = gridDataService.subscribe((data) => {
      setGrid(data);
      setTick((t) => t + 1);
      // Subtle dynamic fluctuation on last bar
      setHourlyBars((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        const delta = Math.floor((Math.random() - 0.48) * 3);
        next[lastIdx] = Math.min(99, Math.max(85, next[lastIdx] + delta));
        return next;
      });
    });

    return () => {
      unsubAuth();
      unsubGrid();
    };
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "Operator";
  const isAdmin = Boolean(user?.isAdmin) || isConfiguredAdminEmail(user?.email || "");

  return (
    <AnimatedPage>
      {/* Welcome Banner */}
      <section className="animate-item mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
            <span className="h-2 w-2 rounded-full bg-lime-400 animate-ping" />
            <span>1s Real-Time Engine Active</span>
            <span className="text-slate-500 font-normal">|</span>
            <span className="text-emerald-400 font-mono text-[11px]">Firebase RTDB Live Stream</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Welcome back, <span className="bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">{firstName}</span>
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-300 shadow-sm shadow-amber-400/10">
                <ShieldAlert size={14} className="text-amber-400" />
                ADMINISTRATOR ROOT
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Substation telemetry live stream. Solar arrays, battery storage, and 1-second database records stream.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition shadow-xs shadow-amber-400/10"
            >
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Admin Root Control</span>
            </Link>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#07111F]/80 px-4 py-2 text-xs font-mono text-slate-300">
            <Clock size={13} className="text-lime-400" />
            <span className="text-slate-500">Tick: </span>
            <span className="font-semibold text-lime-400">#{tick}</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300">{(grid.gridFrequency ?? 50.02).toFixed(2)} Hz</span>
          </div>
        </div>
      </section>

      {/* Primary Telemetry Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Solar Power"
          value={grid.solarPower}
          decimals={2}
          unit="kW"
          change="↑ 12.4% vs diurnal peak"
          icon={<Sun size={20} />}
        />

        <StatCard
          title="Energy Today"
          value={grid.energyToday}
          decimals={1}
          unit="kWh"
          change="↑ 8.7% cumulative yield"
          icon={<Zap size={20} />}
        />

        <StatCard
          title="Grid Voltage"
          value={grid.gridVoltage}
          decimals={1}
          unit="V"
          change="Phase A nominal 230V ± 2%"
          icon={<Plug size={20} />}
        />

        <StatCard
          title="Battery State"
          value={grid.batteryPercentage}
          decimals={0}
          unit="%"
          change="BESS charging continuous"
          icon={<BatteryCharging size={20} />}
        />
      </section>

      {/* Main Charts & System Health */}
      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Dynamic Energy Generation Chart */}
        <div className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-6 shadow-xl backdrop-blur-xl xl:col-span-2 transition hover:border-slate-700/80">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-lime-400" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Diurnal Solar Generation
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Hourly MPPT power yield profile (kW)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-400 font-mono">
                Live Feed
              </span>
            </div>
          </div>

          <div className="mt-6 flex h-56 items-end gap-2 sm:gap-3.5 pt-4">
            {hourlyBars.map((height, index) => {
              const isLatest = index === hourlyBars.length - 1;
              return (
                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 hover:brightness-125 ${
                      isLatest
                        ? "bg-gradient-to-t from-lime-500 to-lime-400 shadow-md shadow-lime-400/20"
                        : "bg-gradient-to-t from-lime-500/40 to-lime-400/70 hover:from-lime-500/60 hover:to-lime-400"
                    }`}
                    style={{ height: `${height}%` }}
                    title={`Slot ${index + 1}: ${height}% output`}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/60 pt-2.5">
            <span>06:00</span>
            <span>09:00</span>
            <span>12:00 (Peak)</span>
            <span>15:00</span>
            <span>18:00</span>
          </div>
        </div>

        {/* System Health Card */}
        <div className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <ShieldCheck size={18} className="text-lime-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Substation Health
              </h2>
              <p className="text-[11px] text-slate-400">Electrical tolerance index</p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            <HealthRow
              label="Grid Interconnect"
              value={grid.systemStatus === "online" ? "STABLE / SYNC" : "ATTENTION"}
              good={grid.systemStatus === "online"}
            />

            <HealthRow
              label="Frequency Stability"
              value={`${grid.gridFrequency || 50.02} Hz`}
            />

            <HealthRow
              label="Power Factor cos(φ)"
              value={`${grid.powerFactor || 0.96}`}
            />

            <HealthRow
              label="Module Temperature"
              value={`${grid.temperature || 28.6} °C`}
            />

            <HealthRow
              label="MPPT Inverter Yield"
              value={`${grid.systemEfficiency || 91.8}%`}
              good
            />
          </div>

          <div className="mt-6 border-t border-slate-800/60 pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Overall System Integrity</span>
              <span className="text-lime-400 font-mono font-bold">96.4%</span>
            </div>

            <div className="mt-2.5 h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-400 transition-all duration-700"
                style={{ width: "96.4%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Active Fault Alerts"
          value={String(grid.activeAlertsCount ?? 2)}
          description="1 warning flagged for inspection"
          valueClass="text-amber-400"
          icon={<AlertTriangle size={18} className="text-amber-400" />}
        />

        <SummaryCard
          title="ML Inlier Confidence"
          value={`${grid.mlHealthScore || 92.4}%`}
          description="Baseline normal distribution score"
          valueClass="text-lime-400"
          icon={<Activity size={18} className="text-lime-400" />}
        />

        <SummaryCard
          title="Carbon Offset Today"
          value={`${grid.co2SavedToday || 18.6} kg`}
          description="Calculated from renewable generation"
          valueClass="text-emerald-400"
          icon={<Sparkles size={18} className="text-emerald-400" />}
        />
      </section>

      {/* Real-Time Database Stream Section (Saves every 1 second) */}
      <section className="mt-6">
        <LiveDatabaseFeed maxRows={6} isAdmin={isAdmin} />
      </section>
    </AnimatedPage>
  );
}

function HealthRow({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={`text-xs font-mono font-bold ${
          good ? "text-lime-400" : "text-slate-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  valueClass,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  valueClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-5 sm:p-6 shadow-lg backdrop-blur-xl transition hover:border-slate-700 hover:bg-[#101D32]/80">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-2xl sm:text-3xl font-bold font-mono tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] text-slate-400">{description}</p>
    </div>
  );
}
