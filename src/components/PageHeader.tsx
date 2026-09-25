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
      className={`animate-header animate-item mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6 ${className}`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime-400">
          {category}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDemo ? (
          <StatusBadge status="demo" label="Demo Telemetry" pulse />
        ) : (
          <StatusBadge status="online" label="Hardware Online" pulse />
        )}
        {action}
      </div>
    </div>
  );
};

export default PageHeader;
