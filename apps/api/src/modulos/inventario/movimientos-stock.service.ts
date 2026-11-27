import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, ilike, or, sql, inArray } from "drizzle-orm";
import { lineaRepuestoVigente } from "./compras-vigentes.sql";
import { db, entradasStock, entradasStockDetalle, ingresos, marcasProductos, movimientosStock, productos, productosCodigos, saldosStock, unidadesMedida, usuarios } from "@magina/database";

const motivosAjuste = ["INVENTARIO_FISICO", "MERMA", "DANIO", "PERDIDA", "DEVOLUCION", "CORRECCION", "OTRO"] as const;
const tiposMovimiento = ["ENTRADA", "SALIDA", "AJUSTE"] as const;
type DatosAjuste = { productoId?: unknown; sentido?: unknown; cantidad?: unknown; cantidadContada?: unknown; saldoEsperado?: unknown; motivo?: unknown; observacion?: unknown };

function cantidadValida(valor: unknown, minimo = 0.001) {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(numero) || numero < minimo || numero >= 1_000_000_000_000 || Number(numero.toFixed(3)) !== numero) throw new BadRequestException(minimo ? "Ingresa una cantidad mayor que cero con hasta 3 decimales." : "Ingresa una cantidad igual o mayor que cero con hasta 3 decimales.");
  return numero;
}

function motivoValido(valor: unknown): typeof motivosAjuste[number] {
  if (typeof valor !== "string" || !motivosAjuste.includes(valor as typeof motivosAjuste[number])) throw new BadRequestException("Selecciona un motivo válido para el ajuste.");
  return valor as typeof motivosAjuste[number];
}

