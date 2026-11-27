import { describe } from "vitest";
import { servicioIdentidad } from "./identidad.service";
import { probarSolicitudes } from "../test/solicitudes";

describe("servicioIdentidad", () => {
  probarSolicitudes([
    { nombre: "consultar DNI", llamar: () => servicioIdentidad.consultar("DNI", "12345678"), url: "/personas/consulta-identidad?tipoDocumento=DNI&numeroDocumento=12345678", respuesta: { tipoDocumento: "DNI", numeroDocumento: "12345678", tipoPersona: "NATURAL" } },
    { nombre: "consultar RUC", llamar: () => servicioIdentidad.consultar("RUC", "20123456789"), url: "/personas/consulta-identidad?tipoDocumento=RUC&numeroDocumento=20123456789" },
  ]);
});
