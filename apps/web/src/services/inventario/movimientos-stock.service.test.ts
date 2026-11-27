import { describe } from "vitest";
import { servicioMovimientosStock } from "./movimientos-stock.service";
import { probarSolicitudes } from "../../test/solicitudes";

const json = "POST" as const;

describe("servicioMovimientosStock", () => {
  const ajuste = { productoId: "p1", cantidadContada: "4", saldoEsperado: "5", motivo: "MERMA", observacion: "" };
  probarSolicitudes([
    { nombre: "listar", llamar: () => servicioMovimientosStock.listar(1, 8, "aceite", "AJUSTE"), url: "/inventario/movimientos-stock?pagina=1&porPagina=8&busqueda=aceite&tipo=AJUSTE" },
    { nombre: "buscarProductos", llamar: () => servicioMovimientosStock.buscarProductos("aceite 20w"), url: "/inventario/movimientos-stock/productos?busqueda=aceite%2020w" },
    { nombre: "crearAjuste", llamar: () => servicioMovimientosStock.crearAjuste(ajuste), url: "/inventario/movimientos-stock/ajustes", metodo: json, cuerpo: ajuste },
  ]);
});
