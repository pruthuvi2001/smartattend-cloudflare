import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "indigo" | "emerald" | "rose" | "amber" | "slate";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "indigo",
  className,
}) => {
  const iconVariants = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between",
          className
        )
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <h4 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</h4>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className={clsx("p-3 rounded-xl", iconVariants[variant])}>
        {icon}
      </div>
    </div>
  );
};
