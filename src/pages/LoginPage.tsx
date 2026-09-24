import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const savedAccount = localStorage.getItem("gridguard_account");

    if (!savedAccount) {
      setError("No account found. Please create an account first.");
      return;
    }

    let account;

    try {
      account = JSON.parse(savedAccount);
    } catch {
      setError("Unable to read account information.");
      return;
    }

    if (
      account.email.toLowerCase() !== email.trim().toLowerCase() ||
      account.password !== password
    ) {
      setError("Invalid email or password.");
      return;
    }

    localStorage.setItem(
      "gridguard_user",
      JSON.stringify({
        name: account.name,
        email: account.email,
      }),
    );

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT PANEL */}
        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950" />

          <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-center px-16 xl:px-24">

            {/* LOGO */}
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400">
                <Sun className="h-7 w-7 text-slate-950" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Grid Guard
                </h1>

                <p className="text-xs tracking-[0.25em] text-lime-400">
                  SOLAR MONITORING
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-lime-400">
              Smart Energy Platform
            </p>

            <h2 className="max-w-xl text-5xl font-bold leading-tight xl:text-6xl">
              Protect your grid.
              <br />

              <span className="text-lime-400">
                Power your future.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
              Monitor solar generation, grid conditions and energy
              performance from one intelligent platform.
            </p>

            {/* STATS */}
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <Zap
                  className="mb-3 text-lime-400"
                  size={22}
                />

                <p className="text-2xl font-bold">
                  45.2 kWh
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Energy Generated
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <Activity
                  className="mb-3 text-lime-400"
                  size={22}
                />

                <p className="text-2xl font-bold">
                  99.9%
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  System Reliability
                </p>
              </div>

            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
              <ShieldCheck
                size={18}
                className="text-lime-400"
              />

              Secure solar monitoring environment
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex items-center justify-center px-6 py-12">

          <div className="w-full max-w-md">

            {/* MOBILE LOGO */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400">
                <Sun
                  className="text-slate-950"
                  size={24}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Grid Guard
                </h1>

                <p className="text-[9px] tracking-widest text-lime-400">
                  SOLAR MONITORING
                </p>
              </div>
            </div>

            {/* LOGIN HEADER */}
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
                <ShieldCheck
                  className="text-lime-400"
                  size={28}
                />
              </div>

              <h1 className="text-3xl font-bold">
                Welcome back
              </h1>

              <p className="mt-2 text-slate-400">
                Sign in to continue to Grid Guard
              </p>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 font-semibold text-slate-950 transition hover:bg-lime-300"
              >
                Sign in

                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </button>
            </form>

            {/* REGISTER */}
            <p className="mt-8 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}

              <Link
                to="/register"
                className="font-semibold text-lime-400 hover:text-lime-300"
              >
                Create account
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}