import { describe } from "vitest";
import { servicioTransportistas } from "./transportistas.service";
import { probarSolicitudes } from "../test/solicitudes";

describe("servicioTransportistas", () => {
  probarSolicitudes([
    { nombre: "listar sin búsqueda", llamar: () => servicioTransportistas.listar(), url: "/personas/transportistas?busqueda=" },
    { nombre: "listar con búsqueda", llamar: () => servicioTransportistas.listar("Olva"), url: "/personas/transportistas?busqueda=Olva" },
    { nombre: "crear", llamar: () => servicioTransportistas.crear({ numeroDocumento: "20100000001", razonSocial: "Olva SAC" }), url: "/personas/transportistas", metodo: "POST", cuerpo: { numeroDocumento: "20100000001", razonSocial: "Olva SAC" } },
  ]);
});
