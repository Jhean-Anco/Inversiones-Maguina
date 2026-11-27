import { beforeEach, describe, expect, it, vi } from "vitest";
import { emisorEjemplo } from "../test/documento-ejemplo";

const empresa = vi.hoisted(() => ({ obtener: vi.fn() }));
vi.mock("../services/empresa.service", () => ({ servicioEmpresa: empresa }));
const { documentoInterno, emisorParaImpresion } = await import("./documentos-internos");

const base = { tipo: "COTIZACION" as const, titulo: "COTIZACIÓN", codigo: "C-1", fecha: "2026-11-25T10:00:00Z", contraparte: "Ana", lineas: [], emisor: emisorEjemplo };

describe("documentoInterno", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normaliza fechas, líneas e importes", () => {
    const d = documentoInterno({
      ...base, vencimiento: "2026-12-01T00:00:00Z", documentoContraparte: { tipo: "DNI", numero: "1" }, direccion: "Jr. 1", medioPago: "Efectivo", observacion: "obs",
      lineas: [{ descripcion: "A", cantidad: 2, precioUnitario: 5, descuento: 1, total: 9 }, { descripcion: "B", cantidad: "1" }],
      importes: { total: 118, subtotal: 100, igv: 18, tasaIgv: 18 }, leyenda: "L", electronico: true, enlacePdf: "https://x/p.pdf", advertencias: ["a"],
    });
    expect(d).toMatchObject({ fechaEmision: "2026-11-25", fechaVencimiento: "2026-12-01", leyenda: "L", enlacePdf: "https://x/p.pdf", advertencias: ["a"], observacion: "obs" });
    expect(d.items[0]).toMatchObject({ precioUnitario: "5.00", descuento: "1.00", total: "9.00" });
    expect(d.items[1]).toMatchObject({ precioUnitario: null, descuento: null, total: null });
    expect(d.totales).toMatchObject({ gravada: "100.00", igv: "18.00", total: "118.00" });
  });

  it("admite documentos sin importes ni emisor", () => {
    expect(documentoInterno(base).totales).toBeNull();
    const d = documentoInterno({ ...base, emisor: null, importes: { total: 10 } });
    expect(d.totales).toMatchObject({ gravada: "10.00", igv: "0.00" });
    expect(d.advertencias).toEqual([]);
  });

  it("consulta el emisor tolerando fallos y lo recuerda", async () => {
    empresa.obtener.mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce(emisorEjemplo);
    expect(await emisorParaImpresion()).toBeNull();
    expect(await emisorParaImpresion()).toEqual(emisorEjemplo);
    expect(await emisorParaImpresion()).toEqual(emisorEjemplo);
    expect(empresa.obtener).toHaveBeenCalledTimes(2);
  });
});
