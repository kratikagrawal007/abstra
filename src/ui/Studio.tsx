"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sameArt, useStudio } from "@/store/studio";
import { renderSvg } from "@/engine/render";
import { decodeSettings, encodeSettings } from "@/engine/url-state";
import { copySvg, downloadSvg } from "@/engine/export";
import { getFamily } from "@/engine/families";
import { frameSvg } from "@/engine/animate";
import { STYLES } from "@/engine/types";
import { Sidebar } from "./Sidebar";
import { Thumb } from "./Thumb";
import { Icon, type IconName } from "./icons";

function useUrlSync() {
  const hydrate = useStudio((s) => s.hydrate);
  const settings = useStudio((s) => s.settings);
  const ready = useRef(false);
  useEffect(() => {
    hydrate(decodeSettings(window.location.search));
    ready.current = true;
  }, [hydrate]);
  useEffect(() => {
    if (!ready.current) return;
    // replaceState (not push) so slider drags don't flood browser history
    const t = setTimeout(() => history.replaceState(null, "", `?${encodeSettings(settings)}`), 150);
    return () => clearTimeout(t);
  }, [settings]);
}

function useShortcuts(toggleHelp: () => void, closeHelp: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : document.body;
      const typing = el.closest("input, textarea, select, [contenteditable]");
      const st = useStudio.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        downloadSvg(st.settings);
        st.notify("SVG downloaded");
      } else if (!mod && !typing && (e.key === "r" || (e.key === " " && el.tagName !== "BUTTON"))) {
        e.preventDefault();
        st.randomize();
      } else if (!mod && !typing && e.key === "f") {
        st.toggleFavorite();
      } else if (!mod && !typing && (e.key === "]" || e.key === "[")) {
        st.stepFamily(e.key === "]" ? 1 : -1);
      } else if (!mod && !typing && /^[1-5]$/.test(e.key)) {
        st.update({ style: STYLES[Number(e.key) - 1] });
      } else if (!mod && !typing && e.key === "p") {
        st.setPlaying(!st.playing);
      } else if (!mod && !typing && e.key === "?") {
        toggleHelp();
      } else if (e.key === "Escape") {
        closeHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleHelp, closeHelp]);
}

