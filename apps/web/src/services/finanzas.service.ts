import { solicitarApi } from "./api-cliente";

export type TipoCuentaFinanciera = "EFECTIVO" | "BANCO" | "BILLETERA" | "TARJETA";
export type CuentaFinanciera = {
  id: string; tipo: TipoCuentaFinanciera; nombre: string; entidad: string | null; titular: string | null;
  moneda: "PEN" | "USD" | "EUR"; numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null;
  telefono: string | null; observacion: string | null; activa: boolean; ingresosMes?: string; egresosMes?: string; netoMes?: string;
};
export type DatosCuentaFinanciera = Omit<CuentaFinanciera, "id" | "activa" | "ingresosMes" | "egresosMes" | "netoMes">;

export const servicioFinanzas = {
  resumen: () => solicitarApi<{ periodo: string; items: CuentaFinanciera[] }>("/finanzas/cuentas/resumen"),
  listar: () => solicitarApi<CuentaFinanciera[]>("/finanzas/cuentas"),
  opciones: () => solicitarApi<Array<Pick<CuentaFinanciera, "id" | "tipo" | "nombre" | "entidad" | "moneda" | "activa" | "numeroTarjeta">>>("/finanzas/cuentas/opciones"),
  crear: (datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>("/finanzas/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: DatosCuentaFinanciera) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
  cambiarEstado: (id: string, activa: boolean) => solicitarApi<CuentaFinanciera>(`/finanzas/cuentas/${encodeURIComponent(id)}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activa }) }),
};