@Injectable()
export class ServicioMovimientosStock {
  async buscarProductos(busquedaEntrada?: string) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    if (busqueda.length < 2) return [];
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    return db.select({
      id: productos.id,
      codigo: productos.codigoInterno,
      nombre: productos.nombre,
      marca: marcasProductos.nombre,
      unidadCodigo: productos.unidadBaseCodigo,
      unidad: unidadesMedida.nombre,
      cantidadActual: sql<string>`coalesce(${saldosStock.cantidad}, '0')`,
    }).from(productos)
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
      .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
      .where(and(eq(productos.activo, true), or(
        ilike(productos.nombre, coincidencia), ilike(productos.codigoInterno, coincidencia),
        ilike(marcasProductos.nombre, coincidencia),
        exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), ilike(productosCodigos.codigo, coincidencia)))),
      )))
      .orderBy(asc(productos.nombre)).limit(10);
  }

  async listar(filtros: { pagina?: string; porPagina?: string; busqueda?: string; tipo?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const solicitado = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(solicitado) ? solicitado : 10;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const tipo = filtros.tipo && tiposMovimiento.includes(filtros.tipo as typeof tiposMovimiento[number]) ? filtros.tipo : "";
    const condicion = and(
      tipo ? eq(movimientosStock.tipo, tipo) : undefined,
      coincidencia ? or(
        ilike(productos.nombre, coincidencia), ilike(productos.codigoInterno, coincidencia),
        ilike(movimientosStock.origenTipo, coincidencia), ilike(movimientosStock.motivo, coincidencia),
        ilike(movimientosStock.observacion, coincidencia), ilike(entradasStock.codigo, coincidencia),
        ilike(entradasStock.numeroDocumento, coincidencia), ilike(ingresos.codigo, coincidencia),
      ) : undefined,
    );
    const [items, [total]] = await Promise.all([
      db.select({
        id: movimientosStock.id, tipo: movimientosStock.tipo, sentido: movimientosStock.sentido,
        motivo: movimientosStock.motivo, observacion: movimientosStock.observacion,
        origenTipo: movimientosStock.origenTipo, origenId: movimientosStock.origenId,
        cantidadBase: movimientosStock.cantidadBase, costoUnitarioBase: movimientosStock.costoUnitarioBase,
        saldoAnterior: movimientosStock.saldoAnterior, saldoFinal: movimientosStock.saldoFinal, usuario: usuarios.nombreUsuario,
        creadoEn: movimientosStock.creadoEn, productoId: productos.id,
        producto: productos.nombre, codigo: productos.codigoInterno,
        unidad: unidadesMedida.nombre, unidadCodigo: unidadesMedida.codigo,
        documentoOrigen: sql<string | null>`coalesce(${entradasStock.codigo}, ${ingresos.codigo})`,
      }).from(movimientosStock)
        .innerJoin(usuarios, eq(usuarios.id, movimientosStock.usuarioId))
        .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
        .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
        .leftJoin(entradasStock, and(inArray(movimientosStock.origenTipo, ["ENTRADA_STOCK", "ANULACION_ENTRADA", "EDICION_ENTRADA"]), eq(movimientosStock.origenId, entradasStock.id)))
        .leftJoin(ingresos, and(inArray(movimientosStock.origenTipo, ["INGRESO", "ANULACION_INGRESO"]), eq(movimientosStock.origenId, ingresos.id)))
        .where(condicion).orderBy(desc(movimientosStock.creadoEn), desc(movimientosStock.id)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(movimientosStock)
        .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
        .leftJoin(entradasStock, and(inArray(movimientosStock.origenTipo, ["ENTRADA_STOCK", "ANULACION_ENTRADA", "EDICION_ENTRADA"]), eq(movimientosStock.origenId, entradasStock.id)))
        .leftJoin(ingresos, and(inArray(movimientosStock.origenTipo, ["INGRESO", "ANULACION_INGRESO"]), eq(movimientosStock.origenId, ingresos.id)))
        .where(condicion),
    ]);
    const numeroTotal = Number(total?.total ?? 0);
    const totalPaginas = Math.max(1, Math.ceil(numeroTotal / porPagina));
    return { items, total: numeroTotal, pagina: Math.min(pagina, totalPaginas), porPagina, totalPaginas };
  }

  async crearAjuste(valor: unknown, usuarioId: string) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del ajuste no son válidos.");
    const datos = valor as DatosAjuste;
    if (typeof datos.productoId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(datos.productoId)) throw new BadRequestException("Selecciona un producto válido.");
    const porConteo = datos.cantidadContada !== undefined;
    if (!porConteo && datos.sentido !== "INGRESO" && datos.sentido !== "RETIRO") throw new BadRequestException("Selecciona si el ajuste suma o resta stock.");
    const cantidad = porConteo ? cantidadValida(datos.cantidadContada, 0) : cantidadValida(datos.cantidad);
    const saldoEsperado = datos.saldoEsperado;
    if (saldoEsperado !== undefined && (typeof saldoEsperado !== "string" || !/^\d{1,12}(\.\d{1,6})?$/.test(saldoEsperado))) throw new BadRequestException("El saldo de referencia no es válido.");
    const motivo = motivoValido(datos.motivo);
    if (datos.observacion !== undefined && datos.observacion !== null && (typeof datos.observacion !== "string" || datos.observacion.length > 1000)) throw new BadRequestException("La observación no puede superar los 1000 caracteres.");
    const observacion = typeof datos.observacion === "string" ? datos.observacion.trim() || null : null;

    return db.transaction(async (tx) => {
      const [producto] = await tx.select({ id: productos.id }).from(productos).where(and(eq(productos.id, datos.productoId as string), eq(productos.activo, true))).limit(1);
      if (!producto) throw new NotFoundException("El producto no existe o está inactivo.");
      await tx.insert(saldosStock).values({ productoId: producto.id, cantidad: "0" }).onConflictDoNothing();
      const [saldo] = await tx.select({
        cantidad: saldosStock.cantidad,
        referenciaValida: saldoEsperado === undefined ? sql<boolean>`true` : sql<boolean>`${saldosStock.cantidad} = ${saldoEsperado}::numeric`,
      }).from(saldosStock).where(eq(saldosStock.productoId, producto.id)).for("update");
      if (!saldo.referenciaValida) throw new ConflictException("El saldo cambió. Selecciona nuevamente el repuesto y revisa el ajuste.");
      const cantidadSolicitada = cantidad.toFixed(6);
      const nuevoSaldo = porConteo ? sql`${cantidadSolicitada}::numeric`
        : datos.sentido === "INGRESO" ? sql`${saldosStock.cantidad} + ${cantidadSolicitada}::numeric`
        : sql`${saldosStock.cantidad} - ${cantidadSolicitada}::numeric`;
      const [actualizado] = await tx.update(saldosStock).set({ cantidad: nuevoSaldo, actualizadoEn: new Date() })
        .where(and(eq(saldosStock.productoId, producto.id), sql`${nuevoSaldo} >= 0 and ${nuevoSaldo} < 1000000000000`))
        .returning({ cantidad: saldosStock.cantidad, diferencia: sql<string>`(${saldosStock.cantidad} - ${saldo.cantidad}::numeric)::text` });
      if (!actualizado) throw new BadRequestException("El saldo resultante está fuera del rango permitido.");
      if (Number(actualizado.diferencia) === 0) throw new BadRequestException("El conteo coincide con el saldo actual del repuesto.");
      const sentido = actualizado.diferencia.startsWith("-") ? "RETIRO" : "INGRESO";
      const cantidadBase = actualizado.diferencia.replace(/^-/, "");
      const [costo] = await tx.select({ valor: sql<string>`coalesce(sum(${entradasStockDetalle.cantidadBase} * ${entradasStockDetalle.costoUnitario} / nullif(${entradasStockDetalle.factorAUnidadBase}, 0)) / nullif(sum(${entradasStockDetalle.cantidadBase}), 0), 0)::numeric(14,6)` })
        .from(entradasStockDetalle).where(and(eq(entradasStockDetalle.productoId, producto.id), lineaRepuestoVigente));
      const origenId = randomUUID();
      const detalleId = randomUUID();
      const [movimiento] = await tx.insert(movimientosStock).values({
        productoId: producto.id, tipo: "AJUSTE", origenTipo: "AJUSTE_STOCK", origenId,
        origenDetalleId: detalleId, cantidadBase, costoUnitarioBase: costo?.valor ?? "0",
        sentido, motivo, observacion, usuarioId, saldoAnterior: saldo.cantidad, saldoFinal: actualizado.cantidad,
      }).returning({ id: movimientosStock.id, productoId: movimientosStock.productoId, tipo: movimientosStock.tipo,
        sentido: movimientosStock.sentido, motivo: movimientosStock.motivo, observacion: movimientosStock.observacion,
        cantidadBase: movimientosStock.cantidadBase, creadoEn: movimientosStock.creadoEn });
      return { ...movimiento, saldoFinal: actualizado.cantidad };
    });
  }
}
