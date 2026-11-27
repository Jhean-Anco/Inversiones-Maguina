import { esViolacionUnicidad } from "../../utilidades/error-postgres";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db, entradasStock, entradasStockDetalle, entradasStockDocumentoDetalle, egresosRegistros, pagosEntradasStock, marcasProductos, movimientosStock, productos, productosCodigos, productosPresentaciones, saldosStock, unidadesMedida, correlativosDocumentosInternos } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { rucPeruValido } from "../../utilidades/ruc-peru";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";

type DetalleEntrada = { productoId?: unknown; presentacionId?: unknown; detalleDocumentoId?: unknown; cantidad?: unknown; costoUnitario?: unknown; importeTotal?: unknown };
type DetalleDocumentoEntrada = { clave?: unknown; codigo?: unknown; descripcion?: unknown; unidad?: unknown; cantidad?: unknown; costoUnitario?: unknown; descuento?: unknown; subtotal?: unknown; total?: unknown };
type DatosEntrada = { claveIdempotencia?: unknown; fecha?: unknown; tipoDocumento?: unknown; numeroDocumento?: unknown; proveedor?: unknown; proveedorTipoPersona?: unknown; proveedorTipoDocumento?: unknown; proveedorNumeroDocumento?: unknown; proveedorDireccion?: unknown; medioPago?: unknown; cuentaFinancieraId?: unknown; montoPagado?: unknown; pagos?: unknown; totalDocumento?: unknown; detallesDocumento?: unknown; observacion?: unknown; detalles?: unknown };
const tiposDocumento = ["FACTURA", "BOLETA", "GUIA_REMISION", "NOTA", "SIN_DOCUMENTO"] as const;
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DatosPreparados = Awaited<ReturnType<ServicioEntradasStock["prepararDatos"]>>;
type ProductosValidados = Awaited<ReturnType<ServicioEntradasStock["validarProductos"]>>["productosValidados"];
const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;

