import type { Pt, Shape } from "./types";

export const TAU = Math.PI * 2;
export const deg = (d: number) => (d * Math.PI) / 180;

export const polar = (r: number, a: number, cx = 0, cy = 0): Pt => ({
  x: cx + r * Math.cos(a),
  y: cy + r * Math.sin(a),
});

/** Sample a parametric curve t ∈ [t0, t1]. */
export function sample(fn: (t: number) => Pt, t0: number, t1: number, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) pts.push(fn(t0 + ((t1 - t0) * i) / steps));
  return pts;
}

/** Regular polygon (or star when inner radius given). */
export function polygon(sides: number, r: number, rotation = 0, cx = 0, cy = 0): Pt[] {
  return Array.from({ length: sides }, (_, i) => polar(r, rotation + (TAU * i) / sides, cx, cy));
}

export function bounds(shapes: Shape[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes)
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function maxRadius(shapes: Shape[], cx: number, cy: number) {
  let r = 0;
  for (const s of shapes) for (const p of s.points) r = Math.max(r, Math.hypot(p.x - cx, p.y - cy));
  return r;
}

export function mapShapes(shapes: Shape[], fn: (p: Pt) => Pt): Shape[] {
  return shapes.map((s) => ({ ...s, points: s.points.map(fn) }));
}

const roundTo = (n: number, k: number) => {
  const v = Math.round(n * k) / k;
  return Object.is(v, -0) ? "0" : String(v);
};

/** Points → SVG path data, rounded to 2dp so output is stable and compact. */
export function toPathData(shape: Shape, decimals = 2): string {
  const k = 10 ** decimals;
  const r2 = (n: number) => roundTo(n, k);
  const pts = shape.points;
  if (pts.length === 0) return "";
  let d = `M${r2(pts[0].x)} ${r2(pts[0].y)}`;
  let last = `${r2(pts[0].x)} ${r2(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    const cur = `${r2(pts[i].x)} ${r2(pts[i].y)}`;
    if (cur !== last) d += `L${cur}`;
    last = cur;
  }
  return shape.closed ? d + "Z" : d;
}

/** Closed circle as a polygon (no duplicated end point). */
export function circle(r: number, cx = 0, cy = 0, n = 72): Pt[] {
  return Array.from({ length: n }, (_, i) => polar(r, (TAU * i) / n, cx, cy));
}

/** Arc from a0 to a1 (radians), inclusive of both ends. */
export function arc(r: number, a0: number, a1: number, cx = 0, cy = 0, n?: number): Pt[] {
  const steps = n ?? Math.max(4, Math.ceil((Math.abs(a1 - a0) / TAU) * 96));
  return sample((t) => polar(r, t, cx, cy), a0, a1, steps);
}

/** Rounded rectangle centred on (cx, cy). */
export function roundedRect(cx: number, cy: number, w: number, h: number, radius: number, n = 8): Pt[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const x0 = cx - w / 2 + r, x1 = cx + w / 2 - r, y0 = cy - h / 2 + r, y1 = cy + h / 2 - r;
  if (r === 0) return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  return [
    ...arc(r, Math.PI, 1.5 * Math.PI, x0, y0, n),
    ...arc(r, 1.5 * Math.PI, TAU, x1, y0, n),
    ...arc(r, 0, 0.5 * Math.PI, x1, y1, n),
    ...arc(r, 0.5 * Math.PI, Math.PI, x0, y1, n),
  ];
}

/** Stadium (rounded bar) around the segment a→b. */
export function capsule(a: Pt, b: Pt, r: number, n = 14): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  return [
    ...arc(r, ang - Math.PI / 2, ang + Math.PI / 2, b.x, b.y, n),
    ...arc(r, ang + Math.PI / 2, ang + 1.5 * Math.PI, a.x, a.y, n),
  ];
}

export function rotatePts(pts: Pt[], a: number, cx = 0, cy = 0): Pt[] {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map((p) => ({ x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
}

/** Chord of the unit-ish circle radius r along direction `a`, offset `d` from centre. */
export function chord(r: number, a: number, d: number): [Pt, Pt] | null {
  if (Math.abs(d) >= r) return null;
  const h = Math.sqrt(r * r - d * d);
  const ux = Math.cos(a), uy = Math.sin(a);
  const cx = -uy * d, cy = ux * d;
  return [
    { x: cx - ux * h, y: cy - uy * h },
    { x: cx + ux * h, y: cy + uy * h },
  ];
}

export function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
