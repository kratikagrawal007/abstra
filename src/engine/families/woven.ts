import type { Family, Shape } from "../types";
import { TAU, deg, polar, rotatePts, roundedRect, sample } from "../geometry";

export const knot: Family = {
  id: "knot",
  name: "Knot",
  group: "woven",
  labels: { frequency: "Loops", detail: "Winds" },
  ranges: { frequency: [2, 9], detail: [2, 7] },
  defaults: { frequency: 3, detail: 2, phase: 0, warp: 0.45, stroke: 6, style: "ribbon" },
  generate({ frequency: p, detail: q, phase, warp }) {
    const depth = 0.35 + warp * 0.6;
    const ph = deg(phase);
    // Split into strands at each crossing level so the ribbon style weaves over/under.
    const strands = 2 * q;
    const total = TAU * q;
    const shapes: Shape[] = [];
    for (let k = 0; k < strands; k++) {
      shapes.push({
        points: sample(
          (t) => polar(1.6 + depth * Math.cos((p * t) / q), t + ph),
          (total * k) / strands,
          (total * (k + 1)) / strands + 0.0001,
          140,
        ),
        closed: false,
      });
    }
    return shapes;
  },
};

export const weave: Family = {
  id: "weave",
  name: "Weave",
  group: "woven",
  labels: { frequency: "Bands", detail: "Corner" },
  ranges: { frequency: [2, 8], detail: [0, 6] },
  defaults: { frequency: 3, detail: 4, phase: 15, warp: 0.35, stroke: 5, style: "ribbon" },
  generate({ frequency: n, detail, phase, warp }) {
    const h = 0.28 + warp * 0.5;
    const radius = (detail / 6) * h * 0.5;
    return Array.from({ length: n }, (_, i) => ({
      points: rotatePts(roundedRect(0, 0, 2, h, radius), deg(phase) + (Math.PI * i) / n),
      closed: true,
    }));
  },
};

export const loopWreath: Family = {
  id: "loop-wreath",
  name: "Loop wreath",
  group: "woven",
  labels: { frequency: "Loops", detail: "Strands" },
  ranges: { frequency: [3, 16], detail: [1, 3] },
  defaults: { frequency: 8, detail: 1, phase: 0, warp: 0.55, stroke: 2.5, style: "double" },
  generate({ frequency: n, detail: strands, phase, warp }) {
    const l = 0.15 + warp * 0.35;
    const k = n + 1;
    const shapes: Shape[] = [];
    for (let s = 0; s < strands; s++) {
      const off = deg(phase) + (TAU * s) / (n * strands);
      const pts = sample(
        (t) => ({
          x: Math.cos(t + off) + l * Math.cos(k * t + off),
          y: Math.sin(t + off) + l * Math.sin(k * t + off),
        }),
        0,
        TAU,
        60 * k,
      );
      pts.pop();
      shapes.push({ points: pts, closed: true });
    }
    return shapes;
  },
};
