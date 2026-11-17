import type { Family } from "../types";
import { TAU, deg, polar, sample } from "../geometry";

export const rosette: Family = {
  id: "rosette",
  name: "Rosette",
  group: "curves",
  labels: { frequency: "Petals", detail: "Ripple" },
  ranges: { frequency: [2, 16], detail: [1, 8] },
  defaults: { frequency: 5, detail: 2, phase: 20, warp: 0.6, stroke: 3, style: "solid" },
  generate({ frequency: n, detail, phase, warp }) {
    const ph = deg(phase);
    const pts = sample(
      (t) => {
        const petal = Math.pow(Math.abs(Math.cos((n * t) / 2)), 0.8);
        const ripple = 0.06 * Math.cos(detail * n * t) * (detail > 1 ? 1 : 0);
        const r = 1 - warp * 0.75 + warp * 0.75 * petal + ripple;
        // a gentle twist so petals lean like a pinwheel
        return polar(r, t + ph + 0.18 * warp * Math.sin(n * t));
      },
      0,
      TAU,
      720 + n * 40,
    );
    pts.pop();
    return [{ points: pts, closed: true }];
  },
};
