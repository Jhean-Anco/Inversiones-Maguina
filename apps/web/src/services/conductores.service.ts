import { solicitarApi } from "./api-cliente";

export type Conductor = { id: string; tipoDocumento: "DNI" | "CE" | "PASAPORTE"; numeroDocumento: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string | null; numeroLicencia: string; telefono: string | null };
export type PaginaConductores = { items: Conductor[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type DatosConductor = Pick<Conductor, "tipoDocumento" | "numeroDocumento" | "nombres" | "apellidoPaterno" | "numeroLicencia"> & { apellidoMaterno?: string; telefono?: string };

export const servicioConductores = {
  listar: (busqueda = "") => solicitarApi<Conductor[]>(`/personas/conductores?busqueda=${encodeURIComponent(busqueda)}`),
  listarPaginado: (pagina: number, porPagina: number, busqueda = "") => {
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaConductores>(`/personas/conductores/listado?${consulta}`);
  },
  crear: (datos: DatosConductor) => solicitarApi<Conductor>("/personas/conductores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: { numeroLicencia: string; telefono: string }) => solicitarApi<Pick<Conductor, "id" | "numeroLicencia" | "telefono">>(`/personas/conductores/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  }),
};
