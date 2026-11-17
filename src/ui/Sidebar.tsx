"use client";
import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/store/studio";
import { FAMILIES, getFamily } from "@/engine/families";
import { DEFAULT_SETTINGS, LIMITS, type NumericKey } from "@/engine/settings";
import { ANIMS, CAPS, FILLS, GROUPS, PNG_SIZES, STYLES, type Settings } from "@/engine/types";
import { PALETTES, activePalette, paletteColors } from "@/engine/palettes";
import {
  batchZip,
  copyPng,
  copySvg,
  downloadAnimatedSvg,
  downloadBlob,
  downloadOutlinedSvg,
  downloadPng,
  downloadSvg,
  downloadVideo,
  embedCode,
  videoFormat,
} from "@/engine/export";
import { encodeSettings } from "@/engine/url-state";
import { ColorField, Section, Segmented, Slider, Toggle } from "./controls";
import { Icon } from "./icons";
import { FamilyIcon } from "./FamilyIcon";
import { OverlayPicker } from "./OverlayPicker";
import { LOGO_PATHS } from "@/brand";

const TABS = ["Shape", "Finish", "Compose", "Export"] as const;
type Tab = (typeof TABS)[number];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** For a section's settings: whether any differ from their defaults, and a reset that restores them. */
function useSectionReset(keys: (keyof Settings)[]) {
  const s = useStudio((x) => x.settings);
  const update = useStudio((x) => x.update);
  const famDefaults = getFamily(s.family).defaults as unknown as Partial<Settings>;
  const def = (k: keyof Settings) => (k in famDefaults ? famDefaults[k] : DEFAULT_SETTINGS[k]);
  return {
    dirty: keys.some((k) => s[k] !== def(k)),
    onReset: () => update(Object.fromEntries(keys.map((k) => [k, def(k)])) as Partial<Settings>),
  };
}

function NumberSlider({ k, label, unit }: { k: NumericKey; label: string; unit?: string }) {
  const value = useStudio((s) => s.settings[k]);
  const family = useStudio((s) => s.settings.family);
  const update = useStudio((s) => s.update);
  let [min, max, step] = LIMITS[k] as readonly [number, number, number];
  const fam = getFamily(family);
  if (k === "frequency" || k === "detail") [min, max] = fam.ranges[k];
  const famDefaults = fam.defaults as unknown as Record<string, number>;
  const def = k in famDefaults ? famDefaults[k] : (DEFAULT_SETTINGS[k] as number);
  return (
    <Slider label={label} value={value} min={min} max={max} step={step} unit={unit} defaultValue={def} onChange={(v) => update({ [k]: v })} />
  );
}

function SeedField() {
  const seed = useStudio((s) => s.settings.seed);
  const applySeed = useStudio((s) => s.applySeed);
  const keepFamily = useStudio((s) => s.keepFamily);
  const setKeepFamily = useStudio((s) => s.setKeepFamily);
  const [draft, setDraft] = useState(seed);
  useEffect(() => setDraft(seed), [seed]);
  return (
    <>
      <form
        className="flex items-center gap-2 py-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          applySeed(draft);
        }}
      >
        <label htmlFor="seed" className="text-[13px] text-ink-2">
          Seed
        </label>
        <input
          id="seed"
          value={draft}
          maxLength={64}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== seed && applySeed(draft)}
          className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-2 py-1 text-right font-mono text-[12px] text-ink"
        />
      </form>
      <Toggle label="Keep family" hint="Randomize stays in the current family" checked={keepFamily} onChange={setKeepFamily} />
    </>
  );
}

