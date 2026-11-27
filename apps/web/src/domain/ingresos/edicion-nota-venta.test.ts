import { describe, expect, it } from "vitest";
import type { MototaxiParaIngreso, NotaVentaEditable, ProductoParaIngreso } from "../../services/ingresos.service";
import { datosDeEdicion, formularioDesdeNota, importeLineaEdicion, lineaDeServicio, lineaDesdeMototaxi, lineaDesdeProducto, totalEdicion, validarEdicion, type FormularioNota } from "./edicion-nota-venta";

const nota: NotaVentaEditable = {
  id: "n1", codigo: "NV01-000001", fecha: "2026-01-02", clienteId: null, clienteNombre: null, clienteNumeroDocumento: null, medioPago: "EFECTIVO", observacion: null,
  total: "20.00", importePagado: "0.00", versionDocumento: "v1", editable: true, motivoNoEditable: null,
  detalles: [
    { id: "l1", tipo: "PRODUCTO", presentacionId: "p1", mototaxiModeloId: null, codigoProducto: "A", descripcion: "Filtro", presentacion: "Unidad", cantidad: "2.000", precioUnitario: "10.0000", descuento: "0", afectacionIgv: "GRAVADO", total: "20.00", bloqueo: null },
    { id: "l2", tipo: "MOTOTAXI", presentacionId: null, mototaxiModeloId: "m1", codigoProducto: "M", descripcion: "Moto", presentacion: null, cantidad: "1.000", precioUnitario: "10.1234", descuento: "0.00", afectacionIgv: "GRAVADO", total: "10.12", bloqueo: "Tiene una garantía aplicada." },
  ],
};
const producto = { presentacionId: "p2", nombre: "Aceite", presentacion: "Litro", precio: "12.00", afectacionIgv: "EXONERADO" } as ProductoParaIngreso;

describe("edición de nota de venta", () => {
  it("precarga el formulario con valores legibles", () => {
    const formulario = formularioDesdeNota(nota);
    expect(formulario).toMatchObject({ clienteNombre: "", observacion: "", clienteId: null });
    expect(formulario.lineas[0]).toMatchObject({ cantidad: "2", precio: "10.00", descuento: "0.00", detalle: "Unidad" });
    expect(formulario.lineas[1]).toMatchObject({ precio: "10.1234", mototaxiModeloId: "m1", bloqueo: "Tiene una garantía aplicada." });
  });

  it("crea líneas nuevas desde el catálogo", () => {
    expect(lineaDesdeProducto("c", producto)).toMatchObject({ presentacionId: "p2", precio: "12.00", cantidad: "1", afectacionIgv: "EXONERADO" });
    expect(lineaDesdeProducto("c", { ...producto, tramos: [{ listaCodigo: "GENERAL", listaNombre: "G", precio: "11", cantidadMinima: "1" }] }).precio).toBe("11.00");
    expect(lineaDesdeProducto("c", { ...producto, precio: "" }).precio).toBe("0.00");
    const moto = { mototaxiModeloId: "m2", marca: "Bajaj", modelo: "RE", version: null, precioVenta: "1500" } as MototaxiParaIngreso;
    expect(lineaDesdeMototaxi("m", moto)).toMatchObject({ descripcion: "Bajaj RE", precio: "1500.00" });
    expect(lineaDesdeMototaxi("m", { ...moto, precioVenta: null }).precio).toBe("0.00");
    expect(lineaDeServicio("s")).toMatchObject({ tipo: "SERVICIO", descripcion: "" });
  });

  it("calcula importes y total", () => {
    const lineas = formularioDesdeNota(nota).lineas;
    expect(importeLineaEdicion({ ...lineas[0], descuento: "1.50" })).toBe(18.5);
    expect(importeLineaEdicion({ ...lineas[0], cantidad: "", precio: "", descuento: "" })).toBe(0);
    expect(totalEdicion(lineas)).toBe(30.12);
  });

  it("valida el formulario antes de enviar", () => {
    const base = formularioDesdeNota(nota);
    const con = (cambios: Partial<FormularioNota["lineas"][number]>, indice = 0): FormularioNota => ({ ...base, lineas: base.lineas.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea) });
    expect(validarEdicion(base, "2026-01-02")).toBe("");
    expect(validarEdicion(base, "2026-01-01")).toMatch(/fecha/);
    expect(validarEdicion({ ...base, fecha: "" }, "2026-01-02")).toMatch(/fecha/);
    expect(validarEdicion({ ...base, lineas: [] }, "2026-01-02")).toMatch(/al menos/);
    expect(validarEdicion({ ...base, lineas: [lineaDeServicio("s")] }, "2026-01-02")).toMatch(/Describe/);
    expect(validarEdicion(con({ cantidad: "0" }), "2026-01-02")).toMatch(/cantidad/);
    expect(validarEdicion(con({ cantidad: "1.5" }, 1), "2026-01-02")).toMatch(/enteras/);
    expect(validarEdicion(con({ precio: "" }), "2026-01-02")).toMatch(/precio/);
    expect(validarEdicion(con({ precio: "-1" }), "2026-01-02")).toMatch(/precio/);
    expect(validarEdicion(con({ descuento: "21" }), "2026-01-02")).toMatch(/descuento/);
    expect(validarEdicion(con({ descuento: "-1" }), "2026-01-02")).toMatch(/descuento/);
    expect(validarEdicion(con({ descuento: "" }), "2026-01-02")).toBe("");
  });

  it("arma la solicitud con la versión y la confirmación solo cuando corresponde", () => {
    const inicial = formularioDesdeNota(nota);
    const formulario = { ...inicial, observacion: "  ", lineas: [...inicial.lineas, { ...lineaDeServicio("s"), descripcion: " Lavado ", descuento: "" }] };
    const datos = datosDeEdicion(formulario, "v1", false);
    expect(datos).toMatchObject({ versionDocumento: "v1", observacion: null });
    expect(datos).not.toHaveProperty("confirmarDevolucionExceso");
    expect(datos.clienteId).toBeUndefined();
    expect(datos.detalles[2]).toMatchObject({ descripcion: "Lavado", descuento: "0" });
    expect(datos.detalles[0].descripcion).toBeUndefined();
    expect(datosDeEdicion({ ...formulario, clienteId: "c1", observacion: "ok" }, "v1", true)).toMatchObject({ clienteId: "c1", observacion: "ok", confirmarDevolucionExceso: true });
  });
});
