import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db, clientes, entradasStockDetalle, garantiasVentasMototaxis, guiasRemision, ingresos, ingresosDetalle, ingresosEdiciones, ingresosPagos, marcasProductos, modelosMototaxis, movimientosStock, ordenesServicio, personas, productos, productosPresentaciones, reclamosGarantiaMototaxis, saldosStock, tiposDocumento } from "@magina/database";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";
import { lineaRepuestoVigente } from "../inventario/compras-vigentes.sql";
import { ServicioAlmacenamiento } from "../almacenamiento/almacenamiento.service";
import { bloquearModelos, moverSaldoModelo, precioVigenteModelo } from "../mototaxis/inventario-modelos";
import { uuidValido } from "./ingresos.service";
import {
  calcularDeltasConsumo, calcularLineaNota, huellaNotaVenta, normalizarSolicitudEdicion, planificarPagos, resumirCambios, sumarTotales, validarNotaEditable,
  type AfectacionNota, type LineaSnapshot, type LineaSolicitada, type SnapshotNota, type TipoLineaNota,
} from "./nota-venta-edicion.util";

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Ejecutor = typeof db | Transaccion;
type Venta = typeof ingresos.$inferSelect;
type Detalle = typeof ingresosDetalle.$inferSelect;

type LineaResuelta = {
  id: string; existente: Detalle | undefined; tipo: TipoLineaNota; productoId: string | null; mototaxiModeloId: string | null; presentacionId: string | null;
  codigoProducto: string | null; descripcion: string; presentacion: string | null; unidadMedidaCodigo: string | null; cantidad: number;
  factor: string | null; cantidadBase: string | null; precioUnitario: number; descuento: number; afectacionIgv: AfectacionNota;
  subtotal: number; igv: number; total: number;
};

const estadosGuiaRechazada = ["ERROR_NUBEFACT", "ERROR_SUNAT", "RECHAZADO_SUNAT"];
const tipoDocumentoCliente: Record<string, string> = { "01": "DNI", "06": "RUC", "04": "CE", "07": "PASAPORTE" };

function snapshotDesdeBd(venta: Venta, detalles: Detalle[]): SnapshotNota {
  return {
    fecha: venta.fecha, clienteId: venta.clienteId, medioPago: venta.medioPago, observacion: venta.observacion,
    subtotal: venta.subtotal, igv: venta.igv, total: venta.total,
    detalles: detalles.map((detalle) => ({
      id: detalle.id, tipo: detalle.tipo, presentacionId: detalle.presentacionId, mototaxiModeloId: detalle.mototaxiModeloId, descripcion: detalle.descripcion,
      cantidad: Number(detalle.cantidad).toFixed(3), precioUnitario: Number(detalle.precioUnitario).toFixed(4), descuento: Number(detalle.descuento).toFixed(2), afectacionIgv: detalle.afectacionIgv,
    })),
  };
}

function lineaSnapshot(linea: LineaResuelta): LineaSnapshot {
  return { id: linea.existente ? linea.id : null, tipo: linea.tipo, presentacionId: linea.presentacionId, mototaxiModeloId: linea.mototaxiModeloId, descripcion: linea.descripcion,
    cantidad: linea.cantidad.toFixed(3), precioUnitario: linea.precioUnitario.toFixed(4), descuento: linea.descuento.toFixed(2), afectacionIgv: linea.afectacionIgv };
}

@Injectable()
export class ServicioNotaVentaEdicion {
  constructor(private readonly almacenamiento: ServicioAlmacenamiento) {}

