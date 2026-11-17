# Abstra

Browser-based studio for abstract marks, shapes and line art. 54 shape families, five styles, seeded variations, shareable URLs, SVG and PNG export. No account, no tracking; everything runs client-side.

**Live:** https://abstra-shape.vercel.app

## Features

- 54 shape families in five styles (outline, solid, double, ribbon, dashed); seeded variations; undo/redo, recents and favourites
- Colour: 12 curated palettes with shuffle, linear/radial gradient fills, and per-layer colours
- Composition: layers, rotated copies, aspect, overlays
- Export: SVG, PNG (1024–4096 px), clipboard, and **outlined SVG** where every stroke, dash and cut becomes a filled shape (for logo tools and cutters)
- Animation: spin, phase or warp loops with live preview; export as animated SVG (no JS needed) or video (WebM, MP4 on Safari)
- Batch: 12/24/48 variations as a ZIP of SVG/PNG plus `links.txt` with a share link for each
- Embed: `/embed?<share params>` renders just the artwork (animated if set); "Copy embed code" gives an iframe snippet
- Every setting lives in the URL, so any design is a shareable link

## Develop

Requires Node 20.9+ (`.nvmrc` pins 22).

```bash
npm install
npm run dev        # http://localhost:3000  (visual QA sheet at /gallery)
npm test           # engine tests: every family × style, parameter extremes, determinism, URL round-trip
npm run check      # typecheck + tests + production build
npm run build      # static export to out/
npm run preview    # serve out/ locally with gzip, like a real host
```

## Deploy

The build is a fully static site in `out/`. Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://abstra.app`) at build time so canonical URLs, the sitemap and social cards point at your domain.

| Host | Setup |
|---|---|
| Vercel | Import the repo. Framework: Next.js. Add `NEXT_PUBLIC_SITE_URL`. No other config needed. |
| Cloudflare Pages | Build command `npm run build`, output directory `out`, env `NODE_VERSION=22` and `NEXT_PUBLIC_SITE_URL`. `public/_headers` sets caching + security headers. |
| Netlify | `netlify.toml` is included; add `NEXT_PUBLIC_SITE_URL` in site settings. Uses the same `_headers` file. |
| Anything else | Upload `out/`. Serve `/_next/static/*` with a long immutable cache. |

## Quality bar

Lighthouse on the production build (served with gzip): mobile Performance 97, desktop 100; Accessibility, Best Practices and SEO 100 on both.

- WCAG AA contrast for all text tokens in light and dark themes
- ARIA tabs and radio groups with arrow-key navigation, labelled switches and controls, live region for toasts
- Full keyboard use; press `?` in the app for shortcuts
- Respects `prefers-reduced-motion`
- Family thumbnails are pre-rendered static SVGs (`/thumbs/<family>.svg`) used as CSS masks, which keeps the HTML small and lets them follow the theme colour

## Layout

- `src/engine/`: pure, deterministic engine (no React, no `Math.random`)
  - `rng.ts` FNV-1a + Mulberry32 · `geometry.ts` helpers · `render.ts` fit/styles/layers/copies/overlay → SVG
  - `families/` shape generators, registered in `families/index.ts`
  - `settings.ts` limits/sanitize · `seed.ts` variations · `url-state.ts` versioned short keys · `export.ts` SVG/PNG · `thumbs.ts`
  - `palettes.ts` colour sets · `animate.ts` frames + animated SVG · `outline.ts` stroke-to-fill via Clipper (lazy-loaded)
- `src/store/studio.ts`: Zustand store with settings, undo/redo, recent, favourites
- `src/ui/`: Light studio UI (sidebar tabs, family search, artboard, toolbar, mobile sheet)
- `src/app/`: page, metadata, `og.png` + `apple-touch-icon.png` (generated at build from the engine), manifest, robots, sitemap, thumbnails route

## Add a family

1. Write a `Family` (labels, ranges, defaults, `generate`) in `src/engine/families/`. Use `fill: "nonzero"` and `hole: true` shapes for cut-outs.
2. Add it to `FAMILIES` in `families/index.ts`. Tests, the gallery, thumbnails, search and Randomize pick it up automatically.

## Shortcuts

`R`/`Space` randomize · `[` `]` previous/next family · `1`–`5` style · `F` save · `P` play/pause animation · `⌘Z` / `⇧⌘Z` undo/redo · `⌘S` download SVG · `?` help
