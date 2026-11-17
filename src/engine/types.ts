export interface Pt {
  x: number;
  y: number;
}

export interface Shape {
  points: Pt[];
  closed: boolean;
  /** Cut-out contour. Only meaningful for families using the "nonzero" fill rule. */
  hole?: boolean;
}

export const STYLES = ["outline", "solid", "double", "ribbon", "dashed"] as const;
export type Style = (typeof STYLES)[number];

export const CAPS = ["round", "square", "butt"] as const;
export type Cap = (typeof CAPS)[number];

export const PNG_SIZES = [1024, 2048, 4096] as const;
export type PngSize = (typeof PNG_SIZES)[number];

export const GROUPS = ["curves", "woven", "radial", "geometry", "texture"] as const;
export type Group = (typeof GROUPS)[number];

export interface Settings {
  seed: string;
  family: string;
  style: Style;
  frequency: number;
  detail: number;
  phase: number;
  warp: number;
  stroke: number;
  color: string;
  background: string;
  cap: Cap;
  layers: number;
  spacing: number;
  copies: number;
  rotation: number;
  aspect: number;
  overlay: string; // "none" or a family id
  overlayScale: number;
  overlayRotation: number;
  transparent: boolean;
  size: PngSize;
}

export interface GenParams {
  frequency: number;
  detail: number;
  phase: number; // degrees
  warp: number; // 0..1
}

export interface Family {
  id: string;
  name: string;
  group: Group;
  labels: { frequency: string; detail: string };
  /** Allowed range for each generic control (inclusive). */
  ranges: { frequency: [number, number]; detail: [number, number] };
  defaults: GenParams & { stroke: number; style: Style };
  /**
   * How solid style fills overlaps. "evenodd" (default) alternates, which suits
   * self-crossing curves. "nonzero" unions overlapping parts and cuts `hole` shapes.
   */
  fill?: "evenodd" | "nonzero";
  generate(p: GenParams, seed: string): Shape[];
}