  /** Datos para precargar el editor: la nota, sus líneas, qué líneas están bloqueadas y si hoy se puede editar. */
  async obtener(idEntrada: string) {
    if (!uuidValido(idEntrada)) throw new BadRequestException("La nota de venta no es válida.");
    const contexto = await this.cargarContexto(db, idEntrada, false);
    const { venta, detalles, bloqueos, pagado } = contexto;
    let motivoNoEditable: string | null = null;
    try { await this.validarEditable(db, contexto); } catch (error) { motivoNoEditable = error instanceof Error ? error.message : "No se puede editar."; }
    return {
      id: venta.id, codigo: venta.codigo, fecha: venta.fecha, tipoComprobante: venta.tipoComprobante, estado: venta.estado, clienteId: venta.clienteId, clienteNombre: venta.clienteNombre,
      clienteTipoDocumento: venta.clienteTipoDocumento, clienteNumeroDocumento: venta.clienteNumeroDocumento, medioPago: venta.medioPago, observacion: venta.observacion,
      subtotal: venta.subtotal, igv: venta.igv, total: venta.total, importePagado: pagado.toFixed(2),
      versionDocumento: huellaNotaVenta(snapshotDesdeBd(venta, detalles)), editable: motivoNoEditable === null, motivoNoEditable,
      detalles: detalles.map((detalle) => ({
        id: detalle.id, tipo: detalle.tipo, presentacionId: detalle.presentacionId, mototaxiModeloId: detalle.mototaxiModeloId, codigoProducto: detalle.codigoProducto,
        descripcion: detalle.descripcion, presentacion: detalle.presentacion, cantidad: detalle.cantidad, precioUnitario: detalle.precioUnitario, descuento: detalle.descuento,
        afectacionIgv: detalle.afectacionIgv, total: detalle.total, bloqueo: bloqueos.get(detalle.id) ?? null,
      })),
    };
  }

