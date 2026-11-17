import { CAPS, PNG_SIZES, STYLES, type Settings } from "./types";
import { FAMILY_IDS, getFamily } from "./families";

export const LIMITS = {
  frequency: [0, 48, 1],
  detail: [1, 12, 1],
  phase: [0, 360, 1],
  warp: [0, 1, 0.01],
  stroke: [0.25, 12, 0.25],
  layers: [1, 6, 1],
  spacing: [0.04, 0.3, 0.01],
  copies: [1, 12, 1],
  rotation: [0, 360, 1],
  aspect: [0.5, 2, 0.05],
  overlayScale: [0.2, 1, 0.01],
  overlayRotation: [0, 360, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

export type NumericKey = keyof typeof LIMITS;

export const DEFAULT_SETTINGS: Settings = {
  seed: "shapeform",
  family: "rosette",
  style: "solid",
  frequency: 5,
  detail: 2,
  phase: 20,
  warp: 0.6,
  stroke: 3,
  color: "#1c1b22",
  background: "#ffffff",
  cap: "round",
  layers: 1,
  spacing: 0.12,
  copies: 1,
  rotation: 0,
  aspect: 1,
  overlay: "none",
  overlayScale: 0.55,
  overlayRotation: 0,
  transparent: true,
  size: 2048,
};

const snap = (v: number, step: number) => Math.round(v / step) * step;
const fix = (v: number) => Math.round(v * 1000) / 1000;

export function clampNumber(key: NumericKey, value: number, family?: string): number {
  let [min, max, step] = LIMITS[key] as readonly [number, number, number];
  if (family && (key === "frequency" || key === "detail")) [min, max] = getFamily(family).ranges[key];
  if (!Number.isFinite(value)) return min;
  return fix(Math.min(max, Math.max(min, snap(value, step))));
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Validate and clamp anything that might have come from a URL or old link. */
export function sanitize(input: Partial<Settings>): Settings {
  const s = { ...DEFAULT_SETTINGS, ...input } as Settings;
  if (!FAMILY_IDS.includes(s.family)) s.family = DEFAULT_SETTINGS.family;
  if (!STYLES.includes(s.style)) s.style = DEFAULT_SETTINGS.style;
  if (!CAPS.includes(s.cap)) s.cap = DEFAULT_SETTINGS.cap;
  if (!PNG_SIZES.includes(s.size)) s.size = DEFAULT_SETTINGS.size;
  if (s.overlay !== "none" && !FAMILY_IDS.includes(s.overlay)) s.overlay = "none";
  if (!HEX.test(s.color)) s.color = DEFAULT_SETTINGS.color;
  if (!HEX.test(s.background)) s.background = DEFAULT_SETTINGS.background;
  s.seed = String(s.seed || DEFAULT_SETTINGS.seed).slice(0, 64);
  s.transparent = Boolean(s.transparent);
  for (const key of Object.keys(LIMITS) as NumericKey[]) s[key] = clampNumber(key, Number(s[key]), s.family);
  return s;
}

/** Switch family and load its defaults, keeping finish/composition/export settings. */
export function withFamily(s: Settings, family: string): Settings {
  const f = getFamily(family);
  return sanitize({ ...s, family: f.id, ...f.defaults });
}
