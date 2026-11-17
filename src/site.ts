import { FAMILY_COUNT } from "@/engine/families";

/** Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://shapeform.app) for canonical URLs, OG and sitemap. */
export const SITE = {
  name: "Shapeform",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://shapeform.example.com").replace(/\/$/, ""),
  description: `Generate abstract marks, shapes and line art in your browser. ${FAMILY_COUNT} shape families, seeded variations, shareable links, SVG and PNG export.`,
};
