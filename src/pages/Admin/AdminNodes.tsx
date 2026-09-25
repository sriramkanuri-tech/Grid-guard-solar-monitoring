import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Radio,
  Plus,
  Trash2,
  Edit2,
  HardDrive,
  RefreshCw,
  X,
  Activity,
  Zap,
  Plug,
  Thermometer,
} from "lucide-react";
import { nodeService } from "../../services/nodeService";
import { rtdbService, type SolarNode } from "../../firebase/database";

export default function AdminNodes() {
  const [nodes, setNodes] = useState<SolarNode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState<SolarNode | null>(null);

  // Form State
  const [nodeId, setNodeId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL">("ONLINE");
  const [voltage, setVoltage] = useState(230.0);
  const [current, setCurrent] = useState(12.0);
  const [power, setPower] = useState(4.5);
  const [energy, setEnergy] = useState(45.0);
  const [temperature, setTemperature] = useState(35.0);
  const [firmware, setFirmware] = useState("v2.4.2-prod");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = nodeService.subscribe((list) => setNodes(list));
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingNode(null);
    setNodeId("GG-NODE-0" + (nodes.length + 1));
    setName("Solar Inverter Array #" + (nodes.length + 1));
    setLocation("Substation Sector Alpha");
    setStatus("ONLINE");
    setVoltage(231.0);
    setCurrent(12.5);
    setPower(4.8);
    setEnergy(45.0);
    setTemperature(36.0);
    setFirmware("v2.4.2-prod");
    setShowModal(true);
  };

  const handleOpenEdit = (node: SolarNode) => {
    setEditingNode(node);
    setNodeId(node.nodeId);
    setName(node.name);
    setLocation(node.location);
    setStatus(node.status);
    setVoltage(node.voltage);
    setCurrent(node.current);
    setPower(node.power);
    setEnergy(node.energy);
    setTemperature(node.temperature);
    setFirmware(node.firmware);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: SolarNode = {
      nodeId: nodeId.trim(),
      name: name.trim(),
      location: location.trim(),
      status,
      lastSeen: new Date().toISOString(),
      voltage: Number(voltage),
      current: Number(current),
      power: Number(power),
      energy: Number(energy),
      temperature: Number(temperature),
      firmware: firmware.trim(),
    };

    try {
      if (editingNode) {
        await nodeService.updateNode(editingNode.nodeId, payload);
      } else {
        await nodeService.createNode(payload);
      }

      // Also sync telemetry in RTDB
      await rtdbService.pushTelemetry(payload.nodeId, {
        nodeId: payload.nodeId,
        voltage: payload.voltage,
        current: payload.current,
        power: payload.power,
        energy: payload.energy,
        temperature: payload.temperature,
        status: payload.status,
      });

      setShowModal(false);
    } catch (err) {
      console.warn("Error saving node:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Permanently remove node ${id}?`)) {
      await nodeService.deleteNode(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="text-lime-400" />
            Solar Monitoring Nodes Control
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Provision hardware sensor endpoints, monitor telemetry stream status, and manage firmware versions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-lime-300 transition shadow-lg shadow-lime-400/20 active:scale-95"
        >
          <Plus size={15} />
          <span>Provision New Node</span>
        </button>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <div
            key={node.nodeId}
            className="rounded-2xl border border-slate-800/90 bg-[#0B1628]/80 p-5 shadow-xl transition hover:border-slate-700 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {node.nodeId}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                    node.status === "ONLINE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : node.status === "WARNING"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-red-500/10 text-red-400 border border-red-500/30"
                  }`}
                >
                  {node.status}
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-white tracking-tight">{node.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{node.location}</p>

              {/* Electrical Parameters Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-xl border border-slate-800 bg-[#07111F]/70 p-2.5">
                  <span className="text-[10px] text-slate-500 font-sans uppercase">Power</span>
                  <p className="text-sm font-bold text-lime-400 mt-0.5">{node.power || 0} kW</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#07111F]/70 p-2.5">
                  <span className="text-[10px] text-slate-500 font-sans uppercase">Voltage</span>
                  <p className="text-sm font-bold text-white mt-0.5">{node.voltage || 0} V</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#07111F]/70 p-2.5">
                  <span className="text-[10px] text-slate-500 font-sans uppercase">Current</span>
                  <p className="text-sm font-bold text-cyan-300 mt-0.5">{node.current || 0} A</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#07111F]/70 p-2.5">
                  <span className="text-[10px] text-slate-500 font-sans uppercase">Temperature</span>
                  <p className="text-sm font-bold text-amber-300 mt-0.5">{node.temperature || 0} °C</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                <span>Firmware: {node.firmware || "v2.4.0"}</span>
                <span>Energy: {node.energy || 0} kWh</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(node)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>

              <button
                onClick={() => handleDelete(node.nodeId)}
                className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 transition"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* NODE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-lime-500/30 bg-[#0B1628] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Radio className="text-lime-400" size={18} />
                <h3 className="text-lg font-bold text-white">
                  {editingNode ? "Edit Solar Node" : "Provision New Node"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Node ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingNode)}
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white font-mono outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL")}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-lime-400"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Node Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Substation Alpha Array"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location / Zone *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Plant Roof Sector 2"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-lime-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={voltage}
                    onChange={(e) => setVoltage(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={current}
                    onChange={(e) => setCurrent(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Power (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={power}
                    onChange={(e) => setPower(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/20 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
