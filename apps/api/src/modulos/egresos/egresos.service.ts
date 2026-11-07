import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, egresosPagos, egresosRegistros, entradasStock } from "@magina/database";
import { rucPeruValido } from "../../utilidades/ruc-peru";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";

const tiposEgreso = ["GASTO_OPERATIVO", "ACTIVO_HERRAMIENTA", "MOTOTAXI"] as const;
const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;
type TipoEgreso = typeof tiposEgreso[number];
type DatosEgreso = { tipo?: unknown; fecha?: unknown; categoria?: unknown; concepto?: unknown; beneficiario?: unknown; proveedorRuc?: unknown; documentoTipo?: unknown; documentoNumero?: unknown; moneda?: unknown; medioPago?: unknown; cuentaFinancieraId?: unknown; monto?: unknown; importePagoInicial?: unknown; identificadorActivo?: unknown; mototaxiMarca?: unknown; mototaxiModelo?: unknown; mototaxiNumeroMotor?: unknown; mototaxiNumeroChasis?: unknown; observacion?: unknown };

function texto(valor: unknown, etiqueta: string, maximo: number, requerido = false) {
  if (valor === undefined || valor === null) {
    if (requerido) throw new BadRequestException(`Completa ${etiqueta}.`);
    return null;
  }
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim())) throw new BadRequestException(`${etiqueta} no es válido.`);
  return valor.trim() || null;
}

function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime()) && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
}

