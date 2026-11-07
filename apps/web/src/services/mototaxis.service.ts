import { solicitarApi } from "./api-cliente";

export type MarcaMototaxi = { id: string; nombre: string; activo: boolean };
export type ModeloMototaxi = {
  id: string; codigo: string; marcaId: string; marca: string; nombre: string; version: string | null; precioVenta: string | null; categoriaVehicular: string;
  fabricante: string | null; paisFabricacion: string | null; marcaMotor: string | null; modeloMotor: string | null; cilindradaCc: number | null;
  combustible: string | null; transmision: string | null; carroceria: string | null; capacidadAsientos: number | null; capacidadCargaKg: string | null;
  especificacionesAdicionales: string | null; activo: boolean;
};
export type ProveedorMototaxi = { id: string; nombre: string; razonSocial: string | null; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; tipoDocumento: string; numeroDocumento: string };
export type UnidadMototaxi = {
  id: string; codigo: string; modeloId: string; marca: string; modelo: string; version: string | null; precioVenta: string | null; vin: string; numeroMotor: string;
  numeroChasis: string | null; anioModelo: number | null; color: string | null; placa: string | null; estado: string; costoAdquisicion: string; compraDetalleId: string | null;
  imagenes?: { id: string; archivoId: string; ruta: string; orden: number }[];
};
export type PaginaUnidadesMototaxi = { items: UnidadMototaxi[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type GarantiaMototaxi = { id: string; unidadId: string; codigo: string; vin: string | null; marca: string; modelo: string; proveedor: string; porcentajeProveedor: string; mesesVigencia: number; iniciaEn: string; terminaEn: string; alcance: string | null; exclusiones: string | null };
export type ReclamoGarantia = { id: string; garantiaId: string; fecha: string; descripcionFalla: string; costoTotal: string; porcentajeProveedorAplicado: string; importeProveedor: string; importeEmpresa: string; estado: string; resolucion: string | null };
export type CompraMototaxi = { id: string; codigo: string; fecha: string; documentoTipo: string; documentoNumero: string | null; moneda: string; total: string; proveedor: string; unidades: number; pagado: string; saldo: string; observacion: string | null };
export type PagoCompraMototaxi = { id: string; fechaPago: string; importePagado: string; medioPago: string; cuentaFinancieraId: string | null; creadoEn: string };
export type UnidadReconteoMototaxi = { id: string; codigo: string; vin: string; numeroMotor: string; numeroChasis: string | null; estado: string };
export type ReconteoModeloMototaxi = { modelo: { id: string; marca: string; nombre: string; version: string | null }; cantidadSistema: number; unidades: UnidadReconteoMototaxi[] };
export type AjusteInventarioMototaxi = { id: string; codigo: string; modeloId: string; marca: string; modelo: string; version: string | null; cantidadSistema: number; cantidadContada: number; motivo: string; observacion: string | null; creadoEn: string; diferencias: Array<{ tipo: "NUEVA" | "FALTANTE" | "RECUPERADA"; codigo: string; vin: string; numeroMotor: string }> };

export const servicioMototaxis = {
  marcas: () => solicitarApi<MarcaMototaxi[]>("/mototaxis/marcas"),
  modelos: (busqueda = "", incluirInactivos = false) => solicitarApi<ModeloMototaxi[]>(`/mototaxis/modelos?busqueda=${encodeURIComponent(busqueda)}&incluirInactivos=${incluirInactivos}`),
  crearModelo: (datos: Record<string, unknown>) => solicitarApi<ModeloMototaxi>("/mototaxis/modelos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizarModelo: (id: string, datos: Record<string, unknown>) => solicitarApi<ModeloMototaxi>(`/mototaxis/modelos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  proveedores: (busqueda = "") => solicitarApi<ProveedorMototaxi[]>(`/mototaxis/proveedores?busqueda=${encodeURIComponent(busqueda)}`),
  crearProveedor: (datos: Record<string, unknown>) => solicitarApi<ProveedorMototaxi>("/mototaxis/proveedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  unidades: (filtros: { busqueda?: string; estado?: string; pagina?: number; porPagina?: number } = {}) => {
    const p = new URLSearchParams({ busqueda: filtros.busqueda ?? "", estado: filtros.estado ?? "TODOS", pagina: String(filtros.pagina ?? 1), porPagina: String(filtros.porPagina ?? 24) });
    return solicitarApi<PaginaUnidadesMototaxi>(`/mototaxis/unidades?${p}`);
  },
  comprar: (datos: Record<string, unknown>) => solicitarApi<{ id: string; codigo: string; fecha: string; total: string; unidades: number; importePagado: string; saldoPendiente: string }>("/mototaxis/compras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  compras: (busqueda = "") => solicitarApi<CompraMototaxi[]>(`/mototaxis/compras?busqueda=${encodeURIComponent(busqueda)}`),
  pagosCompra: (id: string) => solicitarApi<PagoCompraMototaxi[]>(`/mototaxis/compras/${id}/pagos`),
  aplicarPagoCompra: (id: string, datos: Record<string, unknown>) => solicitarApi<PagoCompraMototaxi>(`/mototaxis/compras/${id}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  cambiarEstado: (id: string, datos: { estado: string; motivo: string; observacion?: string }) => solicitarApi<UnidadMototaxi>(`/mototaxis/unidades/${id}/estado`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  ajustesInventario: () => solicitarApi<AjusteInventarioMototaxi[]>("/mototaxis/ajustes-inventario"),
  reconteoModelo: (modeloId: string) => solicitarApi<ReconteoModeloMototaxi>(`/mototaxis/ajustes-inventario/${encodeURIComponent(modeloId)}/reconteo`),
  crearAjusteInventario: (datos: Record<string, unknown>) => solicitarApi<{ id: string; codigo: string; cantidadSistema: number; cantidadContada: number; nuevas: number; faltantes: number; recuperadas: number }>("/mototaxis/ajustes-inventario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  subirImagenUnidad: (id: string, archivo: File) => { const formulario = new FormData(); formulario.append("archivo", archivo, archivo.name); return solicitarApi<{ id: string; archivoId: string; orden: number; ruta: string }>(`/mototaxis/unidades/${id}/imagenes`, { method: "POST", body: formulario }); },
  eliminarImagenUnidad: (id: string, idImagen: string) => solicitarApi<{ eliminado: boolean }>(`/mototaxis/unidades/${id}/imagenes/${idImagen}`, { method: "DELETE" }),
  garantias: () => solicitarApi<GarantiaMototaxi[]>("/mototaxis/garantias"),
  reclamos: () => solicitarApi<ReclamoGarantia[]>("/mototaxis/reclamos"),
  crearReclamo: (datos: Record<string, unknown>) => solicitarApi<ReclamoGarantia>("/mototaxis/reclamos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
};
