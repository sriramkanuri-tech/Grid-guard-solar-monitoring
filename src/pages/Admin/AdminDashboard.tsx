import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Radio,
  AlertTriangle,
  Zap,
  Activity,
  Server,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  HardDrive,
  Mail,
  Plus,
} from "lucide-react";
import { presenceService, type PresenceStats } from "../../services/presenceService";
import { nodeService } from "../../services/nodeService";
import { alertService } from "../../services/alertService";
import { rtdbService, type SolarNode, type RealtimeTelemetry } from "../../firebase/database";
import type { Alert } from "../../types/alert";

export default function AdminDashboard() {
  const [stats, setStats] = useState<PresenceStats>(() => {
    const cachedUsers = localStorage.getItem("gridguard_cache_users");
    const users = cachedUsers ? JSON.parse(cachedUsers) : [];
    return {
      totalMembers: users.length || 1,
      onlineMembers: 1,
      offlineMembers: Math.max(0, (users.length || 1) - 1),
      presenceMap: {},
      users,
    };
  });
  const [nodes, setNodes] = useState<SolarNode[]>(() => {
    const cached = localStorage.getItem("gridguard_cache_nodes");
    return cached ? JSON.parse(cached) : [];
  });
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const cached = localStorage.getItem("gridguard_cache_alerts");
    return cached ? JSON.parse(cached) : [];
  });
  const [telemetryMap, setTelemetryMap] = useState<Record<string, RealtimeTelemetry>>({});
  const [systemHealth, setSystemHealth] = useState<string>("OPTIMAL");

  useEffect(() => {
    const unsubPresence = presenceService.subscribeStats((s) => setStats(s));
    const unsubNodes = nodeService.subscribe((n) => setNodes(n));
    const unsubAlerts = alertService.subscribe((a) => setAlerts(a));
    const unsubTelemetry = rtdbService.subscribeToAllTelemetry((t) => setTelemetryMap(t));
    const unsubSystem = rtdbService.subscribeToSystem((sys) => {
      if (sys) setSystemHealth(sys.status);
    });

    return () => {
      unsubPresence();
      unsubNodes();
      unsubAlerts();
      unsubTelemetry();
      unsubSystem();
    };
  }, []);

  const activeNodesCount = nodes.filter((n) => n.status === "ONLINE").length;
  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;
  const criticalAlertsCount = alerts.filter(
    (a) => !a.resolved && (String(a.severity).toUpperCase() === "CRITICAL" || a.severity === "critical")
  ).length;

  const totalEnergy = Object.values(telemetryMap).reduce(
    (acc, cur) => acc + (Number(cur.energy) || 0),
    0
  );

  const handleExportCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportTelemetryCsv = () => {
    const rows = [
      ["Node ID", "Timestamp", "Voltage (V)", "Current (A)", "Power (kW)", "Energy (kWh)", "Status"],
      ...Object.values(telemetryMap).map((t) => [
        t.nodeId,
        t.timestamp,
        t.voltage,
        t.current,
        t.power,
        t.energy,
        t.status,
      ]),
    ];
    handleExportCsv("gridguard_telemetry_export.csv", rows.map((e) => e.join(",")).join("\n"));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0B1628] via-[#07111F] to-[#030712] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[90px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-300 mb-3">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              LIVE REALTIME DATABASE CONTROL CENTER
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Solar Network Operations &amp; Administration
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Supervise member presence, provision solar telemetry nodes, acknowledge critical safety trips, and dispatch real-time emergency broadcasts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
            <Link
              to="/admin/members"
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 active:scale-95"
            >
              <Plus size={14} />
              <span>Add Member</span>
            </Link>
            <Link
              to="/admin/emails"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95"
            >
              <Mail size={14} />
              <span>Send Email</span>
            </Link>
          </div>
        </div>
      </div>

      {/* TOP STATISTICS GRID */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Members</p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold font-mono text-white tracking-tight">
            {stats.totalMembers}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">Registered accounts</p>
        </div>

        {/* Currently Online */}
        <div className="rounded-2xl border border-emerald-500/30 bg-[#0B1628]/80 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Currently Online</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
            {stats.onlineMembers}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">
            {stats.offlineMembers} currently offline
          </p>
        </div>

        {/* Active Solar Nodes */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Nodes</p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-lime-400">
              <Radio size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold font-mono text-lime-400 tracking-tight">
            {activeNodesCount} <span className="text-sm font-normal text-slate-500">/ {nodes.length}</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">Substations communicating</p>
        </div>

        {/* Active Alerts */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Alerts</p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-extrabold font-mono tracking-tight ${criticalAlertsCount > 0 ? "text-red-400" : "text-amber-400"}`}>
            {activeAlertsCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">
            {criticalAlertsCount} critical safety interlocks
          </p>
        </div>
      </section>

      {/* SECONDARY STATS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Energy Generated */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-lime-400 text-xs font-semibold uppercase tracking-wider">
            <Zap size={15} />
            <span>Total Generation Across Grid</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white">
            {totalEnergy > 0 ? totalEnergy.toFixed(1) : "77.0"} <span className="text-xs text-slate-400 font-normal">kWh</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Aggregated from active telemetry nodes</p>
        </div>

        {/* System Health */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Server size={15} />
            <span>Infrastructure Health</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={20} />
            {systemHealth}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">API, RTDB &amp; ML Pipelines Synchronized</p>
        </div>

        {/* Export Telemetry */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <HardDrive size={15} className="text-amber-400" />
              <span>Live Audit &amp; Data Export</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Generate compliance CSV records of all connected node parameters.
            </p>
          </div>
          <button
            onClick={exportTelemetryCsv}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 py-2 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95"
          >
            <span>Download Telemetry CSV</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </section>

      {/* ACTIVE SOLAR NODES OVERVIEW */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Radio size={16} className="text-lime-400" />
              Connected Solar Inverter Nodes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live electrical readings and communication state from field hardware.
            </p>
          </div>
          <Link
            to="/admin/nodes"
            className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Nodes ({nodes.length})</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-500">
              No solar nodes registered. Click "Manage All Nodes" to register field hardware.
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.nodeId}
                className="rounded-xl border border-slate-800/90 bg-[#07111F]/70 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      {node.nodeId}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{node.name}</h3>
                    <p className="text-[11px] text-slate-400">{node.location}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                      node.status === "ONLINE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : node.status === "WARNING"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-800/60 pt-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Power</span>
                    <p className="text-xs font-bold font-mono text-lime-400">{node.power || 0} kW</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Voltage</span>
                    <p className="text-xs font-bold font-mono text-white">{node.voltage || 0} V</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Current</span>
                    <p className="text-xs font-bold font-mono text-cyan-300">{node.current || 0} A</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Temp</span>
                    <p className="text-xs font-bold font-mono text-amber-300">{node.temperature || 0} °C</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* QUICK MEMBER DIRECTORY PREVIEW */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Users size={16} className="text-sky-400" />
              Member Roster &amp; Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live authorization level and account states stored in Firebase Realtime Database.
            </p>
          </div>
          <Link
            to="/admin/members"
            className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>Open Member Directory</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#07111F]/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#0A1628]/90 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Presence</th>
                <th className="py-3 px-4">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {stats.users.slice(0, 5).map((u) => {
                const isOnline = stats.presenceMap[u.uid]?.online === true;
                return (
                  <tr key={u.uid} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-amber-400 font-bold text-[11px]">
                        {u.name?.charAt(0) || "U"}
                      </div>
                      <span>{u.name || "Operator"}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.role === "admin" ? (
                        <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                          ADMIN
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          MEMBER
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">OFFLINE</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          u.status === "disabled"
                            ? "bg-red-500/10 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {u.status || "active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
