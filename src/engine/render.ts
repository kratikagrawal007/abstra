import type { GenParams, Pt, Settings, Shape } from "./types";
import { getFamily } from "./families";
import { bounds, deg, mapShapes, maxRadius, signedArea, toPathData } from "./geometry";

export const BOX = 500;
const C = BOX / 2;
const PAD = 36;

// Small LRU-ish cache: dragging colour/stroke sliders must not regenerate geometry.
const cache = new Map<string, Shape[]>();
function generate(family: string, p: GenParams, seed: string): Shape[] {
  const key = `${family}|${p.frequency}|${p.detail}|${p.phase}|${p.warp}|${seed}`;
  let shapes = cache.get(key);
  if (!shapes) {
    shapes = getFamily(family).generate(p, seed);
    if (cache.size > 300) cache.delete(cache.keys().next().value!);
    cache.set(key, shapes);
  }
  return shapes;
}

/** How far ink reaches beyond the centre line, so fitting never clips strokes. */
function inkWidth(s: Settings): number {
  switch (s.style) {
    case "double":
      return s.stroke * 3;
    case "ribbon":
      return ribbonWidth(s.stroke);
    case "solid":
      return s.stroke * 0.5;
    default:
      return s.stroke;
  }
}
const ribbonWidth = (w: number) => Math.max(4, w * 2.2);

/** Scale + centre shapes into the box. Radial fit when the art will be rotated. */
function fit(shapes: Shape[], s: Settings, area: number): Shape[] {
  const b = bounds(shapes);
  const radial = s.copies > 1 || s.rotation % 90 !== 0 || s.anim === "spin";
  const room = area / 2 - inkWidth(s) / 2;
  let scale: number;
  if (radial) scale = room / Math.max(1e-6, maxRadius(shapes, b.cx, b.cy));
  else scale = (room * 2) / Math.max(1e-6, b.maxX - b.minX, b.maxY - b.minY);
  return mapShapes(shapes, (p) => ({ x: C + (p.x - b.cx) * scale, y: C + (p.y - b.cy) * scale }));
}

const scaleAbout = (shapes: Shape[], k: number) =>
  mapShapes(shapes, (p) => ({ x: C + (p.x - C) * k, y: C + (p.y - C) * k }));

const rotateAbout = (shapes: Shape[], a: number) => {
  const cos = Math.cos(a), sin = Math.sin(a);
  return mapShapes(shapes, (p: Pt) => ({
    x: C + (p.x - C) * cos - (p.y - C) * sin,
    y: C + (p.x - C) * sin + (p.y - C) * cos,
  }));
};

/** Solids wind one way, holes the other, so "nonzero" unions overlaps and cuts holes. */
function orient(shape: Shape): Shape {
  const ccw = signedArea(shape.points) > 0;
  return ccw === !shape.hole ? shape : { ...shape, points: [...shape.points].reverse() };
}

let DECIMALS = 2;
const pathData = (shapes: Shape[]) => shapes.map((x) => toPathData(x, DECIMALS)).join("");

function strokeAttrs(s: Settings, width: number, color: string) {
  return `fill="none" stroke="${color}" stroke-width="${round(width)}" stroke-linecap="${s.cap}" stroke-linejoin="round"`;
}
const round = (n: number) => Math.round(n * 100) / 100;
const BIG = `x="${-BOX}" y="${-BOX}" width="${BOX * 3}" height="${BOX * 3}"`;

/** Paint for the ink: a flat colour or a gradient defined once in <defs>. */
export function makePaint(s: Settings, id: string): { defs: string; paint: string } {
  if (s.fill === "flat" || s.layerColors) return { defs: "", paint: s.color };
  const gid = `${id}-grad`;
  const stops = `<stop offset="0" stop-color="${s.color}"/><stop offset="1" stop-color="${s.color2}"/>`;
  if (s.fill === "radial")
    return { defs: `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="${C}">${stops}</radialGradient>`, paint: `url(#${gid})` };
  const a = deg(s.gradientAngle);
  const dx = Math.cos(a) * C, dy = Math.sin(a) * C;
  return {
    defs: `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${round(C - dx)}" y1="${round(C - dy)}" x2="${round(C + dx)}" y2="${round(C + dy)}">${stops}</linearGradient>`,
    paint: `url(#${gid})`,
  };
}

export const layerColor = (s: Settings, i: number) => [s.color, s.color2, s.color3][i % 3];

function styleMarkup(shapes: Shape[], s: Settings, id: string, paint: string): string {
  const w = s.stroke;
  const d = pathData(shapes);
  switch (s.style) {
    case "outline":
      return `<path d="${d}" ${strokeAttrs(s, w, paint)}/>`;
    case "dashed": {
      const [on, off] = dashPattern(s);
      return `<path d="${d}" ${strokeAttrs(s, w, paint)} stroke-dasharray="${round(on)} ${round(off)}"/>`;
    }
    case "solid": {
      const nonzero = getFamily(s.family).fill === "nonzero";
      let closed = shapes.filter((x) => x.closed);
      if (nonzero) closed = closed.map(orient);
      const open = shapes.filter((x) => !x.closed);
      const rule = nonzero ? "nonzero" : "evenodd";
      let out = closed.length ? `<path d="${pathData(closed)}" fill="${paint}" fill-rule="${rule}"/>` : "";
      if (open.length) out += `<path d="${pathData(open)}" ${strokeAttrs(s, Math.max(w, 2), paint)}/>`;
      return out;
    }
    case "double":
      return (
        `<mask id="${id}-dbl" maskUnits="userSpaceOnUse" ${BIG}>` +
        `<path d="${d}" ${strokeAttrs(s, w * 3, "#fff")}/><path d="${d}" ${strokeAttrs(s, w, "#000")}/></mask>` +
        `<rect ${BIG} fill="${paint}" mask="url(#${id}-dbl)"/>`
      );
    case "ribbon": {
      // Each band knocks a gap out of earlier bands, giving an over/under weave.
      const rw = ribbonWidth(w);
      const layers = shapes
        .map((x) => {
          const pd = toPathData(x, DECIMALS);
          return `<path d="${pd}" ${strokeAttrs(s, rw * RIBBON_GAP * 2, "#000")}/><path d="${pd}" ${strokeAttrs(s, rw, "#fff")}/>`;
        })
        .join("");
      return (
        `<mask id="${id}-rib" maskUnits="userSpaceOnUse" ${BIG}>${layers}</mask>` +
        `<rect ${BIG} fill="${paint}" mask="url(#${id}-rib)"/>`
      );
    }
  }
}

