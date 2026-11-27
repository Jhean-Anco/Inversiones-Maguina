import { describe } from "vitest";
import { servicioProveedores } from "./proveedores.service";
import { probarSolicitudes } from "../test/solicitudes";

describe("servicioProveedores", () => {
  probarSolicitudes([
    { nombre: "listar sin búsqueda", llamar: () => servicioProveedores.listar(), url: "/personas/proveedores?busqueda=" },
    { nombre: "listar con búsqueda", llamar: () => servicioProveedores.listar("20 1"), url: "/personas/proveedores?busqueda=20%201" },
    { nombre: "listarPaginado", llamar: () => servicioProveedores.listarPaginado(2, 6, "sac"), url: "/personas/proveedores/listado?pagina=2&porPagina=6&busqueda=sac" },
    { nombre: "listarPaginado sin búsqueda", llamar: () => servicioProveedores.listarPaginado(1, 10), url: "/personas/proveedores/listado?pagina=1&porPagina=10&busqueda=" },
    { nombre: "ficha", llamar: () => servicioProveedores.ficha("p/1"), url: "/personas/proveedores/p%2F1/ficha" },
    { nombre: "crear", llamar: () => servicioProveedores.crear({ tipoDocumento: "RUC", numeroDocumento: "20123456789", razonSocial: "ACME SAC" }), url: "/personas/proveedores", metodo: "POST", cuerpo: { tipoDocumento: "RUC", numeroDocumento: "20123456789", razonSocial: "ACME SAC" } },
  ]);
});
