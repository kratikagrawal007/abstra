import { ImageResponse } from "next/og";
import { artDataUri } from "../brand-art";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4f46e5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artDataUri("supershape", "solid", "#ffffff")} width={132} height={132} alt="" />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
