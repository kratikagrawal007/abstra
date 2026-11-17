import type { Family, Shape } from "../types";
import { TAU, arc, chord, circle, deg, polar, sample } from "../geometry";

export const rings: Family = {
  id: "rings",
  name: "Rings",
  group: "texture",
  labels: { frequency: "Rings", detail: "Arc segments" },
  ranges: { frequency: [2, 16], detail: [1, 8] },
  defaults: { frequency: 6, detail: 3, phase: 25, warp: 0.25, stroke: 4, style: "outline" },
  generate({ frequency: n, detail: segs, phase, warp }) {
    const shapes: Shape[] = [];
    for (let j = 0; j < n; j++) {
      const r = 1 - (j / n) * 0.85;
      if (segs === 1 && warp < 0.02) {
        shapes.push({ points: circle(r, 0, 0, 120), closed: true });
        continue;
      }
      const gap = (TAU / segs) * (0.04 + warp * 0.5);
      for (let i = 0; i < segs; i++) {
        const a = deg(phase) * j + (TAU * i) / segs;
        shapes.push({ points: arc(r, a + gap / 2, a + TAU / segs - gap / 2), closed: false });
      }
    }
    return shapes;
  },
};

export const lineDisc: Family = {
  id: "line-disc",
  name: "Line disc",
  group: "texture",
  labels: { frequency: "Lines", detail: "Directions" },
  ranges: { frequency: [4, 40], detail: [1, 4] },
  defaults: { frequency: 14, detail: 1, phase: 45, warp: 0.1, stroke: 3, style: "outline" },
  generate({ frequency: n, detail: dirs, phase, warp }) {
    const shapes: Shape[] = [];
    for (let k = 0; k < dirs; k++) {
      const a = deg(phase) + (Math.PI * k) / dirs;
      for (let i = 0; i < n; i++) {
        const d = -1 + (2 * (i + 0.5)) / n;
        const c = chord(1, a, d);
        if (!c) continue;
        const [p, q] = c;
        const nx = -Math.sin(a), ny = Math.cos(a);
        const amp = warp * 0.08;
        shapes.push({
          points: sample(
            (t) => {
              const w = amp * Math.sin(t * Math.PI * 4) * Math.sin(t * Math.PI);
              return { x: p.x + (q.x - p.x) * t + nx * w, y: p.y + (q.y - p.y) * t + ny * w };
            },
            0,
            1,
            amp > 0 ? 48 : 1,
          ),
          closed: false,
        });
      }
    }
    return shapes;
  },
};

export const beads: Family = {
  id: "beads",
  name: "Beads",
  group: "texture",
  labels: { frequency: "Beads", detail: "Rings" },
  ranges: { frequency: [3, 16], detail: [1, 6] },
  defaults: { frequency: 8, detail: 3, phase: 0, warp: 0.35, stroke: 3, style: "outline" },
  generate({ frequency: n, detail: ringsN, phase, warp }) {
    const shapes: Shape[] = [];
    for (let j = 0; j < ringsN; j++) {
      const R = 1 - (j / ringsN) * 0.9;
      const count = Math.max(3, Math.round(n * R * 1.5));
      const br = Math.min((Math.PI * R) / count, 0.9 / ringsN / 2) * (0.35 + warp * 0.6);
      for (let i = 0; i < count; i++) {
        const c = polar(R, deg(phase) * (j + 1) + (TAU * i) / count);
        shapes.push({ points: circle(br, c.x, c.y, 28), closed: true });
      }
    }
    return shapes;
  },
};

export const stringArt: Family = {
  id: "string-art",
  name: "String art",
  group: "texture",
  labels: { frequency: "Pins", detail: "Multiplier" },
  ranges: { frequency: [4, 30], detail: [2, 12] },
  defaults: { frequency: 12, detail: 3, phase: 0, warp: 0.2, stroke: 1, style: "outline" },
  generate({ frequency, detail: k, phase, warp }) {
    const pins = frequency * 6;
    const pin = (i: number) => polar(1, deg(phase) - Math.PI / 2 + (TAU * i) / pins);
    const shapes: Shape[] = [];
    const skip = Math.round(warp * 10);
    for (let i = 0; i < pins; i++) {
      const j = (i * k + skip) % pins;
      if (j !== i) shapes.push({ points: [pin(i), pin(j)], closed: false });
    }
    shapes.push({ points: arc(1, 0, TAU, 0, 0, 120), closed: false });
    return shapes;
  },
};
