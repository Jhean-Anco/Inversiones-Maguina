import { describe, expect, it } from "vitest";
import { getViewportProfile } from "./viewport";

describe("getViewportProfile", () => {
  it.each([
    [1366, 768, "laptop"],
    [1025, 1400, "laptop"],
    [1024, 768, "tablet-landscape"],
    [900, 501, "tablet-landscape"],
    [900, 500, "mobile-landscape"],
    [740, 360, "mobile-landscape"],
    [768, 1024, "tablet-portrait"],
    [601, 900, "tablet-portrait"],
    [600, 900, "mobile-portrait"],
    [375, 667, "mobile-portrait"],
    [500, 500, "mobile-portrait"],
  ] as const)("%i×%i es %s", (ancho, alto, perfil) => {
    expect(getViewportProfile(ancho, alto)).toBe(perfil);
  });
});
