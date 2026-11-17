import type { Family, Shape } from "../types";
import { TAU, deg, polar, rotatePts, sample } from "../geometry";

export const chain: Family = {
  id: "chain",
  name: "Chain",
  group: "woven",
  labels: { frequency: "Links", detail: "Rows" },
  ranges: { frequency: [5, 24], detail: [1, 3] },
  defaults: { frequency: 10, detail: 1, phase: 0, warp: 0.4, stroke: 4, style: "ribbon" },
  generate({ frequency: n, detail: rows, phase, warp }) {
    const shapes: Shape[] = [];
    for (let row = 0; row < rows; row++) {
      const R = 1 - row * 0.32;
      const count = Math.max(5, Math.round(n * R));
      const len = ((TAU * R) / count) * 0.75;
      const wid = len * (0.35 + warp * 0.4);
      for (let i = 0; i < count; i++) {
        const a = deg(phase) + (TAU * (i + row * 0.5)) / count;
        const c = polar(R, a);
        const oval = sample((t) => ({ x: len * Math.cos(t), y: wid * Math.sin(t) }), 0, TAU, 48);
        oval.pop();
        shapes.push({ points: rotatePts(oval, a + Math.PI / 2).map((p) => ({ x: p.x + c.x, y: p.y + c.y })), closed: true });
      }
    }
    return shapes;
  },
};
