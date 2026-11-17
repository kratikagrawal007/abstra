import type { Metadata } from "next";
import { FAMILIES } from "@/engine/families";
import { renderSvg } from "@/engine/render";
import { DEFAULT_SETTINGS, withFamily } from "@/engine/settings";
import { encodeSettings } from "@/engine/url-state";
import { STYLES } from "@/engine/types";

export const metadata: Metadata = { title: "Gallery (QA)", robots: { index: false, follow: false } };

/** Visual QA sheet: every family in every style. Dev-only so it never ships. */
export default function Gallery() {
  if (process.env.NODE_ENV === "production") return <p className="p-8">The gallery is only available in development.</p>;
  return (
    <main className="mx-auto max-w-[1400px] p-6">
      <h1 className="mb-4 text-lg font-semibold">
        Gallery · {FAMILIES.length} families × {STYLES.length} styles
      </h1>
      <div className="grid grid-cols-[160px_repeat(5,1fr)] items-center gap-2 text-[12px]">
        <div />
        {STYLES.map((s) => (
          <div key={s} className="text-center text-ink-3">
            {s}
          </div>
        ))}
        {FAMILIES.map((f) => (
          <div key={f.id} className="contents">
            <div>
              <div className="font-medium">{f.name}</div>
              <div className="text-ink-3">{f.group}</div>
            </div>
            {STYLES.map((style) => {
              const s = { ...withFamily(DEFAULT_SETTINGS, f.id), style, transparent: false };
              return (
                <a
                  key={style}
                  href={`/?${encodeSettings(s)}`}
                  data-family={f.id}
                  data-style={style}
                  className="thumb block aspect-square overflow-hidden rounded-lg border border-line"
                  dangerouslySetInnerHTML={{ __html: renderSvg(s, { id: `g-${f.id}-${style}`, background: true }) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
