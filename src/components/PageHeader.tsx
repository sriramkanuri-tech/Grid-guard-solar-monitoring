import React from "react";
import StatusBadge from "./StatusBadge";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  category?: string;
  isDemo?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  category = "Monitoring",
  isDemo = true,
  action,
  className = "",
}) => {
  return (
    <div
      className={`animate-header animate-item mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {category}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {isDemo ? (
          <StatusBadge status="demo" label="Demo Mode Active" pulse />
        ) : (
          <StatusBadge status="online" label="System Live" pulse />
        )}
        {action}
      </div>
    </div>
  );
};

export default PageHeader;
