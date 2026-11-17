import type { Family, Shape } from "../types";
import { deg, polygon } from "../geometry";
import { createRng } from "../rng";

export const honeycomb: Family = {
  id: "honeycomb",
  name: "Honeycomb",
  group: "geometry",
  labels: { frequency: "Missing cells", detail: "Cell rings" },
  ranges: { frequency: [0, 12], detail: [1, 4] },
  defaults: { frequency: 0, detail: 2, phase: 0, warp: 0.2, stroke: 3, style: "outline" },
  generate({ frequency: missing, detail: rings, phase, warp }, seed) {
    const rng = createRng(`${seed}:honeycomb`);
    const cells: { q: number; r: number }[] = [];
    for (let q = -rings; q <= rings; q++)
      for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) cells.push({ q, r });
    // knock out a seeded set of non-centre cells
    const removable = cells.filter((c) => c.q !== 0 || c.r !== 0);
    const drop = new Set<string>();
    for (let i = 0; i < Math.min(missing, removable.length - 1); i++) {
      const pool = removable.filter((c) => !drop.has(`${c.q},${c.r}`));
      const c = rng.pick(pool);
      drop.add(`${c.q},${c.r}`);
    }
    const size = 1;
    const cellR = size * (1 - warp * 0.6);
    const rot = deg(phase);
    const shapes: Shape[] = [];
    for (const c of cells) {
      if (drop.has(`${c.q},${c.r}`)) continue;
      const x0 = size * Math.sqrt(3) * (c.q + c.r / 2);
      const y0 = size * 1.5 * c.r;
      const x = x0 * Math.cos(rot) - y0 * Math.sin(rot);
      const y = x0 * Math.sin(rot) + y0 * Math.cos(rot);
      shapes.push({ points: polygon(6, cellR, Math.PI / 6 + rot, x, y), closed: true });
    }
    return shapes;
  },
};
