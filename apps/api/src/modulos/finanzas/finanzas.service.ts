import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, cuentasFinancieras } from "@magina/database";

const tiposCuenta = ["EFECTIVO", "BANCO", "BILLETERA", "TARJETA"] as const;
const monedas = ["PEN", "USD", "EUR"] as const;
type DatosCuenta = { tipo: typeof tiposCuenta[number]; nombre: string; entidad: string | null; titular: string | null; moneda: typeof monedas[number]; numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null; telefono: string | null; observacion: string | null };

function cadena(datos: Record<string, unknown>, campo: string, etiqueta: string, maximo: number, requerido = false) {
  const valor = datos[campo];
  if (valor === undefined || valor === null) {
    if (requerido) throw new BadRequestException(`Completa ${etiqueta}.`);
    return null;
  }
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim())) throw new BadRequestException(`${etiqueta} no es válido.`);
  return valor.trim() || null;
}

function validar(datosEntrada: unknown): DatosCuenta {
  if (typeof datosEntrada !== "object" || datosEntrada === null || Array.isArray(datosEntrada)) throw new BadRequestException("Los datos de la cuenta no son válidos.");
  const datos = datosEntrada as Record<string, unknown>;
  if (typeof datos.tipo !== "string" || !(tiposCuenta as readonly string[]).includes(datos.tipo)) throw new BadRequestException("Selecciona un tipo de cuenta válido.");
  const tipo = datos.tipo as DatosCuenta["tipo"];
  const nombre = cadena(datos, "nombre", "el nombre identificador", 100, true)!;
  const entidad = cadena(datos, "entidad", "la entidad financiera", 100);
  const titular = cadena(datos, "titular", "el titular", 160);
  const moneda = (datos.moneda ?? "PEN") as string;
  if (!(monedas as readonly string[]).includes(moneda)) throw new BadRequestException("Selecciona una moneda válida.");
  const numeroCuenta = cadena(datos, "numeroCuenta", "el número de cuenta", 100);
  const cci = cadena(datos, "cci", "el CCI", 100);
  const numeroTarjeta = cadena(datos, "numeroTarjeta", "los últimos cuatro dígitos", 30);
  const telefono = cadena(datos, "telefono", "el número o teléfono", 30);
  const observacion = cadena(datos, "observacion", "la observación", 1000);
  if (tipo === "BANCO" && (!entidad || (!numeroCuenta && !cci))) throw new BadRequestException("Para una cuenta bancaria indica el banco y el número de cuenta o CCI.");
  if (tipo === "BILLETERA" && (!entidad || (!telefono && !numeroCuenta))) throw new BadRequestException("Para una billetera indica el proveedor y el número de celular o cuenta.");
  if (tipo === "TARJETA" && (!entidad || !numeroTarjeta || !/^\d{4}$/.test(numeroTarjeta))) throw new BadRequestException("Para una tarjeta indica el banco emisor y sus últimos cuatro dígitos.");
  return { tipo, nombre, entidad, titular, moneda: moneda as DatosCuenta["moneda"], numeroCuenta, cci, numeroTarjeta, telefono, observacion };
}

@Injectable()
export class ServicioFinanzas {
  async listar() {
    const cuentas = await db.select().from(cuentasFinancieras).orderBy(desc(cuentasFinancieras.activa), asc(cuentasFinancieras.tipo), asc(cuentasFinancieras.nombre));
    return cuentas;
  }

  async opciones() {
    return db.select({ id: cuentasFinancieras.id, tipo: cuentasFinancieras.tipo, nombre: cuentasFinancieras.nombre,
      entidad: cuentasFinancieras.entidad, moneda: cuentasFinancieras.moneda, activa: cuentasFinancieras.activa,
      numeroTarjeta: cuentasFinancieras.numeroTarjeta }).from(cuentasFinancieras)
      .where(eq(cuentasFinancieras.activa, true)).orderBy(asc(cuentasFinancieras.tipo), asc(cuentasFinancieras.nombre));
  }

  async resumenDelMes() {
    const cuentas = await this.listar();
    const movimientos = await db.execute(sql`
      SELECT cuenta_id,
        COALESCE(SUM(importe) FILTER (WHERE sentido = 'INGRESO'), 0)::numeric(14,2)::text AS ingresos,
        COALESCE(SUM(importe) FILTER (WHERE sentido = 'EGRESO'), 0)::numeric(14,2)::text AS egresos
      FROM (
        SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, importe_aplicado AS importe, fecha_pago AS fecha FROM ingresos_pagos
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM egresos_pagos
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_entradas_stock
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_compras_mototaxis
      ) AS pagos
      WHERE cuenta_id IS NOT NULL AND fecha >= date_trunc('month', current_date)::date AND fecha <= current_date
      GROUP BY cuenta_id
    `) as unknown as Array<{ cuenta_id: string; ingresos: string; egresos: string }>;
    const porCuenta = new Map(movimientos.map((movimiento) => [movimiento.cuenta_id, movimiento]));
    const items = cuentas.map((cuenta) => {
      const movimiento = porCuenta.get(cuenta.id);
      const ingresos = Number(movimiento?.ingresos ?? 0);
      const egresos = Number(movimiento?.egresos ?? 0);
      return { id: cuenta.id, tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad, moneda: cuenta.moneda,
        activa: cuenta.activa, ingresosMes: ingresos.toFixed(2), egresosMes: egresos.toFixed(2), netoMes: (ingresos - egresos).toFixed(2) };
    });
    return { periodo: new Date().toISOString().slice(0, 7), items };
  }

