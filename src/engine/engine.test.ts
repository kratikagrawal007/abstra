import { describe, expect, it } from "vitest";
import { FAMILIES } from "./families";
import { renderSvg } from "./render";
import { DEFAULT_SETTINGS, sanitize, withFamily } from "./settings";
import { settingsFromSeed } from "./seed";
import { decodeSettings, encodeSettings } from "./url-state";
import { STYLES } from "./types";
import { createRng } from "./rng";

describe("rng", () => {
  it("is deterministic per seed", () => {
    const a = createRng("abc"), b = createRng("abc"), c = createRng("abd");
    const sa = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(sa);
    expect(c.next()).not.toEqual(sa[0]);
  });
});

describe("families × styles", () => {
  for (const f of FAMILIES)
    for (const style of STYLES)
      it(`${f.id} / ${style} renders valid, in-bounds SVG`, () => {
        const s = { ...withFamily(DEFAULT_SETTINGS, f.id), style };
        const svg = renderSvg(s);
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        // every coordinate stays inside the 500 box (strokes are reserved by fit)
        const nums = [...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].flatMap((m) => [+m[1], +m[2]]);
        expect(nums.length).toBeGreaterThan(0);
        expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...nums)).toBeLessThanOrEqual(500);
      });
});

describe("determinism", () => {
  it("same settings give byte-identical SVG", () => {
    for (const f of FAMILIES) {
      const s = settingsFromSeed(DEFAULT_SETTINGS, `seed-${f.id}`, false);
      expect(renderSvg(s)).toEqual(renderSvg(structuredClone(s)));
    }
  });
  it("seed variations are reproducible", () => {
    expect(settingsFromSeed(DEFAULT_SETTINGS, "kalo7", false)).toEqual(settingsFromSeed(DEFAULT_SETTINGS, "kalo7", false));
  });
  it("keep family respects current family", () => {
    const base = withFamily(DEFAULT_SETTINGS, "honeycomb");
    expect(settingsFromSeed(base, "x1", true).family).toBe("honeycomb");
  });
});

describe("url state", () => {
  it("round-trips every setting", () => {
    const s = { ...settingsFromSeed(DEFAULT_SETTINGS, "roundtrip", false), copies: 4, overlay: "star", transparent: false };
    expect(decodeSettings(encodeSettings(s))).toEqual(s);
  });
  it("clamps and repairs hostile values", () => {
    const s = decodeSettings("s=x&f=nope&st=evil&fq=9999&wp=-3&c=red&px=7");
    expect(s).toEqual(sanitize({ seed: "x", frequency: 9999, warp: -3 }));
    expect(s!.warp).toBe(0);
    expect(s!.frequency).toBe(16); // rosette max petals
  });
});

describe("family robustness", () => {
  const coords = (svg: string) => [...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].flatMap((m) => [+m[1], +m[2]]);
  for (const f of FAMILIES) {
    it(`${f.id} survives parameter extremes`, () => {
      const [fMin, fMax] = f.ranges.frequency;
      const [dMin, dMax] = f.ranges.detail;
      for (const frequency of [fMin, fMax])
        for (const detail of [dMin, dMax])
          for (const warp of [0, 1])
            for (const phase of [0, 359]) {
              const shapes = f.generate({ frequency, detail, phase, warp }, "edge");
              expect(shapes.length, `${frequency}/${detail}/${warp}`).toBeGreaterThan(0);
              const s = { ...withFamily(DEFAULT_SETTINGS, f.id), frequency, detail, warp, phase };
              const svg = renderSvg(s);
              expect(svg).not.toMatch(/NaN|Infinity/);
              const n = coords(svg);
              expect(Math.min(...n)).toBeGreaterThanOrEqual(0);
              expect(Math.max(...n)).toBeLessThanOrEqual(500);
            }
    });
    it(`${f.id} stays within the point budget`, () => {
      const [, fMax] = f.ranges.frequency;
      const [, dMax] = f.ranges.detail;
      const pts = f.generate({ frequency: fMax, detail: dMax, phase: 0, warp: 1 }, "budget").reduce((a, s) => a + s.points.length, 0);
      expect(pts).toBeLessThan(25000);
    });
  }
  it("every family is reachable by randomize", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(settingsFromSeed(DEFAULT_SETTINGS, `r${i}`, false).family);
    expect(seen.size).toBe(FAMILIES.length);
  });
});
