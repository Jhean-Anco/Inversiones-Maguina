import { describe, expect, it } from "vitest";
import { servicioProductos, type DatosProducto } from "./productos.service";
import { probarSolicitudes, simularFetch, ultimaSolicitud } from "../../test/solicitudes";

const json = "POST" as const;
const producto = { nombre: "Filtro", categoriaId: "c1", marcaId: "m1" } as DatosProducto;
const precio = { presentacionId: "p1", tipoListaPrecioId: "t1", cantidadMinima: "1", precio: "10.00", vigenteDesde: "2026-01-01", vigenteHasta: "" };

describe("servicioProductos", () => {
  probarSolicitudes([
    { nombre: "catalogos", llamar: () => servicioProductos.catalogos(), url: "/inventario/productos/catalogos" },
    { nombre: "alertasStockBajo por defecto", llamar: () => servicioProductos.alertasStockBajo(), url: "/inventario/productos/alertas-stock-bajo?pagina=1&porPagina=20" },
    { nombre: "alertasStockBajo paginadas", llamar: () => servicioProductos.alertasStockBajo(3, 5), url: "/inventario/productos/alertas-stock-bajo?pagina=3&porPagina=5" },
    { nombre: "listar sin filtros", llamar: () => servicioProductos.listar(1, 10, ""), url: "/inventario/productos?pagina=1&porPagina=10&busqueda=" },
    { nombre: "listar con filtros", llamar: () => servicioProductos.listar(2, 8, "filtro", { estado: "ACTIVOS", marca: "m1", precio: "SIN_PRECIO", existencia: "SIN_STOCK" }), url: "/inventario/productos?pagina=2&porPagina=8&busqueda=filtro&estado=ACTIVOS&marca=m1&precio=SIN_PRECIO&existencia=SIN_STOCK" },
    { nombre: "configurarPrecio", llamar: () => servicioProductos.configurarPrecio("p1", precio), url: "/inventario/productos/p1/precios", metodo: json, cuerpo: precio },
    { nombre: "corregirPrecio", llamar: () => servicioProductos.corregirPrecio("p1", "pr1", "12.00", "10.00"), url: "/inventario/productos/p1/precios/pr1", metodo: "PATCH", cuerpo: { precio: "12.00", precioAnterior: "10.00" } },
    { nombre: "costosCompra", llamar: () => servicioProductos.costosCompra("p1"), url: "/inventario/productos/p1/costos-compra" },
    { nombre: "historial", llamar: () => servicioProductos.historial("p1"), url: "/inventario/productos/p1/historial" },
    { nombre: "consultar", llamar: () => servicioProductos.consultar("p1"), url: "/inventario/productos/p1" },
    { nombre: "guardar crea un producto", llamar: () => servicioProductos.guardar(producto), url: "/inventario/productos", metodo: json, cuerpo: producto, respuesta: { id: "p9" }, esperado: { producto: { id: "p9" } } },
    { nombre: "guardar actualiza un producto", llamar: () => servicioProductos.guardar(producto, "p1"), url: "/inventario/productos/p1", metodo: "PATCH", cuerpo: producto, respuesta: { id: "p1" }, esperado: { producto: { id: "p1" } } },
    { nombre: "cambiarEstado", llamar: () => servicioProductos.cambiarEstado("p1", false), url: "/inventario/productos/p1/estado", metodo: "PATCH", cuerpo: { activo: false } },
    { nombre: "crearMarca", llamar: () => servicioProductos.crearMarca("Mobil"), url: "/inventario/marcas", metodo: json, cuerpo: { nombre: "Mobil" }, respuesta: { id: "m1", nombre: "Mobil" }, esperado: { marca: { id: "m1", nombre: "Mobil" }, advertencia: undefined } },
    { nombre: "crearCategoria usa el servicio de categorías", llamar: () => servicioProductos.crearCategoria("Lubricantes"), url: "/inventario/categorias", metodo: json, cuerpo: { nombre: "Lubricantes" }, respuesta: { id: "c1", nombre: "Lubricantes" }, esperado: { categoria: { id: "c1", nombre: "Lubricantes" }, advertencia: undefined } },
  ]);

  it("propaga los errores de validación al guardar", async () => {
    const fetchSimulado = simularFetch({ message: "Nombre duplicado" }, 409);
    await expect(servicioProductos.guardar(producto)).rejects.toMatchObject({ estado: 409, message: "Nombre duplicado" });
    expect(ultimaSolicitud(fetchSimulado).init.method).toBe("POST");
  });
});
