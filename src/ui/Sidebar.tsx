"use client";
import { useEffect, useState } from "react";
import { useStudio } from "@/store/studio";
import { FAMILIES, getFamily } from "@/engine/families";
import { DEFAULT_SETTINGS, LIMITS, type NumericKey } from "@/engine/settings";
import { CAPS, GROUPS, PNG_SIZES, STYLES, type Settings } from "@/engine/types";
import { copyPng, copySvg, downloadPng, downloadSvg } from "@/engine/export";
import { ColorField, Section, Segmented, SelectField, Slider, Toggle } from "./controls";
import { Icon } from "./icons";

const TABS = ["Shape", "Finish", "Compose", "Export"] as const;
type Tab = (typeof TABS)[number];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

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
  const chip = (on: boolean) =>
    `min-h-[28px] shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition ${
      on ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-3 hover:text-ink"
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
      {visible.length === 0 && <p className="py-4 text-center text-[12px] text-ink-3">No family matches “{query}”.</p>}
      {GROUPS.map((g) => {
        const list = visible.filter((f) => f.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className="mb-2">
            {group === "all" && <h3 className="mb-1.5 text-[12px] text-ink-3">{cap(g)}</h3>}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={`${cap(g)} families`}>
              {list.map((f) => {
                const on = f.id === family;
                return (
                  <button
                    key={f.id}
                    aria-pressed={on}
                    title={f.name}
                    onClick={() => setFamily(f.id)}
                    className={`group flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
                      on ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-ink-3 hover:text-ink"
                    }`}
                  >
                    {/* Static SVG used as a mask so the thumbnail takes the current text colour. */}
                    <span
                      aria-hidden="true"
                      className="aspect-square w-full bg-current transition group-hover:scale-105"
                      style={{
                        maskImage: `url(/thumbs/${f.id}.svg)`,
                        WebkitMaskImage: `url(/thumbs/${f.id}.svg)`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                      }}
                    />
                    <span className="w-full truncate text-center text-[12px] leading-tight">{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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
      <Section title="Geometry">
        <Segmented label="Style" value={s.style} options={STYLES.map((v) => ({ value: v, label: cap(v) }))} onChange={(v) => update({ style: v })} />
        <NumberSlider k="frequency" label={f.labels.frequency} />
        <NumberSlider k="detail" label={f.labels.detail} />
        <NumberSlider k="phase" label="Phase" unit="°" />
        <NumberSlider k="warp" label="Warp" />
      </Section>
    </>
  );
}

function FinishTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  return (
    <Section title="Finish">
      <NumberSlider k="stroke" label="Stroke" />
      <ColorField label="Ink" value={s.color} onChange={(v) => update({ color: v })} />
      <ColorField label="Background" value={s.background} onChange={(v) => update({ background: v })} />
      <Segmented label="Line ends" value={s.cap} options={CAPS.map((v) => ({ value: v, label: cap(v) }))} onChange={(v) => update({ cap: v })} />
      <button
        onClick={() => update({ color: s.background, background: s.color })}
        className="mt-2 w-full rounded-lg border border-line py-1.5 text-[12px] text-ink-2 hover:text-ink"
      >
        Swap ink and background
      </button>
    </Section>
  );
}

function ComposeTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  return (
    <>
      <Section title="Repeat">
        <NumberSlider k="layers" label="Layers" />
        <NumberSlider k="spacing" label="Layer spacing" />
        <NumberSlider k="copies" label="Rotated copies" />
        <NumberSlider k="rotation" label="Rotation" unit="°" />
        <NumberSlider k="aspect" label="Aspect" />
      </Section>
      <Section title="Overlay">
        <SelectField
          label="Overlay family"
          value={s.overlay}
          options={[{ value: "none", label: "None" }, ...FAMILIES.map((f) => ({ value: f.id, label: f.name }))]}
          onChange={(v) => update({ overlay: v })}
        />
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

function ExportTab() {
  const s = useStudio((st) => st.settings);
  const update = useStudio((st) => st.update);
  const notify = useStudio((st) => st.notify);
  const btn = "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium transition";
  return (
    <Section title="Export">
      <Toggle label="Transparent background" hint="Applies to SVG and PNG" checked={s.transparent} onChange={(v) => update({ transparent: v })} />
      <Segmented label="PNG size" value={s.size} options={PNG_SIZES.map((v) => ({ value: v, label: `${v}px` }))} onChange={(v) => update({ size: v })} />
      <div className="mt-3 space-y-2">
        <button className={`${btn} bg-accent text-on-accent hover:opacity-90`} onClick={() => (downloadSvg(s), notify("SVG downloaded"))}>
          <Icon name="download" size={16} /> Download SVG
        </button>
        <button
          className={`${btn} border border-line text-ink hover:bg-panel-2`}
          onClick={() => downloadPng(s).then(() => notify(`PNG ${s.size}px downloaded`), () => notify("PNG export failed"))}
        >
          <Icon name="download" size={16} /> Download PNG
        </button>
        <button
          className={`${btn} border border-line text-ink hover:bg-panel-2`}
          onClick={() => copySvg(s).then(() => notify("SVG copied"), () => notify("Clipboard blocked"))}
        >
          <Icon name="copy" size={16} /> Copy SVG code
        </button>
        <button
          className={`${btn} border border-line text-ink hover:bg-panel-2`}
          onClick={() => copyPng(s).then(() => notify("PNG copied"), () => notify("PNG copy not supported here"))}
        >
          <Icon name="copy" size={16} /> Copy PNG image
        </button>
      </div>
    </Section>
  );
}

export function Sidebar() {
  const [tab, setTab] = useState<Tab>("Shape");
  return (
    <aside className="flex h-full min-h-0 flex-col border-line bg-panel md:border-r">
      <header className="hidden items-center gap-2.5 px-5 pt-5 pb-3 md:flex">
        <Logo />
        <div>
          <div className="text-[15px] font-semibold tracking-tight">Shapeform</div>
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
      <div id="tabpanel" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-6">
        {tab === "Shape" && <ShapeTab />}
        {tab === "Finish" && <FinishTab />}
        {tab === "Compose" && <ComposeTab />}
        {tab === "Export" && <ExportTab />}
      </div>
    </aside>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="var(--accent)" />
      <path d="M14 6c2 4 6 6 8 8-2 2-6 4-8 8-2-4-6-6-8-8 2-2 6-4 8-8z" fill="#fff" />
    </svg>
  );
}
