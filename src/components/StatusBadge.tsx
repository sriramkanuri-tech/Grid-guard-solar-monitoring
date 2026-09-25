import React from "react";

export type BadgeVariant =
  | "online"
  | "demo"
  | "stable"
  | "warning"
  | "critical"
  | "offline"
  | "normal"
  | "info";

interface StatusBadgeProps {
  status: BadgeVariant | string;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = true,
  size = "sm",
}) => {
  const normStatus = status.toLowerCase();

  let dotColor = "bg-lime-400";
  let bgBorder = "border-lime-400/20 bg-lime-400/10 text-lime-400";
  let defaultLabel = "Normal";

  if (normStatus === "online" || normStatus === "stable" || normStatus === "normal") {
    dotColor = "bg-lime-400";
    bgBorder = "border-lime-400/20 bg-lime-400/10 text-lime-400";
    defaultLabel = normStatus === "stable" ? "Stable" : "Online";
  } else if (normStatus === "demo") {
    dotColor = "bg-amber-400";
    bgBorder = "border-amber-400/20 bg-amber-400/10 text-amber-400";
    defaultLabel = "Demo Mode";
  } else if (normStatus === "warning") {
    dotColor = "bg-orange-400";
    bgBorder = "border-orange-400/20 bg-orange-400/10 text-orange-400";
    defaultLabel = "Warning";
  } else if (normStatus === "critical") {
    dotColor = "bg-rose-500";
    bgBorder = "border-rose-500/20 bg-rose-500/10 text-rose-400";
    defaultLabel = "Critical";
  } else if (normStatus === "info") {
    dotColor = "bg-sky-400";
    bgBorder = "border-sky-400/20 bg-sky-400/10 text-sky-400";
    defaultLabel = "Info";
  } else if (normStatus === "offline") {
    dotColor = "bg-slate-500";
    bgBorder = "border-slate-700 bg-slate-800 text-slate-400";
    defaultLabel = "Offline";
  }

  const displayText = label || defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${bgBorder} ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dotColor} ${
          pulse && normStatus !== "offline" ? "animate-pulse" : ""
        }`}
      />
      <span className="font-medium tracking-wide">{displayText}</span>
    </div>
  );
};

export default StatusBadge;
