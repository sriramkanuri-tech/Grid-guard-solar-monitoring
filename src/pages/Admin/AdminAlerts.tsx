import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Send,
  Filter,
  Plus,
  X,
  Radio,
  Clock,
  ExternalLink,
} from "lucide-react";
import { alertService } from "../../services/alertService";
import { getStoredUser } from "../../firebase/auth";
import type { Alert, AlertSeverity } from "../../types/alert";

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Alert State
  const [nodeId, setNodeId] = useState("GG-NODE-01");
  const [type, setType] = useState("voltage");
  const [severity, setSeverity] = useState<AlertSeverity>("CRITICAL");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [msgNotice, setMsgNotice] = useState("");

  const user = getStoredUser();

  useEffect(() => {
    const unsub = alertService.subscribe((list) => setAlerts(list));
    return () => unsub();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    await alertService.acknowledgeAlert(alertId, user?.email || "admin@gridguard.io");
  };

  const handleResolve = async (alertId: string) => {
    await alertService.resolveAlert(alertId);
  };

  const handleCreateAlert = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsgNotice("");

    try {
      await alertService.createAlert({
        nodeId,
        type,
        severity,
        message,
        value: 254.2,
        threshold: 245.0,
        resolved: false,
        status: "OPEN",
        acknowledged: false,
        timestamp: new Date().toISOString(),
      });

      setMsgNotice("Alert registered in Firebase RTDB and dispatched to Telegram service!");
      setTimeout(() => {
        setShowAddModal(false);
        setMessage("");
        setMsgNotice("");
      }, 1500);
    } catch (err: unknown) {
      setMsgNotice("Failed registering alert.");
    } finally {
      setCreating(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const sev = String(a.severity).toUpperCase();
    const matchSev = filterSeverity === "ALL" || sev === filterSeverity;
    const isResolved = Boolean(a.resolved);
    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "OPEN" && !isResolved && !a.acknowledged) ||
      (filterStatus === "ACKNOWLEDGED" && !isResolved && a.acknowledged) ||
      (filterStatus === "RESOLVED" && isResolved);
    return matchSev && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="text-amber-400" />
            Alerts &amp; Safety Control Room
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Acknowledge electrical interlocks, manage trip conditions, and trigger emergency Telegram notices.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 active:scale-95"
        >
          <Plus size={15} />
          <span>Dispatch System Alert</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-xl border border-slate-800 bg-[#0B1628]/80 py-2.5 px-3.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">CRITICAL Only</option>
          <option value="WARNING">WARNING Only</option>
          <option value="INFO">INFO Only</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-800 bg-[#0B1628]/80 py-2.5 px-3.5 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="ALL">All States</option>
          <option value="OPEN">Open Unacknowledged</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved Only</option>
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-8 text-center text-xs text-slate-500">
            No alerts found matching the active filters.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = String(alert.severity).toUpperCase() === "CRITICAL";
            const isResolved = Boolean(alert.resolved);

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 shadow-lg backdrop-blur-xl transition ${
                  isResolved
                    ? "border-slate-800/80 bg-[#07111F]/60 opacity-75"
                    : isCritical
                    ? "border-red-500/40 bg-red-950/20"
                    : "border-amber-500/30 bg-amber-950/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl border mt-0.5 ${
                        isResolved
                          ? "bg-slate-800 border-slate-700 text-slate-400"
                          : isCritical
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      <AlertTriangle size={18} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                            isCritical ? "bg-red-500 text-slate-950" : "bg-amber-400 text-slate-950"
                          }`}
                        >
                          {String(alert.severity).toUpperCase()}
                        </span>
                        <span className="font-mono text-[11px] text-amber-300 font-bold">
                          {alert.nodeId || "GG-NODE-01"}
                        </span>
                        <span className="text-[11px] text-slate-500 uppercase font-mono">
                          • {alert.type}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm font-semibold text-white">{alert.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400 font-mono">
                        Logged: {new Date(String(alert.timestamp)).toLocaleString()}
                        {alert.acknowledged && (
                          <span className="text-emerald-400 ml-2">
                            • Acknowledged by {alert.acknowledgedBy}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center font-sans">
                    {!isResolved && !alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition active:scale-95"
                      >
                        Acknowledge
                      </button>
                    )}

                    {!isResolved ? (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <CheckCircle2 size={13} />
                        <span>Resolve</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD ALERT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0B1628] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={18} />
                <h3 className="text-lg font-bold text-white">Dispatch New System Alert</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Node ID
                  </label>
                  <input
                    type="text"
                    required
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL (Sends Telegram)</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alert Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="voltage">Over/Under Voltage Fault</option>
                  <option value="temperature">Inverter Overheating</option>
                  <option value="frequency">Anti-Islanding Frequency Drift</option>
                  <option value="ml">Isolation Forest Anomaly</option>
                  <option value="communication">Telemetry Link Loss</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alert Description / Message *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Inverter Phase A voltage exceeded 253V threshold. Protective disconnection initiated."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {msgNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {msgNotice}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-md shadow-amber-400/20 disabled:opacity-50"
                >
                  {creating ? "Dispatching..." : "Dispatch Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
