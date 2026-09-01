import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={twMerge(
      clsx("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)
    )}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={twMerge(clsx("p-5 border-b border-slate-100 flex items-center justify-between", className))} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={twMerge(clsx("font-semibold text-slate-900 text-base", className))} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={twMerge(clsx("text-xs text-slate-500 mt-0.5", className))} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={twMerge(clsx("p-5", className))} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={twMerge(clsx("p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between", className))} {...props} />
);
