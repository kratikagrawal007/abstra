import { FAMILY_COUNT } from "@/engine/families";

/** Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://abstra.app) for canonical URLs, OG and sitemap. */
export const SITE = {
  name: "Abstra",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://abstra.example.com").replace(/\/$/, ""),
  description: `Generate abstract marks, shapes and line art in your browser. ${FAMILY_COUNT} shape families, seeded variations, shareable links, SVG and PNG export.`,
};
