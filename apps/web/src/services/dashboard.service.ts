import { solicitarApi } from "./api-cliente";

export type ResumenGerencial = {
  generadoPara: string;
  ventasHoy: { operaciones: number; total: string };
  ventasMes: { operaciones: number; total: string; igv: string };
  clientesActivos: number;
  inventario: { productosActivos: number; productosSinStock: number };
  ventasUltimosSieteDias: Array<{ fecha: string; operaciones: number; total: string }>;
  ventasPorMedioPago: Array<{ medioPago: string; operaciones: number; total: string }>;
  ventasRecientes: Array<{ id: string; codigo: string; fecha: string; cliente: string; medioPago: string; estado: string; total: string }>;
  principalesArticulos: Array<{ descripcion: string; tipo: string; cantidad: string; total: string }>;
};

export const servicioDashboard = {
  resumen: () => solicitarApi<ResumenGerencial>("/reportes/resumen"),
};
