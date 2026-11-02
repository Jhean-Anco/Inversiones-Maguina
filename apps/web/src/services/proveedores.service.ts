import { solicitarApi } from "./api-cliente";

export type ProveedorRegistrado = { id: string; nombre: string; razonSocial: string | null; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; tipoDocumento: string; numeroDocumento: string };
export type DatosProveedorNuevo = { tipoDocumento: "DNI" | "RUC"; numeroDocumento: string; razonSocial?: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; nombreComercial?: string };

export const servicioProveedores = {
  listar: (busqueda = "") => solicitarApi<ProveedorRegistrado[]>(`/personas/proveedores?busqueda=${encodeURIComponent(busqueda)}`),
  crear: (datos: DatosProveedorNuevo) => solicitarApi<ProveedorRegistrado>("/personas/proveedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
};
