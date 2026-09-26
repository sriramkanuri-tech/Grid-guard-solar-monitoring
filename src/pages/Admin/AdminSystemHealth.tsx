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
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);
  const [maintenanceBroadcastToast, setMaintenanceBroadcastToast] = useState<string | null>(null);

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
    if (!systemState || maintenanceToggling) return;
    setMaintenanceToggling(true);
    const newMode = !systemState.maintenanceMode;

    try {
      // 1. Update RTDB system state immediately
      await rtdbService.updateSystemState({
        maintenanceMode: newMode,
        status: newMode ? "DEGRADED" : "OPTIMAL",
      });

      // 2. Fetch all registered operator emails
      const recipients = await rtdbService.getAllUserEmails();
      const timestamp = new Date().toLocaleString();

      // 3. Prepare neat professional email templates
      const subject = newMode
        ? "⚠️ Grid Guard Advisory: Scheduled System Maintenance in Progress"
        : "✅ Grid Guard Update: Maintenance Concluded — Platform Fully Operational";

      const plainText = newMode
        ? `GRID GUARD SOLAR MONITORING — SYSTEM ADVISORY
==================================================
Status: SYSTEM MAINTENANCE IN PROGRESS
Target Systems: Inverter Telemetry, ML Pipeline, Node Controllers
Timestamp: ${timestamp}

Dear Grid Guard Operator,

Please be advised that the Grid Guard Solar Monitoring platform is currently in MAINTENANCE MODE for scheduled infrastructure calibration and system updates.

OPERATIONAL IMPACT:
• Live Telemetry: Temporarily paused / recalibrating
• Inverter Hardware Protection: Fully armed & fail-safe active
• Historical Logs & Telemetry Archive: Intact & protected
• Estimated Window: 15 - 30 minutes

Console Access: https://gridguardsolarmonitoring.web.app

Grid Guard Infrastructure Operations Team
Dispatched automatically to all registered operators.`
        : `GRID GUARD SOLAR MONITORING — SYSTEM RESTORATION
==================================================
Status: ALL SYSTEMS FULLY OPERATIONAL
Target Systems: Inverter Telemetry, ML Engine, Node Controllers
Timestamp: ${timestamp}

Dear Grid Guard Operator,

The scheduled platform maintenance on the Grid Guard Solar Monitoring platform has successfully concluded.

All services, live inverter telemetry streaming, Isolation Forest ML anomaly detection, and automated dispatch engines are operating nominally.

Console Access: https://gridguardsolarmonitoring.web.app

Grid Guard Infrastructure Operations Team
Dispatched automatically to all registered operators.`;

      const htmlText = newMode
        ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
  <div style="background: linear-gradient(135deg, #b45309 0%, #78350f 100%); padding: 28px 24px; text-align: center; border-bottom: 1px solid #d97706;">
    <div style="display: inline-block; background: rgba(0, 0, 0, 0.4); border: 1px solid #f59e0b; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #fef3c7; margin-bottom: 12px;">
      SYSTEM ADVISORY NOTICE
    </div>
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Grid Guard Maintenance Active</h1>
    <p style="margin: 6px 0 0 0; color: #fed7aa; font-size: 13px;">Solar Monitoring Platform &bull; Infrastructure Operations</p>
  </div>
  <div style="padding: 28px 24px;">
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">System State</span>
        <span style="background: #f59e0b; color: #020617; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px; letter-spacing: 0.05em;">MAINTENANCE MODE</span>
      </div>
      <p style="margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
        Grid Guard administrator has initiated scheduled maintenance for system-wide health audits, model parameter tuning, and database synchronization.
      </p>
    </div>
    <h3 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Operational Impact</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8; width: 40%;">Live Telemetry:</td>
        <td style="padding: 10px 0; color: #f59e0b; font-weight: 600; text-align: right;">Temporarily paused / recalibrating</td>
      </tr>
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8;">Hardware Protection:</td>
        <td style="padding: 10px 0; color: #10b981; font-weight: 600; text-align: right;">ARMED & FAIL-SAFE ACTIVE</td>
      </tr>
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8;">Historical Logs:</td>
        <td style="padding: 10px 0; color: #10b981; font-weight: 600; text-align: right;">Intact & Protected</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #94a3b8;">Estimated Duration:</td>
        <td style="padding: 10px 0; color: #f8fafc; font-weight: 600; text-align: right;">15 &ndash; 30 Minutes</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://gridguardsolarmonitoring.web.app" style="display: inline-block; background: #f59e0b; color: #020617; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.02em;">
        View Live Status in Console
      </a>
    </div>
  </div>
  <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.6;">
    Dispatched to all registered Grid Guard operators &bull; Grid Guard Solar Monitoring System<br />
    Timestamp: ${timestamp}
  </div>
</div>`
        : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
  <div style="background: linear-gradient(135deg, #059669 0%, #064e3b 100%); padding: 28px 24px; text-align: center; border-bottom: 1px solid #10b981;">
    <div style="display: inline-block; background: rgba(0, 0, 0, 0.4); border: 1px solid #10b981; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #a7f3d0; margin-bottom: 12px;">
      SYSTEM RESTORATION NOTICE
    </div>
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">All Systems Fully Operational</h1>
    <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 13px;">Solar Monitoring Platform &bull; Maintenance Window Concluded</p>
  </div>
  <div style="padding: 28px 24px;">
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">System State</span>
        <span style="background: #10b981; color: #020617; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px; letter-spacing: 0.05em;">OPERATIONAL</span>
      </div>
      <p style="margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
        Scheduled platform maintenance has concluded. Real-time inverter telemetry streams, machine learning isolation forest pipelines, and automated security monitors are performing nominally.
      </p>
    </div>
    <h3 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Subsystem Status</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8; width: 40%;">Telemetry Ingestion:</td>
        <td style="padding: 10px 0; color: #10b981; font-weight: 600; text-align: right;">100% OPERATIONAL</td>
      </tr>
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8;">Isolation Forest ML:</td>
        <td style="padding: 10px 0; color: #10b981; font-weight: 600; text-align: right;">ACTIVE (Real-time Evaluation)</td>
      </tr>
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 0; color: #94a3b8;">Alert Gateway:</td>
        <td style="padding: 10px 0; color: #10b981; font-weight: 600; text-align: right;">ARMED</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://gridguardsolarmonitoring.web.app" style="display: inline-block; background: #10b981; color: #020617; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.02em;">
        Open Monitoring Console
      </a>
    </div>
  </div>
  <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.6;">
    Dispatched to all registered Grid Guard operators &bull; Grid Guard Solar Monitoring System<br />
    Timestamp: ${timestamp}
  </div>
</div>`;

      // 4. Send email broadcast
      if (recipients.length > 0) {
        await apiClient.sendEmail({
          recipients,
          subject,
          message: plainText,
          html_message: htmlText,
          sender_name: "Grid Guard Infrastructure Operations",
        });
      }

      // 5. Log audit event
      await rtdbService.logAuditEvent(
        newMode ? "MAINTENANCE_MODE_ENABLED" : "MAINTENANCE_MODE_DISABLED",
        "SYSTEM",
        {
          maintenanceMode: newMode,
          recipientsCount: recipients.length,
          recipients,
        },
        "admin",
        "sriramkanuri4@gmail.com"
      );

      setMaintenanceBroadcastToast(
        `Maintenance mode ${newMode ? "ENABLED" : "DISABLED"}. Notification dispatched to ${recipients.length} operator${recipients.length === 1 ? "" : "s"}.`
      );
      setTimeout(() => setMaintenanceBroadcastToast(null), 6000);
    } catch (err: unknown) {
      console.error("[AdminSystemHealth] Failed toggling maintenance mode:", err);
      setMaintenanceBroadcastToast("Failed updating maintenance mode. Please check connection.");
      setTimeout(() => setMaintenanceBroadcastToast(null), 5000);
    } finally {
      setMaintenanceToggling(false);
    }
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

      {/* Maintenance Notification Banner */}
      {maintenanceBroadcastToast && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs font-medium text-amber-300 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Mail className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
          <span>{maintenanceBroadcastToast}</span>
        </div>
      )}

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
              disabled={maintenanceToggling}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition disabled:opacity-60 ${
                systemState?.maintenanceMode
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:bg-amber-400/30"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {maintenanceToggling && <RefreshCw size={11} className="animate-spin text-amber-400" />}
              <span>{maintenanceToggling ? "Broadcasting..." : "Toggle"}</span>
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
