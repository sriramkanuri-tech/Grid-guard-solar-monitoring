import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Sun,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Send,
  ArrowLeft,
} from "lucide-react";
import { resetPasswordWithOtp } from "../firebase/auth";
import { apiClient } from "../services/apiClient";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get("email") || "";
  const initialSent = searchParams.get("sent") === "1" || searchParams.get("sent") === "true";
  const initialOtp = searchParams.get("otp") || "";

  const [step, setStep] = useState<1 | 2>(initialSent ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState(initialOtp);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    initialSent
      ? `A 6-digit password reset OTP has been dispatched to ${initialEmail}`
      : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(initialSent ? 300 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendResetOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Please provide a valid operator email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.sendOtp(targetEmail);
      setStep(2);
      setCooldown(300); // 5 minutes
      if ((res as any).otp) {
        setOtpCode((res as any).otp);
      }
      setSuccessMsg(res.message || `A 6-digit password reset OTP has been sent to ${targetEmail}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to Grid Guard server. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (otpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit reset code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithOtp(email.trim().toLowerCase(), otpCode.trim(), newPassword);
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password reset failed. Invalid or expired code.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-lime-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800/80 bg-[#070F1E]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-md shadow-lime-400/20">
            <Sun size={20} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white">GRID GUARD</h1>
            <p className="text-[9px] font-mono uppercase tracking-widest text-lime-400">
              Password Recovery
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {step === 1 ? "Reset Account Password" : "Enter Verification Code"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1
              ? "We will transmit a 6-digit one-time code to your registered email via Gmail SMTP."
              : "Verify the code sent to your inbox and establish a new secure password."}
          </p>
        </div>

        {/* Alerts */}
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

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleSendResetOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Operator Account Email
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
                  placeholder="sriramkanuri4@gmail.com or your email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-lime-500/20 transition hover:from-lime-300 hover:to-lime-400 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Dispatching Reset Code...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Reset OTP Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP and New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  6-Digit Verification Code
                </label>
                {cooldown > 0 ? (
                  <span className="text-[11px] font-mono text-lime-400">
                    Expires: {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-mono text-lime-400 hover:underline"
                  >
                    Resend Code
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
                className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 rounded-xl border border-lime-400/50 bg-slate-950 text-lime-300 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-400/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-10 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || newPassword.length < 6}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-500/20 transition hover:from-lime-300 hover:to-lime-400 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Reset Password & Proceed</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login link */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-lime-400 transition"
          >
            <ArrowLeft size={13} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
