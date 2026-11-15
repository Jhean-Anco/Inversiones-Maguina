# Responsive profiles

The web application uses five viewport profiles. CSS selects a profile through
`html[data-responsive-profile]`; width and height media queries are not used for
page breakpoints.

| Profile | Viewport rule |
| --- | --- |
| Laptop | Width is at least 1025 CSS pixels. |
| Tablet landscape | Landscape viewport, width below 1025 px, and height above 500 px. |
| Tablet portrait | Portrait viewport wider than 600 px and narrower than 1025 px. |
| Mobile landscape | Landscape viewport, width below 1025 px, and height up to 500 px. |
| Mobile portrait | Portrait viewport up to 600 px wide. |

The profile is recalculated after viewport resize or orientation change. Shared
layout rules and module-specific responsive rules use the same profile names.
List pagination and catalog card columns also use this classification so their
row counts do not introduce additional viewport tiers.

Intrinsic `@container` rules were migrated to profile selectors as well. Other
media rules such as print and reduced-motion preferences remain because they
do not define screen-size layouts.

Representative browser viewports for review:

| Profile | Width × height |
| --- | ---: |
| Laptop | 1366 × 768 |
| Tablet landscape | 1024 × 768 |
| Tablet portrait | 768 × 1024 |
| Mobile landscape | 740 × 390 |
| Mobile portrait | 390 × 844 |
