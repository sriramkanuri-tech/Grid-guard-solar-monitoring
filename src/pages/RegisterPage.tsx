import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Shield,
  Zap,
  Activity,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { registerUser, isConfiguredAdminEmail } from "../firebase/auth";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const profile = await registerUser(email, password, name, phone, isAdmin);
      if (profile.role === "admin" || isConfiguredAdminEmail(profile.email)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient solar glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-lime-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-[#0B1628]/80 shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12">
        {/* LEFT INFORMATION PANEL */}
        <div className="lg:col-span-5 relative hidden overflow-hidden bg-gradient-to-br from-emerald-950/40 via-[#07111F] to-[#030712] p-8 sm:p-12 lg:flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-md shadow-lime-400/20">
                <Sun className="h-6 w-6 stroke-[2.4]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">GRID GUARD</h1>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-lime-400">
                  Solar Monitoring
                </p>
              </div>
            </div>

            <div className="mt-12">
              <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-lime-400">
                Operator Onboarding
              </span>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Deploy intelligence across your solar arrays.
              </h2>

              <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Create an authenticated operator account to provision hardware sensor endpoints,
                configure islanding thresholds, and activate ML telemetry.
              </p>

              <div className="mt-8 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-lime-400" />
                  <span>Real-time PV generation &amp; inverter diagnostics</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-lime-400" />
                  <span>Sub-second anti-islanding trip detection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-lime-400" />
                  <span>Isolation Forest anomaly classification</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400 flex items-center gap-2">
            <Shield size={14} className="text-lime-400" />
            <span>Encrypted credentials &amp; role-based access control</span>
          </div>
        </div>

        {/* RIGHT REGISTRATION FORM */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          {/* MOBILE LOGO */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950">
              <Sun size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Grid Guard</h1>
              <p className="text-[9px] uppercase tracking-widest text-lime-400">Solar Monitoring</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">Register Operator Account</h2>
            <p className="mt-1 text-xs text-slate-400">
              Complete the profile details below to establish your monitoring session.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FULL NAME */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Full Name *
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sriram Kanuri"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            {/* EMAIL & PHONE GRID */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@gridguard.io"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>
            </div>

            {/* PASSWORD & CONFIRM PASSWORD GRID */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* PASSWORD REQUIREMENTS CHIPS */}
            <div className="rounded-xl border border-slate-800 bg-[#07111F]/60 p-3 text-[11px]">
              <p className="text-slate-400 font-semibold mb-2">Password Requirements</p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono ${
                    password.length >= 6
                      ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                      : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  ✓ 6+ chars
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono ${
                    /[A-Z]/.test(password)
                      ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                      : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  ✓ Uppercase
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono ${
                    /[0-9]/.test(password)
                      ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                      : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  ✓ Number
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono ${
                    password.length > 0 && password === confirmPassword
                      ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                      : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  ✓ Passwords match
                </span>
              </div>
            </div>

            {/* ROLE / PRIVILEGE OPTION */}
            <div className="rounded-xl border border-slate-800 bg-[#07111F]/80 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-lime-400 focus:ring-lime-400/30 accent-lime-400 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Administrator Role</span>
                    <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-300 border border-amber-400/30">
                      ROOT PRIVILEGES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Grant administrative permissions to manage telemetry, sensors, and database settings.
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Creating Account..." : "Register & Establish Session"}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-lime-400 hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}