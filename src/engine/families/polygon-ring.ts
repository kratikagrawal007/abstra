import type { Family, Shape } from "../types";
import { TAU, deg, polar, polygon } from "../geometry";

export const polygonRing: Family = {
  id: "polygon-ring",
  name: "Polygon ring",
  group: "geometry",
  labels: { frequency: "Repeats", detail: "Sides" },
  ranges: { frequency: [2, 24], detail: [3, 10] },
  defaults: { frequency: 8, detail: 4, phase: 10, warp: 0.3, stroke: 2.5, style: "outline" },
  generate({ frequency: n, detail: sides, phase, warp }) {
    const shapes: Shape[] = [];
    const orbit = 0.5;
    const size = 0.3 + warp * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n;
      const c = polar(orbit, a);
      shapes.push({ points: polygon(sides, size, a + deg(phase), c.x, c.y), closed: true });
    }
    return shapes;
  },
};
