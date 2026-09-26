import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  Smartphone,
  Server,
  X,
  Globe,
} from "lucide-react";
import { loginUser, loginWithOtp, loginWithMfa, isConfiguredAdminEmail } from "../firebase/auth";
import { apiClient } from "../services/apiClient";

export default function LoginPage() {
  const navigate = useNavigate();

  // Mode: "password" | "otp" | "mfa"
  const [authMethod, setAuthMethod] = useState<"password" | "otp" | "mfa">("password");

  // Password Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // MFA Authenticator Login State
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  // Shared UI state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Server URL Override Modal State
  const [showServerModal, setShowServerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(() => apiClient.getCustomApiUrl() || "");
  const [testStatus, setTestStatus] = useState<string>("");
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  const handleSaveCustomUrl = (e: FormEvent) => {
    e.preventDefault();
    apiClient.setCustomApiUrl(customUrlInput.trim() || null);
    setShowServerModal(false);
    setTestStatus("");
  };

  const handleTestConnection = async () => {
    setIsTestingUrl(true);
    setTestStatus("");
    try {
      const urlToTest = customUrlInput.trim() || apiClient.baseUrl;
      const res = await fetch(`${urlToTest.replace(/\/+$/, "")}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        setTestStatus(`✅ Connected: ${data.service || "FastAPI"} online`);
      } else {
        setTestStatus(`⚠️ Server responded with HTTP ${res.status}`);
      }
    } catch {
      setTestStatus("❌ Connection failed (unreachable or mixed-content)");
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const profile = await loginUser(email, password);
      if (profile.role === "admin" || isConfiguredAdminEmail(profile.email)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to authenticate. Please check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = async () => {
    setError("");
    setSuccessMsg("");
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      navigate("/forgot-password");
      return;
    }

    setIsSendingResetOtp(true);
    try {
      await apiClient.sendOtp(clean);
      navigate(`/forgot-password?email=${encodeURIComponent(clean)}&sent=1`);
    } catch {
      navigate(`/forgot-password?email=${encodeURIComponent(clean)}`);
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetEmail = otpEmail.trim().toLowerCase();
    if (!targetEmail) {
      setError("Please provide a valid operator or admin email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.sendOtp(targetEmail);
      setOtpSent(true);
      setOtpCooldown(300); // 5 min countdown
      setOtpCode(""); // Must remain empty: user must fetch OTP from their email inbox
      setSuccessMsg(res.message || `A 6-digit verification code was dispatched to ${targetEmail}. Please check your inbox.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to Grid Guard server. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (otpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginWithOtp(otpEmail.trim().toLowerCase(), otpCode.trim());
      if (profile.role === "admin" || isConfiguredAdminEmail(profile.email)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "OTP verification failed.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanEmail = mfaEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid operator email address.");
      return;
    }

    if (mfaCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit Authenticator code.");
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginWithMfa(cleanEmail, mfaCode.trim());
      if (profile.role === "admin" || isConfiguredAdminEmail(profile.email)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authenticator verification failed.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-lime-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-[160px]" />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-[#070F1E]/90 shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12">
        {/* LEFT BRAND & LIVE STATUS PANEL */}
        <div className="lg:col-span-5 relative hidden overflow-hidden bg-gradient-to-br from-emerald-950/40 via-[#07111F] to-[#020617] p-8 sm:p-12 lg:flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-md shadow-lime-400/20">
                <Sun className="h-6 w-6 stroke-[2.4]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">GRID GUARD</h1>
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-lime-400">
                  Solar Microgrid Engine
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-lime-400">
                <ShieldCheck size={12} />
                Production Telemetry
              </span>

              <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                Enterprise Solar Infrastructure & Real-Time Anomaly Protection.
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Connect directly to hardware inverter telemetry, stream metrics to Firebase Realtime Database, and detect faults instantly with an Isolation Forest ML model.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Realtime Database:</span>
              <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Socket Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">SMTP Gateway:</span>
              <span className="text-emerald-400 font-mono font-semibold">Gmail Relay Ready</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Isolation Forest:</span>
              <span className="text-lime-400 font-mono font-semibold">Joblib v1.0 Loaded</span>
            </div>
          </div>
        </div>

        {/* RIGHT AUTHENTICATION PANEL */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950 font-bold">
              <Sun size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Grid Guard</h1>
              <p className="text-[9px] uppercase tracking-widest text-lime-400 font-mono">
                Solar Telemetry
              </p>
            </div>
          </div>

          {/* Authentication Method Tabs */}
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition ${
                authMethod === "password"
                  ? "bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 font-bold shadow-md shadow-lime-400/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <KeyRound size={13} />
              <span className="truncate">Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition ${
                authMethod === "otp"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-400/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Mail size={13} />
              <span className="truncate">Email OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("mfa");
                setError("");
                setSuccessMsg("");
                if (email && !mfaEmail) setMfaEmail(email);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition ${
                authMethod === "mfa"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-400/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck size={13} />
              <span className="truncate">MFA Login</span>
            </button>
          </div>

          {/* Header Description */}
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {authMethod === "password"
                ? "Operator Authentication"
                : authMethod === "otp"
                ? "Secure Passwordless OTP"
                : "Multi-Factor Authentication (MFA)"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMethod === "password"
                ? "Sign in with your registered email and password credentials."
                : authMethod === "otp"
                ? "Receive a 6-digit one-time verification passcode directly to your inbox."
                : "Verify your identity using your 6-digit authenticator app passcode."}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* METHOD 1: PASSWORD LOGIN FORM */}
          {authMethod === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sriramkanuri4@gmail.com or member email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    disabled={isSendingResetOtp}
                    className="text-[11px] font-semibold text-lime-400 hover:text-lime-300 hover:underline transition flex items-center gap-1"
                  >
                    {isSendingResetOtp ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      "Forgot Password?"
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-10 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
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

              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Console</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* METHOD 2: OTP LOGIN FORM */}
          {authMethod === "otp" && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                      Destination Email for One-Time Code
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="sriramkanuri4@gmail.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Dispatching Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send 6-Digit Login Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Enter 6-Digit Verification Code
                      </label>
                      {otpCooldown > 0 ? (
                        <span className="text-[11px] font-mono text-amber-400">
                          Expires in: {Math.floor(otpCooldown / 60)}:
                          {String(otpCooldown % 60).padStart(2, "0")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[11px] font-mono text-amber-400 hover:underline"
                        >
                          Request New Code
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 rounded-xl border border-amber-400/50 bg-slate-950 text-amber-300 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                      Code dispatched to <strong className="text-white">{otpEmail}</strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Verify & Enter Console</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      ← Change Destination Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* METHOD 3: MFA TOTP LOGIN FORM */}
          {authMethod === "mfa" && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="email"
                    required
                    value={mfaEmail}
                    onChange={(e) => setMfaEmail(e.target.value)}
                    placeholder="sriramkanuri4@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  6-Digit Authenticator Code (TOTP)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 rounded-xl border border-cyan-400/50 bg-slate-950 text-cyan-300 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 text-center flex items-center justify-center gap-1">
                  <Smartphone size={12} className="text-cyan-400" />
                  <span>Enter code from Google Authenticator, Microsoft Authenticator, or Authy</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Authenticator Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Verify Authenticator & Login</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Registration link */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Need an operator account?{" "}
            <Link to="/register" className="font-semibold text-lime-400 hover:underline">
              Register Operator Profile
            </Link>
          </p>

          {/* Backend endpoint indicator */}
          <div className="mt-5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(apiClient.getCustomApiUrl() || "");
                setShowServerModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition font-mono bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${apiClient.getCustomApiUrl() ? "bg-cyan-400" : "bg-emerald-400"}`} />
              <span>Backend: {apiClient.getCustomApiUrl() ? apiClient.getCustomApiUrl() : "Auto (Cloud Edge Active)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backend API Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0B1628] p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Backend Server Endpoint</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowServerModal(false);
                  setTestStatus("");
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  FastAPI Public URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://grid-guard-api.onrender.com or http://127.0.0.1:8000"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 font-mono"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                  Default: Auto mode routes through Firebase Realtime Database with 100% cloud uptime. You can also connect any custom deployed FastAPI endpoint.
                </p>
              </div>

              {testStatus && (
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300">
                  {testStatus}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingUrl}
                  className="text-xs text-amber-400 hover:underline font-mono disabled:opacity-50"
                >
                  {isTestingUrl ? "Testing..." : "Test Connection"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput("");
                      apiClient.setCustomApiUrl(null);
                      setShowServerModal(false);
                      setTestStatus("");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
                  >
                    Reset Default
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 transition"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}