import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", false && "oculto", "px-4", { activo: true, inactivo: false })).toBe("px-4 activo");
  });
});
