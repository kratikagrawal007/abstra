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
    background_color: "#121216",
    theme_color: "#121216",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
