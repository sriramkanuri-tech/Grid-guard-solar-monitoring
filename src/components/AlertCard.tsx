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
      className={`animate-item rounded-2xl border p-5 transition ${
        alert.resolved
          ? "border-slate-800/60 bg-slate-900/40 opacity-75"
          : isCritical
          ? "border-rose-500/30 bg-slate-900/90 shadow-lg shadow-rose-950/20"
          : "border-slate-800 bg-slate-900/80 hover:border-slate-700"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              alert.resolved
                ? "bg-slate-800 text-slate-400"
                : isCritical
                ? "bg-rose-500/10 text-rose-400"
                : alert.severity === "warning"
                ? "bg-orange-400/10 text-orange-400"
                : "bg-sky-400/10 text-sky-400"
            }`}
          >
            {alert.resolved ? (
              <CheckCircle2 size={20} />
            ) : isCritical ? (
              <AlertCircle size={20} />
            ) : alert.severity === "warning" ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                {alert.type}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {alert.sensor || "System"} {alert.room ? `(${alert.room})` : ""}
              </span>
            </div>

            <p className="mt-1 font-medium text-white">{alert.message}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>
                Value: <strong className="text-white">{alert.value}</strong>
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
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-lime-400 hover:border-lime-400 hover:text-slate-950"
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