  async editar(idEntrada: string, valor: unknown, usuarioId: string) {
    if (!uuidValido(idEntrada)) throw new BadRequestException("La nota de venta no es válida.");
    const solicitud = normalizarSolicitudEdicion(valor);
    const resultado = await db.transaction(async (tx) => {
      const contexto = await this.cargarContexto(tx, idEntrada, true);
      const { venta, detalles, bloqueos, pagos } = contexto;
      await this.validarEditable(tx, contexto);
      const antes = snapshotDesdeBd(venta, detalles);
      if (solicitud.versionDocumento && solicitud.versionDocumento !== huellaNotaVenta(antes)) throw new ConflictException("La nota de venta cambió mientras la editabas. Vuelve a abrirla para ver los datos actuales.");

      const fecha = solicitud.fecha ?? venta.fecha;
      if (fecha !== venta.fecha && bloqueos.size > 0) throw new ConflictException("No se puede cambiar la fecha: hay mototaxis con garantía aplicada desde la fecha actual de la venta.");
      const cliente = await this.resolverCliente(tx, venta, solicitud.clienteId);
      const lineas = await this.resolverLineas(tx, detalles, bloqueos, solicitud.detalles);
      const totales = sumarTotales(lineas);
      const despues: SnapshotNota = {
        fecha, clienteId: cliente.clienteId, medioPago: solicitud.medioPago ?? venta.medioPago,
        observacion: solicitud.observacion === undefined ? venta.observacion : solicitud.observacion,
        subtotal: totales.subtotal.toFixed(2), igv: totales.igv.toFixed(2), total: totales.total.toFixed(2), detalles: lineas.map(lineaSnapshot),
      };
      const cambios = resumirCambios(antes, despues);
      if (cambios.length === 0) return { cambios, sinCambios: true, efectos: {}, idVenta: venta.id };

      // Efecto monetario: pagos ya aplicados frente al nuevo total (antes de tocar inventario para fallar rápido).
      const planPagos = planificarPagos(pagos.map((pago) => ({ id: pago.id, importe: Number(pago.importeAplicado) })), totales.total, solicitud.confirmarDevolucionExceso);

      // Efecto de inventario: solo la diferencia por producto y por modelo.
      const lineasProducto = lineas.filter((linea) => linea.tipo === "PRODUCTO" && linea.productoId && linea.cantidadBase);
      const deltasProducto = calcularDeltasConsumo(
        detalles.flatMap((detalle) => detalle.tipo === "PRODUCTO" && detalle.productoId && detalle.cantidadBase ? [{ clave: detalle.productoId, cantidad: detalle.cantidadBase }] : []),
        lineasProducto.map((linea) => ({ clave: linea.productoId!, cantidad: linea.cantidadBase! })));
      const deltasModelo = calcularDeltasConsumo(
        detalles.flatMap((detalle) => detalle.tipo === "MOTOTAXI" && detalle.mototaxiModeloId ? [{ clave: detalle.mototaxiModeloId, cantidad: detalle.cantidad }] : []),
        lineas.flatMap((linea) => linea.tipo === "MOTOTAXI" && linea.mototaxiModeloId ? [{ clave: linea.mototaxiModeloId, cantidad: linea.cantidad }] : []));

      const nombresProducto = new Map<string, string>();
      for (const linea of lineas) if (linea.productoId) nombresProducto.set(linea.productoId, `${linea.descripcion}${linea.presentacion ? ` (${linea.presentacion})` : ""}`);
      for (const detalle of detalles) if (detalle.productoId && !nombresProducto.has(detalle.productoId)) nombresProducto.set(detalle.productoId, detalle.descripcion);
      const origenesModelo = new Map<string, string>();
      if (deltasModelo.size) await bloquearModelos(tx, [...deltasModelo.keys()]);
      for (const [productoId, delta] of deltasProducto) await this.moverStockProducto(tx, productoId, delta, nombresProducto.get(productoId) ?? "el repuesto");
      for (const [modeloId, delta] of deltasModelo) {
        // El índice único (tipo, origen) del movimiento pide un origen propio por ajuste; la auditoría lo conserva en `efectos`.
        const origenId = randomUUID();
        origenesModelo.set(modeloId, origenId);
        await moverSaldoModelo(tx, { modeloId, tipo: delta > 0 ? "VENTA" : "ANULACION_VENTA", origenId, diferencia: -delta, usuarioId });
      }
      await this.sincronizarMovimientos(tx, venta.id, lineasProducto, usuarioId);

      const idsConservados = new Set(lineas.map((linea) => linea.id));
      const idsEliminados = detalles.filter((detalle) => !idsConservados.has(detalle.id)).map((detalle) => detalle.id);
      if (idsEliminados.length) await tx.delete(ingresosDetalle).where(inArray(ingresosDetalle.id, idsEliminados));
      for (const linea of lineas) {
        const valores = {
          tipo: linea.tipo, productoId: linea.productoId, mototaxiModeloId: linea.mototaxiModeloId, presentacionId: linea.presentacionId, codigoProducto: linea.codigoProducto,
          descripcion: linea.descripcion, presentacion: linea.presentacion, unidadMedidaCodigo: linea.unidadMedidaCodigo, cantidad: linea.cantidad.toFixed(3),
          factorAUnidadBase: linea.factor, cantidadBase: linea.cantidadBase, precioUnitario: linea.precioUnitario.toFixed(4), descuento: linea.descuento.toFixed(2),
          afectacionIgv: linea.afectacionIgv, afectoIgv: linea.afectacionIgv === "GRAVADO", subtotal: linea.subtotal.toFixed(2), igv: linea.igv.toFixed(2), total: linea.total.toFixed(2),
        };
        if (linea.existente) await tx.update(ingresosDetalle).set(valores).where(eq(ingresosDetalle.id, linea.id));
        else await tx.insert(ingresosDetalle).values({ ...valores, id: linea.id, ingresoId: venta.id });
      }

      for (const ajuste of planPagos.ajustes) {
        if (ajuste.importe > 0) await tx.update(ingresosPagos).set({ importeAplicado: ajuste.importe.toFixed(2), importeRecibido: ajuste.importe.toFixed(2) }).where(eq(ingresosPagos.id, ajuste.id));
        else await tx.delete(ingresosPagos).where(eq(ingresosPagos.id, ajuste.id));
      }
      await tx.update(ingresos).set({
        fecha, clienteId: cliente.clienteId, clienteTipoDocumento: cliente.tipoDocumento, clienteNumeroDocumento: cliente.numeroDocumento, clienteNombre: cliente.nombre,
        clienteDireccion: cliente.direccion, medioPago: despues.medioPago, observacion: despues.observacion,
        subtotal: despues.subtotal, igv: despues.igv, total: despues.total,
      }).where(eq(ingresos.id, venta.id));
      const efectos = {
        stockProductos: [...deltasProducto].map(([productoId, delta]) => ({ productoId, consumoAdicionalBase: delta })),
        stockModelos: [...deltasModelo].map(([modeloId, delta]) => ({ modeloId, unidadesAdicionales: delta, movimientoOrigenId: origenesModelo.get(modeloId) })),
        pagos: { pagadoAntes: planPagos.pagado, devuelto: planPagos.devuelto, ajustes: planPagos.ajustes },
      };
      await tx.insert(ingresosEdiciones).values({ ingresoId: venta.id, usuarioId, cambios, antes, despues, efectos });
      return { cambios, sinCambios: false, efectos, idVenta: venta.id };
    });
    if (!resultado.sinCambios) await this.reArchivar(resultado.idVenta);
    return { sinCambios: resultado.sinCambios, cambios: resultado.cambios, efectos: resultado.efectos, nota: await this.obtener(resultado.idVenta) };
  }

