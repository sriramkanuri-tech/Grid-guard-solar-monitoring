import React from "react";
import AnimatedNumber from "./AnimatedNumber";

export interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  change: string;
  icon: React.ReactNode;
  animateNumeric?: boolean;
  decimals?: number;
  className?: string;
}

export default function StatCard({
  title,
  value,
  unit,
  change,
  icon,
  animateNumeric = true,
  decimals,
  className = "",
}: StatCardProps) {
  const numericVal = typeof value === "number" ? value : parseFloat(value as string);
  const isNumber = !isNaN(numericVal);

  const calcDecimals =
    decimals !== undefined
      ? decimals
      : typeof value === "string" && value.includes(".")
      ? value.split(".")[1]?.length || 1
      : typeof value === "number" && !Number.isInteger(value)
      ? 1
      : 0;

  return (
    <div
      className={`group rounded-2xl border border-slate-800/80 bg-[#0B1628]/75 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-lime-400/30 hover:bg-[#101D32]/80 hover:shadow-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 font-mono">
              {animateNumeric && isNumber ? (
                <AnimatedNumber value={numericVal} decimals={calcDecimals} />
              ) : (
                value
              )}
            </span>

            {unit && (
              <span className="text-xs font-medium text-slate-400">{unit}</span>
            )}
          </div>

          <p className="mt-2.5 text-[11px] font-medium text-slate-400 group-hover:text-lime-400/90 transition-colors">
            {change}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#07111F] text-lg text-lime-400 transition-colors group-hover:border-lime-400/30 group-hover:bg-lime-400/10">
          {icon}
        </div>
      </div>
    </div>
  );
}