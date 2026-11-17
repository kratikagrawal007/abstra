import type { Family, Shape } from "../types";
import { TAU, deg, polar, sample } from "../geometry";

export const spiral: Family = {
  id: "spiral",
  name: "Spiral",
  group: "curves",
  labels: { frequency: "Turns", detail: "Arms" },
  ranges: { frequency: [1, 16], detail: [1, 8] },
  defaults: { frequency: 5, detail: 3, phase: 0, warp: 0.35, stroke: 2, style: "outline" },
  generate({ frequency: turns, detail: arms, phase, warp }) {
    const shapes: Shape[] = [];
    const exp = 0.6 + warp * 1.4;
    for (let k = 0; k < arms; k++) {
      const offset = deg(phase) + (TAU * k) / arms;
      shapes.push({
        points: sample(
          (t) => polar(0.04 + Math.pow(t, exp), offset + turns * TAU * t),
          0,
          1,
          Math.min(3000, 160 * turns),
        ),
        closed: false,
      });
    }
    return shapes;
  },
};
