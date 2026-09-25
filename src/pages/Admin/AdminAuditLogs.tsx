import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  Clock,
  ChevronDown,
  Info,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { rtdbService, type AuditLogEntry } from "../../firebase/database";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => {
    const cached = localStorage.getItem("gridguard_cache_audit");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = localStorage.getItem("gridguard_cache_audit");
    return !cached;
  });
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    const unsub = rtdbService.subscribeToAuditLogs((entries) => {
      setLogs(entries);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const uniqueActions = ["ALL", ...Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))];

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.actorEmail || "").toLowerCase().includes(q) ||
      (log.target && log.target.toLowerCase().includes(q)) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(q));
    return matchesAction && matchesSearch;
  });

  const exportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Action", "Actor Email", "Target", "Metadata"];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.actorEmail}"`,
      `"${l.target || "N/A"}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gridguard_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("REVOKE") || action.includes("CRITICAL")) {
      return "bg-rose-500/15 border-rose-500/30 text-rose-400";
    }
    if (action.includes("CREATE") || action.includes("REGISTER") || action.includes("PROVISION")) {
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
    }
    if (action.includes("EMAIL") || action.includes("DISPATCH") || action.includes("TELEGRAM")) {
      return "bg-sky-500/15 border-sky-500/30 text-sky-400";
    }
    if (action.includes("UPDATE") || action.includes("ACKNOWLEDGE")) {
      return "bg-amber-500/15 border-amber-500/30 text-amber-400";
    }
    return "bg-slate-800 border-slate-700 text-slate-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              IMMUTABLE AUDIT TRAIL
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            System & Security Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time chronological ledger of all operator actions, access modifications, and automated security triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-white hover:border-slate-500 hover:bg-slate-850 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <Download size={14} className="text-amber-400" />
            <span>Export CSV ({filteredLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by action, operator email, target resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-[#070F1E]/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-[#070F1E]/90 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
          >
            {uniqueActions.map((act) => (
              <option key={act} value={act} className="bg-slate-900 text-white">
                {act === "ALL" ? "All Action Types" : act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-slate-950/60 font-mono uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                <th className="px-5 py-3.5 font-semibold">Action</th>
                <th className="px-5 py-3.5 font-semibold">Operator / Actor</th>
                <th className="px-5 py-3.5 font-semibold">Target Resource</th>
                <th className="px-5 py-3.5 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                    Synchronizing audit ledger with Firebase RTDB...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-block border px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wide ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-500 shrink-0" />
                        <span className="font-mono text-xs text-white">{log.actorEmail}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-slate-300 font-mono text-xs">
                      {log.target || "N/A"}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:border-amber-400 hover:text-amber-300 transition"
                        >
                          View Meta
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#070F1E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Action</span>
                  <p className="font-bold text-white mt-0.5">{selectedLog.action}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Resource</span>
                  <p className="font-mono text-slate-300 mt-0.5">{selectedLog.target || "N/A"}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-900">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Operator</span>
                  <p className="font-mono text-slate-300 mt-0.5">{selectedLog.actorEmail}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Timestamp</span>
                  <p className="font-mono text-slate-300 mt-0.5">
                    {new Date(selectedLog.timestamp).toISOString()}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-mono text-[11px] font-semibold">
                  Payload Metadata (JSON)
                </span>
                <pre className="mt-1.5 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
