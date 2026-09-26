import { useEffect, useState, useRef } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";

import {
  Bot,
  Cpu,
  Sparkles,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  Layers,
  Zap,
  Gauge,
  CheckCircle2,
  Radio,
  Bell,
  Mail,
  Send,
  Play,
  Pause,
  ShieldCheck,
  Flame,
} from "lucide-react";

import { mlService } from "../../services/mlService";
import { mlAutonomousService, type MLAutonomousState } from "../../services/mlAutonomousService";
import { ML_API_URL } from "../../config";
import { apiClient } from "../../services/apiClient";
import { gridDataService } from "../../services/gridDataService";
import { getStoredUser } from "../../firebase/auth";
import type { MLPredictionResponse, InferenceHistoryItem, MLHealthResponse } from "../../types/ml";

export default function MLDetection() {
  // --------------------------------------------------
  // REAL USER INPUTS
  // --------------------------------------------------
  const [dcPower, setDcPower] = useState("4820");
  const [acPower, setAcPower] = useState("4580");
  const [ambientTemp, setAmbientTemp] = useState("28.5");
  const [moduleTemp, setModuleTemp] = useState("45.2");
  const [irradiation, setIrradiation] = useState("0.84");
  const [hour, setHour] = useState("12.0");

  // --------------------------------------------------
  // AUTONOMOUS CONTINUOUS INFERENCE & AUTO-ALERT STATE
  // --------------------------------------------------
  const [isAutonomous, setIsAutonomous] = useState(true);
  const [lastInferenceTick, setLastInferenceTick] = useState(0);
  const [lastAlertSentTime, setLastAlertSentTime] = useState<string | null>(null);
  const [lastAlertRecipient, setLastAlertRecipient] = useState<string | null>(null);
  const [alertDispatchToast, setAlertDispatchToast] = useState<string | null>(null);
  const [isInjectingFault, setIsInjectingFault] = useState(false);
  const lastEmailAlertTimestamp = useRef<number>(0);

  // --------------------------------------------------
  // API STATE
  // --------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [serverModelName, setServerModelName] = useState("Isolation Forest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --------------------------------------------------
  // REAL ML RESULT
  // --------------------------------------------------
  const [latestResult, setLatestResult] = useState<MLPredictionResponse | null>(null);

  // --------------------------------------------------
  // REAL INFERENCE HISTORY
  // --------------------------------------------------
  const [inferenceHistory, setInferenceHistory] = useState<InferenceHistoryItem[]>([]);

  // --------------------------------------------------
  // CHECK ML SERVER
  // --------------------------------------------------
  const pingServer = async () => {
    setServerStatus("checking");
    setErrorMessage(null);

    try {
      const health = (await mlService.checkHealth()) as MLHealthResponse;
      setServerStatus("online");
      if (health.model) {
        setServerModelName(health.model);
      }
    } catch {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    let mounted = true;

    mlService
      .checkHealth()
      .then((health: MLHealthResponse) => {
        if (!mounted) return;
        setServerStatus("online");
        if (health.model) {
          setServerModelName(health.model);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setServerStatus("offline");
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Synchronize live telemetry & ML inference state from Autonomous Engine
  useEffect(() => {
    const unsub = mlAutonomousService.subscribe((state: MLAutonomousState) => {
      setServerStatus(state.serverStatus);
      if (state.latestResult) {
        setLatestResult(state.latestResult);
      }
      setInferenceHistory(state.history);
      setLastInferenceTick(state.cycleCount);
      if (state.lastEmailSentTime) {
        setLastAlertSentTime(state.lastEmailSentTime);
      }
      if (isAutonomous) {
        setDcPower(String(state.currentInputs.dc));
        setAcPower(String(state.currentInputs.ac));
        setAmbientTemp(String(state.currentInputs.ambientTemp));
        setModuleTemp(String(state.currentInputs.moduleTemp));
        setIrradiation(String(state.currentInputs.irradiation));
        setHour(String(state.currentInputs.hour));
      }
    });

    return () => unsub();
  }, [isAutonomous]);

  const handleToggleAutonomous = () => {
    const next = !isAutonomous;
    setIsAutonomous(next);
    mlAutonomousService.setAutonomous(next);
  };

  // Simulate Fault Injection to test instant abnormal detection & database persistence
  const handleTestAbnormalAlert = async () => {
    setIsInjectingFault(true);
    setAlertDispatchToast("Simulating abnormal disparity: saving to RTDB /anomalies, /alerts & dispatching email...");
    mlAutonomousService.triggerTestAnomaly();
    setTimeout(() => {
      setIsInjectingFault(false);
      setAlertDispatchToast(null);
    }, 6000);
  };

  // --------------------------------------------------
  // REAL ML ANALYSIS
  // --------------------------------------------------
  const handleAnalyze = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setValidationError(null);
    setErrorMessage(null);

    if (
      dcPower.trim() === "" ||
      acPower.trim() === "" ||
      ambientTemp.trim() === "" ||
      moduleTemp.trim() === "" ||
      irradiation.trim() === "" ||
      hour.trim() === ""
    ) {
      setValidationError("All solar telemetry fields are required.");
      return;
    }

    const numDc = Number(dcPower);
    const numAc = Number(acPower);
    const numAmbient = Number(ambientTemp);
    const numModule = Number(moduleTemp);
    const numIrradiation = Number(irradiation);
    const numHour = Number(hour);

    const values = [numDc, numAc, numAmbient, numModule, numIrradiation, numHour];

    if (values.some((value) => !Number.isFinite(value))) {
      setValidationError("All values must be valid numbers.");
      return;
    }

    if (numDc < 0) {
      setValidationError("DC Power cannot be negative.");
      return;
    }

    if (numAc < 0) {
      setValidationError("AC Power cannot be negative.");
      return;
    }

    if (numIrradiation < 0) {
      setValidationError("Irradiation cannot be negative.");
      return;
    }

    if (numHour < 0 || numHour >= 24) {
      setValidationError("Hour must be between 0 and 23.99.");
      return;
    }

    if (numAmbient < -50 || numAmbient > 80) {
      setValidationError("Ambient temperature must be between -50°C and 80°C.");
      return;
    }

    if (numModule < -50 || numModule > 130) {
      setValidationError("Module temperature must be between -50°C and 130°C.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await mlAutonomousService.runInferenceCycle({
        dc: numDc,
        ac: numAc,
        ambientTemp: numAmbient,
        moduleTemp: numModule,
        irradiation: numIrradiation,
        hour: numHour,
      });

      if (result) {
        setLatestResult(result);
        setServerStatus("online");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to communicate with the Grid Guard ML server.";

      setErrorMessage(message);

      if (
        message.toLowerCase().includes("server") ||
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("fetch")
      ) {
        setServerStatus("offline");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedPage>
      {/* HEADER */}
      <PageHeader
        title="ML Anomaly Detection"
        subtitle="Real-time solar telemetry anomaly inference utilizing the trained Grid Guard Isolation Forest pipeline."
        category="Machine Learning Intelligence"
        isDemo={false}
      />

      {/* SERVER STATUS BANNER */}
      <section className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                serverStatus === "online"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : serverStatus === "offline"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
              }`}
            >
              <Bot size={22} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    serverStatus === "online"
                      ? "bg-emerald-400 animate-pulse"
                      : serverStatus === "offline"
                      ? "bg-red-400"
                      : "bg-cyan-400 animate-ping"
                  }`}
                />

                <h2 className="text-base font-bold text-white tracking-tight">
                  {serverStatus === "online"
                    ? `ML Inference Server Online — ${serverModelName}`
                    : serverStatus === "offline"
                    ? "ML Server Offline"
                    : "Connecting to Grid Guard ML API..."}
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Target Endpoint:{" "}
                <code className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-lime-400 font-mono text-[11px]">
                  {ML_API_URL}/predict
                </code>{" "}
                • Model Pipeline:{" "}
                <span className="text-slate-300 font-mono text-[11px]">
                  grid_guard_solar_model.joblib
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={pingServer}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white active:scale-95"
            >
              <RefreshCw
                size={13}
                className={serverStatus === "checking" ? "animate-spin" : ""}
              />
              <span>Ping Server</span>
            </button>

            <div
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold font-mono ${
                serverStatus === "online"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : serverStatus === "offline"
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
              }`}
            >
              {serverStatus === "online"
                ? "SERVER ONLINE"
                : serverStatus === "offline"
                ? "SERVER OFFLINE"
                : "CHECKING"}
            </div>
          </div>
        </div>

        {serverStatus === "offline" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">
                ML FastAPI service is not reachable on port 8000. Start the server via:
              </p>
              <p className="mt-1.5 text-slate-300 font-mono text-[11px] bg-slate-950/60 p-2 rounded-lg border border-red-500/20">
                cd ml-server &amp;&amp; python -m uvicorn app:app --reload --port 8000
              </p>
            </div>
          </div>
        )}
      </section>

      {/* KPI STAT CARDS */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Detection Status"
          value={latestResult ? latestResult.status : "Awaiting Run"}
          unit=""
          change={
            latestResult
              ? latestResult.status === "NORMAL"
                ? "Operating inside learned baseline"
                : "Anomalous telemetry detected"
              : "No inference run performed"
          }
          icon={
            latestResult ? (
              latestResult.status === "NORMAL" ? (
                <span className="text-xl">🟢</span>
              ) : (
                <span className="text-xl">🔴</span>
              )
            ) : (
              <Activity size={20} />
            )
          }
          animateNumeric={false}
          className={
            latestResult?.status === "ABNORMAL"
              ? "border-red-500/50 bg-red-950/20"
              : latestResult?.status === "NORMAL"
              ? "border-emerald-500/40 bg-emerald-950/20"
              : ""
          }
        />

        <StatCard
          title="Anomaly Score"
          value={
            latestResult
              ? `${latestResult.anomaly_score >= 0 ? "+" : ""}${latestResult.anomaly_score.toFixed(4)}`
              : "--"
          }
          unit=""
          change={
            latestResult
              ? latestResult.anomaly_score >= 0
                ? "Model inlier score (>= 0)"
                : "Model outlier score (< 0)"
              : "Awaiting calculation"
          }
          icon={<Gauge size={20} />}
          animateNumeric={false}
        />

        <StatCard
          title="Prediction Vector"
          value={latestResult ? (latestResult.prediction === 1 ? "+1 (Inlier)" : "-1 (Anomaly)") : "--"}
          unit=""
          change={
            latestResult
              ? latestResult.prediction === 1
                ? "+1 : Normal operating state"
                : "-1 : Outlier anomaly event"
              : "Awaiting calculation"
          }
          icon={<Sparkles size={20} />}
          animateNumeric={false}
        />

        <StatCard
          title="Classifier Architecture"
          value={serverModelName}
          unit=""
          change="Isolation Forest (contamination 5%)"
          icon={<Cpu size={20} />}
          animateNumeric={false}
        />
      </section>

      {/* INPUT FORM + DETECTION RESULT */}
      <section className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* INPUT TELEMETRY FORM */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
          {/* AUTONOMOUS STATUS & LIVE CONTROLS */}
          <div className="mb-6 rounded-2xl border border-lime-400/30 bg-gradient-to-r from-lime-400/10 via-[#07111F] to-emerald-500/10 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${
                      isAutonomous ? "bg-lime-400 animate-ping opacity-75" : "bg-slate-500"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${
                      isAutonomous ? "bg-lime-400" : "bg-slate-500"
                    }`}
                  />
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Autonomous Anomaly Monitoring</span>
                    <span className="rounded bg-lime-400/20 px-2 py-0.5 text-[10px] font-mono text-lime-300 border border-lime-400/30">
                      {isAutonomous ? "LIVE FEED ACTIVE" : "PAUSED (MANUAL)"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 font-mono">
                    <Mail size={12} className="text-lime-400" />
                    <span>
                      Auto-Mailing to:{" "}
                      <strong className="text-white">
                        {getStoredUser()?.email || "sriramkanuri4@gmail.com"}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAutonomous}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 border ${
                    isAutonomous
                      ? "border-lime-400/40 bg-lime-400/15 text-lime-300 hover:bg-lime-400/25"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {isAutonomous ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isAutonomous ? "Pause Auto Stream" : "Resume Auto Stream"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestAbnormalAlert}
                  disabled={isInjectingFault}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition active:scale-95 disabled:opacity-50"
                  title="Simulate an abnormal solar disparity to trigger ML anomaly detection, persist data in Firebase RTDB, and send alert email"
                >
                  <Flame size={12} className={isInjectingFault ? "animate-bounce" : ""} />
                  <span>{isInjectingFault ? "Simulating..." : "Simulate Anomaly Fault"}</span>
                </button>
              </div>
            </div>

            {/* Alert Dispatch Toast Notification */}
            {alertDispatchToast && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/70 p-2.5 text-xs text-rose-200 animate-pulse">
                <Bell size={14} className="text-rose-400 shrink-0" />
                <span className="font-semibold">{alertDispatchToast}</span>
              </div>
            )}
          </div>

          <div className="mb-6 border-b border-slate-800/60 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-lime-400">
                <Zap size={18} />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Solar Telemetry Input Parameters
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {isAutonomous
                  ? "Values update automatically every second from the microgrid telemetry engine. Zero manual entry needed."
                  : "Manual sandbox mode. Enter custom values below to evaluate edge cases."}
              </p>
            </div>

            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              Cycle #{lastInferenceTick}
            </span>
          </div>

          {validationError && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-300">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">{errorMessage}</p>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Ensure the FastAPI backend is running on port 8000.
                </p>
              </div>
            </div>
          )}

          <form id="solar-detection-form" onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* DC POWER */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>DC Power</span>
                  <span className="text-[10px] text-slate-400 font-mono">DC_POWER (W)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={dcPower}
                  onChange={(e) => setDcPower(e.target.value)}
                  placeholder="e.g. 4820"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>

              {/* AC POWER */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>AC Power</span>
                  <span className="text-[10px] text-slate-400 font-mono">AC_POWER (W)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={acPower}
                  onChange={(e) => setAcPower(e.target.value)}
                  placeholder="e.g. 4580"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>

              {/* AMBIENT TEMPERATURE */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Ambient Temperature</span>
                  <span className="text-[10px] text-slate-400 font-mono">AMBIENT_TEMPERATURE (°C)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(e.target.value)}
                  placeholder="e.g. 28.5"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>

              {/* MODULE TEMPERATURE */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Module Temperature</span>
                  <span className="text-[10px] text-slate-400 font-mono">MODULE_TEMPERATURE (°C)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={moduleTemp}
                  onChange={(e) => setModuleTemp(e.target.value)}
                  placeholder="e.g. 42.0"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>

              {/* IRRADIATION */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Solar Irradiation</span>
                  <span className="text-[10px] text-slate-400 font-mono">IRRADIATION (kW/m²)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={irradiation}
                  onChange={(e) => setIrradiation(e.target.value)}
                  placeholder="e.g. 0.78"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>

              {/* HOUR */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Hour of Day</span>
                  <span className="text-[10px] text-slate-400 font-mono">24H FORMAT (0 - 23.99)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="23.99"
                  required
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  placeholder="e.g. 13.5"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Executing ML Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Run Anomaly Detection Inference</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* DETECTION RESULT CARD */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-5">
              <div className="flex items-center gap-2 text-lime-400">
                <Cpu size={18} />
                <h2 className="text-base font-bold tracking-tight text-white">Detection Output</h2>
              </div>
              <span className="rounded-lg border border-slate-800 bg-[#07111F] px-2.5 py-1 text-[11px] text-slate-400 font-mono">
                {serverModelName}
              </span>
            </div>

            {latestResult ? (
              <div className="space-y-4">
                {/* STATUS BADGE CONTAINER */}
                <div
                  className={`rounded-2xl border p-5 shadow-lg ${
                    latestResult.status === "NORMAL"
                      ? "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/20"
                      : "border-red-500/40 bg-red-950/20 shadow-red-950/20"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    System State
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {latestResult.status === "NORMAL" ? "🟢" : "🔴"}
                    </span>

                    <div>
                      <h3
                        className={`text-2xl font-black tracking-wider font-mono ${
                          latestResult.status === "NORMAL"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {latestResult.status}
                      </h3>
                      <p className="text-xs text-slate-200 mt-0.5">{latestResult.message}</p>
                    </div>
                  </div>
                </div>

                {/* DETAILS TABLE */}
                <div className="rounded-xl border border-slate-800/80 bg-[#07111F]/80 p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Anomaly Score:</span>
                    <span
                      className={`font-bold ${
                        latestResult.anomaly_score >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {latestResult.anomaly_score >= 0 ? "+" : ""}
                      {latestResult.anomaly_score.toFixed(5)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                    <span className="text-slate-400 font-sans">Model Prediction:</span>
                    <span className="font-bold text-white">
                      {latestResult.prediction} ({latestResult.prediction === 1 ? "Inlier" : "Anomaly"})
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                    <span className="text-slate-400 font-sans">Timestamp:</span>
                    <span className="text-slate-300">
                      {latestResult.timestamp || "Just now"}
                    </span>
                  </div>
                </div>

                {/* AUTOMATED EMAIL DISPATCH STATUS BOX */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Mail size={13} className="text-amber-400" />
                      <span>Automated Anomaly Alerting:</span>
                    </span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Armed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-800/60 pt-1.5">
                    <span>Target:</span>
                    <span className="text-slate-200">{getStoredUser()?.email || "sriramkanuri4@gmail.com"}</span>
                  </div>
                  {lastAlertSentTime && (
                    <div className="flex items-center justify-between text-[11px] text-rose-300 font-mono border-t border-slate-800/60 pt-1.5">
                      <span>Last Alert:</span>
                      <span className="font-bold">{lastAlertSentTime}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#07111F]/50 p-10 text-center flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-700/80">
                  <Activity size={22} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Awaiting Telemetry Inference</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Enter telemetry parameters on the left and trigger inference to evaluate current solar generation.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Model File:</span>
            <code className="text-slate-400 font-mono">grid_guard_solar_model.joblib</code>
          </div>
        </div>
      </section>

      {/* FEATURE ENGINEERING OVERVIEW */}
      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2 text-lime-400">
          <Layers size={18} />
          <h2 className="text-base font-bold tracking-tight text-white">
            Feature Transformation Pipeline
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          FastAPI transforms the 6 telemetry inputs into cyclically encoded and scaled vectors before passing to the scikit-learn estimator.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-4">
            <span className="text-lime-400 font-bold text-[11px]">HOUR_SIN / HOUR_COS</span>
            <p className="mt-1.5 text-xs text-slate-300 font-sans">
              Cyclical harmonic 24h sine/cosine projection.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-4">
            <span className="text-lime-400 font-bold text-[11px]">AC_DC_RATIO</span>
            <p className="mt-1.5 text-xs text-slate-300 font-sans">
              Instantaneous inverter conversion efficiency.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-4">
            <span className="text-lime-400 font-bold text-[11px]">POWER_PER_IRRADIANCE</span>
            <p className="mt-1.5 text-xs text-slate-300 font-sans">
              Active power density per kW/m² irradiance.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-4">
            <span className="text-lime-400 font-bold text-[11px]">STANDARD_SCALER</span>
            <p className="mt-1.5 text-xs text-slate-300 font-sans">
              Z-score normalization parameters learned from training.
            </p>
          </div>
        </div>
      </section>

      {/* REAL INFERENCE HISTORY */}
      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
              Recent Telemetry Inferences
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Session execution history for real-time model runs.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {inferenceHistory.length} Record{inferenceHistory.length !== 1 ? "s" : ""}
          </span>
        </div>

        {inferenceHistory.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-[#07111F]/40 p-8 text-center">
            <Activity size={24} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">No session inferences recorded yet.</p>
            <p className="mt-1 text-xs text-slate-600">
              Submit the form above to evaluate telemetry and log inferences.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">DC / AC Power</th>
                  <th className="py-3 px-4">Irradiance / Temp</th>
                  <th className="py-3 px-4">Prediction</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {inferenceHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-400">{item.timestamp}</td>
                    <td className="py-3 px-4 text-white">
                      {item.inputs.dc} W / {item.inputs.ac} W
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {item.inputs.irradiation} • {item.inputs.ambientTemp}°C / {item.inputs.moduleTemp}°C
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {item.prediction === 1 ? (
                        <span className="text-emerald-400">+1</span>
                      ) : (
                        <span className="text-red-400">-1</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "NORMAL"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {item.status === "NORMAL" ? "🟢 NORMAL" : "🔴 ABNORMAL"}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        item.anomalyScore >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {item.anomalyScore >= 0 ? "+" : ""}
                      {item.anomalyScore.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AnimatedPage>
  );
}