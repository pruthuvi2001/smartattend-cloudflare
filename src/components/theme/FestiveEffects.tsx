"use client";

import React, { useEffect } from "react";
import { ChristmasScene } from "./ChristmasScene";
import { SnowCanvas } from "./SnowCanvas";
import { FESTIVE_SEASON, useFestiveMotionPref, usePrefersReducedMotion } from "./festive";

/** Plain night background used when the festive season switch is off. */
const PLAIN_NIGHT =
  "radial-gradient(ellipse at 20% 0%, rgba(220,31,54,0.22), rgba(220,31,54,0) 55%), linear-gradient(180deg, #0c0306 0%, #18060e 55%, #12050a 100%)";

/**
 * Background decoration for every page: the Christmas night scene with parallax
 * and falling snow. Purely visual; it is fixed behind the content, ignores the
 * mouse for clicks, and is hidden when printing.
 */
export const FestiveEffects: React.FC = () => {
  const motionPref = useFestiveMotionPref();
  const reducedMotion = usePrefersReducedMotion();
  const animate = motionPref && !reducedMotion;

  // Lets every decoration on the page (fairy lights, glows) stop together.
  useEffect(() => {
    document.documentElement.classList.toggle("festive-still", !animate);
  }, [animate]);

  if (!FESTIVE_SEASON) {
    return (
      <div
        aria-hidden
        className="festive-decor fixed inset-0 -z-10 pointer-events-none"
        style={{ background: PLAIN_NIGHT }}
      />
    );
  }

  return (
    <>
      <ChristmasScene animate={animate} />
      <SnowCanvas animate={animate} />
    </>
  );
};
