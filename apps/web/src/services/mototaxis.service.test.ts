import { describe, expect, it } from "vitest";
import { COLORES_ADICIONALES_MOTOTAXI, COLORES_RAPIDOS_MOTOTAXI, COLORES_SUGERIDOS_MOTOTAXI, etiquetaColorMototaxi, hexColorMototaxi, servicioMototaxis } from "./mototaxis.service";
import { probarSolicitudes } from "../test/solicitudes";

const json = "POST" as const;

describe("colores de mototaxi", () => {
  it("sugiere primero los colores rápidos y luego los adicionales", () => {
    expect(COLORES_SUGERIDOS_MOTOTAXI).toEqual([...COLORES_RAPIDOS_MOTOTAXI, ...COLORES_ADICIONALES_MOTOTAXI]);
    expect(new Set(COLORES_SUGERIDOS_MOTOTAXI).size).toBe(COLORES_SUGERIDOS_MOTOTAXI.length);
  });

  it("cada color sugerido tiene un tono propio", () => {
    for (const color of COLORES_SUGERIDOS_MOTOTAXI) expect(hexColorMototaxi(color)).not.toBe("#8794a0");
  });

  it("quita el código hexadecimal de la etiqueta", () => {
    expect(etiquetaColorMototaxi("Rojo fuego (#ff0000)")).toBe("Rojo fuego");
    expect(etiquetaColorMototaxi("  Azul  ")).toBe("Azul");
    expect(etiquetaColorMototaxi(null)).toBe("");
    expect(etiquetaColorMototaxi(undefined)).toBe("");
  });

  it("usa el hexadecimal personalizado en mayúsculas", () => {
    expect(hexColorMototaxi("Rojo fuego (#ff00aa)")).toBe("#FF00AA");
  });

  it("resuelve colores conocidos sin distinguir mayúsculas", () => {
    expect(hexColorMototaxi("Azul Marino")).toBe("#15395b");
    expect(hexColorMototaxi("MARRÓN")).toBe("#805a3b");
  });

  it("usa un gris neutro para colores desconocidos o vacíos", () => {
    expect(hexColorMototaxi("Fucsia")).toBe("#8794a0");
    expect(hexColorMototaxi(null)).toBe("#8794a0");
    expect(hexColorMototaxi(undefined)).toBe("#8794a0");
  });
});

