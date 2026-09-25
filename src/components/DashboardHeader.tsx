import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { getStoredUser, subscribeToAuth } from "../firebase/auth";
import { gridDataService } from "../services/gridDataService";
import type { UserProfile } from "../types/user";

type DashboardHeaderProps = {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
};

export default function DashboardHeader({
  onMenuClick,
  title = "System Overview",
  subtitle = "Grid Guard Telemetry",
}: DashboardHeaderProps) {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [isDemo, setIsDemo] = useState<boolean>(true);

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => {
      setUser(u);
    });

    const unsubGrid = gridDataService.subscribe((data) => {
      setIsDemo(Boolean(data.isDemo));
    });

    return () => {
      unsubAuth();
      unsubGrid();
    };
  }, []);

  const displayName = user?.name || "Operator";
  const initial = displayName.charAt(0).toUpperCase() || "O";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800/80 bg-[#030712]/85 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-800 bg-[#07111F] p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {subtitle}
          </p>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Admin Badge if authenticated as admin */}
        {user?.isAdmin && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-300 shadow-sm shadow-amber-400/10">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            ADMIN ROOT
          </span>
        )}

        {/* Connection State Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-[#07111F]/80 px-3.5 py-1.5 shadow-xs">
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
            {isDemo ? "1s Realtime DB Sync" : "Hardware Online"}
          </span>
        </div>

        {/* Alerts Icon Link */}
        <Link
          to="/alerts"
          className="relative rounded-xl border border-slate-800 bg-[#07111F] p-2.5 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
          aria-label="View alerts"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-lime-400" />
        </Link>

        {/* Profile Avatar */}
        <Link
          to="/profile"
          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm text-slate-950 shadow-md transition hover:scale-105 active:scale-95 ${
            user?.isAdmin
              ? "bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-400/20 ring-2 ring-amber-400/30"
              : "bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lime-400/20"
          }`}
          title={user?.isAdmin ? `Admin Root: ${displayName}` : `Signed in as ${displayName}`}
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}