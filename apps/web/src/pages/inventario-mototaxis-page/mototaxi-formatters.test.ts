import { describe, expect, it } from "vitest";
import { fechaMototaxi, monedaMototaxi } from "./mototaxi-formatters";

const normalizar = (texto: string) => texto.replace(/\s/g, " ");

describe("formateadores de mototaxis", () => {
  it("formatea importes en soles", () => {
    expect(normalizar(monedaMototaxi("8500"))).toBe("S/ 8,500.00");
    expect(normalizar(monedaMototaxi(0))).toBe("S/ 0.00");
  });

  it("indica la falta de registros en importes nulos", () => {
    expect(monedaMototaxi(null)).toBe("Sin registros");
    expect(monedaMototaxi(undefined)).toBe("Sin registros");
  });

  it("formatea la fecha en UTC sin desfase de zona horaria", () => {
    expect(fechaMototaxi("2026-09-05T23:59:00-05:00")).toBe("5 set. 2026");
    expect(fechaMototaxi("2026-01-01")).toBe("1 ene. 2026");
  });

  it("indica la falta de registros en fechas vacías", () => {
    expect(fechaMototaxi(null)).toBe("Sin registros");
    expect(fechaMototaxi("")).toBe("Sin registros");
  });
});
