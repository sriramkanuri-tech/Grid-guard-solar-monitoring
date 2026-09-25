import React from "react";
import type { Alert } from "../types/alert";
import StatusBadge from "./StatusBadge";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface AlertCardProps {
  alert: Alert;
  onResolve?: (id: string) => void;
  className?: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onResolve, className = "" }) => {
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={`group rounded-2xl border p-4 sm:p-5 shadow-lg backdrop-blur-xl transition-all duration-200 ${
        alert.resolved
          ? "border-slate-800/60 bg-[#07111F]/50 opacity-70"
          : isCritical
          ? "border-red-500/40 bg-red-950/20 shadow-red-950/20"
          : "border-slate-800/80 bg-[#0B1628]/80 hover:border-slate-700"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              alert.resolved
                ? "border-slate-800 bg-slate-800/60 text-slate-400"
                : isCritical
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : alert.severity === "warning"
                ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                : "border-sky-400/40 bg-sky-400/10 text-sky-400"
            }`}
          >
            {alert.resolved ? (
              <CheckCircle2 size={18} />
            ) : isCritical ? (
              <AlertCircle size={18} />
            ) : alert.severity === "warning" ? (
              <AlertTriangle size={18} />
            ) : (
              <Info size={18} />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {alert.type}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {alert.sensor || "Telemetry Sensor"} {alert.room ? `(${alert.room})` : ""}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-white tracking-tight">{alert.message}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              <span>
                Value: <strong className="text-slate-100">{alert.value}</strong>
              </span>
              <span>
                Threshold: <strong className="text-slate-300">{alert.threshold}</strong>
              </span>
              <span>
                Time:{" "}
                {typeof alert.timestamp === "string"
                  ? new Date(alert.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recent"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:self-center">
          <StatusBadge
            status={alert.resolved ? "normal" : alert.severity}
            label={alert.resolved ? "Resolved" : alert.severity}
            pulse={!alert.resolved && isCritical}
          />

          {!alert.resolved && onResolve && (
            <button
              onClick={() => onResolve(alert.id)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-lime-500 hover:border-lime-500 hover:text-slate-950 active:scale-95"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
