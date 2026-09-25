import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import StatusBadge from "../../components/StatusBadge";
import { gridDataService } from "../../services/gridDataService";
import { demoDataService } from "../../services/demoDataService";
import type { GridData, GridHistoryPoint } from "../../types/grid";

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
        category="Grid Monitoring"
        isDemo={Boolean(grid.isDemo)}
        action={<StatusBadge status={grid.systemStatus === "online" ? "stable" : grid.systemStatus} label={gridStatusText} />}
      />

      {/* Primary Electrical Parameters */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Grid Voltage"
          value={grid.gridVoltage}
          decimals={1}
          unit="V"
          change="Standard: 230V ± 5%"
          icon="🔌"
        />

        <StatCard
          title="Grid Current"
          value={grid.gridCurrent || 12.4}
          decimals={1}
          unit="A"
          change="Balanced continuous draw"
          icon="⚡"
        />

        <StatCard
          title="Grid Frequency"
          value={grid.gridFrequency || 50.02}
          decimals={2}
          unit="Hz"
          change="Nominal: 50.00 Hz"
          icon="〰️"
        />

        <StatCard
          title="Power Factor"
          value={grid.powerFactor || 0.96}
          decimals={2}
          unit=""
          change="Near unity (target > 0.95)"
          icon="🎯"
        />

        <div className="stat-card animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-lime-400/30">
          <p className="text-sm text-slate-400">Grid Status</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                gridStatusText === "Stable"
                  ? "bg-lime-400 animate-pulse"
                  : gridStatusText === "Warning"
                  ? "bg-orange-400 animate-pulse"
                  : "bg-rose-500 animate-pulse"
              }`}
            />
            <span
              className={`text-2xl font-bold ${
                gridStatusText === "Stable"
                  ? "text-lime-400"
                  : gridStatusText === "Warning"
                  ? "text-orange-400"
                  : "text-rose-400"
              }`}
            >
              {gridStatusText}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Anti-islanding sync locked</p>
        </div>
      </section>

      {/* History Charts */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Voltage History */}
        <ChartCard
          title="Voltage History"
          subtitle="Phase A nominal voltage tolerance"
          badge="V"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-3 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.voltage - 227) / 8) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] text-lime-400 font-semibold">
                    {pt.voltage}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-lime-400/80 transition-all duration-300 hover:bg-lime-400"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[9px] text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Frequency History */}
        <ChartCard
          title="Frequency History"
          subtitle="Microgrid synchronization tracking"
          badge="Hz"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-3 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.frequency - 49.9) / 0.2) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] text-sky-400 font-semibold">
                    {pt.frequency}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-sky-400/80 transition-all duration-300 hover:bg-sky-400"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[9px] text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Power Factor History */}
        <ChartCard
          title="Power Factor History"
          subtitle="Reactive impedance compensation"
          badge="cos(φ)"
        >
          <div className="flex h-48 items-end gap-2 sm:gap-3 pt-4">
            {history.map((pt, idx) => {
              const heightPercent = ((pt.powerFactor - 0.92) / 0.08) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] text-amber-400 font-semibold">
                    {pt.powerFactor}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-amber-400/80 transition-all duration-300 hover:bg-amber-400"
                    style={{ height: `${Math.min(95, Math.max(15, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[9px] text-slate-500">{pt.time}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </section>

      {/* Grid Protection Protection Status Table */}
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">Grid Interconnection & Safety Checks</h2>
        <p className="mt-1 text-xs text-slate-500">Compliance with IEEE 1547 / IEC 62116 standard grid interconnection</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Protection Zone</th>
                <th className="py-3 px-4">Monitored Parameter</th>
                <th className="py-3 px-4">Trip Threshold</th>
                <th className="py-3 px-4">Current Reading</th>
                <th className="py-3 px-4">Interlock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              <tr>
                <td className="py-3.5 px-4 font-medium text-white">Over-Voltage (OVP)</td>
                <td className="py-3.5 px-4">Phase-to-Neutral AC</td>
                <td className="py-3.5 px-4">&gt; 253.0 V</td>
                <td className="py-3.5 px-4 text-lime-400">{grid.gridVoltage} V</td>
                <td className="py-3.5 px-4"><span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-lime-400 font-medium">Safe</span></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-white">Under-Voltage (UVP)</td>
                <td className="py-3.5 px-4">Phase-to-Neutral AC</td>
                <td className="py-3.5 px-4">&lt; 195.5 V</td>
                <td className="py-3.5 px-4 text-lime-400">{grid.gridVoltage} V</td>
                <td className="py-3.5 px-4"><span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-lime-400 font-medium">Safe</span></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-white">Over-Frequency (OFP)</td>
                <td className="py-3.5 px-4">Utility Sine Frequency</td>
                <td className="py-3.5 px-4">&gt; 51.50 Hz</td>
                <td className="py-3.5 px-4 text-lime-400">{grid.gridFrequency || 50.02} Hz</td>
                <td className="py-3.5 px-4"><span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-lime-400 font-medium">Locked</span></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-white">Anti-Islanding Relay</td>
                <td className="py-3.5 px-4">Active Frequency Drift</td>
                <td className="py-3.5 px-4">ROCOF &gt; 1.5 Hz/s</td>
                <td className="py-3.5 px-4 text-lime-400">0.02 Hz/s</td>
                <td className="py-3.5 px-4"><span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-lime-400 font-medium">Synced</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedPage>
  );
}
