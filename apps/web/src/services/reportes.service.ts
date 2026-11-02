import { solicitarApi } from "./api-cliente";

export type FiltroReporte = { desde: string; hasta: string };
export type ReporteIngresos = {
  rango: FiltroReporte;
  resumen: { ventas: number; subtotal: string; total: string; promedio: string };
  porMedioPago: Array<{ medioPago: string; ventas: number; total: string }>;
  productosMasVendidos: Array<{ descripcion: string; tipo: string; unidades: string; ventas: number; total: string }>;
  porDia: Array<{ fecha: string; ventas: number; total: string }>;
};
export type ReporteInventario = {
  rango: FiltroReporte;
  resumen: { productos: number; productosConStock: number; sinStock: number; productosConMovimiento: number };
  items: Array<{ id: string; codigo: string; nombre: string; marca: string; categoria: string | null; unidad: string; stockActual: string; entradasPeriodo: string; salidasPeriodo: string }>;
};

const parametros = ({ desde, hasta }: FiltroReporte) => new URLSearchParams({ desde, hasta }).toString();
export const servicioReportes = {
  ingresos: (filtro: FiltroReporte) => solicitarApi<ReporteIngresos>("/reportes/ingresos?" + parametros(filtro)),
  inventario: (filtro: FiltroReporte) => solicitarApi<ReporteInventario>("/reportes/inventario?" + parametros(filtro)),
};
