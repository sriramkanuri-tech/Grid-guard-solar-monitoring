import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import AlertCard from "../../components/AlertCard";
import StatCard from "../../components/StatCard";
import { alertService } from "../../services/alertService";
import type { Alert, AlertSeverity } from "../../types/alert";
import { Search, Filter, Plus, Bell, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | AlertSeverity | "resolved">("all");

  useEffect(() => {
    const unsub = alertService.subscribe((list) => {
      setAlerts(list);
    });
    return () => unsub();
  }, []);

  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === "critical").length;
  const warningCount = alerts.filter((a) => !a.resolved && a.severity === "warning").length;
  const resolvedCount = alerts.filter((a) => a.resolved).length;

  const handleResolve = (id: string) => {
    alertService.resolveAlert(id);
  };

  const handleCreateTestAlert = () => {
    alertService.createAlert({
      type: "voltage",
      sensor: "Inverter Chamber A",
      room: "Inverter Shed #1",
      value: 236.8,
      threshold: 235.0,
      severity: "warning",
      message: "AC voltage exceeded standard nominal ceiling (235V)",
      resolved: false,
      timestamp: new Date().toISOString(),
    });
  };

  const filteredAlerts = alerts.filter((alert) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      alert.message.toLowerCase().includes(query) ||
      (alert.sensor && alert.sensor.toLowerCase().includes(query)) ||
      (alert.room && alert.room.toLowerCase().includes(query)) ||
      alert.type.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterSeverity === "all") return true;
    if (filterSeverity === "resolved") return alert.resolved;
    return !alert.resolved && alert.severity === filterSeverity;
  });

  return (
    <AnimatedPage>
      <PageHeader
        title="Alerts & Fault Detection"
        subtitle="Automatic threshold breaches, electrical trips, and grid disturbance notifications"
        category="Fault Detection"
        action={
          <button
            onClick={handleCreateTestAlert}
            className="flex items-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-3.5 py-2 text-xs font-semibold text-lime-400 transition hover:bg-lime-500 hover:text-slate-950 active:scale-95"
          >
            <Plus size={14} />
            <span>Simulate Threshold Alert</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Incidents"
          value={totalAlerts}
          decimals={0}
          unit="Events"
          change="Logged across all nodes"
          icon={<Bell size={20} />}
        />

        <StatCard
          title="Critical Faults"
          value={criticalCount}
          decimals={0}
          unit="Active"
          change="Requires prompt trip action"
          icon={<AlertCircle size={20} className="text-red-400" />}
        />

        <StatCard
          title="Warnings"
          value={warningCount}
          decimals={0}
          unit="Active"
          change="Operating above threshold"
          icon={<AlertTriangle size={20} className="text-amber-400" />}
        />

        <StatCard
          title="Resolved"
          value={resolvedCount}
          decimals={0}
          unit="Cleared"
          change="Restored to normal limits"
          icon={<CheckCircle2 size={20} className="text-emerald-400" />}
        />
      </section>

      {/* Filter and Search Bar */}
      <section className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-4 shadow-xl backdrop-blur-xl">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search sensor, room, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2 pl-9 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
          />
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-2">
            <Filter size={13} />
            <span>Filter:</span>
          </div>

          {(["all", "critical", "warning", "resolved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterSeverity(tab)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filterSeverity === tab
                  ? "bg-lime-500 font-bold text-slate-950 shadow-xs"
                  : "border border-slate-800 bg-[#07111F]/70 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Alert Cards List */}
      <section className="mt-6 space-y-3.5">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} />
          ))
        ) : (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/40 p-12 text-center">
            <p className="text-slate-300 font-medium text-sm">No alerts match your filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">All monitored sensors are operating within nominal thresholds.</p>
          </div>
        )}
      </section>
    </AnimatedPage>
  );
}
