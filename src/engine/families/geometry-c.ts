import type { Family, Pt, Shape } from "../types";
import { TAU, arc, capsule, circle, deg, polar, polygon, rotatePts, roundedRect } from "../geometry";
import { createRng } from "../rng";
import { sector } from "./radial";

export const flowerOfLife: Family = {
  id: "circle-grid",
  name: "Circle bloom",
  group: "geometry",
  labels: { frequency: "Circles per ring", detail: "Rings" },
  ranges: { frequency: [3, 12], detail: [1, 3] },
  defaults: { frequency: 6, detail: 1, phase: 0, warp: 0, stroke: 2, style: "outline" },
  generate({ frequency: n, detail: rings, phase, warp }) {
    const r = 1 - warp * 0.4;
    const shapes: Shape[] = [{ points: circle(r, 0, 0, 96), closed: true }];
    for (let j = 1; j <= rings; j++)
      for (let i = 0; i < n * j; i++) {
        const c = polar(j, deg(phase) + (TAU * i) / (n * j));
        shapes.push({ points: circle(r, c.x, c.y, 96), closed: true });
      }
    shapes.push({ points: circle(rings + r, 0, 0, 160), closed: true });
    return shapes;
  },
};

export const chevrons: Family = {
  id: "chevrons",
  name: "Chevrons",
  group: "geometry",
  labels: { frequency: "Stack", detail: "Directions" },
  ranges: { frequency: [1, 8], detail: [1, 4] },
  defaults: { frequency: 3, detail: 1, phase: 0, warp: 0.5, stroke: 3, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail: dirs, phase, warp }) {
    const h = 0.25 + warp * 0.7;
    const th = 0.6 / n;
    const gap = th * 0.6;
    const one = (y: number): Pt[] => [
      { x: -1, y: y + h }, { x: 0, y }, { x: 1, y: y + h },
      { x: 1, y: y + h + th }, { x: 0, y: y + th }, { x: -1, y: y + h + th },
    ];
    const stack: Pt[][] = Array.from({ length: n }, (_, i) => one(i * (th + gap)));
    const shapes: Shape[] = [];
    if (dirs === 1) {
      for (const c of stack) shapes.push({ points: rotatePts(c, deg(phase)), closed: true });
    } else {
      for (let d = 0; d < dirs; d++)
        for (const c of stack) {
          // push each stack outward so they point to the centre
          const moved = c.map((p) => ({ x: p.x * 0.6, y: p.y * 0.6 + 0.35 }));
          shapes.push({ points: rotatePts(moved, deg(phase) + (TAU * d) / dirs), closed: true });
        }
    }
    return shapes;
  },
};

export const archStack: Family = {
  id: "arch-stack",
  name: "Arch stack",
  group: "geometry",
  labels: { frequency: "Arches", detail: "Bands" },
  ranges: { frequency: [1, 5], detail: [1, 6] },
  defaults: { frequency: 1, detail: 4, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  generate({ frequency: n, detail: bands, phase, warp }) {
    const shapes: Shape[] = [];
    const R = 1;
    const step = R / (bands + 0.5);
    const th = step * (0.35 + warp * 0.55);
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 2 * R;
      const flip = phase >= 180 && i % 2 === 1;
      for (let b = 0; b < bands; b++) {
        const ro = R - b * step;
        const pts = sector(Math.max(0.001, ro - th), ro, flip ? 0 : Math.PI, flip ? Math.PI : TAU);
        shapes.push({ points: pts.map((p) => ({ x: p.x + cx, y: p.y })), closed: true });
      }
    }
    return shapes;
  },
};

export const linkedCells: Family = {
  id: "linked-cells",
  name: "Linked cells",
  group: "geometry",
  labels: { frequency: "Grid", detail: "Cell shape" },
  ranges: { frequency: [2, 7], detail: [1, 3] },
  defaults: { frequency: 4, detail: 1, phase: 0, warp: 0.5, stroke: 2.5, style: "solid" },
  fill: "nonzero",
  generate({ frequency: n, detail, warp }, seed) {
    const rng = createRng(`${seed}:linked`);
    const cell = 2 / n;
    const r = cell * 0.3;
    const at = (i: number, j: number) => ({ x: -1 + cell * (i + 0.5), y: -1 + cell * (j + 0.5) });
    const shapes: Shape[] = [];
    const p = 0.25 + warp * 0.6;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const c = at(i, j);
        const s = detail === 1 || (detail === 3 && (i + j) % 2 === 0) ? circle(r, c.x, c.y, 40) : roundedRect(c.x, c.y, r * 2, r * 2, r * 0.3, 6);
        shapes.push({ points: s, closed: true });
        if (i < n - 1 && rng.chance(p)) shapes.push({ points: capsule(c, at(i + 1, j), r * 0.45, 8), closed: true });
        if (j < n - 1 && rng.chance(p)) shapes.push({ points: capsule(c, at(i, j + 1), r * 0.45, 8), closed: true });
      }
    return shapes;
  },
};

export const notched: Family = {
  id: "notched",
  name: "Notched",
  group: "geometry",
  labels: { frequency: "Sides", detail: "Notch style" },
  ranges: { frequency: [3, 10], detail: [1, 3] },
  defaults: { frequency: 4, detail: 1, phase: 45, warp: 0.45, stroke: 3, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const verts = polygon(n, 1, deg(phase));
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = verts[i], b = verts[(i + 1) % n];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      // inward normal points toward the centre
      const nx = -mx / Math.hypot(mx, my), ny = -my / Math.hypot(mx, my);
      const w = len * (0.12 + warp * 0.28);
      pts.push(a, { x: mx - ux * w, y: my - uy * w });
      if (detail === 1) {
        const ang = Math.atan2(uy, ux);
        // semicircle bite curving inward
        const bite = arc(w, ang + Math.PI, ang, mx, my, 16);
        const flipIn = nx * Math.cos(ang - Math.PI / 2) + ny * Math.sin(ang - Math.PI / 2) > 0;
        pts.push(...(flipIn ? arc(w, ang + Math.PI, ang + 2 * Math.PI, mx, my, 16) : bite).slice(1, -1));
      } else if (detail === 2) {
        pts.push({ x: mx - ux * w + nx * w, y: my - uy * w + ny * w }, { x: mx + ux * w + nx * w, y: my + uy * w + ny * w });
      } else {
        pts.push({ x: mx + nx * w * 1.2, y: my + ny * w * 1.2 });
      }
      pts.push({ x: mx + ux * w, y: my + uy * w });
    }
    return [{ points: pts, closed: true }];
  },
};
