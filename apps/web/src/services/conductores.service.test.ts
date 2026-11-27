import { describe } from "vitest";
import { servicioConductores } from "./conductores.service";
import { probarSolicitudes } from "../test/solicitudes";

const datos = { tipoDocumento: "DNI" as const, numeroDocumento: "12345678", nombres: "Luis", apellidoPaterno: "Ríos", numeroLicencia: "Q12345678" };

describe("servicioConductores", () => {
  probarSolicitudes([
    { nombre: "listar sin búsqueda", llamar: () => servicioConductores.listar(), url: "/personas/conductores?busqueda=" },
    { nombre: "listar codifica la búsqueda", llamar: () => servicioConductores.listar("José & Cía"), url: "/personas/conductores?busqueda=Jos%C3%A9%20%26%20C%C3%ADa" },
    { nombre: "listarPaginado", llamar: () => servicioConductores.listarPaginado(2, 8, "ríos"), url: "/personas/conductores/listado?pagina=2&porPagina=8&busqueda=r%C3%ADos" },
    { nombre: "listarPaginado sin búsqueda", llamar: () => servicioConductores.listarPaginado(1, 10), url: "/personas/conductores/listado?pagina=1&porPagina=10&busqueda=" },
    { nombre: "crear", llamar: () => servicioConductores.crear(datos), url: "/personas/conductores", metodo: "POST", cuerpo: datos },
    { nombre: "actualizar", llamar: () => servicioConductores.actualizar("c1", { numeroLicencia: "Q1", telefono: "999" }), url: "/personas/conductores/c1", metodo: "PATCH", cuerpo: { numeroLicencia: "Q1", telefono: "999" } },
  ]);
});