describe("servicioMototaxis", () => {
  probarSolicitudes([
    { nombre: "marcas", llamar: () => servicioMototaxis.marcas(), url: "/mototaxis/marcas" },
    { nombre: "modelos por defecto", llamar: () => servicioMototaxis.modelos(), url: "/mototaxis/modelos?busqueda=&incluirInactivos=false" },
    { nombre: "modelos incluyendo inactivos", llamar: () => servicioMototaxis.modelos("re 4", true), url: "/mototaxis/modelos?busqueda=re%204&incluirInactivos=true" },
    { nombre: "crearModelo", llamar: () => servicioMototaxis.crearModelo({ nombre: "RE" }), url: "/mototaxis/modelos", metodo: json, cuerpo: { nombre: "RE" } },
    { nombre: "actualizarModelo", llamar: () => servicioMototaxis.actualizarModelo("m1", { nombre: "RE2" }), url: "/mototaxis/modelos/m1", metodo: "PATCH", cuerpo: { nombre: "RE2" } },
    { nombre: "garantiaModelo", llamar: () => servicioMototaxis.garantiaModelo("m1"), url: "/mototaxis/modelos/m1/garantia", respuesta: null, esperado: null },
    { nombre: "guardarGarantiaModelo", llamar: () => servicioMototaxis.guardarGarantiaModelo("m1", { activa: true, mesesVigencia: 12, alcance: "Motor", exclusiones: "" }), url: "/mototaxis/modelos/m1/garantia", metodo: "PUT", cuerpo: { activa: true, mesesVigencia: 12, alcance: "Motor", exclusiones: "" } },
    { nombre: "aplicarGarantiaVenta envía un objeto vacío", llamar: () => servicioMototaxis.aplicarGarantiaVenta("d1"), url: "/mototaxis/ventas/d1/garantia", metodo: json, cuerpo: {} },
    { nombre: "preciosModelo", llamar: () => servicioMototaxis.preciosModelo("m1"), url: "/mototaxis/modelos/m1/precios" },
    { nombre: "corregirPrecioModelo", llamar: () => servicioMototaxis.corregirPrecioModelo("m1", "p1", "9000.00", "8500.00"), url: "/mototaxis/modelos/m1/precios/p1", metodo: "PATCH", cuerpo: { precioVenta: "9000.00", precioAnterior: "8500.00" } },
    { nombre: "actualizarPrecioVentaModelo", llamar: () => servicioMototaxis.actualizarPrecioVentaModelo("m1", { precioVenta: "1", vigenteDesde: "2026-01-01", vigenteHasta: "" }), url: "/mototaxis/modelos/m1/precio-venta", metodo: "PATCH", cuerpo: { precioVenta: "1", vigenteDesde: "2026-01-01", vigenteHasta: "" } },
    { nombre: "analisisModelo", llamar: () => servicioMototaxis.analisisModelo("m1"), url: "/mototaxis/modelos/m1/analisis" },
    { nombre: "proveedores por defecto", llamar: () => servicioMototaxis.proveedores(), url: "/mototaxis/proveedores?busqueda=" },
    { nombre: "proveedores con búsqueda", llamar: () => servicioMototaxis.proveedores("Bajaj Perú"), url: "/mototaxis/proveedores?busqueda=Bajaj%20Per%C3%BA" },
    { nombre: "crearProveedor", llamar: () => servicioMototaxis.crearProveedor({ ruc: "1" }), url: "/mototaxis/proveedores", metodo: json, cuerpo: { ruc: "1" } },
    { nombre: "unidades con filtros por defecto", llamar: () => servicioMototaxis.unidades(), url: "/mototaxis/unidades?busqueda=&estado=TODOS&pagina=1&porPagina=24" },
    { nombre: "unidades con filtros", llamar: () => servicioMototaxis.unidades({ busqueda: "VIN", estado: "DISPONIBLE", pagina: 2, porPagina: 12 }), url: "/mototaxis/unidades?busqueda=VIN&estado=DISPONIBLE&pagina=2&porPagina=12" },
    { nombre: "comprar", llamar: () => servicioMototaxis.comprar({ unidades: [] }), url: "/mototaxis/compras", metodo: json, cuerpo: { unidades: [] } },
    { nombre: "compras por defecto", llamar: () => servicioMototaxis.compras(), url: "/mototaxis/compras?busqueda=" },
    { nombre: "compras con búsqueda", llamar: () => servicioMototaxis.compras("F001"), url: "/mototaxis/compras?busqueda=F001" },
    { nombre: "pagosCompra", llamar: () => servicioMototaxis.pagosCompra("c1"), url: "/mototaxis/compras/c1/pagos" },
    { nombre: "aplicarPagoCompra", llamar: () => servicioMototaxis.aplicarPagoCompra("c1", { importe: "1" }), url: "/mototaxis/compras/c1/pagos", metodo: json, cuerpo: { importe: "1" } },
    { nombre: "cambiarEstado", llamar: () => servicioMototaxis.cambiarEstado("u1", { estado: "BAJA", motivo: "Robo" }), url: "/mototaxis/unidades/u1/estado", metodo: json, cuerpo: { estado: "BAJA", motivo: "Robo" } },
    { nombre: "ajustesInventario", llamar: () => servicioMototaxis.ajustesInventario(), url: "/mototaxis/ajustes-inventario" },
    { nombre: "reconteoModelo", llamar: () => servicioMototaxis.reconteoModelo("m/1"), url: "/mototaxis/ajustes-inventario/m%2F1/reconteo" },
    { nombre: "crearAjusteInventario", llamar: () => servicioMototaxis.crearAjusteInventario({ cantidadContada: 2 }), url: "/mototaxis/ajustes-inventario", metodo: json, cuerpo: { cantidadContada: 2 } },
    { nombre: "garantias", llamar: () => servicioMototaxis.garantias(), url: "/mototaxis/garantias" },
    { nombre: "reclamos", llamar: () => servicioMototaxis.reclamos(), url: "/mototaxis/reclamos" },
    { nombre: "crearReclamo", llamar: () => servicioMototaxis.crearReclamo({ garantiaId: "g1" }), url: "/mototaxis/reclamos", metodo: json, cuerpo: { garantiaId: "g1" } },
    { nombre: "avanzarReclamo", llamar: () => servicioMototaxis.avanzarReclamo("r1", { estado: "APROBADO", estadoAnterior: "ABIERTO", resolucion: "ok" }), url: "/mototaxis/reclamos/r1/estado", metodo: "PATCH", cuerpo: { estado: "APROBADO", estadoAnterior: "ABIERTO", resolucion: "ok" } },
  ]);
});
