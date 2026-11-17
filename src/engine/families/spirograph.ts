import type { Family } from "../types";
import { TAU, deg, sample } from "../geometry";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const spirograph: Family = {
  id: "spirograph",
  name: "Spirograph",
  group: "curves",
  labels: { frequency: "Outer gear", detail: "Inner gear" },
  ranges: { frequency: [3, 24], detail: [1, 12] },
  defaults: { frequency: 7, detail: 3, phase: 0, warp: 0.65, stroke: 1.5, style: "outline" },
  generate({ frequency: R, detail, phase, warp }) {
    const r = Math.min(detail, R - 1);
    const d = r * (0.2 + warp);
    const loops = r / gcd(R, r);
    const ph = deg(phase);
    const pts = sample(
      (t) => ({
        x: (R - r) * Math.cos(t + ph) + d * Math.cos(((R - r) / r) * t + ph),
        y: (R - r) * Math.sin(t + ph) - d * Math.sin(((R - r) / r) * t + ph),
      }),
      0,
      TAU * loops,
      Math.min(4000, 300 * loops + 20 * R),
    );
    return [{ points: pts, closed: true }];
  },
};
