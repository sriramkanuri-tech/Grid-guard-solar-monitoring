import React from "react";
import type { SensorData } from "../types/sensor";
import StatusBadge from "./StatusBadge";
import AnimatedNumber from "./AnimatedNumber";
import { Cpu, Droplets, Gauge, Thermometer, Radio } from "lucide-react";

interface SensorCardProps {
  sensor: SensorData;
  className?: string;
}

export const SensorCard: React.FC<SensorCardProps> = ({ sensor, className = "" }) => {
  return (
    <div
      className={`animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-lime-400/30 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
            <Cpu size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{sensor.name}</h3>
            <p className="text-xs text-slate-500">{sensor.room || "Field Zone"}</p>
          </div>
        </div>
        <StatusBadge status={sensor.status} />
      </div>

      {/* Metrics Grid */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4">
        <div className="rounded-xl bg-slate-950/40 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Thermometer size={14} className="text-amber-400" />
            <span>Temp</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">
            <AnimatedNumber value={sensor.temperature} decimals={1} />
            <span className="text-xs font-normal text-slate-400"> °C</span>
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/40 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Droplets size={14} className="text-sky-400" />
            <span>Humidity</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">
            <AnimatedNumber value={sensor.humidity} decimals={0} />
            <span className="text-xs font-normal text-slate-400"> %</span>
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/40 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Gauge size={14} className="text-lime-400" />
            <span>Pressure</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">
            <AnimatedNumber value={sensor.pressure} decimals={0} />
            <span className="text-xs font-normal text-slate-400"> hPa</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Radio size={12} className="text-lime-400" />
          {sensor.connectionType || "ESP32"}
        </span>
        <span>Seen {sensor.lastSeen || "Just now"}</span>
      </div>
    </div>
  );
};

export default SensorCard;
