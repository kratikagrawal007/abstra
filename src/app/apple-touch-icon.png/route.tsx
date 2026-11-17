import { ImageResponse } from "next/og";
import { logoDataUri } from "@/brand";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* Full-bleed square tile: iOS applies its own corner mask. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri({ radius: 0, scale: 0.6 })} width={180} height={180} alt="" />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
