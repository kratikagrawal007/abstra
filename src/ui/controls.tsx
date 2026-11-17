"use client";
import { useId, useRef, useState } from "react";

/**
 * Field slider: a 32px bar with the label and value inside, a soft fill and a thin handle.
 * Press or drag anywhere to set the value at the pointer; arrow keys work through the
 * visually hidden native range input; double-click to type an exact number.
 */
export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, unit = "", defaultValue, onChange } = props;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  const shown = value.toFixed(decimals);
  const isDefault = defaultValue === undefined || Math.abs(defaultValue - value) < step / 2;

  const valueAt = (clientX: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const v = Math.round((min + t * (max - min)) / step) * step;
    return Math.min(max, Math.max(min, Number(v.toFixed(4))));
  };
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };

  return (
    <div className="py-1">
      <div
        ref={rootRef}
        className="group relative h-8 cursor-ew-resize touch-pan-y overflow-hidden rounded-lg bg-panel-2 select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
        onPointerDown={(e) => {
          if (editing || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          onChange(valueAt(e.clientX));
          inputRef.current?.focus({ preventScroll: true });
        }}
        onPointerMove={(e) => dragging.current && onChange(valueAt(e.clientX))}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onDoubleClick={() => (setDraft(shown), setEditing(true))}
        title="Drag to adjust · double-click to type"
      >
        <div className="absolute inset-y-0 left-0 bg-ink/[0.07] transition-colors group-hover:bg-ink/[0.1]" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/30 transition-colors group-hover:bg-ink/50 group-has-[:focus-visible]:bg-accent"
          style={{ left: `clamp(4px, ${pct}%, calc(100% - 4px))` }}
        />
        <input
          ref={inputRef}
          id={id}
          type="range"
          className="sr-only"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={`${shown}${unit}`}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setDraft(shown);
              setEditing(true);
            }
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 text-[12px]">
          <label htmlFor={id} className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
            {label}
            {!isDefault && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="changed from default" />}
          </label>
          {!editing && (
            <span className="font-mono tabular-nums text-ink/80">
              {shown}
              {unit}
            </span>
          )}
        </div>
        {editing && (
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            aria-label={`${label} value`}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="absolute inset-y-1 right-1 w-20 rounded-md border border-accent bg-panel px-2 text-right font-mono text-[12px] text-ink outline-none"
          />
        )}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const labelId = useId();
  const idx = props.options.findIndex((o) => o.value === props.value);
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = props.options[(idx + dir + props.options.length) % props.options.length];
    props.onChange(next.value);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    requestAnimationFrame(() => btns[props.options.indexOf(next)]?.focus());
  };
  return (
    <div className="py-1">
      <div id={labelId} className="mb-1 text-[12px] text-ink-3">
        {props.label}
      </div>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKey} className="flex h-8 rounded-lg bg-panel-2 p-0.5">
        {props.options.map((o) => {
          const on = o.value === props.value;
          return (
            <button
              key={String(o.value)}
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => props.onChange(o.value)}
              className={`flex min-w-0 flex-1 items-center justify-center rounded-md px-1.5 text-[12px] font-medium transition-colors ${
                on ? "bg-panel text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--line)]" : "text-ink-3 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Toggle row: a field with the label on the left and a compact pill switch on the right. */
export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="py-1">
      <div className="flex min-h-8 items-center justify-between gap-3 rounded-lg bg-panel-2 px-3 py-1.5 text-[12px]">
        <span className="min-w-0">
          <span id={labelId} className="cursor-pointer text-ink-2" onClick={() => onChange(!checked)}>
            {label}
          </span>
          {hint && (
            <span id={hintId} className="block text-[12px] leading-snug text-ink-3">
              {hint}
            </span>
          )}
        </span>
        <button
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
          onClick={() => onChange(!checked)}
          className={`relative flex h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors ${checked ? "bg-accent" : "bg-ink/20"}`}
        >
          <span className={`size-3 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform ${checked ? "translate-x-3" : ""}`} />
        </button>
      </div>
    </div>
  );
}

const SWATCHES = ["#1c1b22", "#ffffff", "#4f46e5", "#e4572e", "#17a398", "#f2c14e", "#d1495b", "#00798c"];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="py-1.5">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <label htmlFor={id} className="text-ink-2">
          {label}
        </label>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] uppercase text-ink">{value}</span>
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-6 w-6 cursor-pointer appearance-none overflow-hidden rounded-md border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0"
          />
        </span>
      </div>
      <div className="flex gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            aria-label={`Use ${c}`}
            onClick={() => onChange(c)}
            className={`h-6 flex-1 rounded border transition hover:scale-110 ${value.toLowerCase() === c ? "border-accent ring-2 ring-accent-soft" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <label htmlFor={id} className="text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-panel px-2 py-1 text-[12px] text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Collapsed state survives tab switches within the session.
const collapsed = new Set<string>();

/** Sheet section: a disclosure header with chevron, plus a Reset chip once anything in it changed. */
export function Section({ title, children, dirty, onReset }: { title: string; children: React.ReactNode; dirty?: boolean; onReset?: () => void }) {
  const [open, setOpen] = useState(() => !collapsed.has(title));
  const bodyId = useId();
  const toggle = () => {
    if (open) collapsed.add(title);
    else collapsed.delete(title);
    setOpen(!open);
  };
  return (
    <section className="border-b border-line/70 px-4 py-2.5 last:border-0">
      <div className="flex h-7 items-center justify-between gap-2">
        <h2>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
            className="group flex h-7 items-center gap-1.5 rounded-md text-[12px] font-semibold text-ink transition-colors hover:text-ink/75"
          >
            {title}
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className={`text-ink-3 transition-transform ${open ? "" : "-rotate-90"}`}>
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </h2>
        {dirty && onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${title}`}
            className="pop-in flex h-7 items-center gap-1 rounded-lg border border-line px-2 text-[12px] font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reset
          </button>
        )}
      </div>
      {open && (
        <div id={bodyId} className="pt-1">
          {children}
        </div>
      )}
    </section>
  );
}
