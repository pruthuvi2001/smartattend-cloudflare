"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Master switch for the Christmas decorations (night scene, snow, sleigh, lights,
 * Santa hat, greetings). Set to false after the holidays: the dark red theme stays,
 * the decorations disappear.
 */
export const FESTIVE_SEASON = true;

/**
 * Per-browser "Snow & motion" preference. It only remembers this one visual
 * setting in the browser; it has nothing to do with the app's data.
 */
const MOTION_KEY = "smartattend:festive-motion";
const MOTION_EVENT = "smartattend:festive-motion-change";

/**
 * "on"   – the viewer switched snow on with the snowflake button (wins over the device setting)
 * "off"  – the viewer switched it off
 * "auto" – never touched: follow the device's "reduce motion" / Windows "Animation effects" setting
 */
export type FestiveMotionPref = "on" | "off" | "auto";

function readMotionPref(): FestiveMotionPref {
  try {
    const v = window.localStorage.getItem(MOTION_KEY);
    return v === "on" || v === "off" ? v : "auto";
  } catch {
    return "auto";
  }
}

function subscribeMotionPref(onChange: () => void) {
  window.addEventListener(MOTION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(MOTION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setFestiveMotion(on: boolean) {
  try {
    window.localStorage.setItem(MOTION_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked (private mode): the switch still works until reload.
  }
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** The viewer's own snow choice for this browser ("auto" until they press the snowflake button). */
export function useFestiveMotionPref(): FestiveMotionPref {
  return useSyncExternalStore(subscribeMotionPref, readMotionPref, () => "auto" as const);
}

/**
 * Whether snow and background motion should run right now.
 * The viewer's explicit choice wins; otherwise follow the device setting.
 */
export function useFestiveAnimate(): { animate: boolean; pref: FestiveMotionPref } {
  const pref = useFestiveMotionPref();
  const reducedMotion = usePrefersReducedMotion();
  const animate = pref === "on" || (pref === "auto" && !reducedMotion);
  return { animate, pref };
}

/** True when the device asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Deterministic pseudo-random numbers so the scene looks the same every visit. */
export function seededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