/** Dash on/off lengths in user units. Round/square caps grow each dash, so the gap compensates. */
export function dashPattern(s: Settings): [number, number] {
  const w = s.stroke;
  const capGrow = s.cap === "butt" ? w : w * 1.6;
  return [w * 3, w * 2 + capGrow];
}
export const RIBBON_GAP = 0.95;

export interface Scene {
  /** Fitted layers, largest first. Odd layers are pre-inverted unless drawn in separate colours. */
  layers: Shape[][];
  overlay: Shape[] | null;
  overlayWidth: number;
}

/** Geometry for a settings object: generation, aspect, fitting, layers and overlay. */
export function buildScene(s: Settings): Scene {
  const params: GenParams = { frequency: s.frequency, detail: s.detail, phase: s.phase, warp: s.warp };
  let base = generate(s.family, params, s.seed);
  if (s.aspect !== 1) base = mapShapes(base, (p) => ({ x: p.x * s.aspect, y: p.y }));
  const fitted = fit(base, s, BOX - PAD * 2);
  const separate = s.layerColors && s.layers > 1;
  const layers: Shape[][] = [];
  for (let i = 0; i < s.layers; i++) {
    const layer = scaleAbout(fitted, Math.max(0.08, 1 - i * s.spacing * 1.6));
    // Odd layers invert so stacked single-colour solid layers read as rings, not one blob.
    layers.push(i % 2 && !separate ? layer.map((x) => ({ ...x, hole: !x.hole })) : layer);
  }
  let overlay: Shape[] | null = null;
  if (s.overlay !== "none") {
    const of = getFamily(s.overlay);
    const op: GenParams = { ...of.defaults, phase: 0 };
    overlay = fit(generate(of.id, op, s.seed), { ...s, copies: 2 }, BOX - PAD * 2);
    overlay = rotateAbout(scaleAbout(overlay, s.overlayScale), deg(s.overlayRotation));
  }
  return { layers, overlay, overlayWidth: Math.max(1, s.stroke * 0.8) };
}

export interface RenderOptions {
  /** Unique prefix for mask/def ids (needed when many SVGs share a page). */
  id?: string;
  /** Output pixel size; viewBox is always 500×500. */
  px?: number;
  /** Force background on/off; defaults to !settings.transparent. */
  background?: boolean;
  /** Coordinate decimals (2 = export quality, 1 = small thumbnails). */
  decimals?: number;
}

/** The artwork group (no <svg> wrapper, no background): reused by animation frames. */
export function renderArt(s: Settings, id: string, decimals = 2): { defs: string; body: string } {
  DECIMALS = decimals;
  const scene = buildScene(s);
  const { defs, paint } = makePaint(s, id);

  let art: string;
  if (s.layerColors && s.layers > 1) {
    art = scene.layers.map((layer, i) => styleMarkup(layer, s, `${id}-L${i}`, layerColor(s, i))).join("");
  } else {
    art = styleMarkup(scene.layers.flat(), s, id, paint);
  }

  if (scene.overlay) {
    const od = pathData(scene.overlay);
    const ow = scene.overlayWidth;
    if (s.style === "solid") {
      // On filled art the overlay reads best as a cut line.
      art =
        `<mask id="${id}-ov" maskUnits="userSpaceOnUse" ${BIG}><rect ${BIG} fill="#fff"/>` +
        `<path d="${od}" ${strokeAttrs(s, ow * 2, "#000")}/></mask><g mask="url(#${id}-ov)">${art}</g>`;
    } else {
      art += `<path d="${od}" ${strokeAttrs(s, ow, paint)}/>`;
    }
  }

  let body: string;
  if (s.copies > 1) {
    const uses = Array.from(
      { length: s.copies },
      (_, k) => `<use href="#${id}-art" transform="rotate(${round(s.rotation + (360 * k) / s.copies)} ${C} ${C})"/>`,
    ).join("");
    body = `<defs><g id="${id}-art">${art}</g></defs>${uses}`;
  } else {
    body = s.rotation ? `<g transform="rotate(${s.rotation} ${C} ${C})">${art}</g>` : art;
  }
  return { defs, body };
}

export function svgWrap(inner: string, s: Settings, opts: RenderOptions): string {
  const showBg = opts.background ?? !s.transparent;
  const bg = showBg ? `<rect width="${BOX}" height="${BOX}" fill="${s.background}"/>` : "";
  const px = opts.px ?? BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${px}" height="${px}">${bg}${inner}</svg>`;
}

export function renderSvg(s: Settings, opts: RenderOptions = {}): string {
  const id = opts.id ?? "sf";
  const { defs, body } = renderArt(s, id, opts.decimals ?? 2);
  return svgWrap((defs ? `<defs>${defs}</defs>` : "") + body, s, opts);
}

export { C as CENTER, round as round2, ribbonWidth, strokeAttrs };