function texto(valor: unknown, etiqueta: string, maximo: number, opcional = false) {
  if (opcional && (valor === undefined || valor === null || valor === "")) return null;
  if (typeof valor !== "string" || valor.trim().length > maximo || (!opcional && !valor.trim())) throw new BadRequestException(`${etiqueta} no es válido.`);
  return valor.trim() || null;
}
function uuid(valor: unknown, etiqueta: string) {
  if (typeof valor !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) throw new BadRequestException(`${etiqueta} no es válido.`);
  return valor;
}
function decimal(valor: unknown, etiqueta: string, escala: number, minimo: number) {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(numero) || numero < minimo || Number(numero.toFixed(escala)) !== numero) throw new BadRequestException(`${etiqueta} debe ser un número válido con hasta ${escala} decimales.`);
  return numero;
}
function motivoAnulacion(datos: unknown) {
  const motivo = typeof datos === "object" && datos !== null && !Array.isArray(datos) ? (datos as { motivo?: unknown }).motivo : undefined;
  if (typeof motivo !== "string" || motivo.trim().length < 5 || motivo.trim().length > 500) throw new BadRequestException("Indica el motivo de la anulación (entre 5 y 500 caracteres).");
  return motivo.trim();
}
function fechaValida(valor: unknown) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestException("Indica una fecha válida para la entrada.");
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) throw new BadRequestException("La fecha de entrada no existe.");
  return valor;
}
@Injectable()
export class ServicioEntradasStock {
  async buscarProductos(busquedaEntrada?: string) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    if (busqueda.length < 4) return [];
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const filas = await db.select({
      productoId: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre,
      marca: marcasProductos.nombre,
      presentacionId: productosPresentaciones.id, presentacion: productosPresentaciones.nombre,
      unidadMedidaCodigo: productosPresentaciones.unidadMedidaCodigo, unidadMedida: unidadesMedida.nombre,
      factorAUnidadBase: productosPresentaciones.factorAUnidadBase,
    }).from(productosPresentaciones)
      .innerJoin(productos, eq(productosPresentaciones.productoId, productos.id))
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
      .where(and(
        eq(productos.activo, true), eq(productosPresentaciones.activo, true), eq(productosPresentaciones.seCompra, true),
        or(
          ilike(productos.nombre, coincidencia), ilike(productos.descripcion, coincidencia),
          ilike(productos.codigoInterno, coincidencia), ilike(marcasProductos.nombre, coincidencia),
          exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), ilike(productosCodigos.codigo, coincidencia)))),
        ),
      )).orderBy(asc(productos.nombre), asc(productosPresentaciones.esBase)).limit(10);
    return filas;
  }

  async listar(filtros: { pagina?: string; porPagina?: string; busqueda?: string; estadoPago?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const solicitados = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(solicitados) ? solicitados : 10;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condicion = coincidencia ? or(ilike(entradasStock.codigo, coincidencia), ilike(entradasStock.proveedor, coincidencia), ilike(entradasStock.numeroDocumento, coincidencia), ilike(entradasStock.proveedorNumeroDocumento, coincidencia)) : undefined;
    const estadoPago = filtros.estadoPago === "PAGADAS" || filtros.estadoPago === "PENDIENTES" || filtros.estadoPago === "ANULADAS" ? filtros.estadoPago : "TODAS";
    const totalCompra = sql`coalesce(${entradasStock.totalDocumento}, ${entradasStock.total})`;
    const montoPagado = sql`coalesce(${entradasStock.montoPagado}, 0)`;
    // Una compra anulada nunca cuenta como pagada ni como pendiente: sale de las pestañas de pago y tiene la suya.
    const vigente = eq(entradasStock.estado, "REGISTRADA");
    const condicionEstadoPago = estadoPago === "PAGADAS" ? and(vigente, isNotNull(entradasStock.montoPagado), gte(montoPagado, totalCompra))
      : estadoPago === "PENDIENTES" ? and(vigente, or(isNull(entradasStock.montoPagado), lt(montoPagado, totalCompra)))
      : estadoPago === "ANULADAS" ? eq(entradasStock.estado, "ANULADA") : undefined;
    const condicionListado = and(condicion, condicionEstadoPago);
    const consultarItems = (numeroPagina: number) => db.select({
        id: entradasStock.id, codigo: entradasStock.codigo, fecha: entradasStock.fecha,
        tipoDocumento: entradasStock.tipoDocumento, numeroDocumento: entradasStock.numeroDocumento,
        proveedor: entradasStock.proveedor, proveedorTipoPersona: entradasStock.proveedorTipoPersona,
        proveedorTipoDocumento: entradasStock.proveedorTipoDocumento, proveedorNumeroDocumento: entradasStock.proveedorNumeroDocumento,
        medioPago: entradasStock.medioPago, montoPagado: entradasStock.montoPagado,
        totalDocumento: entradasStock.totalDocumento, total: entradasStock.total, creadoEn: entradasStock.creadoEn,
        estado: entradasStock.estado, anuladoEn: entradasStock.anuladoEn,
        cantidadProductos: sql<number>`(select count(*)::int from entradas_stock_detalle d where d.entrada_id = entradas_stock.id)`,
      }).from(entradasStock).where(condicionListado).orderBy(desc(entradasStock.fecha), desc(entradasStock.creadoEn)).limit(porPagina).offset((numeroPagina - 1) * porPagina);
    const [itemsSolicitados, [total], [filtrado]] = await Promise.all([
      consultarItems(pagina),
      db.select({
        total: count(),
        pagadas: sql<number>`count(*) filter (where ${entradasStock.estado} = 'REGISTRADA' and ${entradasStock.montoPagado} is not null and ${montoPagado} >= ${totalCompra})::int`,
        pendientes: sql<number>`count(*) filter (where ${entradasStock.estado} = 'REGISTRADA' and (${entradasStock.montoPagado} is null or ${montoPagado} < ${totalCompra}))::int`,
        anuladas: sql<number>`count(*) filter (where ${entradasStock.estado} = 'ANULADA')::int`,
      }).from(entradasStock).where(condicion),
      // El total paginado respeta el filtro de estado de pago; los contadores de pestañas no.
      db.select({ total: count() }).from(entradasStock).where(condicionListado),
    ]);
    const totalRegistros = filtrado?.total ?? 0;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));
    // Una página fuera de rango (p. ej. tras anular el último registro de la última página) devuelve la última página real.
    const paginaEfectiva = Math.min(pagina, totalPaginas);
    const items = paginaEfectiva === pagina ? itemsSolicitados : await consultarItems(paginaEfectiva);
    return { items: items.map((item) => ({ ...item, cantidadProductos: Number(item.cantidadProductos ?? 0) })), total: totalRegistros, pagina: paginaEfectiva, porPagina, totalPaginas, conteosPago: { todas: Number(total?.total ?? 0), pagadas: Number(total?.pagadas ?? 0), pendientes: Number(total?.pendientes ?? 0), anuladas: Number(total?.anuladas ?? 0) } };
  }

  async consultar(idEntrada: string) {
    const id = uuid(idEntrada, "La entrada");
    const [entrada] = await db.select({ id: entradasStock.id, codigo: entradasStock.codigo, fecha: entradasStock.fecha,
      tipoDocumento: entradasStock.tipoDocumento, numeroDocumento: entradasStock.numeroDocumento, proveedor: entradasStock.proveedor,
      proveedorTipoPersona: entradasStock.proveedorTipoPersona, proveedorTipoDocumento: entradasStock.proveedorTipoDocumento,
      proveedorNumeroDocumento: entradasStock.proveedorNumeroDocumento, proveedorDireccion: entradasStock.proveedorDireccion,
      medioPago: entradasStock.medioPago, montoPagado: entradasStock.montoPagado, totalDocumento: entradasStock.totalDocumento,
      observacion: entradasStock.observacion, total: entradasStock.total,
      estado: entradasStock.estado, anuladoEn: entradasStock.anuladoEn, motivoAnulacion: entradasStock.motivoAnulacion,
      anuladoPor: sql<string | null>`(select u.nombre_usuario from usuarios u where u.id = entradas_stock.anulado_por_usuario_id)`,
      creadoEn: entradasStock.creadoEn }).from(entradasStock).where(eq(entradasStock.id, id)).limit(1);
    if (!entrada) throw new NotFoundException("No se encontró la entrada de stock.");
    const [detalles, detallesDocumento, pagos] = await Promise.all([
      db.select({ id: entradasStockDetalle.id, productoId: entradasStockDetalle.productoId,
        detalleDocumentoId: entradasStockDetalle.detalleDocumentoId, presentacionId: entradasStockDetalle.presentacionId,
        codigoProducto: entradasStockDetalle.codigoProducto, nombreProducto: entradasStockDetalle.nombreProducto,
        presentacion: entradasStockDetalle.presentacion, unidadMedidaCodigo: entradasStockDetalle.unidadMedidaCodigo,
        cantidad: entradasStockDetalle.cantidad, factorAUnidadBase: entradasStockDetalle.factorAUnidadBase,
        cantidadBase: entradasStockDetalle.cantidadBase, costoUnitario: entradasStockDetalle.costoUnitario,
        subtotal: entradasStockDetalle.subtotal }).from(entradasStockDetalle).where(eq(entradasStockDetalle.entradaId, id)).orderBy(asc(entradasStockDetalle.nombreProducto)),
      db.select({ id: entradasStockDocumentoDetalle.id, orden: entradasStockDocumentoDetalle.orden,
        codigo: entradasStockDocumentoDetalle.codigo, descripcion: entradasStockDocumentoDetalle.descripcion,
        unidad: entradasStockDocumentoDetalle.unidad, cantidad: entradasStockDocumentoDetalle.cantidad,
        costoUnitario: entradasStockDocumentoDetalle.costoUnitario, descuento: entradasStockDocumentoDetalle.descuento,
        subtotal: entradasStockDocumentoDetalle.subtotal, total: entradasStockDocumentoDetalle.total })
        .from(entradasStockDocumentoDetalle).where(eq(entradasStockDocumentoDetalle.entradaId, id)).orderBy(asc(entradasStockDocumentoDetalle.orden)),
      db.select({ cuentaFinancieraId: pagosEntradasStock.cuentaFinancieraId, medioPago: pagosEntradasStock.medioPago, importePagado: pagosEntradasStock.importePagado })
        .from(pagosEntradasStock).where(and(eq(pagosEntradasStock.entradaId, id), isNull(pagosEntradasStock.anuladoEn))).orderBy(asc(pagosEntradasStock.creadoEn)),
    ]);
    return { ...entrada, detalles, detallesDocumento, pagos };
  }
  /** Valida y normaliza los datos de una compra (alta o edición). No toca la base salvo para validar cuentas. */
  private async prepararDatos(entrada: unknown) {
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos de la entrada no son válidos.");
    const datos = entrada as DatosEntrada;
    const fecha = fechaValida(datos.fecha);
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha de la compra no puede ser posterior a hoy.");
    if (datos.claveIdempotencia !== undefined && datos.claveIdempotencia !== null) uuid(datos.claveIdempotencia, "La referencia de la compra");
    const claveIdempotencia = typeof datos.claveIdempotencia === "string" ? datos.claveIdempotencia.toLowerCase() : null;
    const tipoDocumento = texto(datos.tipoDocumento, "El tipo de documento", 30)!;
    if (!(tiposDocumento as readonly string[]).includes(tipoDocumento)) throw new BadRequestException("Selecciona un tipo de documento válido.");
    let numeroDocumento = texto(datos.numeroDocumento, "El número de documento", 60, true);
    if (tipoDocumento === "FACTURA" && numeroDocumento) numeroDocumento = numeroDocumento.toUpperCase();
    if (!numeroDocumento && tipoDocumento !== "SIN_DOCUMENTO") throw new BadRequestException("Ingresa el número del comprobante o guía.");
    const proveedor = texto(datos.proveedor, "El proveedor", 180, true);
    const proveedorTipoPersona = texto(datos.proveedorTipoPersona, "El tipo de persona proveedora", 20, true);
    const proveedorTipoDocumento = texto(datos.proveedorTipoDocumento, "El tipo de documento del proveedor", 10, true);
    const proveedorNumeroDocumento = texto(datos.proveedorNumeroDocumento, "El número de documento del proveedor", 100, true);
    const proveedorDireccion = texto(datos.proveedorDireccion, "La direccion del proveedor", 250, true);
        const totalDocumento = datos.totalDocumento === undefined || datos.totalDocumento === null || datos.totalDocumento === "" ? null : decimal(datos.totalDocumento, "El total del documento", 2, 0);
    if (datos.detallesDocumento !== undefined && !Array.isArray(datos.detallesDocumento)) throw new BadRequestException("Las lineas del documento no son validas.");
    const detallesDocumento = (Array.isArray(datos.detallesDocumento) ? datos.detallesDocumento : []).map((valor, indice) => {
      if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException(`La linea documental ${indice + 1} no es valida.`);
      const linea = valor as DetalleDocumentoEntrada;
      const clave = uuid(linea.clave, `La clave de la linea documental ${indice + 1}`);
      return {
        clave, codigo: texto(linea.codigo, "El codigo del documento", 100, true),
        descripcion: texto(linea.descripcion, `La descripcion documental ${indice + 1}`, 500)!,
        unidad: texto(linea.unidad, "La unidad del documento", 40, true),
        cantidad: decimal(linea.cantidad, `La cantidad documental ${indice + 1}`, 3, 0.001),
        costoUnitario: decimal(linea.costoUnitario, `El precio documental ${indice + 1}`, 4, 0),
        descuento: linea.descuento === undefined || linea.descuento === null || linea.descuento === "" ? 0 : decimal(linea.descuento, `El descuento documental ${indice + 1}`, 2, 0),
        subtotal: decimal(linea.subtotal, `El subtotal documental ${indice + 1}`, 2, 0),
        total: decimal(linea.total, `El total documental ${indice + 1}`, 2, 0),
      };
    });
    if (detallesDocumento.length > 100) throw new BadRequestException("El documento admite hasta 100 lineas.");
    if (new Set(detallesDocumento.map((linea) => linea.clave)).size !== detallesDocumento.length) throw new BadRequestException("Las lineas del documento tienen claves repetidas.");
    const medioPago = texto(datos.medioPago, "El medio de pago", 30, true);
    if (medioPago && !(mediosPago as readonly string[]).includes(medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    const montoPagado = datos.montoPagado === undefined || datos.montoPagado === null || datos.montoPagado === "" ? null : decimal(datos.montoPagado, "El monto pagado", 2, 0);
    const pagosSolicitados = Array.isArray(datos.pagos) ? datos.pagos : (montoPagado ?? 0) > 0 ? [{ cuentaFinancieraId: datos.cuentaFinancieraId, medioPago, importePagado: montoPagado }] : [];
    const pagos = await Promise.all(pagosSolicitados.map(async (valor) => {
      if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Revisa los medios de pago ingresados.");
      const pago = valor as Record<string, unknown>;
      const importe = decimal(pago.importePagado, "El importe del medio de pago", 2, 0.01);
      const medio = texto(pago.medioPago, "El medio de pago", 30, true)!;
      if (!(mediosPago as readonly string[]).includes(medio)) throw new BadRequestException("Selecciona un medio de pago válido.");
      const cuentaId = await validarCuentaFinanciera(pago.cuentaFinancieraId, medio, true);
      return { importe, medio, cuentaId };
    }));
    const cuentaFinancieraId = pagos.length === 1 ? pagos[0].cuentaId : null;
    if (proveedorTipoPersona && !["NATURAL", "JURIDICA"].includes(proveedorTipoPersona)) throw new BadRequestException("Selecciona si el proveedor es persona natural o jurídica.");
    if (proveedorTipoDocumento && !["DNI", "RUC", "EXT"].includes(proveedorTipoDocumento)) throw new BadRequestException("Selecciona DNI, RUC o identificación extranjera para el proveedor.");
    if (proveedorNumeroDocumento && (!proveedorTipoDocumento || (proveedorTipoDocumento === "DNI" ? !/^\d{8}$/.test(proveedorNumeroDocumento) : proveedorTipoDocumento === "RUC" ? !rucPeruValido(proveedorNumeroDocumento) : proveedorTipoDocumento === "EXT" ? !/^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,99}$/.test(proveedorNumeroDocumento) : true))) throw new BadRequestException("El número debe corresponder al tipo de documento seleccionado: DNI de 8 dígitos, RUC peruano válido o identificación extranjera alfanumérica.");
    if (proveedorNumeroDocumento && proveedorTipoDocumento === "DNI" && proveedorTipoPersona !== "NATURAL") throw new BadRequestException("El DNI corresponde a una persona natural.");
    if (proveedorNumeroDocumento && proveedorTipoDocumento === "RUC") {
      const prefijoRuc = proveedorNumeroDocumento.slice(0, 2);
      const personaSegunRuc = ["10", "15"].includes(prefijoRuc) ? "NATURAL" : prefijoRuc === "20" ? "JURIDICA" : null;
      if (!personaSegunRuc) throw new BadRequestException("El RUC debe iniciar con 10 o 15 para persona natural, o 20 para persona jurídica.");
      if (proveedorTipoPersona !== personaSegunRuc) throw new BadRequestException("El tipo de persona no coincide con el prefijo del RUC.");
    }
    if (proveedorTipoPersona === "JURIDICA" && !["RUC", "EXT"].includes(proveedorTipoDocumento ?? "")) throw new BadRequestException("Un proveedor jurídico debe identificarse con RUC o documento extranjero.");
    if (tipoDocumento !== "SIN_DOCUMENTO" && (!proveedor || !proveedorTipoPersona || !proveedorTipoDocumento || !proveedorNumeroDocumento)) throw new BadRequestException("Completa el nombre o razón social, tipo de persona y documento del proveedor tal como aparecen en el comprobante.");
    const observacion = texto(datos.observacion, "La observación", 2000, true);
    if (!Array.isArray(datos.detalles) || datos.detalles.length > 100 || (!datos.detalles.length && !detallesDocumento.length)) throw new BadRequestException("Agrega lineas del documento o productos recibidos para registrar la compra.");
    const detalles = datos.detalles.map((valor, indice) => {
      if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException(`El producto ${indice + 1} no es válido.`);
      const fila = valor as DetalleEntrada;
      const detalleDocumentoId = fila.detalleDocumentoId === undefined || fila.detalleDocumentoId === null || fila.detalleDocumentoId === "" ? null : uuid(fila.detalleDocumentoId, `La linea del documento asociada al producto ${indice + 1}`);
      if (detalleDocumentoId && !detallesDocumento.some((linea) => linea.clave === detalleDocumentoId)) throw new BadRequestException("Un producto recibido hace referencia a una linea documental inexistente.");
      return { productoId: uuid(fila.productoId, `El producto ${indice + 1}`), presentacionId: uuid(fila.presentacionId, `La presentación ${indice + 1}`), detalleDocumentoId, cantidad: decimal(fila.cantidad, `La cantidad del producto ${indice + 1}`, 3, 0.001), costoUnitario: decimal(fila.costoUnitario, `El costo del producto ${indice + 1}`, 4, 0), importeTotal: fila.importeTotal === undefined ? null : decimal(fila.importeTotal, `El precio total del producto ${indice + 1}`, 2, 0.01) };
    });
    const pares = detalles.map((fila) => `${fila.productoId}:${fila.presentacionId}`);
    if (new Set(pares).size !== pares.length) throw new BadRequestException("Hay productos y presentaciones repetidos. Agrupa sus cantidades en una sola línea.");
    return { fecha, claveIdempotencia, tipoDocumento, numeroDocumento, proveedor, proveedorTipoPersona, proveedorTipoDocumento, proveedorNumeroDocumento, proveedorDireccion, totalDocumento, detallesDocumento, pagos, cuentaFinancieraId, observacion, detalles };
  }

  /** Bloquea por comprobante y rechaza una factura o boleta ya registrada (en Compras o en un egreso), salvo la propia compra que se edita. */
  private async verificarDuplicado(tx: Transaccion, d: DatosPreparados, excluirId?: string) {
    if (!["FACTURA", "BOLETA"].includes(d.tipoDocumento) || d.proveedorTipoDocumento !== "RUC" || !d.proveedorNumeroDocumento || !d.numeroDocumento) return;
    const claveDocumento = `COMPROBANTE_COMPRA:${d.proveedorNumeroDocumento}:${d.tipoDocumento}:${d.numeroDocumento}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${claveDocumento}, 0))`);
    const [duplicadoEgreso] = await tx.select({ id: egresosRegistros.id }).from(egresosRegistros)
      .where(and(eq(egresosRegistros.estado, "REGISTRADO"), eq(egresosRegistros.documentoTipo, d.tipoDocumento), eq(egresosRegistros.proveedorRuc, d.proveedorNumeroDocumento), eq(egresosRegistros.documentoNumero, d.numeroDocumento))).limit(1);
    const [duplicadoCompra] = await tx.select({ id: entradasStock.id }).from(entradasStock)
      .where(and(eq(entradasStock.estado, "REGISTRADA"), eq(entradasStock.tipoDocumento, d.tipoDocumento), eq(entradasStock.proveedorTipoDocumento, "RUC"), eq(entradasStock.proveedorNumeroDocumento, d.proveedorNumeroDocumento), eq(entradasStock.numeroDocumento, d.numeroDocumento), excluirId ? ne(entradasStock.id, excluirId) : undefined)).limit(1);
    if (duplicadoEgreso || duplicadoCompra) throw new ConflictException("Esta factura ya está registrada en Compras o en un egreso; evita duplicarla.");
  }

  /** Comprueba productos y presentaciones vigentes, calcula subtotales y exige que los pagos cubran el total. */
  private async validarProductos(tx: Transaccion, d: DatosPreparados) {
    const productosValidados = [];
    for (const detalle of d.detalles) {
      const [producto] = await tx.select({
        id: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre,
        presentacionId: productosPresentaciones.id, presentacion: productosPresentaciones.nombre,
        unidadMedidaCodigo: productosPresentaciones.unidadMedidaCodigo,
        factorAUnidadBase: productosPresentaciones.factorAUnidadBase,
      }).from(productosPresentaciones).innerJoin(productos, eq(productosPresentaciones.productoId, productos.id))
        .where(and(eq(productos.id, detalle.productoId), eq(productosPresentaciones.id, detalle.presentacionId), eq(productos.activo, true), eq(productosPresentaciones.activo, true), eq(productosPresentaciones.seCompra, true))).limit(1);
      if (!producto) throw new BadRequestException("Un producto o presentación ya no está disponible para compra.");
      const factor = Number(producto.factorAUnidadBase);
      const cantidadBase = Number((detalle.cantidad * factor).toFixed(6));
      const subtotal = detalle.importeTotal ?? Number((detalle.cantidad * detalle.costoUnitario).toFixed(2));
      const subtotalPorPrecioUnitario = Number((detalle.cantidad * detalle.costoUnitario).toFixed(2));
      if (detalle.importeTotal !== null && Math.round(subtotalPorPrecioUnitario * 100) !== Math.round(subtotal * 100)) throw new BadRequestException("La cantidad, el costo unitario y el total de una línea no coinciden.");
      const costoUnitario = Number((subtotal / detalle.cantidad).toFixed(4));
      if (!Number.isFinite(cantidadBase) || cantidadBase <= 0 || !Number.isFinite(subtotal)) throw new BadRequestException("La cantidad o el subtotal calculado no es válido.");
      productosValidados.push({ ...detalle, costoUnitario, producto, factor, cantidadBase, subtotal, costoBase: Number((costoUnitario / factor).toFixed(6)) });
    }
    const total = productosValidados.reduce((suma, detalle) => suma + detalle.subtotal, 0);
    const totalPagos = d.pagos.reduce((suma, pago) => suma + pago.importe, 0);
    if (Math.round(totalPagos * 100) !== Math.round(total * 100)) throw new BadRequestException("Distribuye el monto pagado completo entre los medios de pago.");
    for (const detalle of productosValidados) {
      const calculado = Number((detalle.cantidad * detalle.costoUnitario).toFixed(2));
      if (Math.round(calculado * 100) !== Math.round(detalle.subtotal * 100)) throw new BadRequestException("La cantidad, el costo unitario y el total de una línea no coinciden.");
    }
    if (d.totalDocumento !== null && Math.round(d.totalDocumento * 100) < Math.round(total * 100)) throw new BadRequestException("El total del documento no puede ser menor que la suma de los productos recibidos.");
    return { productosValidados, total, totalPagos };
  }

  /** Inserta pagos, líneas documentales y líneas de stock, sumando al saldo y dejando el movimiento ENTRADA de cada una. */
  private async ingresarLineas(tx: Transaccion, entradaId: string, d: DatosPreparados, productosValidados: ProductosValidados, usuarioId: string) {
    if (d.pagos.length) await tx.insert(pagosEntradasStock).values(d.pagos.map((pago) => ({
      entradaId, fechaPago: d.fecha, importePagado: pago.importe.toFixed(2), medioPago: pago.medio,
      cuentaFinancieraId: pago.cuentaId, usuarioId,
    })));
    const idsDocumento = new Map<string, string>();
    for (const [orden, linea] of d.detallesDocumento.entries()) {
      const [documentoDetalle] = await tx.insert(entradasStockDocumentoDetalle).values({
        entradaId, orden: orden + 1, codigo: linea.codigo, descripcion: linea.descripcion,
        unidad: linea.unidad, cantidad: linea.cantidad.toFixed(3), costoUnitario: linea.costoUnitario.toFixed(4),
        descuento: linea.descuento.toFixed(2), subtotal: linea.subtotal.toFixed(2), total: linea.total.toFixed(2),
      }).returning({ id: entradasStockDocumentoDetalle.id });
      idsDocumento.set(linea.clave, documentoDetalle.id);
    }
    for (const detalle of productosValidados) {
      const [linea] = await tx.insert(entradasStockDetalle).values({
        entradaId, detalleDocumentoId: detalle.detalleDocumentoId ? idsDocumento.get(detalle.detalleDocumentoId) ?? null : null, productoId: detalle.productoId, presentacionId: detalle.presentacionId,
        codigoProducto: detalle.producto.codigoInterno, nombreProducto: detalle.producto.nombre,
        presentacion: detalle.producto.presentacion, unidadMedidaCodigo: detalle.producto.unidadMedidaCodigo,
        cantidad: detalle.cantidad.toFixed(3), factorAUnidadBase: detalle.factor.toFixed(6),
        cantidadBase: detalle.cantidadBase.toFixed(6), costoUnitario: detalle.costoUnitario.toFixed(4),
        subtotal: detalle.subtotal.toFixed(2),
      }).returning({ id: entradasStockDetalle.id });
      await tx.insert(saldosStock).values({ productoId: detalle.productoId, cantidad: detalle.cantidadBase.toFixed(6) })
        .onConflictDoUpdate({ target: saldosStock.productoId, set: { cantidad: sql`${saldosStock.cantidad} + ${detalle.cantidadBase}`, actualizadoEn: new Date() } });
      await tx.insert(movimientosStock).values({
        productoId: detalle.productoId, tipo: "ENTRADA", origenTipo: "ENTRADA_STOCK",
        origenId: entradaId, origenDetalleId: linea.id, cantidadBase: detalle.cantidadBase.toFixed(6),
        costoUnitarioBase: detalle.costoBase.toFixed(6), usuarioId,
      });
    }
  }

  /** Datos del proveedor tal como se guardan: una compra sin documento no lleva proveedor. */
  private camposCabecera(d: DatosPreparados, numeroDocumento: string | null, total: number, totalPagos: number) {
    const sinDocumento = d.tipoDocumento === "SIN_DOCUMENTO";
    return {
      fecha: d.fecha, tipoDocumento: d.tipoDocumento, numeroDocumento,
      proveedor: sinDocumento ? null : d.proveedor, proveedorTipoPersona: sinDocumento ? null : d.proveedorTipoPersona, proveedorTipoDocumento: sinDocumento ? null : d.proveedorTipoDocumento,
      proveedorNumeroDocumento: sinDocumento ? null : d.proveedorNumeroDocumento, proveedorDireccion: sinDocumento ? null : d.proveedorDireccion,
      medioPago: d.pagos.length === 1 ? d.pagos[0].medio : null, cuentaFinancieraId: d.cuentaFinancieraId,
      montoPagado: totalPagos.toFixed(2), observacion: d.observacion,
      totalDocumento: d.totalDocumento === null ? null : d.totalDocumento.toFixed(2), total: total.toFixed(2),
    };
  }

  private async siguienteNumeroSinDocumento(tx: Transaccion) {
    const [correlativo] = await tx.insert(correlativosDocumentosInternos).values({ tipo: "COMPRA_REPUESTOS_SIN_DOCUMENTO", ultimoNumero: 1 })
      .onConflictDoUpdate({ target: correlativosDocumentosInternos.tipo, set: { ultimoNumero: sql`${correlativosDocumentosInternos.ultimoNumero} + 1` } })
      .returning({ numero: correlativosDocumentosInternos.ultimoNumero });
    return `CRI-${String(correlativo.numero).padStart(6, "0")}`;
  }

  async crear(entrada: unknown, usuarioIdEntrada: string) {
    const usuarioId = uuid(usuarioIdEntrada, "El usuario");
    const d = await this.prepararDatos(entrada);
    const { fecha, claveIdempotencia, tipoDocumento, numeroDocumento, proveedorNumeroDocumento, pagos, detalles } = d;
    try {
      const huellaSolicitud = createHash("sha256").update(JSON.stringify({ usuarioId, fecha, tipoDocumento, numeroDocumento, proveedorNumeroDocumento, pagos, detalles })).digest("hex");
      const resultado = await db.transaction(async (tx) => {
        if (claveIdempotencia) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`compra-repuestos:${claveIdempotencia}`}, 0))`);
          const [existente] = await tx.select({ id: entradasStock.id, huella: entradasStock.huellaSolicitud, estado: entradasStock.estado }).from(entradasStock).where(eq(entradasStock.claveIdempotencia, claveIdempotencia)).limit(1);
          if (existente) {
            if (existente.huella !== huellaSolicitud) throw new ConflictException("La referencia ya corresponde a otra compra. Actualiza el listado antes de seguir.");
            if (existente.estado === "ANULADA") throw new ConflictException("Esa compra fue anulada. Registra la compra corregida con una referencia nueva.");
            return { id: existente.id };
          }
        }
        await this.verificarDuplicado(tx, d);
        const codigo = `ENT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const { productosValidados, total, totalPagos } = await this.validarProductos(tx, d);
        const numero = tipoDocumento === "SIN_DOCUMENTO" ? await this.siguienteNumeroSinDocumento(tx) : numeroDocumento;
        const [nuevaEntrada] = await tx.insert(entradasStock).values({
          codigo, ...this.camposCabecera(d, numero, total, totalPagos),
          claveIdempotencia, huellaSolicitud: claveIdempotencia ? huellaSolicitud : null, usuarioId,
        }).returning({ id: entradasStock.id });
        await this.ingresarLineas(tx, nuevaEntrada.id, d, productosValidados, usuarioId);
        return { id: nuevaEntrada.id };
      });
      return this.consultar(resultado.id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      if (esViolacionUnicidad(error)) throw new ConflictException("La entrada o un movimiento duplicado ya existe.");
      throw error;
    }
  }

  /**
   * Edita una compra registrada de forma atómica y conserva su código: valida los datos nuevos, ingresa las líneas nuevas,
   * retira el stock de las anteriores (SALIDA EDICION_ENTRADA por línea), anula sus pagos y registra los nuevos.
   * Si parte del stock anterior ya se vendió o se ajustó y no alcanza, responde 409 sin tocar nada.
   */
  async actualizar(idEntrada: string, entrada: unknown, usuarioIdEntrada: string) {
    const id = uuid(idEntrada, "La compra");
    const usuarioId = uuid(usuarioIdEntrada, "El usuario");
    const d = await this.prepararDatos(entrada);
    try {
      await db.transaction(async (tx) => {
        const [compra] = await tx.select({ id: entradasStock.id, estado: entradasStock.estado, tipoDocumento: entradasStock.tipoDocumento, numeroDocumento: entradasStock.numeroDocumento })
          .from(entradasStock).where(eq(entradasStock.id, id)).for("update").limit(1);
        if (!compra) throw new NotFoundException("No se encontró la compra de repuestos.");
        if (compra.estado === "ANULADA") throw new ConflictException("La compra está anulada; no se puede editar.");
        await this.verificarDuplicado(tx, d, id);
        const { productosValidados, total, totalPagos } = await this.validarProductos(tx, d);
        const numero = d.tipoDocumento !== "SIN_DOCUMENTO" ? d.numeroDocumento
          : compra.tipoDocumento === "SIN_DOCUMENTO" && compra.numeroDocumento ? compra.numeroDocumento : await this.siguienteNumeroSinDocumento(tx);
        const anteriores = await tx.select({ id: entradasStockDetalle.id, productoId: entradasStockDetalle.productoId, nombre: entradasStockDetalle.nombreProducto, cantidadBase: entradasStockDetalle.cantidadBase })
          .from(entradasStockDetalle).where(eq(entradasStockDetalle.entradaId, id)).orderBy(asc(entradasStockDetalle.productoId), asc(entradasStockDetalle.id));
        // Los pagos anteriores dejan de contar en cuentas y flujo; los nuevos se registran junto con las líneas.
        await tx.update(pagosEntradasStock).set({ anuladoEn: new Date(), anuladoPorUsuarioId: usuarioId, motivoAnulacion: "Reemplazado al editar la compra" })
          .where(and(eq(pagosEntradasStock.entradaId, id), isNull(pagosEntradasStock.anuladoEn)));
        // Primero se ingresa lo nuevo: así solo se exige stock por la diferencia neta de cada producto.
        await this.ingresarLineas(tx, id, d, productosValidados, usuarioId);
        for (const linea of anteriores) {
          const [original] = await tx.select({ costo: movimientosStock.costoUnitarioBase }).from(movimientosStock)
            .where(and(eq(movimientosStock.origenTipo, "ENTRADA_STOCK"), eq(movimientosStock.origenDetalleId, linea.id))).limit(1);
          const [actualizado] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} - ${linea.cantidadBase}::numeric`, actualizadoEn: new Date() })
            .where(and(eq(saldosStock.productoId, linea.productoId), sql`${saldosStock.cantidad} >= ${linea.cantidadBase}::numeric`))
            .returning({ cantidad: saldosStock.cantidad });
          if (!actualizado) throw new ConflictException(`No se puede editar la compra: parte del stock de ${linea.nombre} ya se vendió o se ajustó.`);
          await tx.insert(movimientosStock).values({
            productoId: linea.productoId, tipo: "SALIDA", origenTipo: "EDICION_ENTRADA", origenId: id, origenDetalleId: linea.id,
            cantidadBase: linea.cantidadBase, costoUnitarioBase: original?.costo ?? "0", sentido: "RETIRO", observacion: "Edición de la compra", usuarioId,
            saldoAnterior: sql`(${actualizado.cantidad}::numeric + ${linea.cantidadBase}::numeric)`, saldoFinal: actualizado.cantidad,
          });
        }
        if (anteriores.length) await tx.delete(entradasStockDetalle).where(inArray(entradasStockDetalle.id, anteriores.map((linea) => linea.id)));
        await tx.delete(entradasStockDocumentoDetalle).where(and(eq(entradasStockDocumentoDetalle.entradaId, id),
          sql`not exists (select 1 from entradas_stock_detalle d where d.detalle_documento_id = ${entradasStockDocumentoDetalle.id})`));
        await tx.update(entradasStock).set(this.camposCabecera(d, numero, total, totalPagos)).where(eq(entradasStock.id, id));
      });
      return this.consultar(id);
    } catch (error) {
      if (esViolacionUnicidad(error)) throw new ConflictException("La compra o un movimiento duplicado ya existe.");
      throw error;
    }
  }

  /**
   * Anula una compra de repuestos de forma atómica: devuelve el stock ingresado (movimiento SALIDA ANULACION_ENTRADA por línea),
   * marca sus pagos como anulados (dejan de contar en cuentas y flujo) y registra quién, cuándo y por qué.
   * Si parte de lo comprado ya se vendió o se ajustó (saldo menor al ingresado) responde 409 sin tocar nada.
   */
  async anular(idEntrada: string, datos: unknown, usuarioIdEntrada: string) {
    const id = uuid(idEntrada, "La compra");
    const usuarioId = uuid(usuarioIdEntrada, "El usuario");
    const motivo = motivoAnulacion(datos);
    await db.transaction(async (tx) => {
      const [compra] = await tx.select({ id: entradasStock.id, estado: entradasStock.estado }).from(entradasStock).where(eq(entradasStock.id, id)).for("update").limit(1);
      if (!compra) throw new NotFoundException("No se encontró la compra de repuestos.");
      if (compra.estado === "ANULADA") throw new ConflictException("La compra ya fue anulada.");
      const lineas = await tx.select({ id: entradasStockDetalle.id, productoId: entradasStockDetalle.productoId, nombre: entradasStockDetalle.nombreProducto, cantidadBase: entradasStockDetalle.cantidadBase })
        .from(entradasStockDetalle).where(eq(entradasStockDetalle.entradaId, id)).orderBy(asc(entradasStockDetalle.productoId), asc(entradasStockDetalle.id));
      const requerido = new Map<string, { nombre: string; milesimas: bigint }>();
      for (const linea of lineas) {
        const actual = requerido.get(linea.productoId) ?? { nombre: linea.nombre, milesimas: 0n };
        actual.milesimas += BigInt(Math.round(Number(linea.cantidadBase) * 1_000_000));
        requerido.set(linea.productoId, actual);
      }
      const insuficientes: string[] = [];
      for (const productoId of [...requerido.keys()].sort()) {
        const [saldo] = await tx.select({ cantidad: saldosStock.cantidad }).from(saldosStock).where(eq(saldosStock.productoId, productoId)).for("update");
        const disponible = BigInt(Math.round(Number(saldo?.cantidad ?? 0) * 1_000_000));
        const necesario = requerido.get(productoId)!;
        if (disponible < necesario.milesimas) insuficientes.push(`${necesario.nombre} (ingresó ${Number(necesario.milesimas) / 1_000_000}, hay ${Number(disponible) / 1_000_000})`);
      }
      if (insuficientes.length) throw new ConflictException(`No se puede anular la compra: parte del stock ya se vendió o se ajustó. Revisa: ${insuficientes.join("; ")}.`);
      for (const linea of lineas) {
        const [original] = await tx.select({ costo: movimientosStock.costoUnitarioBase }).from(movimientosStock)
          .where(and(eq(movimientosStock.origenTipo, "ENTRADA_STOCK"), eq(movimientosStock.origenDetalleId, linea.id))).limit(1);
        const [actualizado] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} - ${linea.cantidadBase}::numeric`, actualizadoEn: new Date() })
          .where(and(eq(saldosStock.productoId, linea.productoId), sql`${saldosStock.cantidad} >= ${linea.cantidadBase}::numeric`))
          .returning({ cantidad: saldosStock.cantidad });
        if (!actualizado) throw new ConflictException(`No se puede anular la compra: el stock de ${linea.nombre} ya no alcanza.`);
        await tx.insert(movimientosStock).values({
          productoId: linea.productoId, tipo: "SALIDA", origenTipo: "ANULACION_ENTRADA", origenId: id, origenDetalleId: linea.id,
          cantidadBase: linea.cantidadBase, costoUnitarioBase: original?.costo ?? "0", sentido: "RETIRO", observacion: motivo, usuarioId,
          saldoAnterior: sql`(${actualizado.cantidad}::numeric + ${linea.cantidadBase}::numeric)`, saldoFinal: actualizado.cantidad,
        });
      }
      const ahora = new Date();
      await tx.update(pagosEntradasStock).set({ anuladoEn: ahora, anuladoPorUsuarioId: usuarioId, motivoAnulacion: motivo })
        .where(and(eq(pagosEntradasStock.entradaId, id), isNull(pagosEntradasStock.anuladoEn)));
      await tx.update(entradasStock).set({ estado: "ANULADA", anuladoEn: ahora, anuladoPorUsuarioId: usuarioId, motivoAnulacion: motivo }).where(eq(entradasStock.id, id));
    });
    return this.consultar(id);
  }
}






