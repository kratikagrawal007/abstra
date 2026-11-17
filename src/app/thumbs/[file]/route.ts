import { THUMB_IDS, thumbSvg } from "@/engine/thumbs";

// Pre-rendered at build: /thumbs/<family>.svg. Keeps 54 heavy SVGs out of the HTML.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return THUMB_IDS.map((id) => ({ file: `${id}.svg` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return new Response(thumbSvg(file.replace(/\.svg$/, "")), { headers: { "Content-Type": "image/svg+xml" } });
}
