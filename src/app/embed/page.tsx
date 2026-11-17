import type { Metadata } from "next";
import { EmbedView } from "@/ui/EmbedView";

export const metadata: Metadata = {
  title: "Abstra artwork",
  robots: { index: false, follow: false },
};

/** /embed?<share-link params>: just the artwork, for iframes. */
export default function EmbedPage() {
  return <EmbedView />;
}
