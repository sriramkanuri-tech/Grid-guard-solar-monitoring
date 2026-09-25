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
  subtitle = "Grid Guard",
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

  const displayName = user?.name || "User";
  const initial = displayName.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-[#020617]/90 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        <div>
          <p className="text-xs text-slate-500">{subtitle}</p>
          <h2 className="font-semibold text-white">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1.5 sm:flex">
          <span
            className={`h-2 w-2 rounded-full animate-pulse ${
              isDemo ? "bg-amber-400" : "bg-lime-400"
            }`}
          />
          <span
            className={`text-xs font-medium ${
              isDemo ? "text-amber-400" : "text-lime-400"
            }`}
          >
            {isDemo ? "Demo Mode" : "System Online"}
          </span>
        </div>

        <Link
          to="/alerts"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="View alerts"
        >
          <Bell size={20} />
        </Link>

        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 font-bold text-slate-950 transition hover:bg-lime-300 shadow-md shadow-lime-400/10"
          title={`Signed in as ${displayName}`}
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}