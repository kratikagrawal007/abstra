import { ImageResponse } from "next/og";
import { SITE } from "@/site";
import { FAMILY_COUNT } from "@/engine/families";
import type { Style } from "@/engine/types";
import { artDataUri, fontData } from "../brand-art";
import { logoDataUri } from "@/brand";

// Served as /og.png so static hosts send image/png (extensionless files often become octet-stream).
export const dynamic = "force-static";

const TILES: [string, Style, number?][] = [
  ["supershape", "solid"],
  ["knot", "ribbon"],
  ["gear", "solid"],
  ["spirograph", "outline", 6],
  ["circle-grid", "solid"],
  ["petal-ring", "solid"],
];

export async function GET() {
  const [semibold, mono] = await Promise.all([fontData("geist-sans/Geist-SemiBold.ttf"), fontData("geist-mono/GeistMono-Regular.ttf")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f5f2", padding: 64, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 480 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoDataUri()} width={56} height={56} alt="" />
            <div style={{ fontSize: 34, color: "#1c1b22" }}>{SITE.name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 60, lineHeight: 1.05, color: "#1c1b22", letterSpacing: -2 }}>Abstract marks, generated.</div>
            <div style={{ fontSize: 24, color: "#5d5b66", fontFamily: "Geist Mono" }}>{`${FAMILY_COUNT} families · SVG + PNG · free`}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, width: 560, marginLeft: 32, alignContent: "center" }}>
          {TILES.map(([family, style, stroke], i) => (
            <div
              key={family}
              style={{ width: 170, height: 170, borderRadius: 24, background: i === 1 ? "#4f46e5" : "#ffffff", border: "1px solid #e6e3dc", display: "flex" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artDataUri(family, style, i === 1 ? "#ffffff" : "#1c1b22", stroke ? { stroke } : {})} width={170} height={170} alt="" />
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: semibold, weight: 600 },
        { name: "Geist Mono", data: mono, weight: 400 },
      ],
    },
  );
}
