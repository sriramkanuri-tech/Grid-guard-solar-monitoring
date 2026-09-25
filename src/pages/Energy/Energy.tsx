import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import type { GridData } from "../../types/grid";
import type { TimeFilter } from "../../types/energy";

export default function Energy() {
  const [filter, setFilter] = useState<TimeFilter>("today");
  const [grid, setGrid] = useState<GridData>(gridDataService.getInitialData());

  useEffect(() => {
    const unsub = gridDataService.subscribe((data) => {
      setGrid(data);
    });
    return () => unsub();
  }, []);

  const trendData = energyService.getHistoricalTrend(filter);

  const peakPower = Math.max(...trendData.power, grid.solarPower).toFixed(2);
  const avgPower = (
    trendData.power.reduce((a, b) => a + b, 0) / trendData.power.length
  ).toFixed(2);

  return (
    <AnimatedPage>
      <PageHeader
        title="Solar Energy Performance"
        subtitle="Live PV generation yield, peak production, and inverter efficiency tracking"
        category="Energy"
        isDemo={Boolean(grid.isDemo)}
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Current Solar Power"
          value={grid.solarPower}
          decimals={2}
          unit="kW"
          change="Instantaneous PV yield"
          icon="☀️"
        />

        <StatCard
          title="Today's Energy"
          value={grid.energyToday}
          decimals={1}
          unit="kWh"
          change="Cumulative generation"
          icon="⚡"
        />

        <StatCard
          title="Peak Power"
          value={peakPower}
          decimals={2}
          unit="kW"
          change="Recorded midday peak"
          icon="📈"
        />

        <StatCard
          title="Average Power"
          value={avgPower}
          decimals={2}
          unit="kW"
          change="Sustained production"
          icon="🎯"
        />

        <StatCard
          title="System Efficiency"
          value={grid.systemEfficiency || 91.8}
          decimals={1}
          unit="%"
          change="Inverter MPPT efficiency"
          icon="✨"
        />
      </section>

      {/* Charts Grid */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Power Generation Chart */}
        <ChartCard
          title="Power Generation (kW)"
          subtitle={`Solar PV output trajectory (${filter.toUpperCase()})`}
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f)}
          badge="Live MPPT"
        >
          <div className="flex h-60 items-end gap-3 sm:gap-6 pt-6">
            {trendData.power.map((power, idx) => {
              const max = Math.max(...trendData.power, 5.5);
              const heightPercent = Math.min(100, Math.max(12, (power / max) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-xs font-semibold text-lime-400">
                    {power}
                  </span>
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-lime-400/30 to-lime-400 transition-all duration-500 hover:brightness-110"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-3 text-[11px] text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Energy Generation Chart */}
        <ChartCard
          title="Energy Generation (kWh)"
          subtitle={`Accumulated kilowatt-hours produced (${filter.toUpperCase()})`}
          badge="Cumulative"
        >
          <div className="flex h-60 items-end gap-3 sm:gap-6 pt-6">
            {trendData.energy.map((energyVal, idx) => {
              const max = Math.max(...trendData.energy, 50);
              const heightPercent = Math.min(100, Math.max(12, (energyVal / max) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-xs font-semibold text-emerald-400">
                    {energyVal}
                  </span>
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500/30 to-emerald-400 transition-all duration-500 hover:brightness-110"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-3 text-[11px] text-slate-500">
                    {trendData.labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </section>

      {/* Energy Flow & Dispatch Breakdown */}
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">Clean Energy Dispatch Breakdown</h2>
        <p className="mt-1 text-xs text-slate-500">Where generated solar power is allocated</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Direct Grid Export</span>
              <span className="text-sm font-bold text-lime-400">62%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-lime-400" style={{ width: "62%" }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Feeding the main community distribution grid</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">BESS Storage Storage</span>
              <span className="text-sm font-bold text-amber-400">26%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: "26%" }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Charging local backup batteries for night load</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Internal Parasitic & Losses</span>
              <span className="text-sm font-bold text-sky-400">12%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-sky-400" style={{ width: "12%" }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Inverter cooling, transformers, and switchgear</p>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
