import { FAMILIES, getFamily } from "./families";
import { renderSvg } from "./render";
import { DEFAULT_SETTINGS, withFamily } from "./settings";
import type { Settings } from "./types";

/** Settings used for the family-picker thumbnails: family defaults, heavier strokes so they read small. */
export function thumbSettings(id: string): Settings {
  const f = getFamily(id);
  return { ...withFamily(DEFAULT_SETTINGS, f.id), stroke: Math.max(10, f.defaults.stroke * 4), transparent: true, color: "#000" };
}

/** Compact SVG for a static thumbnail file (used as a CSS mask, so colour comes from the page). */
export function thumbSvg(id: string): string {
  return renderSvg(thumbSettings(id), { id: `t-${id}`, decimals: 1 });
}

export const THUMB_IDS = FAMILIES.map((f) => f.id);
