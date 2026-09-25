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
      className={`rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/90 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onFilterChange && activeFilter && (
            <div className="inline-flex rounded-xl border border-slate-800 bg-[#07111F]/80 p-1 text-xs">
              {(["today", "7days", "30days"] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => onFilterChange(filterKey)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    activeFilter === filterKey
                      ? "bg-lime-500 font-bold text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
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
            <span className="rounded-lg border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] font-semibold text-lime-400">
              {badge}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
};

export default ChartCard;
