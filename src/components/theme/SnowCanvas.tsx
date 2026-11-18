"use client";

import React, { useEffect, useRef } from "react";

interface Flake {
  x: number;
  y: number;
  /** Depth 0.15 (far, small, slow) to 1 (near, large, fast). */
  z: number;
  phase: number;
  sway: number;
}

/**
 * Soft falling snow drawn on one canvas behind the page content.
 * Nearer flakes are bigger, faster and shift more with the mouse (parallax).
 * With `animate` off it draws a single still frame.
 */
export const SnowCanvas: React.FC<{ animate: boolean }> = ({ animate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Pre-rendered soft flake sprite: much cheaper than blurring every flake.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,245,247,0.85)");
      g.addColorStop(1, "rgba(255,240,244,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
    }

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let raf = 0;
    let last = performance.now();
    let pointerX = 0;
    let smoothX = 0;

    const makeFlake = (anywhere: boolean): Flake => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10 - Math.random() * 40,
      z: 0.15 + Math.random() * 0.85,
      phase: Math.random() * Math.PI * 2,
      sway: 0.4 + Math.random() * 1.2,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(240, Math.round((width * height) / 8000));
      while (flakes.length < target) flakes.push(makeFlake(true));
      flakes.length = target;
    };

    const draw = (time: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      smoothX += (pointerX - smoothX) * 0.04;
      const wind = Math.sin(time * 0.00021) * 0.35 + Math.sin(time * 0.00063) * 0.15;

      for (const f of flakes) {
        if (dt > 0) {
          f.y += (0.35 + f.z * 1.25) * dt;
          f.x += (wind * (0.4 + f.z) + Math.sin(time * 0.0012 * f.sway + f.phase) * 0.3 * f.z) * dt;
          if (f.y > height + 10) Object.assign(f, makeFlake(false));
          if (f.x > width + 20) f.x = -20;
          if (f.x < -20) f.x = width + 20;
        }
        const size = 1.4 + f.z * 4.2;
        const px = f.x - smoothX * f.z * 28;
        ctx.globalAlpha = 0.25 + f.z * 0.6;
        ctx.drawImage(sprite, px - size, f.y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      // dt in 60 fps frames, capped so a background tab does not teleport snow.
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      draw(now, dt);
      raf = requestAnimationFrame(tick);
    };

    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / Math.max(width, 1)) * 2 - 1;
    };

    resize();
    window.addEventListener("resize", resize);

    if (animate) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      raf = requestAnimationFrame(tick);
    } else {
      draw(performance.now(), 0);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="festive-decor fixed inset-0 -z-[5] pointer-events-none"
    />
  );
};
