import { describe } from "vitest";
import { servicioEntradasStock, type DatosEntradaStock } from "./entradas-stock.service";
import { probarSolicitudes } from "../../test/solicitudes";

const json = "POST" as const;
const entrada = { fecha: "2026-01-02", tipoDocumento: "FACTURA", numeroDocumento: "F001-1", detalles: [] } as unknown as DatosEntradaStock;

describe("servicioEntradasStock", () => {
  probarSolicitudes([
    { nombre: "listar con estado por defecto", llamar: () => servicioEntradasStock.listar(1, 10, "acme"), url: "/inventario/entradas-stock?pagina=1&porPagina=10&busqueda=acme&estadoPago=TODAS" },
    { nombre: "listar pendientes", llamar: () => servicioEntradasStock.listar(2, 4, "", "PENDIENTES"), url: "/inventario/entradas-stock?pagina=2&porPagina=4&busqueda=&estadoPago=PENDIENTES" },
    { nombre: "consultar", llamar: () => servicioEntradasStock.consultar("e1"), url: "/inventario/entradas-stock/e1" },
    { nombre: "buscarProductos", llamar: () => servicioEntradasStock.buscarProductos("filtro #2"), url: "/inventario/entradas-stock/productos?busqueda=filtro%20%232" },
    { nombre: "crear", llamar: () => servicioEntradasStock.crear(entrada), url: "/inventario/entradas-stock", metodo: json, cuerpo: entrada },
  ]);
});
