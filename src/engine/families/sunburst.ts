import type { Family, Shape } from "../types";
import { TAU, deg, polar, sample } from "../geometry";

export const sunburst: Family = {
  id: "sunburst",
  name: "Sunburst",
  group: "radial",
  labels: { frequency: "Rays", detail: "Length rhythm" },
  ranges: { frequency: [4, 48], detail: [1, 4] },
  defaults: { frequency: 16, detail: 2, phase: 0, warp: 0.35, stroke: 3, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const core = 0.26;
    const half = (Math.PI / n) * (0.25 + warp * 0.6);
    const shapes: Shape[] = [
      { points: sample((t) => polar(core, t), 0, TAU, 96).slice(0, -1), closed: true },
    ];
    for (let i = 0; i < n; i++) {
      const a = deg(phase) + (TAU * i) / n;
      const len = detail > 1 && i % detail !== 0 ? 0.72 : 1;
      const r0 = core + 0.08;
      shapes.push({
        points: [polar(r0, a - half), polar(len, a - half * 0.25), polar(len, a + half * 0.25), polar(r0, a + half)],
        closed: true,
      });
    }
    return shapes;
  },
};
