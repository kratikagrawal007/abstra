import { CENTER, renderArt, renderSvg, round2, svgWrap, type RenderOptions } from "./render";
import { sanitize } from "./settings";
import type { Settings } from "./types";

const TAU = Math.PI * 2;

/** Settings for time t ∈ [0, 1) of the loop. Spin is applied as a transform instead (see frameSvg). */
export function frameSettings(s: Settings, t: number): Settings {
  switch (s.anim) {
    case "phase":
      return sanitize({ ...s, phase: Math.round(s.phase + 360 * t) % 360 });
    case "warp": {
      const amp = Math.min(0.3, Math.max(0.12, s.warp * 0.5));
      const center = Math.min(1 - amp, Math.max(amp, s.warp));
      return sanitize({ ...s, warp: center + amp * Math.sin(TAU * t) });
    }
    default:
      return s;
  }
}

/** One frame as a standalone SVG (used by the live preview and video recording). */
export function frameSvg(s: Settings, t: number, opts: RenderOptions = {}): string {
  if (s.anim === "spin") {
    const { defs, body } = renderArt(s, opts.id ?? "fr", opts.decimals ?? 2);
    const inner = `${defs ? `<defs>${defs}</defs>` : ""}<g transform="rotate(${round2(360 * t)} ${CENTER} ${CENTER})">${body}</g>`;
    return svgWrap(inner, s, opts);
  }
  return renderSvg(frameSettings(s, t), opts);
}

/** Frames per loop for geometry animations: smooth enough, small enough to ship as SVG. */
export const SVG_FRAMES = 30;

/**
 * Self-contained animated SVG (SMIL; plays in browsers and <img> tags, no JS).
 * Spin uses one animateTransform; phase/warp step through pre-rendered frames.
 */
export function animatedSvg(s: Settings, opts: RenderOptions = {}): string {
  const id = opts.id ?? "an";
  const dur = `${s.animDur}s`;
  if (s.anim === "none") return renderSvg(s, opts);
  if (s.anim === "spin") {
    const { defs, body } = renderArt(s, id, 2);
    const spin = `<animateTransform attributeName="transform" type="rotate" from="0 ${CENTER} ${CENTER}" to="360 ${CENTER} ${CENTER}" dur="${dur}" repeatCount="indefinite"/>`;
    return svgWrap(`${defs ? `<defs>${defs}</defs>` : ""}<g>${spin}${body}</g>`, s, opts);
  }
  const n = SVG_FRAMES;
  const frames: string[] = [];
  for (let k = 0; k < n; k++) {
    const { defs, body } = renderArt(frameSettings(s, k / n), `${id}-f${k}`, 1);
    // Discrete opacity: frame k is visible only during its slice of the loop.
    const values = k === 0 ? "1;0" : "0;1;0";
    const keyTimes = k === 0 ? `0;${round2(1 / n)}` : `0;${round4(k / n)};${round4((k + 1) / n)}`;
    frames.push(
      `<g opacity="${k === 0 ? 1 : 0}">${defs ? `<defs>${defs}</defs>` : ""}` +
        `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/>${body}</g>`,
    );
  }
  return svgWrap(frames.join(""), s, opts);
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
