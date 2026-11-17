import type { Family, Pt, Shape } from "../types";
import { TAU, chord, circle, deg, polar, polygon, rotatePts, sample } from "../geometry";
import { createRng } from "../rng";

export const moire: Family = {
  id: "moire",
  name: "Moiré",
  group: "texture",
  labels: { frequency: "Rings", detail: "Centres" },
  ranges: { frequency: [3, 20], detail: [2, 4] },
  defaults: { frequency: 9, detail: 2, phase: 0, warp: 0.35, stroke: 1.5, style: "solid" },
  generate({ frequency: n, detail: centres, phase, warp }) {
    const off = 0.08 + warp * 0.45;
    const shapes: Shape[] = [];
    for (let c = 0; c < centres; c++) {
      const cc = polar(off, deg(phase) + (TAU * c) / centres);
      for (let i = 1; i <= n; i++) shapes.push({ points: circle(i / n, cc.x, cc.y, 120), closed: true });
    }
    return shapes;
  },
};

export const waves: Family = {
  id: "waves",
  name: "Waves",
  group: "texture",
  labels: { frequency: "Lines", detail: "Crests" },
  ranges: { frequency: [3, 30], detail: [1, 8] },
  defaults: { frequency: 10, detail: 3, phase: 0, warp: 0.4, stroke: 2.5, style: "outline" },
  generate({ frequency: n, detail: crests, phase, warp }) {
    const amp = (warp * 0.9) / n;
    const shapes: Shape[] = [];
    for (let i = 0; i < n; i++) {
      const d = -1 + (2 * (i + 0.5)) / n;
      const c = chord(1, 0, d);
      if (!c) continue;
      const [p, q] = c;
      shapes.push({
        points: sample(
          (t) => {
            const x = p.x + (q.x - p.x) * t;
            return { x, y: d + amp * Math.sin(crests * Math.PI * x + deg(phase) + i * 0.4) * Math.sin(Math.PI * t) };
          },
          0,
          1,
          80,
        ),
        closed: false,
      });
    }
    return shapes;
  },
};

export const scatter: Family = {
  id: "scatter",
  name: "Scatter",
  group: "texture",
  labels: { frequency: "Count", detail: "Shapes" },
  ranges: { frequency: [3, 30], detail: [1, 4] },
  defaults: { frequency: 14, detail: 1, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency, detail, phase, warp }, seed) {
    const rng = createRng(`${seed}:scatter`);
    const target = frequency * 4;
    const maxR = 0.08 + warp * 0.18, minR = maxR * 0.3;
    const placed: { x: number; y: number; r: number }[] = [];
    for (let tries = 0; tries < target * 60 && placed.length < target; tries++) {
      const r = rng.range(minR, maxR) * (1 - placed.length / (target * 1.6));
      const p = polar(Math.sqrt(rng.next()) * (1 - r), rng.range(0, TAU));
      if (placed.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > o.r + r + 0.02)) placed.push({ ...p, r });
    }
    return placed.map(({ x, y, r }, i) => {
      const kind = detail === 4 ? i % 3 : detail - 1;
      let pts: Pt[];
      if (kind === 0) pts = circle(r, x, y, 32);
      else if (kind === 1) pts = polygon(4, r * 1.1, deg(phase) + Math.PI / 4, x, y);
      else pts = rotatePts(polygon(3, r * 1.2, -Math.PI / 2, x, y), deg(phase) + i, x, y);
      return { points: pts, closed: true };
    });
  },
};
