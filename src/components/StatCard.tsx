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
      className={`stat-card animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-lime-400/30 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {animateNumeric && isNumber ? (
                <AnimatedNumber value={numericVal} decimals={calcDecimals} />
              ) : (
                value
              )}
            </span>

            <span className="text-sm text-slate-500">{unit}</span>
          </div>

          <p className="mt-3 text-xs text-lime-400">{change}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 text-xl text-lime-400">
          {icon}
        </div>
      </div>
    </div>
  );
}