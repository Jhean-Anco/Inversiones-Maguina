import { describe, expect, it } from "vitest";
import { cerrarSesion, iniciarSesion, obtenerPerfil } from "./autenticacion.service";
import { probarSolicitudes, simularFetch } from "../test/solicitudes";

const perfil = { id: "u1", nombreCompleto: "Ana Pérez", roles: ["ADMIN"], permisos: ["ventas.ver"] };

describe("servicio de autenticación", () => {
  probarSolicitudes([
    {
      nombre: "iniciarSesion envía las credenciales y no devuelve datos",
      llamar: () => iniciarSesion({ usuario: "ana", contrasena: "secreta", recordar: true }),
      url: "/autenticacion/iniciar-sesion", metodo: "POST",
      cuerpo: { usuario: "ana", contrasena: "secreta", recordar: true },
      esperado: undefined,
    },
    { nombre: "obtenerPerfil extrae el usuario de la respuesta", llamar: obtenerPerfil, url: "/autenticacion/yo", respuesta: { usuario: perfil }, esperado: perfil },
    { nombre: "cerrarSesion usa POST sin cuerpo", llamar: cerrarSesion, url: "/autenticacion/cerrar-sesion", metodo: "POST", esperado: undefined },
  ]);

  it("propaga el rechazo de credenciales", async () => {
    simularFetch({ message: "Credenciales inválidas" }, 401);
    await expect(iniciarSesion({ usuario: "x", contrasena: "y", recordar: false })).rejects.toMatchObject({ estado: 401, message: "Credenciales inválidas" });
  });
});
