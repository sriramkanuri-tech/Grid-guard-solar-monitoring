import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import type { GridData } from "../../types/grid";
import type { TimeFilter } from "../../types/energy";
import { Sun, Zap, Plug, BatteryCharging } from "lucide-react";

export default function Analytics() {
  const [filter, setFilter] = useState<TimeFilter>("today");
  const [grid, setGrid] = useState<GridData>(gridDataService.getInitialData());

  useEffect(() => {
    const unsub = gridDataService.subscribe((data) => {
      setGrid(data);
    });
    return () => unsub();
  }, []);

  const trendData = energyService.getHistoricalTrend(filter);

  const avgPower = (
    trendData.power.reduce((a, b) => a + b, 0) / trendData.power.length
  ).toFixed(2);

  const totalEnergy = (
    filter === "today"
      ? grid.energyToday
      : trendData.energy.reduce((a, b) => a + b, 0)
  ).toFixed(1);

  const avgVoltage = (
    trendData.voltage.reduce((a, b) => a + b, 0) / trendData.voltage.length
  ).toFixed(1);

  const avgBattery = Math.round(
    trendData.battery.reduce((a, b) => a + b, 0) / trendData.battery.length
  );

  return (
    <AnimatedPage>
      <PageHeader
        title="Energy & Grid Analytics"
        subtitle="Historical generation trends, voltage stability, and battery charge cycles"
        category="Analytics"
        isDemo={Boolean(grid.isDemo)}
      />

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Average Solar Power"
          value={avgPower}
          decimals={2}
          unit="kW"
          change="Average daylight output"
          icon={<Sun size={20} />}
        />

        <StatCard
          title="Total Energy"
          value={totalEnergy}
          decimals={1}
          unit="kWh"
          change={filter === "today" ? "Generated today" : `Total over ${filter}`}
          icon={<Zap size={20} />}
        />

        <StatCard
          title="Average Grid Voltage"
          value={avgVoltage}
          decimals={1}
          unit="V"
          change="Standard nominal range 230V"
          icon={<Plug size={20} />}
        />

        <StatCard
          title="Average Battery SoC"
          value={avgBattery}
          decimals={0}
          unit="%"
          change="Cell health index 98%"
          icon={<BatteryCharging size={20} />}
        />
      </section>

      {/* Main Charts Section */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Power & Energy Trend */}
        <ChartCard
          title="Solar Power Profile"
          subtitle={`Solar generation curve (${filter.toUpperCase()})`}
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f)}
          badge="kW"
        >
          <div className="flex h-56 items-end gap-2.5 sm:gap-4 pt-4">
            {trendData.power.map((val, idx) => {
              const maxVal = Math.max(...trendData.power) * 1.15 || 5.5;
              const heightPercent = Math.min(100, Math.max(10, (val / maxVal) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-[11px] font-mono font-bold text-lime-400">
                    {val}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-lime-500/30 to-lime-400 transition-all duration-500 hover:brightness-125"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-2 text-[10px] font-mono text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Energy Generation Cumulative Overview */}
        <ChartCard
          title="Cumulative Energy Yield"
          subtitle={`Total electrical output accumulated (${filter.toUpperCase()})`}
          badge="kWh"
        >
          <div className="flex h-56 items-end gap-2.5 sm:gap-4 pt-4">
            {trendData.energy.map((val, idx) => {
              const maxVal = Math.max(...trendData.energy) * 1.15 || 50;
              const heightPercent = Math.min(100, Math.max(10, (val / maxVal) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-[11px] font-mono font-bold text-emerald-400">
                    {val}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/30 to-emerald-400 transition-all duration-500 hover:brightness-125"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-2 text-[10px] font-mono text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Grid Voltage Trend */}
        <ChartCard
          title="Grid Voltage Stability Range"
          subtitle="Phase A nominal voltage tolerance curve"
          badge="220-240V Safe"
        >
          <div className="flex h-52 items-end gap-2.5 sm:gap-4 pt-4">
            {trendData.voltage.map((val, idx) => {
              const heightPercent = ((val - 225) / 12) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-[11px] font-mono font-bold text-sky-400">
                    {val}V
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-sky-500/30 to-sky-400 transition-all duration-500 hover:brightness-125"
                    style={{ height: `${Math.min(95, Math.max(20, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[10px] font-mono text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Battery State Trend */}
        <ChartCard
          title="BESS Storage Charge Curve"
          subtitle="Lithium battery bank state of charge (SoC)"
          badge="Optimal"
        >
          <div className="flex h-52 items-end gap-2.5 sm:gap-4 pt-4">
            {trendData.battery.map((val, idx) => {
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-[11px] font-mono font-bold text-amber-400">
                    {val}%
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-amber-500/30 to-amber-400 transition-all duration-500 hover:brightness-125"
                    style={{ height: `${val}%` }}
                  />
                  <span className="mt-2 text-[10px] font-mono text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </section>
    </AnimatedPage>
  );
}
