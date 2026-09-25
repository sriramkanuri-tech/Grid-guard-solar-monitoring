import { useState, useEffect } from "react";
import {
  Activity,
  Radio,
  Zap,
  Plug,
  Thermometer,
  Sun,
  HardDrive,
  RefreshCw,
  Send,
} from "lucide-react";
import { rtdbService, type RealtimeTelemetry } from "../../firebase/database";
import { nodeService } from "../../services/nodeService";
import type { SolarNode } from "../../types/node";

export default function AdminTelemetry() {
  const [telemetryMap, setTelemetryMap] = useState<Record<string, RealtimeTelemetry>>({});
  const [nodes, setNodes] = useState<SolarNode[]>(() => {
    const cached = localStorage.getItem("gridguard_cache_nodes");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      {
        nodeId: "GG-NODE-01",
        name: "Substation Alpha Array",
        location: "Main Substation Sector 4",
        status: "ONLINE",
        voltage: 231.2,
        current: 12.8,
        power: 4.82,
        energy: 45.2,
        temperature: 36.4,
        firmware: "v2.4.1-prod",
        lastSeen: new Date().toISOString(),
      },
      {
        nodeId: "GG-NODE-02",
        name: "Rooftop Commercial PV",
        location: "Building C Industrial Roof",
        status: "ONLINE",
        voltage: 229.8,
        current: 9.4,
        power: 3.25,
        energy: 31.8,
        temperature: 34.2,
        firmware: "v2.4.1-prod",
        lastSeen: new Date().toISOString(),
      },
    ];
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string>("GG-NODE-01");
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  // Simulated push fields
  const [simPower, setSimPower] = useState(4.85);
  const [simVoltage, setSimVoltage] = useState(231.4);
  const [simCurrent, setSimCurrent] = useState(12.6);
  const [simTemp, setSimTemp] = useState(38.2);
  const [simIrradiance, setSimIrradiance] = useState(860);

  useEffect(() => {
    const unsubTel = rtdbService.subscribeToAllTelemetry((t) => setTelemetryMap(t));
    const unsubNodes = nodeService.subscribe((n) => {
      if (n && n.length > 0) {
        setNodes(n);
        if (!selectedNodeId) {
          setSelectedNodeId(n[0].nodeId);
        }
      }
    });

    return () => {
      unsubTel();
      unsubNodes();
    };
  }, [selectedNodeId]);

  const activeTel = telemetryMap[selectedNodeId] || {
    nodeId: selectedNodeId,
    timestamp: "Waiting for telemetry...",
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    temperature: 0,
    irradiance: 0,
    efficiency: 0,
    frequency: 50.0,
    powerFactor: 0.98,
    status: "OFFLINE",
  };

  const handleSimulateHardwareTick = async () => {
    setPushing(true);
    setPushMsg("");

    try {
      await rtdbService.pushTelemetry(selectedNodeId, {
        nodeId: selectedNodeId,
        voltage: Number(simVoltage),
        current: Number(simCurrent),
        power: Number(simPower),
        energy: Number((activeTel.energy || 40) + 0.05),
        temperature: Number(simTemp),
        irradiance: Number(simIrradiance),
        efficiency: 93.2,
        frequency: 50.02,
        powerFactor: 0.98,
        status: "ONLINE",
      });

      setPushMsg(`Telemetric frame successfully broadcast to Firebase RTDB for [${selectedNodeId}]!`);
      setTimeout(() => setPushMsg(""), 3000);
    } catch (err) {
      setPushMsg("Failed broadcasting telemetry.");
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="text-amber-400" />
            Live Telemetry Command Inspector
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Realtime Database listener streaming sub-second telemetry across utility solar arrays.
          </p>
        </div>

        {/* Node Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Target Node:</span>
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="rounded-xl border border-amber-500/40 bg-[#0B1628] py-2 px-3 text-xs text-amber-300 font-mono font-bold outline-none cursor-pointer"
          >
            {nodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.nodeId} - {n.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1628]/80 p-5">
          <div className="flex items-center justify-between font-sans text-xs text-slate-400 uppercase font-semibold">
            <span>Solar Power</span>
            <Zap size={15} className="text-lime-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-lime-400">
            {activeTel.power?.toFixed(2) || "0.00"} <span className="text-xs font-normal text-slate-400">kW</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-sans">Active MPPT generation</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1628]/80 p-5">
          <div className="flex items-center justify-between font-sans text-xs text-slate-400 uppercase font-semibold">
            <span>Bus Voltage</span>
            <Plug size={15} className="text-sky-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {activeTel.voltage?.toFixed(1) || "0.0"} <span className="text-xs font-normal text-slate-400">V</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-sans">Phase-to-Neutral AC</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1628]/80 p-5">
          <div className="flex items-center justify-between font-sans text-xs text-slate-400 uppercase font-semibold">
            <span>Module Temp</span>
            <Thermometer size={15} className="text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-amber-300">
            {activeTel.temperature?.toFixed(1) || "0.0"} <span className="text-xs font-normal text-slate-400">°C</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-sans">Inverter core thermistor</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0B1628]/80 p-5">
          <div className="flex items-center justify-between font-sans text-xs text-slate-400 uppercase font-semibold">
            <span>Solar Irradiance</span>
            <Sun size={15} className="text-yellow-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-yellow-300">
            {activeTel.irradiance?.toFixed(0) || "0"} <span className="text-xs font-normal text-slate-400">W/m²</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-sans">Pyranometer flux sensor</p>
        </div>
      </div>

      {/* Raw Stream Inspector & Hardware Broadcast Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Raw Telemetry JSON Payload */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0B1628]/80 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Firebase Realtime Database Stream: telemetry/{selectedNodeId}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{activeTel.timestamp}</span>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono overflow-x-auto border border-slate-800/80 leading-relaxed">
              {JSON.stringify(activeTel, null, 2)}
            </pre>
          </div>

          <p className="text-[11px] text-slate-400 mt-4">
            Live updates arrive automatically whenever physical ESP32 or simulated nodes write to this Firebase Realtime Database node.
          </p>
        </div>

        {/* Hardware Broadcast Testing Console */}
        <div className="lg:col-span-5 rounded-2xl border border-amber-500/30 bg-[#0B1628]/80 p-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send size={15} className="text-amber-400" />
              Hardware Telemetry Injector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate or inject real sensor packet into Firebase RTDB for node [{selectedNodeId}].
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-[11px] font-sans text-slate-400 mb-1">Power Output (kW)</label>
              <input
                type="number"
                step="0.05"
                value={simPower}
                onChange={(e) => setSimPower(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-sans text-slate-400 mb-1">Voltage (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simVoltage}
                  onChange={(e) => setSimVoltage(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans text-slate-400 mb-1">Current (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simCurrent}
                  onChange={(e) => setSimCurrent(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-sans text-slate-400 mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={simTemp}
                  onChange={(e) => setSimTemp(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans text-slate-400 mb-1">Irradiance (W/m²)</label>
                <input
                  type="number"
                  step="10"
                  value={simIrradiance}
                  onChange={(e) => setSimIrradiance(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {pushMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans">
                {pushMsg}
              </div>
            )}

            <button
              onClick={handleSimulateHardwareTick}
              disabled={pushing}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50 font-sans"
            >
              <Send size={13} />
              <span>{pushing ? "Transmitting..." : "Broadcast Frame to RTDB"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
