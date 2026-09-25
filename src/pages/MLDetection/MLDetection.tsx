import { useState } from "react";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import { Bot, Cpu, CheckCircle2, Sparkles } from "lucide-react";

export default function MLDetection() {
  const [apiEndpoint, setApiEndpoint] = useState("https://api.gridguard.internal/v1/anomaly");
  const [modelType, setModelType] = useState("autoencoder");
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const anomalies = [
    {
      id: "anom-1",
      timestamp: "10 mins ago",
      type: "Voltage Sag Micro-Transient",
      score: 18,
      confidence: 96,
      prediction: "Transient Disturbance",
      severity: "low",
    },
    {
      id: "anom-2",
      timestamp: "1 hour ago",
      type: "PV String 2 Inversion Drift",
      score: 34,
      confidence: 91,
      prediction: "Partial Shading Anomaly",
      severity: "medium",
    },
    {
      id: "anom-3",
      timestamp: "3 hours ago",
      type: "Thermal Imbalance in Inverter A",
      score: 22,
      confidence: 94,
      prediction: "Cooling Fan Lag",
      severity: "low",
    },
  ];

  return (
    <AnimatedPage>
      <PageHeader
        title="ML Anomaly Detection"
        subtitle="Machine learning telemetry inference, anomaly probability, and confidence scoring"
        category="Intelligence"
        isDemo={true}
      />

      {/* Demo Notice Banner */}
      <section className="animate-item rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                <h2 className="text-base font-bold text-white">
                  ML Detection Demo — No External ML Inference API Connected
                </h2>
              </div>
              <p className="mt-1 text-xs text-sky-200/80">
                Notice: Synthetic anomaly values are currently displayed for demonstration.
                Configure a production TensorFlow/PyTorch REST endpoint below to stream real inferences.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-400/30 bg-sky-400/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300">
            ML Detection Demo
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Prediction"
          value="Normal"
          unit=""
          change="Operating inside baseline"
          icon="🟢"
          animateNumeric={false}
        />

        <StatCard
          title="Anomaly Score"
          value={12}
          decimals={0}
          unit="%"
          change="Low probability (safe < 25%)"
          icon="📊"
        />

        <StatCard
          title="Confidence"
          value={94}
          decimals={0}
          unit="%"
          change="High inference confidence"
          icon="🎯"
        />

        <StatCard
          title="Model Health"
          value={92.4}
          decimals={1}
          unit="%"
          change="Autoencoder reconstruction error: 0.012"
          icon="🧠"
        />
      </section>

      {/* Middle Section: Anomaly Scores Distribution & Live Prediction Feed */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Anomaly Score Gauge Card */}
        <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Anomaly Likelihood Curve</h2>
            <span className="rounded-lg bg-lime-400/10 px-2.5 py-1 text-xs text-lime-400 font-medium">
              Score: 12%
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-6">
            Isolation forest outlier scoring across 14-dimensional electrical parameters.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Voltage Waveform Deviation</span>
                <span className="text-lime-400 font-semibold">8%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400" style={{ width: "8%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Current Harmonic Distortion (THD)</span>
                <span className="text-lime-400 font-semibold">14%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400" style={{ width: "14%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Thermal Gradient Anomaly</span>
                <span className="text-lime-400 font-semibold">11%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400" style={{ width: "11%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Phase Angle Sync Anomaly</span>
                <span className="text-lime-400 font-semibold">5%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400" style={{ width: "5%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Future ML API Configuration Card */}
        <div className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <Cpu size={20} />
            <h2 className="font-semibold text-white">ML API Pipeline Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Connect an external TensorFlow Serving, Triton, or FastAPI inference microservice.
          </p>

          <form onSubmit={handleSaveApi} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Inference Endpoint URL
              </label>
              <input
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://ml.yourdomain.com/v1/predict"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Model Architecture
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
              >
                <option value="autoencoder">Variational Autoencoder (Reconstruction Loss)</option>
                <option value="isolation_forest">Isolation Forest (Outlier Ensemble)</option>
                <option value="lstm">LSTM Time-Series Anomaly Forecaster</option>
                <option value="xgboost">XGBoost Multi-Class Fault Classifier</option>
              </select>
            </div>

            {isSaved && (
              <div className="flex items-center gap-2 rounded-xl border border-lime-400/20 bg-lime-400/10 p-3 text-xs text-lime-300">
                <CheckCircle2 size={16} />
                <span>ML pipeline endpoint saved. Ready for live API connection.</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-lime-300"
            >
              <Sparkles size={16} />
              Update ML Pipeline Config
            </button>
          </form>
        </div>
      </section>

      {/* Recent Anomalies Table */}
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">Recent Telemetry Inferences</h2>
        <p className="mt-1 text-xs text-slate-500">Historical pattern scans and anomaly flags</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Anomaly Event</th>
                <th className="py-3 px-4">Prediction</th>
                <th className="py-3 px-4">Anomaly Score</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {anomalies.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 text-slate-400">{item.timestamp}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{item.type}</td>
                  <td className="py-3.5 px-4 text-slate-300">{item.prediction}</td>
                  <td className="py-3.5 px-4 font-semibold text-lime-400">{item.score}%</td>
                  <td className="py-3.5 px-4 text-slate-300">{item.confidence}%</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.severity === "medium"
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedPage>
  );
}
