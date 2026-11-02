import { solicitarApi } from "./api-cliente";

export type TipoEgreso = "GASTO_OPERATIVO" | "ACTIVO_HERRAMIENTA" | "MOTOTAXI";
export type PagoEgreso = { id: string; egresoId: string; fechaPago: string; importePagado: string; medioPago: string; claveIdempotencia: string; usuarioId: string; creadoEn: string };
export type Egreso = {
  id: string; codigo: string; tipo: TipoEgreso; fecha: string; categoria: string; concepto: string;
  beneficiario: string | null; proveedorRuc: string | null; documentoTipo: string | null; documentoNumero: string | null;
  moneda: string; medioPago: string; monto: string; identificadorActivo: string | null;
  mototaxiMarca: string | null; mototaxiModelo: string | null; mototaxiNumeroMotor: string | null; mototaxiNumeroChasis: string | null;
  observacion: string | null;
  pagos: PagoEgreso[]; importePagadoAcumulado: string; saldoPendiente: string; creadoEn: string;
};
export type PaginaEgresos = { items: Egreso[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type DatosEgreso = {
  tipo: TipoEgreso; fecha: string; categoria: string; concepto: string; beneficiario: string | null;
  proveedorRuc: string | null; documentoTipo: string | null; documentoNumero: string | null;
  moneda: "PEN"; medioPago: string; monto: string; importePagoInicial: string;
  identificadorActivo: string | null; mototaxiMarca: string | null; mototaxiModelo: string | null;
  mototaxiNumeroMotor: string | null; mototaxiNumeroChasis: string | null; observacion: string | null;
};

export const servicioEgresos = {
  listar(tipo: TipoEgreso, pagina: number, porPagina: number, busqueda: string, contextoInventario = false) {
    const parametros = new URLSearchParams({ tipo, pagina: String(pagina), porPagina: String(porPagina), busqueda });
    const ruta = contextoInventario && tipo === "MOTOTAXI" ? "/inventario/mototaxis" : "/egresos";
    return solicitarApi<PaginaEgresos>(`${ruta}?${parametros.toString()}`);
  },
  crear(datos: DatosEgreso, contextoInventario = false) {
    const ruta = contextoInventario && datos.tipo === "MOTOTAXI" ? "/inventario/mototaxis" : "/egresos";
    return solicitarApi<Egreso>(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  registrarPago(id: string, datos: { fechaPago: string; importePagado: string; medioPago: string; claveIdempotencia: string }, contextoInventario = false) {
    const ruta = contextoInventario ? `/inventario/mototaxis/${encodeURIComponent(id)}/pagos` : `/egresos/${encodeURIComponent(id)}/pagos`;
    return solicitarApi<PagoEgreso>(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
};
