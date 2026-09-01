import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={twMerge(clsx("animate-pulse bg-slate-200 rounded", className))}
    {...props}
  />
);
