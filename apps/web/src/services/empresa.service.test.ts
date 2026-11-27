import { describe } from "vitest";
import { servicioEmpresa } from "./empresa.service";
import { probarSolicitudes } from "../test/solicitudes";

const empresa = { ruc: "20123456789", razonSocial: "Inversiones Maguiña" };

describe("servicioEmpresa", () => {
  probarSolicitudes([
    { nombre: "obtener devuelve la empresa", llamar: () => servicioEmpresa.obtener(), url: "/empresa", respuesta: { empresa }, esperado: empresa },
    { nombre: "obtener devuelve null si no está configurada", llamar: () => servicioEmpresa.obtener(), url: "/empresa", respuesta: { empresa: null }, esperado: null },
  ]);
});
