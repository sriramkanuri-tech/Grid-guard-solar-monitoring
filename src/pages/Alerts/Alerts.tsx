import { useEffect, useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import AlertCard from "../../components/AlertCard";
import StatCard from "../../components/StatCard";
import { alertService } from "../../services/alertService";
import type { Alert, AlertSeverity } from "../../types/alert";
import { Search, Filter, Plus } from "lucide-react";

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
    // Search match
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      alert.message.toLowerCase().includes(query) ||
      (alert.sensor && alert.sensor.toLowerCase().includes(query)) ||
      (alert.room && alert.room.toLowerCase().includes(query)) ||
      alert.type.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Filter match
    if (filterSeverity === "all") return true;
    if (filterSeverity === "resolved") return alert.resolved;
    return !alert.resolved && alert.severity === filterSeverity;
  });

  return (
    <AnimatedPage>
      <PageHeader
        title="Alerts & Fault Detection"
        subtitle="Automatic threshold breaches, electrical trips, and grid disturbance notifications"
        category="Alerts"
        action={
          <button
            onClick={handleCreateTestAlert}
            className="flex items-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-3.5 py-1.5 text-xs font-semibold text-lime-400 transition hover:bg-lime-400 hover:text-slate-950"
          >
            <Plus size={14} />
            Simulate Threshold Alert
          </button>
        }
      />

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Alerts"
          value={totalAlerts}
          decimals={0}
          unit="Records"
          change="Logged across all nodes"
          icon="🚨"
        />

        <StatCard
          title="Critical"
          value={criticalCount}
          decimals={0}
          unit="Active"
          change="Immediate action required"
          icon="🛑"
        />

        <StatCard
          title="Warnings"
          value={warningCount}
          decimals={0}
          unit="Active"
          change="Operating above threshold"
          icon="⚠️"
        />

        <StatCard
          title="Resolved"
          value={resolvedCount}
          decimals={0}
          unit="Cleared"
          change="Restored to normal limits"
          icon="✅"
        />
      </section>

      {/* Filter and Search Bar */}
      <section className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by sensor, room, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-lime-400"
          />
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-2">
            <Filter size={14} />
            <span>Filter:</span>
          </div>

          {(["all", "critical", "warning", "resolved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterSeverity(tab)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filterSeverity === tab
                  ? "bg-lime-400 font-semibold text-slate-950"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Alert Cards List */}
      <section className="mt-6 space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} />
          ))
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <p className="text-slate-400 text-sm">No alerts match your filter criteria.</p>
            <p className="text-xs text-slate-600 mt-1">All monitored sensors are operating normally.</p>
          </div>
        )}
      </section>
    </AnimatedPage>
  );
}
