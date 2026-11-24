import { solicitarApi } from "./api-cliente";

export type MarcaMototaxi = { id: string; nombre: string; activo: boolean };
export type ModeloMototaxi = {
  id: string; codigo: string; marcaId: string; marca: string; nombre: string; version: string | null; precioVenta: string | null; stockDisponible: number; precioProgramado: string | null; precioProgramadoDesde: string | null; categoriaVehicular: string;
  fabricante: string | null; paisFabricacion: string | null; marcaMotor: string | null; modeloMotor: string | null; tipoMototaxi: string | null; tipoMotor: string | null; tipoRefrigeracion: string | null; coloresDisponibles: string[]; cilindradaCc: number | null;
  combustible: string | null; transmision: string | null; carroceria: string | null; capacidadAsientos: number | null; capacidadCargaKg: string | null;
  especificacionesAdicionales: string | null; activo: boolean;
};
export type AnalisisModeloMototaxi = {
  modelo: ModeloMototaxi;
  existencias: { disponibles: number };
  movimientos: { id: string; tipo: string; cantidadAnterior: number; cantidadFinal: number; fecha: string; usuario: string }[];
  compras: { unidades: number; operaciones: number; ultimoPrecio: string | null; promedioPonderado: string | null; ultima: { precio: string; cantidad: number; fecha: string; codigo: string; documentoTipo: string; documentoNumero: string | null; proveedor: string } | null; historialMensual: Array<{ mes: string; promedio: string; cantidad: string }> };
  ventas: { unidades: number; operaciones: number; ultimoPrecio: string | null; promedioPonderado: string | null; ultima: { precio: string; fecha: string; codigo: string; tipoComprobante: string; cliente: string | null } | null; historialMensual: Array<{ mes: string; promedio: string; cantidad: string }> };
};

