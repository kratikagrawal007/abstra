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

// ---------- Animation ----------

export async function downloadAnimatedSvg(s: Settings) {
  const { animatedSvg } = await import("./animate");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` + animatedSvg(s, { id: "art" });
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), fileName(s, "svg").replace(/\.svg$/, "-animated.svg"));
}

/** Pick a recordable container: WebM where supported, MP4 on Safari. */
export function videoFormat(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4;codecs=avc1", "video/mp4"])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  return null;
}

async function svgImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // decode() has finished, so the image keeps its pixels after the URL is released
    URL.revokeObjectURL(url);
  }
}

/**
 * Record one loop of the animation to video in real time (MediaRecorder).
 * Frames are drawn on a fixed schedule so the clip is exactly one loop long.
 */
export async function recordVideo(s: Settings, onProgress?: (p: number) => void, size = 1080, fps = 30): Promise<{ blob: Blob; ext: string }> {
  const fmt = videoFormat();
  if (!fmt) throw new Error("Video recording is not supported in this browser");
  const { frameSvg } = await import("./animate");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));

  const frames = Math.round(fps * s.animDur);
  const paint = async (k: number) => {
    const img = await svgImage(frameSvg(s, k / frames, { id: "vid", px: size, background: true }));
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
  };

  await paint(0); // first frame ready before recording starts
  rec.start();
  const start = performance.now();
  for (let k = 1; k <= frames; k++) {
    const due = start + (k * 1000) / fps;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    await paint(k % frames);
    onProgress?.(k / frames);
  }
  rec.stop();
  stream.getTracks().forEach((t) => t.stop());
  await done;
  return { blob: new Blob(chunks, { type: fmt.mime.split(";")[0] }), ext: fmt.ext };
}

export async function downloadVideo(s: Settings, onProgress?: (p: number) => void) {
  const { blob, ext } = await recordVideo(s, onProgress);
  downloadBlob(blob, fileName(s, ext));
}

// ---------- Batch ----------

export interface BatchOptions {
  count: number;
  /** Keep the current family, or let every variation pick its own. */
  sameFamily: boolean;
  svg: boolean;
  png: boolean;
  /** Convert strokes to filled shapes in the SVGs. */
  outlined: boolean;
  /** Page URL used to write a share link for each variation. */
  shareBase: string;
}

/** Generate `count` seeded variations and bundle them as a ZIP (plus links.txt with share URLs). */
export async function batchZip(base: Settings, o: BatchOptions, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const [{ zipSync, strToU8 }, { settingsFromSeed, randomSeed }, { encodeSettings }] = await Promise.all([
    import("fflate"),
    import("./seed"),
    import("./url-state"),
  ]);
  const outline = o.outlined && o.svg ? (await import("./outline")).outlinedSvg : null;
  const files: Record<string, Uint8Array> = {};
  const links: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < o.count; i++) {
    let seed = randomSeed();
    while (used.has(seed)) seed = randomSeed();
    used.add(seed);
    const s = settingsFromSeed(base, seed, o.sameFamily);
    const name = `${String(i + 1).padStart(2, "0")}-${s.family}-${s.seed}`;
    if (o.svg) {
      const svg = outline ? await outline(s, { id: "art" }) : renderSvg(s, { id: "art" });
      files[`${name}.svg`] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`);
    }
    if (o.png) files[`${name}.png`] = new Uint8Array(await (await pngBlob(s)).arrayBuffer());
    links.push(`${name}\t${o.shareBase}?${encodeSettings(s)}`);
    onProgress?.(i + 1, o.count);
    await new Promise((r) => setTimeout(r)); // keep the page responsive
  }
  files["links.txt"] = strToU8(links.join("\n") + "\n");
  // PNGs are already compressed; level 6 still shrinks the SVG text a lot.
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
}

// ---------- Outline + embed ----------

export async function downloadOutlinedSvg(s: Settings) {
  const { outlinedSvg } = await import("./outline");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` + (await outlinedSvg(s, { id: "art" }));
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), fileName(s, "svg").replace(/\.svg$/, "-outlined.svg"));
}

export function embedCode(origin: string, query: string, size = 400): string {
  return `<iframe src="${origin}/embed?${query}" width="${size}" height="${size}" style="border:0;max-width:100%" loading="lazy" title="Abstra artwork"></iframe>`;
}
