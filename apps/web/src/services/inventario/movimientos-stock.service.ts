import { solicitarApi } from "../api-cliente";

export type ProductoParaAjuste = { id: string; codigo: string; nombre: string; marca: string; unidadCodigo: string; unidad: string; cantidadActual: string };
export type MovimientoStock = {
  id: string; tipo: "ENTRADA" | "SALIDA" | "AJUSTE"; sentido: "INGRESO" | "RETIRO" | null;
  motivo: string | null; observacion: string | null; origenTipo: string; origenId: string;
  cantidadBase: string; costoUnitarioBase: string; creadoEn: string; productoId: string;
  producto: string; codigo: string; unidad: string; unidadCodigo: string; documentoOrigen: string | null;
};
export type PaginaMovimientosStock = { items: MovimientoStock[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type DatosAjusteStock = { productoId: string; sentido: "INGRESO" | "RETIRO"; cantidad: string; motivo: string; observacion: string };

export const servicioMovimientosStock = {
  listar(pagina: number, porPagina: number, busqueda: string, tipo: string) {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda, tipo });
    return solicitarApi<PaginaMovimientosStock>(`/inventario/movimientos-stock?${parametros.toString()}`);
  },
  buscarProductos(busqueda: string) {
    return solicitarApi<ProductoParaAjuste[]>(`/inventario/movimientos-stock/productos?busqueda=${encodeURIComponent(busqueda)}`);
  },
  crearAjuste(datos: DatosAjusteStock) {
    return solicitarApi<{ id: string }>("/inventario/movimientos-stock/ajustes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
};
