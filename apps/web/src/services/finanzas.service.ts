import { solicitarApi } from "./api-cliente";

export type TipoCuentaFinanciera = "EFECTIVO" | "BANCO" | "BILLETERA" | "TARJETA";
export type CuentaFinanciera = {
  id: string; tipo: TipoCuentaFinanciera; nombre: string; entidad: string | null; titular: string | null;
  moneda: "PEN" | "USD" | "EUR"; numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null;
  telefono: string | null; observacion: string | null; activa: boolean; ingresosMes?: string; egresosMes?: string; netoMes?: string;
};
export type DatosCuentaFinanciera = Omit<CuentaFinanciera, "id" | "activa" | "ingresosMes" | "egresosMes" | "netoMes">;
export type PeriodoMovimientosCuenta = "DIA" | "MES" | "ANIO";
export type MovimientosCuentas = {
  periodo: PeriodoMovimientosCuenta; fecha: string; desde: string; hasta: string;
  totales: { ingresos: string; egresos: string; neto: string };
  items: Array<{ id: string; nombre: string; tipo: TipoCuentaFinanciera; moneda: CuentaFinanciera["moneda"]; activa: boolean; ingresos: string; egresos: string; neto: string }>;
};

export const servicioFinanzas = {
  resumen: () => solicitarApi<{ periodo: string; items: CuentaFinanciera[] }>("/finanzas/cuentas/resumen"),
  movimientos: (periodo: PeriodoMovimientosCuenta, fecha: string) => solicitarApi<MovimientosCuentas>(`/finanzas/cuentas/movimientos?periodo=${periodo}&fecha=${encodeURIComponent(fecha)}`),
  listar: () => solicitarApi<CuentaFinanciera[]>("/finanzas/cuentas"),
  opciones: () => solicitarApi<Array<Pick<CuentaFinanciera, "id" | "tipo" | "nombre" | "entidad" | "moneda" | "activa" | "numeroTarjeta">>>("/finanzas/cuentas/opciones"),
  crear: (datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>("/finanzas/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  cambiarEstado: (id: string, activa: boolean) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activa }) }),
};
