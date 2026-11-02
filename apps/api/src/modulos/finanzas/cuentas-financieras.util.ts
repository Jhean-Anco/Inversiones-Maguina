import { BadRequestException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db, cuentasFinancieras } from "@magina/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const medioPorTipo = { EFECTIVO: "EFECTIVO", BANCO: "TRANSFERENCIA", BILLETERA: "BILLETERA_DIGITAL", TARJETA: "TARJETA" } as const;

export async function validarCuentaFinanciera(idEntrada: unknown, medioEntrada: unknown, requerido: boolean) {
  if (idEntrada === undefined || idEntrada === null || idEntrada === "") {
    if (requerido) throw new BadRequestException("Selecciona la cuenta o caja donde se registrará el movimiento.");
    return null;
  }
  if (typeof idEntrada !== "string" || !UUID.test(idEntrada)) throw new BadRequestException("La cuenta financiera no es válida.");
  const [cuenta] = await db.select({ id: cuentasFinancieras.id, tipo: cuentasFinancieras.tipo, moneda: cuentasFinancieras.moneda })
    .from(cuentasFinancieras).where(and(eq(cuentasFinancieras.id, idEntrada), eq(cuentasFinancieras.activa, true))).limit(1);
  if (!cuenta) throw new BadRequestException("La cuenta financiera seleccionada no existe o está inactiva.");
  if (cuenta.moneda !== "PEN") throw new BadRequestException("Por ahora los pagos del sistema deben asociarse a una cuenta en soles (PEN).");
  if (medioEntrada !== medioPorTipo[cuenta.tipo as keyof typeof medioPorTipo]) throw new BadRequestException("El medio de pago no coincide con la cuenta seleccionada. Elige una cuenta compatible.");
  if (!requerido && !cuenta) return null;
  return cuenta.id;
}