function FamilyGrid() {
  const family = useStudio((s) => s.settings.family);
  const setFamily = useStudio((s) => s.setFamily);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number] | "all">("all");
  const q = query.trim().toLowerCase();
  const visible = FAMILIES.filter(
    (f) => (group === "all" || f.group === group) && (!q || f.name.toLowerCase().includes(q) || f.group.includes(q)),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: true, bottom: false });
  const updateEdges = () => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({ top: el.scrollTop < 4, bottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 4 });
  };
  // New filter → back to the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    updateEdges();
  }, [query, group]);
  // Keep the selected family visible inside the list (also when changed with [ / ] or Randomize),
  // scrolling only this container, never the sidebar.
  useEffect(() => {
    const el = scrollRef.current;
    const btn = el?.querySelector<HTMLElement>(`[data-family="${family}"]`);
    if (!el || !btn) return;
    const header = 28;
    const top = btn.offsetTop - header;
    const bottom = btn.offsetTop + btn.offsetHeight;
    if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: Math.max(0, btn.offsetTop - el.clientHeight / 2 + btn.offsetHeight / 2), behavior: "smooth" });
    }
    updateEdges();
  }, [family]);
  const chip = (on: boolean) =>
    `min-h-[28px] shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition ${
      on ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-3 hover:text-ink"
    }`;
  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${FAMILIES.length} families`}
        aria-label="Search families"
        className="mb-2 w-full rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-3"
      />
      <div className="mb-2.5 flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Filter by group">
        <button className={chip(group === "all")} aria-pressed={group === "all"} onClick={() => setGroup("all")}>
          All
        </button>
        {GROUPS.map((g) => (
          <button key={g} className={chip(group === g)} aria-pressed={group === g} onClick={() => setGroup(g)}>
            {cap(g)} <span className="tabular-nums">{FAMILIES.filter((f) => f.group === g).length}</span>
          </button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateEdges}
          role="region"
          aria-label="Family list"
          className="relative max-h-[248px] overflow-y-auto overscroll-contain rounded-lg md:max-h-[312px]"
        >
          {visible.length === 0 && <p className="py-4 text-center text-[12px] text-ink-3">No family matches “{query}”.</p>}
          {GROUPS.map((g) => {
            const list = visible.filter((f) => f.group === g);
            if (!list.length) return null;
            return (
              <div key={g} className="pb-2">
                {group === "all" && (
                  <h3 className="sticky top-0 z-[1] -mx-0.5 mb-1 bg-panel/95 px-0.5 py-1 text-[12px] font-medium text-ink-3 backdrop-blur">
                    {cap(g)} <span className="tabular-nums">· {list.length}</span>
                  </h3>
                )}
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`${cap(g)} families`}>
                  {list.map((f) => {
                    const on = f.id === family;
                    return (
                      <button
                        key={f.id}
                        data-family={f.id}
                        aria-pressed={on}
                        title={f.name}
                        onClick={() => setFamily(f.id)}
                        className={`group flex flex-col items-center gap-1 rounded-lg border px-1.5 pt-2 pb-1.5 transition ${
                          on ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-2 hover:border-ink-3 hover:text-ink"
                        }`}
                      >
                        <FamilyIcon id={f.id} className="h-11 w-11 transition group-hover:scale-105" />
                        <span className="w-full truncate text-center text-[12px] leading-tight">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Scroll cues: fade edges + a hint while more families sit below. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-lg bg-gradient-to-b from-panel to-transparent transition-opacity ${
            edges.top ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center rounded-b-lg bg-gradient-to-t from-panel via-panel/80 to-transparent pb-1 transition-opacity ${
            edges.bottom ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[12px] text-ink-3 shadow-sm">More below ↓</span>
        </div>
      </div>
    </div>
  );
}

function ShapeTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  const f = getFamily(s.family);
  return (
    <>
      <Section title="Variation">
        <SeedField />
      </Section>
      <Section title="Family">
        <FamilyGrid />
      </Section>
      <Section title="Geometry" {...useSectionReset(["style", "frequency", "detail", "phase", "warp"])}>
        <Segmented label="Style" value={s.style} options={STYLES.map((v) => ({ value: v, label: cap(v) }))} onChange={(v) => update({ style: v })} />
        <NumberSlider k="frequency" label={f.labels.frequency} />
        <NumberSlider k="detail" label={f.labels.detail} />
        <NumberSlider k="phase" label="Phase" unit="°" />
        <NumberSlider k="warp" label="Warp" />
      </Section>
    </>
  );
}

function PalettePicker() {
  const st = useStudio((x) => x.settings);
  const update = useStudio((x) => x.update);
  const active = activePalette(st);
  return (
    <div className="py-1.5">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-ink-2">Palette{active ? <span className="text-ink-3"> · {active.name}</span> : null}</span>
        <button
          onClick={() => {
            const pool = PALETTES.filter((p) => p !== active);
            update(paletteColors(pool[Math.floor(Math.random() * pool.length)]));
          }}
          className="flex min-h-[26px] items-center gap-1 rounded-md px-2 text-[12px] font-medium text-accent-ink hover:bg-accent-soft"
        >
          <Icon name="dice" size={14} /> Shuffle
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Palettes">
        {PALETTES.map((p) => {
          const on = p === active;
          return (
            <button
              key={p.name}
              title={p.name}
              aria-label={`${p.name} palette`}
              aria-pressed={on}
              onClick={() => update(paletteColors(p))}
              className={`relative flex h-9 items-center justify-center gap-0.5 rounded-lg border transition hover:scale-105 ${
                on ? "border-accent ring-2 ring-accent-soft" : "border-line"
              }`}
              style={{ background: p.background }}
            >
              {[p.color, p.color2, p.color3].map((c, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FinishTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  const usesC2 = s.fill !== "flat" || s.layerColors;
  return (
    <>
      <Section title="Colour" {...useSectionReset(["color", "background", "color2", "color3"])}>
        <PalettePicker />
        <ColorField label="Ink" value={s.color} onChange={(v) => update({ color: v })} />
        <ColorField label="Background" value={s.background} onChange={(v) => update({ background: v })} />
        <button
          onClick={() => update({ color: s.background, background: s.color })}
          className="mt-1 min-h-[30px] w-full rounded-lg border border-line text-[12px] text-ink-2 hover:text-ink"
        >
          Swap ink and background
        </button>
      </Section>
      <Section title="Fill" {...useSectionReset(["fill", "gradientAngle"])}>
        <Segmented
          label="Ink fill"
          value={s.fill}
          options={FILLS.map((v) => ({ value: v, label: cap(v) }))}
          onChange={(v) => update({ fill: v })}
        />
        {s.layerColors && s.fill !== "flat" && (
          <p className="pb-1 text-[12px] text-ink-3">Layer colours are on, so each layer uses a flat colour.</p>
        )}
        {s.fill === "linear" && <NumberSlider k="gradientAngle" label="Gradient angle" unit="°" />}
        {usesC2 && <ColorField label="Colour 2" value={s.color2} onChange={(v) => update({ color2: v })} />}
        {s.layerColors && <ColorField label="Colour 3" value={s.color3} onChange={(v) => update({ color3: v })} />}
      </Section>
      <Section title="Line" {...useSectionReset(["stroke", "cap"])}>
        <NumberSlider k="stroke" label="Stroke" />
        <Segmented label="Line ends" value={s.cap} options={CAPS.map((v) => ({ value: v, label: cap(v) }))} onChange={(v) => update({ cap: v })} />
      </Section>
    </>
  );
}

function LayerColorsToggle() {
  const on = useStudio((x) => x.settings.layerColors);
  const layers = useStudio((x) => x.settings.layers);
  const update = useStudio((x) => x.update);
  return (
    <Toggle
      label="Colour each layer"
      hint={layers > 1 ? "Cycles ink → colour 2 → colour 3 (set in Finish)" : "Add a second layer to see it"}
      checked={on}
      onChange={(v) => update(v && layers < 2 ? { layerColors: true, layers: 3 } : { layerColors: v })}
    />
  );
}

function ComposeTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  return (
    <>
      <Section title="Repeat" {...useSectionReset(["layers", "spacing", "layerColors", "copies", "rotation", "aspect"])}>
        <NumberSlider k="layers" label="Layers" />
        <NumberSlider k="spacing" label="Layer spacing" />
        <LayerColorsToggle />
        <NumberSlider k="copies" label="Rotated copies" />
        <NumberSlider k="rotation" label="Rotation" unit="°" />
        <NumberSlider k="aspect" label="Aspect" />
      </Section>
      <Section title="Overlay" {...useSectionReset(["overlay", "overlayScale", "overlayRotation"])}>
        <OverlayPicker value={s.overlay} onChange={(v) => update({ overlay: v })} />
        {s.overlay !== "none" && (
          <>
            <NumberSlider k="overlayScale" label="Overlay scale" />
            <NumberSlider k="overlayRotation" label="Overlay rotation" unit="°" />
          </>
        )}
      </Section>
    </>
  );
}

const BTN = "flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-accent text-on-accent hover:opacity-90`;
const BTN_SECONDARY = `${BTN} border border-line text-ink hover:bg-panel-2`;