const HEX_COLOR_MOTOTAXI = /\s+\((#[\da-f]{6})\)$/i;
export const COLORES_RAPIDOS_MOTOTAXI = ["Negro", "Blanco", "Rojo", "Azul", "Verde", "Amarillo", "Gris", "Plata", "Celeste", "Naranja"];
export const COLORES_ADICIONALES_MOTOTAXI = ["Guinda", "Marrón", "Azul marino", "Azul noche", "Celeste claro", "Turquesa", "Verde oscuro", "Verde olivo", "Rojo vino", "Granate", "Naranja claro", "Amarillo dorado", "Beige", "Crema"];
export const COLORES_SUGERIDOS_MOTOTAXI = [...COLORES_RAPIDOS_MOTOTAXI, ...COLORES_ADICIONALES_MOTOTAXI];
const COLORES_BASE_MOTOTAXI: Record<string, string> = {
  negro: "#252b31", blanco: "#ffffff", rojo: "#d62828", azul: "#2563eb", verde: "#27834a",
  amarillo: "#f2c331", gris: "#75808b", plata: "#c2c9d0", celeste: "#59aeca", guinda: "#7b2638",
  naranja: "#e87924", marrón: "#805a3b", "azul marino": "#15395b", "azul noche": "#182848",
  "celeste claro": "#8ed2e3", turquesa: "#36b4a5", "verde oscuro": "#1f5e3b", "verde olivo": "#78833a",
  "rojo vino": "#722f37", granate: "#800020", "naranja claro": "#f39a3d", "amarillo dorado": "#d9a629",
  beige: "#d7c3a1", crema: "#f4e9ca",
};

export function etiquetaColorMototaxi(color: string | null | undefined) {
  return (color ?? "").replace(HEX_COLOR_MOTOTAXI, "").trim();
}

export function hexColorMototaxi(color: string | null | undefined) {
  const valor = color ?? "";
  const hexadecimal = valor.match(HEX_COLOR_MOTOTAXI)?.[1];
  if (hexadecimal) return hexadecimal.toUpperCase();
  return COLORES_BASE_MOTOTAXI[etiquetaColorMototaxi(valor).toLocaleLowerCase("es-PE")] ?? "#8794a0";
}

export type ProveedorMototaxi = { id: string; nombre: string; razonSocial: string | null; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; tipoDocumento: string; numeroDocumento: string };
export type UnidadMototaxi = {
  id: string; codigo: string; modeloId: string; marca: string; modelo: string; version: string | null; precioVenta: string | null; vin: string; numeroMotor: string;
  numeroChasis: string | null; anioModelo: number | null; color: string | null; placa: string | null; estado: string; costoAdquisicion: string; compraDetalleId: string | null;
};
export type PaginaUnidadesMototaxi = { items: UnidadMototaxi[]; total: number; pagina: number; porPagina: number; totalPaginas: number; disponiblesPorColor: Array<{ modeloId: string; marca: string; modelo: string; color: string | null; cantidad: number }> };
export type GarantiaMototaxi = { id: string; modeloId: string; unidadId: string | null; compraDetalleId: string | null; cantidad: number; version: string | null; codigo: string; vin: string | null; marca: string; modelo: string; proveedor: string; porcentajeProveedor: string; mesesVigencia: number; iniciaEn: string; terminaEn: string; alcance: string | null; exclusiones: string | null };
export type GarantiaModeloMototaxi = { id: string; modeloId: string; activa: boolean; mesesVigencia: number; alcance: string; exclusiones: string | null };
export type GarantiaVentaMototaxi = { id: string; iniciaEn: string; terminaEn: string; mesesVigencia: number; cantidad: number; alcance: string; exclusiones: string | null };
export type ReclamoGarantia = { id: string; garantiaId: string; ingresoDetalleId?: string | null; ventaCodigo?: string | null; ventaCliente?: string | null; ventaMototaxi?: string | null; fecha: string; descripcionFalla: string; costoTotal: string; porcentajeProveedorAplicado: string; importeProveedor: string; importeEmpresa: string; estado: string; resolucion: string | null };
export type CompraMototaxi = { id: string; codigo: string; fecha: string; documentoTipo: string; documentoNumero: string | null; moneda: string; total: string; proveedor: string; unidades: number; pagado: string; saldo: string; observacion: string | null };
export type PagoCompraMototaxi = { id: string; fechaPago: string; importePagado: string; medioPago: string; cuentaFinancieraId: string | null; creadoEn: string };
export type ReconteoModeloMototaxi = { modelo: { id: string; marca: string; nombre: string; version: string | null }; cantidadSistema: number };
export type AjusteInventarioMototaxi = { id: string; codigo: string; modeloId: string; marca: string; modelo: string; version: string | null; cantidadSistema: number; cantidadContada: number; motivo: string; observacion: string | null; creadoEn: string; usuario: string; aplicado: boolean };

export type PrecioModeloMototaxi = { id: string; precio: string; vigenteDesde: string; vigenteHasta: string | null; usuario: string | null };

export const servicioMototaxis = {
  marcas: () => solicitarApi<MarcaMototaxi[]>("/mototaxis/marcas"),
  modelos: (busqueda = "", incluirInactivos = false) => solicitarApi<ModeloMototaxi[]>(`/mototaxis/modelos?busqueda=${encodeURIComponent(busqueda)}&incluirInactivos=${incluirInactivos}`),
  crearModelo: (datos: Record<string, unknown>) => solicitarApi<ModeloMototaxi>("/mototaxis/modelos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizarModelo: (id: string, datos: Record<string, unknown>) => solicitarApi<ModeloMototaxi>(`/mototaxis/modelos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  garantiaModelo: (id: string) => solicitarApi<GarantiaModeloMototaxi | null>(`/mototaxis/modelos/${id}/garantia`),
  guardarGarantiaModelo: (id: string, datos: { activa: boolean; mesesVigencia: number; alcance: string; exclusiones: string }) => solicitarApi<GarantiaModeloMototaxi>(`/mototaxis/modelos/${id}/garantia`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  aplicarGarantiaVenta: (detalleId: string) => solicitarApi<GarantiaVentaMototaxi>(`/mototaxis/ventas/${detalleId}/garantia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
  preciosModelo: (id: string) => solicitarApi<PrecioModeloMototaxi[]>(`/mototaxis/modelos/${id}/precios`),
  corregirPrecioModelo: (id: string, precioId: string, precioVenta: string, precioAnterior: string) => solicitarApi<ModeloMototaxi>(`/mototaxis/modelos/${id}/precios/${precioId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ precioVenta, precioAnterior }),
  }),
  actualizarPrecioVentaModelo: (id: string, datos: { precioVenta: string; vigenteDesde: string; vigenteHasta: string }) => solicitarApi<ModeloMototaxi>(`/mototaxis/modelos/${id}/precio-venta`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  analisisModelo: (id: string) => solicitarApi<AnalisisModeloMototaxi>(`/mototaxis/modelos/${id}/analisis`),
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
  crearAjusteInventario: (datos: Record<string, unknown>) => solicitarApi<{ id: string; codigo: string; cantidadSistema: number; cantidadContada: number }>("/mototaxis/ajustes-inventario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  garantias: () => solicitarApi<GarantiaMototaxi[]>("/mototaxis/garantias"),
  reclamos: () => solicitarApi<ReclamoGarantia[]>("/mototaxis/reclamos"),
  crearReclamo: (datos: Record<string, unknown>) => solicitarApi<ReclamoGarantia>("/mototaxis/reclamos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  avanzarReclamo: (id: string, datos: { estado: string; estadoAnterior: string; resolucion: string }) => solicitarApi<ReclamoGarantia>(`/mototaxis/reclamos/${id}/estado`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  }),
};
