import { describe, expect, it } from "vitest";
import { igvIncluido, importeLinea, precioRepuestoEnLinea, subtotalSinIgv, TASA_IGV } from "./importes-venta";
import type { LineaCarrito } from "../../types/nuevo-ingreso";
import type { ProductoParaIngreso } from "../../services/ingresos.service";

type LineaProducto = Extract<LineaCarrito, { tipo: "PRODUCTO" }>;

const producto = (cambios: Partial<ProductoParaIngreso> = {}) => ({
  productoId: "p1", codigo: "R-1", nombre: "Filtro", marca: "Bosch", afectoIgv: true, afectacionIgv: "GRAVADO", presentacionId: "pr1",
  presentacion: "Unidad", unidadCodigo: "NIU", unidad: "Unidad", factorAUnidadBase: "1", precio: "25.00", stockBase: "10",
  listaPrecioCodigo: "GENERAL", listaPrecioNombre: "General", ...cambios,
}) as ProductoParaIngreso;

const linea = (cambios: Partial<LineaProducto> = {}, productoCambios: Partial<ProductoParaIngreso> = {}): LineaProducto => ({
  clave: "l1", tipo: "PRODUCTO", producto: producto(productoCambios), cantidad: "1", descuento: "0.00", afectacionIgv: "GRAVADO", ...cambios,
});

const tramos = [
  { listaCodigo: "GENERAL", listaNombre: "General", precio: "30.00", cantidadMinima: "1" },
  { listaCodigo: "MAYOR", listaNombre: "Por mayor", precio: "26.00", cantidadMinima: "10" },
  { listaCodigo: "MAYOR", listaNombre: "Por mayor", precio: "28.00", cantidadMinima: "5" },
];

describe("importes de venta", () => {
  it("la tasa de IGV vigente es 18 %", () => {
    expect(TASA_IGV).toBe(18);
  });

  it("calcula el importe de la línea redondeado a céntimos", () => {
    expect(importeLinea(3, 0.1, 0)).toBe(0.3);
    expect(importeLinea(1.5, 10.005, 0.5)).toBe(14.51);
    expect(importeLinea(2, 50, 20)).toBe(80);
  });

  it("nunca devuelve importes negativos cuando el descuento supera al importe", () => {
    expect(importeLinea(1, 10, 15)).toBe(0);
  });

  it("extrae el IGV incluido en un importe", () => {
    expect(igvIncluido(118)).toBe(18);
    expect(igvIncluido(100)).toBe(15.25);
    expect(igvIncluido(0)).toBe(0);
  });

  it("calcula el subtotal sin IGV", () => {
    expect(subtotalSinIgv(100, 15.25)).toBe(84.75);
    expect(subtotalSinIgv(0.3, 0.1)).toBe(0.2);
  });

  describe("precioRepuestoEnLinea", () => {
    it("usa el precio general cuando la línea no tiene lista", () => {
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: undefined }))).toBe("25.00");
    });

    it("devuelve null si no hay lista ni precio general", () => {
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: undefined }, { precio: "" }))).toBeNull();
    });

    it("elige el primer tramo de la lista cuya cantidad mínima se cumple", () => {
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: "MAYOR", cantidad: "12" }, { tramos }))).toBe("26.00");
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: "MAYOR", cantidad: "6" }, { tramos }))).toBe("28.00");
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: "GENERAL", cantidad: "1" }, { tramos }))).toBe("30.00");
    });

    it("devuelve null si ningún tramo aplica o el producto no tiene tramos", () => {
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: "MAYOR", cantidad: "2" }, { tramos }))).toBeNull();
      expect(precioRepuestoEnLinea(linea({ listaPrecioCodigo: "MAYOR" }, { tramos: undefined }))).toBeNull();
    });
  });
});
