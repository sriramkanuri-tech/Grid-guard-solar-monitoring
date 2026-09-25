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
  valueClass = "text-white",
  className = "",
}) => {
  const numericVal = typeof value === "number" ? value : parseFloat(value);
  const isNumber = !isNaN(numericVal);

  return (
    <div
      className={`animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-slate-700 ${className}`}
    >
      <p className="text-sm text-slate-400">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${valueClass}`}>
          {isNumber ? <AnimatedNumber value={numericVal} /> : value}
        </span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>

      {percentage !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Capacity / Rating</span>
            <span className="text-lime-400 font-medium">{percentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-lime-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>
      )}

      {description && <p className="mt-3 text-xs text-slate-500">{description}</p>}
    </div>
  );
};

export default MetricCard;
