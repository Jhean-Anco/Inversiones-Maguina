import { describe } from "vitest";
import { servicioDashboard } from "./dashboard.service";
import { probarSolicitudes } from "../test/solicitudes";

describe("servicioDashboard", () => {
  probarSolicitudes([
    { nombre: "resumen", llamar: () => servicioDashboard.resumen(), url: "/reportes/resumen", respuesta: { generadoPara: "Ana", clientesActivos: 3 } },
  ]);
});
