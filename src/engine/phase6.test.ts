import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { FAMILIES } from "./families";
import { renderSvg } from "./render";
import { DEFAULT_SETTINGS, sanitize, withFamily } from "./settings";
import { decodeSettings, encodeSettings } from "./url-state";
import { animatedSvg, frameSettings, frameSvg, SVG_FRAMES } from "./animate";
import { outlinedSvg } from "./outline";
import { batchZip } from "./export";
import { PALETTES, activePalette, paletteColors } from "./palettes";
import { STYLES } from "./types";

const coords = (svg: string) => [...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].flatMap((m) => [+m[1], +m[2]]);

describe("colour", () => {
  it("linear and radial gradients are defined and used", () => {
    const lin = renderSvg({ ...DEFAULT_SETTINGS, fill: "linear", gradientAngle: 90 });
    expect(lin).toMatch(/<linearGradient id="sf-grad"/);
    expect(lin).toContain('fill="url(#sf-grad)"');
    expect(renderSvg({ ...DEFAULT_SETTINGS, fill: "radial" })).toMatch(/<radialGradient/);
  });
  it("layer colours cycle through the three palette colours", () => {
    const s = { ...DEFAULT_SETTINGS, layers: 4, layerColors: true, color: "#111111", color2: "#222222", color3: "#333333" };
    const svg = renderSvg(s);
    for (const c of ["#111111", "#222222", "#333333"]) expect(svg).toContain(`fill="${c}"`);
    expect(svg).not.toContain("url(#");
  });
  it("palettes apply and are recognised", () => {
    for (const p of PALETTES) expect(activePalette({ ...DEFAULT_SETTINGS, ...paletteColors(p) })).toBe(p);
  });
});

describe("url compatibility", () => {
  it("links made before Phase 6 still decode, with new fields at defaults", () => {
    const old = "v=1&s=kalo7&f=gear&st=solid&fq=12&dt=3&ph=0&wp=0.5&sw=2.5&c=%231c1b22&bg=%23ffffff&cap=round&ly=1&sp=0.12&cp=1&rot=0&ar=1&ov=none&ovs=0.55&ovr=0&tr=1&px=2048";
    const s = decodeSettings(old)!;
    expect(s.family).toBe("gear");
    expect(s.fill).toBe("flat");
    expect(s.anim).toBe("none");
    expect(s.layerColors).toBe(false);
  });
  it("round-trips the new fields", () => {
    const s = sanitize({ ...DEFAULT_SETTINGS, fill: "radial", color2: "#abcdef", color3: "#123456", gradientAngle: 120, layerColors: true, anim: "warp", animDur: 8.5 });
    expect(decodeSettings(encodeSettings(s))).toEqual(s);
  });
});

describe("animation", () => {
  it("spin is a single animateTransform", () => {
    const svg = animatedSvg({ ...DEFAULT_SETTINGS, anim: "spin" });
    expect(svg.match(/<animateTransform/g)).toHaveLength(1);
  });
  it("phase and warp ship one discrete frame group per step", () => {
    for (const anim of ["phase", "warp"] as const) {
      const svg = animatedSvg({ ...withFamily(DEFAULT_SETTINGS, "spirograph"), anim });
      expect(svg.match(/<animate attributeName="opacity"/g)).toHaveLength(SVG_FRAMES);
      expect(svg).not.toMatch(/NaN|Infinity/);
    }
  });
  it("loops are seamless and stay within limits", () => {
    const s = { ...DEFAULT_SETTINGS, anim: "warp" as const, warp: 0.95 };
    for (let k = 0; k <= 40; k++) {
      const f = frameSettings(s, k / 40);
      expect(f.warp).toBeGreaterThanOrEqual(0);
      expect(f.warp).toBeLessThanOrEqual(1);
    }
    expect(frameSettings(s, 0)).toEqual(frameSettings(s, 1 - 1e-9 + 1e-9));
    expect(frameSvg({ ...DEFAULT_SETTINGS, anim: "phase" }, 0)).toEqual(frameSvg({ ...DEFAULT_SETTINGS, anim: "phase" }, 1));
  });
});

describe("outline strokes", () => {
  for (const f of FAMILIES)
    it(`${f.id}: every style outlines to plain filled shapes inside the canvas`, async () => {
      for (const style of STYLES) {
        const svg = await outlinedSvg({ ...withFamily(DEFAULT_SETTINGS, f.id), style });
        expect(svg, style).not.toMatch(/stroke=|<mask|<use|NaN/);
        const n = coords(svg);
        expect(n.length, style).toBeGreaterThan(0);
        expect(Math.min(...n), style).toBeGreaterThanOrEqual(-0.5);
        expect(Math.max(...n), style).toBeLessThanOrEqual(500.5);
      }
    });
  it("handles copies, overlay, layer colours and gradients together", async () => {
    const s = sanitize({ ...withFamily(DEFAULT_SETTINGS, "star"), copies: 4, rotation: 15, overlay: "rings", layers: 3, layerColors: true });
    const svg = await outlinedSvg(s);
    expect(svg.match(/<path /g)?.length).toBe(4); // 3 layer colours + overlay
    const grad = await outlinedSvg({ ...s, layerColors: false, fill: "linear" });
    expect(grad).toContain("url(#ol-grad)");
  });
});

describe("batch", () => {
  it("zips N SVG variations with share links", async () => {
    const blob = await batchZip(DEFAULT_SETTINGS, { count: 5, sameFamily: true, svg: true, png: false, outlined: false, shareBase: "https://x.test/" });
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const names = Object.keys(files);
    expect(names.filter((n) => n.endsWith(".svg"))).toHaveLength(5);
    expect(names.every((n) => n === "links.txt" || n.includes("rosette"))).toBe(true);
    expect(strFromU8(files["links.txt"]).trim().split("\n")).toHaveLength(5);
  });
});
