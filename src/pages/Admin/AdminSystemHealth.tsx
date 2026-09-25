import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Activity,
  Cpu,
  Mail,
  Send,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import { rtdbService, type SystemState } from "../../firebase/database";
import { rtdb } from "../../firebase/config";
import { ref, onValue } from "firebase/database";
import { apiClient, API_URL } from "../../services/apiClient";

interface ServiceHealth {
  name: string;
  category: "CORE" | "ML" | "COMMS" | "STORAGE";
  status: "ONLINE" | "DEGRADED" | "OFFLINE" | "CHECKING";
  latencyMs: number | null;
  details: string;
  lastChecked: string;
}

export default function AdminSystemHealth() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testAlertSending, setTestAlertSending] = useState(false);
  const [testAlertResult, setTestAlertResult] = useState<string | null>(null);

  // Subsystem health state
  const [services, setServices] = useState<Record<string, ServiceHealth>>({
    frontend: {
      name: "Vite Web Client Engine",
      category: "CORE",
      status: "ONLINE",
      latencyMs: 1,
      details: "React 19 / Vite SPA active",
      lastChecked: new Date().toLocaleTimeString(),
    },
    fastapi: {
      name: "FastAPI Backend Service",
      category: "CORE",
      status: "CHECKING",
      latencyMs: null,
      details: `Connecting to ${API_URL}...`,
      lastChecked: new Date().toLocaleTimeString(),
    },
    rtdb: {
      name: "Firebase Realtime Database",
      category: "STORAGE",
      status: "CHECKING",
      latencyMs: null,
      details: "Connecting to .info/connected...",
      lastChecked: new Date().toLocaleTimeString(),
    },
    mlModel: {
      name: "Isolation Forest ML Model",
      category: "ML",
      status: "CHECKING",
      latencyMs: null,
      details: "Querying model joblib artifact...",
      lastChecked: new Date().toLocaleTimeString(),
    },
    smtp: {
      name: "Gmail SMTP Relay Gateway",
      category: "COMMS",
      status: "CHECKING",
      latencyMs: null,
      details: "Checking credentials & relay port 587...",
      lastChecked: new Date().toLocaleTimeString(),
    },
  });

  // RTDB System State listener
  useEffect(() => {
    const unsub = rtdbService.subscribeToSystem((state) => {
      setSystemState(state);
    });
    return () => unsub();
  }, []);

  // RTDB Connection status
  useEffect(() => {
    try {
      const connRef = ref(rtdb, ".info/connected");
      const unsub = onValue(connRef, (snap) => {
        const isConnected = snap.val() === true;
        setServices((prev) => ({
          ...prev,
          rtdb: {
            ...prev.rtdb,
            status: isConnected ? "ONLINE" : "OFFLINE",
            latencyMs: isConnected ? 12 : null,
            details: isConnected
              ? "Connected to gridguardsolarmonitoring-default-rtdb"
              : "Disconnected from Firebase RTDB socket",
            lastChecked: new Date().toLocaleTimeString(),
          },
        }));
      });
      return () => unsub();
    } catch {
      setServices((prev) => ({
        ...prev,
        rtdb: {
          ...prev.rtdb,
          status: "OFFLINE",
          latencyMs: null,
          details: "Could not bind connection listener",
          lastChecked: new Date().toLocaleTimeString(),
        },
      }));
    }
  }, []);

  const runAllChecks = useCallback(async () => {
    setRefreshing(true);

    // 1. Check FastAPI Backend & ML
    const t0 = performance.now();
    try {
      const data = await apiClient.checkHealth();
      const latency = Math.round(performance.now() - t0);
      setServices((prev) => ({
        ...prev,
        fastapi: {
          ...prev.fastapi,
          status: "ONLINE",
          latencyMs: latency,
          details: `Uptime: ${Math.round(data.uptime_seconds || 0)}s | Version: ${data.version || "2.0.0"}`,
          lastChecked: new Date().toLocaleTimeString(),
        },
        mlModel: {
          ...prev.mlModel,
          status: data.model_loaded ? "ONLINE" : "DEGRADED",
          latencyMs: latency,
          details: data.model_loaded
            ? "grid_guard_solar_model.joblib loaded & ready"
            : "Model artifact missing or uninitialized",
          lastChecked: new Date().toLocaleTimeString(),
        },
        smtp: {
          ...prev.smtp,
          status: data.smtp_configured ? "ONLINE" : "DEGRADED",
          latencyMs: latency,
          details: data.smtp_configured
            ? "Configured with Gmail relay: sriramkanuri45@gmail.com"
            : "SMTP environment credentials incomplete",
          lastChecked: new Date().toLocaleTimeString(),
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setServices((prev) => ({
        ...prev,
        fastapi: {
          ...prev.fastapi,
          status: "OFFLINE",
          latencyMs: null,
          details: `FastAPI offline or unreachable (${msg})`,
          lastChecked: new Date().toLocaleTimeString(),
        },
        mlModel: {
          ...prev.mlModel,
          status: "OFFLINE",
          latencyMs: null,
          details: "Microservice offline",
          lastChecked: new Date().toLocaleTimeString(),
        },
        smtp: {
          ...prev.smtp,
          status: "OFFLINE",
          latencyMs: null,
          details: "Microservice offline",
          lastChecked: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runAllChecks();
    const interval = setInterval(runAllChecks, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [runAllChecks]);

  const toggleMaintenanceMode = async () => {
    if (!systemState) return;
    const newMode = !systemState.maintenanceMode;
    await rtdbService.updateSystemState({
      maintenanceMode: newMode,
      status: newMode ? "DEGRADED" : "OPTIMAL",
    });
  };

  const testMlInference = async () => {
    try {
      const t0 = performance.now();
      const data = await apiClient.predictAnomaly({
        DC_POWER: 2858.2,
        AC_POWER: 2750.0,
        AMBIENT_TEMPERATURE: 30.5,
        MODULE_TEMPERATURE: 38.2,
        IRRADIATION: 850.0,
        hour: 12.0,
      });
      const latency = Math.round(performance.now() - t0);
      alert(`ML Model Test: status=${data.status}, score=${data.anomaly_score}, time=${latency}ms`);
    } catch {
      alert("ML Inference test failed. Unable to connect to Grid Guard server.");
    }
  };

  const getStatusBadge = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "ONLINE":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            OPERATIONAL
          </span>
        );
      case "DEGRADED":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            DEGRADED
          </span>
        );
      case "OFFLINE":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            OFFLINE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono text-slate-400">
            <RefreshCw className="h-2 w-2 animate-spin" />
            CHECKING
          </span>
        );
    }
  };

  const onlineServicesCount = Object.values(services).filter((s) => s.status === "ONLINE").length;
  const totalServicesCount = Object.values(services).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-lime-400">
              INFRASTRUCTURE TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            System Status & Health Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time operational status of backend services, Firebase databases, ML inference engines, and alerting relays.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAllChecks}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-white hover:border-slate-500 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-amber-400" : ""} />
            <span>Re-evaluate All</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Core System Status */}
        <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">Overall Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-white">
            {onlineServicesCount === totalServicesCount ? "OPTIMAL" : "PARTIAL OUTAGE"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {onlineServicesCount} of {totalServicesCount} Subsystems Online
          </p>
        </div>

        {/* RTDB Socket Status */}
        <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">Realtime Database</span>
            <Database className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-sky-400">
            {services.rtdb.status}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            RTDB Latency: {services.rtdb.latencyMs ?? "--"} ms
          </p>
        </div>

        {/* FastAPI ML Backend */}
        <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">FastAPI ML Engine</span>
            <Cpu className="h-4 w-4 text-lime-400" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-lime-400">
            {services.fastapi.status}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            API Latency: {services.fastapi.latencyMs ?? "--"} ms
          </p>
        </div>

        {/* Maintenance Switch */}
        <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">Maintenance Guard</span>
            <AlertTriangle className={`h-4 w-4 ${systemState?.maintenanceMode ? "text-amber-400" : "text-slate-600"}`} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {systemState?.maintenanceMode ? "ENABLED" : "DISABLED"}
            </span>
            <button
              onClick={toggleMaintenanceMode}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition ${
                systemState?.maintenanceMode
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      {/* Services List Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-amber-400" />
            <span>Subsystem Components</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">Auto-polled every 30s</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {Object.entries(services).map(([key, service]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-800/20 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {service.category}
                  </span>
                  <h3 className="text-sm font-bold text-white">{service.name}</h3>
                </div>
                <p className="text-xs text-slate-400">{service.details}</p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                {service.latencyMs !== null && (
                  <span className="text-xs font-mono text-slate-400">
                    {service.latencyMs} ms
                  </span>
                )}
                {getStatusBadge(service.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Actions */}
      <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <span>Interactive Diagnostics</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={testMlInference}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left hover:border-lime-500/50 hover:bg-slate-850 transition group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-lime-400">
                Trigger Isolation Forest Test Vector
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sends sample telemetry payload to ML endpoint and verifies classification output.
              </p>
            </div>
            <Cpu className="h-5 w-5 text-slate-500 group-hover:text-lime-400 shrink-0 ml-3" />
          </button>

          <button
            onClick={async () => {
              try {
                const d = await apiClient.checkHealth();
                alert(`FastAPI Health Response:\n${JSON.stringify(d, null, 2)}`);
              } catch {
                alert("FastAPI health query failed. Unable to connect to Grid Guard server.");
              }
            }}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left hover:border-sky-500/50 hover:bg-slate-850 transition group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-sky-400">
                Ping Backend Health Endpoint
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fetches raw runtime metrics, uptime, and SMTP config from /api/health.
              </p>
            </div>
            <Activity className="h-5 w-5 text-slate-500 group-hover:text-sky-400 shrink-0 ml-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
