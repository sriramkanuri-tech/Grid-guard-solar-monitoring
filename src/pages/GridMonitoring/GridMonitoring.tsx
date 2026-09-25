import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import StatusBadge from "../../components/StatusBadge";
import LiveDatabaseFeed from "../../components/LiveDatabaseFeed";
import { gridDataService } from "../../services/gridDataService";
import { demoDataService } from "../../services/demoDataService";
import type { GridData, GridHistoryPoint } from "../../types/grid";
import { Plug, Zap, Activity, Target, ShieldCheck } from "lucide-react";

export default function GridMonitoring() {
  const [grid, setGrid] = useState<GridData>(gridDataService.getInitialData());
  const [history, setHistory] = useState<GridHistoryPoint[]>(demoDataService.getGridHistory());

  useEffect(() => {
    const unsub = gridDataService.subscribe((data) => {
      setGrid(data);
      // Append subtle recent reading
      setHistory((prev) => {
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newPoint: GridHistoryPoint = {
          time: now,
          voltage: data.gridVoltage,
          frequency: data.gridFrequency || 50.02,
          powerFactor: data.powerFactor || 0.96,
          current: data.gridCurrent || 12.4,
          status: "normal",
        };
        return [...prev.slice(1), newPoint];
      });
    });

    return () => unsub();
  }, []);

  const gridStatusText =
    grid.systemStatus === "online"
      ? "Stable"
      : grid.systemStatus === "warning"
      ? "Warning"
      : "Critical";

  return (
    <AnimatedPage>
      <PageHeader
        title="Grid Telemetry & Stability"
        subtitle="Real-time electrical parameters, frequency sync, power factor, and islanding protection"
        category="Grid Protection"
        isDemo={Boolean(grid.isDemo)}
        action={
          <StatusBadge
            status={grid.systemStatus === "online" ? "stable" : grid.systemStatus}
            label={gridStatusText}
          />
        }
      />

      {/* Primary Electrical Parameters */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Grid Voltage"
          value={grid.gridVoltage}
          decimals={1}
          unit="V"
          change="Standard: 230V ± 5%"
          icon={<Plug size={20} />}
        />

        <StatCard
          title="Grid Current"
          value={grid.gridCurrent || 12.4}
          decimals={1}
          unit="A"
          change="Balanced continuous load"
          icon={<Zap size={20} />}
        />

        <StatCard
          title="Grid Frequency"
          value={grid.gridFrequency || 50.02}
          decimals={2}
          unit="Hz"
          change="Utility sync lock 50.00 Hz"
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Power Factor"
          value={grid.powerFactor || 0.96}
          decimals={2}
          unit=""
          change="Target: > 0.95 near unity"
          icon={<Target size={20} />}
        />

        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-5 shadow-lg backdrop-blur-xl transition hover:border-lime-400/30 hover:bg-[#101D32]/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Interlock State</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                gridStatusText === "Stable"
                  ? "bg-lime-400 animate-pulse"
                  : gridStatusText === "Warning"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400 animate-pulse"
              }`}
            />
            <span
              className={`text-2xl font-bold font-mono tracking-tight ${
                gridStatusText === "Stable"
                  ? "text-lime-400"
                  : gridStatusText === "Warning"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {gridStatusText}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Anti-islanding sync locked</p>
        </div>
      </section>

      {/* History Charts */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Voltage History */}
        <ChartCard
          title="Voltage Tolerance"
          subtitle="Phase A nominal voltage variance"
          badge="V"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-2.5 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.voltage - 227) / 8) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] sm:text-[10px] text-lime-400 font-mono font-semibold">
                    {pt.voltage}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-lime-500/30 to-lime-400 transition-all duration-300 hover:brightness-125"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[8px] sm:text-[9px] font-mono text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Frequency History */}
        <ChartCard
          title="Frequency Sync"
          subtitle="Harmonic utility tracking (Hz)"
          badge="Hz"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-2.5 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.frequency - 49.9) / 0.2) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] sm:text-[10px] text-sky-400 font-mono font-semibold">
                    {pt.frequency}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-sky-500/30 to-sky-400 transition-all duration-300 hover:brightness-125"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[8px] sm:text-[9px] font-mono text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Power Factor History */}
        <ChartCard
          title="Power Factor Profile"
          subtitle="Reactive impedance compensation"
          badge="cos(φ)"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-2.5 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.powerFactor - 0.92) / 0.08) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] sm:text-[10px] text-amber-400 font-mono font-semibold">
                    {pt.powerFactor}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-amber-500/30 to-amber-400 transition-all duration-300 hover:brightness-125"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[8px] sm:text-[9px] font-mono text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </section>

      {/* Grid Protection Protection Status Table */}
      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4 mb-4">
          <ShieldCheck size={20} className="text-lime-400" />
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
              Grid Interconnection &amp; Compliance Verifications
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Compliant with IEEE 1547 and IEC 62116 anti-islanding standards
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Protection Zone</th>
                <th className="py-3 px-4">Monitored Parameter</th>
                <th className="py-3 px-4">Trip Threshold</th>
                <th className="py-3 px-4">Current Reading</th>
                <th className="py-3 px-4">Interlock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white font-sans">Over-Voltage (OVP)</td>
                <td className="py-3.5 px-4 font-sans text-slate-400">Phase-to-Neutral AC</td>
                <td className="py-3.5 px-4 text-amber-400">&gt; 253.0 V</td>
                <td className="py-3.5 px-4 text-lime-400 font-bold">{grid.gridVoltage} V</td>
                <td className="py-3.5 px-4 font-sans">
                  <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[11px] text-lime-400 font-bold">
                    Safe
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white font-sans">Under-Voltage (UVP)</td>
                <td className="py-3.5 px-4 font-sans text-slate-400">Phase-to-Neutral AC</td>
                <td className="py-3.5 px-4 text-amber-400">&lt; 195.5 V</td>
                <td className="py-3.5 px-4 text-lime-400 font-bold">{grid.gridVoltage} V</td>
                <td className="py-3.5 px-4 font-sans">
                  <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[11px] text-lime-400 font-bold">
                    Safe
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white font-sans">Over-Frequency (OFP)</td>
                <td className="py-3.5 px-4 font-sans text-slate-400">Utility Sine Frequency</td>
                <td className="py-3.5 px-4 text-amber-400">&gt; 51.50 Hz</td>
                <td className="py-3.5 px-4 text-lime-400 font-bold">{grid.gridFrequency || 50.02} Hz</td>
                <td className="py-3.5 px-4 font-sans">
                  <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[11px] text-lime-400 font-bold">
                    Locked
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white font-sans">Anti-Islanding Relay</td>
                <td className="py-3.5 px-4 font-sans text-slate-400">Active Frequency Drift</td>
                <td className="py-3.5 px-4 text-amber-400">ROCOF &gt; 1.5 Hz/s</td>
                <td className="py-3.5 px-4 text-lime-400 font-bold">0.02 Hz/s</td>
                <td className="py-3.5 px-4 font-sans">
                  <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[11px] text-lime-400 font-bold">
                    Synced
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Real-Time Database Telemetry Stream */}
      <section className="mt-8">
        <LiveDatabaseFeed maxRows={6} />
      </section>
    </AnimatedPage>
  );
}
