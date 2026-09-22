type BrandProps = { inverse?: boolean };

export function WareefBrand({ inverse = false }: BrandProps) {
  return (
    <span className={`brand${inverse ? " brand-inverse" : ""}`} aria-label="Wareef وريف">
      <b>وريف</b>
      <span className="brand-divider" aria-hidden="true">/</span>
      <small className="text-base">WAREEF</small>
    </span>
  );
}