  async movimientosPorPeriodo(periodoEntrada: string, fechaEntrada: string) {
    let desde: string;
    let hasta: string;
    if (periodoEntrada === "DIA" && /^\d{4}-\d{2}-\d{2}$/.test(fechaEntrada)) {
      const fecha = new Date(`${fechaEntrada}T00:00:00.000Z`);
      if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== fechaEntrada) throw new BadRequestException("Selecciona una fecha válida.");
      desde = fechaEntrada;
      hasta = fechaEntrada;
    } else if (periodoEntrada === "MES" && /^\d{4}-\d{2}$/.test(fechaEntrada)) {
      const fecha = new Date(`${fechaEntrada}-01T00:00:00.000Z`);
      if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 7) !== fechaEntrada) throw new BadRequestException("Selecciona un mes válido.");
      desde = `${fechaEntrada}-01`;
      fecha.setUTCMonth(fecha.getUTCMonth() + 1);
      fecha.setUTCDate(0);
      hasta = fecha.toISOString().slice(0, 10);
    } else if (periodoEntrada === "ANIO" && /^\d{4}$/.test(fechaEntrada) && Number(fechaEntrada) >= 1900 && Number(fechaEntrada) <= 9999) {
      desde = `${fechaEntrada}-01-01`;
      hasta = `${fechaEntrada}-12-31`;
    } else {
      throw new BadRequestException("Selecciona el filtro día, mes o año y un periodo válido.");
    }

    const [cuentas, filas] = await Promise.all([
      this.listar(),
      db.execute(sql`
        SELECT cuenta_id, sentido,
          COALESCE(SUM(importe), 0)::numeric(14,2)::text AS importe
        FROM (
          SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, importe_aplicado AS importe, fecha_pago AS fecha FROM ingresos_pagos
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM egresos_pagos
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_entradas_stock
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_compras_mototaxis
        ) AS pagos
        WHERE cuenta_id IS NOT NULL AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
        GROUP BY cuenta_id, sentido
      `) as unknown as Array<{ cuenta_id: string; sentido: "INGRESO" | "EGRESO"; importe: string }>,
    ]);
    const porCuenta = new Map<string, { ingresos: number; egresos: number }>();
    for (const fila of filas) {
      const actual = porCuenta.get(fila.cuenta_id) ?? { ingresos: 0, egresos: 0 };
      if (fila.sentido === "INGRESO") actual.ingresos += Number(fila.importe);
      else actual.egresos += Number(fila.importe);
      porCuenta.set(fila.cuenta_id, actual);
    }
    const items = cuentas.map((cuenta) => {
      const movimientos = porCuenta.get(cuenta.id) ?? { ingresos: 0, egresos: 0 };
      return { id: cuenta.id, nombre: cuenta.nombre, tipo: cuenta.tipo, moneda: cuenta.moneda, activa: cuenta.activa,
        ingresos: movimientos.ingresos.toFixed(2), egresos: movimientos.egresos.toFixed(2), neto: (movimientos.ingresos - movimientos.egresos).toFixed(2) };
    });
    return { periodo: periodoEntrada, fecha: fechaEntrada, desde, hasta,
      totales: { ingresos: items.reduce((suma, item) => suma + Number(item.ingresos), 0).toFixed(2), egresos: items.reduce((suma, item) => suma + Number(item.egresos), 0).toFixed(2), neto: items.reduce((suma, item) => suma + Number(item.neto), 0).toFixed(2) }, items };
  }

  async crear(entrada: unknown, usuarioId: string) {
    const datos = validar(entrada);
    const [cuenta] = await db.insert(cuentasFinancieras).values({ ...datos, usuarioId }).returning();
    return cuenta;
  }

  async actualizar(id: string, entrada: unknown) {
    this.validarId(id);
    const datos = validar(entrada);
    const [cuenta] = await db.update(cuentasFinancieras).set(datos).where(eq(cuentasFinancieras.id, id)).returning();
    if (!cuenta) throw new NotFoundException("No se encontró la cuenta financiera.");
    return cuenta;
  }

  async cambiarEstado(id: string, entrada: unknown) {
    this.validarId(id);
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada) || typeof (entrada as Record<string, unknown>).activa !== "boolean") throw new BadRequestException("Indica si la cuenta estará activa.");
    const [cuenta] = await db.update(cuentasFinancieras).set({ activa: (entrada as { activa: boolean }).activa }).where(eq(cuentasFinancieras.id, id)).returning();
    if (!cuenta) throw new NotFoundException("No se encontró la cuenta financiera.");
    return cuenta;
  }

  private validarId(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException("El identificador de la cuenta no es válido.");
  }
}
