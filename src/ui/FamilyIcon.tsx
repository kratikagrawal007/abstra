/** Family thumbnail: the pre-rendered /thumbs/<id>.svg used as a CSS mask, so it takes the current text colour. */
export function FamilyIcon({ id, className = "" }: { id: string; className?: string }) {
  const url = `url(/thumbs/${id}.svg)`;
  return (
    <span
      aria-hidden="true"
      className={`block bg-current ${className}`}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
