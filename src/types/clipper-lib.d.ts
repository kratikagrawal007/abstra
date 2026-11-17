declare module "clipper-lib" {
  // Untyped JS port of Angus Johnson's Clipper 6; we only touch a small surface (see engine/outline.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ClipperLib: any;
  export default ClipperLib;
}
