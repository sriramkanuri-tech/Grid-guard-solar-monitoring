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
  let bgBorder = "border-lime-400/30 bg-lime-400/10 text-lime-400";
  let defaultLabel = "Normal";

  if (normStatus === "online" || normStatus === "stable" || normStatus === "normal") {
    dotColor = "bg-lime-400";
    bgBorder = "border-lime-400/30 bg-lime-400/10 text-lime-400";
    defaultLabel = normStatus === "stable" ? "Stable" : "Online";
  } else if (normStatus === "demo") {
    dotColor = "bg-amber-400";
    bgBorder = "border-amber-400/30 bg-amber-400/10 text-amber-400";
    defaultLabel = "Demo Mode";
  } else if (normStatus === "warning") {
    dotColor = "bg-amber-400";
    bgBorder = "border-amber-400/30 bg-amber-400/10 text-amber-400";
    defaultLabel = "Warning";
  } else if (normStatus === "critical" || normStatus === "abnormal") {
    dotColor = "bg-red-400";
    bgBorder = "border-red-400/30 bg-red-400/10 text-red-400";
    defaultLabel = "Critical";
  } else if (normStatus === "info") {
    dotColor = "bg-sky-400";
    bgBorder = "border-sky-400/30 bg-sky-400/10 text-sky-400";
    defaultLabel = "Info";
  } else if (normStatus === "offline") {
    dotColor = "bg-slate-500";
    bgBorder = "border-slate-700/80 bg-slate-800/60 text-slate-400";
    defaultLabel = "Offline";
  }

  const displayText = label || defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border font-mono ${bgBorder} ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor} ${
          pulse && normStatus !== "offline" ? "animate-pulse" : ""
        }`}
      />
      <span className="font-semibold tracking-wide">{displayText}</span>
    </div>
  );
};

export default StatusBadge;
