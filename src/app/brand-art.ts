import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderSvg } from "@/engine/render";
import { DEFAULT_SETTINGS, withFamily } from "@/engine/settings";
import type { Settings, Style } from "@/engine/types";

/** Build-time helpers for generated images (OG card, touch icon). */
export const fontData = (file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts", file));

export function artDataUri(family: string, style: Style, color: string, extra: Partial<Settings> = {}) {
  const s = { ...withFamily(DEFAULT_SETTINGS, family), style, color, transparent: true, ...extra };
  return `data:image/svg+xml;base64,${Buffer.from(renderSvg(s, { id: `og-${family}` })).toString("base64")}`;
}
