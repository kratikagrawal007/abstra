import type { MetadataRoute } from "next";
import { SITE } from "@/site";

export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Abstract shape generator`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#f6f5f2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
