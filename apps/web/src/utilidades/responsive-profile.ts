export type ResponsiveProfile =
  | "laptop"
  | "tablet-landscape"
  | "tablet-portrait"
  | "mobile-landscape"
  | "mobile-portrait";

/** Classifies the available viewport into one of the five ERP profiles. */
export function getResponsiveProfile(width: number, height: number): ResponsiveProfile {
  if (width >= 1025) return "laptop";
  if (width > height) return height <= 500 ? "mobile-landscape" : "tablet-landscape";
  return width <= 600 ? "mobile-portrait" : "tablet-portrait";
}
