import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Zap,
  Plug,
  Radio,
  Bell,
  Bot,
  Settings,
  User,
  LogOut,
  Sun,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { logoutUser, getStoredUser, subscribeToAuth, isConfiguredAdminEmail } from "../firebase/auth";
import { alertService } from "../services/alertService";
import { gridDataService } from "../services/gridDataService";
import type { UserProfile } from "../types/user";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [activeAlerts, setActiveAlerts] = useState<number>(2);
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const isAdmin = Boolean(user?.isAdmin) || isConfiguredAdminEmail(user?.email || "");

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => setUser(u));
    const unsubAlerts = alertService.subscribe((alerts) => {
      const unresolved = alerts.filter((a) => !a.resolved).length;
      setActiveAlerts(unresolved);
    });

    const unsubGrid = gridDataService.subscribe((data) => {
      setIsDemo(Boolean(data.isDemo));
    });

    return () => {
      unsubAuth();
      unsubAlerts();
      unsubGrid();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
    { label: "Energy", path: "/energy", icon: Zap },
    { label: "Grid Monitoring", path: "/grid-monitoring", icon: Plug },
    { label: "Connect Sensor", path: "/connect-sensor", icon: Radio },
    { label: "Alerts", path: "/alerts", icon: Bell, badge: activeAlerts },
    { label: "ML Detection", path: "/ml-detection", icon: Bot },
    { label: "Settings", path: "/settings", icon: Settings },
    { label: "Profile", path: "/profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800/80 bg-[#07111F]/95 backdrop-blur-2xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between">
          {/* Top Section */}
          <div className="flex flex-col">
            {/* Logo */}
            <div className="flex h-20 items-center justify-between border-b border-slate-800/80 px-6">
              <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-md shadow-lime-400/20">
                  <Sun className="h-5 w-5 stroke-[2.4]" />
                  <span className="absolute -inset-0.5 -z-10 rounded-xl bg-lime-400/30 blur-xs" />
                </div>

                <div>
                  <h1 className="text-sm font-bold tracking-tight text-white">GRID GUARD</h1>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-lime-400">
                    Solar Monitoring
                  </p>
                </div>
              </Link>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1 overflow-y-auto px-3 py-4">
              {isAdmin && (
                <div className="mb-3">
                  <Link
                    to="/admin/dashboard"
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-xs font-bold text-amber-300 shadow-xs shadow-amber-400/10 hover:bg-amber-400/20 transition"
                  >
                    <ShieldAlert size={17} className="text-amber-400" />
                    <span>Admin Root Control</span>
                  </Link>
                </div>
              )}

              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Core Console
              </p>

              {navItems.map((item) => {
                const active =
                  location.pathname === item.path ||
                  (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 ${
                      active
                        ? "border border-lime-400/30 bg-lime-400/10 text-lime-400 font-semibold shadow-xs"
                        : "border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    <Icon
                      size={17}
                      className={
                        active
                          ? "text-lime-400 stroke-[2.2]"
                          : "text-slate-400 transition-colors group-hover:text-slate-200"
                      }
                    />
                    <span className="truncate">{item.label}</span>

                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-lime-400 text-slate-950"
                            : "border border-amber-400/30 bg-amber-400/10 text-amber-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Section: Telemetry State & Logout */}
          <div className="p-3">
            {/* User & Role Display */}
            <div className={`mb-2.5 rounded-xl border p-3 ${
              user?.isAdmin
                ? "border-amber-400/30 bg-amber-400/5"
                : "border-slate-800/80 bg-[#0B1628]/70"
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">
                  {user?.name || "Operator"}
                </p>
                {user?.isAdmin ? (
                  <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <ShieldAlert size={10} />
                    ADMIN
                  </span>
                ) : (
                  <span className="rounded bg-lime-400/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-lime-400 border border-lime-400/30">
                    OPERATOR
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-400 truncate font-mono">
                {user?.email || "sriramkanuri4@gmail.com"}
              </p>
            </div>

            {/* System Status Pill */}
            <div className="mb-3 rounded-xl border border-slate-800/80 bg-[#0B1628]/70 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isDemo ? "bg-amber-400 animate-pulse" : "bg-lime-400 animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isDemo ? "text-amber-400" : "text-lime-400"
                    }`}
                  >
                    {isDemo ? "1s Realtime Sync" : "Hardware Online"}
                  </span>
                </div>
                <ShieldCheck size={14} className="text-slate-500" />
              </div>

              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                1000ms telemetry ticks persisted to database stream.
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-500 hover:text-white active:scale-[0.98]"
            >
              <LogOut size={15} />
              <span>Operator Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}