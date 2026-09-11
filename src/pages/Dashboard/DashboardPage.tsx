import { useState } from "react";
import DashboardSidebar from "../../components/DashboardSidebar";
import DashboardHeader from "../../components/DashboardHeader";
import StatCard from "../../components/StatCard";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  let user = { name: "User" };

  try {
    const storedUser = localStorage.getItem("gridguard_user");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch {
    user = { name: "User" };
  }

  const firstName = user.name?.split(" ")[0] || "User";

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="lg:ml-64">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="p-5 sm:p-8">
          <section className="mb-8">
            <p className="text-sm text-slate-500">
              Good morning,
            </p>

            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              Welcome back,{" "}
              <span className="text-lime-400">
                {firstName}
              </span>{" "}
              👋
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Monitor your solar energy and grid performance.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Solar Power"
              value="4.82"
              unit="kW"
              change="↑ 12.4% from yesterday"
              icon="☀️"
            />

            <StatCard
              title="Energy Today"
              value="45.2"
              unit="kWh"
              change="↑ 8.7% from yesterday"
              icon="⚡"
            />

            <StatCard
              title="Grid Voltage"
              value="230.4"
              unit="V"
              change="Within safe range"
              icon="🔌"
            />

            <StatCard
              title="Battery"
              value="82"
              unit="%"
              change="Charging normally"
              icon="🔋"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    Energy Generation
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Solar production today
                  </p>
                </div>

                <span className="rounded-lg bg-lime-400/10 px-3 py-2 text-xs text-lime-400">
                  Live
                </span>
              </div>

              <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">
                {[25, 35, 42, 55, 70, 62, 78, 88, 75, 92, 82, 96].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex h-full flex-1 items-end"
                    >
                      <div
                        className="w-full rounded-t-lg bg-lime-400/70 transition hover:bg-lime-400"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ),
                )}
              </div>

              <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                <span>6 AM</span>
                <span>9 AM</span>
                <span>12 PM</span>
                <span>3 PM</span>
                <span>6 PM</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="font-semibold">System Health</h2>

              <p className="mt-1 text-xs text-slate-500">
                Current operating condition
              </p>

              <div className="mt-6 space-y-4">
                <HealthRow
                  label="Grid Status"
                  value="ONLINE"
                  good
                />

                <HealthRow
                  label="Frequency"
                  value="50.01 Hz"
                />

                <HealthRow
                  label="Power Factor"
                  value="0.96"
                />

                <HealthRow
                  label="Temperature"
                  value="42.5 °C"
                />

                <HealthRow
                  label="Efficiency"
                  value="91.8%"
                  good
                />
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">
                    Overall Health
                  </span>

                  <span className="text-lime-400">
                    96%
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div className="h-full w-[96%] rounded-full bg-lime-400" />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Active Alerts"
              value="2"
              description="1 warning requires attention"
              valueClass="text-orange-400"
            />

            <SummaryCard
              title="ML System Status"
              value="92.4%"
              description="Normal operation probability"
              valueClass="text-lime-400"
            />

            <SummaryCard
              title="CO₂ Saved Today"
              value="18.6 kg"
              description="Through clean solar generation"
              valueClass="text-white"
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function HealthRow({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-3">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span
        className={`text-sm font-semibold ${
          good ? "text-lime-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  valueClass,
}: {
  title: string;
  value: string;
  description: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <p className="text-sm text-slate-400">{title}</p>

      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}