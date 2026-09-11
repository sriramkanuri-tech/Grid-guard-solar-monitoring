import Navbar from "../components/Navbar";

export default function HomePage() {
  const isLoggedIn = localStorage.getItem("gridguard_user") !== null;

  const user = JSON.parse(
    localStorage.getItem("gridguard_user") || "{}"
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <Navbar />

      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24"
      >

        {/* GRID BACKGROUND */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* GLOWS */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-lime-400/10 blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">

          {/* LEFT */}
          <div>

            {/* BADGE */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-sm text-lime-300">

              <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />

              Smart Solar & Grid Monitoring

            </div>

            {/* TITLE */}
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">

              Protect the grid.

              <br />

              <span className="text-lime-400">
                Power the future.
              </span>

            </h1>

            {/* DESCRIPTION */}
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Grid Guard is a smart solar energy monitoring platform
              designed to monitor renewable energy generation, analyze
              grid conditions and identify abnormal system behavior.
            </p>

            {/* BUTTONS */}
            <div className="mt-9 flex flex-wrap gap-4">

              {isLoggedIn ? (
                <a
                  href="#features"
                  className="group flex items-center gap-3 rounded-xl bg-lime-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-lime-300"
                >
                  Explore Grid Guard

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    <path
                      d="M5 12H19M13 6L19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : (
                <>
                  <a
                    href="#about"
                    className="group flex items-center gap-3 rounded-xl bg-lime-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-lime-300"
                  >
                    Learn More

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      <path
                        d="M5 12H19M13 6L19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>

                  <a
                    href="#features"
                    className="rounded-xl border border-white/10 px-6 py-3.5 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    View Features
                  </a>
                </>
              )}

            </div>

            {/* USER MESSAGE */}
            {isLoggedIn && (
              <p className="mt-6 text-sm text-slate-500">
                Welcome back,{" "}
                <span className="font-medium text-lime-400">
                  {user.name}
                </span>
                .
              </p>
            )}

          </div>

          {/* RIGHT VISUAL */}
          <div className="relative hidden lg:block">

            {/* MAIN CARD */}
            <div className="relative mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">

              {/* CARD HEADER */}
              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm text-slate-500">
                    Grid Guard
                  </p>

                  <h3 className="mt-1 text-xl font-semibold">
                    Energy Overview
                  </h3>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-1.5 text-xs text-lime-400">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />

                  Live

                </div>

              </div>

              {/* POWER */}
              <div className="mt-8 rounded-2xl border border-white/5 bg-slate-950/60 p-6">

                <p className="text-sm text-slate-500">
                  Current Solar Power
                </p>

                <div className="mt-2 flex items-end gap-2">

                  <span className="text-4xl font-bold">
                    4.82
                  </span>

                  <span className="mb-1 text-slate-500">
                    kW
                  </span>

                </div>

                {/* GRAPH */}
                <div className="mt-7 flex h-28 items-end gap-2">

                  {[35, 48, 43, 61, 57, 72, 65, 80, 74, 91, 82, 95].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex h-full flex-1 items-end"
                      >
                        <div
                          style={{ height: `${height}%` }}
                          className="w-full rounded-t-md bg-lime-400/30 transition hover:bg-lime-400"
                        />
                      </div>
                    )
                  )}

                </div>

              </div>

              {/* SMALL CARDS */}
              <div className="mt-4 grid grid-cols-2 gap-4">

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">

                  <p className="text-xs text-slate-500">
                    Energy Generated
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    45.2
                    <span className="ml-1 text-sm text-slate-500">
                      kWh
                    </span>
                  </p>

                  <p className="mt-2 text-xs text-lime-400">
                    +12.4% today
                  </p>

                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">

                  <p className="text-xs text-slate-500">
                    Grid Status
                  </p>

                  <div className="mt-3 flex items-center gap-2">

                    <span className="h-2.5 w-2.5 rounded-full bg-lime-400" />

                    <span className="font-semibold">
                      Stable
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    System normal
                  </p>

                </div>

              </div>

            </div>

            {/* FLOATING CARD */}
            <div className="absolute -bottom-8 -left-12 rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl">

              <p className="text-xs text-slate-500">
                CO₂ Reduction
              </p>

              <p className="mt-1 text-2xl font-bold text-lime-400">
                18.6 kg
              </p>

              <p className="text-xs text-slate-500">
                Saved today
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ===================================================== */}
      {/* PROJECT INTRODUCTION */}
      {/* ===================================================== */}

      <section
        id="about"
        className="border-t border-white/5 px-6 py-24"
      >

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            {/* TEXT */}
            <div>

              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
                About Grid Guard
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                Intelligent monitoring for a
                <span className="text-lime-400">
                  {" "}cleaner energy future.
                </span>
              </h2>

              <p className="mt-6 leading-8 text-slate-400">
                Grid Guard is a smart energy monitoring and grid
                protection project focused on renewable energy systems.
                The platform provides users with a centralized way to
                understand solar energy generation, grid conditions
                and system performance.
              </p>

              <p className="mt-5 leading-8 text-slate-500">
                The system can collect electrical parameters from
                sensors, process the information and present meaningful
                insights through a modern web interface. Machine
                learning can also be integrated to identify abnormal
                conditions and predict energy behavior.
              </p>

            </div>

            {/* INFO CARDS */}
            <div className="grid gap-5 sm:grid-cols-2">

              <InfoCard
                number="01"
                title="Monitor"
                text="Track solar generation and electrical parameters."
              />

              <InfoCard
                number="02"
                title="Analyze"
                text="Analyze system behavior and energy performance."
              />

              <InfoCard
                number="03"
                title="Detect"
                text="Identify abnormal conditions and potential faults."
              />

              <InfoCard
                number="04"
                title="Improve"
                text="Use insights to make energy systems smarter."
              />

            </div>

          </div>

        </div>

      </section>

      {/* ===================================================== */}
      {/* FEATURES */}
      {/* ===================================================== */}

      <section
        id="features"
        className="border-y border-white/5 bg-white/[0.02] px-6 py-24"
      >

        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
              Platform Features
            </p>

            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              Everything in one place.
            </h2>

            <p className="mt-5 leading-7 text-slate-500">
              Grid Guard brings monitoring, analysis and intelligent
              energy insights together in a single platform.
            </p>

          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            <FeatureCard
              icon="◉"
              title="Real-Time Monitoring"
              text="Monitor solar generation and electrical parameters with live system information."
            />

            <FeatureCard
              icon="⚡"
              title="Energy Analytics"
              text="Understand energy production, power usage and system efficiency."
            />

            <FeatureCard
              icon="◆"
              title="Grid Protection"
              text="Identify abnormal grid conditions and provide warnings when required."
            />

            <FeatureCard
              icon="⌁"
              title="Fault Detection"
              text="Detect unusual operating patterns using system and sensor data."
            />

            <FeatureCard
              icon="✦"
              title="ML Intelligence"
              text="Integrate machine learning for anomaly detection and energy prediction."
            />

            <FeatureCard
              icon="♧"
              title="Environmental Insights"
              text="Track renewable energy contribution and estimated carbon reduction."
            />

          </div>

        </div>

      </section>

      {/* ===================================================== */}
      {/* HOW IT WORKS */}
      {/* ===================================================== */}

      <section className="px-6 py-24">

        <div className="mx-auto max-w-7xl">

          <div className="max-w-2xl">

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
              How It Works
            </p>

            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              From sensor to insight.
            </h2>

          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">

            <Step
              number="01"
              title="Collect"
              text="Sensors collect electrical and energy parameters from the system."
            />

            <Step
              number="02"
              title="Process"
              text="The collected information is processed and prepared for analysis."
            />

            <Step
              number="03"
              title="Analyze"
              text="Rules or machine learning models analyze the incoming data."
            />

            <Step
              number="04"
              title="Visualize"
              text="Important information and alerts are presented through the dashboard."
            />

          </div>

        </div>

      </section>

      {/* ===================================================== */}
      {/* CONTACT */}
      {/* ===================================================== */}

      <section
        id="contact"
        className="border-t border-white/5 bg-white/[0.02] px-6 py-24"
      >

        <div className="mx-auto max-w-5xl">

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-8 text-center sm:p-12">

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
              Contact Us
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              Have a question?
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-500">
              Interested in Grid Guard or want to know more about the
              project? Get in touch with us.
            </p>

            <a
              href="mailto:sriramkanuri04@gmail.com"
              className="mx-auto mt-8 inline-flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/10 px-6 py-4 text-lime-400 transition hover:bg-lime-400/20"
            >

              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

                <path
                  d="M4 7L12 13L20 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              sriramkanuri04@gmail.com

            </a>

          </div>

        </div>

      </section>

      {/* ===================================================== */}
      {/* FOOTER */}
      {/* ===================================================== */}

      <footer className="border-t border-white/10 px-6 py-10">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400">

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-slate-950"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    fill="currentColor"
                  />

                  <path
                    d="M12 2V5M12 19V22M2 12H5M19 12H22"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

              </div>

              <span className="font-semibold">
                Grid Guard
              </span>

            </div>

            <p className="mt-3 text-sm text-slate-600">
              Smart Solar & Grid Monitoring
            </p>

          </div>

          <div className="text-sm text-slate-600">
            © 2026 Grid Guard. All rights reserved.
          </div>

        </div>

      </footer>

    </div>
  );
}

/* ========================================================= */
/* INFO CARD */
/* ========================================================= */

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30">

      <span className="text-xs font-semibold tracking-widest text-lime-400">
        {number}
      </span>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* ========================================================= */
/* FEATURE CARD */
/* ========================================================= */

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-slate-950/70 p-7 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-xl text-lime-400">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* ========================================================= */
/* STEP */
/* ========================================================= */

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-7">

      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lime-400 font-bold text-slate-950">
        {number}
      </div>

      <h3 className="mt-6 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-500">
        {text}
      </p>

    </div>
  );
}