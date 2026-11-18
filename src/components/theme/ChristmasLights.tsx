import React from "react";
import { clsx } from "clsx";
import { FESTIVE_SEASON } from "./festive";

const BULB_COLORS = ["#ff3b4e", "#2bd67b", "#ffcc4d", "#4fb3ff", "#fff1d6"];

/**
 * A string of twinkling fairy lights hanging across the top of an area.
 * Decoration only: no clicks, hidden in print.
 */
export const ChristmasLights: React.FC<{ count?: number; className?: string }> = ({
  count = 18,
  className,
}) => {
  if (!FESTIVE_SEASON) return null;

  // One sagging wire segment per bulb; each bulb hangs from the lowest point.
  const wire = Array.from({ length: count }, (_, i) => {
    const x0 = i * 100;
    return `${i === 0 ? `M${x0} 2` : ""} Q${x0 + 50} 22 ${x0 + 100} 2`;
  }).join(" ");

  return (
    <div
      aria-hidden
      className={clsx("festive-decor pointer-events-none select-none relative h-9 w-full", className)}
    >
      <svg
        className="absolute inset-x-0 top-0 h-6 w-full"
        viewBox={`0 0 ${count * 100} 24`}
        preserveAspectRatio="none"
      >
        <path d={wire} stroke="#3a2128" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex">
        {Array.from({ length: count }, (_, i) => {
          const color = BULB_COLORS[i % BULB_COLORS.length];
          return (
            <div key={i} className="flex flex-1 justify-center" style={{ paddingTop: 10 }}>
              <div className="flex flex-col items-center">
                <div className="h-1.5 w-1.5 rounded-[1px] bg-[#3a2128]" />
                <div
                  className="festive-twinkle h-3.5 w-2.5 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 38%, ${color} 100%)`,
                    boxShadow: `0 0 8px 2px ${color}99, 0 0 18px 4px ${color}44`,
                    ["--twinkle-delay" as string]: `${((i * 0.37) % 2.2).toFixed(2)}s`,
                    ["--twinkle-duration" as string]: `${(1.8 + ((i * 0.53) % 1.6)).toFixed(2)}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
