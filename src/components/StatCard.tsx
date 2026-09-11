type StatCardProps = {
  title: string;
  value: string;
  unit: string;
  change: string;
  icon: string;
};

export default function StatCard({
  title,
  value,
  unit,
  change,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-lime-400/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {value}
            </span>

            <span className="text-sm text-slate-500">
              {unit}
            </span>
          </div>

          <p className="mt-3 text-xs text-lime-400">
            {change}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}