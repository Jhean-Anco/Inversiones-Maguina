import { solicitarApi } from "./api-cliente";

export type TipoCuentaFinanciera = "EFECTIVO" | "BANCO" | "BILLETERA" | "TARJETA";
export type EstadoSaldoCuenta = "SIN_CONCILIAR" | "MONEDA_NO_COMPATIBLE" | "DIVISA_NO_COMPATIBLE" | "MOVIMIENTOS_SIN_CUENTA" | "CONCILIADO";
export type CuentaFinanciera = {
  id: string; tipo: TipoCuentaFinanciera; nombre: string; entidad: string | null; titular: string | null; identificador?: string | null;
  moneda: "PEN" | "USD" | "EUR"; numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null;
  telefono: string | null; observacion: string | null; activa: boolean; ingresosMes?: string; egresosMes?: string; netoMes?: string;
  saldoInicial?: string | null; fechaSaldoInicial?: string | null; saldoActual?: string | null; saldoEstado?: EstadoSaldoCuenta; saldoMensaje?: string;
};
export type DatosCuentaFinanciera = Omit<CuentaFinanciera, "id" | "activa" | "ingresosMes" | "egresosMes" | "netoMes" | "saldoActual" | "saldoEstado" | "saldoMensaje"> & { saldoInicial: string | null; fechaSaldoInicial: string | null };
export type PeriodoFlujoFinanciero = "DIA" | "SEMANA" | "MES";
export type FlujoFinanciero = {
  periodo: PeriodoFlujoFinanciero; desde: string; hasta: string; monedas: CuentaFinanciera["moneda"][];
  items: Array<{ moneda: CuentaFinanciera["moneda"]; fecha: string; ingresos: string; egresos: string; neto: string }>;
};
/** Dinero cobrado y pagado en un rango, por concepto y moneda. */
export type ComposicionCaja = {
  desde: string; hasta: string; monedas: CuentaFinanciera["moneda"][];
  items: Array<{ moneda: CuentaFinanciera["moneda"]; sentido: "INGRESO" | "EGRESO"; concepto: string; importe: string }>;
};

export const servicioFinanzas = {
  resumen: () => solicitarApi<{ periodo: string; items: CuentaFinanciera[] }>("/finanzas/cuentas/resumen"),
  flujo: (periodo: PeriodoFlujoFinanciero) => solicitarApi<FlujoFinanciero>(`/finanzas/cuentas/flujo?periodo=${periodo}`),
  composicion: (desde: string, hasta: string) => solicitarApi<ComposicionCaja>(`/finanzas/cuentas/composicion?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`),
  listar: () => solicitarApi<CuentaFinanciera[]>("/finanzas/cuentas"),
  opciones: () => solicitarApi<Array<Pick<CuentaFinanciera, "id" | "tipo" | "nombre" | "entidad" | "moneda" | "activa" | "numeroTarjeta">>>("/finanzas/cuentas/opciones"),
  crear: (datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>("/finanzas/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  cambiarEstado: (id: string, activa: boolean) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activa }) }),
};
