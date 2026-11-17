"use client";
import { useId, useState } from "react";

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  const shown = value.toFixed(decimals);
  const isDefault = defaultValue === undefined || Math.abs(defaultValue - value) < step / 2;
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };
  return (
    <div className="py-1.5">
      <div className="mb-0.5 flex items-baseline justify-between text-[13px]">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-ink-2 select-none"
          onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
          title={defaultValue !== undefined ? "Double-click to reset" : undefined}
        >
          {label}
          {!isDefault && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="changed from default" />}
        </label>
        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            aria-label={`${label} value`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="-my-1 min-h-[26px] w-16 rounded border border-accent bg-panel px-1 text-right font-mono text-[12px] text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => (setDraft(shown), setEditing(true))}
            title="Click to type a value"
            aria-label={`${label}: ${shown}${unit}. Click to edit`}
            className="-my-1 min-h-[26px] min-w-[32px] rounded px-1.5 text-right font-mono text-[12px] tabular-nums text-ink hover:bg-panel-2"
          >
            {shown}
            {unit}
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--p" as string]: pct }}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
      />
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
    <div className="py-1.5">
      <div id={labelId} className="mb-1.5 text-[13px] text-ink-2">
        {props.label}
      </div>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKey} className="flex rounded-lg bg-panel-2 p-0.5">
        {props.options.map((o) => {
          const on = o.value === props.value;
          return (
            <button
              key={String(o.value)}
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => props.onChange(o.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition ${
                on ? "bg-panel text-ink elev" : "text-ink-3 hover:text-ink"
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

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span>
        <span id={labelId} className="cursor-pointer text-ink-2" onClick={() => onChange(!checked)}>
          {label}
        </span>
        {hint && (
          <span id={hintId} className="block text-[12px] text-ink-3">
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
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-3 last:border-0">
      <h2 className="mb-1 text-[12px] font-semibold tracking-wide text-ink-3">{title}</h2>
      {children}
    </section>
  );
}
