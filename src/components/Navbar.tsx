import { Link } from "react-router-dom";
import { Sun } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="w-full h-[88px] bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-40">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20">
          <Sun className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <span className="font-bold text-white text-base sm:text-lg tracking-wide">
            GRID GUARD
          </span>
          <p className="text-[9px] uppercase tracking-[0.2em] text-lime-400 font-semibold">
            Solar Monitoring
          </p>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-5 sm:gap-8 text-sm">
        <Link
          to="/"
          className="text-slate-300 hover:text-white transition-colors hidden sm:inline"
        >
          Home
        </Link>

        <a
          href="/#features"
          className="text-slate-300 hover:text-white transition-colors hidden md:inline"
        >
          Features
        </a>

        <Link
          to="/about"
          className="text-slate-300 hover:text-white transition-colors"
        >
          About
        </Link>

        <a
          href="/#contact"
          className="text-slate-300 hover:text-white transition-colors hidden md:inline"
        >
          Contact
        </a>

        <Link
          to="/login"
          className="text-white font-semibold hover:text-lime-400 transition-colors"
        >
          Login
        </Link>

        <Link
          to="/register"
          className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm shadow-lime-400/20 text-xs sm:text-sm"
        >
          Register
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;