type DashboardHeaderProps = {
  onMenuClick: () => void;
};

export default function DashboardHeader({
  onMenuClick,
}: DashboardHeaderProps) {
  let user = { name: "User" };

  try {
    const storedUser = localStorage.getItem("gridguard_user");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch {
    user = { name: "User" };
  }

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-[#020617]/90 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-800 lg:hidden"
        >
          ☰
        </button>

        <div>
          <p className="text-xs text-slate-500">Grid Guard</p>
          <h2 className="font-semibold text-white">System Overview</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-2 sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
          <span className="text-xs text-lime-400">
            System Online
          </span>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 font-bold text-slate-950">
          {initial}
        </div>
      </div>
    </header>
  );
}