import type { Family, Pt, Shape } from "../types";
import { TAU, arc, circle, deg, polar, polygon, rotatePts, roundedRect, sample } from "../geometry";
import { createRng } from "../rng";

export const offsetRings: Family = {
  id: "offset-rings",
  name: "Offset rings",
  group: "geometry",
  labels: { frequency: "Rings", detail: "Drift" },
  ranges: { frequency: [2, 16], detail: [0, 10] },
  defaults: { frequency: 8, detail: 6, phase: 225, warp: 0.45, stroke: 2, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const dir = deg(phase);
    return Array.from({ length: n }, (_, i) => {
      const t = i / n;
      const r = 1 - t * (0.75 + warp * 0.2);
      const shift = (1 - r) * (detail / 10);
      const c = polar(shift, dir);
      return { points: circle(r, c.x, c.y, 120), closed: true };
    });
  },
};

export const dotted: Family = {
  id: "dotted",
  name: "Dotted",
  group: "geometry",
  labels: { frequency: "Density", detail: "Size rhythm" },
  ranges: { frequency: [3, 12], detail: [1, 4] },
  defaults: { frequency: 6, detail: 2, phase: 0, warp: 0.4, stroke: 2.5, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const step = 1 / n;
    const shapes: Shape[] = [];
    const base = step * (0.18 + warp * 0.3);
    const rowsN = Math.ceil(n / 0.866);
    for (let row = -rowsN; row <= rowsN; row++) {
      for (let col = -n - 1; col <= n + 1; col++) {
        const x = (col + (row % 2 ? 0.5 : 0)) * step;
        const y = row * step * 0.866;
        const d = Math.hypot(x, y);
        if (d > 1) continue;
        const k = detail === 1 ? 1 : detail === 2 ? 1.25 - d * 0.75 : detail === 3 ? 0.5 + d * 0.75 : 0.6 + 0.5 * Math.cos(d * 9);
        const p = rotatePts([{ x, y }], deg(phase))[0];
        shapes.push({ points: circle(base * Math.max(0.15, k), p.x, p.y, 20), closed: true });
      }
    }
    return shapes;
  },
};

/** Crescent: unit circle minus a circle shifted by d along +x. */
function crescent(d: number, r: number, cx: number, cy: number, rot: number): Pt[] {
  const a = Math.acos(Math.min(0.999, d / 2));
  const outer = arc(1, a, TAU - a, 0, 0, 48);
  const inner = arc(1, Math.PI + a, Math.PI - a, d, 0, 48);
  return rotatePts([...outer, ...inner], rot).map((p) => ({ x: cx + p.x * r, y: cy + p.y * r }));
}

export const crescents: Family = {
  id: "crescents",
  name: "Crescents",
  group: "geometry",
  labels: { frequency: "Columns", detail: "Rows" },
  ranges: { frequency: [1, 6], detail: [1, 6] },
  defaults: { frequency: 3, detail: 3, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  generate({ frequency: cols, detail: rows, phase, warp }) {
    const d = 0.35 + warp * 1.1;
    const shapes: Shape[] = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        shapes.push({
          points: crescent(d, 0.45, i - (cols - 1) / 2, j - (rows - 1) / 2, deg(phase) + ((i + j) % 4) * (Math.PI / 2)),
          closed: true,
        });
    return shapes;
  },
};

export const curveFan: Family = {
  id: "curve-fan",
  name: "Curve fan",
  group: "geometry",
  labels: { frequency: "Curves", detail: "Frame" },
  ranges: { frequency: [3, 32], detail: [1, 3] },
  defaults: { frequency: 12, detail: 1, phase: 0, warp: 0.5, stroke: 2, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const spread = Math.PI * (0.35 + warp * 0.6);
    const bend = (phase / 180 - 1) * 0.8;
    const base = { x: 0, y: 1 };
    const shapes: Shape[] = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 - spread / 2 + (spread * i) / Math.max(1, n - 1);
      const end = polar(1.6, a, base.x, base.y);
      const mid = { x: (base.x + end.x) / 2, y: (base.y + end.y) / 2 };
      const ctrl = { x: mid.x - (end.y - base.y) * bend * 0.3, y: mid.y + (end.x - base.x) * bend * 0.3 };
      shapes.push({
        points: sample(
          (t) => ({
            x: (1 - t) ** 2 * base.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x,
            y: (1 - t) ** 2 * base.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y,
          }),
          0,
          1,
          40,
        ),
        closed: false,
      });
    }
    if (detail >= 2) shapes.push({ points: arc(1.6, -Math.PI / 2 - spread / 2, -Math.PI / 2 + spread / 2, base.x, base.y), closed: false });
    if (detail >= 3) shapes.push({ points: circle(0.12, base.x, base.y, 32), closed: true });
    return shapes;
  },
};

