import { afterEach, describe, expect, it, vi } from "vitest";
import { hoy, numero, primerDiaMes, soles } from "./reportes-formatters";

afterEach(() => vi.useRealTimers());

describe("formateadores de reportes", () => {
  it("usa la fecha de Lima para hoy y el primer día del mes", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T04:59:00Z"));
    expect(hoy()).toBe("2025-12-31");
    expect(primerDiaMes()).toBe("2025-12-01");
    vi.setSystemTime(new Date("2026-02-15T15:00:00Z"));
    expect(hoy()).toBe("2026-02-15");
    expect(primerDiaMes()).toBe("2026-02-01");
  });

  it("formatea soles aceptando textos y valores inválidos", () => {
    expect(soles("1500.4").replace(/\s/g, " ")).toBe("S/ 1,500.40");
    expect(soles(2).replace(/\s/g, " ")).toBe("S/ 2.00");
    expect(soles("n/a").replace(/\s/g, " ")).toBe("S/ 0.00");
  });

  it("formatea cantidades con hasta 3 decimales", () => {
    expect(numero("1234.5678")).toBe("1,234.568");
    expect(numero(7)).toBe("7");
    expect(numero("")).toBe("0");
  });
});
