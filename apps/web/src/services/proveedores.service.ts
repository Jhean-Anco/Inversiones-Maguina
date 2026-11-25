import { solicitarApi } from "./api-cliente";

export type ProveedorRegistrado = { id: string; nombre: string; nombreComercial?: string | null; razonSocial: string | null; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; tipoDocumento: string; numeroDocumento: string };
export type PaginaProveedores = { items: ProveedorRegistrado[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type FichaProveedor = { proveedor: ProveedorRegistrado; permisosCompras: { repuestos: boolean; mototaxis: boolean }; resumenCompras: Array<{ moneda: string; compras: number; totalComprado: string; saldoPendiente: string }>; compras: Array<{ id: string; codigo: string; fecha: string; total: string; moneda: string; origen: "REPUESTOS" | "MOTOTAXIS"; estadoPago: "PAGADA" | "SIN_PAGO" | "SALDO_PENDIENTE" }> };
export type DatosProveedorNuevo = { tipoDocumento: "DNI" | "RUC"; numeroDocumento: string; razonSocial?: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; nombreComercial?: string };

export const servicioProveedores = {
  listar: (busqueda = "") => solicitarApi<ProveedorRegistrado[]>(`/personas/proveedores?busqueda=${encodeURIComponent(busqueda)}`),
  listarPaginado: (pagina: number, porPagina: number, busqueda = "") => {
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaProveedores>(`/personas/proveedores/listado?${consulta}`);
  },
  ficha: (id: string) => solicitarApi<FichaProveedor>(`/personas/proveedores/${encodeURIComponent(id)}/ficha`),
  crear: (datos: DatosProveedorNuevo) => solicitarApi<ProveedorRegistrado>("/personas/proveedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
};