@Injectable()
export class ServicioEgresos {
  async listar(filtros: { tipo?: string; pagina?: string; porPagina?: string; busqueda?: string }) {
    if (filtros.tipo && !(tiposEgreso as readonly string[]).includes(filtros.tipo)) throw new BadRequestException("El tipo de egreso solicitado no es válido.");
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const solicitado = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(solicitado) ? solicitado : 10;
    const termino = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const patron = termino ? `%${termino.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condiciones = [
      filtros.tipo && (tiposEgreso as readonly string[]).includes(filtros.tipo) ? eq(egresosRegistros.tipo, filtros.tipo) : undefined,
      patron ? or(ilike(egresosRegistros.codigo, patron), ilike(egresosRegistros.categoria, patron), ilike(egresosRegistros.concepto, patron), ilike(egresosRegistros.beneficiario, patron), ilike(egresosRegistros.documentoNumero, patron)) : undefined,
    ].filter(Boolean);
    const condicion = condiciones.length ? and(...condiciones) : undefined;
    const [registros, [conteo]] = await Promise.all([
      db.select({ id: egresosRegistros.id, codigo: egresosRegistros.codigo, tipo: egresosRegistros.tipo, fecha: egresosRegistros.fecha,
        categoria: egresosRegistros.categoria, concepto: egresosRegistros.concepto, beneficiario: egresosRegistros.beneficiario,
        proveedorRuc: egresosRegistros.proveedorRuc, documentoTipo: egresosRegistros.documentoTipo,
        documentoNumero: egresosRegistros.documentoNumero, moneda: egresosRegistros.moneda, medioPago: egresosRegistros.medioPago,
        monto: egresosRegistros.monto, identificadorActivo: egresosRegistros.identificadorActivo,
        mototaxiMarca: egresosRegistros.mototaxiMarca, mototaxiModelo: egresosRegistros.mototaxiModelo,
        mototaxiNumeroMotor: egresosRegistros.mototaxiNumeroMotor, mototaxiNumeroChasis: egresosRegistros.mototaxiNumeroChasis,
        observacion: egresosRegistros.observacion, creadoEn: egresosRegistros.creadoEn })
        .from(egresosRegistros).where(condicion).orderBy(desc(egresosRegistros.fecha), desc(egresosRegistros.creadoEn)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(egresosRegistros).where(condicion),
    ]);
    const total = conteo?.total ?? 0;
    const pagos = registros.length ? await db.select({ id: egresosPagos.id, egresoId: egresosPagos.egresoId,
      fechaPago: egresosPagos.fechaPago, importePagado: egresosPagos.importePagado, medioPago: egresosPagos.medioPago,
      creadoEn: egresosPagos.creadoEn }).from(egresosPagos)
      .where(inArray(egresosPagos.egresoId, registros.map((item) => item.id)))
      .orderBy(asc(egresosPagos.fechaPago), asc(egresosPagos.creadoEn)) : [];
    const items = registros.map((registro) => {
      const pagosDelEgreso = pagos.filter((pago) => pago.egresoId === registro.id);
      const pagado = pagosDelEgreso.reduce((suma, pago) => suma + Number(pago.importePagado), 0);
      return { ...registro, pagos: pagosDelEgreso, importePagadoAcumulado: pagado.toFixed(2),
        saldoPendiente: Math.max(0, Number(registro.monto) - pagado).toFixed(2) };
    });
    return { items, total, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async crear(entrada: unknown, usuarioId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId)) throw new BadRequestException("La sesión no identifica a un usuario válido.");
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos del egreso no son válidos.");
    const datos = entrada as DatosEgreso;
    if (typeof datos.tipo !== "string" || !(tiposEgreso as readonly string[]).includes(datos.tipo)) throw new BadRequestException("Selecciona un submódulo de egresos válido.");
    const tipo = datos.tipo as TipoEgreso;
    if (typeof datos.fecha !== "string" || !fechaValida(datos.fecha) || datos.fecha > fechaActualPeru()) throw new BadRequestException("Indica una fecha válida que no sea futura.");
    if (typeof datos.medioPago !== "string" || !(mediosPago as readonly string[]).includes(datos.medioPago)) throw new BadRequestException("Selecciona un medio de pago.");
    const monto = typeof datos.monto === "number" ? datos.monto : typeof datos.monto === "string" && datos.monto.trim() ? Number(datos.monto) : NaN;
    if (!Number.isFinite(monto) || monto <= 0 || Number(monto.toFixed(2)) !== monto) throw new BadRequestException("El importe debe ser mayor que cero y tener hasta dos decimales.");
    const importePagoInicial = datos.importePagoInicial === undefined || datos.importePagoInicial === null || datos.importePagoInicial === "" ? monto : Number(datos.importePagoInicial);
    if (!Number.isFinite(importePagoInicial) || importePagoInicial <= 0 || Number(importePagoInicial.toFixed(2)) !== importePagoInicial || importePagoInicial > monto) throw new BadRequestException("El primer pago debe ser positivo y no superar el importe del egreso.");
    const cuentaFinancieraId = await validarCuentaFinanciera(datos.cuentaFinancieraId, datos.medioPago, true);
    const categoria = texto(datos.categoria, "la categoría", 80, true)!;
    const concepto = texto(datos.concepto, "el concepto", 240, true)!;
    const beneficiario = texto(datos.beneficiario, "el proveedor o beneficiario", 180, tipo !== "GASTO_OPERATIVO");
    const proveedorRuc = texto(datos.proveedorRuc, "el RUC del proveedor", 11);
    if (proveedorRuc && !rucPeruValido(proveedorRuc)) throw new BadRequestException("El RUC del proveedor no es válido.");
    const documentoTipo = texto(datos.documentoTipo, "el tipo de documento", 30);
    const documentoNumero = texto(datos.documentoNumero, "el número de documento", 60)?.toUpperCase() ?? null;
    if (documentoTipo && !["FACTURA", "BOLETA", "NOTA", "OTRO"].includes(documentoTipo)) throw new BadRequestException("Selecciona un tipo de documento de compra básico.");
    if (documentoTipo === "FACTURA" && (!proveedorRuc || !documentoNumero)) throw new BadRequestException("Para registrar una factura como sustento operativo indica el RUC del proveedor y su número.");
    const moneda = datos.moneda === undefined || datos.moneda === null || datos.moneda === "" ? "PEN" : texto(datos.moneda, "la moneda del comprobante", 3, true)!;
    if (!( ["PEN", "USD", "EUR"] as const).includes(moneda as "PEN" | "USD" | "EUR")) throw new BadRequestException("Selecciona PEN, USD o EUR.");
    const identificadorActivo = texto(datos.identificadorActivo, "el identificador", 100);
    if (tipo === "ACTIVO_HERRAMIENTA" && !identificadorActivo) throw new BadRequestException("Indica el modelo, serie o identificación del activo o herramienta.");
    const mototaxiMarca = texto(datos.mototaxiMarca, "la marca del mototaxi", 100, tipo === "MOTOTAXI");
    const mototaxiModelo = texto(datos.mototaxiModelo, "el modelo del mototaxi", 100, tipo === "MOTOTAXI");
    const mototaxiNumeroMotor = texto(datos.mototaxiNumeroMotor, "el número de motor", 100, tipo === "MOTOTAXI")?.toUpperCase() ?? null;
    const mototaxiNumeroChasis = texto(datos.mototaxiNumeroChasis, "el número de chasis", 100, tipo === "MOTOTAXI")?.toUpperCase() ?? null;
    const codigo = `EGR-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    return db.transaction(async (tx) => {
      if (tipo === "MOTOTAXI" && mototaxiNumeroMotor && mototaxiNumeroChasis) {
        const [duplicado] = await tx.select({ id: egresosRegistros.id }).from(egresosRegistros)
          .where(and(eq(egresosRegistros.tipo, "MOTOTAXI"), or(eq(egresosRegistros.mototaxiNumeroMotor, mototaxiNumeroMotor), eq(egresosRegistros.mototaxiNumeroChasis, mototaxiNumeroChasis)))).limit(1);
        if (duplicado) throw new ConflictException("Ya existe una compra registrada con ese número de motor o chasis.");
      }
      if (documentoTipo === "FACTURA" && proveedorRuc && documentoNumero) {
        const clave = `COMPROBANTE_COMPRA:${proveedorRuc}:${documentoNumero}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`);
        const [duplicadoCompra] = await tx.select({ id: entradasStock.id }).from(entradasStock)
          .where(and(eq(entradasStock.proveedorTipoDocumento, "RUC"), eq(entradasStock.proveedorNumeroDocumento, proveedorRuc), eq(entradasStock.numeroDocumento, documentoNumero))).limit(1);
        const [duplicadoEgreso] = await tx.select({ id: egresosRegistros.id }).from(egresosRegistros)
          .where(and(eq(egresosRegistros.proveedorRuc, proveedorRuc), eq(egresosRegistros.documentoNumero, documentoNumero))).limit(1);
        if (duplicadoCompra || duplicadoEgreso) throw new ConflictException("Esta factura ya está registrada en Compras o en otro egreso.");
      }
      const [registro] = await tx.insert(egresosRegistros).values({ codigo, tipo, fecha: datos.fecha as string, categoria,
        concepto, beneficiario, proveedorRuc, documentoTipo, documentoNumero, moneda,
        medioPago: datos.medioPago as string, cuentaFinancieraId, monto: monto.toFixed(2), identificadorActivo,
        mototaxiMarca, mototaxiModelo, mototaxiNumeroMotor, mototaxiNumeroChasis,
        observacion: texto(datos.observacion, "la observación", 2000), usuarioId }).returning({ id: egresosRegistros.id });
      await tx.insert(egresosPagos).values({ egresoId: registro.id, fechaPago: datos.fecha as string,
        importePagado: importePagoInicial.toFixed(2), medioPago: datos.medioPago as string, cuentaFinancieraId,
        claveIdempotencia: randomUUID(), usuarioId });
      return this.obtenerRegistro(registro.id);
    });
  }

  async registrarPago(idEntrada: string, entrada: unknown, usuarioId: string) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(idEntrada) || !uuid.test(usuarioId)) throw new BadRequestException("El egreso o el usuario no son válidos.");
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos del pago no son válidos.");
    const datos = entrada as Record<string, unknown>;
    const fechaPago = texto(datos.fechaPago, "la fecha del pago", 10, true)!;
    if (!fechaValida(fechaPago) || fechaPago > fechaActualPeru()) throw new BadRequestException("Indica una fecha de pago válida que no sea futura.");
    const importe = typeof datos.importePagado === "number" ? datos.importePagado : Number(datos.importePagado);
    if (!Number.isFinite(importe) || importe <= 0 || Number(importe.toFixed(2)) !== importe) throw new BadRequestException("El pago debe ser mayor que cero y tener hasta dos decimales.");
    const medioPago = texto(datos.medioPago, "el medio de pago", 30, true)!;
    if (!(mediosPago as readonly string[]).includes(medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    const cuentaFinancieraId = await validarCuentaFinanciera(datos.cuentaFinancieraId, medioPago, true);
    const claveIdempotencia = texto(datos.claveIdempotencia, "la clave de idempotencia", 36, true)!;
    if (!uuid.test(claveIdempotencia)) throw new BadRequestException("La clave de idempotencia no es válida.");
    return db.transaction(async (tx) => {
      const [egreso] = await tx.select({ id: egresosRegistros.id, monto: egresosRegistros.monto, moneda: egresosRegistros.moneda, fecha: egresosRegistros.fecha })
        .from(egresosRegistros).where(eq(egresosRegistros.id, idEntrada)).for("update").limit(1);
      if (!egreso) throw new NotFoundException("No se encontró el egreso indicado.");
      const [duplicado] = await tx.select({ id: egresosPagos.id, egresoId: egresosPagos.egresoId, fechaPago: egresosPagos.fechaPago,
        importePagado: egresosPagos.importePagado, medioPago: egresosPagos.medioPago, cuentaFinancieraId: egresosPagos.cuentaFinancieraId, claveIdempotencia: egresosPagos.claveIdempotencia })
        .from(egresosPagos).where(eq(egresosPagos.claveIdempotencia, claveIdempotencia)).limit(1);
      if (duplicado) {
        if (duplicado.egresoId !== idEntrada || Number(duplicado.importePagado) !== importe || duplicado.fechaPago !== fechaPago || duplicado.medioPago !== medioPago || duplicado.cuentaFinancieraId !== cuentaFinancieraId) throw new ConflictException("La clave de pago ya fue usada con otros datos.");
        return duplicado;
      }
      const [suma] = await tx.select({ total: sql<string>`coalesce(sum(${egresosPagos.importePagado}), 0)::numeric(14,2)` })
        .from(egresosPagos).where(eq(egresosPagos.egresoId, idEntrada));
      const saldo = Number(egreso.monto) - Number(suma?.total ?? 0);
      if (importe > saldo + 0.001) throw new BadRequestException(`El pago supera el saldo pendiente de ${egreso.moneda} ${Math.max(0, saldo).toFixed(2)}.`);
      if (fechaPago < egreso.fecha) throw new BadRequestException("La fecha del pago no puede ser anterior al egreso.");
      const [pago] = await tx.insert(egresosPagos).values({ egresoId: idEntrada, fechaPago, importePagado: importe.toFixed(2),
        medioPago, cuentaFinancieraId, claveIdempotencia, usuarioId }).returning({ id: egresosPagos.id, egresoId: egresosPagos.egresoId,
        fechaPago: egresosPagos.fechaPago, importePagado: egresosPagos.importePagado, medioPago: egresosPagos.medioPago, cuentaFinancieraId: egresosPagos.cuentaFinancieraId });
      return pago;
    });
  }

  private async obtenerRegistro(id: string) {
    const [registro] = await db.select({ id: egresosRegistros.id, codigo: egresosRegistros.codigo,
      tipo: egresosRegistros.tipo, fecha: egresosRegistros.fecha, categoria: egresosRegistros.categoria,
      concepto: egresosRegistros.concepto, beneficiario: egresosRegistros.beneficiario, proveedorRuc: egresosRegistros.proveedorRuc,
      documentoTipo: egresosRegistros.documentoTipo, documentoNumero: egresosRegistros.documentoNumero,
      moneda: egresosRegistros.moneda, medioPago: egresosRegistros.medioPago, monto: egresosRegistros.monto,
      identificadorActivo: egresosRegistros.identificadorActivo,
      mototaxiMarca: egresosRegistros.mototaxiMarca, mototaxiModelo: egresosRegistros.mototaxiModelo,
      mototaxiNumeroMotor: egresosRegistros.mototaxiNumeroMotor, mototaxiNumeroChasis: egresosRegistros.mototaxiNumeroChasis,
      observacion: egresosRegistros.observacion,
      creadoEn: egresosRegistros.creadoEn }).from(egresosRegistros).where(eq(egresosRegistros.id, id)).limit(1);
    if (!registro) throw new NotFoundException("No se encontró el egreso recién registrado.");
    return registro;
  }
}
