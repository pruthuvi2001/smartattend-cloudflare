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

function readMotionPref(): boolean {
  try {
    return window.localStorage.getItem(MOTION_KEY) !== "off";
  } catch {
    return true;
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

/** Whether the viewer wants snow and motion (defaults to on). */
export function useFestiveMotionPref(): boolean {
  return useSyncExternalStore(subscribeMotionPref, readMotionPref, () => true);
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
