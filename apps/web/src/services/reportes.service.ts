import { solicitarApi } from "./api-cliente";

export type FiltroReporte = { desde: string; hasta: string };
export type FlujoIngresosDashboard = {
  rango: FiltroReporte;
  flujoPorComprobante: Array<{ fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; ventas: number; total: string }>;
  flujoPorConcepto: Array<{ fecha: string; tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; total: string }>;
  flujoPorNotaDebito: Array<{ fecha: string; total: string }>;
  flujoPorAdelanto: Array<{ fecha: string; total: string }>;
};
/** Ingreso total por día; solo trae los días con movimiento. */
export type ComparativoIngresos = { rango: FiltroReporte; dias: Array<{ fecha: string; total: string }> };
/** Ventas sin IGV por tipo y categoría. `costo` y `ventaConCosto` vienen en null si el usuario no puede ver costos. */
export type Rentabilidad = {
  rango: FiltroReporte;
  filas: Array<{ tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; categoria: string | null; venta: string; ventaConCosto: string | null; costo: string | null }>;
};
/** Ventas por día de la semana (1 = lunes … 7 = domingo) y hora, en hora de Perú. */
export type HorariosVentas = {
  rango: FiltroReporte;
  ventasVigentes: number;
  /** Ventas registradas el mismo día de su emisión: las únicas cuya hora es confiable. */
  ventasConsideradas: number;
  celdas: Array<{ dia: number; hora: number; operaciones: number; total: string }>;
};
/** Artículos más vendidos de un rango y el total de ventas (con IGV) de ese mismo rango. */
export type ArticulosMasVendidos = { rango: FiltroReporte; totalVentas: string; articulos: Array<{ descripcion: string; tipo: string; cantidad: string; total: string }> };
export type IndicadorMeta = "VENTAS_MES" | "COBRANZA" | "MARGEN";
export type MetasDashboard = { periodo: string; metas: Record<IndicadorMeta, { valor: number; origen: "MES" | "PREDETERMINADA" } | null> };
/** Lo vendido en un rango (con IGV) y lo que ya se cobró de esas ventas. */
export type CobranzaPeriodo = { rango: FiltroReporte; facturado: string; cobrado: string };
export type ResumenIngresosDashboard = { porMedioPago: Array<{ medioPago: string; ventas: number; total: string }> };
export type ReporteInventario = {
  rango: FiltroReporte;
  resumen: { productos: number; productosConStock: number; sinStock: number; productosConMovimiento: number };
  items: Array<{ id: string; codigo: string; nombre: string; marca: string; categoria: string | null; unidad: string; stockActual: string; entradasPeriodo: string; salidasPeriodo: string; precioPromedioCompra: string; precioPromedioVenta: string }>;
  mototaxis?: { resumen: { modelos: number; modelosConStock: number; sinStock: number; modelosConMovimiento: number }; items: Array<{ id: string; codigo: string; nombre: string; marca: string; stockActual: number; entradasPeriodo: number; salidasPeriodo: number; precioPromedioCompra: string; precioPromedioVenta: string }> };
};

const parametros = ({ desde, hasta }: FiltroReporte) => new URLSearchParams({ desde, hasta }).toString();
export const servicioReportes = {
  ingresosDashboard: (rangos: { mes: FiltroReporte; anual: FiltroReporte }) => {
    const query = new URLSearchParams({ desde: rangos.anual.desde, hasta: rangos.anual.hasta, mesDesde: rangos.mes.desde });
    return solicitarApi<{
      mes: ResumenIngresosDashboard;
      anual: FlujoIngresosDashboard;
    }>(`/reportes/ingresos/dashboard?${query.toString()}`);
  },
  ingresosComparativo: (rango: FiltroReporte) => solicitarApi<ComparativoIngresos>("/reportes/ingresos/comparativo?" + parametros(rango)),
  rentabilidad: (rango: FiltroReporte) => solicitarApi<Rentabilidad>("/reportes/ingresos/rentabilidad?" + parametros(rango)),
  articulos: (rango: FiltroReporte) => solicitarApi<ArticulosMasVendidos>("/reportes/ingresos/articulos?" + parametros(rango)),
  horarios: (rango: FiltroReporte) => solicitarApi<HorariosVentas>("/reportes/ingresos/horarios?" + parametros(rango)),
  cobranza: (rango: FiltroReporte) => solicitarApi<CobranzaPeriodo>("/reportes/ingresos/cobranza?" + parametros(rango)),
  metas: (periodo: string) => solicitarApi<MetasDashboard>(`/reportes/metas?periodo=${encodeURIComponent(periodo)}`),
  /** `valor: null` quita la meta; `periodoMeta: null` la define para todos los meses. Devuelve las metas vigentes de `periodoVista`. */
  guardarMeta: (datos: { indicador: IndicadorMeta; periodo: string | null; valor: number | null }, periodoVista: string) =>
    solicitarApi<MetasDashboard>(`/reportes/metas?periodo=${encodeURIComponent(periodoVista)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  inventario: (filtro: FiltroReporte) => solicitarApi<ReporteInventario>("/reportes/inventario?" + parametros(filtro)),
};
