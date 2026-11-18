/**
 * Colour system for the dark red "Christmas night" theme.
 *
 * Every Tailwind colour the app uses (slate, indigo, rose, ...) is routed through
 * CSS variables, split by role: background (bg), text (fg) and lines (borders,
 * rings, dividers). The screen gets the dark red theme; printouts and anything
 * inside a `.keep-light` element (the student ID card preview) get the original
 * light colours, so printed reports and ID cards look exactly as before.
 *
 * This file is only read by tailwind.config.ts at build time.
 */
import twColors from "tailwindcss/colors";

type Shade = "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "950";
type Scale = Record<Shade, string>;
type Rgb = [number, number, number];
type Role = "bg" | "fg" | "line";

export const SHADES: Shade[] = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

/** Hues routed through variables. Anything else keeps Tailwind's stock colours. */
export const THEMED_HUES = ["slate", "indigo", "brand", "purple", "rose", "emerald", "amber", "sky"] as const;
export type ThemedHue = (typeof THEMED_HUES)[number];

/** The app's existing custom "brand" scale (same values as before). */
const BRAND: Scale = {
  "50": "#eef2ff", "100": "#e0e7ff", "200": "#c7d2fe", "300": "#a5b4fc", "400": "#818cf8",
  "500": "#6366f1", "600": "#4f46e5", "700": "#4338ca", "800": "#3730a3", "900": "#312e81", "950": "#1e1b4b",
};

/** Christmas red that replaces indigo as the main accent colour on screen. */
const CHRISTMAS_RED: Scale = {
  "50": "#fff1f2", "100": "#ffe1e3", "200": "#ffc8cd", "300": "#ffa1a9", "400": "#ff6b78",
  "500": "#f43f4f", "600": "#dc1f36", "700": "#b8122b", "800": "#981328", "900": "#7f1527", "950": "#470611",
};

/** Original light colours: used for print and `.keep-light`. */
const ORIGINAL: Record<ThemedHue, Scale> = {
  slate: twColors.slate as Scale,
  indigo: twColors.indigo as Scale,
  brand: BRAND,
  purple: twColors.purple as Scale,
  rose: twColors.rose as Scale,
  emerald: twColors.emerald as Scale,
  amber: twColors.amber as Scale,
  sky: twColors.sky as Scale,
};

/** Hue each themed colour takes on screen before dark adaptation. */
const SCREEN_HUE: Record<Exclude<ThemedHue, "slate">, Scale> = {
  indigo: CHRISTMAS_RED,
  brand: CHRISTMAS_RED,
  purple: twColors.yellow as Scale, // gold accents
  rose: twColors.rose as Scale,
  emerald: twColors.emerald as Scale, // pine green
  amber: twColors.amber as Scale, // gold
  sky: twColors.sky as Scale, // ice blue
};

/** Deep wine-black every dark tint is mixed towards. */
const NIGHT: Rgb = [24, 11, 14];

/** Neutral (slate) colours on screen, warm charcoal with a red cast. */
const SCREEN_SLATE: Record<Role, Record<Shade, Rgb>> = {
  // Low numbers are raised surfaces (hover, chips); high numbers are deep panels.
  bg: {
    "50": [44, 21, 26], "100": [54, 27, 32], "200": [68, 35, 41], "300": [86, 47, 53], "400": [112, 72, 78],
    "500": [136, 96, 102], "600": [76, 40, 46], "700": [60, 29, 34], "800": [44, 20, 24], "900": [30, 12, 16],
    "950": [17, 6, 9],
  },
  // All text is light; 400-500 are the muted ones, 800-950 the brightest.
  fg: {
    "50": [255, 250, 250], "100": [252, 241, 242], "200": [240, 223, 225], "300": [222, 199, 202],
    "400": [178, 147, 151], "500": [166, 135, 140], "600": [198, 171, 175], "700": [221, 199, 202],
    "800": [237, 221, 223], "900": [250, 241, 242], "950": [255, 248, 248],
  },
  line: {
    "50": [58, 31, 37], "100": [66, 36, 42], "200": [80, 45, 51], "300": [100, 59, 65], "400": [128, 84, 90],
    "500": [150, 104, 110], "600": [92, 53, 59], "700": [74, 41, 47], "800": [58, 31, 36], "900": [40, 20, 24],
    "950": [28, 12, 15],
  },
};

