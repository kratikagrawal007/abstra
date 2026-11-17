import type { Settings } from "./types";

export interface Palette {
  name: string;
  background: string;
  color: string;
  color2: string;
  color3: string;
}

/** Curated palettes: ink reads clearly on background; colours 2–3 work as gradient ends and layer tones. */
export const PALETTES: readonly Palette[] = [
  { name: "Ink", background: "#ffffff", color: "#1c1b22", color2: "#4f46e5", color3: "#e4572e" },
  { name: "Paper", background: "#f4efe6", color: "#2b2a28", color2: "#c8553d", color3: "#588b8b" },
  { name: "Night", background: "#0f1020", color: "#f2f1ee", color2: "#8b85ff", color3: "#3ddbd9" },
  { name: "Citrus", background: "#fff8e7", color: "#ff6b35", color2: "#f7c548", color3: "#2e294e" },
  { name: "Mint", background: "#e9f5f0", color: "#1b4332", color2: "#40916c", color3: "#95d5b2" },
  { name: "Bloom", background: "#fff0f3", color: "#c9184a", color2: "#ff758f", color3: "#590d22" },
  { name: "Ocean", background: "#edf6f9", color: "#006d77", color2: "#83c5be", color3: "#e29578" },
  { name: "Mono", background: "#111111", color: "#ffffff", color2: "#888888", color3: "#444444" },
  { name: "Sunset", background: "#2d1e2f", color: "#f7b267", color2: "#f4845f", color3: "#f25c54" },
  { name: "Lagoon", background: "#031a1f", color: "#2ec4b6", color2: "#cbf3f0", color3: "#ffbf69" },
  { name: "Clay", background: "#efe6dd", color: "#8a4f3a", color2: "#d9a17e", color3: "#3d405b" },
  { name: "Neon", background: "#0b0b0f", color: "#39ff14", color2: "#ff2079", color3: "#00e5ff" },
];

export const paletteColors = (p: Palette): Pick<Settings, "background" | "color" | "color2" | "color3"> => ({
  background: p.background,
  color: p.color,
  color2: p.color2,
  color3: p.color3,
});

export function activePalette(s: Settings): Palette | undefined {
  return PALETTES.find(
    (p) => p.background === s.background && p.color === s.color && p.color2 === s.color2 && p.color3 === s.color3,
  );
}
