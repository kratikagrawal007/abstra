import { createRng } from "./rng";
import { FAMILIES, getFamily } from "./families";
import { sanitize } from "./settings";
import type { Settings } from "./types";

/**
 * Derive a good-looking variation from a seed. Only shape/composition values
 * change; colours and export options are kept from `base`.
 */
export function settingsFromSeed(base: Settings, seed: string, keepFamily: boolean): Settings {
  const rng = createRng(seed);
  const family = keepFamily ? getFamily(base.family) : rng.pick(FAMILIES);
  const d = family.defaults;
  const [fMin, fMax] = family.ranges.frequency;
  const [dMin, dMax] = family.ranges.detail;
  // Bias toward the middle of each range: extremes are rarely the nicest.
  const mid = (min: number, max: number) => Math.round(min + (max - min) * (0.15 + 0.6 * rng.next()));
  const fancy = rng.chance(0.25);
  return sanitize({
    ...base,
    seed,
    family: family.id,
    style: rng.chance(0.7) ? d.style : rng.pick(["outline", "solid", "double", "ribbon", "dashed"] as const),
    frequency: mid(fMin, fMax),
    detail: mid(dMin, dMax),
    phase: Math.round(rng.range(0, 72)) * 5,
    warp: Math.round(rng.range(0.1, 0.85) * 100) / 100,
    stroke: d.stroke,
    layers: fancy && rng.chance(0.5) ? rng.int(2, 3) : 1,
    copies: fancy && rng.chance(0.5) ? rng.int(2, 6) : 1,
    rotation: Math.round(rng.range(0, 24)) * 15,
  });
}

const SYLLABLES = ["ka", "lo", "mi", "ra", "ve", "to", "su", "ne", "zi", "po", "da", "fu", "xo", "ye", "qi"];

/** Human-friendly random seed for the Randomize button (UI-only randomness). */
export function randomSeed(random: () => number = Math.random): string {
  const n = 2 + Math.floor(random() * 2);
  let s = "";
  for (let i = 0; i < n; i++) s += SYLLABLES[Math.floor(random() * SYLLABLES.length)];
  return s + Math.floor(random() * 100);
}
