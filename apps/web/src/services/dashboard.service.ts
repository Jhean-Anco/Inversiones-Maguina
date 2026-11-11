import { solicitarApi } from "./api-cliente";

export type ResumenGerencial = {
  generadoPara: string;
  ventasHoy?: { operaciones: number; total: string };
  ventasMes?: { operaciones: number; total: string; igv?: string };
  notasInternas?: { hoy: { operaciones: number; total: string }; mes: { operaciones: number; total: string }; recientes: Array<{ id: string; codigo: string; fecha: string; cliente: string; medioPago: string; total: string }> };
  clientesActivos?: number;
  inventario?: { productosActivos: number; productosSinStock: number };
  inventarioMototaxis?: { unidades: number; porEstado: Array<{ estado: string; unidades: number; costoAdquisicion: string }>; reclamosGarantia: { cantidad: number; proveedor: string; empresa: string } };
  ventasUltimosSieteDias?: Array<{ fecha: string; operaciones: number; total: string }>;
  ventasPorMedioPago?: Array<{ medioPago: string; operaciones: number; total: string }>;
  ventasRecientes?: Array<{ id: string; codigo: string; fecha: string; cliente: string; medioPago: string; estado: string; total: string }>;
  principalesArticulos?: Array<{ descripcion: string; tipo: string; cantidad: string; total: string }>;
};

export const servicioDashboard = {
  resumen: () => solicitarApi<ResumenGerencial>("/reportes/resumen"),
};