function Toast() {
  const toast = useStudio((s) => s.toast);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    useStudio.setState({ toast: null });
    const t = setTimeout(() => setShown(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
      {shown && <div key={shown + Date.now()} className="pop-in rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper elev">{shown}</div>}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const PREVIEW_FPS = 24;

function Artboard() {
  const settings = useStudio((s) => s.settings);
  const playing = useStudio((s) => s.playing);
  const setPlaying = useStudio((s) => s.setPlaying);
  const reduced = usePrefersReducedMotion();
  // Background is painted by the container so a spinning preview never shows rotating corners.
  const html = useMemo(() => renderSvg(settings, { id: "main", background: false }), [settings]);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnim = settings.anim !== "none";
  const animating = hasAnim && playing && !reduced;

  // Phase / warp: redraw frames directly into the DOM (no React re-render per frame).
  useEffect(() => {
    const el = ref.current;
    if (!el || !animating || settings.anim === "spin") return;
    let raf = 0;
    let last = -1;
    const start = performance.now();
    const total = settings.animDur * 1000;
    const loop = (now: number) => {
      const t = ((now - start) % total) / total;
      const k = Math.floor(t * PREVIEW_FPS * settings.animDur);
      if (k !== last) {
        last = k;
        el.innerHTML = frameSvg(settings, t, { id: "main", background: false });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.innerHTML = html;
    };
  }, [animating, settings, html]);

  const f = getFamily(settings.family);
  return (
    <figure className="flex min-h-0 flex-1 flex-col items-center gap-2 px-4 pt-3 pb-2 md:gap-3 md:px-6 md:pt-5">
      {/* size container: the artboard is the largest square that fits */}
      <div className="grid min-h-0 w-full flex-1 place-items-center [container-type:size]">
        <div className="relative aspect-square w-[min(100cqw,100cqh,640px)]">
          <div
            ref={ref}
            key={`${settings.seed}|${settings.family}`}
            className={`art-in thumb h-full w-full overflow-hidden rounded-2xl border border-line elev ${
              animating && settings.anim === "spin" ? "spin-art" : ""
            }`}
            style={{ background: settings.background, ["--spin-dur" as string]: `${settings.animDur}s` }}
            role="img"
            aria-label={`${f.name} artwork, ${settings.style} style, seed ${settings.seed}${hasAnim ? `, ${settings.anim} animation` : ""}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {hasAnim && (
            <button
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? "Pause animation preview" : "Play animation preview"}
              title={reduced ? "Reduced motion is on, so the preview stays still" : playing ? "Pause (P)" : "Play (P)"}
              className="absolute right-3 bottom-3 flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 text-[12px] font-medium text-ink-2 elev hover:text-ink"
            >
              <span aria-hidden="true">{animating ? "❚❚" : "▶"}</span>
              {settings.anim}
            </button>
          )}
        </div>
      </div>
      <figcaption className="font-mono text-[12px] text-ink-3 max-md:hidden">
        {f.name} · {settings.style} · seed {settings.seed}
        {settings.transparent && " · exports transparent"}
      </figcaption>
    </figure>
  );
}

function Recent() {
  const recent = useStudio((s) => s.recent);
  const favorites = useStudio((s) => s.favorites);
  const current = useStudio((s) => s.settings);
  const restore = useStudio((s) => s.restore);
  const [view, setView] = useState<"recent" | "saved">("recent");
  const list = view === "recent" ? recent : favorites;
  return (
    <div className="flex items-center gap-3 py-0 pt-4 pr-24 pl-4">
      <div className="flex shrink-0 rounded-lg bg-panel p-0.5 text-[12px] elev">
        {(["recent", "saved"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`min-h-[28px] rounded-md px-2 font-medium ${view === v ? "bg-accent-soft text-accent" : "text-ink-3"}`}
          >
            {v === "recent" ? "Recent" : `Saved ${favorites.length || ""}`}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto py-1">
        {list.length === 0 && <span className="text-[12px] text-ink-3">Press F or ☆ to save the current mark.</span>}
        {list.map((s, i) => (
          <button
            key={`${view}-${i}-${s.seed}`}
            onClick={() => restore(s)}
            aria-label={`Restore ${getFamily(s.family).name}, seed ${s.seed}`}
            style={{ background: s.background }}
            className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border p-1 transition hover:-translate-y-0.5 ${
              sameArt(s, current) ? "border-accent" : "border-line"
            }`}
          >
            <Thumb settings={s} id={`h-${view}-${i}`} inherit={false} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled, active, primary, className = "" }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; active?: boolean; primary?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition disabled:opacity-35 ${className} ${
        primary ? "bg-accent text-on-accent hover:opacity-90 sm:px-4" : active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
      }`}
    >
      <Icon name={icon} size={17} filled={active && icon === "star"} />
      {primary && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

function Toolbar() {
  const st = useStudio();
  const isFav = st.favorites.some((f) => sameArt(f, st.settings));
  const Sep = () => <span className="mx-0.5 h-5 w-px bg-line" />;
  return (
    <div className="pointer-events-none flex justify-center px-4 pb-5">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-line bg-panel p-1 elev">
        <ToolButton icon="dice" label="Randomize" primary onClick={st.randomize} />
        <ToolButton icon={st.keepFamily ? "lock" : "unlock"} label={st.keepFamily ? "Family locked" : "Lock family"} active={st.keepFamily} onClick={() => st.setKeepFamily(!st.keepFamily)} />
        <Sep />
        <ToolButton icon="undo" label="Undo" disabled={!st.past.length} onClick={st.undo} />
        <ToolButton icon="redo" label="Redo" disabled={!st.future.length} onClick={st.redo} />
        <ToolButton icon="reset" label="Reset family defaults" onClick={st.reset} className="max-sm:hidden" />
        <Sep />
        <ToolButton icon="star" label={isFav ? "Unsave" : "Save"} active={isFav} onClick={st.toggleFavorite} />
        <ToolButton
          icon="link"
          label="Copy link"
          onClick={() =>
            navigator.clipboard
              .writeText(`${location.origin}${location.pathname}?${encodeSettings(st.settings)}`)
              .then(() => st.notify("Link copied"), () => st.notify("Clipboard blocked"))
          }
        />
        <ToolButton icon="copy" label="Copy SVG" className="max-sm:hidden" onClick={() => copySvg(st.settings).then(() => st.notify("SVG copied"), () => st.notify("Clipboard blocked"))} />
        <ToolButton icon="download" label="Download SVG" onClick={() => (downloadSvg(st.settings), st.notify("SVG downloaded"))} />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("abstra:theme", next);
        } catch {}
        setDark(!dark);
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-ink-2 elev hover:text-ink"
    >
      <Icon name={dark ? "sun" : "moon"} size={17} />
    </button>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["R"], "Randomize (or Space)"],
  [["["], "Previous family"],
  [["]"], "Next family"],
  [["1", "–", "5"], "Outline · Solid · Double · Ribbon · Dashed"],
  [["F"], "Save / unsave favourite"],
  [["P"], "Play / pause animation preview"],
  [["⌘", "Z"], "Undo"],
  [["⇧", "⌘", "Z"], "Redo"],
  [["⌘", "S"], "Download SVG"],
  [["?"], "Show this panel"],
];

function HelpDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/25 p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
        className="pop-in w-full max-w-sm rounded-2xl border border-line bg-panel p-5 elev outline-none"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="help-title" className="text-[15px] font-semibold">
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-[12px] text-ink-3 hover:bg-panel-2 hover:text-ink">
            Close
          </button>
        </div>
        <ul className="space-y-2 text-[13px]">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between gap-4">
              <span className="text-ink-2">{label}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((k, i) => (k === "–" ? <span key={i} className="text-ink-3">–</span> : <kbd key={i}>{k}</kbd>))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
          Tip: click any slider value to type an exact number, double-click a slider to reset it.
        </p>
      </div>
    </div>
  );
}

/** Dev-only: expose the engine for in-browser QA (pixel diffs etc). Removed from production builds. */
function useDevHook() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    Promise.all([import("@/engine/render"), import("@/engine/outline"), import("@/engine/settings"), import("@/engine/families"), import("@/engine/animate"), import("@/engine/export")]).then(
      ([render, outline, settings, families, animate, exp]) => {
        (window as unknown as { __abstraDev: unknown }).__abstraDev = { ...render, ...outline, ...settings, ...families, ...animate, ...exp };
      },
    );
  }, []);
}

export function Studio() {
  useDevHook();
  const [help, setHelp] = useState(false);
  const [sheet, setSheet] = useState(false);
  const toggleHelp = useCallback(() => setHelp((h) => !h), []);
  const closeHelp = useCallback(() => setHelp(false), []);
  useUrlSync();
  useShortcuts(toggleHelp, closeHelp);
  return (
    <div
      className="studio-grid grid h-dvh grid-rows-[minmax(0,1fr)_var(--sheet)] md:grid-cols-[340px_minmax(0,1fr)] md:grid-rows-1"
      style={{ ["--sheet" as string]: sheet ? "60dvh" : "42dvh" }}
    >
      <main className="dot-grid relative flex min-h-0 flex-col md:order-2">
        <Toast />
        <div className="absolute top-4 right-4 z-10 flex gap-1.5">
          <button
            onClick={toggleHelp}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel font-mono text-[14px] text-ink-2 elev hover:text-ink max-md:hidden"
          >
            ?
          </button>
          <ThemeToggle />
        </div>
        <Recent />
        <Artboard />
        <Toolbar />
      </main>
      <div className="flex min-h-0 flex-col rounded-t-2xl border-t border-line bg-panel shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)] md:order-1 md:rounded-none md:border-t-0 md:shadow-none">
        <button
          onClick={() => setSheet((v) => !v)}
          aria-expanded={sheet}
          aria-label={sheet ? "Collapse controls" : "Expand controls"}
          className="flex w-full shrink-0 justify-center pt-2 pb-1 md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </button>
        <div className="min-h-0 flex-1">
          <Sidebar />
        </div>
      </div>
      {help && <HelpDialog onClose={closeHelp} />}
    </div>
  );
}
