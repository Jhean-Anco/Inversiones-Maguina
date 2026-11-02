import { solicitarApi } from "./api-cliente";

export type PerfilSesion = {
  id: string;
  nombreCompleto: string;
  roles: string[];
  permisos: string[];
};

export async function iniciarSesion(datos: { usuario: FormDataEntryValue | null; contrasena: FormDataEntryValue | null; recordar: boolean }): Promise<void> {
  await solicitarApi<unknown>("/autenticacion/iniciar-sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

export async function obtenerPerfil(): Promise<PerfilSesion> {
  const respuesta = await solicitarApi<{ usuario: PerfilSesion }>("/autenticacion/yo");
  return respuesta.usuario;
}

export async function cerrarSesion(): Promise<void> {
  await solicitarApi<unknown>("/autenticacion/cerrar-sesion", { method: "POST" });
}
