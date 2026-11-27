import { describe, expect, it } from "vitest";
import { importesCobro, validarCobro, vueltoCobro, type ParteCobro } from "./cobro-venta";

const parte = (cambios: Partial<ParteCobro>): ParteCobro => ({ clave: Math.random(), cuentaId: "", medioPago: "", monto: "", recibido: "", ...cambios });

describe("cobro de la venta", () => {
  it("la última cuenta recibe el resto del total", () => {
    expect(importesCobro([parte({ cuentaId: "caja" })], 118)).toEqual([118]);
    expect(importesCobro([parte({ cuentaId: "caja", monto: "50" }), parte({ cuentaId: "bcp" })], 118)).toEqual([50, 68]);
  });

  it("exige cuenta en cada parte, sin repetir y con importes positivos", () => {
    expect(validarCobro([parte({})], 10)).toMatch(/Selecciona la cuenta/);
    expect(validarCobro([parte({ cuentaId: "caja", monto: "5" }), parte({ cuentaId: "caja" })], 10)).toMatch(/No repitas/);
    expect(validarCobro([parte({ cuentaId: "caja", monto: "10" }), parte({ cuentaId: "bcp" })], 10)).toMatch(/mayor a cero/);
    expect(validarCobro([parte({ cuentaId: "caja", monto: "4" }), parte({ cuentaId: "bcp" })], 10)).toBe("");
  });

  it("calcula el vuelto solo del efectivo y no acepta recibir menos de lo cobrado", () => {
    const partes = [parte({ cuentaId: "caja", medioPago: "EFECTIVO", monto: "50", recibido: "100" }), parte({ cuentaId: "bcp", medioPago: "TRANSFERENCIA" })];
    expect(vueltoCobro(partes, 118)).toBe(50);
    expect(validarCobro([parte({ cuentaId: "caja", medioPago: "EFECTIVO", recibido: "20" })], 30)).toMatch(/no puede ser menor/);
  });
});
