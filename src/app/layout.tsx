import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name} — Abstract shape & SVG generator`,
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["abstract shape generator", "SVG generator", "logo mark generator", "generative art", "geometric patterns", "line art"],
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${SITE.name}: abstract shape and SVG generator` }],
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description, images: ["/og.png"] },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121216" },
  ],
};

// Latin subsets (self-hosted at build) are ~3x smaller than the full Geist files,
// which matters because a font swap re-triggers Largest Contentful Paint.
const GeistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
// Mono is only used for small values, so don't spend preload bandwidth on it.
const GeistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false });

// Apply saved theme before paint to avoid a flash.
const themeScript = `try{var t=(localStorage.getItem("abstra:theme")||localStorage.getItem("shapeform:theme"));if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
