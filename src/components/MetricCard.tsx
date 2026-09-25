import React from "react";
import AnimatedNumber from "./AnimatedNumber";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  percentage?: number;
  highlight?: boolean;
  valueClass?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  description,
  percentage,
  valueClass = "text-slate-50",
  className = "",
}) => {
  const numericVal = typeof value === "number" ? value : parseFloat(value);
  const isNumber = !isNaN(numericVal);

  return (
    <div
      className={`group rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-5 sm:p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-lime-400/30 hover:bg-[#101D32]/80 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${valueClass}`}>
          {isNumber ? <AnimatedNumber value={numericVal} /> : value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {percentage !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Operating Capacity</span>
            <span className="text-lime-400 font-mono font-semibold">{percentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>
      )}

      {description && (
        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
};

export default MetricCard;
