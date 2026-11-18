"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { seededRandom } from "./festive";

/** One SVG tree: three stacked tiers with snow resting on each tier. */
function Tree({ x, base, h, fill, snow }: { x: number; base: number; h: number; fill: string; snow: string }) {
  const w = h * 0.42;
  const tiers: [number, number, number][] = [
    // [apex y, bottom y, half width]
    [base - h, base - h * 0.55, w * 0.5],
    [base - h * 0.78, base - h * 0.28, w * 0.75],
    [base - h * 0.52, base - h * 0.04, w],
  ];
  return (
    <g>
      <rect x={x - h * 0.03} y={base - h * 0.08} width={h * 0.06} height={h * 0.1} fill={fill} />
      {tiers.map(([top, bottom, half], i) => (
        <g key={i}>
          <path d={`M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z`} fill={fill} />
          <path
            d={`M${x - half} ${bottom} Q${x} ${bottom - h * 0.07} ${x + half} ${bottom}`}
            stroke={snow}
            strokeWidth={Math.max(1.5, h * 0.025)}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
    </g>
  );
}

/** Santa's sleigh and reindeer as a small silhouette (flying right). */
function Sleigh() {
  const deer = [100, 145, 190];
  return (
    <svg width="230" height="66" viewBox="0 0 240 70" fill="#0a0205" stroke="#0a0205" opacity={0.9}>
      <path d="M64 30 Q120 18 196 22" strokeWidth="1" fill="none" />
      {deer.map((cx, i) => (
        <g key={cx} strokeWidth="1.6" strokeLinecap="round">
          <ellipse cx={cx} cy={32} rx={13} ry={5.5} stroke="none" />
          <path d={`M${cx + 9} ${30} L${cx + 16} ${21}`} strokeWidth="3" />
          <ellipse cx={cx + 18} cy={20} rx={4.5} ry={2.6} stroke="none" />
          <path d={`M${cx + 15} ${18} l-3 -6 M${cx + 15} ${18} l1 -7 M${cx + 13} ${14} l-3 -1`} fill="none" />
          <path d={`M${cx + 8} ${35} l9 5 M${cx + 6} ${36} l7 7 M${cx - 9} ${35} l-9 4 M${cx - 7} ${36} l-7 7`} fill="none" />
          {i === deer.length - 1 && (
            <circle cx={cx + 22.5} cy={20.5} r={1.9} fill="#ff3b4e" stroke="none" className="festive-twinkle" />
          )}
        </g>
      ))}
      <path d="M10 30 L64 30 Q72 30 72 38 L72 44 L14 44 Q8 44 8 38 Z" stroke="none" />
      <path d="M4 51 L74 51 Q86 51 88 42" strokeWidth="2.2" fill="none" />
      <path d="M20 44 L20 51 M60 44 L60 51" strokeWidth="1.8" />
      <circle cx={53} cy={22} r={8.5} stroke="none" />
      <ellipse cx={34} cy={27} rx={9} ry={7.5} stroke="none" />
      <circle cx={33} cy={17} r={5} stroke="none" />
      <path d="M28 15 L39 14 L46 7 Z" stroke="none" />
    </svg>
  );
}

const SKY = "linear-gradient(180deg, #0c0306 0%, #18060e 38%, #260a15 72%, #170610 100%)";

/**
 * Fixed Christmas night scene behind every page: sky, glowing aurora, stars,
 * moon, Santa's sleigh, snowy mountains, a pine forest and a lit cabin.
 * Each layer moves at its own speed with the mouse and page scroll (parallax).
 */
export const ChristmasScene: React.FC<{ animate: boolean }> = ({ animate }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Parallax: ease the layers towards the pointer and scroll position.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const set = (px: number, py: number, sy: number) => {
      root.style.setProperty("--px", px.toFixed(4));
      root.style.setProperty("--py", py.toFixed(4));
      root.style.setProperty("--sy", sy.toFixed(1));
    };
    if (!animate) {
      set(0, 0, 0);
      return;
    }

    let target = { x: 0, y: 0, s: 0 };
    let cur = { x: 0, y: 0, s: 0 };
    let raf = 0;

    const tick = () => {
      cur = {
        x: cur.x + (target.x - cur.x) * 0.06,
        y: cur.y + (target.y - cur.y) * 0.06,
        s: cur.s + (target.s - cur.s) * 0.12,
      };
      set(cur.x, cur.y, cur.s);
      const settled =
        Math.abs(target.x - cur.x) < 0.001 && Math.abs(target.y - cur.y) < 0.001 && Math.abs(target.s - cur.s) < 0.5;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onPointer = (e: PointerEvent) => {
      target = { ...target, x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      kick();
    };
    const onScroll = () => {
      target = { ...target, s: Math.min(window.scrollY, 1500) };
      kick();
    };

    onScroll();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [animate]);

  /** Transform for a layer at the given depth (0 = sky, 1 = foreground). */
  const layer = (depth: number): React.CSSProperties => ({
    transform: `translate3d(calc(var(--px, 0) * ${(-26 * depth).toFixed(1)}px), calc(var(--py, 0) * ${(-14 * depth).toFixed(1)}px + var(--sy, 0) * ${(-0.1 * depth).toFixed(3)}px), 0)`,
    willChange: animate ? "transform" : undefined,
  });

  const stars = useMemo(() => {
    const rand = seededRandom(1225);
    return Array.from({ length: 120 }, () => ({
      x: rand() * 1600,
      y: rand() * 520,
      r: 0.5 + rand() * 1.5,
      d: rand() * 4,
      t: 2 + rand() * 3,
    }));
  }, []);

  const forest = useMemo(() => {
    const rand = seededRandom(2412);
    const trees: { x: number; h: number }[] = [];
    for (let x = 10; x < 1600; x += 26 + rand() * 30) trees.push({ x, h: 48 + rand() * 70 });
    return trees;
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`festive-decor fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none ${animate ? "" : "festive-still"}`}
      style={{ background: SKY }}
    >
      {/* Aurora: slow liquid glows in red, gold and pine green */}
      <div className="absolute -inset-[6%]" style={layer(0.12)}>
        <div
          className="festive-aurora absolute -top-[18%] -left-[12%] h-[70vh] w-[70vw]"
          style={{ background: "radial-gradient(closest-side, rgba(220,31,54,0.34), rgba(220,31,54,0))", ["--aurora-duration" as string]: "28s" }}
        />
        <div
          className="festive-aurora absolute -top-[10%] right-[-15%] h-[55vh] w-[55vw]"
          style={{ background: "radial-gradient(closest-side, rgba(250,190,80,0.16), rgba(250,190,80,0))", ["--aurora-duration" as string]: "34s" }}
        />
        <div
          className="festive-aurora absolute top-[22%] left-[25%] h-[45vh] w-[60vw]"
          style={{ background: "radial-gradient(closest-side, rgba(16,185,129,0.10), rgba(16,185,129,0))", ["--aurora-duration" as string]: "40s" }}
        />
      </div>

      {/* Stars and moon */}
      <svg className="absolute -inset-[4%] h-[108%] w-[108%]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={layer(0.18)}>
        <defs>
          <radialGradient id="festive-moon-glow">
            <stop offset="0%" stopColor="rgba(255,214,190,0.38)" />
            <stop offset="100%" stopColor="rgba(255,214,190,0)" />
          </radialGradient>
        </defs>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff4f0"
            className="festive-star"
            style={{ ["--twinkle-delay" as string]: `${s.d}s`, ["--twinkle-duration" as string]: `${s.t}s` }}
          />
        ))}
        <circle cx={1240} cy={175} r={210} fill="url(#festive-moon-glow)" />
        <circle cx={1240} cy={175} r={58} fill="#fdeee2" />
        <circle cx={1222} cy={160} r={11} fill="#f2dccd" opacity={0.7} />
        <circle cx={1258} cy={192} r={8} fill="#f2dccd" opacity={0.6} />
        <circle cx={1250} cy={150} r={5} fill="#f2dccd" opacity={0.6} />
      </svg>

      {/* Santa's sleigh crossing the sky */}
      <div className="absolute inset-0" style={layer(0.22)}>
        <div className="festive-sleigh absolute left-0 top-[13%]">
          <Sleigh />
        </div>
      </div>

      {/* Far snowy mountains */}
      <svg className="absolute -inset-[4%] h-[108%] w-[108%]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={layer(0.32)}>
        <defs>
          <linearGradient id="festive-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b1321" />
            <stop offset="100%" stopColor="#1c0910" />
          </linearGradient>
        </defs>
        <path
          d="M0 560 L120 470 L210 520 L330 400 L450 500 L560 430 L700 520 L820 380 L960 500 L1080 440 L1200 520 L1330 410 L1460 500 L1600 450 L1600 900 L0 900 Z"
          fill="url(#festive-far)"
        />
        {[
          [120, 470], [330, 400], [560, 430], [820, 380], [1080, 440], [1330, 410],
        ].map(([px, py]) => (
          <path
            key={px}
            d={`M${px - 38} ${py + 34} L${px} ${py} L${px + 42} ${py + 38} L${px + 20} ${py + 29} L${px + 6} ${py + 40} L${px - 14} ${py + 28} Z`}
            fill="#f6e6ea"
            opacity={0.24}
          />
        ))}
      </svg>

      {/* Pine forest on rolling hills */}
      <svg className="absolute -inset-[4%] h-[108%] w-[108%]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={layer(0.55)}>
        {forest.map((t, i) => (
          <Tree key={i} x={t.x} base={668} h={t.h} fill="#1b0710" snow="rgba(240,224,229,0.32)" />
        ))}
        <path
          d="M0 640 C 200 590, 380 610, 560 632 S 900 598, 1100 640 S 1400 606, 1600 628 L1600 900 L0 900 Z"
          fill="#220912"
        />
      </svg>

      {/* Foreground: moonlit snow, big pines and a cosy cabin */}
      <svg className="absolute -inset-[4%] h-[108%] w-[108%]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={layer(0.9)}>
        <defs>
          <linearGradient id="festive-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5d4552" />
            <stop offset="35%" stopColor="#3b2632" />
            <stop offset="100%" stopColor="#1d0f16" />
          </linearGradient>
          <radialGradient id="festive-window-glow">
            <stop offset="0%" stopColor="rgba(255,179,71,0.55)" />
            <stop offset="100%" stopColor="rgba(255,179,71,0)" />
          </radialGradient>
        </defs>

        {/* Cabin */}
        <g>
          <circle cx={1177} cy={732} r={70} fill="url(#festive-window-glow)" className="festive-glow" />
          <rect x={1213} y={652} width={16} height={34} fill="#12050a" />
          {[0, 2, 4].map((delay) => (
            <circle
              key={delay}
              cx={1221}
              cy={646}
              r={7}
              fill="#d9c8cf"
              className="festive-smoke"
              style={{ animationDelay: `${delay}s`, transformBox: "fill-box", transformOrigin: "center" }}
            />
          ))}
          <rect x={1120} y={700} width={120} height={70} fill="#16070d" />
          <path d="M1104 706 L1180 648 L1256 706 Z" fill="#12050a" />
          <path d="M1102 707 L1180 646 L1258 707" stroke="#ead9de" strokeOpacity={0.6} strokeWidth={6} strokeLinejoin="round" fill="none" />
          <rect x={1165} y={720} width={26} height={22} rx={2} fill="#ffb347" className="festive-glow" />
          <path d="M1178 720 L1178 742 M1165 731 L1191 731" stroke="#7a3b10" strokeWidth={2} />
          <rect x={1134} y={726} width={18} height={44} fill="#0b0306" />
        </g>

        <path
          d="M0 760 C 220 722, 420 744, 640 770 S 1020 730, 1240 762 S 1480 740, 1600 752 L1600 900 L0 900 Z"
          fill="url(#festive-snow)"
        />
        <Tree x={90} base={790} h={290} fill="#12050a" snow="rgba(245,232,236,0.55)" />
        <Tree x={215} base={800} h={210} fill="#12050a" snow="rgba(245,232,236,0.5)" />
        <Tree x={1430} base={795} h={250} fill="#12050a" snow="rgba(245,232,236,0.55)" />
        <Tree x={1545} base={805} h={320} fill="#12050a" snow="rgba(245,232,236,0.5)" />
      </svg>

      {/* Soft vignette keeps the edges calm behind the content */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 45%, rgba(5,1,3,0.55) 100%)" }}
      />
    </div>
  );
};
