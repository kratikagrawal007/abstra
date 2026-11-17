import type { Family, Pt } from "../types";
import { TAU, deg, polar } from "../geometry";

export const star: Family = {
  id: "star",
  name: "Star",
  group: "radial",
  labels: { frequency: "Points", detail: "Inset depth" },
  ranges: { frequency: [3, 24], detail: [1, 9] },
  defaults: { frequency: 8, detail: 4, phase: 0, warp: 0.25, stroke: 4, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const inner = 1 - detail * 0.09;
    const twist = (warp * Math.PI) / n;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = deg(phase) - Math.PI / 2 + (TAU * i) / n;
      pts.push(polar(1, a));
      pts.push(polar(inner, a + Math.PI / n + twist));
    }
    return [{ points: pts, closed: true }];
  },
};