  private async cargarContexto(ejecutor: Ejecutor, id: string, bloquear: boolean) {
    const consulta = ejecutor.select().from(ingresos).where(eq(ingresos.id, id)).limit(1);
    const [venta] = bloquear ? await consulta.for("update") : await consulta;
    if (!venta) throw new NotFoundException("No se encontró la nota de venta.");
    const detalles = await ejecutor.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, id)).orderBy(asc(ingresosDetalle.creadoEn), asc(ingresosDetalle.id));
    const pagos = await ejecutor.select({ id: ingresosPagos.id, importeAplicado: ingresosPagos.importeAplicado }).from(ingresosPagos).where(eq(ingresosPagos.ingresoId, id)).orderBy(asc(ingresosPagos.fechaPago), asc(ingresosPagos.creadoEn), asc(ingresosPagos.id));
    const bloqueos = new Map<string, string>();
    const ids = detalles.map((detalle) => detalle.id);
    if (ids.length) {
      const garantias = await ejecutor.select({ id: garantiasVentasMototaxis.ingresoDetalleId }).from(garantiasVentasMototaxis).where(inArray(garantiasVentasMototaxis.ingresoDetalleId, ids));
      const reclamos = await ejecutor.select({ id: reclamosGarantiaMototaxis.ingresoDetalleId }).from(reclamosGarantiaMototaxis).where(inArray(reclamosGarantiaMototaxis.ingresoDetalleId, ids));
      for (const { id: detalleId } of garantias) bloqueos.set(detalleId, "Tiene una garantía aplicada.");
      for (const { id: detalleId } of reclamos) if (detalleId) bloqueos.set(detalleId, "Tiene un reclamo de garantía registrado.");
    }
    for (const detalle of detalles) if (detalle.mototaxiUnidadId) bloqueos.set(detalle.id, "Ya tiene una unidad física asignada.");
    return { venta, detalles, pagos, bloqueos, pagado: pagos.reduce((total, pago) => total + Number(pago.importeAplicado), 0) };
  }

  /** Condiciones de estado de la nota: boletas/facturas y notas anuladas quedan fuera; también las ligadas a órdenes o guías vigentes. */
  private async validarEditable(ejecutor: Ejecutor, contexto: { venta: Venta }) {
    const { venta } = contexto;
    validarNotaEditable(venta);
    const [orden] = await ejecutor.select({ codigo: ordenesServicio.codigo }).from(ordenesServicio).where(eq(ordenesServicio.ingresoId, venta.id)).limit(1);
    if (orden) throw new ConflictException(`La nota nació de la orden de servicio ${orden.codigo}, con sus adelantos y saldos propios: no se edita desde aquí.`);
    const [guia] = await ejecutor.select({ id: guiasRemision.id }).from(guiasRemision)
      .where(and(eq(guiasRemision.ingresoId, venta.id), sql`${guiasRemision.estado} not in (${sql.join(estadosGuiaRechazada.map((estado) => sql`${estado}`), sql`, `)})`)).limit(1);
    if (guia) throw new ConflictException("La nota ya tiene una guía de remisión vigente: los artículos no pueden cambiar.");
  }

  private async resolverCliente(tx: Transaccion, venta: Venta, clienteId?: string) {
    if (!clienteId || clienteId === venta.clienteId) {
      return { clienteId: venta.clienteId, tipoDocumento: venta.clienteTipoDocumento, numeroDocumento: venta.clienteNumeroDocumento, nombre: venta.clienteNombre, direccion: venta.clienteDireccion };
    }
    const [cliente] = await tx.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento, nombres: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno, razonSocial: personas.razonSocial, direccion: clientes.direccionFiscal })
      .from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(and(eq(clientes.personaId, clienteId), eq(clientes.activo, true), eq(personas.activo, true))).limit(1);
    if (!cliente) throw new NotFoundException("El cliente ya no está activo. Vuelve a buscarlo.");
    return { clienteId: cliente.id, tipoDocumento: tipoDocumentoCliente[cliente.tipoDocumento] ?? cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento,
      nombre: cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" "), direccion: cliente.direccion };
  }

  private async resolverLineas(tx: Transaccion, detalles: Detalle[], bloqueos: Map<string, string>, solicitadas: LineaSolicitada[]) {
    const previas = new Map(detalles.map((detalle) => [detalle.id, detalle]));
    const porcentajeMaximo = validarConfiguracionEntorno().descuentoMaximoPorcentaje;
    const resueltas: LineaResuelta[] = [];
    for (const [indice, linea] of solicitadas.entries()) {
      const existente = linea.id ? previas.get(linea.id) : undefined;
      if (linea.id && !existente) throw new BadRequestException(`La línea ${indice + 1} no pertenece a esta nota de venta.`);
      if (existente && existente.tipo !== linea.tipo) throw new BadRequestException(`La línea ${indice + 1} no puede cambiar de tipo: elimínala y agrega una nueva.`);
      const bloqueo = existente ? bloqueos.get(existente.id) : undefined;
      let base: Omit<LineaResuelta, "subtotal" | "igv" | "total">;
      if (linea.tipo === "PRODUCTO") {
        const mismaPresentacion = existente?.presentacionId === linea.presentacionId;
        const [fila] = await tx.select({ productoId: productos.id, codigo: productos.codigoInterno, nombre: productos.nombre, activoProducto: productos.activo, presentacionId: productosPresentaciones.id,
          presentacion: productosPresentaciones.nombre, unidadCodigo: productosPresentaciones.unidadMedidaCodigo, factor: productosPresentaciones.factorAUnidadBase,
          activa: productosPresentaciones.activo, seVende: productosPresentaciones.seVende })
          .from(productosPresentaciones).innerJoin(productos, eq(productosPresentaciones.productoId, productos.id)).where(eq(productosPresentaciones.id, linea.presentacionId!)).limit(1);
        if (!fila) throw new NotFoundException(`El repuesto de la línea ${indice + 1} no existe.`);
        if (!mismaPresentacion && (!fila.activoProducto || !fila.activa || !fila.seVende)) throw new NotFoundException(`El repuesto ${fila.nombre} ya no está disponible para la venta.`);
        const precio = linea.precioUnitario ?? (mismaPresentacion ? Number(existente!.precioUnitario) : undefined);
        if (precio === undefined) throw new BadRequestException(`Indica el precio de ${fila.nombre} en la línea ${indice + 1}.`);
        base = { id: existente?.id ?? randomUUID(), existente, tipo: "PRODUCTO", productoId: fila.productoId, mototaxiModeloId: null, presentacionId: fila.presentacionId, codigoProducto: fila.codigo,
          descripcion: fila.nombre, presentacion: fila.presentacion, unidadMedidaCodigo: fila.unidadCodigo, cantidad: linea.cantidad, factor: fila.factor,
          cantidadBase: Number((linea.cantidad * Number(fila.factor)).toFixed(6)).toFixed(6), precioUnitario: precio, descuento: linea.descuento, afectacionIgv: linea.afectacionIgv };
      } else if (linea.tipo === "MOTOTAXI") {
        const mismoModelo = existente?.mototaxiModeloId === linea.mototaxiModeloId;
        const [modelo] = await tx.select({ id: modelosMototaxis.id, codigo: modelosMototaxis.codigo, nombre: modelosMototaxis.nombre, marca: marcasProductos.nombre, version: modelosMototaxis.version,
          activo: modelosMototaxis.activo, precio: precioVigenteModelo })
          .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).where(eq(modelosMototaxis.id, linea.mototaxiModeloId!)).limit(1);
        if (!modelo) throw new NotFoundException(`El modelo de mototaxi de la línea ${indice + 1} no existe.`);
        const nombreModelo = [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ").slice(0, 240);
        if (!mismoModelo && !modelo.activo) throw new NotFoundException("El modelo de mototaxi ya no está disponible en el catálogo.");
        if (bloqueo && (!mismoModelo || Number(existente!.cantidad) !== linea.cantidad)) throw new ConflictException(`No se puede cambiar el modelo ni la cantidad de ${existente!.descripcion}: ${bloqueo}`);
        const precioGuardado = existente && mismoModelo ? Number(existente.precioUnitario) : undefined;
        const precio = linea.precioUnitario ?? precioGuardado ?? (modelo.precio == null ? undefined : Number(modelo.precio));
        if (precio === undefined || precio <= 0) throw new BadRequestException(`Configura un precio de venta para ${nombreModelo}.`);
        if (precio !== precioGuardado && (modelo.precio == null || Number(modelo.precio) !== precio)) throw new BadRequestException(`El precio de ${nombreModelo} cambió. Vuelve a agregar el modelo para actualizarlo.`);
        base = { id: existente?.id ?? randomUUID(), existente, tipo: "MOTOTAXI", productoId: null, mototaxiModeloId: modelo.id, presentacionId: null, codigoProducto: modelo.codigo,
          descripcion: nombreModelo, presentacion: null, unidadMedidaCodigo: "NIU", cantidad: linea.cantidad, factor: null, cantidadBase: null, precioUnitario: precio,
          descuento: linea.descuento, afectacionIgv: linea.afectacionIgv };
      } else {
        base = { id: existente?.id ?? randomUUID(), existente, tipo: "SERVICIO", productoId: null, mototaxiModeloId: null, presentacionId: null, codigoProducto: null,
          descripcion: linea.descripcion!, presentacion: null, unidadMedidaCodigo: null, cantidad: linea.cantidad, factor: null, cantidadBase: null, precioUnitario: linea.precioUnitario!,
          descuento: linea.descuento, afectacionIgv: linea.afectacionIgv };
      }
      const importes = calcularLineaNota({ cantidad: base.cantidad, precio: base.precioUnitario, descuento: base.descuento, descripcion: base.descripcion, descuentoMaximoPorcentaje: porcentajeMaximo });
      resueltas.push({ ...base, ...importes });
    }
    const conservados = new Set(resueltas.map((linea) => linea.id));
    for (const detalle of detalles) {
      const bloqueo = bloqueos.get(detalle.id);
      if (!conservados.has(detalle.id) && bloqueo) throw new ConflictException(`No se puede quitar ${detalle.descripcion}: ${bloqueo}`);
    }
    return resueltas;
  }

  private async moverStockProducto(tx: Transaccion, productoId: string, delta: number, nombre: string) {
    if (delta > 0) {
      const [saldo] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} - ${delta.toFixed(6)}`, actualizadoEn: new Date() })
        .where(and(eq(saldosStock.productoId, productoId), gte(saldosStock.cantidad, delta.toFixed(6)))).returning({ cantidad: saldosStock.cantidad });
      if (!saldo) throw new ConflictException(`Stock insuficiente para ${nombre}: la edición necesita ${delta.toFixed(3)} unidades más de las que ya se descontaron. No se cambió nada.`);
      return;
    }
    const [devuelto] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} + ${(-delta).toFixed(6)}`, actualizadoEn: new Date() })
      .where(eq(saldosStock.productoId, productoId)).returning({ cantidad: saldosStock.cantidad });
    if (!devuelto) await tx.insert(saldosStock).values({ productoId, cantidad: (-delta).toFixed(6) });
  }

  /** Mantiene un movimiento SALIDA por línea de repuesto (índice único origen/detalle) reflejando la cantidad vigente de la nota. */
  private async sincronizarMovimientos(tx: Transaccion, ingresoId: string, lineasProducto: LineaResuelta[], usuarioId: string) {
    const actuales = await tx.select().from(movimientosStock).where(and(eq(movimientosStock.origenTipo, "INGRESO"), eq(movimientosStock.origenId, ingresoId)));
    const porDetalle = new Map(actuales.map((movimiento) => [movimiento.origenDetalleId, movimiento]));
    const vigentes = new Set(lineasProducto.map((linea) => linea.id));
    const obsoletos = actuales.filter((movimiento) => !vigentes.has(movimiento.origenDetalleId)).map((movimiento) => movimiento.id);
    if (obsoletos.length) await tx.delete(movimientosStock).where(inArray(movimientosStock.id, obsoletos));
    for (const linea of lineasProducto) {
      const previo = porDetalle.get(linea.id);
      if (previo && previo.productoId === linea.productoId) {
        if (Number(previo.cantidadBase) !== Number(linea.cantidadBase)) await tx.update(movimientosStock).set({ cantidadBase: linea.cantidadBase! }).where(eq(movimientosStock.id, previo.id));
        continue;
      }
      if (previo) await tx.delete(movimientosStock).where(eq(movimientosStock.id, previo.id));
      const [costo] = await tx.select({ valor: sql<string>`coalesce(sum(${entradasStockDetalle.cantidadBase} * ${entradasStockDetalle.costoUnitario} / nullif(${entradasStockDetalle.factorAUnidadBase}, 0)) / nullif(sum(${entradasStockDetalle.cantidadBase}), 0), 0)::numeric(14,6)` })
        .from(entradasStockDetalle).where(and(eq(entradasStockDetalle.productoId, linea.productoId!), lineaRepuestoVigente));
      await tx.insert(movimientosStock).values({ productoId: linea.productoId!, tipo: "SALIDA", origenTipo: "INGRESO", origenId: ingresoId, origenDetalleId: linea.id,
        cantidadBase: linea.cantidadBase!, costoUnitarioBase: costo?.valor ?? "0", usuarioId });
    }
  }

  /** El HTML archivado es una copia: se vuelve a generar con los datos vigentes. La representación impresa se arma en vivo. */
  private async reArchivar(id: string) {
    const [venta] = await db.select().from(ingresos).where(and(eq(ingresos.id, id), ne(ingresos.estado, "ANULADO"))).limit(1);
    if (!venta) return;
    const detalles = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, id)).orderBy(asc(ingresosDetalle.creadoEn), asc(ingresosDetalle.id));
    const datos = venta.datosNubefact && typeof venta.datosNubefact === "object" ? venta.datosNubefact : {};
    const previos = ((datos as Record<string, unknown>).archivos as { guardados?: { id: string; tipo: string; nombre: string; ruta: string }[] } | undefined)?.guardados ?? [];
    let archivos: { guardados: { id: string; tipo: string; nombre: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] };
    try {
      const archivo = await this.almacenamiento.archivarDocumentoNotaVenta({ ...venta, detalles });
      archivos = { guardados: [{ id: archivo.id, tipo: "HTML", nombre: archivo.nombre, ruta: archivo.ruta }], errores: [] };
    } catch (causa) {
      archivos = { guardados: previos, errores: [{ tipo: "HTML", mensaje: causa instanceof Error ? causa.message : "No se pudo archivar la nota de venta." }] };
    }
    await db.update(ingresos).set({ datosNubefact: { ...datos, archivos } }).where(eq(ingresos.id, id));
  }
}
