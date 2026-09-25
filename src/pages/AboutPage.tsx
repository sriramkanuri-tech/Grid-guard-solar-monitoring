import { Link } from "react-router-dom";
import {
  Sun,
  Shield,
  Activity,
  Cpu,
  Radio,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Hero / Header */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="pointer-events-none absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-lime-400/10 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
            <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
            <span>Industrial Solar Telemetry</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
            Protecting clean energy microgrids with{" "}
            <span className="bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
              intelligent telemetry.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
            Grid Guard is an end-to-end solar monitoring and grid protection platform engineered to
            bridge renewable generation hardware, high-frequency sensor telemetry, and
            machine-learning-assisted grid stability.
          </p>
        </div>
      </section>

      {/* Core Mission Cards */}
      <section className="border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-20 bg-[#07111F]/30">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-7 shadow-xl backdrop-blur-xl transition hover:border-lime-400/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Sun size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Solar Generation</h3>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-400">
                Continuous real-time tracking of PV panel arrays, string-level power yield, inverter
                performance, and daily cumulative kWh generation.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-7 shadow-xl backdrop-blur-xl transition hover:border-lime-400/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Shield size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Grid Protection</h3>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-400">
                High-fidelity monitoring of grid voltage, frequency, power factor, and harmonics to
                detect anti-islanding states and prevent severe electrical equipment damage.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 p-7 shadow-xl backdrop-blur-xl transition hover:border-lime-400/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Activity size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Predictive Intelligence</h3>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-400">
                Integration framework for machine learning models to detect micro-faults,
                temperature overheating, and generation degradation before failures occur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Overview */}
      <section className="border-t border-slate-800/80 bg-[#030712] px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
              System Architecture
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl text-white">
              From Physical Silicon to Cloud Dashboard
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Built with open protocols for flexible microgrid and industrial deployment.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/70 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-lime-400 mb-3">
                <Cpu size={20} />
                <span className="font-bold text-white text-sm">Edge Sensors</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                ESP32 &amp; STM32 microcontrollers collecting AC/DC voltage, current, temperature,
                and irradiance via ADC and I2C sensors.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/70 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-lime-400 mb-3">
                <Radio size={20} />
                <span className="font-bold text-white text-sm">Protocols</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Low-latency telemetry through HTTP REST endpoints, MQTT brokers, and direct
                Firebase Firestore realtime synchronization.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/70 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-lime-400 mb-3">
                <Zap size={20} />
                <span className="font-bold text-white text-sm">Cloud Engine</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Firebase Authentication, Firestore document store, and automated threshold
                listeners for instantaneous alert triggers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0B1628]/70 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-lime-400 mb-3">
                <CheckCircle2 size={20} />
                <span className="font-bold text-white text-sm">Operator Console</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Responsive React + Tailwind interface delivering real-time reactive updates,
                historical charts, and automated fault alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-20 text-center bg-[#07111F]/50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold sm:text-4xl text-white">
            Ready to explore your energy telemetry?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-300">
            Sign in to your Grid Guard account to access live generation analytics and grid status.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-md shadow-lime-500/20 transition hover:bg-lime-400 active:scale-[0.98]"
            >
              <span>Open Dashboard</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/"
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white active:scale-[0.98]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-slate-500 bg-[#030712]">
        © 2026 Grid Guard Solar Monitoring. All rights reserved.
      </footer>
    </div>
  );
}
