import React, { useEffect, useState } from "react";
import { Database, CheckCircle2, ArrowDownUp, RefreshCw, HardDrive, Shield } from "lucide-react";
import { databaseService, type TelemetryLogRecord } from "../services/databaseService";

interface LiveDatabaseFeedProps {
  maxRows?: number;
  isAdmin?: boolean;
}

export const LiveDatabaseFeed: React.FC<LiveDatabaseFeedProps> = ({
  maxRows = 6,
  isAdmin = false,
}) => {
  const [logs, setLogs] = useState<TelemetryLogRecord[]>([]);
  const [totalWrites, setTotalWrites] = useState<number>(0);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  useEffect(() => {
    const unsub = databaseService.subscribeToLogs((incoming) => {
      setLogs(incoming.slice(0, maxRows));
      setTotalWrites((prev) => prev + 1);
      if (incoming.length > 0) {
        setLastSavedTime(incoming[0].timestamp);
      }
    });

    return () => unsub();
  }, [maxRows]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gridguard_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Live Database Telemetry Stream
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                1s AUTO-SAVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual persistence: Firebase Firestore collection + local database cache.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <Shield size={12} />
              ADMIN AUDITOR
            </span>
          )}

          <button
            onClick={handleExportJson}
            className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 flex items-center gap-1.5"
            title="Download logged telemetry JSON"
          >
            <HardDrive size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Write Frequency
          </span>
          <p className="text-base font-bold font-mono text-lime-400 mt-0.5">1000 ms (1s)</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Current Stream Time
          </span>
          <p className="text-base font-bold font-mono text-white mt-0.5">
            {lastSavedTime || "Syncing..."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Database Status
          </span>
          <p className="text-base font-bold font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 size={14} /> CONNECTED
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Log Writes
          </span>
          <p className="text-base font-bold font-mono text-sky-400 mt-0.5">#{totalWrites}</p>
        </div>
      </div>

      {/* Table Feed */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#07111F]/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-[#0A1628]/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Solar Power</th>
              <th className="py-2.5 px-3">Grid Voltage</th>
              <th className="py-2.5 px-3">Frequency</th>
              <th className="py-2.5 px-3">Current</th>
              <th className="py-2.5 px-3">Power Factor</th>
              <th className="py-2.5 px-3 text-right">DB Storage Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                  Initializing live database records stream...
                </td>
              </tr>
            ) : (
              logs.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    idx === 0 ? "bg-lime-400/5 text-white" : "text-slate-300"
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                    {idx === 0 && <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />}
                    <span>{row.timestamp}</span>
                  </td>
                  <td className="py-2.5 px-3 text-lime-400 font-bold">
                    {row.solarPower.toFixed(2)} kW
                  </td>
                  <td className="py-2.5 px-3">{row.gridVoltage.toFixed(1)} V</td>
                  <td className="py-2.5 px-3 text-cyan-300">{row.gridFrequency.toFixed(2)} Hz</td>
                  <td className="py-2.5 px-3">{row.gridCurrent.toFixed(1)} A</td>
                  <td className="py-2.5 px-3 text-slate-400">cos(φ) {row.powerFactor.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={10} /> SAVED
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveDatabaseFeed;
