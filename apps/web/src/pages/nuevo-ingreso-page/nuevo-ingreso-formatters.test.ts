import { afterEach, describe, expect, it, vi } from "vitest";
import { fechaHoyPeru, soles } from "./nuevo-ingreso-formatters";

afterEach(() => vi.useRealTimers());

describe("formateadores de nueva venta", () => {
  it("formatea montos en soles", () => {
    expect(soles(1234.5).replace(/\s/g, " ")).toBe("S/ 1,234.50");
    expect(soles(-3).replace(/\s/g, " ")).toBe("-S/ 3.00");
  });

  it("calcula la fecha de hoy en la zona horaria de Lima", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T03:00:00Z"));
    expect(fechaHoyPeru()).toBe("2026-02-28");
    vi.setSystemTime(new Date("2026-03-01T05:00:00Z"));
    expect(fechaHoyPeru()).toBe("2026-03-01");
  });
});
