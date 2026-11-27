import { beforeEach, describe, expect, it, vi } from "vitest";

const ingresos = vi.hoisted(() => ({ obtenerDocumentoParaGuia: vi.fn() }));
vi.mock("../../services/ingresos.service", () => ({ servicioIngresos: ingresos }));
vi.mock("../../services/empresa.service", () => ({ servicioEmpresa: { obtener: async () => null } }));
const { documentoDeOrden } = await import("./documento-orden");
const { documentoDeCotizacion } = await import("../ordenes-cotizaciones-page/documento-cotizacion");
const { documentoDeGuia } = await import("../guias-remision-page/documento-guia");
const { documentoDeCompra } = await import("../../components/inventario/entrada-stock-detalle/documento-compra");

const { documentoDeCompraMototaxi } = await import("../mototaxis-page/documento-compra-mototaxi");

const linea = { tipo: "SERVICIO", nombreVisible: "Afinamiento", cantidad: "2", precioUnitario: "59", descuento: "0", afectacionIgv: "GRAVADO" };

describe("documentos imprimibles de cada listado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("orden de servicio", async () => {
    const d = await documentoDeOrden({ codigo: "OS-1", fechaRecepcion: "2026-11-25", fechaAcabado: "2026-11-27", clienteNombre: "Ana", vehiculoPlaca: "ABC", motivo: "Ruido", adelanto: "20", estado: "ABIERTA", detalles: [linea] } as never);
    expect(d).toMatchObject({ tipo: "ORDEN_SERVICIO", serieNumero: "OS-1", totales: { total: "118.00", igv: "0.00", tasaIgv: "0.00" } });
    expect(d.datosExtra?.map((x) => x.etiqueta)).toEqual(["Vehículo", "Entrega estimada", "Motivo"]);
    expect(d.adelanto).toEqual({ monto: "20.00", saldo: "98.00" });
  });

  it("cotización, con el cliente recién elegido", async () => {
    const cotizacion = { codigo: "C-1", fecha: "2026-11-25", vigenteHasta: "2026-12-10", clienteNombre: null, estado: "BORRADOR", aplicaIgv: true, observacion: null, detalles: [linea] } as never;
    expect(await documentoDeCotizacion(cotizacion, "Luis")).toMatchObject({ tipo: "COTIZACION", cliente: { nombre: "Luis" }, totales: { total: "118.00" } });
    const sinCliente = await documentoDeCotizacion(cotizacion);
    expect(sinCliente.cliente.nombre).toBe("Clientes varios");
    // Documento interno: sin leyenda, sin estado y sin desglose de IGV.
    expect(sinCliente.leyenda).toBe("");
    expect(sinCliente.datosExtra ?? []).toEqual([]);
    expect(sinCliente.totales).toMatchObject({ igv: "0.00", tasaIgv: "0.00" });
  });

  it("orden sin cliente se imprime como Clientes varios", async () => {
    const orden = { codigo: "OS-2", fechaRecepcion: "2026-11-25", clienteNombre: "", vehiculoPlaca: "ABC", motivo: "", adelanto: "0", detalles: [linea] } as never;
    expect((await documentoDeOrden(orden)).cliente.nombre).toBe("Clientes varios");
  });

  it("guía con bienes del comprobante de origen, y sin ellos si la consulta falla", async () => {
    const guia = { id: "g", tipo: "REMITENTE", codigo: "T001-1", fecha: "2026-11-25", ingresoId: "i", estado: "EMITIDO", enlacePdf: "https://n/g.pdf", comprobanteOrigen: { codigo: "B001-1", tipo: "BOLETA" } } as never;
    ingresos.obtenerDocumentoParaGuia.mockResolvedValueOnce({ clienteNombreCompleto: "Ana", clienteTipoDocumento: "DNI", clienteNumeroDocumento: "1", clienteDireccion: "Jr", detalles: [{ descripcion: "Bien", cantidad: "3.000" }] });
    expect(await documentoDeGuia(guia)).toMatchObject({ totales: null, enlacePdf: "https://n/g.pdf", items: [{ descripcion: "Bien", cantidad: "3" }] });
    ingresos.obtenerDocumentoParaGuia.mockRejectedValueOnce(new Error("x"));
    expect((await documentoDeGuia(guia)).items).toEqual([]);
  });

  it("compra de mototaxis", async () => {
    const compra = { codigo: "CM-1", fecha: "2026-11-25", documentoTipo: "SIN_DOCUMENTO", documentoNumero: null, proveedor: "Prov", unidades: 2, total: "20", pagado: "5", saldo: "15", observacion: null } as never;
    expect(await documentoDeCompraMototaxi(compra)).toMatchObject({ tipo: "COMPRA", items: [{ cantidad: "2" }], totales: { total: "20.00" } });
  });

  it("compra de repuestos", async () => {
    const d = await documentoDeCompra({ codigo: "EN-1", fecha: "2026-11-25", tipoDocumento: "FACTURA", numeroDocumento: "F1", proveedor: "Prov", total: "10", montoPagado: "5", detalles: [{ nombreProducto: "Filtro", codigoProducto: "P1", cantidad: "1", costoUnitario: "10", subtotal: "10" }] } as never);
    expect(d).toMatchObject({ tipo: "COMPRA", etiquetaCliente: "Proveedor", totales: { total: "10.00" } });
    const anulada = await documentoDeCompra({ codigo: "EN-2", fecha: "2026-11-25", tipoDocumento: "NOTA", total: "1", estado: "ANULADA" } as never);
    expect(anulada.advertencias).toContain("COMPRA ANULADA");
  });
});
