import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import { gridDataService } from "../../services/gridDataService";
import { energyService } from "../../services/energyService";
import type { GridData } from "../../types/grid";
import type { TimeFilter } from "../../types/energy";
import { Sun, Zap, TrendingUp, Target, Sparkles } from "lucide-react";

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
        category="Energy Yield"
        isDemo={Boolean(grid.isDemo)}
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Current Power"
          value={grid.solarPower}
          decimals={2}
          unit="kW"
          change="Instantaneous PV yield"
          icon={<Sun size={20} />}
        />

        <StatCard
          title="Today's Yield"
          value={grid.energyToday}
          decimals={1}
          unit="kWh"
          change="Cumulative generation"
          icon={<Zap size={20} />}
        />

        <StatCard
          title="Midday Peak"
          value={peakPower}
          decimals={2}
          unit="kW"
          change="Recorded diurnal peak"
          icon={<TrendingUp size={20} />}
        />

        <StatCard
          title="Average Power"
          value={avgPower}
          decimals={2}
          unit="kW"
          change="Sustained daylight yield"
          icon={<Target size={20} />}
        />

        <StatCard
          title="MPPT Inverter"
          value={grid.systemEfficiency || 91.8}
          decimals={1}
          unit="%"
          change="Conversion efficiency"
          icon={<Sparkles size={20} />}
        />
      </section>

      {/* Charts Grid */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Power Generation Chart */}
        <ChartCard
          title="Power Trajectory (kW)"
          subtitle={`Solar PV output trajectory (${filter.toUpperCase()})`}
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f)}
          badge="Live MPPT"
        >
          <div className="flex h-60 items-end gap-2.5 sm:gap-4 pt-6">
            {trendData.power.map((power, idx) => {
              const max = Math.max(...trendData.power, 5.5);
              const heightPercent = Math.min(100, Math.max(12, (power / max) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-xs font-mono font-bold text-lime-400">
                    {power}
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

        {/* Energy Generation Chart */}
        <ChartCard
          title="Energy Yield Profile (kWh)"
          subtitle={`Accumulated kilowatt-hours produced (${filter.toUpperCase()})`}
          badge="Cumulative"
        >
          <div className="flex h-60 items-end gap-2.5 sm:gap-4 pt-6">
            {trendData.energy.map((energyVal, idx) => {
              const max = Math.max(...trendData.energy, 50);
              const heightPercent = Math.min(100, Math.max(12, (energyVal / max) * 100));
              return (
                <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-2 text-[10px] sm:text-xs font-mono font-bold text-emerald-400">
                    {energyVal}
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
      </section>

      {/* Energy Flow & Dispatch Breakdown */}
      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Clean Energy Dispatch Breakdown</h2>
        <p className="mt-0.5 text-xs text-slate-400">Allocation breakdown of generated kilowatt-hours</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3 font-mono text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300 font-sans">Direct Grid Export</span>
              <span className="font-bold text-lime-400">62%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div className="h-full rounded-full bg-lime-400" style={{ width: "62%" }} />
            </div>
            <p className="mt-3 text-[11px] text-slate-400 font-sans">Feeding community distribution feeder bus</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300 font-sans">BESS Battery Storage</span>
              <span className="font-bold text-amber-400">26%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: "26%" }} />
            </div>
            <p className="mt-3 text-[11px] text-slate-400 font-sans">Buffering for evening peak load dispatch</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300 font-sans">Switchgear &amp; Parasitic</span>
              <span className="font-bold text-sky-400">12%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div className="h-full rounded-full bg-sky-400" style={{ width: "12%" }} />
            </div>
            <p className="mt-3 text-[11px] text-slate-400 font-sans">Inverter forced cooling and transformer loss</p>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
