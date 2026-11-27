import { describe, expect, it } from "vitest";
import { formatearCantidadStock } from "./formatear-stock";

describe("formatearCantidadStock", () => {
  it("usa separadores es-PE y hasta 3 decimales", () => {
    expect(formatearCantidadStock("1234.5")).toBe("1,234.5");
    expect(formatearCantidadStock("0.12345")).toBe("0.123");
    expect(formatearCantidadStock("12.000")).toBe("12");
  });

  it("muestra cero para valores vacíos o no numéricos", () => {
    expect(formatearCantidadStock("")).toBe("0");
    expect(formatearCantidadStock("abc")).toBe("0");
  });
});
