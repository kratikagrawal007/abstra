"use client";
import { useEffect, useState } from "react";
import { decodeSettings, encodeSettings } from "@/engine/url-state";
import { DEFAULT_SETTINGS } from "@/engine/settings";
import { animatedSvg } from "@/engine/animate";
import type { Settings } from "@/engine/types";

export function EmbedView() {
  const [s, setS] = useState<Settings | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setS(decodeSettings(window.location.search) ?? DEFAULT_SETTINGS);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  if (!s) return null;
  // SMIL animation runs without JS; honour reduced motion by showing the still frame.
  const still = { ...s, anim: reduced ? ("none" as const) : s.anim };
  const svg = animatedSvg(still, { id: "embed", background: false }).replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%"');
  return (
    <>
      <style>{`html,body{background:transparent!important;margin:0;height:100%;overflow:hidden}`}</style>
      <main
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: s.transparent ? "transparent" : s.background }}
      >
        <div role="img" aria-label="Abstra artwork" className="aspect-square h-full max-h-full max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <a
          href={`/?${encodeSettings(s)}`}
          target="_blank"
          rel="noopener"
          className="absolute right-2 bottom-2 rounded-md bg-black/55 px-1.5 py-0.5 font-sans text-[11px] text-white/90 no-underline opacity-70 transition hover:opacity-100"
        >
          Abstra
        </a>
      </main>
    </>
  );
}
