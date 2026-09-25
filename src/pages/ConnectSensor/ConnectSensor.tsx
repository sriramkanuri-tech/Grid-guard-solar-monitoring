import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import SensorCard from "../../components/SensorCard";
import { sensorService } from "../../services/sensorService";
import type { SensorData, SensorConnectionType } from "../../types/sensor";
import { Radio, Plus, Check, AlertCircle, WifiOff } from "lucide-react";

export default function ConnectSensor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [sensorId, setSensorId] = useState("");
  const [sensorName, setSensorName] = useState("");
  const [connectionType, setConnectionType] = useState<SensorConnectionType>("ESP32");
  const [endpoint, setEndpoint] = useState("");
  const [room, setRoom] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = sensorService.subscribe((list) => {
      setSensors(list);
    });
    return () => unsub();
  }, []);

  const handleAddSensor = async (e: FormEvent) => {
    e.preventDefault();
    if (!sensorName.trim()) {
      setStatusMsg({ type: "error", text: "Please provide a sensor name." });
      return;
    }

    setIsSubmitting(true);
    try {
      await sensorService.addSensor({
        name: sensorName.trim(),
        room: room.trim() || "Main Inverter Shed",
        connectionType,
        endpoint: endpoint.trim() || "192.168.1.130:8080",
        temperature: 28.5,
        humidity: 60,
        pressure: 1008,
        status: "normal",
      });

      setStatusMsg({
        type: "success",
        text: `Sensor "${sensorName}" configured successfully in Demo Mode!`,
      });

      setSensorId("");
      setSensorName("");
      setEndpoint("");
      setRoom("");
    } catch {
      setStatusMsg({ type: "error", text: "Failed to configure sensor." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedPage>
      <PageHeader
        title="Connect Sensor"
        subtitle="Manage edge microcontrollers, IoT gateways, and environmental telemetry nodes"
        category="Connect Sensor"
        isDemo={true}
      />

      {/* Sensor Connection Status Banner */}
      <section className="animate-item rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <WifiOff size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-base font-bold text-white">
                  Sensor Connection Status: No physical sensor connected
                </h2>
              </div>
              <p className="mt-1 text-xs text-amber-200/80">
                Demo Mode Active — The application is currently receiving synthetic telemetry.
                Configure a hardware node below to prepare for physical integration.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/20 px-3.5 py-1.5 text-xs font-semibold text-amber-300">
            Demo Mode Active
          </div>
        </div>
      </section>

      {/* Main Grid: Form & List */}
      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Sensor Configuration Form */}
        <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-1">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <Radio size={18} />
            <h2 className="font-semibold text-white text-lg">Add New Sensor Node</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Register an edge device (ESP32, STM32, MQTT Broker, or Raspberry Pi)
          </p>

          <form onSubmit={handleAddSensor} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Sensor ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. sens-005"
                value={sensorId}
                onChange={(e) => setSensorId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Sensor Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rooftop String B Array"
                value={sensorName}
                onChange={(e) => setSensorName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Installation Location / Room
              </label>
              <input
                type="text"
                placeholder="e.g. Room 2 / West Inverter Bay"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Connection Type
              </label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value as SensorConnectionType)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="ESP32">ESP32</option>
                <option value="STM32">STM32</option>
                <option value="Raspberry Pi">Raspberry Pi</option>
                <option value="MQTT">MQTT Broker</option>
                <option value="HTTP API">HTTP REST API</option>
                <option value="Firebase">Firebase SDK Direct</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Endpoint / IP Address
              </label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.140:8080"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-lime-400"
              />
            </div>

            {statusMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                  statusMsg.type === "success"
                    ? "border border-lime-400/20 bg-lime-400/10 text-lime-300"
                    : "border border-red-500/20 bg-red-500/10 text-red-300"
                }`}
              >
                {statusMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              <Plus size={16} />
              {isSubmitting ? "Configuring..." : "Register Sensor"}
            </button>
          </form>
        </div>

        {/* Existing Sensors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Configured Sensor Nodes ({sensors.length})
            </h2>
            <span className="text-xs text-slate-500">Live Emulation</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sensors.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} />
            ))}
          </div>

          {/* Integration Guide Card */}
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="font-semibold text-white text-sm">Edge Hardware Integration Guide</h3>
            <p className="mt-1 text-xs text-slate-400">
              When ready to deploy physical sensors, configure your ESP32/STM32 firmware to stream JSON payloads:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900/90 p-4 text-[11px] text-lime-300 font-mono">
{`// Example ESP32 / Arduino JSON Payload:
{
  "sensorId": "sens-001",
  "temperature": 28.6,
  "humidity": 62.0,
  "pressure": 1008,
  "voltage": 230.4,
  "status": "normal"
}`}
            </pre>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
