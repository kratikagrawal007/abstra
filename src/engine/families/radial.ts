import type { Family, Pt, Shape } from "../types";
import { TAU, arc, capsule, circle, deg, lerp, polar, sample } from "../geometry";

/** Annular sector between radii r0..r1 and angles a0..a1. */
export function sector(r0: number, r1: number, a0: number, a1: number): Pt[] {
  return [...arc(r1, a0, a1), ...(r0 > 0.001 ? arc(r0, a1, a0) : [{ x: 0, y: 0 }])];
}

export const pinwheel: Family = {
  id: "pinwheel",
  name: "Pinwheel",
  group: "radial",
  labels: { frequency: "Blades", detail: "Bend" },
  ranges: { frequency: [3, 24], detail: [0, 8] },
  defaults: { frequency: 10, detail: 3, phase: 0, warp: 0.4, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, phase, warp }) {
    const bend = detail * 0.18;
    const width = (TAU / n) * (0.2 + warp * 0.6);
    return Array.from({ length: n }, (_, i) => {
      const a = deg(phase) + (TAU * i) / n;
      const lead = sample((r) => polar(r, a + bend * r * r), 0.12, 1, 40);
      const trail = sample((r) => polar(r, a + width * r + bend * r * r * 0.9), 1, 0.12, 40);
      return { points: [...lead, ...trail], closed: true };
    });
  },
};

export const diamonds: Family = {
  id: "diamonds",
  name: "Diamonds",
  group: "radial",
  labels: { frequency: "Diamonds", detail: "Nested" },
  ranges: { frequency: [3, 18], detail: [1, 5] },
  defaults: { frequency: 6, detail: 2, phase: 0, warp: 0.45, stroke: 3, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const shapes: Shape[] = [];
    const r0 = 0.12, r1 = 1;
    const mid = (r0 + r1) / 2;
    const hw = Math.min(0.12 + warp * 0.3, mid * Math.tan(Math.PI / n) * 0.95);
    for (let i = 0; i < n; i++) {
      const a = deg(phase) + (TAU * i) / n;
      const u = { x: Math.cos(a), y: Math.sin(a) }, v = { x: -u.y, y: u.x };
      for (let k = 0; k < detail; k++) {
        const s = 1 - k / detail;
        const c = mid;
        const half = ((r1 - r0) / 2) * s;
        shapes.push({
          points: [
            { x: u.x * (c - half), y: u.y * (c - half) },
            { x: u.x * c + v.x * hw * s, y: u.y * c + v.y * hw * s },
            { x: u.x * (c + half), y: u.y * (c + half) },
            { x: u.x * c - v.x * hw * s, y: u.y * c - v.y * hw * s },
          ],
          closed: true,
        });
      }
    }
    return shapes;
  },
};

export const splitDisc: Family = {
  id: "split-disc",
  name: "Split disc",
  group: "radial",
  labels: { frequency: "Segments", detail: "Core" },
  ranges: { frequency: [2, 16], detail: [0, 8] },
  defaults: { frequency: 6, detail: 3, phase: 0, warp: 0.25, stroke: 2.5, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const gap = (TAU / n) * warp * 0.35;
    const r0 = detail * 0.08;
    return Array.from({ length: n }, (_, i) => {
      const a = deg(phase) + (TAU * i) / n;
      return { points: sector(r0, 1, a + gap / 2, a + TAU / n - gap / 2), closed: true };
    });
  },
};

export const radialBands: Family = {
  id: "radial-bands",
  name: "Radial bands",
  group: "radial",
  labels: { frequency: "Arcs per ring", detail: "Rings" },
  ranges: { frequency: [1, 12], detail: [1, 8] },
  defaults: { frequency: 4, detail: 4, phase: 30, warp: 0.4, stroke: 2.5, style: "solid" },
  generate({ frequency: n, detail: rings, phase, warp }) {
    const shapes: Shape[] = [];
    const step = 0.85 / rings;
    const band = step * (0.35 + warp * 0.55);
    for (let j = 0; j < rings; j++) {
      const r1 = 1 - j * step;
      const gap = (TAU / n) * 0.18;
      for (let i = 0; i < n; i++) {
        const a = deg(phase) * j + (TAU * i) / n;
        shapes.push({ points: sector(r1 - band, r1, a + gap / 2, a + TAU / n - gap / 2), closed: true });
      }
    }
    return shapes;
  },
};

export const softBranches: Family = {
  id: "soft-branches",
  name: "Soft branches",
  group: "radial",
  labels: { frequency: "Arms", detail: "Twigs" },
  ranges: { frequency: [2, 12], detail: [0, 3] },
  defaults: { frequency: 5, detail: 1, phase: 0, warp: 0.4, stroke: 2, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail: twigs, phase, warp }) {
    const w = 0.07 + warp * 0.1;
    const shapes: Shape[] = [{ points: circle(w * 2.2), closed: true }];
    for (let i = 0; i < n; i++) {
      const a = deg(phase) + (TAU * i) / n;
      shapes.push({ points: capsule({ x: 0, y: 0 }, polar(1 - w, a), w), closed: true });
      for (let k = 1; k <= twigs; k++) {
        const at = 0.3 + (0.5 * k) / (twigs + 0.5);
        const base = polar(at, a);
        const len = 0.38 * (1 - at * 0.5);
        for (const side of [-1, 1]) {
          const end = polar(len, a + side * 0.75, base.x, base.y);
          shapes.push({ points: capsule(base, end, w * 0.75), closed: true });
        }
      }
    }
    return shapes;
  },
};

export const cutoutBloom: Family = {
  id: "cutout-bloom",
  name: "Cutout bloom",
  group: "radial",
  labels: { frequency: "Lobes", detail: "Hole size" },
  ranges: { frequency: [3, 12], detail: [0, 6] },
  defaults: { frequency: 6, detail: 3, phase: 0, warp: 0.45, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, phase, warp }) {
    const ph = deg(phase);
    const amp = 0.12 + warp * 0.3;
    const outer = sample((t) => polar(1 - amp + amp * Math.cos(n * (t - ph)), t), 0, TAU, 480);
    outer.pop();
    const shapes: Shape[] = [{ points: outer, closed: true }];
    if (detail > 0) {
      const hr = (detail / 6) * 0.55 * Math.sin(Math.PI / n) * (1 - amp * 0.5);
      for (let i = 0; i < n; i++) {
        const c = polar(0.6, ph + (TAU * i) / n);
        shapes.push({ points: circle(hr, c.x, c.y, 48), closed: true, hole: true });
      }
      shapes.push({ points: circle(hr * 0.8, 0, 0, 48), closed: true, hole: true });
    }
    return shapes;
  },
};

export const spokes: Family = {
  id: "spokes",
  name: "Spokes",
  group: "radial",
  labels: { frequency: "Rays", detail: "Length rhythm" },
  ranges: { frequency: [4, 72], detail: [1, 4] },
  defaults: { frequency: 24, detail: 2, phase: 0, warp: 0.3, stroke: 2, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const r0 = 0.12 + warp * 0.4;
    const shapes: Shape[] = Array.from({ length: n }, (_, i) => {
      const a = deg(phase) + (TAU * i) / n;
      const len = detail > 1 && i % detail ? lerp(r0, 1, 0.7) : 1;
      return { points: [polar(r0, a), polar(len, a)], closed: false };
    });
    shapes.push({ points: circle(r0 * 0.6, 0, 0, 72), closed: true });
    return shapes;
  },
};
