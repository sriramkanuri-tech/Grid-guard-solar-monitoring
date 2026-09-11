import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
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

    const existingAccount = localStorage.getItem(
      "gridguard_account"
    );

    if (existingAccount) {
      const account = JSON.parse(existingAccount);

      if (account.email.toLowerCase() === email.toLowerCase()) {
        setError(
          "An account with this email already exists. Please sign in."
        );
        return;
      }
    }

    const account = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    localStorage.setItem(
      "gridguard_account",
      JSON.stringify(account)
    );

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-lime-400/10 blur-[120px]" />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* MAIN */}
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* LOGO */}
        <div className="mb-8 flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 shadow-lg shadow-lime-400/10">
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-slate-950"
            >
              <circle
                cx="12"
                cy="12"
                r="4"
                fill="currentColor"
              />

              <path
                d="M12 2V5M12 19V22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M2 12H5M19 12H22M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold">
              Grid Guard
            </h1>

            <p className="text-[9px] tracking-[0.25em] text-lime-400">
              SOLAR MONITORING
            </p>
          </div>

        </div>

        {/* REGISTER CARD */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl">

          <div className="grid lg:grid-cols-2">

            {/* LEFT INFORMATION PANEL */}
            <div className="relative hidden min-h-[700px] overflow-hidden bg-linear-to-br from-emerald-950 via-slate-950 to-slate-950 lg:block">

              {/* GRID PATTERN */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "45px 45px",
                }}
              />

              {/* GLOW */}
              <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />

              <div className="relative z-10 flex h-full flex-col justify-center p-12 xl:p-16">

                {/* BADGE */}
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-xs font-medium text-lime-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
                  SMART ENERGY PLATFORM
                </div>

                {/* TITLE */}
                <h2 className="text-5xl font-bold leading-tight xl:text-6xl">

                  Build a smarter

                  <br />

                  <span className="text-lime-400">
                    energy future.
                  </span>

                </h2>

                <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
                  Create your Grid Guard account and get a complete
                  view of your renewable energy system.
                </p>

                {/* FEATURES */}
                <div className="mt-10 space-y-5">

                  <FeatureItem>
                    Real-time solar monitoring
                  </FeatureItem>

                  <FeatureItem>
                    Smart grid protection
                  </FeatureItem>

                  <FeatureItem>
                    Energy performance analytics
                  </FeatureItem>

                  <FeatureItem>
                    Carbon reduction tracking
                  </FeatureItem>

                </div>

                {/* ENERGY DISPLAY */}
                <div className="mt-12 grid max-w-md grid-cols-2 gap-4">

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">

                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Today's Energy
                    </p>

                    <p className="mt-2 text-2xl font-bold text-lime-400">
                      45.2 kWh
                    </p>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[78%] rounded-full bg-lime-400" />
                    </div>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">

                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Grid Status
                    </p>

                    <div className="mt-3 flex items-center gap-2">

                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime-400" />

                      <span className="text-lg font-semibold text-white">
                        Stable
                      </span>

                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      System operating normally
                    </p>

                  </div>

                </div>

              </div>
            </div>

            {/* RIGHT REGISTER FORM */}
            <div className="p-7 sm:p-10 lg:p-12 xl:p-16">

              {/* MOBILE ICON */}
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 lg:hidden">

                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-lime-400"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M12 2V5M12 19V22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M2 12H5M19 12H22M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

              </div>

              {/* HEADER */}
              <div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
                  Get Started
                </p>

                <h2 className="text-3xl font-bold sm:text-4xl">
                  Create account
                </h2>

                <p className="mt-3 text-slate-500">
                  Start monitoring your energy with Grid Guard.
                </p>

              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                {/* NAME */}
                <Input
                  label="Full name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={setName}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />

                      <path
                        d="M4 21C4.8 16.8 7.4 14.5 12 14.5C16.6 14.5 19.2 16.8 20 21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />

                {/* EMAIL */}
                <Input
                  label="Email address"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  icon={
                    <svg
                      width="18"
                      height="18"
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
                  }
                />

                {/* PHONE */}
                <Input
                  label="Phone number"
                  placeholder="Enter your phone number"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M6.5 3.5L9.2 3L11 7.2L8.8 8.7C9.7 10.8 11.3 12.5 13.5 13.5L15 11.3L19.2 13.1L18.7 15.8C18.5 17 17.5 18 16.3 18.1C9.9 18.5 5.5 14.1 5.9 7.7C6 6.5 7 5.5 8.2 5.3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />

                {/* PASSWORD */}
                <PasswordInput
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  setShow={setShowPassword}
                />

                {/* CONFIRM PASSWORD */}
                <PasswordInput
                  label="Confirm password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  setShow={setShowConfirmPassword}
                />

                {/* PASSWORD REQUIREMENTS */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

                  <p className="mb-3 text-xs font-medium text-slate-400">
                    Password requirements
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">

                    <Requirement
                      valid={password.length >= 6}
                      text="6+ characters"
                    />

                    <Requirement
                      valid={/[A-Z]/.test(password)}
                      text="Uppercase letter"
                    />

                    <Requirement
                      valid={/[0-9]/.test(password)}
                      text="Number"
                    />

                    <Requirement
                      valid={password.length > 0}
                      text="Not empty"
                    />

                  </div>

                </div>

                {/* ERROR */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">

                    <span className="mt-0.5 text-red-400">
                      !
                    </span>

                    <p className="text-sm text-red-300">
                      {error}
                    </p>

                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-lime-400 py-4 font-semibold text-slate-950 shadow-lg shadow-lime-400/10 transition duration-300 hover:bg-lime-300 hover:shadow-lime-400/20"
                >
                  Create account

                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M5 12H19M13 6L19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                </button>

              </form>

              {/* LOGIN LINK */}
              <div className="mt-8 text-center">

                <p className="text-sm text-slate-500">
                  Already have an account?{" "}

                  <Link
                    to="/login"
                    className="font-semibold text-lime-400 transition hover:text-lime-300"
                  >
                    Sign in
                  </Link>
                </p>

              </div>

              {/* SECURITY */}
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">

                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 3L19 6V11C19 16 16 19 12 21C8 19 5 16 5 11V6L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M9 12L11 14L15 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                Your account information stays on this device.

              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* FEATURE ITEM */
/* ------------------------------------------------ */

function FeatureItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">

      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400/10">

        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          className="text-lime-400"
        >
          <path
            d="M5 12L10 17L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

      </div>

      <span className="text-sm text-slate-300">
        {children}
      </span>

    </div>
  );
}

