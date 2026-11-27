import type { CuentaFinanciera, DatosCuentaFinanciera, TipoCuentaFinanciera } from "../../services/finanzas.service";

export const tiposCuenta: Array<{ valor: TipoCuentaFinanciera; nombre: string }> = [
  { valor: "EFECTIVO", nombre: "Caja / efectivo" },
  { valor: "BANCO", nombre: "Cuenta bancaria" },
  { valor: "BILLETERA", nombre: "Billetera digital" },
  { valor: "TARJETA", nombre: "Tarjeta" },
];

export const moneda = (valor: string | number, codigo: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(Number(valor) || 0);
export const cantidad = (valor: number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(valor);
export const fechaLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
export const etiquetaTipo = (tipo: TipoCuentaFinanciera) => tiposCuenta.find((item) => item.valor === tipo)?.nombre ?? tipo;

export const identificadorCuenta = (cuenta: CuentaFinanciera) => {
  if (cuenta.identificador !== undefined) return cuenta.identificador || "—";
  const valor = cuenta.numeroCuenta || cuenta.cci || cuenta.telefono || cuenta.numeroTarjeta;
  if (!valor) return "—";
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 4 ? `•••• ${digitos.slice(-4)}` : valor;
};

export const saldoConciliado = (cuenta: CuentaFinanciera) => cuenta.saldoEstado === "CONCILIADO" && cuenta.saldoActual !== null && cuenta.saldoActual !== undefined;

export const cuentaVacia = (): DatosCuentaFinanciera => ({ tipo: "EFECTIVO", nombre: "", entidad: "", titular: "", moneda: "PEN", saldoInicial: "", fechaSaldoInicial: "", numeroCuenta: "", cci: "", numeroTarjeta: "", telefono: "", observacion: "" });

export const datosDeCuenta = (cuenta: CuentaFinanciera): DatosCuentaFinanciera => ({ tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad ?? "", titular: cuenta.titular ?? "", moneda: cuenta.moneda, saldoInicial: cuenta.saldoInicial ?? "", fechaSaldoInicial: cuenta.fechaSaldoInicial ?? "", numeroCuenta: cuenta.numeroCuenta ?? "", cci: cuenta.cci ?? "", numeroTarjeta: cuenta.numeroTarjeta ?? "", telefono: cuenta.telefono ?? "", observacion: cuenta.observacion ?? "" });
