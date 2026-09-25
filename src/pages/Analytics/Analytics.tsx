import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import type { GridData } from "../../types/grid";
import type { TimeFilter } from "../../types/energy";

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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Average Solar Power"
          value={avgPower}
          decimals={2}
          unit="kW"
          change="Average peak daylight hours"
          icon="☀️"
        />

        <StatCard
          title="Total Energy"
          value={totalEnergy}
          decimals={1}
          unit="kWh"
          change={filter === "today" ? "Generated today" : `Total over ${filter}`}
          icon="⚡"
        />

        <StatCard
          title="Average Grid Voltage"
          value={avgVoltage}
          decimals={1}
          unit="V"
          change="Standard nominal range 230V"
          icon="🔌"
        />

        <StatCard
          title="Average Battery Level"
          value={avgBattery}
          decimals={0}
          unit="%"
          change="Health score 98%"
          icon="🔋"
        />
      </section>

      {/* Main Charts Section */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Power & Energy Trend */}
        <ChartCard
          title="Solar Power Trend"
          subtitle={`Solar output profile (${filter.toUpperCase()})`}
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f)}
          badge="kW"
        >
          <div className="flex h-56 items-end gap-3 sm:gap-6 pt-4">
            {trendData.power.map((val, idx) => {
              const maxVal = Math.max(...trendData.power) * 1.15 || 5.5;
              const heightPercent = Math.min(100, Math.max(10, (val / maxVal) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[11px] font-medium text-lime-400">
                    {val}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-lime-400/80 transition-all duration-500 hover:bg-lime-400"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-2 text-[10px] text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Energy Generation Cumulative Overview */}
        <ChartCard
          title="Energy Yield Overview"
          subtitle={`Cumulative energy generated (${filter.toUpperCase()})`}
          badge="kWh"
        >
          <div className="flex h-56 items-end gap-3 sm:gap-6 pt-4">
            {trendData.energy.map((val, idx) => {
              const maxVal = Math.max(...trendData.energy) * 1.15 || 50;
              const heightPercent = Math.min(100, Math.max(10, (val / maxVal) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[11px] font-medium text-emerald-400">
                    {val}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-emerald-500/70 transition-all duration-500 hover:bg-emerald-400"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-2 text-[10px] text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Grid Voltage Trend */}
        <ChartCard
          title="Grid Voltage Stability"
          subtitle="Phase A nominal voltage tolerance curve"
          badge="Safe (220-240V)"
        >
          <div className="flex h-52 items-end gap-3 sm:gap-6 pt-4">
            {trendData.voltage.map((val, idx) => {
              // Voltage relative to base 225V up to 235V
              const heightPercent = ((val - 225) / 12) * 100;
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[11px] font-medium text-sky-400">
                    {val}V
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-sky-500/60 transition-all duration-500 hover:bg-sky-400"
                    style={{ height: `${Math.min(95, Math.max(20, heightPercent))}%` }}
                  />
                  <span className="mt-2 text-[10px] text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Battery State Trend */}
        <ChartCard
          title="Battery Storage Trend"
          subtitle="Lithium BESS state of charge (SoC)"
          badge="Optimal"
        >
          <div className="flex h-52 items-end gap-3 sm:gap-6 pt-4">
            {trendData.battery.map((val, idx) => {
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[11px] font-medium text-amber-400">
                    {val}%
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-amber-400/70 transition-all duration-500 hover:bg-amber-400"
                    style={{ height: `${val}%` }}
                  />
                  <span className="mt-2 text-[10px] text-slate-500">
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
