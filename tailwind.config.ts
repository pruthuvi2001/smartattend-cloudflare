import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import {
  THEMED_HUES,
  themedScale,
  surfaceWhite,
  screenVariables,
  originalVariables,
} from "./src/theme/palette";

/** One colour role (bg / fg / line) for every themed hue, as Tailwind colour scales. */
const roleColors = (role: "bg" | "fg" | "line") =>
  Object.fromEntries(THEMED_HUES.map((hue) => [hue, themedScale(role, hue)]));

const bgColors = { ...roleColors("bg"), white: surfaceWhite };
const fgColors = roleColors("fg");
const lineColors = roleColors("line");

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Same class names as before (bg-white, text-slate-900, ...); the colours
      // come from CSS variables so screen and print can differ. See src/theme/palette.ts.
      backgroundColor: bgColors,
      gradientColorStops: bgColors,
      boxShadowColor: bgColors,
      textColor: fgColors,
      placeholderColor: fgColors,
      borderColor: lineColors,
      divideColor: lineColors,
      ringColor: lineColors,
      outlineColor: lineColors,
      ringOffsetColor: { DEFAULT: "rgb(var(--c-page-bg))" },
      colors: {
        // Kept for any `*-brand-*` utilities outside the roles above.
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        scan: 'scan 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      const original = originalVariables();
      addBase({
        ":root": { ...screenVariables(), colorScheme: "dark" },
        // Student ID card preview and anything else that must look like paper.
        ".keep-light": { ...original, colorScheme: "light" },
        "@media print": {
          ":root, .keep-light": { ...original, colorScheme: "light" },
        },
      });
    }),
  ],
};
export default config;
