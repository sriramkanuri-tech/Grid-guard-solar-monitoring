import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import SensorCard from "../../components/SensorCard";
import { sensorService } from "../../services/sensorService";
import type { SensorData, SensorConnectionType } from "../../types/sensor";
import {
  Radio,
  Plus,
  Check,
  AlertCircle,
  Wifi,
  Terminal,
  Zap,
  Activity,
  Layers,
  Database,
} from "lucide-react";

export default function ConnectSensor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [sensorId, setSensorId] = useState("");
  const [sensorName, setSensorName] = useState("");
  const [connectionType, setConnectionType] = useState<SensorConnectionType>("ESP32");
  const [endpoint, setEndpoint] = useState("");
  const [room, setRoom] = useState("");
  const [ratedPower, setRatedPower] = useState("2.8");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = sensorService.subscribe((list) => {
      setSensors(list);
    });
    return () => unsub();
  }, []);

  const totalSensorsPower = sensors.reduce((acc, s) => acc + (s.power ?? s.ratedPower ?? 2.5), 0);

  const handleAddSensor = async (e: FormEvent) => {
    e.preventDefault();
    if (!sensorName.trim()) {
      setStatusMsg({ type: "error", text: "Please provide a sensor name." });
      return;
    }

    const powerNum = parseFloat(ratedPower) || 2.5;

    setIsSubmitting(true);
    try {
      const newSensor = await sensorService.addSensor({
        name: sensorName.trim(),
        room: room.trim() || "Main Inverter Shed",
        connectionType,
        endpoint: endpoint.trim() || "192.168.1.130:8080",
        ratedPower: powerNum,
        power: powerNum,
        voltage: 231.0,
        current: Math.round(((powerNum * 1000) / 231.0) * 10) / 10,
        temperature: 33.5,
        humidity: 60,
        pressure: 1012,
        status: "normal",
      });

      setStatusMsg({
        type: "success",
        text: `Sensor "${newSensor.name}" successfully provisioned and synchronized to Firebase RTDB! Generation has updated.`,
      });

      setSensorId("");
      setSensorName("");
      setEndpoint("");
      setRoom("");
      setRatedPower("2.8");
    } catch {
      setStatusMsg({ type: "error", text: "Failed to configure sensor." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedPage>
      <PageHeader
        title="Connect Telemetry Node"
        subtitle="Provision physical microcontrollers, edge IoT gateways, and environmental sensor pods"
        category="Hardware Interfacing"
      />

      {/* Sensor Connection Status Banner */}
      <section className="animate-item rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/20 text-emerald-400">
              <Wifi size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Hardware Telemetry: {sensors.length} Active Sensor{sensors.length === 1 ? "" : "s"} Connected
                </h2>
              </div>
              <p className="mt-1 text-xs text-emerald-200/90 leading-relaxed">
                Live Firebase Realtime Database Stream Active — Every connected sensor contributes to the microgrid generation yield and updates the live cloud database every second.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-lime-400/30 bg-lime-400/20 px-3.5 py-1.5 text-xs font-mono font-bold text-lime-300">
              {totalSensorsPower.toFixed(2)} kW ACTIVE YIELD
            </div>
            <div className="hidden sm:block rounded-xl border border-emerald-400/30 bg-emerald-400/20 px-3.5 py-1.5 text-xs font-mono font-bold text-emerald-300">
              RTDB SYNC
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Form & List */}
      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Sensor Configuration Form */}
        <div className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl lg:col-span-1">
          <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
            <Radio size={18} />
            <h2 className="font-bold text-white text-base">Provision New Sensor Node</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Register a physical or simulated edge device (ESP32, STM32, MQTT Broker, or Raspberry Pi).
          </p>

          <form onSubmit={handleAddSensor} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Sensor Node Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. String Inverter Array C"
                value={sensorName}
                onChange={(e) => setSensorName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Installation Location / Chamber
              </label>
              <input
                type="text"
                placeholder="e.g. Inverter Bay #2 / East Roof"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Rated Output Capacity (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="50"
                required
                value={ratedPower}
                onChange={(e) => setRatedPower(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                This capacity will dynamically contribute to the total live generation.
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Connection Protocol
              </label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value as SensorConnectionType)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
              >
                <option value="ESP32">ESP32 (Wi-Fi / BLE)</option>
                <option value="Arduino">Arduino MCU (Serial)</option>
                <option value="STM32">STM32 (Modbus RTU)</option>
                <option value="Raspberry Pi">Raspberry Pi (Gateway)</option>
                <option value="MQTT">MQTT Broker Stream</option>
                <option value="HTTP API">HTTP REST API Push</option>
                <option value="Firebase">Firebase RTDB Direct</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Target Endpoint / IP Address
              </label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.140:8080"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
              />
            </div>

            {statusMsg && (
              <div
                className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                  statusMsg.type === "success"
                    ? "border border-lime-400/30 bg-lime-400/10 text-lime-400"
                    : "border border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {statusMsg.type === "success" ? <Check size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 py-3 text-xs font-bold text-slate-950 shadow-md shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98] disabled:opacity-50"
            >
              <Plus size={15} />
              <span>{isSubmitting ? "Activating Node..." : "Connect & Activate Sensor Node"}</span>
            </button>
          </form>
        </div>

        {/* Existing Sensors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Database size={18} className="text-lime-400" />
              <span>Provisioned Hardware Nodes ({sensors.length})</span>
            </h2>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live RTDB Stream Active
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sensors.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} />
            ))}
          </div>

          {/* Integration Guide Card */}
          <div className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-lime-400 mb-2">
              <Terminal size={18} />
              <h3 className="font-bold text-white text-sm">Edge Hardware Firmware Spec</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Configure your physical ESP32, STM32, or Raspberry Pi firmware to push JSON payloads to Firebase Realtime Database or local microservice:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-lime-300 font-mono">
{`// Example Arduino / ESP32 JSON Payload:
{
  "sensorId": "SP-INV-01",
  "power": 3.18,
  "voltage": 230.8,
  "current": 13.8,
  "temperature": 34.2,
  "humidity": 58.0,
  "pressure": 1012,
  "status": "normal"
}`}
            </pre>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
