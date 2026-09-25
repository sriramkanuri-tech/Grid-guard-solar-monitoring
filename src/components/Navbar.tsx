import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sun, Menu, X, Shield, ArrowRight, ShieldAlert } from "lucide-react";
import { getStoredUser, isConfiguredAdminEmail } from "../firebase/auth";
import type { UserProfile } from "../types/user";

interface NavLinkItem {
  name: string;
  href: string;
  sectionId: string;
}

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("home");

  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());

  useEffect(() => {
    setUser(getStoredUser());
  }, [location.pathname]);

  const isAdmin = user && (isConfiguredAdminEmail(user.email) || user.role === "admin");

  // Track scroll position on homepage to highlight currently visible section
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection("");
      return;
    }

    const handleScroll = () => {
      const sections = ["home", "features", "architecture", "about", "contact"];
      const scrollPos = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i]);
          return;
        }
      }
      setActiveSection("home");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const navLinks: NavLinkItem[] = [
    { name: "Home", href: "/#home", sectionId: "home" },
    { name: "Features", href: "/#features", sectionId: "features" },
    { name: "Architecture", href: "/#architecture", sectionId: "architecture" },
    { name: "About", href: "/#about", sectionId: "about" },
    { name: "Contact", href: "/#contact", sectionId: "contact" },
  ];

  const handleNavClick = (e: React.MouseEvent, link: NavLinkItem) => {
    e.preventDefault();
    const targetId = link.sectionId;

    if (location.pathname === "/") {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${targetId}`);
        setActiveSection(targetId);
      }
    } else {
      navigate(`/#${targetId}`);
    }
    setMobileMenuOpen(false);
  };

  const isLinkActive = (item: NavLinkItem) => {
    if (location.pathname === "/") {
      return activeSection === item.sectionId;
    }
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/70 bg-[#030712]/85 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => {
            if (location.pathname === "/") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.01]"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-md shadow-lime-400/20 transition group-hover:shadow-lime-400/30">
            <Sun className="h-6 w-6 stroke-[2.4] transition-transform duration-300 group-hover:rotate-45" />
            <span className="absolute -inset-0.5 -z-10 rounded-xl bg-lime-400/30 blur-xs transition group-hover:bg-lime-400/50" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-50 sm:text-lg">
                GRID GUARD
              </span>
              <span className="hidden rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold text-lime-400 sm:inline-block">
                v2.4
              </span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Solar Telemetry
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-slate-800/80 bg-[#07111f]/60 p-1.5 backdrop-blur-lg">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-lime-400 text-slate-950 font-bold shadow-md shadow-lime-400/25"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition shadow-xs shadow-amber-400/10"
                >
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>Admin Console</span>
                </Link>
              )}
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-lime-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98]"
              >
                <span>Live Dashboard</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800/60 hover:text-white"
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-lime-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-lime-500/20 transition-all duration-200 hover:bg-lime-400 hover:shadow-lime-400/30 active:scale-[0.98]"
              >
                <span>Register Node</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          {user ? (
            <Link
              to={isAdmin ? "/admin/dashboard" : "/dashboard"}
              className="rounded-lg bg-lime-400/20 px-2.5 py-1.5 text-xs font-bold text-lime-300"
            >
              {isAdmin ? "Admin" : "Console"}
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white"
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-slate-800 bg-[#07111f] p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-[#07111f]/95 px-4 pt-3 pb-6 backdrop-blur-2xl sm:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    active
                      ? "bg-lime-400 text-slate-950 font-bold shadow-md shadow-lime-400/20"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-400/10 py-2.5 text-xs font-bold text-amber-300"
                  >
                    <ShieldAlert size={14} />
                    <span>Admin Root Control</span>
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-lime-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-lime-500/20"
                >
                  <Shield size={14} />
                  <span>Open Live Dashboard</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-lime-500 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-lime-500/20 transition hover:bg-lime-400"
                >
                  <Shield size={14} />
                  <span>Register Node</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;