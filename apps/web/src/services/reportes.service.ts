import { solicitarApi } from "./api-cliente";

export type FiltroReporte = { desde: string; hasta: string };
export type ReporteIngresos = {
  rango: FiltroReporte;
  resumen: { ventas: number; subtotal: string; total: string; promedio: string };
  notasInternas: { notas: number; total: string; productos: number; serviciosOMototaxis: number };
  porMedioPago: Array<{ medioPago: string; ventas: number; total: string }>;
  productosMasVendidos: Array<{ descripcion: string; tipo: string; unidades: string; ventas: number; total: string }>;
  porDia: Array<{ fecha: string; ventas: number; total: string }>;
  flujoPorComprobante: Array<{ fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; ventas: number; total: string }>;
  flujoPorConcepto: Array<{ fecha: string; tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; total: string }>;
};
export type ReporteInventario = {
  rango: FiltroReporte;
  resumen: { productos: number; productosConStock: number; sinStock: number; productosConMovimiento: number };
  items: Array<{ id: string; codigo: string; nombre: string; marca: string; categoria: string | null; unidad: string; stockActual: string; entradasPeriodo: string; salidasPeriodo: string }>;
  mototaxis?: { resumen: { modelos: number; modelosConStock: number; sinStock: number; modelosConMovimiento: number }; items: Array<{ id: string; codigo: string; nombre: string; marca: string; stockActual: number; entradasPeriodo: number; salidasPeriodo: number }> };
};

const parametros = ({ desde, hasta }: FiltroReporte) => new URLSearchParams({ desde, hasta }).toString();
export const servicioReportes = {
  resumenIngresosMes: () => solicitarApi<{ desde: string; hasta: string; total: string }>("/reportes/ingresos/resumen-mes"),
  ingresos: (filtro: FiltroReporte) => solicitarApi<ReporteIngresos>("/reportes/ingresos?" + parametros(filtro)),
  ingresosDashboard: (rangos: { mes: FiltroReporte; anual: FiltroReporte }) => {
    const query = new URLSearchParams({ desde: rangos.anual.desde, hasta: rangos.anual.hasta, mesDesde: rangos.mes.desde });
    return solicitarApi<{
      mes: Pick<ReporteIngresos, "porMedioPago">;
      anual: Pick<ReporteIngresos, "rango" | "flujoPorComprobante" | "flujoPorConcepto">;
    }>(`/reportes/ingresos/dashboard?${query.toString()}`);
  },
  inventario: (filtro: FiltroReporte) => solicitarApi<ReporteInventario>("/reportes/inventario?" + parametros(filtro)),
};