/** Card surfaces (Tailwind `bg-white`) on screen, see-through for the glass look. */
const SCREEN_SURFACE: Rgb = [38, 17, 22];
const SCREEN_SURFACE_ALPHA = 0.58;
/** Raised neutral surfaces that also stay slightly see-through. */
const SCREEN_SLATE_ALPHA: Partial<Record<Shade, number>> = { "50": 0.55, "100": 0.62 };
/** Page background behind everything on screen. */
export const SCREEN_PAGE_BG: Rgb = [12, 4, 7];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] * t + b[i] * (1 - t))) as Rgb;
}

const channels = (rgb: Rgb) => rgb.join(" ");

/** Dark-mode version of a coloured scale, per role. */
function darkAdapt(scale: Scale, role: Role, shade: Shade): Rgb {
  const o = (s: Shade) => hexToRgb(scale[s]);
  if (role === "bg") {
    // Light tints (badges, info boxes) become dark tinted glass; strong shades stay.
    const tint: Partial<Record<Shade, Rgb>> = {
      "50": mix(o("500"), NIGHT, 0.14),
      "100": mix(o("500"), NIGHT, 0.2),
      "200": mix(o("500"), NIGHT, 0.3),
      "300": mix(o("400"), NIGHT, 0.45),
    };
    return tint[shade] ?? o(shade);
  }
  if (role === "fg") {
    // Dark text (600-950) flips to the matching light shade.
    const flip: Partial<Record<Shade, Shade>> = {
      "500": "400", "600": "400", "700": "300", "800": "200", "900": "100", "950": "50",
    };
    return o(flip[shade] ?? shade);
  }
  const line: Partial<Record<Shade, Rgb>> = {
    "50": mix(o("500"), NIGHT, 0.22),
    "100": mix(o("500"), NIGHT, 0.28),
    "200": mix(o("500"), NIGHT, 0.36),
    "300": mix(o("500"), NIGHT, 0.48),
  };
  return line[shade] ?? o(shade);
}

const varName = (role: Role, hue: ThemedHue, shade: Shade) => `--c-${role}-${hue}-${shade}`;
const alphaVar = (key: string) => `--a-${key}`;

/** Tailwind colour scale that reads the CSS variables for one role. */
export function themedScale(role: Role, hue: ThemedHue): Record<Shade, string> {
  return Object.fromEntries(
    SHADES.map((s) => {
      const alpha = role === "bg" && hue === "slate" && SCREEN_SLATE_ALPHA[s] ? alphaVar(`slate-${s}`) : null;
      const a = alpha ? `calc(<alpha-value> * var(${alpha}, 1))` : "<alpha-value>";
      return [s, `rgb(var(${varName(role, hue, s)}) / ${a})`];
    })
  ) as Record<Shade, string>;
}

/** Tailwind colour for `bg-white` cards. */
export const surfaceWhite = `rgb(var(--c-bg-white) / calc(<alpha-value> * var(${alphaVar("white")}, 1)))`;

/** Variables for the dark red screen theme. */
export function screenVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const hue of THEMED_HUES) {
    for (const role of ["bg", "fg", "line"] as Role[]) {
      for (const s of SHADES) {
        vars[varName(role, hue, s)] =
          hue === "slate" ? channels(SCREEN_SLATE[role][s]) : channels(darkAdapt(SCREEN_HUE[hue], role, s));
      }
    }
  }
  vars["--c-bg-white"] = channels(SCREEN_SURFACE);
  vars[alphaVar("white")] = String(SCREEN_SURFACE_ALPHA);
  for (const [s, a] of Object.entries(SCREEN_SLATE_ALPHA)) vars[alphaVar(`slate-${s}`)] = String(a);
  vars["--c-page-bg"] = channels(SCREEN_PAGE_BG);
  vars["--c-page-fg"] = channels(SCREEN_SLATE.fg["900"]);
  return vars;
}

/** Variables restoring the original light colours (print and `.keep-light`). */
export function originalVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const hue of THEMED_HUES) {
    for (const s of SHADES) {
      const rgb = channels(hexToRgb(ORIGINAL[hue][s]));
      vars[varName("bg", hue, s)] = rgb;
      vars[varName("fg", hue, s)] = rgb;
      vars[varName("line", hue, s)] = rgb;
    }
  }
  vars["--c-bg-white"] = "255 255 255";
  vars[alphaVar("white")] = "1";
  for (const s of Object.keys(SCREEN_SLATE_ALPHA)) vars[alphaVar(`slate-${s}`)] = "1";
  vars["--c-page-bg"] = "255 255 255";
  vars["--c-page-fg"] = channels(hexToRgb(twColors.slate["900"]));
  return vars;
}
