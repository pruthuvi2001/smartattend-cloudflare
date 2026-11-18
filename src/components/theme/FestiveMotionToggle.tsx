"use client";

import React from "react";
import { Snowflake } from "lucide-react";
import { clsx } from "clsx";
import { FESTIVE_SEASON, setFestiveMotion, useFestiveMotionPref } from "./festive";

/** Button that turns the falling snow and background motion on or off for this browser. */
export const FestiveMotionToggle: React.FC<{ className?: string }> = ({ className }) => {
  const on = useFestiveMotionPref();
  if (!FESTIVE_SEASON) return null;

  return (
    <button
      type="button"
      onClick={() => setFestiveMotion(!on)}
      title={on ? "Turn off snow & motion" : "Turn on snow & motion"}
      aria-pressed={on}
      className={clsx(
        "p-2 rounded-lg transition-colors shrink-0",
        on ? "text-sky-300 hover:bg-slate-800" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800",
        className
      )}
    >
      <Snowflake className="w-4 h-4" />
    </button>
  );
};
