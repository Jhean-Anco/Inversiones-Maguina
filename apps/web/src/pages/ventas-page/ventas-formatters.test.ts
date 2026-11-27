import { describe, expect, it } from "vitest";
import { comprobante, estado, estadoSunat, fecha, medioPago, soles } from "./ventas-formatters";
import type { VentaListado } from "../../services/ingresos.service";

const venta = (cambios: Partial<VentaListado>) => ({ tipoComprobante: "BOLETA", estado: "REGISTRADO", estadoProveedor: "", ...cambios }) as VentaListado;

describe("formateadores de ventas", () => {
  it("formatea soles con dos decimales", () => {
    expect(soles("1234.5")).toBe("S/ 1,234.50");
    expect(soles("0")).toBe("S/ 0.00");
  });

  it("formatea la fecha en UTC", () => {
    expect(fecha("2026-09-05T23:30:00-05:00")).toBe("5 set. 2026");
  });

  it("nombra los tipos de comprobante", () => {
    expect(comprobante("BOLETA")).toBe("Boleta");
    expect(comprobante("FACTURA")).toBe("Factura");
    expect(comprobante("NOTA_VENTA")).toBe("Nota de venta");
  });

  describe("estado", () => {
    it("prioriza el estado del proveedor electrónico", () => {
      expect(estado("REGISTRADO", "ACEPTADO_SUNAT")).toBe("Aceptado por SUNAT");
      expect(estado("EMITIDO", "NUBEFACT_PENDIENTE")).toBe("Pendiente de confirmación");
    });

    it("usa el estado interno cuando el del proveedor no es conocido", () => {
      expect(estado("ANULACION_PENDIENTE")).toBe("Baja pendiente de SUNAT");
      expect(estado("ERROR_EMISION", "DESCONOCIDO")).toBe("Error de emisión");
    });

    it("humaniza estados desconocidos", () => {
      expect(estado("EN_REVISION_MANUAL")).toBe("en revision manual");
    });
  });

  describe("estadoSunat", () => {
    it("no aplica a notas de venta", () => {
      expect(estadoSunat(venta({ tipoComprobante: "NOTA_VENTA", estadoProveedor: "ACEPTADO_SUNAT" }))).toBe("No aplica");
    });

    it.each([
      ["RECHAZADO_SUNAT", "Rechazado"], ["BAJA_RECHAZADA", "Rechazado"], ["ACEPTADO_SUNAT", "Emitido"], ["EMITIDO", "Emitido"], ["ANULADO", "Anulado"], ["EN_PROCESO", "Pendiente"],
    ])("resume %s como %s", (estadoProveedor, esperado) => {
      expect(estadoSunat(venta({ tipoComprobante: "FACTURA", estadoProveedor }))).toBe(esperado);
    });

    it("usa el estado interno si el proveedor aún no responde", () => {
      expect(estadoSunat(venta({ estado: "EMITIDO", estadoProveedor: "" }))).toBe("Emitido");
    });
  });

  it("humaniza el medio de pago con mayúscula inicial", () => {
    expect(medioPago("BILLETERA_DIGITAL")).toBe("Billetera digital");
    expect(medioPago("EFECTIVO")).toBe("Efectivo");
    expect(medioPago("")).toBe("");
  });
});
