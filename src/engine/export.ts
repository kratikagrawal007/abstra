import { renderSvg } from "./render";
import type { Settings } from "./types";

export function svgFile(s: Settings): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + renderSvg(s, { id: "art" });
}

export function fileName(s: Settings, ext: string) {
  return `abstra-${s.family}-${s.seed}.${ext}`.replace(/[^a-z0-9._-]/gi, "-");
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(s: Settings) {
  downloadBlob(new Blob([svgFile(s)], { type: "image/svg+xml" }), fileName(s, "svg"));
}

export async function copySvg(s: Settings) {
  await navigator.clipboard.writeText(renderSvg(s, { id: "art" }));
}

/** Rasterise the exact same SVG at an exact pixel size. */
export async function pngBlob(s: Settings): Promise<Blob> {
  const svg = renderSvg(s, { id: "art", px: s.size });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = s.size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, s.size, s.size);
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(s: Settings) {
  downloadBlob(await pngBlob(s), fileName(s, "png"));
}

/** Copy a PNG to the clipboard. The blob promise is passed straight to ClipboardItem so Safari accepts it. */
export async function copyPng(s: Settings) {
  if (typeof ClipboardItem === "undefined") throw new Error("Clipboard images not supported");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(s) })]);
}
