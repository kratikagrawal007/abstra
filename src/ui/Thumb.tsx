"use client";
import { memo, useMemo } from "react";
import type { Settings } from "@/engine/types";
import { renderSvg } from "@/engine/render";

/** Small live preview. Uses currentColor so it follows the UI theme. */
export const Thumb = memo(function Thumb({ settings, id, inherit = true }: { settings: Settings; id: string; inherit?: boolean }) {
  const html = useMemo(
    () =>
      renderSvg(inherit ? { ...settings, color: "currentColor" } : settings, {
        id,
        background: !inherit && !settings.transparent,
      }),
    [settings, id, inherit],
  );
  return <div className="thumb h-full w-full" dangerouslySetInnerHTML={{ __html: html }} />;
});
