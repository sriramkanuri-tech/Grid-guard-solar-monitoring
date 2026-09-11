import { useNavigate } from "react-router-dom";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function DashboardSidebar({
  open,
  onClose,
}: DashboardSidebarProps) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("gridguard_user");
    navigate("/");
  };

  const menu = [
    ["📊", "Dashboard", "/dashboard"],
    ["📈", "Analytics", "/dashboard/analytics"],
    ["☀️", "Energy", "/dashboard/energy"],
    ["🔌", "Grid Monitoring", "/dashboard/grid"],
    ["🔗", "Connect Sensor", "/dashboard/connect-sensor"],
    ["🚨", "Alerts", "/dashboard/alerts"],
    ["🤖", "ML Detection", "/dashboard/ml"],
    ["⚙️", "Settings", "/dashboard/settings"],
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-[#07101f] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-slate-950">
              ☀
            </div>

            <div>
              <h1 className="font-bold tracking-wide">GRID GUARD</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Solar Monitoring
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-5">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Monitoring
            </p>

            {menu.map(([icon, label, path]) => {
              const active = path === "/dashboard";

              return (
                <button
                  key={path}
                  onClick={() => {
                    navigate(path);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-lime-400 font-semibold text-slate-950"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>

                  {label === "Alerts" && (
                    <span className="ml-auto rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] text-orange-400">
                      2
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Connection status */}
          <div className="mx-4 mb-4 rounded-xl border border-lime-400/10 bg-lime-400/5 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
              <span className="text-xs text-lime-400">System Online</span>
            </div>

            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              No physical sensor connected yet.
            </p>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-800 p-4">
            <button
              onClick={logout}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              ↪ &nbsp; Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}