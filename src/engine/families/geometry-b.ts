import type { Family, Pt, Shape } from "../types";
import { TAU, arc, chord, deg, polar, polygon, rotatePts, roundedRect } from "../geometry";
import { createRng } from "../rng";

export const panels: Family = {
  id: "panels",
  name: "Panels",
  group: "geometry",
  labels: { frequency: "Panels", detail: "Corner" },
  ranges: { frequency: [2, 12], detail: [0, 6] },
  defaults: { frequency: 5, detail: 4, phase: 90, warp: 0.5, stroke: 2.5, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const gap = 0.06;
    const w = (2 - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => {
      const h = 2 * (1 - warp * 0.6 * (0.5 + 0.5 * Math.sin(deg(phase) + (TAU * i) / n)));
      const x = -1 + w / 2 + i * (w + gap);
      return { points: roundedRect(x, 1 - h / 2, w, h, (detail / 6) * (w / 2)), closed: true };
    });
  },
};

export const cross: Family = {
  id: "cross",
  name: "Cross",
  group: "geometry",
  labels: { frequency: "Arms", detail: "Tips" },
  ranges: { frequency: [2, 12], detail: [1, 3] },
  defaults: { frequency: 4, detail: 1, phase: 0, warp: 0.45, stroke: 3, style: "double" },
  generate({ frequency: n, detail, phase, warp }) {
    const w = Math.min(0.08 + warp * 0.3, 0.9 * Math.sin(Math.PI / n));
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = deg(phase) + (TAU * i) / n;
      const u = { x: Math.cos(a), y: Math.sin(a) }, v = { x: -u.y, y: u.x };
      const L = detail === 2 ? 1 - w : 1;
      const at = (s: number, t: number) => ({ x: u.x * s + v.x * t, y: u.y * s + v.y * t });
      pts.push(at(L, -w));
      if (detail === 2) pts.push(...arc(w, a - Math.PI / 2, a + Math.PI / 2, u.x * L, u.y * L, 12).slice(1, -1));
      if (detail === 3) pts.push(at(L + w, 0));
      pts.push(at(L, w));
      const b = a + Math.PI / n;
      pts.push(polar(n === 2 ? w : w / Math.sin(Math.PI / n), b));
    }
    return [{ points: pts, closed: true }];
  },
};

export const steps: Family = {
  id: "steps",
  name: "Steps",
  group: "geometry",
  labels: { frequency: "Repeats", detail: "Steps" },
  ranges: { frequency: [1, 6], detail: [1, 8] },
  defaults: { frequency: 2, detail: 3, phase: 0, warp: 0.4, stroke: 3, style: "outline" },
  generate({ frequency: reps, detail: k, phase, warp }) {
    const quadrant = (): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i < k; i++) {
        const x0 = i / k, x1 = (i + 1) / k;
        pts.push({ x: x0, y: 1 - x0 }, { x: x1, y: 1 - x0 });
      }
      return pts;
    };
    const q = quadrant();
    const shapes: Shape[] = [];
    for (let r = 0; r < reps; r++) {
      const s = 1 - r * ((0.4 + warp * 0.5) / reps);
      const pts: Pt[] = [];
      for (let quad = 0; quad < 4; quad++) pts.push(...rotatePts(q, (-Math.PI / 2) * quad).map((p) => ({ x: p.x * s, y: p.y * s })));
      shapes.push({ points: rotatePts(pts, deg(phase)), closed: true });
    }
    return shapes;
  },
};

export const lattice: Family = {
  id: "lattice",
  name: "Lattice",
  group: "geometry",
  labels: { frequency: "Grids", detail: "Density" },
  ranges: { frequency: [1, 6], detail: [2, 14] },
  defaults: { frequency: 2, detail: 6, phase: 0, warp: 0.4, stroke: 1.5, style: "outline" },
  generate({ frequency: grids, detail: lines, phase, warp }) {
    const shapes: Shape[] = [{ points: arc(1, 0, TAU, 0, 0, 120), closed: false }];
    const span = 0.6 + warp * 0.4;
    for (let g = 0; g < grids; g++) {
      for (const turn of [0, Math.PI / 2]) {
        const a = deg(phase) + (Math.PI * g) / grids / 2 + turn;
        for (let i = 0; i < lines; i++) {
          const d = -span + (2 * span * (i + 0.5)) / lines;
          const c = chord(1, a, d);
          if (c) shapes.push({ points: c, closed: false });
        }
      }
    }
    return shapes;
  },
};

export const cubes: Family = {
  id: "cubes",
  name: "Cubes",
  group: "geometry",
  labels: { frequency: "Missing", detail: "Rings" },
  ranges: { frequency: [0, 10], detail: [1, 3] },
  defaults: { frequency: 0, detail: 1, phase: 0, warp: 0.15, stroke: 2.5, style: "outline" },
  generate({ frequency: missing, detail: rings, phase, warp }, seed) {
    const rng = createRng(`${seed}:cubes`);
    const s = 1 - warp * 0.5;
    const shapes: Shape[] = [];
    const cells: { x: number; y: number }[] = [];
    for (let q = -rings; q <= rings; q++)
      for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++)
        cells.push({ x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r });
    const drop = new Set<number>();
    while (drop.size < Math.min(missing, cells.length - 1)) drop.add(rng.int(1, cells.length - 1));
    cells.forEach((c, idx) => {
      if (drop.has(idx)) return;
      const hex = polygon(6, s, -Math.PI / 2, c.x, c.y);
      const mid = { x: c.x, y: c.y };
      // top, left and right faces of an isometric cube
      shapes.push({ points: [hex[0], hex[1], mid, hex[5]], closed: true });
      shapes.push({ points: [mid, hex[1], hex[2], hex[3]], closed: true });
      shapes.push({ points: [mid, hex[3], hex[4], hex[5]], closed: true });
    });
    return shapes.map((sh) => ({ ...sh, points: rotatePts(sh.points, deg(phase)) }));
  },
};

export const truchet: Family = {
  id: "truchet",
  name: "Tile paths",
  group: "geometry",
  labels: { frequency: "Grid", detail: "Tile set" },
  ranges: { frequency: [2, 10], detail: [1, 3] },
  defaults: { frequency: 5, detail: 1, phase: 0, warp: 0, stroke: 3, style: "outline" },
  generate({ frequency: n, detail }, seed) {
    const rng = createRng(`${seed}:truchet`);
    const c = 2 / n;
    const frame = roundedRect(0, 0, 2, 2, 0);
    const shapes: Shape[] = [{ points: [...frame, frame[0]], closed: false }];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x0 = -1 + i * c, y0 = -1 + j * c;
        const flip = rng.chance(0.5);
        const useArc = detail === 1 || (detail === 3 && rng.chance(0.5));
        if (useArc) {
          const h = c / 2;
          if (flip) {
            shapes.push({ points: arc(h, 0, Math.PI / 2, x0, y0, 12), closed: false });
            shapes.push({ points: arc(h, Math.PI, 1.5 * Math.PI, x0 + c, y0 + c, 12), closed: false });
          } else {
            shapes.push({ points: arc(h, Math.PI / 2, Math.PI, x0 + c, y0, 12), closed: false });
            shapes.push({ points: arc(h, 1.5 * Math.PI, TAU, x0, y0 + c, 12), closed: false });
          }
        } else {
          shapes.push({
            points: flip ? [{ x: x0, y: y0 }, { x: x0 + c, y: y0 + c }] : [{ x: x0 + c, y: y0 }, { x: x0, y: y0 + c }],
            closed: false,
          });
        }
      }
    return shapes;
  },
};
