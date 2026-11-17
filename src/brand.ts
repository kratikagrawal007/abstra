/** Abstra logo mark: four petal/corner pieces drawn in a 256×256 box. */
export const LOGO_PATHS = [
  "M124 16L124 124A108 108 0 0 1 16 16Z",
  "M240 124L132 124A108 108 0 0 1 240 16Z",
  "M132 240L132 132L240 240Z",
  "M16 132L124 132A108 108 0 0 1 16 240Z",
];

/** The mark on a rounded tile. `scale` is the mark's share of the tile. */
export function logoSvg({ tile = "#358e4a", mark = "#ffffff", scale = 0.62, radius = 60 } = {}): string {
  const t = 128 - 128 * scale;
  const paths = LOGO_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" rx="${radius}" fill="${tile}"/>` +
    `<g transform="translate(${t} ${t}) scale(${scale})" fill="${mark}">${paths}</g></svg>`
  );
}

export const logoDataUri = (opts?: Parameters<typeof logoSvg>[0]) =>
  `data:image/svg+xml;base64,${Buffer.from(logoSvg(opts)).toString("base64")}`;
