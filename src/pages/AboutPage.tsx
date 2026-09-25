import { Link } from "react-router-dom";
import {
  Sun,
  Shield,
  Zap,
  Activity,
  Cpu,
  Radio,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero / Header */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute left-1/3 top-10 h-80 w-80 rounded-full bg-lime-400/10 blur-[130px]" />
        <div className="absolute right-10 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-[130px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
            About Grid Guard
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Protecting clean power grids with{" "}
            <span className="text-lime-400">intelligent telemetry.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Grid Guard is an end-to-end solar monitoring and grid protection platform
            engineered to bridge renewable energy generation, high-frequency sensor telemetry,
            and machine-learning-assisted grid stability.
          </p>
        </div>
      </section>

      {/* Core Mission Cards */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
                <Sun size={26} />
              </div>
              <h3 className="mt-6 text-xl font-bold">Solar Generation</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Continuous real-time tracking of PV panel arrays, string-level power yield,
                inverter performance, and daily cumulative kWh generation.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
                <Shield size={26} />
              </div>
              <h3 className="mt-6 text-xl font-bold">Grid Protection</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                High-fidelity monitoring of grid voltage, frequency, power factor, and harmonics
                to detect anti-islanding states and prevent severe electrical equipment damage.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
                <Activity size={26} />
              </div>
              <h3 className="mt-6 text-xl font-bold">Predictive Intelligence</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Integration framework for machine learning models to detect micro-faults,
                temperature overheating, and generation degradation before failures occur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Overview */}
      <section className="border-t border-white/5 bg-white/[0.015] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
              System Architecture
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              From Physical Silicon to Cloud Dashboard
            </h2>
            <p className="mt-4 text-slate-400">
              Built with open protocols for flexible microgrid and industrial deployment.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-lime-400 mb-4">
                <Cpu size={22} />
                <span className="font-semibold text-white">Edge Sensors</span>
              </div>
              <p className="text-xs leading-6 text-slate-400">
                ESP32 & STM32 microcontrollers collecting AC/DC voltage, current, temperature,
                and ambient pressure via ADC & I2C sensors.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-lime-400 mb-4">
                <Radio size={22} />
                <span className="font-semibold text-white">Protocols</span>
              </div>
              <p className="text-xs leading-6 text-slate-400">
                Ultra-low latency telemetry through HTTP REST endpoints, MQTT brokers, and
                direct Firebase Firestore realtime synchronization.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-lime-400 mb-4">
                <Zap size={22} />
                <span className="font-semibold text-white">Cloud Engine</span>
              </div>
              <p className="text-xs leading-6 text-slate-400">
                Firebase Authentication, Firestore document store, and automated threshold
                listeners for instantaneous alert triggers.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 text-lime-400 mb-4">
                <CheckCircle2 size={22} />
                <span className="font-semibold text-white">Operator Console</span>
              </div>
              <p className="text-xs leading-6 text-slate-400">
                Responsive React + Tailwind interface delivering real-time reactive updates,
                historical charts, and automated fault alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-white/5 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to explore your energy telemetry?
          </h2>
          <p className="mt-4 text-slate-400">
            Sign in to your Grid Guard account to access live generation analytics and grid status.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-lime-300"
            >
              Open Dashboard
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/"
              className="rounded-xl border border-white/10 px-6 py-3.5 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-600">
        © 2026 Grid Guard Solar Monitoring. All rights reserved.
      </footer>
    </div>
  );
}
