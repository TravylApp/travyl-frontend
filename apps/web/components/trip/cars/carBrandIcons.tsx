"use client";

import { BRAND_SVGS } from "./carBrandSvgData";

function normalizeBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^mercedesbenz$/, "mercedesbenz");
}

export function BrandIcon({
  brand,
  className = "h-4 w-4",
}: {
  brand: string;
  className?: string;
}) {
  const slug = normalizeBrand(brand);
  const data = BRAND_SVGS[slug];

  if (!data) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d={data.path} />
    </svg>
  );
}
