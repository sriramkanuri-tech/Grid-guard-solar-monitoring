import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { logoutUser } from "../firebase/auth";
import { alertService } from "../services/alertService";
import { gridDataService } from "../services/gridDataService";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeAlerts, setActiveAlerts] = useState<number>(2);
  const [isDemo, setIsDemo] = useState<boolean>(true);

  useEffect(() => {
    const unsubAlerts = alertService.subscribe((alerts) => {
      const unresolved = alerts.filter((a) => !a.resolved).length;
      setActiveAlerts(unresolved);
    });

    const unsubGrid = gridDataService.subscribe((data) => {
      setIsDemo(Boolean(data.isDemo));
    });

    return () => {
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-[#07101f] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-slate-950 shadow-md shadow-lime-400/20">
              <Sun className="h-6 w-6 stroke-[2.2]" />
            </div>

            <div>
              <h1 className="font-bold tracking-wide text-white">GRID GUARD</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Solar Monitoring
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Monitoring
            </p>

            {navItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== "/dashboard" &&
                  location.pathname.startsWith(item.path));
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition font-medium ${
                    active
                      ? "bg-lime-400 font-semibold text-slate-950 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? "text-slate-950 stroke-[2.2]" : "text-slate-400"}
                  />
                  <span>{item.label}</span>

                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-slate-950 text-lime-400"
                          : "bg-orange-400/20 text-orange-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Connection Status Panel */}
          <div className="mx-4 mb-4 rounded-xl border border-lime-400/10 bg-lime-400/5 p-4">
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
                {isDemo ? "Demo Mode Active" : "System Online"}
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              {isDemo
                ? "No physical sensor connected yet."
                : "Realtime sensors streaming via Firebase."}
            </p>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-800 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}