/** Runs an async export, showing progress text on the button and a toast at the end. */
function useTask() {
  const notify = useStudio((st) => st.notify);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (label: string, job: (progress: (text: string) => void) => Promise<string>) => {
    if (busy) return;
    setBusy(label);
    try {
      notify(await job((text) => setBusy(text)));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function ImageExport() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  const { busy, run } = useTask();
  return (
    <Section title="Image" {...useSectionReset(["transparent", "size"])}>
      <Toggle label="Transparent background" hint="Applies to SVG and PNG" checked={s.transparent} onChange={(v) => update({ transparent: v })} />
      <Segmented label="PNG size" value={s.size} options={PNG_SIZES.map((v) => ({ value: v, label: `${v}px` }))} onChange={(v) => update({ size: v })} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className={`${BTN_PRIMARY} col-span-2`} onClick={() => run("SVG", async () => (downloadSvg(s), "SVG downloaded"))}>
          <Icon name="download" size={16} /> Download SVG
        </button>
        <button className={BTN_SECONDARY} disabled={!!busy} onClick={() => run("PNG…", async () => (await downloadPng(s), `PNG ${s.size}px downloaded`))}>
          <Icon name="download" size={16} /> PNG
        </button>
        <button
          className={BTN_SECONDARY}
          disabled={!!busy}
          title="Every stroke, dash and cut becomes a filled shape, for logo tools and cutters"
          onClick={() => run("Outlining…", async () => (await downloadOutlinedSvg(s), "Outlined SVG downloaded"))}
        >
          <Icon name="download" size={16} /> {busy === "Outlining…" ? busy : "Outlined SVG"}
        </button>
        <button className={BTN_SECONDARY} onClick={() => run("copy", async () => (await copySvg(s), "SVG copied"))}>
          <Icon name="copy" size={16} /> Copy SVG
        </button>
        <button className={BTN_SECONDARY} onClick={() => run("copy", async () => (await copyPng(s), "PNG copied"))}>
          <Icon name="copy" size={16} /> Copy PNG
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Outlined SVG turns strokes into filled shapes, ready for logo work.</p>
    </Section>
  );
}

function AnimationExport() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  const { busy, run } = useTask();
  const canRecord = typeof window !== "undefined" && videoFormat() !== null;
  return (
    <Section title="Animation" {...useSectionReset(["anim", "animDur"])}>
      <Segmented label="Animate" value={s.anim} options={ANIMS.map((v) => ({ value: v, label: cap(v) }))} onChange={(v) => update({ anim: v })} />
      {s.anim !== "none" && (
        <>
          <NumberSlider k="animDur" label="Loop length" unit="s" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className={BTN_SECONDARY} disabled={!!busy} onClick={() => run("SVG…", async () => (await downloadAnimatedSvg(s), "Animated SVG downloaded"))}>
              <Icon name="download" size={16} /> Animated SVG
            </button>
            <button
              className={BTN_SECONDARY}
              disabled={!!busy || !canRecord}
              title={canRecord ? "Records one loop in real time" : "This browser can't record video"}
              onClick={() =>
                run("Recording…", async (progress) => {
                  await downloadVideo(s, (p) => progress(`Recording ${Math.round(p * 100)}%`));
                  return "Video downloaded";
                })
              }
            >
              <Icon name="download" size={16} /> {busy?.startsWith("Recording") ? busy : "Video"}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Video records one {s.animDur}s loop at 1080px in real time.</p>
        </>
      )}
    </Section>
  );
}

function BatchExport() {
  const s = useStudio((st) => st.settings);
  const { busy, run } = useTask();
  const [count, setCount] = useState<12 | 24 | 48>(12);
  const [scope, setScope] = useState<"family" | "all">("family");
  const [format, setFormat] = useState<"svg" | "png" | "both">("svg");
  const [outlined, setOutlined] = useState(false);
  return (
    <Section title="Batch">
      <Segmented label="Variations" value={count} options={[12, 24, 48].map((v) => ({ value: v as 12 | 24 | 48, label: String(v) }))} onChange={setCount} />
      <Segmented
        label="Families"
        value={scope}
        options={[
          { value: "family", label: "This family" },
          { value: "all", label: "Any family" },
        ]}
        onChange={setScope}
      />
      <Segmented
        label="Format"
        value={format}
        options={[
          { value: "svg", label: "SVG" },
          { value: "png", label: `PNG ${s.size}` },
          { value: "both", label: "Both" },
        ]}
        onChange={setFormat}
      />
      {format !== "png" && <Toggle label="Outline strokes in SVGs" checked={outlined} onChange={setOutlined} />}
      <button
        className={`${BTN_PRIMARY} mt-2`}
        disabled={!!busy}
        onClick={() =>
          run("Starting…", async (progress) => {
            const blob = await batchZip(
              s,
              {
                count,
                sameFamily: scope === "family",
                svg: format !== "png",
                png: format !== "svg",
                outlined,
                shareBase: `${location.origin}/`,
              },
              (done, total) => progress(`Building ${done}/${total}…`),
            );
            downloadBlob(blob, `abstra-batch-${count}.zip`);
            return `${count} variations downloaded`;
          })
        }
      >
        <Icon name="download" size={16} /> {busy ?? `Download ${count} as ZIP`}
      </button>
      <p className="mt-2 text-[12px] text-ink-3">Uses your current colours and finish. The ZIP includes links.txt with a share link for each.</p>
    </Section>
  );
}

function EmbedExport() {
  const s = useStudio((st) => st.settings);
  const notify = useStudio((st) => st.notify);
  const [size, setSize] = useState<240 | 400 | 600>(400);
  const code = () => embedCode(location.origin, encodeSettings(s), size);
  return (
    <Section title="Embed">
      <Segmented label="Size" value={size} options={[240, 400, 600].map((v) => ({ value: v as 240 | 400 | 600, label: `${v}px` }))} onChange={setSize} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          className={BTN_SECONDARY}
          onClick={() => navigator.clipboard.writeText(code()).then(() => notify("Embed code copied"), () => notify("Clipboard blocked"))}
        >
          <Icon name="copy" size={16} /> Copy embed code
        </button>
        <a className={BTN_SECONDARY} href={`/embed?${encodeSettings(s)}`} target="_blank" rel="noopener">
          <Icon name="link" size={16} /> Open embed
        </a>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">An iframe of just the artwork. Animations play in the embed too.</p>
    </Section>
  );
}

function ExportTab() {
  return (
    <>
      <ImageExport />
      <AnimationExport />
      <BatchExport />
      <EmbedExport />
    </>
  );
}

export function Sidebar() {
  const [tab, setTab] = useState<Tab>("Shape");
  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel md:rounded-2xl md:shadow-[0_0_0_1px_rgb(0_0_0/0.05),0_12px_40px_-16px_rgb(0_0_0/0.22)] dark:md:shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_12px_40px_-16px_rgb(0_0_0/0.7)]">
      <header className="hidden items-center gap-2.5 px-5 pt-5 pb-3 md:flex">
        <Logo />
        <div>
          <div className="text-[15px] font-semibold tracking-tight">Abstra</div>
          <div className="text-[12px] text-ink-3">Abstract mark studio</div>
        </div>
      </header>
      <div
        role="tablist"
        aria-label="Control sections"
        className="mx-5 mt-3 flex gap-1 border-b border-line md:mt-0"
        onKeyDown={(e) => {
          const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          const i = TABS.indexOf(tab);
          const next = dir ? TABS[(i + dir + TABS.length) % TABS.length] : e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : null;
          if (!next) return;
          e.preventDefault();
          setTab(next);
          requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            aria-controls="tabpanel"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-2 py-2 text-[13px] font-medium transition ${
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="tabpanel" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === "Shape" && <ShapeTab />}
        {tab === "Finish" && <FinishTab />}
        {tab === "Compose" && <ComposeTab />}
        {tab === "Export" && <ExportTab />}
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-line/70 px-4 py-2.5 text-[12px] text-ink-3">
        <span>
          Made by{" "}
          <a
            href="https://github.com/kratikagrawal007"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-2 underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink-3"
          >
            Kratik
          </a>
        </span>
        <span className="font-mono">v1.1</span>
      </footer>
    </aside>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden="true">
      <rect width="256" height="256" rx="60" fill="var(--accent)" />
      <g transform="translate(48.64 48.64) scale(0.62)" fill="var(--logo-mark)" className="transition-[fill]">
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
