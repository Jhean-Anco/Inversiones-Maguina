import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, cuentasFinancieras } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";

const tiposCuenta = ["EFECTIVO", "BANCO", "BILLETERA", "TARJETA"] as const;
const monedas = ["PEN", "USD", "EUR"] as const;
type DatosCuenta = { tipo: typeof tiposCuenta[number]; nombre: string; entidad: string | null; titular: string | null; moneda: typeof monedas[number]; saldoInicial: string | null; fechaSaldoInicial: string | null; numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null; telefono: string | null; observacion: string | null };
type EstadoSaldo = "SIN_CONCILIAR" | "MONEDA_NO_COMPATIBLE" | "DIVISA_NO_COMPATIBLE" | "MOVIMIENTOS_SIN_CUENTA" | "CONCILIADO";
const enmascararIdentificador = (cuenta: { numeroCuenta: string | null; cci: string | null; numeroTarjeta: string | null; telefono: string | null }) => {
  const valor = cuenta.numeroCuenta || cuenta.cci || cuenta.telefono || cuenta.numeroTarjeta;
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 4 ? `•••• ${digitos.slice(-4)}` : valor;
};

function validarParSaldoInicial(datos: Record<string, unknown>, moneda: string) {
  const valorSaldo = datos.saldoInicial;
  const valorFecha = datos.fechaSaldoInicial;
  const tieneSaldo = valorSaldo !== undefined && valorSaldo !== null && valorSaldo !== "";
  const tieneFecha = valorFecha !== undefined && valorFecha !== null && valorFecha !== "";
  if (tieneSaldo !== tieneFecha) throw new BadRequestException("Completa juntos el saldo inicial y la fecha de corte, o deja ambos vacíos.");
  if (!tieneSaldo) return { saldoInicial: null, fechaSaldoInicial: null };
  if (typeof valorSaldo !== "number" && typeof valorSaldo !== "string") throw new BadRequestException("El saldo inicial no es válido.");
  const saldo = typeof valorSaldo === "string" && !valorSaldo.trim() ? NaN : Number(valorSaldo);
  if (!Number.isFinite(saldo) || Math.abs(saldo) > 99_999_999_999.99 || Number(saldo.toFixed(2)) !== saldo) throw new BadRequestException("El saldo inicial debe tener hasta dos decimales.");
  if (typeof valorFecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valorFecha)) throw new BadRequestException("La fecha del saldo inicial no es válida.");
  const fecha = new Date(`${valorFecha}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valorFecha || valorFecha > fechaActualPeru()) throw new BadRequestException("La fecha del saldo inicial debe ser válida y no futura.");
  if (!(monedas as readonly string[]).includes(moneda)) throw new BadRequestException("Selecciona una moneda válida para el saldo inicial.");
  return { saldoInicial: saldo.toFixed(2), fechaSaldoInicial: valorFecha };
}

function cadena(datos: Record<string, unknown>, campo: string, etiqueta: string, maximo: number, requerido = false) {
  const valor = datos[campo];
  if (valor === undefined || valor === null) {
    if (requerido) throw new BadRequestException(`Completa ${etiqueta}.`);
    return null;
  }
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim())) throw new BadRequestException(`${etiqueta} no es válido.`);
  return valor.trim() || null;
}

export function validarDatosCuentaFinanciera(datosEntrada: unknown): DatosCuenta {
  if (typeof datosEntrada !== "object" || datosEntrada === null || Array.isArray(datosEntrada)) throw new BadRequestException("Los datos de la cuenta no son válidos.");
  const datos = datosEntrada as Record<string, unknown>;
  if (typeof datos.tipo !== "string" || !(tiposCuenta as readonly string[]).includes(datos.tipo)) throw new BadRequestException("Selecciona un tipo de cuenta válido.");
  const tipo = datos.tipo as DatosCuenta["tipo"];
  const nombre = cadena(datos, "nombre", "el nombre identificador", 100, true)!;
  const entidad = cadena(datos, "entidad", "la entidad financiera", 100);
  const titular = cadena(datos, "titular", "el titular", 160);
  const moneda = (datos.moneda ?? "PEN") as string;
  if (!(monedas as readonly string[]).includes(moneda)) throw new BadRequestException("Selecciona una moneda válida.");
  const saldoInicial = validarParSaldoInicial(datos, moneda);
  const numeroCuenta = cadena(datos, "numeroCuenta", "el número de cuenta", 100);
  const cci = cadena(datos, "cci", "el CCI", 100);
  const numeroTarjeta = cadena(datos, "numeroTarjeta", "los últimos cuatro dígitos", 30);
  const telefono = cadena(datos, "telefono", "el número o teléfono", 30);
  const observacion = cadena(datos, "observacion", "la observación", 1000);
  if (tipo === "BANCO" && (!entidad || (!numeroCuenta && !cci))) throw new BadRequestException("Para una cuenta bancaria indica el banco y el número de cuenta o CCI.");
  if (tipo === "BILLETERA" && (!entidad || (!telefono && !numeroCuenta))) throw new BadRequestException("Para una billetera indica el proveedor y el número de celular o cuenta.");
  if (tipo === "TARJETA" && (!entidad || !numeroTarjeta || !/^\d{4}$/.test(numeroTarjeta))) throw new BadRequestException("Para una tarjeta indica el banco emisor y sus últimos cuatro dígitos.");
  return { tipo, nombre, entidad, titular, moneda: moneda as DatosCuenta["moneda"], ...saldoInicial, numeroCuenta, cci, numeroTarjeta, telefono, observacion };
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
    const hasta = fechaActualPeru();
    const desde = `${hasta.slice(0, 7)}-01`;
    const cuentas = await this.listar();
    const [movimientos, saldosConciliados] = await Promise.all([db.execute(sql`
      SELECT cuenta_id,
        COALESCE(SUM(importe) FILTER (WHERE sentido = 'INGRESO'), 0)::numeric(14,2)::text AS ingresos,
        COALESCE(SUM(importe) FILTER (WHERE sentido = 'EGRESO'), 0)::numeric(14,2)::text AS egresos
      FROM (
        SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, importe_aplicado AS importe, fecha_pago AS fecha FROM ingresos_pagos
        UNION ALL SELECT adelanto_cuenta_financiera_id, 'INGRESO', adelanto, fecha_recepcion FROM ordenes_servicio WHERE ingreso_id IS NULL AND adelanto_cuenta_financiera_id IS NOT NULL AND adelanto > 0
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM egresos_pagos
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_entradas_stock
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_compras_mototaxis
        UNION ALL SELECT cuenta_financiera_id,
          CASE WHEN tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END, total, fecha
          FROM comprobantes_relacionados WHERE estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
      ) AS pagos
      WHERE cuenta_id IS NOT NULL AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
      GROUP BY cuenta_id
    `) as unknown as Promise<Array<{ cuenta_id: string; ingresos: string; egresos: string }>>, this.obtenerSaldosConciliados()]);
    const porCuenta = new Map(movimientos.map((movimiento) => [movimiento.cuenta_id, movimiento]));
    const items = cuentas.map((cuenta) => {
      const movimiento = porCuenta.get(cuenta.id);
      const ingresos = Number(movimiento?.ingresos ?? 0);
      const egresos = Number(movimiento?.egresos ?? 0);
      const saldo = saldosConciliados.get(cuenta.id);
      return { id: cuenta.id, tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad, moneda: cuenta.moneda,
        identificador: enmascararIdentificador(cuenta),
        activa: cuenta.activa, ingresosMes: ingresos.toFixed(2), egresosMes: egresos.toFixed(2), netoMes: (ingresos - egresos).toFixed(2),
        saldoInicial: cuenta.saldoInicial, fechaSaldoInicial: cuenta.fechaSaldoInicial,
        saldoActual: saldo?.estado === "CONCILIADO" ? saldo.saldoActual : null,
        saldoEstado: saldo?.estado ?? "SIN_CONCILIAR", saldoMensaje: saldo?.mensaje ?? "Registra un saldo conciliado y su fecha de corte." };
    });
    return { periodo: hasta.slice(0, 7), items };
  }

  private async obtenerSaldosConciliados() {
    const filas = await db.execute(sql`
      WITH pagos AS (
        SELECT pago.cuenta_financiera_id AS cuenta_id, pago.fecha_pago AS fecha,
          pago.importe_aplicado AS importe, 'INGRESO'::text AS sentido, 'PEN'::varchar AS moneda
        FROM ingresos_pagos pago
        LEFT JOIN ordenes_servicio orden ON orden.ingreso_id = pago.ingreso_id
          AND pago.observacion = ('Adelanto de la orden ' || orden.codigo)
        WHERE orden.id IS NULL
        UNION ALL
        SELECT orden.adelanto_cuenta_financiera_id, orden.fecha_recepcion, orden.adelanto,
          'INGRESO'::text, 'PEN'::varchar
        FROM ordenes_servicio orden WHERE orden.adelanto > 0
        UNION ALL
        SELECT pago.cuenta_financiera_id, pago.fecha_pago, pago.importe_pagado,
          'EGRESO'::text, egreso.moneda
        FROM egresos_pagos pago INNER JOIN egresos_registros egreso ON egreso.id = pago.egreso_id
        UNION ALL
        SELECT pago.cuenta_financiera_id, pago.fecha_pago, pago.importe_pagado,
          'EGRESO'::text, 'PEN'::varchar
        FROM pagos_entradas_stock pago
        UNION ALL
        SELECT pago.cuenta_financiera_id, pago.fecha_pago, pago.importe_pagado,
          'EGRESO'::text, compra.moneda
        FROM pagos_compras_mototaxis pago INNER JOIN compras_mototaxis compra ON compra.id = pago.compra_id
        UNION ALL
        SELECT nota.cuenta_financiera_id, nota.fecha, nota.total,
          CASE WHEN nota.tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END::text,
          'PEN'::varchar
        FROM comprobantes_relacionados nota
        WHERE nota.estado IN ('EMITIDO', 'ANULACION_PENDIENTE')
          AND nota.datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
      )
      SELECT cuenta.id::text AS cuenta_id,
        CASE
          WHEN cuenta.saldo_inicial IS NULL OR cuenta.fecha_saldo_inicial IS NULL THEN 'SIN_CONCILIAR'
          WHEN cuenta.moneda <> 'PEN' THEN 'MONEDA_NO_COMPATIBLE'
          WHEN EXISTS (SELECT 1 FROM pagos sin_cuenta WHERE sin_cuenta.cuenta_id IS NULL AND sin_cuenta.fecha >= cuenta.fecha_saldo_inicial) THEN 'MOVIMIENTOS_SIN_CUENTA'
          WHEN COALESCE(bool_or(pago.moneda <> 'PEN') FILTER (WHERE pago.cuenta_id IS NOT NULL), false) THEN 'DIVISA_NO_COMPATIBLE'
          ELSE 'CONCILIADO'
        END AS estado,
        CASE WHEN cuenta.saldo_inicial IS NOT NULL AND cuenta.fecha_saldo_inicial IS NOT NULL
          AND cuenta.moneda = 'PEN'
          AND NOT EXISTS (SELECT 1 FROM pagos sin_cuenta WHERE sin_cuenta.cuenta_id IS NULL AND sin_cuenta.fecha >= cuenta.fecha_saldo_inicial)
          AND NOT COALESCE(bool_or(pago.moneda <> 'PEN') FILTER (WHERE pago.cuenta_id IS NOT NULL), false)
          THEN (cuenta.saldo_inicial + COALESCE(sum(CASE WHEN pago.sentido = 'INGRESO' THEN pago.importe ELSE -pago.importe END), 0))::numeric(14,2)::text
          ELSE NULL END AS saldo_actual
      FROM cuentas_financieras cuenta
      LEFT JOIN pagos pago ON pago.cuenta_id = cuenta.id AND pago.fecha >= cuenta.fecha_saldo_inicial
      GROUP BY cuenta.id, cuenta.saldo_inicial, cuenta.fecha_saldo_inicial, cuenta.moneda
    `) as unknown as Array<{ cuenta_id: string; estado: EstadoSaldo; saldo_actual: string | null }>;
    const mensajes: Record<EstadoSaldo, string> = {
      SIN_CONCILIAR: "Registra un saldo conciliado y su fecha de corte.",
      MONEDA_NO_COMPATIBLE: "El saldo actual de esta moneda no se puede calcular hasta registrar el tipo de cambio de sus movimientos.",
      DIVISA_NO_COMPATIBLE: "Hay movimientos en moneda extranjera sin conversión registrada; el saldo no se puede calcular.",
      MOVIMIENTOS_SIN_CUENTA: "Hay pagos desde la fecha de corte sin una cuenta asignada; concílialos antes de calcular el saldo.",
      CONCILIADO: "Saldo inicial conciliado más movimientos registrados desde la fecha de corte.",
    };
    return new Map(filas.map((fila) => [fila.cuenta_id, { estado: fila.estado, saldoActual: fila.saldo_actual, mensaje: mensajes[fila.estado] }]));
  }

  async flujoPorPeriodo(periodoEntrada: string) {
    if (!( ["DIA", "SEMANA", "MES"] as const).includes(periodoEntrada as "DIA" | "SEMANA" | "MES")) {
      throw new BadRequestException("Selecciona un periodo válido para el flujo financiero.");
    }
    const periodo = periodoEntrada as "DIA" | "SEMANA" | "MES";
    const hasta = fechaActualPeru();
    const fechaInicial = new Date(`${hasta}T00:00:00.000Z`);
    if (periodo === "DIA") fechaInicial.setUTCDate(1);
    else if (periodo === "SEMANA") {
      fechaInicial.setUTCDate(fechaInicial.getUTCDate() - ((fechaInicial.getUTCDay() + 6) % 7) - 77);
    } else {
      fechaInicial.setUTCDate(1);
      fechaInicial.setUTCMonth(0);
    }
    const desde = fechaInicial.toISOString().slice(0, 10);
    const [cuentasMonedas, filas] = await Promise.all([
      db.selectDistinct({ moneda: cuentasFinancieras.moneda }).from(cuentasFinancieras).orderBy(asc(cuentasFinancieras.moneda)),
      db.execute(sql`
        SELECT COALESCE(cuenta.moneda, pagos.moneda, 'PEN') AS moneda,
          to_char(CASE
            WHEN ${periodo} = 'DIA' THEN pagos.fecha::date
            WHEN ${periodo} = 'SEMANA' THEN date_trunc('week', pagos.fecha)::date
            ELSE date_trunc('month', pagos.fecha)::date
          END, 'YYYY-MM-DD') AS fecha,
          COALESCE(SUM(pagos.importe) FILTER (WHERE pagos.sentido = 'INGRESO'), 0)::numeric(14,2)::text AS ingresos,
          COALESCE(SUM(pagos.importe) FILTER (WHERE pagos.sentido = 'EGRESO'), 0)::numeric(14,2)::text AS egresos
        FROM (
          SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, importe_aplicado AS importe, fecha_pago AS fecha, 'PEN'::varchar AS moneda FROM ingresos_pagos
          UNION ALL SELECT adelanto_cuenta_financiera_id, 'INGRESO', adelanto, fecha_recepcion, 'PEN'::varchar FROM ordenes_servicio WHERE ingreso_id IS NULL AND adelanto_cuenta_financiera_id IS NOT NULL AND adelanto > 0
          UNION ALL SELECT pago.cuenta_financiera_id, 'EGRESO', pago.importe_pagado, pago.fecha_pago, egreso.moneda FROM egresos_pagos AS pago INNER JOIN egresos_registros AS egreso ON egreso.id = pago.egreso_id
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago, 'PEN'::varchar FROM pagos_entradas_stock
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago, 'PEN'::varchar FROM pagos_compras_mototaxis
          UNION ALL SELECT cuenta_financiera_id,
            CASE WHEN tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END, total, fecha, 'PEN'::varchar
            FROM comprobantes_relacionados WHERE estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
        ) AS pagos
        LEFT JOIN cuentas_financieras AS cuenta ON cuenta.id = pagos.cuenta_id
        WHERE pagos.fecha >= ${desde}::date AND pagos.fecha <= ${hasta}::date
        GROUP BY 1, 2
        ORDER BY 2, 1
      `) as unknown as Array<{ moneda: typeof monedas[number]; fecha: string; ingresos: string; egresos: string }>,
    ]);
    const monedasConMovimientos = Array.from(new Set([...cuentasMonedas.map((item) => item.moneda), ...filas.map((fila) => fila.moneda)])).sort();
    return { periodo, desde, hasta, monedas: monedasConMovimientos, items: filas.map((fila) => ({
      moneda: fila.moneda, fecha: fila.fecha, ingresos: fila.ingresos, egresos: fila.egresos,
      neto: (Number(fila.ingresos) - Number(fila.egresos)).toFixed(2),
    })) };
  }

  /**
   * Composición del dinero cobrado y pagado en un rango, por concepto y moneda. Usa los mismos orígenes y filtros que
   * `flujoPorPeriodo`, así que la suma de ingresos menos egresos coincide con el saldo neto del flujo financiero.
   */
  async composicionDeCaja(rango: { desde: string; hasta: string }) {
    const filas = await db.execute(sql`
      SELECT COALESCE(cuenta.moneda, pagos.moneda, 'PEN') AS moneda, pagos.sentido, pagos.concepto,
        COALESCE(SUM(pagos.importe), 0)::numeric(14,2)::text AS importe
      FROM (
        SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, 'COBRANZA' AS concepto, importe_aplicado AS importe, fecha_pago AS fecha, 'PEN'::varchar AS moneda FROM ingresos_pagos
        UNION ALL SELECT adelanto_cuenta_financiera_id, 'INGRESO', 'ADELANTO_ORDEN', adelanto, fecha_recepcion, 'PEN'::varchar FROM ordenes_servicio WHERE ingreso_id IS NULL AND adelanto_cuenta_financiera_id IS NOT NULL AND adelanto > 0
        UNION ALL SELECT pago.cuenta_financiera_id, 'EGRESO',
          CASE WHEN egreso.tipo = 'MOTOTAXI' THEN 'COMPRA_MOTOTAXIS' WHEN egreso.tipo = 'ACTIVO_HERRAMIENTA' THEN 'ACTIVOS' ELSE 'GASTOS' END,
          pago.importe_pagado, pago.fecha_pago, egreso.moneda FROM egresos_pagos AS pago INNER JOIN egresos_registros AS egreso ON egreso.id = pago.egreso_id
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', 'COMPRA_REPUESTOS', importe_pagado, fecha_pago, 'PEN'::varchar FROM pagos_entradas_stock
        UNION ALL SELECT cuenta_financiera_id, 'EGRESO', 'COMPRA_MOTOTAXIS', importe_pagado, fecha_pago, 'PEN'::varchar FROM pagos_compras_mototaxis
        UNION ALL SELECT cuenta_financiera_id,
          CASE WHEN tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END,
          CASE WHEN tipo_comprobante = 'NOTA_DEBITO' THEN 'NOTA_DEBITO' ELSE 'NOTA_CREDITO' END,
          total, fecha, 'PEN'::varchar
          FROM comprobantes_relacionados WHERE estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
      ) AS pagos
      LEFT JOIN cuentas_financieras AS cuenta ON cuenta.id = pagos.cuenta_id
      WHERE pagos.fecha >= ${rango.desde}::date AND pagos.fecha <= ${rango.hasta}::date
      GROUP BY 1, 2, 3
      ORDER BY 1, 2, 3
    `) as unknown as Array<{ moneda: typeof monedas[number]; sentido: "INGRESO" | "EGRESO"; concepto: string; importe: string }>;
    return { ...rango, monedas: Array.from(new Set(filas.map((fila) => fila.moneda))).sort(), items: filas };
  }

  async movimientosPorPeriodo(periodoEntrada: string, fechaEntrada: string, cuentaIdEntrada?: string, paginaEntrada?: string, porPaginaEntrada?: string) {
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

    const cuentaId = cuentaIdEntrada?.trim() ?? "";
    if (cuentaId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cuentaId)) throw new BadRequestException("Selecciona una cuenta válida.");
    const pagina = Math.max(1, Number.parseInt(paginaEntrada ?? "1", 10) || 1);
    const porPagina = Math.min(50, Math.max(1, Number.parseInt(porPaginaEntrada ?? "10", 10) || 10));
    const [cuentas, filas] = await Promise.all([
      this.listar(),
      db.execute(sql`
        SELECT cuenta_id, sentido,
          COALESCE(SUM(importe), 0)::numeric(14,2)::text AS importe
        FROM (
          SELECT cuenta_financiera_id AS cuenta_id, 'INGRESO' AS sentido, importe_aplicado AS importe, fecha_pago AS fecha FROM ingresos_pagos
          UNION ALL SELECT adelanto_cuenta_financiera_id, 'INGRESO', adelanto, fecha_recepcion FROM ordenes_servicio WHERE ingreso_id IS NULL AND adelanto_cuenta_financiera_id IS NOT NULL AND adelanto > 0
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM egresos_pagos
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_entradas_stock
          UNION ALL SELECT cuenta_financiera_id, 'EGRESO', importe_pagado, fecha_pago FROM pagos_compras_mototaxis
          UNION ALL SELECT cuenta_financiera_id,
            CASE WHEN tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END, total, fecha
            FROM comprobantes_relacionados WHERE estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
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
    const movimientosRegistradosSql = sql`
      SELECT ('VENTA:' || pago.id::text) AS id, pago.fecha_pago AS fecha, ('Venta ' || ingreso.codigo) AS descripcion,
        pago.cuenta_financiera_id AS cuenta_id, 'INGRESO'::text AS sentido, pago.importe_aplicado AS importe, 'Venta'::text AS clase
      FROM ingresos_pagos pago INNER JOIN ingresos ingreso ON ingreso.id = pago.ingreso_id
      UNION ALL
      SELECT ('ADELANTO:' || orden.id::text), orden.fecha_recepcion, ('Anticipo de orden ' || orden.codigo),
        orden.adelanto_cuenta_financiera_id, 'INGRESO'::text, orden.adelanto, 'Orden de servicio'::text
      FROM ordenes_servicio orden
      WHERE orden.ingreso_id IS NULL AND orden.adelanto_cuenta_financiera_id IS NOT NULL AND orden.adelanto > 0
      UNION ALL
      SELECT ('EGRESO:' || pago.id::text), pago.fecha_pago, (egreso.concepto || ' · ' || egreso.codigo),
        pago.cuenta_financiera_id, 'EGRESO'::text, pago.importe_pagado, 'Gasto'::text
      FROM egresos_pagos pago INNER JOIN egresos_registros egreso ON egreso.id = pago.egreso_id
      UNION ALL
      SELECT ('REPUESTOS:' || pago.id::text), pago.fecha_pago, ('Compra de repuestos · ' || entrada.codigo),
        pago.cuenta_financiera_id, 'EGRESO'::text, pago.importe_pagado, 'Compra'::text
      FROM pagos_entradas_stock pago INNER JOIN entradas_stock entrada ON entrada.id = pago.entrada_id
      UNION ALL
      SELECT ('MOTOTAXIS:' || pago.id::text), pago.fecha_pago, ('Compra de mototaxis · ' || compra.codigo),
        pago.cuenta_financiera_id, 'EGRESO'::text, pago.importe_pagado, 'Compra'::text
      FROM pagos_compras_mototaxis pago INNER JOIN compras_mototaxis compra ON compra.id = pago.compra_id
      UNION ALL
      SELECT ('NOTA:' || nota.id::text), nota.fecha,
        ((CASE WHEN nota.tipo_comprobante = 'NOTA_DEBITO' THEN 'Nota de débito ' ELSE 'Nota de crédito ' END) || nota.serie || '-' || lpad(nota.numero::text, 6, '0')),
        nota.cuenta_financiera_id,
        (CASE WHEN nota.tipo_comprobante = 'NOTA_DEBITO' THEN 'INGRESO' ELSE 'EGRESO' END)::text,
        nota.total, 'Nota'::text
      FROM comprobantes_relacionados nota
      WHERE nota.estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND nota.datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'
    `;
    const filtroCuentaSql = cuentaId ? sql`AND cuenta_id = ${cuentaId}::uuid` : sql``;
    const [conteoMovimientos] = await db.execute(sql`
      WITH pagos AS (${movimientosRegistradosSql})
      SELECT count(*)::int AS total FROM pagos
      WHERE cuenta_id IS NOT NULL AND fecha >= ${desde}::date AND fecha <= ${hasta}::date ${filtroCuentaSql}
    `) as unknown as [{ total: number }];
    const movimientosRegistrados = await db.execute(sql`
      WITH pagos AS (${movimientosRegistradosSql})
      SELECT pago.id, pago.fecha::text AS fecha, pago.descripcion, pago.cuenta_id AS "cuentaId", cuenta.nombre AS "cuentaNombre",
        cuenta.moneda, pago.sentido, pago.importe::numeric(14,2)::text AS importe, pago.clase
      FROM pagos pago INNER JOIN cuentas_financieras cuenta ON cuenta.id = pago.cuenta_id
      WHERE pago.fecha >= ${desde}::date AND pago.fecha <= ${hasta}::date ${filtroCuentaSql}
      ORDER BY pago.fecha DESC, pago.id DESC LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}
    `) as unknown as Array<{ id: string; fecha: string; descripcion: string; cuentaId: string; cuentaNombre: string; moneda: typeof monedas[number]; sentido: "INGRESO" | "EGRESO"; importe: string; clase: string }>;
    const sumasPorMoneda = items.reduce<Record<string, { ingresos: number; egresos: number; neto: number }>>((totales, cuenta) => {
      const actual = totales[cuenta.moneda] ?? { ingresos: 0, egresos: 0, neto: 0 };
      actual.ingresos += Number(cuenta.ingresos);
      actual.egresos += Number(cuenta.egresos);
      actual.neto += Number(cuenta.neto);
      totales[cuenta.moneda] = actual;
      return totales;
    }, {});
    const totalesPorMoneda = Object.fromEntries(Object.entries(sumasPorMoneda).map(([moneda, total]) => [moneda, {
      ingresos: total.ingresos.toFixed(2), egresos: total.egresos.toFixed(2), neto: total.neto.toFixed(2),
    }]));
    return { periodo: periodoEntrada, fecha: fechaEntrada, desde, hasta, items, totalesPorMoneda,
      movimientos: movimientosRegistrados, pagina, porPagina, totalMovimientos: conteoMovimientos?.total ?? 0,
      totalPaginasMovimientos: Math.max(1, Math.ceil((conteoMovimientos?.total ?? 0) / porPagina)) };
  }

  async crear(entrada: unknown, usuarioId: string) {
    const datos = validarDatosCuentaFinanciera(entrada);
    const [cuenta] = await db.insert(cuentasFinancieras).values({ ...datos, usuarioId }).returning();
    return cuenta;
  }

  async actualizar(id: string, entrada: unknown) {
    this.validarId(id);
    const datos = validarDatosCuentaFinanciera(entrada);
    return db.transaction(async (tx) => {
      const [actual] = await tx.select({ moneda: cuentasFinancieras.moneda, saldoInicial: cuentasFinancieras.saldoInicial })
        .from(cuentasFinancieras).where(eq(cuentasFinancieras.id, id)).for("update").limit(1);
      if (!actual) throw new NotFoundException("No se encontró la cuenta financiera.");
      if (actual.moneda !== datos.moneda && actual.saldoInicial !== null && datos.saldoInicial !== null) {
        throw new BadRequestException("Al cambiar la moneda de una cuenta, limpia el saldo inicial y vuelve a conciliarlo en la nueva moneda.");
      }
      const [cuenta] = await tx.update(cuentasFinancieras).set(datos).where(eq(cuentasFinancieras.id, id)).returning();
      if (!cuenta) throw new NotFoundException("No se encontró la cuenta financiera.");
      return cuenta;
    });
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
