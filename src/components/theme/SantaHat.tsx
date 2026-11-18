import React from "react";
import { FESTIVE_SEASON } from "./festive";

/** Little Santa hat to perch on the school logo. Decoration only. */
export const SantaHat: React.FC<{ className?: string }> = ({ className }) => {
  if (!FESTIVE_SEASON) return null;
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 32"
      className={`festive-decor pointer-events-none ${className ?? ""}`}
    >
      <path d="M6 24 C 8 12, 18 4, 30 6 C 34 7, 36 12, 35 17 L 32 14 C 30 11, 26 11, 24 14 L 22 24 Z" fill="#dc1f36" />
      <path d="M9 9 C 14 6, 22 4, 30 6 C 25 7, 18 9, 12 14 Z" fill="#ffffff" opacity={0.18} />
      <rect x="3" y="21" width="23" height="7" rx="3.5" fill="#fff7f2" />
      <circle cx="35" cy="18" r="4" fill="#fff7f2" />
    </svg>
  );
};
