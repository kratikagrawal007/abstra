import type { Family } from "../types";
import { lissajous } from "./lissajous";
import { spirograph } from "./spirograph";
import { spiral } from "./spiral";
import { rosette } from "./rosette";
import { star } from "./star";
import { sunburst } from "./sunburst";
import { polygonRing } from "./polygon-ring";
import { honeycomb } from "./honeycomb";
import { harmonograph, orbit, softPolygon, softStar, swirl } from "./curves";
import { knot, loopWreath, weave } from "./woven";
import { cutoutBloom, diamonds, pinwheel, radialBands, softBranches, splitDisc, spokes } from "./radial";
import { badge, crescents, curveFan, dotted, modules, offsetRings, perforated } from "./geometry-a";
import { cross, cubes, lattice, panels, steps, truchet } from "./geometry-b";
import { beads, lineDisc, rings, stringArt } from "./texture";
import { contours, epicycle, supershape } from "./curves-2";
import { chain } from "./woven-2";
import { gear, petalRing } from "./radial-2";
import { archStack, chevrons, flowerOfLife, linkedCells, notched } from "./geometry-c";
import { moire, scatter, waves } from "./texture-2";

/** Single source of truth for families. Add a family = write it + add one line here. */
export const FAMILIES: readonly Family[] = [
  // curves
  lissajous, spirograph, spiral, swirl, harmonograph, rosette, orbit, softStar, softPolygon, supershape, epicycle, contours,
  // woven
  knot, weave, loopWreath, chain,
  // radial
  star, sunburst, pinwheel, diamonds, splitDisc, radialBands, softBranches, cutoutBloom, spokes, petalRing, gear,
  // geometry
  polygonRing, honeycomb, offsetRings, dotted, crescents, curveFan, perforated, badge, modules,
  panels, cross, steps, lattice, cubes, truchet, flowerOfLife, chevrons, archStack, linkedCells, notched,
  // texture
  rings, lineDisc, beads, stringArt, moire, waves, scatter,
];

export const FAMILY_COUNT = FAMILIES.length;
export const FAMILY_IDS = FAMILIES.map((f) => f.id);
const byId = new Map(FAMILIES.map((f) => [f.id, f]));

export function getFamily(id: string): Family {
  return byId.get(id) ?? FAMILIES[0];
}
