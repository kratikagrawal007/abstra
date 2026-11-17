import type { Family, Pt, Shape } from "../types";
import { TAU, circle, deg, polar } from "../geometry";
import { sector } from "./radial";

export const petalRing: Family = {
  id: "petal-ring",
  name: "Petal ring",
  group: "radial",
  labels: { frequency: "Petals", detail: "Tiers" },
  ranges: { frequency: [3, 24], detail: [1, 3] },
  defaults: { frequency: 8, detail: 2, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail: tiers, phase, warp }) {
    const shapes: Shape[] = [];
    for (let tier = 0; tier < tiers; tier++) {
      const r0 = 0.1, r1 = 1 - tier * 0.28;
      const W = ((Math.PI * (r0 + r1)) / n) * (0.25 + warp * 0.55);
      for (let i = 0; i < n; i++) {
        const a = deg(phase) + (TAU * (i + tier * 0.5)) / n;
        const u = { x: Math.cos(a), y: Math.sin(a) }, v = { x: -u.y, y: u.x };
        const left: Pt[] = [], right: Pt[] = [];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const r = r0 + (r1 - r0) * t;
          const w = W * Math.pow(Math.sin(Math.PI * t), 0.8);
          left.push({ x: u.x * r + v.x * w, y: u.y * r + v.y * w });
          right.push({ x: u.x * r - v.x * w, y: u.y * r - v.y * w });
        }
        shapes.push({ points: [...left, ...right.reverse().slice(1, -1)], closed: true });
      }
    }
    return shapes;
  },
};

export const gear: Family = {
  id: "gear",
  name: "Gear",
  group: "radial",
  labels: { frequency: "Teeth", detail: "Tooth depth" },
  ranges: { frequency: [6, 40], detail: [1, 6] },
  defaults: { frequency: 12, detail: 3, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, phase, warp }) {
    const depth = 0.04 + detail * 0.035;
    const outer: Pt[] = [];
    const step = TAU / n;
    for (let i = 0; i < n; i++) {
      const a = deg(phase) + i * step;
      outer.push(
        polar(1 - depth, a),
        polar(1, a + step * 0.15),
        polar(1, a + step * 0.45),
        polar(1 - depth, a + step * 0.6),
      );
    }
    const shapes: Shape[] = [
      { points: outer, closed: true },
      { points: circle(0.2, 0, 0, 48), closed: true, hole: true },
    ];
    if (warp > 0.15) {
      const windows = 5;
      const ri = 0.34, ro = 0.34 + (1 - depth - 0.5) * warp + 0.1;
      const gap = 0.35;
      for (let k = 0; k < windows; k++) {
        const a = deg(phase) + (TAU * k) / windows;
        shapes.push({ points: sector(ri, Math.min(ro, 1 - depth - 0.1), a + gap / 2, a + TAU / windows - gap / 2), closed: true, hole: true });
      }
    }
    return shapes;
  },
};
