"use client";

import React from "react";
import { Snowflake } from "lucide-react";
import { clsx } from "clsx";
import { FESTIVE_SEASON, setFestiveMotion, useFestiveAnimate } from "./festive";

/**
 * Button that turns the falling snow and background motion on or off for this browser.
 * It shows what is really happening on screen, and the viewer's choice wins over the
 * device's "reduce motion" / Windows "Animation effects" setting.
 */
export const FestiveMotionToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { animate } = useFestiveAnimate();
  if (!FESTIVE_SEASON) return null;

  return (
    <button
      type="button"
      onClick={() => setFestiveMotion(!animate)}
      title={animate ? "Turn off snow & motion" : "Turn on snow & motion"}
      aria-pressed={animate}
      className={clsx(
        "p-2 rounded-lg transition-colors shrink-0",
        animate ? "text-sky-300 hover:bg-slate-800" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800",
        className
      )}
    >
      <Snowflake className="w-4 h-4" />
    </button>
  );
};
