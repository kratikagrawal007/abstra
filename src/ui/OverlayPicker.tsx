"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FAMILIES } from "@/engine/families";
import type { Group } from "@/engine/types";
import { FamilyIcon } from "./FamilyIcon";

const GROUP_CODE: Record<Group, string> = { curves: "CV", woven: "WV", radial: "RD", geometry: "GM", texture: "TX" };

interface Item {
  id: string;
  name: string;
  /** Short catalogue-style code, e.g. "RD-04" = 4th radial family. */
  code: string;
  group: string;
}

const ITEMS: Item[] = [
  { id: "none", name: "No overlay", code: "OFF", group: "none" },
  ...FAMILIES.map((f) => {
    const n = FAMILIES.filter((x) => x.group === f.group).indexOf(f) + 1;
    return { id: f.id, name: f.name, code: `${GROUP_CODE[f.group]}-${String(n).padStart(2, "0")}`, group: f.group };
  }),
];

const PANEL_MAX = 440;

/**
 * Overlay family picker: a combobox whose list shows each family's thumbnail,
 * a small catalogue code and its name. Typing filters; arrows/Home/End move; Enter picks; Esc closes.
 */
export function OverlayPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);

  const current = ITEMS.find((i) => i.id === value) ?? ITEMS[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ITEMS.filter((i) => i.name.toLowerCase().includes(q) || i.group.includes(q) || i.code.toLowerCase().includes(q)) : ITEMS;
  }, [query]);

  // Place the panel under the trigger (or above it when there is no room), matching its width.
  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 8, margin = 12;
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const width = Math.max(r.width, 300);
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - width - margin);
    if (below >= Math.min(PANEL_MAX, 320) || below >= above) setPos({ left, width, top: r.bottom + gap, maxH: Math.min(PANEL_MAX, below) });
    else setPos({ left, width, bottom: window.innerHeight - r.top + gap, maxH: Math.min(PANEL_MAX, above) });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true); // capture: the sidebar scrolls, not the window
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  // Close on outside pointer down.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option visible (also once the panel first mounts, so the current family is in view).
  const mounted = open && pos !== null;
  useEffect(() => {
    if (!mounted) return;
    document.getElementById(`${uid}-opt-${filtered[active]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [active, mounted, filtered, uid]);

  const openPanel = () => {
    setQuery("");
    setActive(Math.max(0, ITEMS.findIndex((i) => i.id === value)));
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (item: Item | undefined) => {
    if (!item) return;
    onChange(item.id);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const n = filtered.length;
    if (e.key === "ArrowDown") setActive((a) => (n ? (a + 1) % n : 0));
    else if (e.key === "ArrowUp") setActive((a) => (n ? (a - 1 + n) % n : 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(Math.max(0, n - 1));
    else if (e.key === "Enter") choose(filtered[active]);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") return close(false);
    else return;
    e.preventDefault();
  };

  return (
    <div className="py-1.5">
      <div id={`${uid}-label`} className="mb-1.5 text-[13px] text-ink-2">
        Overlay family
      </div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${uid}-label ${uid}-value`}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={`flex w-full items-center gap-3 rounded-xl border p-1.5 pr-3 text-left transition hover:border-ink-3 ${
          open ? "border-accent ring-2 ring-accent-soft" : "border-line"
        }`}
      >
        <Tile id={current.id} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[12px] text-ink-3">{current.code}</span>
          <span id={`${uid}-value`} className="block truncate text-[14px] font-semibold text-ink">
            {current.name}
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 text-ink-3 transition ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="pop-in fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-panel/80 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] backdrop-blur-xl backdrop-saturate-150"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            <div className="border-b border-line p-2">
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={filtered[active] ? `${uid}-opt-${filtered[active].id}` : undefined}
                aria-label="Search overlay families"
                placeholder={`Search ${FAMILIES.length} families`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                className="w-full rounded-lg bg-panel-2/80 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent-soft"
              />
            </div>
            <ul id={listId} role="listbox" aria-label="Overlay families" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-3">No family matches “{query}”.</li>}
              {filtered.map((item, i) => {
                const selected = item.id === value;
                return (
                  <li
                    key={item.id}
                    id={`${uid}-opt-${item.id}`}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => i !== active && setActive(i)}
                    onClick={() => choose(item)}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-2xl p-2 transition ${i === active ? "bg-ink/[0.06]" : ""}`}
                  >
                    <Tile id={item.id} size="lg" />
                    <span className="min-w-0 flex-1">
                      {selected ? (
                        <span className="mb-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">Current</span>
                      ) : (
                        <span className="block font-mono text-[12px] tracking-wide text-ink-3">{item.code}</span>
                      )}
                      <span className="block truncate text-[15px] font-semibold text-ink">{item.name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Tile({ id, size }: { id: string; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-xl" : "h-10 w-10 rounded-lg";
  const icon = size === "lg" ? "h-9 w-9" : "h-6 w-6";
  return (
    <span className={`grid shrink-0 place-items-center bg-panel-2 text-ink ${box}`}>
      {id === "none" ? (
        <span className={`${icon} rounded-full border-2 border-dashed border-ink-3`} aria-hidden="true" />
      ) : (
        <FamilyIcon id={id} className={icon} />
      )}
    </span>
  );
}