export const perforated: Family = {
  id: "perforated",
  name: "Perforated",
  group: "geometry",
  labels: { frequency: "Columns", detail: "Hole pattern" },
  ranges: { frequency: [2, 8], detail: [1, 4] },
  defaults: { frequency: 4, detail: 1, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, warp }) {
    const plate = roundedRect(0, 0, 2, 2, 0.25 + warp * 0.3, 10);
    const shapes: Shape[] = [{ points: plate, closed: true }];
    const cell = 1.6 / n;
    const r = cell * 0.28;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < (detail === 1 ? 1 : n); j++) {
        const x = -0.8 + cell * (i + 0.5);
        const y = detail === 1 ? 0 : -0.8 + cell * (j + 0.5);
        let pts: Pt[];
        if (detail === 1) pts = roundedRect(x, y, r * 2, 1.4, r, 8);
        else if (detail === 2) pts = circle(r, x, y, 32);
        else if (detail === 3) pts = roundedRect(x, y, cell * 0.8, r, r / 2, 6);
        else pts = (i + j) % 2 ? circle(r, x, y, 32) : roundedRect(x, y, r * 2, r * 2, r * 0.3, 4);
        shapes.push({ points: pts, closed: true, hole: true });
      }
    return shapes;
  },
};

export const badge: Family = {
  id: "badge",
  name: "Badge",
  group: "geometry",
  labels: { frequency: "Frame sides", detail: "Star points" },
  ranges: { frequency: [3, 12], detail: [0, 12] },
  defaults: { frequency: 6, detail: 5, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail: points, phase, warp }) {
    const rot = deg(phase) - Math.PI / 2;
    const thick = 0.08 + warp * 0.2;
    const shapes: Shape[] = [
      { points: polygon(n, 1, rot), closed: true },
      { points: polygon(n, 1 - thick, rot), closed: true, hole: true },
    ];
    if (points >= 3) {
      const R = (1 - thick) * Math.cos(Math.PI / n) * 0.78;
      const star: Pt[] = [];
      for (let i = 0; i < points; i++) {
        const a = -Math.PI / 2 + (TAU * i) / points;
        star.push(polar(R, a), polar(R * 0.45, a + Math.PI / points));
      }
      shapes.push({ points: star, closed: true });
    } else if (points > 0) {
      shapes.push({ points: circle((1 - thick) * 0.5), closed: true });
    }
    return shapes;
  },
};

export const modules: Family = {
  id: "modules",
  name: "Modules",
  group: "geometry",
  labels: { frequency: "Grid", detail: "Variety" },
  ranges: { frequency: [2, 8], detail: [1, 4] },
  defaults: { frequency: 4, detail: 3, phase: 0, warp: 0.35, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, warp }, seed) {
    const rng = createRng(`${seed}:modules`);
    const cell = 2 / n;
    const s = cell * (0.92 - warp * 0.25);
    const shapes: Shape[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = -1 + cell * (i + 0.5), y = -1 + cell * (j + 0.5);
        const kind = rng.int(0, detail);
        let pts: Pt[];
        if (kind === 0) pts = roundedRect(x, y, s, s, s * 0.12);
        else if (kind === 1) pts = circle(s / 2, x, y, 40);
        else if (kind === 2) {
          // quarter disc anchored in a random corner
          const q = rng.int(0, 3) * (Math.PI / 2);
          const corner = polar(s / Math.SQRT2, q + Math.PI / 4 + Math.PI, x, y);
          pts = [corner, ...arc(s, q, q + Math.PI / 2, corner.x, corner.y, 20)];
        } else if (kind === 3) pts = roundedRect(x, y, s, s, s / 2);
        else pts = polygon(3, s * 0.58, rng.int(0, 3) * (Math.PI / 2), x, y);
        shapes.push({ points: pts, closed: true });
      }
    return shapes;
  },
};
