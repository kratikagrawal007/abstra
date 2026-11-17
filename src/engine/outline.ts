/**
 * "Outline strokes": the same artwork as renderSvg, but every stroke, dash, mask and cut is
 * converted to plain filled polygons. Useful for logo work (Figma booleans, cutters, fonts).
 * Clipper is loaded on demand so it never weighs on page load.
 */
import type { Settings, Shape } from "./types";
import { getFamily } from "./families";
import { signedArea } from "./geometry";
import {
  BOX,
  CENTER,
  RIBBON_GAP,
  buildScene,
  dashPattern,
  layerColor,
  makePaint,
  ribbonWidth,
  svgWrap,
  type RenderOptions,
} from "./render";

type IntPt = { X: number; Y: number };
type Paths = IntPt[][];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClipperNS = any;

const SC = 100; // Clipper works in integers: 0.01 user-unit precision

export async function outlinedSvg(s: Settings, opts: RenderOptions = {}): Promise<string> {
  const ClipperLib: ClipperNS = (await import("clipper-lib")).default;
  return outlineWith(ClipperLib, s, opts);
}

export function outlineWith(CL: ClipperNS, s: Settings, opts: RenderOptions = {}): string {
  const toInt = (pts: Shape["points"]): IntPt[] => pts.map((p) => ({ X: Math.round(p.x * SC), Y: Math.round(p.y * SC) }));
  const endType = s.cap === "round" ? CL.EndType.etOpenRound : s.cap === "square" ? CL.EndType.etOpenSquare : CL.EndType.etOpenButt;

  /** Stroke outline of shapes at half-width `half` (user units), honouring caps and closed/open paths. */
  const offset = (shapes: Shape[], half: number, forceEnd?: number): Paths => {
    const co = new CL.ClipperOffset(2, 0.15 * SC);
    for (const sh of shapes) {
      if (sh.points.length < 2) continue;
      co.AddPath(toInt(sh.points), CL.JoinType.jtRound, sh.closed ? CL.EndType.etClosedLine : (forceEnd ?? endType));
    }
    const out: Paths = [];
    co.Execute(out, half * SC);
    return out;
  };
  const bool = (a: Paths, b: Paths, type: number): Paths => {
    const c = new CL.Clipper();
    c.AddPaths(a, CL.PolyType.ptSubject, true);
    c.AddPaths(b, CL.PolyType.ptClip, true);
    const out: Paths = [];
    c.Execute(type, out, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
    return out;
  };
  const union = (a: Paths, b: Paths = []) => bool(a, b, CL.ClipType.ctUnion);
  const minus = (a: Paths, b: Paths) => bool(a, b, CL.ClipType.ctDifference);
  const fillPolys = (polys: Paths, rule: "evenodd" | "nonzero"): Paths => {
    const c = new CL.Clipper();
    c.AddPaths(polys, CL.PolyType.ptSubject, true);
    const out: Paths = [];
    const ft = rule === "evenodd" ? CL.PolyFillType.pftEvenOdd : CL.PolyFillType.pftNonZero;
    c.Execute(CL.ClipType.ctUnion, out, ft, ft);
    return out;
  };

  /** Split each shape into dash polylines along its length, like stroke-dasharray. */
  const dashes = (shapes: Shape[]): Shape[] => {
    const [on, off] = dashPattern(s);
    // Caps extend each dash by half the stroke at both ends; SVG measures dashes before caps too.
    const out: Shape[] = [];
    for (const sh of shapes) {
      const pts = sh.closed ? [...sh.points, sh.points[0]] : sh.points;
      let pos = 0; // distance into the current on/off cycle
      let drawing = true;
      let cur: Shape["points"] = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        let a = pts[i - 1];
        const b = pts[i];
        let seg = Math.hypot(b.x - a.x, b.y - a.y);
        while (seg > 0) {
          const left = (drawing ? on : off) - pos;
          if (seg < left) {
            pos += seg;
            if (drawing) cur.push(b);
            seg = 0;
          } else {
            const t = left / seg;
            const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            if (drawing) {
              cur.push(m);
              out.push({ points: cur, closed: false });
            }
            cur = [m];
            drawing = !drawing;
            pos = 0;
            seg -= left;
            a = m;
          }
        }
      }
      if (drawing && cur.length > 1) out.push({ points: cur, closed: false });
    }
    return out;
  };

  const styleOutline = (shapes: Shape[]): Paths => {
    const w = s.stroke;
    switch (s.style) {
      case "outline":
        return offset(shapes, w / 2);
      case "dashed":
        return offset(dashes(shapes), w / 2);
      case "solid": {
        const nonzero = getFamily(s.family).fill === "nonzero";
        const closed = shapes
          .filter((x) => x.closed)
          .map((x) => {
            if (!nonzero) return toInt(x.points);
            const ccw = signedArea(x.points) > 0;
            return toInt(ccw === !x.hole ? x.points : [...x.points].reverse());
          });
        const filled = fillPolys(closed, nonzero ? "nonzero" : "evenodd");
        const open = shapes.filter((x) => !x.closed);
        return open.length ? union(filled, offset(open, Math.max(w, 2) / 2)) : filled;
      }
      case "double":
        return minus(offset(shapes, (w * 3) / 2), offset(shapes, w / 2));
      case "ribbon": {
        const rw = ribbonWidth(w);
        let acc: Paths = [];
        for (const sh of shapes) {
          acc = minus(acc, offset([sh], rw * RIBBON_GAP));
          acc = union(acc, offset([sh], rw / 2));
        }
        return acc;
      }
    }
  };

  const scene = buildScene(s);
  const separate = s.layerColors && s.layers > 1;
  const { defs, paint } = makePaint(s, opts.id ?? "ol");
  const groups: { paint: string; polys: Paths }[] = separate
    ? scene.layers.map((layer, i) => ({ paint: layerColor(s, i), polys: styleOutline(layer) }))
    : [{ paint, polys: styleOutline(scene.layers.flat()) }];

  if (scene.overlay) {
    const ow = scene.overlayWidth;
    if (s.style === "solid") {
      const cut = offset(scene.overlay, ow);
      for (const g of groups) g.polys = minus(g.polys, cut);
    } else if (separate) {
      groups.push({ paint: s.color, polys: offset(scene.overlay, ow / 2) });
    } else {
      groups[0].polys = union(groups[0].polys, offset(scene.overlay, ow / 2));
    }
  }

  // Rotated copies are merged into one shape per colour, so the export is a clean single outline.
  const rotate = (polys: Paths, deg: number): Paths => {
    if (!deg) return polys;
    const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), k = CENTER * SC;
    return polys.map((p) => p.map(({ X, Y }) => ({ X: Math.round(k + (X - k) * c - (Y - k) * sn), Y: Math.round(k + (X - k) * sn + (Y - k) * c) })));
  };
  for (const g of groups) {
    if (s.copies > 1) {
      let merged: Paths = [];
      for (let k = 0; k < s.copies; k++) merged = union(merged, rotate(g.polys, s.rotation + (360 * k) / s.copies));
      g.polys = merged;
    } else {
      g.polys = rotate(g.polys, s.rotation);
    }
  }

  const fmt = (n: number) => String(Math.round(n) / SC);
  const d = (polys: Paths) =>
    polys
      .filter((p) => p.length > 2)
      .map((p) => "M" + p.map((q) => `${fmt(q.X)} ${fmt(q.Y)}`).join("L") + "Z")
      .join("");
  const body = groups.map((g) => `<path d="${d(g.polys)}" fill="${g.paint}" fill-rule="nonzero"/>`).join("");
  return svgWrap((defs ? `<defs>${defs}</defs>` : "") + body, s, opts);
}

export { BOX };
