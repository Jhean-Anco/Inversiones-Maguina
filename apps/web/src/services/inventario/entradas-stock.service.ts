import { solicitarApi } from "../api-cliente";

export type LineaDocumentoCompra = {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  costoUnitario: string;
  descuento: string;
  subtotal: string;
  total: string;
};

export type ProductoParaCompra = {
  productoId: string;
  codigoInterno: string;
  nombre: string;
  marca: string;
  presentacionId: string;
  presentacion: string;
  unidadMedidaCodigo: string;
  unidadMedida: string;
  factorAUnidadBase: string;
};

export type DetalleEntradaStock = {
  id: string;
  productoId: string;
  presentacionId: string;
  detalleDocumentoId?: string | null;
  codigoProducto: string;
  nombreProducto: string;
  presentacion: string;
  unidadMedidaCodigo: string;
  cantidad: string;
  factorAUnidadBase: string;
  cantidadBase: string;
  costoUnitario: string;
  subtotal: string;
};

export type EntradaStock = {
  id: string;
  codigo: string;
  fecha: string;
  tipoDocumento: string;
  numeroDocumento: string | null;
  proveedor: string | null;
  proveedorTipoPersona: string | null;
  proveedorTipoDocumento: string | null;
  proveedorNumeroDocumento: string | null;
  proveedorDireccion: string | null;
  medioPago?: string | null;
  montoPagado?: string | null;
  observacion?: string | null;
  total: string;
  totalDocumento?: string | null;
  evidenciaNombre?: string | null;
  cantidadProductos?: number;
  creadoEn: string;
  detalles?: DetalleEntradaStock[];
  detallesDocumento?: Array<Omit<LineaDocumentoCompra, "codigo" | "unidad"> & { id: string; orden: number; codigo: string | null; unidad: string | null }>;
};

export type PaginaEntradasStock = { items: EntradaStock[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type DatosEntradaStock = {
  fecha: string;
  tipoDocumento: string;
  numeroDocumento: string;
  proveedor: string;
  proveedorTipoPersona: string;
  proveedorTipoDocumento: string;
  proveedorNumeroDocumento: string;
  proveedorDireccion: string;
  medioPago: string | null;
  montoPagado: string;
  totalDocumento: string | null;
  detallesDocumento: Array<LineaDocumentoCompra & { clave: string }>;
  observacion: string;
  detalles: Array<{ productoId: string; presentacionId: string; cantidad: string; costoUnitario: string }>;
};

export const servicioEntradasStock = {
  listar(pagina: number, porPagina: number, busqueda: string) {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaEntradasStock>(`/inventario/entradas-stock?${parametros.toString()}`);
  },
  consultar: (id: string) => solicitarApi<EntradaStock>(`/inventario/entradas-stock/${id}`),
  buscarProductos: (busqueda: string) => solicitarApi<ProductoParaCompra[]>(`/inventario/entradas-stock/productos?busqueda=${encodeURIComponent(busqueda)}`),
  crear: (datos: DatosEntradaStock) => solicitarApi<EntradaStock>("/inventario/entradas-stock", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  }),
  subirEvidencia: async (id: string, archivo: File) => {
    const datos = new FormData(); datos.append("archivo", archivo);
    return solicitarApi<{ evidenciaNombre: string }>(`/inventario/entradas-stock/${id}/evidencia`, { method: "POST", body: datos });
  },
};
