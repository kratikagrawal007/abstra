import type { Family, Pt, Shape } from "../types";
import { TAU, deg, lerp, polar, sample } from "../geometry";

export const swirl: Family = {
  id: "swirl",
  name: "Swirl",
  group: "curves",
  labels: { frequency: "Turns", detail: "Arms" },
  ranges: { frequency: [1, 4], detail: [2, 12] },
  defaults: { frequency: 1, detail: 6, phase: 0, warp: 0.5, stroke: 2, style: "solid" },
  fill: "nonzero",
  generate({ frequency: turns, detail: arms, phase, warp }) {
    const shapes: Shape[] = [];
    const span = (TAU / arms) * (0.25 + warp * 0.5);
    const steps = 80 * turns;
    for (let k = 0; k < arms; k++) {
      const a0 = deg(phase) + (TAU * k) / arms;
      const angle = (t: number) => a0 + turns * TAU * Math.pow(t, 0.75);
      const width = (t: number) => span * Math.pow(t, 0.6) * (1 - 0.35 * t);
      const lead: Pt[] = [], trail: Pt[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = 0.02 + (0.98 * i) / steps;
        lead.push(polar(t, angle(t) + width(t) / 2));
        trail.push(polar(t, angle(t) - width(t) / 2));
      }
      // round the outer end with a small arc between the edges
      const tip = sample((u) => polar(1, angle(1) + lerp(width(1) / 2, -width(1) / 2, u)), 0, 1, 10);
      shapes.push({ points: [...lead, ...tip, ...trail.reverse()], closed: true });
    }
    return shapes;
  },
};

export const harmonograph: Family = {
  id: "harmonograph",
  name: "Harmonograph",
  group: "curves",
  labels: { frequency: "X rhythm", detail: "Y rhythm" },
  ranges: { frequency: [1, 8], detail: [1, 8] },
  defaults: { frequency: 3, detail: 2, phase: 40, warp: 0.3, stroke: 1, style: "outline" },
  generate({ frequency: fx, detail: fy, phase, warp }) {
    const ph = deg(phase);
    const detune = 0.004 + warp * 0.02;
    const damp = 0.012 + warp * 0.02;
    const T = TAU * 18;
    return [
      {
        points: sample(
          (t) => {
            const e = Math.exp(-damp * t);
            return {
              x: e * (Math.sin(fx * t + ph) + 0.6 * Math.sin((fx + detune) * t)),
              y: e * (Math.sin(fy * t) + 0.6 * Math.sin((fy + detune) * t + ph * 0.5)),
            };
          },
          0,
          T,
          4000,
        ),
        closed: false,
      },
    ];
  },
};

export const orbit: Family = {
  id: "orbit",
  name: "Orbit",
  group: "curves",
  labels: { frequency: "Meridians", detail: "Parallels" },
  ranges: { frequency: [0, 12], detail: [0, 9] },
  defaults: { frequency: 4, detail: 3, phase: 20, warp: 0.35, stroke: 2.5, style: "outline" },
  generate({ frequency: m, detail: p, phase, warp }) {
    const tilt = 0.12 + warp * 0.6;
    const ellipse = (rx: number, ry: number, cy: number): Shape => ({
      points: sample((t) => ({ x: rx * Math.cos(t), y: cy + ry * Math.sin(t) }), 0, TAU, 96).slice(0, -1),
      closed: true,
    });
    const shapes: Shape[] = [ellipse(1, 1, 0)];
    for (let i = 0; i < m; i++) {
      const rx = Math.abs(Math.cos(deg(phase) + (Math.PI * i) / m));
      if (rx > 0.02) shapes.push(ellipse(rx, 1, 0));
    }
    for (let j = 1; j <= p; j++) {
      const lat = -Math.PI / 2 + (Math.PI * j) / (p + 1);
      const r = Math.cos(lat);
      shapes.push(ellipse(r, r * tilt, Math.sin(lat)));
    }
    return shapes;
  },
};

export const softStar: Family = {
  id: "soft-star",
  name: "Soft star",
  group: "curves",
  labels: { frequency: "Lobes", detail: "Ripple" },
  ranges: { frequency: [3, 24], detail: [1, 6] },
  defaults: { frequency: 8, detail: 1, phase: 0, warp: 0.35, stroke: 4, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const amp = 0.06 + warp * 0.32;
    const pts = sample(
      (t) => {
        const r = 1 + amp * Math.cos(n * t) + (detail > 1 ? 0.04 * Math.cos(detail * n * t) : 0);
        return polar(r, t + deg(phase));
      },
      0,
      TAU,
      720,
    );
    pts.pop();
    return [{ points: pts, closed: true }];
  },
};

export const softPolygon: Family = {
  id: "soft-polygon",
  name: "Soft polygon",
  group: "curves",
  labels: { frequency: "Sides", detail: "Echoes" },
  ranges: { frequency: [3, 12], detail: [1, 8] },
  defaults: { frequency: 6, detail: 3, phase: 0, warp: 0.45, stroke: 3, style: "outline" },
  generate({ frequency: n, detail, phase, warp }) {
    const seg = TAU / n;
    const poly = (t: number) => Math.cos(Math.PI / n) / Math.cos(((((t % seg) + seg) % seg) - seg / 2));
    const shapes: Shape[] = [];
    for (let k = 0; k < detail; k++) {
      const scale = 1 - k * (0.8 / Math.max(detail, 2));
      const twist = deg(phase) * (k / Math.max(1, detail - 1));
      const pts = sample((t) => polar(scale * lerp(poly(t), 1, warp * 0.85), t + twist - Math.PI / 2), 0, TAU, 360);
      pts.pop();
      shapes.push({ points: pts, closed: true });
    }
    return shapes;
  },
};
