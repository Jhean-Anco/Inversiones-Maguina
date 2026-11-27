import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapearLineasIngresoDocumento } from "./mapear-lineas-ingreso-documento";
import { servicioIngresos, type ProductoParaIngreso } from "../services/ingresos.service";

vi.mock("../services/ingresos.service", () => ({ servicioIngresos: { buscarProductos: vi.fn() } }));

const buscarProductos = vi.mocked(servicioIngresos.buscarProductos);
const producto = (presentacionId: string, precio = "25.00") => ({ productoId: "p1", nombre: "Filtro de aceite", presentacionId, precio, afectacionIgv: "GRAVADO" }) as ProductoParaIngreso;

beforeEach(() => {
  buscarProductos.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapearLineasIngresoDocumento", () => {
  it("convierte servicios con valores por defecto", async () => {
    const lineas = await mapearLineasIngresoDocumento([
      { tipo: "SERVICIO", descripcion: "Afinado", cantidad: 2, precioUnitario: "35", descuento: "5.00", afectacionIgv: "EXONERADO" },
      { tipo: "SERVICIO", nombreVisible: "Lavado" },
      { tipo: "SERVICIO" },
    ], "orden");
    expect(lineas).toEqual([
      { clave: expect.any(String), tipo: "SERVICIO", descripcion: "Afinado", cantidad: "2", precio: "35.00", descuento: "5.00", afectacionIgv: "EXONERADO" },
      { clave: expect.any(String), tipo: "SERVICIO", descripcion: "Lavado", cantidad: "1", precio: "0.00", descuento: "0.00", afectacionIgv: "GRAVADO" },
      { clave: expect.any(String), tipo: "SERVICIO", descripcion: "Servicio", cantidad: "1", precio: "0.00", descuento: "0.00", afectacionIgv: "GRAVADO" },
    ]);
    expect(new Set(lineas.map((linea) => linea.clave)).size).toBe(3);
    expect(buscarProductos).not.toHaveBeenCalled();
  });

  it("normaliza afectaciones desconocidas a gravado", async () => {
    const [inafecta, otra] = await mapearLineasIngresoDocumento([
      { tipo: "SERVICIO", afectacionIgv: "INAFECTO" },
      { tipo: "SERVICIO", afectacionIgv: "EXPORTACION" },
    ], "cotización");
    expect(inafecta.afectacionIgv).toBe("INAFECTO");
    expect(otra.afectacionIgv).toBe("GRAVADO");
  });

  it("busca el repuesto por su nombre y conserva el precio del documento", async () => {
    buscarProductos.mockResolvedValue([producto("otra"), producto("pr1")]);
    const [linea] = await mapearLineasIngresoDocumento([
      { tipo: "PRODUCTO", nombreVisible: "Filtro de aceite · Unidad", presentacionId: "pr1", cantidad: "3", precioUnitario: "22.50" },
    ], "orden");
    expect(buscarProductos).toHaveBeenCalledWith("Filtro de aceite");
    expect(linea).toEqual({ clave: expect.any(String), tipo: "PRODUCTO", producto: { ...producto("pr1"), precio: "22.50" }, cantidad: "3", descuento: "0.00", afectacionIgv: "GRAVADO" });
  });

  it("usa el precio vigente cuando el documento no trae precio y limita el nombre buscado", async () => {
    buscarProductos.mockResolvedValue([producto("pr1", "30.00")]);
    const [linea] = await mapearLineasIngresoDocumento([{ tipo: "PRODUCTO", nombreVisible: "x".repeat(120), presentacionId: "pr1" }], "cotización");
    expect(buscarProductos).toHaveBeenCalledWith("x".repeat(100));
    expect(linea).toMatchObject({ tipo: "PRODUCTO", producto: { precio: "30.00" } });
  });

  it("falla si el repuesto ya no existe en el inventario", async () => {
    buscarProductos.mockResolvedValue([producto("otra")]);
    await expect(mapearLineasIngresoDocumento([{ tipo: "PRODUCTO", nombreVisible: "Bujía", presentacionId: "pr1" }], "orden"))
      .rejects.toThrow("No se encontró en el inventario la presentación de Bujía. Revisa esa línea antes de emitir.");
    await expect(mapearLineasIngresoDocumento([{ tipo: "PRODUCTO" }], "orden"))
      .rejects.toThrow("No se encontró en el inventario la presentación de un repuesto.");
    expect(buscarProductos).toHaveBeenLastCalledWith("");
  });

  it("rechaza líneas que no pertenecen a la venta de repuestos", async () => {
    await expect(mapearLineasIngresoDocumento([{ tipo: "MOTOTAXI" }], "cotización"))
      .rejects.toThrow("La cotización contiene una línea que no se puede cargar en venta de repuestos.");
    await expect(mapearLineasIngresoDocumento([{}], "orden"))
      .rejects.toThrow("La orden contiene una línea que no se puede cargar en venta de repuestos.");
  });

  it("genera claves con formato UUID aunque el navegador no tenga randomUUID", async () => {
    vi.stubGlobal("crypto", {});
    const [linea] = await mapearLineasIngresoDocumento([{ tipo: "SERVICIO" }], "orden");
    expect(linea.clave).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
