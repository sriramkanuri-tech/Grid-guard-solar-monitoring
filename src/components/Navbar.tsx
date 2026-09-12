import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="w-full h-[88px] bg-slate-950 border-b border-slate-800 flex items-center justify-end">
      <div className="flex items-center gap-9 pr-7">

        {/* Home */}
        <Link
          to="/"
          className="text-slate-300 text-[15px] hover:text-white transition-colors"
        >
          Home
        </Link>

        {/* Features */}
        <Link
          to="/features"
          className="text-slate-300 text-[15px] hover:text-white transition-colors"
        >
          Features
        </Link>

        {/* About */}
        <Link
          to="/about"
          className="text-slate-300 text-[15px] hover:text-white transition-colors"
        >
          About
        </Link>

        {/* Contact */}
        <Link
          to="/contact"
          className="text-slate-300 text-[15px] hover:text-white transition-colors"
        >
          Contact
        </Link>

        {/* Login */}
        <Link
          to="/login"
          className="text-white text-[15px] font-semibold hover:text-slate-300 transition-colors"
        >
          Login
        </Link>

        {/* Register */}
        <Link
          to="/register"
          className="bg-lime-400 hover:bg-lime-300 text-black text-[15px] font-medium px-6 py-3 rounded-[14px] transition-all duration-200"
        >
          Register
        </Link>

      </div>
    </nav>
  );
};

export default Navbar;