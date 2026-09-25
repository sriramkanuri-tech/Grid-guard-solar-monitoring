import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  activeFilter?: "today" | "7days" | "30days";
  onFilterChange?: (filter: "today" | "7days" | "30days") => void;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge = "Live",
  activeFilter,
  onFilterChange,
  children,
  className = "",
}) => {
  return (
    <div
      className={`chart-card animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-slate-700/80 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-white text-lg">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {onFilterChange && activeFilter && (
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs">
              {(["today", "7days", "30days"] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => onFilterChange(filterKey)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    activeFilter === filterKey
                      ? "bg-lime-400 font-semibold text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filterKey === "today"
                    ? "Today"
                    : filterKey === "7days"
                    ? "7 Days"
                    : "30 Days"}
                </button>
              ))}
            </div>
          )}

          {badge && (
            <span className="rounded-lg bg-lime-400/10 px-3 py-1.5 text-xs text-lime-400 font-medium">
              {badge}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
};

export default ChartCard;
