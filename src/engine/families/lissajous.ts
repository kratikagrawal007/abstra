import type { Family } from "../types";
import { TAU, deg, sample } from "../geometry";

export const lissajous: Family = {
  id: "lissajous",
  name: "Lissajous",
  group: "curves",
  labels: { frequency: "X rhythm", detail: "Y rhythm" },
  ranges: { frequency: [1, 12], detail: [1, 12] },
  defaults: { frequency: 3, detail: 4, phase: 90, warp: 0, stroke: 2.5, style: "outline" },
  generate({ frequency: a, detail: b, phase, warp }) {
    const ph = deg(phase);
    // warp pinches the figure toward the centre, like a decaying pendulum.
    const pts = sample(
      (t) => {
        const k = 1 - warp * 0.45 * (0.5 + 0.5 * Math.cos(t * 2));
        return { x: Math.sin(a * t + ph) * k, y: Math.sin(b * t) * k };
      },
      0,
      TAU,
      Math.min(2400, 240 * Math.max(a, b)),
    );
    return [{ points: pts, closed: true }];
  },
};
