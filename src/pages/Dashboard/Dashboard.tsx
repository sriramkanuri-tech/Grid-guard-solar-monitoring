import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import StatCard from "../../components/StatCard";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import { getStoredUser, subscribeToAuth } from "../../firebase/auth";
import type { GridData } from "../../types/grid";
import type { UserProfile } from "../../types/user";

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [grid, setGrid] = useState<GridData>(gridDataService.getInitialData());
  const [hourlyBars, setHourlyBars] = useState<number[]>(energyService.getHourlyBars());

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => setUser(u));
    const unsubGrid = gridDataService.subscribe((data) => {
      setGrid(data);
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

  const firstName = user?.name ? user.name.split(" ")[0] : "User";

  return (
    <AnimatedPage>
      {/* Welcome Banner */}
      <section className="animate-item mb-8">
        <p className="text-sm text-slate-500">Good morning,</p>

        <h1 className="mt-1 text-3xl font-bold sm:text-4xl text-white">
          Welcome back,{" "}
          <span className="text-lime-400">{firstName}</span> 👋
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Monitor your solar energy and grid performance.
        </p>
      </section>

      {/* Primary Telemetry Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Solar Power"
          value={grid.solarPower}
          decimals={2}
          unit="kW"
          change="↑ 12.4% from yesterday"
          icon="☀️"
        />

        <StatCard
          title="Energy Today"
          value={grid.energyToday}
          decimals={1}
          unit="kWh"
          change="↑ 8.7% from yesterday"
          icon="⚡"
        />

        <StatCard
          title="Grid Voltage"
          value={grid.gridVoltage}
          decimals={1}
          unit="V"
          change="Within safe range"
          icon="🔌"
        />

        <StatCard
          title="Battery"
          value={grid.batteryPercentage}
          decimals={0}
          unit="%"
          change="Charging normally"
          icon="🔋"
        />
      </section>

      {/* Main Charts & System Health */}
      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Dynamic Energy Generation Chart */}
        <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 xl:col-span-2 transition hover:border-slate-700/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Energy Generation</h2>
              <p className="mt-1 text-xs text-slate-500">
                Solar production today
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-400">
                Live
              </span>
            </div>
          </div>

          <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">
            {hourlyBars.map((height, index) => {
              const isLatest = index === hourlyBars.length - 1;
              return (
                <div key={index} className="flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isLatest
                        ? "bg-lime-400 shadow-md shadow-lime-400/20"
                        : "bg-lime-400/70 hover:bg-lime-400"
                    }`}
                    style={{ height: `${height}%` }}
                    title={`Slot ${index + 1}: ${height}% capacity`}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between text-[10px] text-slate-600">
            <span>6 AM</span>
            <span>9 AM</span>
            <span>12 PM</span>
            <span>3 PM</span>
            <span>6 PM</span>
          </div>
        </div>

        {/* System Health Card */}
        <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="font-semibold text-white">System Health</h2>
          <p className="mt-1 text-xs text-slate-500">
            Current operating condition
          </p>

          <div className="mt-6 space-y-4">
            <HealthRow
              label="Grid Status"
              value={grid.systemStatus === "online" ? "ONLINE" : "ATTENTION"}
              good={grid.systemStatus === "online"}
            />

            <HealthRow
              label="Frequency"
              value={`${grid.gridFrequency || 50.02} Hz`}
            />

            <HealthRow
              label="Power Factor"
              value={`${grid.powerFactor || 0.96}`}
            />

            <HealthRow
              label="Temperature"
              value={`${grid.temperature || 28.6} °C`}
            />

            <HealthRow
              label="Efficiency"
              value={`${grid.systemEfficiency || 91.8}%`}
              good
            />
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Overall Health</span>
              <span className="text-lime-400 font-semibold">96%</span>
            </div>

            <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-lime-400 transition-all duration-700"
                style={{ width: "96%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Active Alerts"
          value={String(grid.activeAlertsCount ?? 2)}
          description="1 warning requires attention"
          valueClass="text-orange-400"
        />

        <SummaryCard
          title="ML System Status"
          value={`${grid.mlHealthScore || 92.4}%`}
          description="Normal operation probability"
          valueClass="text-lime-400"
        />

        <SummaryCard
          title="CO₂ Saved Today"
          value={`${grid.co2SavedToday || 18.6} kg`}
          description="Through clean solar generation"
          valueClass="text-white"
        />
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
    <div className="flex justify-between border-b border-slate-800 pb-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm font-semibold ${
          good ? "text-lime-400" : "text-white"
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
}: {
  title: string;
  value: string;
  description: string;
  valueClass: string;
}) {
  return (
    <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-slate-700">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
