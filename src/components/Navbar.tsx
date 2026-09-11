import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  const isLoggedIn = localStorage.getItem("gridguard_user") !== null;

  const handleLogout = () => {
    localStorage.removeItem("gridguard_user");
    setMobileMenu(false);
    navigate("/");
    window.location.reload();
  };

  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 shadow-lg shadow-lime-400/10">

            <svg
              width="25"
              height="25"
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
                d="M12 2V5M12 19V22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M2 12H5M19 12H22M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Grid Guard
            </h1>

            <p className="text-[8px] font-medium tracking-[0.25em] text-lime-400">
              SMART SOLAR MONITORING
            </p>
          </div>

        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden items-center gap-8 md:flex">

          <a
            href="#home"
            className="text-sm text-slate-300 transition hover:text-lime-400"
          >
            Home
          </a>

          <a
            href="#features"
            className="text-sm text-slate-300 transition hover:text-lime-400"
          >
            Features
          </a>

          <a
            href="#about"
            className="text-sm text-slate-300 transition hover:text-lime-400"
          >
            About
          </a>

          <a
            href="#contact"
            className="text-sm text-slate-300 transition hover:text-lime-400"
          >
            Contact
          </a>

          {/* LOGGED OUT */}
          {!isLoggedIn && (
            <div className="flex items-center gap-3">

              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-300"
              >
                Register
              </Link>

            </div>
          )}

          {/* LOGGED IN */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
            >

              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M10 17L15 12L10 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M15 12H3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M21 19V5C21 3.9 20.1 3 19 3H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              Logout

            </button>
          )}

        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="text-white md:hidden"
        >

          {mobileMenu ? (
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6H20M4 12H20M4 18H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}

        </button>

      </div>

      {/* MOBILE NAVIGATION */}
      {mobileMenu && (
        <div className="border-t border-white/10 bg-slate-950 px-6 py-6 md:hidden">

          <div className="flex flex-col gap-5">

            <a
              href="#home"
              onClick={() => setMobileMenu(false)}
              className="text-slate-300 hover:text-lime-400"
            >
              Home
            </a>

            <a
              href="#features"
              onClick={() => setMobileMenu(false)}
              className="text-slate-300 hover:text-lime-400"
            >
              Features
            </a>

            <a
              href="#about"
              onClick={() => setMobileMenu(false)}
              className="text-slate-300 hover:text-lime-400"
            >
              About
            </a>

            <a
              href="#contact"
              onClick={() => setMobileMenu(false)}
              className="text-slate-300 hover:text-lime-400"
            >
              Contact
            </a>

            {!isLoggedIn && (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenu(false)}
                  className="text-slate-300"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  onClick={() => setMobileMenu(false)}
                  className="rounded-xl bg-lime-400 px-5 py-3 text-center font-semibold text-slate-950"
                >
                  Register
                </Link>
              </>
            )}

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="text-left font-medium text-red-400"
              >
                Logout
              </button>
            )}

          </div>

        </div>
      )}

    </nav>
  );
}