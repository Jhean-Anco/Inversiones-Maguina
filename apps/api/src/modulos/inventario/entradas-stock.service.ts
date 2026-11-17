import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db, entradasStock, entradasStockDetalle, entradasStockDocumentoDetalle, egresosRegistros, pagosEntradasStock, marcasProductos, movimientosStock, productos, productosCodigos, productosPresentaciones, saldosStock, unidadesMedida } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { rucPeruValido } from "../../utilidades/ruc-peru";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";

type DetalleEntrada = { productoId?: unknown; presentacionId?: unknown; detalleDocumentoId?: unknown; cantidad?: unknown; costoUnitario?: unknown; importeTotal?: unknown };
type DetalleDocumentoEntrada = { clave?: unknown; codigo?: unknown; descripcion?: unknown; unidad?: unknown; cantidad?: unknown; costoUnitario?: unknown; descuento?: unknown; subtotal?: unknown; total?: unknown };
type DatosEntrada = { fecha?: unknown; tipoDocumento?: unknown; numeroDocumento?: unknown; proveedor?: unknown; proveedorTipoPersona?: unknown; proveedorTipoDocumento?: unknown; proveedorNumeroDocumento?: unknown; proveedorDireccion?: unknown; medioPago?: unknown; cuentaFinancieraId?: unknown; montoPagado?: unknown; pagos?: unknown; totalDocumento?: unknown; detallesDocumento?: unknown; observacion?: unknown; detalles?: unknown };
const tiposDocumento = ["FACTURA", "BOLETA", "GUIA_REMISION", "NOTA", "SIN_DOCUMENTO", "OTRO"] as const;
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
    if (busqueda.length < 3) return [];
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

  async listar(filtros: { pagina?: string; porPagina?: string; busqueda?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const solicitados = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(solicitados) ? solicitados : 10;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condicion = coincidencia ? or(ilike(entradasStock.codigo, coincidencia), ilike(entradasStock.proveedor, coincidencia), ilike(entradasStock.numeroDocumento, coincidencia), ilike(entradasStock.proveedorNumeroDocumento, coincidencia)) : undefined;
    const [items, [total]] = await Promise.all([
      db.select({
        id: entradasStock.id, codigo: entradasStock.codigo, fecha: entradasStock.fecha,
        tipoDocumento: entradasStock.tipoDocumento, numeroDocumento: entradasStock.numeroDocumento,
        proveedor: entradasStock.proveedor, proveedorTipoPersona: entradasStock.proveedorTipoPersona,
        proveedorTipoDocumento: entradasStock.proveedorTipoDocumento, proveedorNumeroDocumento: entradasStock.proveedorNumeroDocumento,
        medioPago: entradasStock.medioPago, montoPagado: entradasStock.montoPagado,
        totalDocumento: entradasStock.totalDocumento, total: entradasStock.total, creadoEn: entradasStock.creadoEn,
        cantidadProductos: sql<number>`(select count(*)::int from entradas_stock_detalle d where d.entrada_id = ${entradasStock.id})`,
      }).from(entradasStock).where(condicion).orderBy(desc(entradasStock.fecha), desc(entradasStock.creadoEn)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(entradasStock).where(condicion),
    ]);
    const totalRegistros = total?.total ?? 0;
    return { items: items.map((item) => ({ ...item, cantidadProductos: Number(item.cantidadProductos ?? 0) })), total: totalRegistros, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(totalRegistros / porPagina)) };
  }

  async consultar(idEntrada: string) {
    const id = uuid(idEntrada, "La entrada");
    const [entrada] = await db.select({ id: entradasStock.id, codigo: entradasStock.codigo, fecha: entradasStock.fecha,
      tipoDocumento: entradasStock.tipoDocumento, numeroDocumento: entradasStock.numeroDocumento, proveedor: entradasStock.proveedor,
      proveedorTipoPersona: entradasStock.proveedorTipoPersona, proveedorTipoDocumento: entradasStock.proveedorTipoDocumento,
      proveedorNumeroDocumento: entradasStock.proveedorNumeroDocumento, proveedorDireccion: entradasStock.proveedorDireccion,
      medioPago: entradasStock.medioPago, montoPagado: entradasStock.montoPagado, totalDocumento: entradasStock.totalDocumento,
      observacion: entradasStock.observacion, total: entradasStock.total,
      creadoEn: entradasStock.creadoEn }).from(entradasStock).where(eq(entradasStock.id, id)).limit(1);
    if (!entrada) throw new NotFoundException("No se encontró la entrada de stock.");
    const [detalles, detallesDocumento] = await Promise.all([
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
    ]);
    return { ...entrada, detalles, detallesDocumento };
  }
  async crear(entrada: unknown, usuarioIdEntrada: string) {
    const usuarioId = uuid(usuarioIdEntrada, "El usuario");
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos de la entrada no son válidos.");
    const datos = entrada as DatosEntrada;
    const fecha = fechaValida(datos.fecha);
    const tipoDocumento = texto(datos.tipoDocumento, "El tipo de documento", 30)!;
    if (!(tiposDocumento as readonly string[]).includes(tipoDocumento)) throw new BadRequestException("Selecciona un tipo de documento válido.");
    let numeroDocumento = texto(datos.numeroDocumento, "El número de documento", 60, true);
    if (tipoDocumento === "FACTURA" && numeroDocumento) numeroDocumento = numeroDocumento.toUpperCase();
    if (!numeroDocumento && !["SIN_DOCUMENTO", "OTRO"].includes(tipoDocumento)) throw new BadRequestException("Ingresa el número del comprobante o guía.");
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

    try {
      const id = await db.transaction(async (tx) => {
        if (["FACTURA", "BOLETA"].includes(tipoDocumento) && proveedorTipoDocumento === "RUC" && proveedorNumeroDocumento && numeroDocumento) {
          const claveDocumento = `COMPROBANTE_COMPRA:${proveedorNumeroDocumento}:${tipoDocumento}:${numeroDocumento}`;
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${claveDocumento}, 0))`);
          const [duplicadoEgreso] = await tx.select({ id: egresosRegistros.id }).from(egresosRegistros)
            .where(and(eq(egresosRegistros.documentoTipo, tipoDocumento), eq(egresosRegistros.proveedorRuc, proveedorNumeroDocumento), eq(egresosRegistros.documentoNumero, numeroDocumento))).limit(1);
          const [duplicadoCompra] = await tx.select({ id: entradasStock.id }).from(entradasStock)
            .where(and(eq(entradasStock.tipoDocumento, tipoDocumento), eq(entradasStock.proveedorTipoDocumento, "RUC"), eq(entradasStock.proveedorNumeroDocumento, proveedorNumeroDocumento), eq(entradasStock.numeroDocumento, numeroDocumento))).limit(1);
          if (duplicadoEgreso || duplicadoCompra) throw new ConflictException("Esta factura ya está registrada en Compras o en un egreso; evita duplicarla.");
        }
        const codigo = `ENT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const productosValidados = [];
        for (const detalle of detalles) {
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
          const costoUnitario = Number((subtotal / detalle.cantidad).toFixed(4));
          if (!Number.isFinite(cantidadBase) || cantidadBase <= 0 || !Number.isFinite(subtotal)) throw new BadRequestException("La cantidad o el subtotal calculado no es válido.");
          productosValidados.push({ ...detalle, costoUnitario, producto, factor, cantidadBase, subtotal, costoBase: Number((costoUnitario / factor).toFixed(6)) });
        }
        const total = productosValidados.reduce((suma, detalle) => suma + detalle.subtotal, 0);
        const totalPagos = pagos.reduce((suma, pago) => suma + pago.importe, 0);
        if (Math.round(totalPagos * 100) !== Math.round(total * 100)) throw new BadRequestException("Distribuye el total de la compra entre los medios de pago.");
        const [nuevaEntrada] = await tx.insert(entradasStock).values({
          codigo, fecha, tipoDocumento, numeroDocumento, proveedor, proveedorTipoPersona, proveedorTipoDocumento,
          proveedorNumeroDocumento, proveedorDireccion,
          medioPago: pagos.length === 1 ? pagos[0].medio : null,
          cuentaFinancieraId,
          montoPagado: totalPagos.toFixed(2), observacion,
          totalDocumento: totalDocumento === null ? null : totalDocumento.toFixed(2), total: total.toFixed(2), usuarioId,
        }).returning({ id: entradasStock.id });
        if (pagos.length) await tx.insert(pagosEntradasStock).values(pagos.map((pago) => ({
          entradaId: nuevaEntrada.id, fechaPago: fechaActualPeru(), importePagado: pago.importe.toFixed(2), medioPago: pago.medio,
          cuentaFinancieraId: pago.cuentaId, usuarioId,
        })));
        const idsDocumento = new Map<string, string>();
        for (const [orden, linea] of detallesDocumento.entries()) {
          const [documentoDetalle] = await tx.insert(entradasStockDocumentoDetalle).values({
            entradaId: nuevaEntrada.id, orden: orden + 1, codigo: linea.codigo, descripcion: linea.descripcion,
            unidad: linea.unidad, cantidad: linea.cantidad.toFixed(3), costoUnitario: linea.costoUnitario.toFixed(4),
            descuento: linea.descuento.toFixed(2), subtotal: linea.subtotal.toFixed(2), total: linea.total.toFixed(2),
          }).returning({ id: entradasStockDocumentoDetalle.id });
          idsDocumento.set(linea.clave, documentoDetalle.id);
        }
        for (const detalle of productosValidados) {
          const [linea] = await tx.insert(entradasStockDetalle).values({
            entradaId: nuevaEntrada.id, detalleDocumentoId: detalle.detalleDocumentoId ? idsDocumento.get(detalle.detalleDocumentoId) ?? null : null, productoId: detalle.productoId, presentacionId: detalle.presentacionId,
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
            origenId: nuevaEntrada.id, origenDetalleId: linea.id, cantidadBase: detalle.cantidadBase.toFixed(6),
            costoUnitarioBase: detalle.costoBase.toFixed(6), usuarioId,
          });
        }
        return nuevaEntrada.id;
      });
      return this.consultar(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new ConflictException("La entrada o un movimiento duplicado ya existe.");
      throw error;
    }
  }
}






