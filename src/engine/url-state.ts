import { DEFAULT_SETTINGS, sanitize } from "./settings";
import type { Settings } from "./types";

export const URL_VERSION = "1";

/** Short, stable keys. Never rename one; add new keys instead (old links must keep working). */
const KEYS: Record<keyof Settings, string> = {
  seed: "s",
  family: "f",
  style: "st",
  frequency: "fq",
  detail: "dt",
  phase: "ph",
  warp: "wp",
  stroke: "sw",
  color: "c",
  background: "bg",
  cap: "cap",
  layers: "ly",
  spacing: "sp",
  copies: "cp",
  rotation: "rot",
  aspect: "ar",
  overlay: "ov",
  overlayScale: "ovs",
  overlayRotation: "ovr",
  transparent: "tr",
  size: "px",
};

export function encodeSettings(s: Settings): string {
  const q = new URLSearchParams({ v: URL_VERSION });
  for (const [k, short] of Object.entries(KEYS) as [keyof Settings, string][]) {
    const v = s[k];
    q.set(short, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  return q.toString();
}

export function decodeSettings(search: string): Settings | null {
  const q = new URLSearchParams(search);
  if (!q.has("s") && !q.has("f")) return null;
  const out: Record<string, unknown> = {};
  for (const [k, short] of Object.entries(KEYS) as [keyof Settings, string][]) {
    const raw = q.get(short);
    if (raw === null) continue;
    const def = DEFAULT_SETTINGS[k];
    out[k] = typeof def === "number" ? Number(raw) : typeof def === "boolean" ? raw === "1" : raw;
  }
  return sanitize(out as Partial<Settings>);
}
