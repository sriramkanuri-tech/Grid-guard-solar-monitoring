import React from "react";
import type { SensorData } from "../types/sensor";
import StatusBadge from "./StatusBadge";
import AnimatedNumber from "./AnimatedNumber";
import { Cpu, Thermometer, Radio, Zap, Activity, Trash2 } from "lucide-react";
import { sensorService } from "../services/sensorService";

interface SensorCardProps {
  sensor: SensorData;
  className?: string;
  onDelete?: (id: string) => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({ sensor, className = "", onDelete }) => {
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Decommission sensor node "${sensor.name}"?`)) {
      await sensorService.deleteSensor(sensor.id);
      if (onDelete) onDelete(sensor.id);
    }
  };

  const power = sensor.power ?? sensor.ratedPower ?? 2.5;
  const voltage = sensor.voltage ?? 230.5;
  const current = sensor.current ?? Math.round(((power * 1000) / voltage) * 10) / 10;
  const temp = sensor.temperature ?? 34.0;

  return (
    <div
      className={`group rounded-2xl border border-slate-800/80 bg-[#0B1628]/85 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-lime-400/40 hover:bg-[#101D32]/90 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 group-hover:bg-lime-400/20 transition-colors">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{sensor.name}</h3>
            <p className="text-[11px] text-slate-400 font-mono">{sensor.room || "Field Zone"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={sensor.status} />
          <button
            onClick={handleDelete}
            title="Decommission Sensor"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Grid: Power, Voltage, Current, Temp */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Zap size={13} className="text-lime-400" />
            <span>Power</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-lime-400 font-mono">
            <AnimatedNumber value={power} decimals={2} />
            <span className="text-[11px] font-normal text-slate-400"> kW</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity size={13} className="text-sky-400" />
            <span>Voltage</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-white font-mono">
            <AnimatedNumber value={voltage} decimals={1} />
            <span className="text-[11px] font-normal text-slate-400"> V</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/70 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Thermometer size={13} className="text-amber-400" />
            <span>Temp</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-amber-300 font-mono">
            <AnimatedNumber value={temp} decimals={1} />
            <span className="text-[11px] font-normal text-slate-400"> °C</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/40 pt-2.5">
        <span className="flex items-center gap-1.5 font-mono">
          <Radio size={12} className="text-lime-400" />
          {sensor.connectionType || "ESP32"} • {current.toFixed(1)} A
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          RTDB Synced
        </span>
      </div>
    </div>
  );
};

export default SensorCard;
