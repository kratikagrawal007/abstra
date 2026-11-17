import type { Family, Shape } from "../types";
import { TAU, deg, polar, sample } from "../geometry";
import { createRng } from "../rng";

export const supershape: Family = {
  id: "supershape",
  name: "Supershape",
  group: "curves",
  labels: { frequency: "Symmetry", detail: "Fullness" },
  ranges: { frequency: [2, 16], detail: [1, 10] },
  defaults: { frequency: 5, detail: 1, phase: 0, warp: 0.05, stroke: 3, style: "solid" },
  generate({ frequency: m, detail, phase, warp }) {
    const n1 = 0.12 + detail * 0.3;
    const n2 = 0.25 + warp * 2.5;
    const pts = sample(
      (t) => {
        const a = (m * t) / 4;
        const r = Math.pow(Math.pow(Math.abs(Math.cos(a)), n2) + Math.pow(Math.abs(Math.sin(a)), n2), -1 / n1);
        return polar(r, t + deg(phase) - Math.PI / 2);
      },
      0,
      TAU,
      720,
    );
    pts.pop();
    return [{ points: pts, closed: true }];
  },
};

export const epicycle: Family = {
  id: "epicycle",
  name: "Epicycle",
  group: "curves",
  labels: { frequency: "Symmetry", detail: "Harmonic" },
  ranges: { frequency: [2, 12], detail: [1, 4] },
  defaults: { frequency: 5, detail: 1, phase: 0, warp: 0.5, stroke: 2, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    // Frequencies ≡ 1 (mod n) give exact n-fold symmetry.
    const k1 = 1 - n, k2 = 1 + n * detail;
    const a = 0.2 + warp * 0.5, b = 0.12 + (1 - warp) * 0.2;
    const ph = deg(phase);
    const pts = sample(
      (t) => ({
        x: Math.cos(t) + a * Math.cos(k1 * t + ph) + b * Math.cos(k2 * t),
        y: Math.sin(t) + a * Math.sin(k1 * t + ph) + b * Math.sin(k2 * t),
      }),
      0,
      TAU,
      Math.min(3000, 120 * (n + n * detail)),
    );
    pts.pop();
    return [{ points: pts, closed: true }];
  },
};

export const contours: Family = {
  id: "contours",
  name: "Contours",
  group: "curves",
  labels: { frequency: "Levels", detail: "Roughness" },
  ranges: { frequency: [2, 16], detail: [1, 6] },
  defaults: { frequency: 8, detail: 3, phase: 0, warp: 0.5, stroke: 2, style: "outline" },
  generate({ frequency: levels, detail, phase, warp }, seed) {
    const rng = createRng(`${seed}:contours`);
    const harmonics = Array.from({ length: detail + 1 }, (_, j) => ({
      k: j + 2,
      amp: rng.range(0.3, 1) / (j + 2),
      ph: rng.range(0, TAU),
      drift: rng.range(-1, 1),
    }));
    const shapes: Shape[] = [];
    for (let l = 0; l < levels; l++) {
      const base = 1 - (l / levels) * 0.9;
      const amp = warp * 0.35 * (0.4 + 0.6 * (l / levels));
      const pts = sample(
        (t) => {
          let r = 1;
          for (const h of harmonics) r += amp * h.amp * Math.cos(h.k * t + h.ph + h.drift * l * 0.25);
          return polar(base * r, t + deg(phase));
        },
        0,
        TAU,
        240,
      );
      pts.pop();
      shapes.push({ points: pts, closed: true });
    }
    return shapes;
  },
};