/* ------------------------------------------------ */
/* INPUT */
/* ------------------------------------------------ */

function Input({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  icon,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <div className="group relative">

        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition group-focus-within:text-lime-400">
          {icon}
        </div>

        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-700 hover:border-white/20 focus:border-lime-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-lime-400/5"
        />

      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* PASSWORD INPUT */
/* ------------------------------------------------ */

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <div className="group relative">

        {/* LOCK */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition group-focus-within:text-lime-400">

          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="5"
              y="10"
              width="14"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <path
              d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

        </div>

        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-700 hover:border-white/20 focus:border-lime-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-lime-400/5"
        />

        {/* SHOW PASSWORD */}
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 3L21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M10.6 10.6C10.2 11 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 13 13.8 13.4 13.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M9.9 5.2C10.6 5.1 11.3 5 12 5C17 5 20 8.5 21 12C20.6 13.5 19.8 14.8 18.6 16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M6.2 6.3C4.5 7.6 3.5 9.5 3 12C4 15.5 7 19 12 19C13.7 19 15.2 18.6 16.5 17.9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2.5 12C4 7.8 7.2 5 12 5C16.8 5 20 7.8 21.5 12C20 16.2 16.8 19 12 19C7.2 19 4 16.2 2.5 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* PASSWORD REQUIREMENT */
/* ------------------------------------------------ */

function Requirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        valid ? "text-lime-400" : "text-slate-600"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          valid
            ? "border-lime-400 bg-lime-400 text-slate-950"
            : "border-slate-700"
        }`}
      >
        {valid && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 12L10 17L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {text}
    </div>
  );
}