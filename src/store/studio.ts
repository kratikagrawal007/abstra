"use client";
import { create } from "zustand";
import type { Settings } from "@/engine/types";
import { DEFAULT_SETTINGS, sanitize, withFamily } from "@/engine/settings";
import { FAMILIES } from "@/engine/families";
import { randomSeed, settingsFromSeed } from "@/engine/seed";

const MAX_UNDO = 100;
const MAX_RECENT = 12;
const COALESCE_MS = 400; // slider drags collapse into one undo step

interface StudioState {
  settings: Settings;
  keepFamily: boolean;
  past: Settings[];
  future: Settings[];
  recent: Settings[];
  favorites: Settings[];
  lastEdit: number;
  toast: string | null;

  hydrate(initial: Settings | null): void;
  update(patch: Partial<Settings>): void;
  setFamily(id: string): void;
  stepFamily(dir: 1 | -1): void;
  randomize(): void;
  applySeed(seed: string): void;
  reset(): void;
  restore(s: Settings): void;
  undo(): void;
  redo(): void;
  setKeepFamily(v: boolean): void;
  toggleFavorite(): void;
  notify(msg: string): void;
}

const FAV_KEY = "shapeform:favorites";
const readFavs = (): Settings[] => {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>[]).map(sanitize) : [];
  } catch {
    return [];
  }
};
const writeFavs = (f: Settings[]) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
  } catch {
    /* private mode: favourites just won't persist */
  }
};

export const sameArt = (a: Settings, b: Settings) => JSON.stringify(a) === JSON.stringify(b);

export const useStudio = create<StudioState>((set, get) => {
  /** Replace settings, recording an undo step. `variation` also logs it to the recent strip. */
  const commit = (next: Settings, variation = false, coalesce = false) => {
    const { settings, past, lastEdit, recent } = get();
    if (sameArt(settings, next)) return;
    const now = Date.now();
    const merge = coalesce && now - lastEdit < COALESCE_MS;
    set({
      settings: next,
      past: merge ? past : [...past, settings].slice(-MAX_UNDO),
      future: [],
      lastEdit: coalesce ? now : 0,
      recent: variation ? [next, ...recent.filter((r) => !sameArt(r, next))].slice(0, MAX_RECENT) : recent,
    });
  };

  return {
    settings: DEFAULT_SETTINGS,
    keepFamily: false,
    past: [],
    future: [],
    recent: [],
    favorites: [],
    lastEdit: 0,
    toast: null,

    hydrate(initial) {
      const settings = initial ?? DEFAULT_SETTINGS;
      set({ settings, recent: [settings], favorites: readFavs() });
    },
    update(patch) {
      commit(sanitize({ ...get().settings, ...patch }), false, true);
    },
    setFamily(id) {
      commit(withFamily(get().settings, id), true);
    },
    stepFamily(dir) {
      const i = FAMILIES.findIndex((f) => f.id === get().settings.family);
      const next = FAMILIES[(i + dir + FAMILIES.length) % FAMILIES.length];
      commit(withFamily(get().settings, next.id), true);
    },
    randomize() {
      const { settings, keepFamily } = get();
      commit(settingsFromSeed(settings, randomSeed(), keepFamily), true);
    },
    applySeed(seed) {
      const { settings, keepFamily } = get();
      commit(settingsFromSeed(settings, seed.trim() || "shapeform", keepFamily), true);
    },
    reset() {
      commit(withFamily({ ...DEFAULT_SETTINGS, seed: get().settings.seed }, get().settings.family), true);
    },
    restore(s) {
      commit(s);
    },
    undo() {
      const { past, settings, future } = get();
      if (!past.length) return;
      set({ settings: past[past.length - 1], past: past.slice(0, -1), future: [settings, ...future], lastEdit: 0 });
    },
    redo() {
      const { past, settings, future } = get();
      if (!future.length) return;
      set({ settings: future[0], future: future.slice(1), past: [...past, settings], lastEdit: 0 });
    },
    setKeepFamily(v) {
      set({ keepFamily: v });
    },
    toggleFavorite() {
      const { settings, favorites } = get();
      const exists = favorites.some((f) => sameArt(f, settings));
      const next = exists ? favorites.filter((f) => !sameArt(f, settings)) : [settings, ...favorites].slice(0, 24);
      writeFavs(next);
      set({ favorites: next, toast: exists ? "Removed from favourites" : "Saved to favourites" });
    },
    notify(msg) {
      set({ toast: msg });
    },
  };
});
