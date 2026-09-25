import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Radio,
  Activity,
  AlertTriangle,
  Mail,
  FileText,
  Server,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Bell,
  Sun,
  Shield,
} from "lucide-react";
import { logoutUser, getStoredUser } from "../firebase/auth";
import { presenceService } from "../services/presenceService";
import type { UserProfile } from "../types/user";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(1);

  useEffect(() => {
    const unsubPresence = presenceService.subscribeStats((stats) => {
      setOnlineCount(stats.onlineMembers);
      setTotalCount(stats.totalMembers);
    });
    return () => unsubPresence();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Admin Console", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Member Directory", path: "/admin/members", icon: Users },
    { label: "Solar Nodes", path: "/admin/nodes", icon: Radio },
    { label: "Live Telemetry", path: "/admin/telemetry", icon: Activity },
    { label: "Alert Control", path: "/admin/alerts", icon: AlertTriangle },
    { label: "Email Dispatcher", path: "/admin/emails", icon: Mail },
    { label: "Audit Logs", path: "/admin/audit", icon: FileText },
    { label: "System Health", path: "/admin/system", icon: Server },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-amber-500/20 bg-[#070F1E]/95 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex h-20 items-center justify-between border-b border-amber-500/20 px-6">
              <Link to="/admin/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
                  <ShieldAlert className="h-5 w-5 stroke-[2.4]" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    GRID GUARD
                  </h1>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-amber-400">
                    ROOT CONTROL
                  </p>
                </div>
              </Link>

              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Presence Pill */}
            <div className="p-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Presence</span>
                  <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    {onlineCount} Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Registered Members: <strong className="text-white font-mono">{totalCount}</strong>
                </p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1 px-3 py-2">
              <p className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Command Navigation
              </p>
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      active
                        ? "border border-amber-400/40 bg-amber-400/10 text-amber-300 font-bold shadow-xs shadow-amber-400/10"
                        : "border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-amber-400" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-slate-800/80 space-y-2">
            <Link
              to="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-lime-500/30 bg-lime-500/10 py-2.5 text-xs font-semibold text-lime-400 hover:bg-lime-500/20 transition active:scale-95"
            >
              <ExternalLink size={13} />
              <span>Switch to Member View</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition active:scale-95"
            >
              <LogOut size={13} />
              <span>Admin Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Admin Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-amber-500/20 bg-[#030712]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-800 bg-[#07111F] p-2 text-slate-400 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                  ADMINISTRATIVE ROOT SESSION
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Microgrid Security &amp; Control Hub
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-mono text-amber-300">
              <Shield size={12} className="text-amber-400" />
              {user?.email || "sriramkanuri4@gmail.com"}
            </span>

            <Link
              to="/admin/alerts"
              className="relative rounded-xl border border-slate-800 bg-[#07111F] p-2.5 text-slate-400 hover:text-white transition"
              title="Admin Alerts"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
            </Link>

            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-sm text-slate-950 shadow-md shadow-amber-400/20 hover:scale-105 transition"
              title="Admin Profile"
            >
              A
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
