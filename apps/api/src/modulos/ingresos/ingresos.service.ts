import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, gt, gte, ilike, inArray, isNull, lte, not, or, sql } from "drizzle-orm";
import { db, clientes, comprobantesRelacionados, comprobantesRelacionadosDetalle, cotizaciones, correlativosDocumentosInternos, cuentasFinancieras, entradasStockDetalle, guiasRemision, ingresos, ingresosDetalle, ingresosPagos, marcasProductos, movimientosMototaxis, movimientosMototaxisVentas, movimientosStock, nubefactCorrelativos, ordenesServicio, personas, personasDocumentos, preciosProductos, productos, productosCodigos, productosPresentaciones, saldosStock, tiposDocumento, tiposListasPrecio, tiposPersona, unidadesMedida, unidadesMototaxis, modelosMototaxis } from "@magina/database";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { consultarIdentidadPeru } from "../../utilidades/consulta-identidad-peru";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";
import { rucPeruValido } from "../../utilidades/ruc-peru";
import { contieneSinTildes, normalizarTextoBusqueda } from "../../utilidades/busqueda-texto";
import { ServicioGoogleDrive } from "../google-drive/google-drive.service";

type AfectacionIgv = "GRAVADO" | "EXONERADO" | "INAFECTO";
type Linea = { tipo?: unknown; presentacionId?: unknown; mototaxiUnidadId?: unknown; cantidad?: unknown; precioUnitario?: unknown; descuento?: unknown; descripcion?: unknown; afectacionIgv?: unknown };
type DatosIngreso = { idempotencyKey?: unknown; fecha?: unknown; tipoComprobante?: unknown; clienteId?: unknown; clienteDireccion?: unknown; clienteTipoDocumento?: unknown; clienteNumeroDocumento?: unknown; clienteNombre?: unknown; medioPago?: unknown; condicionPago?: unknown; fechaVencimientoPago?: unknown; importePagoInicial?: unknown; cuotasPago?: unknown; observacion?: unknown; detalles?: unknown };
const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;
const mediosPagoPorCuenta = { EFECTIVO: "EFECTIVO", BANCO: "TRANSFERENCIA", BILLETERA: "BILLETERA_DIGITAL", TARJETA: "TARJETA" } as const;
const nombreMedioPago = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", BILLETERA_DIGITAL: "Billetera digital", OTRO: "Otro" } as const;
function analizarEstadoComprobante(estado: string, datos: Record<string, unknown>, respuesta: Record<string, unknown>) {
  const errores = respuesta.errors ?? respuesta.error ?? respuesta.mensaje ?? datos.mensaje;
  const errorTexto = typeof errores === "string" ? errores.trim()
    : Array.isArray(errores) ? errores.filter((valor): valor is string => typeof valor === "string").join(" ").trim()
      : errores && typeof errores === "object" ? JSON.stringify(errores) : "";
  const errorSunat = typeof respuesta.sunat_soap_error === "string" ? respuesta.sunat_soap_error.trim() : "";
  const descripcionSunat = typeof respuesta.sunat_description === "string" ? respuesta.sunat_description.trim()
    : typeof respuesta.sunat_note === "string" ? respuesta.sunat_note.trim() : "";
  const ticket = respuesta.sunat_ticket_numero;
  if (errorSunat) return { estadoProveedor: "ERROR_SUNAT", detalleProveedor: errorSunat };
  if (estado === "NUBEFACT_PENDIENTE") return { estadoProveedor: "PENDIENTE_CONFIRMACION", detalleProveedor: errorTexto || descripcionSunat || null };
  if (errorTexto) return { estadoProveedor: "ERROR_NUBEFACT", detalleProveedor: errorTexto };
  if (datos.ambiente !== "DEMO" && respuesta.aceptada_por_sunat === true) return { estadoProveedor: "ACEPTADO_SUNAT", detalleProveedor: descripcionSunat || null };
  const estadoRemoto = [respuesta.estado, respuesta.status, respuesta.estado_comprobante].find((valor): valor is string => typeof valor === "string")?.trim().toLocaleLowerCase("es-PE") ?? "";
  if (ticket !== undefined && ticket !== null && String(ticket).trim()) return { estadoProveedor: "EN_PROCESO", detalleProveedor: descripcionSunat || "Ticket SUNAT " + String(ticket) };
  if (["en cola", "queued", "queue", "en proceso", "processing", "procesando", "pendiente"].some((texto) => estadoRemoto.includes(texto))) return { estadoProveedor: "EN_PROCESO", detalleProveedor: descripcionSunat || estadoRemoto };
  if (datos.ambiente !== "DEMO" && respuesta.aceptada_por_sunat === false) return { estadoProveedor: "RECHAZADO_SUNAT", detalleProveedor: descripcionSunat || null };
  if (estado.startsWith("ERROR")) return { estadoProveedor: "ERROR_EMISION", detalleProveedor: descripcionSunat || null };
  return { estadoProveedor: "EMITIDO", detalleProveedor: descripcionSunat || null };
}

function enlaceArchivoDrive(datos: Record<string, unknown>, tipo: string) {
  const archivosDrive = datos.archivosDrive && typeof datos.archivosDrive === "object" ? datos.archivosDrive as Record<string, unknown> : {};
  const guardados = Array.isArray(archivosDrive.guardados) ? archivosDrive.guardados as Record<string, unknown>[] : [];
  const archivo = guardados.find((item) => item.tipo === tipo && typeof item.ruta === "string");
  return typeof archivo?.ruta === "string" ? archivo.ruta : null;
}

function texto(valor: unknown, campo: string, maximo: number, requerido = false) {
  if (valor === undefined || valor === null || valor === "") { if (requerido) throw new BadRequestException(`${campo} es obligatorio.`); return null; }
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim())) throw new BadRequestException(`${campo} no es válido.`);
  return valor.trim() || null;
}
function numero(valor: unknown, campo: string, escala: number, minimo: number) {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(n) || n < minimo || Number(n.toFixed(escala)) !== n) throw new BadRequestException(`${campo} debe tener hasta ${escala} decimales y ser mayor que ${minimo === 0 ? "o igual a cero" : "cero"}.`);
  return n;
}
const uuidValido = (valor: unknown) => typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const diasEntreFechas = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00.000Z`) - Date.parse(`${desde}T00:00:00.000Z`)) / 86_400_000);
const validarFecha = (fecha: string, nombre: string) => {
  const parseada = new Date(`${fecha}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(parseada.getTime()) || parseada.toISOString().slice(0, 10) !== fecha || fecha > fechaActualPeru()) {
    throw new BadRequestException(`${nombre} debe ser una fecha real y no futura.`);
  }
};
function validarDetallesGestion(valor: unknown, permitirVacio: boolean) {
  if (!Array.isArray(valor) || (!permitirVacio && valor.length === 0) || valor.length > 100) throw new BadRequestException(permitirVacio ? "Los detalles deben ser una lista de hasta 100 líneas." : "Agrega entre 1 y 100 líneas.");
  return valor.map((entrada, indice) => {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException(`La línea ${indice + 1} no es válida.`);
    const linea = entrada as Record<string, unknown>;
    if (linea.tipo !== "PRODUCTO" && linea.tipo !== "SERVICIO") throw new BadRequestException(`La línea ${indice + 1} debe ser un repuesto o un trabajo.`);
    if (linea.tipo === "PRODUCTO" && !uuidValido(linea.presentacionId)) throw new BadRequestException(`Selecciona la presentación del repuesto en la línea ${indice + 1}.`);
    const descripcion = linea.tipo === "SERVICIO" ? texto(linea.descripcion, `La descripción de la línea ${indice + 1}`, 240, true)! : texto(linea.nombreVisible, `El nombre del repuesto en la línea ${indice + 1}`, 240) ?? "Repuesto";
    const cantidad = numero(linea.cantidad, `La cantidad de la línea ${indice + 1}`, 3, 0.001);
    const precioUnitario = numero(linea.precioUnitario, `El precio de la línea ${indice + 1}`, 4, 0);
    const descuento = linea.descuento === undefined ? 0 : numero(linea.descuento, `El descuento de la línea ${indice + 1}`, 2, 0);
    if (descuento > redondear(cantidad * precioUnitario)) throw new BadRequestException(`El descuento de la línea ${indice + 1} supera su importe.`);
    const afectacionIgv = linea.afectacionIgv ?? "GRAVADO";
    if (!( ["GRAVADO", "EXONERADO", "INAFECTO"] as unknown[]).includes(afectacionIgv)) throw new BadRequestException(`La afectación de IGV de la línea ${indice + 1} no es válida.`);
    return linea.tipo === "PRODUCTO"
      ? { tipo: linea.tipo, presentacionId: linea.presentacionId as string, cantidad: cantidad.toFixed(3), precioUnitario: precioUnitario.toFixed(4), descuento: descuento.toFixed(2), afectacionIgv, nombreVisible: descripcion }
      : { tipo: linea.tipo, descripcion, cantidad: cantidad.toFixed(3), precioUnitario: precioUnitario.toFixed(4), descuento: descuento.toFixed(2), afectacionIgv, nombreVisible: descripcion };
  });
}
@Injectable()
export class ServicioIngresos {
  async listarOrdenesServicio(busquedaEntrada?: string) {
    const busqueda = busquedaEntrada?.trim();
    const filas = await db.select({ orden: ordenesServicio, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno, razonSocial: personas.razonSocial })
      .from(ordenesServicio).innerJoin(personas, eq(ordenesServicio.clienteId, personas.id))
      .where(busqueda ? or(ilike(ordenesServicio.codigo, `%${busqueda}%`), ilike(ordenesServicio.vehiculoPlaca, `%${busqueda}%`), ilike(ordenesServicio.vehiculoVin, `%${busqueda}%`), ilike(personas.nombres, `%${busqueda}%`), ilike(personas.razonSocial, `%${busqueda}%`)) : undefined)
      .orderBy(desc(ordenesServicio.actualizadoEn)).limit(200);
    return filas.map(({ orden, ...cliente }) => ({ ...orden, clienteNombre: cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ") }));
  }

  async crearOrdenServicio(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Completa los datos de la orden de servicio.");
    const datos = valor as Record<string, unknown>;
    if (!uuidValido(datos.clienteId)) throw new BadRequestException("Selecciona un cliente para la orden.");
    const [cliente] = await db.select({ id: clientes.personaId }).from(clientes).where(and(eq(clientes.personaId, datos.clienteId as string), eq(clientes.activo, true))).limit(1);
    if (!cliente) throw new NotFoundException("El cliente no está activo.");
    const placa = texto(datos.vehiculoPlaca, "La placa o identificador del vehículo", 20, true)!;
    const detalles = validarDetallesGestion(datos.detalles, true);
    const fechaRecepcion = texto(datos.fechaRecepcion, "La fecha de recepción", 10, true)!;
    validarFecha(fechaRecepcion, "La fecha de recepción");
    const id = randomUUID();
    const [orden] = await db.insert(ordenesServicio).values({ id, codigo: `OS-${id.slice(0, 8).toUpperCase()}`, clienteId: cliente.id,
      vehiculoPlaca: placa.toLocaleUpperCase("es-PE"), vehiculoVin: texto(datos.vehiculoVin, "El VIN", 40), vehiculoMarca: texto(datos.vehiculoMarca, "La marca", 100),
      vehiculoModelo: texto(datos.vehiculoModelo, "El modelo", 100), motivo: texto(datos.motivo, "El motivo de ingreso", 2000, true)!, diagnostico: texto(datos.diagnostico, "El diagnóstico", 5000),
      detalles, fechaRecepcion, claveEmision: randomUUID(), usuarioId }).returning();
    return orden;
  }

  async actualizarOrdenServicio(id: string, valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos de actualización no son válidos.");
    const [actual] = await db.select().from(ordenesServicio).where(eq(ordenesServicio.id, id)).limit(1);
    if (!actual) throw new NotFoundException("No se encontró la orden de servicio.");
    if (!["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"].includes(actual.estado)) throw new ConflictException("Esta orden ya no admite cambios.");
    const datos = valor as Record<string, unknown>;
    const estado = datos.estado === undefined ? actual.estado : datos.estado;
    if (!(["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"] as unknown[]).includes(estado)) throw new BadRequestException("Selecciona un estado válido para la orden.");
    const detalles = datos.detalles === undefined ? actual.detalles : validarDetallesGestion(datos.detalles, true);
    const [orden] = await db.update(ordenesServicio).set({ estado: estado as string,
      diagnostico: datos.diagnostico === undefined ? actual.diagnostico : texto(datos.diagnostico, "El diagnóstico", 5000),
      motivo: datos.motivo === undefined ? actual.motivo : texto(datos.motivo, "El motivo de ingreso", 2000, true)!,
      detalles, notasTrabajo: typeof datos.notaAvance === "string" && datos.notaAvance.trim() ? [...actual.notasTrabajo, { fecha: new Date().toISOString(), texto: texto(datos.notaAvance, "La nota de avance", 2000, true)!, usuarioId }] : actual.notasTrabajo, actualizadoEn: new Date() })
      .where(and(eq(ordenesServicio.id, id), inArray(ordenesServicio.estado, ["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"]))).returning();
    if (!orden) throw new ConflictException("La orden cambió mientras la actualizabas. Recarga e inténtalo otra vez.");
    return orden;
  }

  async emitirOrdenServicio(id: string, valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Elige el comprobante para cerrar la orden.");
    const datos = valor as Record<string, unknown>;
    const tipoComprobante = datos.tipoComprobante === "FACTURA" ? "FACTURA" : datos.tipoComprobante === "NOTA_VENTA" ? "NOTA_VENTA" : "BOLETA";
    const [orden] = await db.update(ordenesServicio).set({ estado: "EMITIENDO", actualizadoEn: new Date() })
      .where(and(eq(ordenesServicio.id, id), inArray(ordenesServicio.estado, ["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"]))).returning();
    if (!orden) throw new ConflictException("La orden ya fue cerrada, está en emisión o no existe.");
    try {
      await this.validarPreciosCotizados(orden.detalles);
      const ingreso = await this.crear({ idempotencyKey: orden.claveEmision, fecha: fechaActualPeru(), tipoComprobante, clienteId: orden.clienteId,
        medioPago: typeof datos.medioPago === "string" ? datos.medioPago : "EFECTIVO", condicionPago: "CONTADO",
        observacion: `Orden de servicio ${orden.codigo} · Vehículo ${orden.vehiculoPlaca}. ${orden.motivo}`,
        detalles: orden.detalles }, usuarioId);
      await db.update(ordenesServicio).set({ estado: "FACTURADA", fechaCierre: fechaActualPeru(), ingresoId: ingreso.id, actualizadoEn: new Date() }).where(eq(ordenesServicio.id, orden.id));
      return { ordenId: orden.id, ingreso };
    } catch (error) {
      await db.update(ordenesServicio).set({ estado: "COMPLETADA", actualizadoEn: new Date() }).where(and(eq(ordenesServicio.id, orden.id), eq(ordenesServicio.estado, "EMITIENDO")));
      throw error;
    }
  }

  async listarCotizaciones(busquedaEntrada?: string) {
    const busqueda = busquedaEntrada?.trim();
    const filas = await db.select({ cotizacion: cotizaciones, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno, razonSocial: personas.razonSocial })
      .from(cotizaciones).innerJoin(personas, eq(cotizaciones.clienteId, personas.id))
      .where(busqueda ? or(ilike(cotizaciones.codigo, `%${busqueda}%`), ilike(personas.nombres, `%${busqueda}%`), ilike(personas.razonSocial, `%${busqueda}%`)) : undefined)
      .orderBy(desc(cotizaciones.creadoEn)).limit(200);
    return filas.map(({ cotizacion, ...cliente }) => ({ ...cotizacion, clienteNombre: cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ") }));
  }

  async crearCotizacion(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Completa la cotización.");
    const datos = valor as Record<string, unknown>;
    if (!uuidValido(datos.clienteId)) throw new BadRequestException("Selecciona un cliente.");
    const [cliente] = await db.select({ id: clientes.personaId }).from(clientes).where(and(eq(clientes.personaId, datos.clienteId as string), eq(clientes.activo, true))).limit(1);
    if (!cliente) throw new NotFoundException("El cliente no está activo.");
    const detalles = validarDetallesGestion(datos.detalles, false);
    const fecha = fechaActualPeru();
    const id = randomUUID();
    const [cotizacion] = await db.insert(cotizaciones).values({ id, codigo: `COT-${id.slice(0, 8).toUpperCase()}`, clienteId: cliente.id,
      detalles, observacion: texto(datos.observacion, "La observación", 2000), fecha,
      vigenteHasta: texto(datos.vigenteHasta, "La vigencia", 10), claveEmision: randomUUID(), usuarioId }).returning();
    return cotizacion;
  }

  async cambiarEstadoCotizacion(id: string, valor: unknown) {
    const estado = valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>).estado : null;
    if (!(["ENVIADA", "ACEPTADA", "RECHAZADA", "ANULADA"] as unknown[]).includes(estado)) throw new BadRequestException("Selecciona un estado válido para la cotización.");
    const [cotizacion] = await db.update(cotizaciones).set({ estado: estado as string, actualizadoEn: new Date() })
      .where(and(eq(cotizaciones.id, id), inArray(cotizaciones.estado, ["BORRADOR", "ENVIADA", "ACEPTADA"]))).returning();
    if (!cotizacion) throw new NotFoundException("La cotización no existe o ya fue convertida.");
    return cotizacion;
  }

  async convertirCotizacion(id: string, valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Elige el comprobante de la venta.");
    const datos = valor as Record<string, unknown>;
    const [existente] = await db.select().from(cotizaciones).where(eq(cotizaciones.id, id)).limit(1);
    if (!existente) throw new NotFoundException("No se encontró la cotización.");
    if (existente.vigenteHasta && existente.vigenteHasta < fechaActualPeru()) throw new ConflictException("La cotización venció. Actualiza sus precios y vigencia antes de convertirla.");
    await this.validarPreciosCotizados(existente.detalles);
    const [cotizacion] = await db.update(cotizaciones).set({ estado: "CONVERTIDA", actualizadoEn: new Date() })
      .where(and(eq(cotizaciones.id, id), inArray(cotizaciones.estado, ["BORRADOR", "ENVIADA", "ACEPTADA"]))).returning();
    if (!cotizacion) throw new ConflictException("La cotización ya no puede convertirse.");
    try {
      const ingreso = await this.crear({ idempotencyKey: cotizacion.claveEmision, fecha: fechaActualPeru(), tipoComprobante: datos.tipoComprobante ?? "BOLETA", clienteId: cotizacion.clienteId,
        medioPago: typeof datos.medioPago === "string" ? datos.medioPago : "EFECTIVO", condicionPago: "CONTADO", observacion: `Cotización ${cotizacion.codigo}${cotizacion.observacion ? ` · ${cotizacion.observacion}` : ""}`,
        detalles: cotizacion.detalles }, usuarioId);
      await db.update(cotizaciones).set({ ingresoId: ingreso.id, estado: "CONVERTIDA", actualizadoEn: new Date() }).where(eq(cotizaciones.id, cotizacion.id));
      return { cotizacionId: cotizacion.id, ingreso };
    } catch (error) {
      await db.update(cotizaciones).set({ estado: "ACEPTADA", actualizadoEn: new Date() }).where(and(eq(cotizaciones.id, cotizacion.id), eq(cotizaciones.estado, "CONVERTIDA")));
      throw error;
    }
  }

  private async validarPreciosCotizados(detalles: unknown) {
    if (!Array.isArray(detalles)) throw new BadRequestException("No se encontraron líneas válidas para emitir.");
    for (const item of detalles) {
      if (!item || typeof item !== "object" || (item as Record<string, unknown>).tipo !== "PRODUCTO") continue;
      const linea = item as Record<string, unknown>;
      if (!uuidValido(linea.presentacionId)) throw new BadRequestException("Una línea de repuesto no tiene una presentación válida.");
      const cantidad = numero(linea.cantidad, "La cantidad de repuesto", 3, 0.001);
      const precioCotizado = numero(linea.precioUnitario, "El precio cotizado", 4, 0);
      const [precio] = await db.select({ valor: preciosProductos.precio }).from(preciosProductos)
        .innerJoin(tiposListasPrecio, and(eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id), eq(tiposListasPrecio.codigo, "GENERAL"), eq(tiposListasPrecio.activo, true)))
        .where(and(eq(preciosProductos.presentacionId, linea.presentacionId as string), eq(preciosProductos.activo, true), lte(preciosProductos.cantidadMinima, String(cantidad)),
          sql`(${preciosProductos.vigenteDesde} IS NULL OR ${preciosProductos.vigenteDesde} <= now())`, sql`(${preciosProductos.vigenteHasta} IS NULL OR ${preciosProductos.vigenteHasta} > now())`))
        .orderBy(desc(preciosProductos.cantidadMinima)).limit(1);
      if (!precio || Number(precio.valor) !== precioCotizado) throw new ConflictException("Cambió el precio de un repuesto desde que se registró. Revisa y actualiza la orden o cotización antes de emitir.");
    }
  }

  async listarGuias(paginaEntrada?: string, porPaginaEntrada?: string) {
    const pagina = Math.max(1, Number.parseInt(paginaEntrada ?? "1", 10) || 1);
    const porPagina = Math.min(50, Math.max(1, Number.parseInt(porPaginaEntrada ?? "10", 10) || 10));
    const [{ total }] = await db.select({ total: count() }).from(guiasRemision);
    const filas = await db.select().from(guiasRemision).orderBy(desc(guiasRemision.creadoEn)).limit(porPagina).offset((pagina - 1) * porPagina);
    const items = filas.map((fila) => {
      const datos = fila.datosNubefact && typeof fila.datosNubefact === "object" ? fila.datosNubefact as Record<string, unknown> : {};
      const respuesta = datos.respuesta && typeof datos.respuesta === "object" ? datos.respuesta as Record<string, unknown> : {};
      return { id: fila.id, tipo: fila.tipo, fecha: fila.fecha, codigo: `${fila.serie}-${String(fila.numero).padStart(6, "0")}`,
        estado: fila.estado, detalle: typeof respuesta.sunat_description === "string" ? respuesta.sunat_description : null,
        enlacePdf: typeof respuesta.enlace_del_pdf === "string" ? respuesta.enlace_del_pdf : null,
        enlaceXml: typeof respuesta.enlace_del_xml === "string" ? respuesta.enlace_del_xml : null,
        enlaceCdr: typeof respuesta.enlace_del_cdr === "string" ? respuesta.enlace_del_cdr : null };
    });
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async emitirGuia(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Completa los datos de la guía de remisión.");
    const datos = valor as Record<string, unknown>;
    const tipo = datos.tipo === "REMITENTE" || datos.tipo === "TRANSPORTISTA" ? datos.tipo : null;
    if (!tipo) throw new BadRequestException("Selecciona guía de remitente o transportista.");
    const tipoNumero = tipo === "REMITENTE" ? 7 : 8;
    const estadoEmisor = await this.estadoNubefact();
    if (!estadoEmisor.credencialesConfiguradas) throw new BadRequestException("Configura la ruta y el token de NubeFact antes de emitir una guía.");
    const serie = (tipo === "REMITENTE" ? process.env.NUBEFACT_SERIE_GUIA_REMITENTE : process.env.NUBEFACT_SERIE_GUIA_TRANSPORTISTA)?.trim() ?? "";
    if (!new RegExp(tipo === "REMITENTE" ? "^T[A-Z0-9]{3}$" : "^V[A-Z0-9]{3}$").test(serie)) throw new BadRequestException(`Configura una serie de cuatro caracteres válida para la guía de ${tipo.toLocaleLowerCase("es-PE")} en el servidor.`);
    const requerido = (campo: string, etiqueta: string, maximo = 150) => texto(datos[campo], etiqueta, maximo, true)!;
    const fecha = fechaActualPeru();
    const inicio = requerido("fechaInicio", "La fecha de inicio del traslado", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || Number.isNaN(Date.parse(`${inicio}T00:00:00.000Z`))) throw new BadRequestException("La fecha de inicio del traslado no es válida.");
    if (inicio < fecha) throw new BadRequestException("La fecha de inicio del traslado no puede ser anterior a hoy.");
    const documentoTipo = requerido("clienteTipoDocumento", "El tipo de documento", 1);
    if (!new Set(["1", "4", "6", "7", "A"]).has(documentoTipo)) throw new BadRequestException("El documento del destinatario/remitente no es válido.");
    const documentoNumero = requerido("clienteNumeroDocumento", "El número de documento", 15);
    const nombre = requerido("clienteNombre", "El nombre o razón social", 100);
    const direccion = requerido("clienteDireccion", "La dirección del destinatario/remitente", 100);
    const peso = numero(datos.pesoBrutoTotal, "El peso bruto total", 3, 0.001);
    const bultos = numero(datos.numeroBultos, "El número de bultos", 0, 1);
    const tipoTransporte = tipo === "REMITENTE" ? requerido("tipoTransporte", "El tipo de transporte", 2) : "";
    if (tipo === "REMITENTE" && !["01", "02"].includes(tipoTransporte)) throw new BadRequestException("Selecciona transporte público o privado.");
    const itemsEntrada = Array.isArray(datos.items) ? datos.items : [];
    if (!itemsEntrada.length || itemsEntrada.length > 100) throw new BadRequestException("Agrega entre 1 y 100 bienes a trasladar.");
    const items = itemsEntrada.map((item, indice) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new BadRequestException(`El bien ${indice + 1} no es válido.`);
      const linea = item as Record<string, unknown>;
      return { unidad_de_medida: texto(linea.unidad, `La unidad del bien ${indice + 1}`, 3, true), codigo: texto(linea.codigo, `El código del bien ${indice + 1}`, 40) ?? "",
        descripcion: texto(linea.descripcion, `La descripción del bien ${indice + 1}`, 250, true), cantidad: numero(linea.cantidad, `La cantidad del bien ${indice + 1}`, 3, 0.001) };
    });
    const codigoDocumento = (codigo: string) => ({ DNI: "1", RUC: "6", CE: "4", PASAPORTE: "7", CEDULA_DIPLOMATICA: "A" } as Record<string, string>)[codigo] ?? codigo;
    const partidaUbigeo = requerido("partidaUbigeo", "El ubigeo de partida", 6);
    const partidaDireccion = requerido("partidaDireccion", "La dirección de partida", 150);
    const llegadaUbigeo = requerido("llegadaUbigeo", "El ubigeo de llegada", 6);
    const llegadaDireccion = requerido("llegadaDireccion", "La dirección de llegada", 150);
    const solicitud: Record<string, unknown> = {
      operacion: "generar_guia", tipo_de_comprobante: tipoNumero, serie,
      numero: "", cliente_tipo_de_documento: codigoDocumento(documentoTipo), cliente_numero_de_documento: documentoNumero,
      cliente_denominacion: nombre, cliente_direccion: direccion, fecha_de_emision: `${fecha.slice(8, 10)}-${fecha.slice(5, 7)}-${fecha.slice(0, 4)}`,
      observaciones: texto(datos.observaciones, "Las observaciones", 1000) ?? "", peso_bruto_total: peso, peso_bruto_unidad_de_medida: "KGM",
      numero_de_bultos: bultos, fecha_de_inicio_de_traslado: `${inicio.slice(8, 10)}-${inicio.slice(5, 7)}-${inicio.slice(0, 4)}`,
      punto_de_partida_ubigeo: partidaUbigeo, punto_de_partida_direccion: partidaDireccion,
      punto_de_partida_codigo_establecimiento_sunat: "0000", punto_de_llegada_ubigeo: llegadaUbigeo, punto_de_llegada_direccion: llegadaDireccion,
      punto_de_llegada_codigo_establecimiento_sunat: "0000", enviar_automaticamente_al_cliente: false, formato_de_pdf: "", items,
    };
    if (tipo === "REMITENTE") {
      solicitud.motivo_de_traslado = requerido("motivoTraslado", "El motivo del traslado", 2);
      solicitud.tipo_de_transporte = tipoTransporte;
      if (tipoTransporte === "01") {
        const entrega = requerido("fechaEntregaTransportista", "La fecha de entrega al transportista", 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entrega) || Number.isNaN(Date.parse(`${entrega}T00:00:00.000Z`))) throw new BadRequestException("La fecha de entrega al transportista no es válida.");
        solicitud.fecha_de_entrega_al_transportista = `${entrega.slice(8, 10)}-${entrega.slice(5, 7)}-${entrega.slice(0, 4)}`;
        solicitud.transportista_documento_tipo = "6";
        solicitud.transportista_documento_numero = requerido("transportistaRuc", "El RUC del transportista", 11);
        if (!/^\d{11}$/.test(String(solicitud.transportista_documento_numero))) throw new BadRequestException("El RUC del transportista debe tener 11 dígitos.");
        solicitud.transportista_denominacion = requerido("transportistaNombre", "El nombre del transportista", 100);
      }
      if (solicitud.motivo_de_traslado === "13") solicitud.motivo_de_traslado_otros_descripcion = requerido("motivoTrasladoOtros", "La descripción del motivo de traslado", 70);
    } else {
      solicitud.destinatario_documento_tipo = codigoDocumento(requerido("destinatarioTipoDocumento", "El tipo de documento del destinatario", 1));
      solicitud.destinatario_documento_numero = requerido("destinatarioNumeroDocumento", "El número de documento del destinatario", 15);
      solicitud.destinatario_denominacion = requerido("destinatarioNombre", "El nombre del destinatario", 100);
    }
    solicitud.transportista_placa_numero = requerido("placa", "La placa del vehículo", 8).toLocaleUpperCase("es-PE");
    if (tipo === "TRANSPORTISTA" || tipoTransporte === "02") {
      solicitud.conductor_documento_tipo = codigoDocumento(requerido("conductorTipoDocumento", "El tipo de documento del conductor", 1));
      solicitud.conductor_documento_numero = requerido("conductorNumeroDocumento", "El número de documento del conductor", 15);
      solicitud.conductor_nombre = requerido("conductorNombre", "Los nombres del conductor", 250);
      solicitud.conductor_apellidos = requerido("conductorApellidos", "Los apellidos del conductor", 250);
      solicitud.conductor_numero_licencia = requerido("conductorLicencia", "La licencia del conductor", 10);
    }
    const [correlativo] = await db.insert(nubefactCorrelativos).values({ ambiente: estadoEmisor.ambiente, serie, tipoComprobante: tipoNumero, ultimoNumero: 1 }).onConflictDoUpdate({
      target: [nubefactCorrelativos.ambiente, nubefactCorrelativos.serie, nubefactCorrelativos.tipoComprobante],
      set: { ultimoNumero: sql`${nubefactCorrelativos.ultimoNumero} + 1`, actualizadoEn: new Date() },
    }).returning({ numero: nubefactCorrelativos.ultimoNumero });
    solicitud.numero = correlativo.numero;
    const id = randomUUID();
    await db.insert(guiasRemision).values({ id, tipo, fecha, ambiente: estadoEmisor.ambiente, serie, numero: correlativo.numero, estado: "NUBEFACT_PENDIENTE", datosNubefact: { solicitud }, usuarioId });
    let respuesta: Response;
    try { respuesta = await fetch(process.env.NUBEFACT_RUTA!.trim(), { method: "POST", headers: { Authorization: process.env.NUBEFACT_TOKEN!.trim(), "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(solicitud), signal: AbortSignal.timeout(validarConfiguracionEntorno().timeoutNubefactMs) }); }
    catch { return { id, tipo, codigo: `${serie}-${String(correlativo.numero).padStart(6, "0")}`, estado: "NUBEFACT_PENDIENTE", mensaje: "No hubo respuesta. Consulta el estado antes de volver a emitir." }; }
    let cuerpo: Record<string, unknown> = {};
    try { const json: unknown = await respuesta.json(); if (json && typeof json === "object" && !Array.isArray(json)) cuerpo = json as Record<string, unknown>; } catch { cuerpo = { error: "NubeFact no devolvió una respuesta válida." }; }
    const error = cuerpo.errors ?? cuerpo.error ?? cuerpo.mensaje;
    const rechazado = !respuesta.ok || Boolean(error);
    await db.update(guiasRemision).set({ estado: rechazado ? "ERROR_NUBEFACT" : "PENDIENTE_SUNAT", datosNubefact: { solicitud, respuesta: cuerpo } }).where(eq(guiasRemision.id, id));
    return { id, tipo, codigo: `${serie}-${String(correlativo.numero).padStart(6, "0")}`, estado: rechazado ? "ERROR_NUBEFACT" : "PENDIENTE_SUNAT", mensaje: typeof error === "string" ? error : null };
  }

  async consultarGuia(idEntrada: string) {
    if (!uuidValido(idEntrada)) throw new BadRequestException("La guía no es válida.");
    const [guia] = await db.select().from(guiasRemision).where(eq(guiasRemision.id, idEntrada)).limit(1);
    if (!guia) throw new NotFoundException("No se encontró la guía de remisión.");
    const datos = guia.datosNubefact && typeof guia.datosNubefact === "object" ? guia.datosNubefact as Record<string, unknown> : {};
    const solicitud = { operacion: "consultar_guia", tipo_de_comprobante: guia.tipo === "REMITENTE" ? 7 : 8, serie: guia.serie, numero: guia.numero };
    const respuesta = await fetch(process.env.NUBEFACT_RUTA!.trim(), { method: "POST", headers: { Authorization: process.env.NUBEFACT_TOKEN!.trim(), "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(solicitud), signal: AbortSignal.timeout(validarConfiguracionEntorno().timeoutNubefactMs) });
    let cuerpo: Record<string, unknown> = {};
    try { const json: unknown = await respuesta.json(); if (json && typeof json === "object" && !Array.isArray(json)) cuerpo = json as Record<string, unknown>; } catch { cuerpo = { error: "NubeFact no devolvió una respuesta válida." }; }
    const nuevoEstado = respuesta.ok && cuerpo.aceptada_por_sunat === true ? "EMITIDO" : respuesta.ok && cuerpo.aceptada_por_sunat === false && cuerpo.sunat_soap_error ? "RECHAZADO_SUNAT" : respuesta.ok ? "PENDIENTE_SUNAT" : "ERROR_NUBEFACT";
    await db.update(guiasRemision).set({ estado: nuevoEstado, datosNubefact: { ...datos, consulta: solicitud, respuesta: cuerpo } }).where(eq(guiasRemision.id, guia.id));
    return { id: guia.id, tipo: guia.tipo, codigo: `${guia.serie}-${String(guia.numero).padStart(6, "0")}`, estado: nuevoEstado,
      enlacePdf: typeof cuerpo.enlace_del_pdf === "string" ? cuerpo.enlace_del_pdf : null,
      enlaceXml: typeof cuerpo.enlace_del_xml === "string" ? cuerpo.enlace_del_xml : null,
      enlaceCdr: typeof cuerpo.enlace_del_cdr === "string" ? cuerpo.enlace_del_cdr : null,
      detalle: typeof cuerpo.sunat_description === "string" ? cuerpo.sunat_description : null };
  }

  async mediosPagoDisponibles() {
    const cuentas = await db.select({ tipo: cuentasFinancieras.tipo }).from(cuentasFinancieras)
      .where(and(eq(cuentasFinancieras.activa, true), eq(cuentasFinancieras.moneda, "PEN")));
    const disponibles = new Set<string>(cuentas.flatMap((cuenta) => {
      const medio = mediosPagoPorCuenta[cuenta.tipo as keyof typeof mediosPagoPorCuenta];
      return medio ? [medio] : [];
    }));
    return mediosPago.filter((medioPago) => disponibles.has(medioPago))
      .map((codigo) => ({ codigo, nombre: nombreMedioPago[codigo] }));
  }

  constructor(private readonly drive: ServicioGoogleDrive) {}

  private async archivarNubeFact(entidadTipo: string, entidadId: string, tipoComprobante: string, codigo: string, respuesta: Record<string, unknown>) {
    try { return await this.drive.archivarDocumentosNubeFact(entidadTipo, entidadId, tipoComprobante, codigo, respuesta); }
    catch (causa) { return { guardados: [], errores: [{ tipo: "GENERAL", mensaje: causa instanceof Error ? causa.message : "No se pudieron archivar los documentos de NubeFact." }] }; }
  }

  async listarVentas(filtros: { tipoVenta?: string; pagina?: string; porPagina?: string; busqueda?: string }) {
    const tipoVenta = filtros.tipoVenta === "MOTOTAXIS" ? "MOTOTAXIS" : filtros.tipoVenta === "REPUESTOS" ? "REPUESTOS" : null;
    if (!tipoVenta) throw new BadRequestException("Selecciona si deseas consultar ventas de repuestos o de mototaxis.");
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const porPagina = Math.min(100, Math.max(1, Number.parseInt(filtros.porPagina ?? "10", 10) || 10));
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const ventaTieneMototaxi = exists(db.select({ id: ingresosDetalle.id }).from(ingresosDetalle)
      .where(and(eq(ingresosDetalle.ingresoId, ingresos.id), eq(ingresosDetalle.tipo, "MOTOTAXI"))));
    const filtroTipo = tipoVenta === "MOTOTAXIS" ? ventaTieneMototaxi : not(ventaTieneMototaxi);
    const detallesCoinciden = busqueda ? exists(db.select({ id: ingresosDetalle.id }).from(ingresosDetalle)
      .where(and(eq(ingresosDetalle.ingresoId, ingresos.id), or(ilike(ingresosDetalle.descripcion, coincidencia), ilike(ingresosDetalle.codigoProducto, coincidencia))))) : undefined;
    const filtroBusqueda = busqueda ? or(ilike(ingresos.codigo, coincidencia), ilike(ingresos.clienteNombre, coincidencia),
      ilike(ingresos.clienteNumeroDocumento, coincidencia), ilike(ingresos.estado, coincidencia), detallesCoinciden) : undefined;
    const condicion = and(filtroTipo, filtroBusqueda);
    const [filas, [conteo]] = await Promise.all([
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, tipoComprobante: ingresos.tipoComprobante,
        clienteNombre: ingresos.clienteNombre, clienteNumeroDocumento: ingresos.clienteNumeroDocumento, medioPago: ingresos.medioPago,
        condicionPago: ingresos.condicionPago, total: ingresos.total, estado: ingresos.estado, datosNubefact: ingresos.datosNubefact })
        .from(ingresos).where(condicion).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn))
        .limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(ingresos).where(condicion),
    ]);
    const items = filas.map((fila) => {
      const datos = fila.datosNubefact && typeof fila.datosNubefact === "object" ? fila.datosNubefact as Record<string, unknown> : {};
      const solicitud = datos.solicitud && typeof datos.solicitud === "object" ? datos.solicitud as Record<string, unknown> : {};
      const serie = typeof solicitud.serie === "string" ? solicitud.serie : "";
      const numero = Number(solicitud.numero ?? 0);
      const respuesta = datos.respuesta && typeof datos.respuesta === "object" ? datos.respuesta as Record<string, unknown> : {};
      const estadoDocumento = analizarEstadoComprobante(fila.estado, datos, respuesta);
      return { id: fila.id, codigoVenta: fila.codigo, codigoComprobante: serie && numero ? `${serie}-${String(numero).padStart(6, "0")}` : fila.codigo,
        fecha: fila.fecha, tipoComprobante: fila.tipoComprobante, clienteNombre: fila.clienteNombre,
        clienteNumeroDocumento: fila.clienteNumeroDocumento, medioPago: fila.medioPago, condicionPago: fila.condicionPago,
        total: fila.total, estado: fila.estado,
        estadoProveedor: estadoDocumento.estadoProveedor, detalleProveedor: estadoDocumento.detalleProveedor,
        enlacePdf: enlaceArchivoDrive(datos, "PDF") ?? enlaceArchivoDrive(datos, "HTML") ?? (typeof respuesta.enlace_del_pdf === "string" ? respuesta.enlace_del_pdf : null),
        enlaceXml: enlaceArchivoDrive(datos, "XML") ?? (typeof respuesta.enlace_del_xml === "string" ? respuesta.enlace_del_xml : null),
        enlaceCdr: enlaceArchivoDrive(datos, "CDR") ?? (typeof respuesta.enlace_del_cdr === "string" ? respuesta.enlace_del_cdr : null),
      };
    });
    const total = conteo?.total ?? 0;
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async obtenerFuenteNota(ingresoIdEntrada: string) {
    if (!uuidValido(ingresoIdEntrada)) throw new BadRequestException("El comprobante no es válido.");
    const [venta] = await db.select().from(ingresos).where(eq(ingresos.id, ingresoIdEntrada)).limit(1);
    if (!venta || !["BOLETA", "FACTURA"].includes(venta.tipoComprobante) || !["EMITIDO", "EMITIDO_DEMO"].includes(venta.estado)) throw new BadRequestException("Solo puedes consultar el detalle de boletas o facturas emitidas correctamente.");
    const originales = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, venta.id)).orderBy(asc(ingresosDetalle.creadoEn));
    const notasEmitidas = await db.select({ datosNubefact: comprobantesRelacionados.datosNubefact, tipo: comprobantesRelacionados.tipoComprobante })
      .from(comprobantesRelacionados).where(and(eq(comprobantesRelacionados.ingresoOrigenId, venta.id), inArray(comprobantesRelacionados.estado, ["EMITIDO", "EMITIDO_DEMO"])));
    const descuentosPorDetalle = new Map<string, number>();
    for (const nota of notasEmitidas) {
      if (nota.tipo !== "NOTA_CREDITO") continue;
      const datos = nota.datosNubefact && typeof nota.datosNubefact === "object" ? nota.datosNubefact as Record<string, unknown> : {};
      const lineas = Array.isArray(datos.lineasOrigen) ? datos.lineasOrigen as { ingresoDetalleId?: unknown; montoAjuste?: unknown }[] : [];
      for (const linea of lineas) if (typeof linea.ingresoDetalleId === "string") descuentosPorDetalle.set(linea.ingresoDetalleId,
        redondear((descuentosPorDetalle.get(linea.ingresoDetalleId) ?? 0) + Number(linea.montoAjuste ?? 0)));
    }
    return { id: venta.id, codigo: venta.codigo, tipoComprobante: venta.tipoComprobante, fecha: venta.fecha, clienteNombre: venta.clienteNombre,
      clienteNumeroDocumento: venta.clienteNumeroDocumento, total: venta.total, moneda: "PEN",
      lineas: originales.map((linea) => ({ id: linea.id, tipo: linea.tipo, codigo: linea.codigoProducto, descripcion: linea.descripcion,
        cantidad: linea.cantidad, unidad: linea.unidadMedidaCodigo, precioUnitario: linea.precioUnitario, subtotal: linea.subtotal, igv: linea.igv, total: linea.total,
        afectacionIgv: linea.afectacionIgv, creditoAplicado: (descuentosPorDetalle.get(linea.id) ?? 0).toFixed(2),
        saldoParaCredito: Math.max(0, Number(linea.total) - (descuentosPorDetalle.get(linea.id) ?? 0)).toFixed(2) })) };
  }

  async listarNotas(ingresoIdEntrada: string) {
    if (!uuidValido(ingresoIdEntrada)) throw new BadRequestException("El comprobante no es válido.");
    const filas = await db.select().from(comprobantesRelacionados).where(eq(comprobantesRelacionados.ingresoOrigenId, ingresoIdEntrada)).orderBy(desc(comprobantesRelacionados.creadoEn));
    return filas.map((fila) => {
      const datos = fila.datosNubefact && typeof fila.datosNubefact === "object" ? fila.datosNubefact as Record<string, unknown> : {};
      const respuesta = datos.respuesta && typeof datos.respuesta === "object" ? datos.respuesta as Record<string, unknown> : {};
      return { id: fila.id, tipoComprobante: fila.tipoComprobante, codigoComprobante: `${fila.serie}-${String(fila.numero).padStart(6, "0")}`,
        codigoMotivo: fila.codigoMotivo, motivo: fila.motivo, fecha: fila.fecha, total: fila.total, estado: fila.estado,
        enlacePdf: enlaceArchivoDrive(datos, "PDF") ?? (typeof respuesta.enlace_del_pdf === "string" ? respuesta.enlace_del_pdf : null),
        enlaceXml: enlaceArchivoDrive(datos, "XML") ?? (typeof respuesta.enlace_del_xml === "string" ? respuesta.enlace_del_xml : null),
        enlaceCdr: enlaceArchivoDrive(datos, "CDR") ?? (typeof respuesta.enlace_del_cdr === "string" ? respuesta.enlace_del_cdr : null) };
    });
  }

  async emitirNota(ingresoIdEntrada: string, entrada: unknown, usuarioId: string) {
    if (!uuidValido(ingresoIdEntrada)) throw new BadRequestException("El comprobante no es válido.");
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException("Completa los datos de la nota.");
    const datos = entrada as Record<string, unknown>;
    const tipo = datos.tipo === "NOTA_DEBITO" ? "NOTA_DEBITO" : datos.tipo === "NOTA_CREDITO" ? "NOTA_CREDITO" : null;
    if (!tipo) throw new BadRequestException("Selecciona nota de crédito o débito.");
    const motivoCodigo = tipo === "NOTA_CREDITO" ? 5 : 2;
    const motivo = tipo === "NOTA_CREDITO" ? "Descuento por ítem" : "Aumento de valor por ítem";
    if (!Array.isArray(datos.lineas) || datos.lineas.length === 0 || datos.lineas.length > 100) throw new BadRequestException("Selecciona uno o más productos o servicios para modificar.");
    if (!datos.lineas.every((linea) => typeof linea === "object" && linea !== null && !Array.isArray(linea))) throw new BadRequestException("Una de las líneas seleccionadas no tiene un formato válido.");
    const lineasEntrada = datos.lineas as Record<string, unknown>[];
    const idsLinea = lineasEntrada.map((linea) => linea.detalleId);
    if (idsLinea.some((id) => !uuidValido(id)) || new Set(idsLinea).size !== idsLinea.length) throw new BadRequestException("Las líneas seleccionadas no son válidas o están repetidas.");
    const [venta] = await db.select().from(ingresos).where(eq(ingresos.id, ingresoIdEntrada)).limit(1);
    if (!venta) throw new NotFoundException("No se encontró la venta.");
    if (!["BOLETA", "FACTURA"].includes(venta.tipoComprobante) || !["EMITIDO", "EMITIDO_DEMO"].includes(venta.estado)) throw new BadRequestException("Solo puedes emitir notas sobre boletas o facturas emitidas correctamente por NubeFact.");
    const emisor = await this.estadoNubefact();
    if (!emisor.credencialesConfiguradas) throw new BadRequestException("Configura la conexión de NubeFact antes de emitir una nota.");
    const datosOrigen = venta.datosNubefact && typeof venta.datosNubefact === "object" ? venta.datosNubefact as Record<string, unknown> : {};
    if (datosOrigen.ambiente !== emisor.ambiente) throw new BadRequestException("La nota debe emitirse desde el mismo ambiente de NubeFact que el comprobante original.");
    const solicitudOrigen = datosOrigen.solicitud && typeof datosOrigen.solicitud === "object" ? datosOrigen.solicitud as Record<string, unknown> : {};
    const origenSerie = typeof solicitudOrigen.serie === "string" ? solicitudOrigen.serie : "";
    const origenNumero = Number(solicitudOrigen.numero ?? 0);
    if (!origenSerie || !origenNumero) throw new BadRequestException("El comprobante original no tiene una numeración de NubeFact válida.");
    const originales = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, venta.id)).orderBy(asc(ingresosDetalle.creadoEn));
    const porId = new Map(originales.map((linea) => [linea.id, linea]));
    const notasEmitidas = tipo === "NOTA_CREDITO" ? await db.select({ datosNubefact: comprobantesRelacionados.datosNubefact, total: comprobantesRelacionados.total })
      .from(comprobantesRelacionados).where(and(eq(comprobantesRelacionados.ingresoOrigenId, venta.id), eq(comprobantesRelacionados.tipoComprobante, "NOTA_CREDITO"), inArray(comprobantesRelacionados.estado, ["EMITIDO", "EMITIDO_DEMO"]))) : [];
    let creditoAcumulado = 0;
    const creditosPorLinea = new Map<string, number>();
    for (const nota of notasEmitidas) {
      creditoAcumulado = redondear(creditoAcumulado + Number(nota.total));
      const datosNota = nota.datosNubefact && typeof nota.datosNubefact === "object" ? nota.datosNubefact as Record<string, unknown> : {};
      const detallesNota = Array.isArray(datosNota.lineasOrigen) ? datosNota.lineasOrigen as { ingresoDetalleId?: unknown; montoAjuste?: unknown }[] : [];
      for (const detalleNota of detallesNota) if (typeof detalleNota.ingresoDetalleId === "string") creditosPorLinea.set(detalleNota.ingresoDetalleId,
        redondear((creditosPorLinea.get(detalleNota.ingresoDetalleId) ?? 0) + Number(detalleNota.montoAjuste ?? 0)));
    }
    const seleccionadas = lineasEntrada.map((entradaLinea) => {
      const detalle = porId.get(entradaLinea.detalleId as string);
      if (!detalle) throw new BadRequestException("Una línea seleccionada no pertenece al comprobante original.");
      const monto = redondear(numero(entradaLinea.monto, `El ajuste de ${detalle.descripcion}`, 2, 0.01));
      if (tipo === "NOTA_CREDITO" && monto > Number(detalle.total) - (creditosPorLinea.get(detalle.id) ?? 0)) throw new BadRequestException(`El descuento de ${detalle.descripcion} supera el saldo disponible de esa línea.`);
      return { detalle, monto };
    });
    const monto = redondear(seleccionadas.reduce((suma, linea) => suma + linea.monto, 0));
    if (tipo === "NOTA_CREDITO" && monto > Number(venta.total) - creditoAcumulado) throw new BadRequestException("La nota de crédito supera el saldo del comprobante original.");
    const tipoNumero = tipo === "NOTA_CREDITO" ? 3 : 4;
    const fecha = fechaActualPeru();
    const [correlativo] = await db.insert(nubefactCorrelativos).values({ ambiente: emisor.ambiente, serie: origenSerie, tipoComprobante: tipoNumero, ultimoNumero: 1 }).onConflictDoUpdate({
      target: [nubefactCorrelativos.ambiente, nubefactCorrelativos.serie, nubefactCorrelativos.tipoComprobante],
      set: { ultimoNumero: sql`${nubefactCorrelativos.ultimoNumero} + 1`, actualizadoEn: new Date() },
    }).returning({ numero: nubefactCorrelativos.ultimoNumero });
    const tasa = Number(venta.tasaIgv);
    const regimenTributario = emisor.regimenTributario;
    const items = seleccionadas.map(({ detalle, monto: importe }) => {
      const gravada = regimenTributario !== "NRUS" && detalle.afectacionIgv === "GRAVADO";
      const baseItem = gravada ? redondear(importe / (1 + tasa / 100)) : importe;
      const igvItem = redondear(importe - baseItem);
      return { unidad_de_medida: detalle.unidadMedidaCodigo || (detalle.tipo === "PRODUCTO" ? "NIU" : "ZZ"), codigo: detalle.codigoProducto || "AJUSTE",
        descripcion: detalle.descripcion, cantidad: Number(detalle.cantidad), valor_unitario: Number((baseItem / Number(detalle.cantidad)).toFixed(10)), precio_unitario: Number((importe / Number(detalle.cantidad)).toFixed(10)), descuento: "",
        subtotal: baseItem, tipo_de_igv: gravada ? 1 : regimenTributario !== "NRUS" && detalle.afectacionIgv === "EXONERADO" ? 8 : 9, igv: igvItem, total: importe,
        anticipo_regularizacion: false, anticipo_documento_serie: "", anticipo_documento_numero: "" };
    });
    const base = redondear(items.reduce((suma, item) => suma + item.subtotal, 0));
    const igv = redondear(items.reduce((suma, item) => suma + item.igv, 0));
    const totalGravada = redondear(items.filter((item) => item.tipo_de_igv === 1).reduce((suma, item) => suma + item.subtotal, 0));
    const totalExonerada = redondear(items.filter((item) => item.tipo_de_igv === 8).reduce((suma, item) => suma + item.subtotal, 0));
    const totalInafecta = redondear(items.filter((item) => item.tipo_de_igv === 9).reduce((suma, item) => suma + item.subtotal, 0));
    const tipoDocumento = venta.tipoComprobante === "FACTURA" ? 1 : 2;
    const id = randomUUID();
    const solicitud = { operacion: "generar_comprobante", tipo_de_comprobante: tipoNumero, serie: origenSerie, numero: correlativo.numero,
      codigo_unico: id,
      sunat_transaction: 1, cliente_tipo_de_documento: ({ DNI: 1, RUC: 6, CE: 4, PASAPORTE: 7 } as Record<string, number>)[venta.clienteTipoDocumento ?? ""] ?? "-",
      cliente_numero_de_documento: venta.clienteNumeroDocumento ?? "-", cliente_denominacion: venta.clienteNombre ?? "CLIENTES VARIOS", cliente_direccion: venta.clienteDireccion ?? "",
      fecha_de_emision: `${fecha.slice(8, 10)}-${fecha.slice(5, 7)}-${fecha.slice(0, 4)}`, fecha_de_vencimiento: "", moneda: 1, tipo_de_cambio: "", porcentaje_de_igv: tasa,
      total_gravada: totalGravada || "", total_inafecta: totalInafecta || "", total_exonerada: totalExonerada || "", total_igv: igv, total: monto,
      documento_que_se_modifica_tipo: tipoDocumento, documento_que_se_modifica_serie: origenSerie, documento_que_se_modifica_numero: origenNumero,
      tipo_de_nota_de_credito: tipo === "NOTA_CREDITO" ? motivoCodigo : "", tipo_de_nota_de_debito: tipo === "NOTA_DEBITO" ? motivoCodigo : "",
      enviar_automaticamente_a_la_sunat: emisor.ambiente === "PRODUCCION", enviar_automaticamente_al_cliente: false,
      condiciones_de_pago: "", medio_de_pago: "", cancelado: true, observaciones: texto(datos.observacion, "La observación", 240) ?? "",
      items };
    const lineasOrigen = seleccionadas.map(({ detalle, monto: montoAjuste }) => ({ ingresoDetalleId: detalle.id, montoAjuste, cantidad: detalle.cantidad }));
    await db.insert(comprobantesRelacionados).values({ id, ingresoOrigenId: venta.id, tipoComprobante: tipo, codigoMotivo: motivoCodigo, motivo,
      fecha, ambiente: emisor.ambiente, serie: origenSerie, numero: correlativo.numero, subtotal: base.toFixed(2), igv: igv.toFixed(2), total: monto.toFixed(2),
      estado: "NUBEFACT_PENDIENTE", datosNubefact: { solicitud, lineasOrigen }, usuarioId });
    await db.insert(comprobantesRelacionadosDetalle).values(seleccionadas.map(({ detalle }) => ({ comprobanteRelacionadoId: id, ingresoDetalleId: detalle.id, cantidad: detalle.cantidad })));
    let respuesta: Response;
    try { respuesta = await fetch(process.env.NUBEFACT_RUTA!.trim(), { method: "POST", headers: { Authorization: process.env.NUBEFACT_TOKEN!.trim(), "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(solicitud), signal: AbortSignal.timeout(validarConfiguracionEntorno().timeoutNubefactMs) }); }
    catch { await db.update(comprobantesRelacionados).set({ estado: "ERROR_NUBEFACT", datosNubefact: { solicitud, lineasOrigen, mensaje: "Sin respuesta del proveedor; confirma su estado en NubeFact antes de reintentar." } }).where(eq(comprobantesRelacionados.id, id)); throw new BadRequestException("No hubo respuesta de NubeFact. Revisa el estado antes de volver a emitir."); }
    let cuerpo: Record<string, unknown>;
    try { const json: unknown = await respuesta.json(); cuerpo = typeof json === "object" && json !== null && !Array.isArray(json) ? json as Record<string, unknown> : {}; } catch { cuerpo = {}; }
    const errores = cuerpo.errors;
    const hayErrores = typeof errores === "string" ? errores.trim().length > 0 : Array.isArray(errores) ? errores.length > 0 : Boolean(errores);
    const aceptada = respuesta.ok && !hayErrores && (emisor.ambiente === "DEMO" ? typeof cuerpo.enlace_del_pdf === "string" && !!cuerpo.enlace_del_pdf : cuerpo.aceptada_por_sunat === true);
    await db.update(comprobantesRelacionados).set({ estado: aceptada ? emisor.ambiente === "DEMO" ? "EMITIDO_DEMO" : "EMITIDO" : emisor.ambiente === "DEMO" ? "ERROR_NUBEFACT_DEMO" : "ERROR_NUBEFACT",
      datosNubefact: { solicitud, respuesta: cuerpo, lineasOrigen } }).where(eq(comprobantesRelacionados.id, id));
    if (!aceptada) throw new BadRequestException(typeof errores === "string" ? errores : "NubeFact no confirmó la emisión de la nota.");
    const codigoComprobante = `${origenSerie}-${String(correlativo.numero).padStart(6, "0")}`;
    const archivosDrive = await this.archivarNubeFact("COMPROBANTE_RELACIONADO", id, tipo, codigoComprobante, cuerpo);
    await db.update(comprobantesRelacionados).set({ datosNubefact: { solicitud, respuesta: cuerpo, lineasOrigen, archivosDrive } }).where(eq(comprobantesRelacionados.id, id));
    return { id, tipoComprobante: tipo, codigoComprobante, estado: emisor.ambiente === "DEMO" ? "EMITIDO_DEMO" : "EMITIDO", archivosDrive };
  }

  async estadoNubefact() {
    const ambiente = process.env.NUBEFACT_AMBIENTE === "PRODUCCION" ? "PRODUCCION" : "DEMO";
    const ruta = process.env.NUBEFACT_RUTA?.trim() ?? "";
    let rutaValida = false;
    try {
      const url = new URL(ruta);
      rutaValida = url.protocol === "https:" && !url.username && !url.password;
    } catch { /* Se informa como una ruta faltante o inválida. */ }
    const credencialesConfiguradas = Boolean(rutaValida && process.env.NUBEFACT_TOKEN?.trim());
    const serieBoleta = process.env.NUBEFACT_SERIE_BOLETA?.trim() ?? "";
    const serieFactura = process.env.NUBEFACT_SERIE_FACTURA?.trim() ?? "";
    const seriesConfiguradas = /^[A-Z0-9]{1,4}$/.test(serieBoleta);
    const serieFacturaConfigurada = /^F[A-Z0-9]{0,3}$/.test(serieFactura);
    const regimenTributario = process.env.REGIMEN_TRIBUTARIO?.trim() || "NRUS";
    const facturaPermitida = ambiente === "DEMO" || regimenTributario !== "NRUS";
    return { ambiente, regimenTributario, credencialesConfiguradas, seriesConfiguradas, emisionHabilitada: credencialesConfiguradas && seriesConfiguradas,
      serieFacturaConfigurada, emisionFacturaHabilitada: credencialesConfiguradas && serieFacturaConfigurada && facturaPermitida };
  }

  async obtenerNumeraciones() {
    const ambiente = process.env.NUBEFACT_AMBIENTE === "PRODUCCION" ? "PRODUCCION" : "DEMO";
    const serieBoleta = process.env.NUBEFACT_SERIE_BOLETA?.trim() || null;
    const serieFactura = process.env.NUBEFACT_SERIE_FACTURA?.trim() || null;
    const correlativos = await db.select({ serie: nubefactCorrelativos.serie, tipoComprobante: nubefactCorrelativos.tipoComprobante, ultimoNumero: nubefactCorrelativos.ultimoNumero }).from(nubefactCorrelativos).where(eq(nubefactCorrelativos.ambiente, ambiente));
    let ultimoNumeroNota = 0;
    try {
      const [correlativoNota] = await db.select({ ultimoNumero: correlativosDocumentosInternos.ultimoNumero }).from(correlativosDocumentosInternos).where(eq(correlativosDocumentosInternos.tipo, "NOTA_VENTA")).limit(1);
      ultimoNumeroNota = Number(correlativoNota?.ultimoNumero ?? 0);
    } catch {
      const [ultimaNota] = await db.select({ ultimoNumero: sql<number | null>`max(substring(${ingresos.codigo} from '^NV-([0-9]+)$')::integer)` })
        .from(ingresos).where(and(eq(ingresos.tipoComprobante, "NOTA_VENTA"), sql`${ingresos.codigo} ~ '^NV-[0-9]+$'`));
      ultimoNumeroNota = Number(ultimaNota?.ultimoNumero ?? 0);
    }
    const siguiente = (serie: string | null, tipo: number) => serie ? Number(correlativos.find((fila) => fila.serie === serie && fila.tipoComprobante === tipo)?.ultimoNumero ?? 0) + 1 : null;
    const formato = (serie: string | null, numero: number | null) => serie && numero ? `${serie}-${String(numero).padStart(6, "0")}` : null;
    const numeroBoleta = siguiente(serieBoleta, 2);
    const numeroFactura = siguiente(serieFactura, 1);
    const numeroNotaVenta = ultimoNumeroNota + 1;
    return { BOLETA: { serie: serieBoleta, numero: numeroBoleta, codigo: formato(serieBoleta, numeroBoleta) },
      FACTURA: { serie: serieFactura, numero: numeroFactura, codigo: formato(serieFactura, numeroFactura) },
      NOTA_VENTA: { serie: "NV", numero: numeroNotaVenta, codigo: `NV-${String(numeroNotaVenta).padStart(6, "0")}` }, ambiente };
  }

  private async recuperarPorIdempotencia(clave: string, huella: string): Promise<any | null> {
    const [venta] = await db.select().from(ingresos).where(eq(ingresos.claveIdempotencia, clave)).limit(1);
    if (!venta) return null;
    if (venta.huellaSolicitud !== huella) throw new ConflictException("La clave de esta solicitud ya se usó con otros datos.");
    const detalles = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, venta.id));
    const nubefact = venta.datosNubefact && typeof venta.datosNubefact === "object" && "estado" in venta.datosNubefact
      ? venta.datosNubefact
      : null;
    return { ...venta, detalles, nubefact };
  }

  private async emitirComprobante(venta: { id: string; tipoComprobante: "BOLETA" | "FACTURA"; fecha: string; clienteTipoDocumento: string | null; clienteNumeroDocumento: string | null; clienteNombre: string | null; clienteDireccion: string | null; clienteCorreo?: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; fechaVencimientoPago: string | null; cuotasPago: { cuota: number; fechaDePago: string; importe: string }[]; observacion: string | null; total: string; igv: string; tasaIgv: string }, detalles: (typeof ingresosDetalle.$inferSelect)[]) {
    const estado = await this.estadoNubefact();
    const esFactura = venta.tipoComprobante === "FACTURA";
    const regimenTributario = estado.regimenTributario;
    if (esFactura ? !estado.emisionFacturaHabilitada : !estado.emisionHabilitada) throw new BadRequestException(`Configura en el servidor la ruta, las credenciales y la serie de ${esFactura ? "facturas" : "boletas"} de NubeFact antes de emitir.`);
    const ambiente = estado.ambiente;
    const ruta = process.env.NUBEFACT_RUTA!.trim(); const token = process.env.NUBEFACT_TOKEN!.trim();
    const tasaIgv = Number(venta.tasaIgv);
    const tipoNumero = esFactura ? 1 : 2;
    const serie = (esFactura ? process.env.NUBEFACT_SERIE_FACTURA : process.env.NUBEFACT_SERIE_BOLETA)!.trim();
    const [correlativo] = await db.insert(nubefactCorrelativos).values({ ambiente, serie, tipoComprobante: tipoNumero, ultimoNumero: 1 }).onConflictDoUpdate({
      target: [nubefactCorrelativos.ambiente, nubefactCorrelativos.serie, nubefactCorrelativos.tipoComprobante],
      set: { ultimoNumero: sql`${nubefactCorrelativos.ultimoNumero} + 1`, actualizadoEn: new Date() },
    }).returning({ numero: nubefactCorrelativos.ultimoNumero });
    const redondearCentimos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const items = detalles.map((detalle) => {
      const cantidad = Number(detalle.cantidad); const precioBrutoUnitario = Number(detalle.precioUnitario);
      const gravada = regimenTributario !== "NRUS" && detalle.afectacionIgv === "GRAVADO";
      const factorIgv = gravada ? 1 + tasaIgv / 100 : 1;
      const precioBaseUnitario = precioBrutoUnitario / factorIgv;
      const descuentoAntesImpuestos = redondearCentimos(Number(detalle.descuento) / factorIgv);
      return {
        unidad_de_medida: detalle.unidadMedidaCodigo || (detalle.tipo === "PRODUCTO" ? "NIU" : "ZZ"),
        codigo: detalle.codigoProducto || "SERVICIO",
        descripcion: detalle.descripcion, cantidad, valor_unitario: Number(precioBaseUnitario.toFixed(10)),
        precio_unitario: Number(precioBrutoUnitario.toFixed(10)), descuento: descuentoAntesImpuestos || "",
        subtotal: Number(detalle.subtotal), tipo_de_igv: gravada ? 1 : regimenTributario !== "NRUS" && detalle.afectacionIgv === "EXONERADO" ? 8 : 9,
        igv: Number(detalle.igv), total: Number(detalle.total),
        anticipo_regularizacion: false, anticipo_documento_serie: "", anticipo_documento_numero: "",
      };
    });
    const sumaAfectacion = (afectacion: AfectacionIgv) => redondearCentimos(detalles.filter((detalle) => detalle.afectacionIgv === afectacion).reduce((suma, detalle) => suma + Number(detalle.subtotal), 0));
    const totalGravada = regimenTributario !== "NRUS" ? sumaAfectacion("GRAVADO") : 0;
    const totalExonerada = regimenTributario !== "NRUS" ? sumaAfectacion("EXONERADO") : 0;
    const totalInafecta = regimenTributario !== "NRUS" ? sumaAfectacion("INAFECTO") : redondearCentimos(detalles.reduce((s, d) => s + Number(d.subtotal), 0));
    const totalDescuento = redondearCentimos(items.reduce((s, item) => s + (typeof item.descuento === "number" ? item.descuento : 0), 0));
    const totalIgv = redondearCentimos(detalles.reduce((suma, detalle) => suma + Number(detalle.igv), 0));
    const codigoDocumento = ({ DNI: 1, RUC: 6, CE: 4, PASAPORTE: 7 } as Record<string, number>)[venta.clienteTipoDocumento ?? ""];
    const fecha = `${venta.fecha.slice(8, 10)}-${venta.fecha.slice(5, 7)}-${venta.fecha.slice(0, 4)}`;
    const fechaVencimiento = venta.fechaVencimientoPago ? `${venta.fechaVencimientoPago.slice(8, 10)}-${venta.fechaVencimientoPago.slice(5, 7)}-${venta.fechaVencimientoPago.slice(0, 4)}` : "";
    const trama = {
      operacion: "generar_comprobante", tipo_de_comprobante: tipoNumero, serie, numero: correlativo.numero, sunat_transaction: 1,
      cliente_tipo_de_documento: codigoDocumento ?? "-", cliente_numero_de_documento: venta.clienteNumeroDocumento ?? "-",
      cliente_denominacion: venta.clienteNombre ?? "CLIENTES VARIOS", cliente_direccion: venta.clienteDireccion ?? "",
      fecha_de_emision: fecha, fecha_de_vencimiento: fechaVencimiento, moneda: 1, tipo_de_cambio: "", porcentaje_de_igv: tasaIgv,
      descuento_global: "", total_descuento: totalDescuento || "", total_anticipo: "", total_gravada: totalGravada || "",
      total_inafecta: totalInafecta || "", total_exonerada: totalExonerada || "", total_igv: totalIgv, total_gratuita: "", total_otros_cargos: "",
      
      observaciones: venta.observacion ?? "", codigo_unico: venta.id.replaceAll("-", "").slice(0, 20),
      enviar_automaticamente_a_la_sunat: ambiente === "PRODUCCION", enviar_automaticamente_al_cliente: false,
      ...(esFactura && venta.clienteCorreo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venta.clienteCorreo) ? { cliente_email: venta.clienteCorreo } : {}),
      condiciones_de_pago: venta.condicionPago === "CREDITO" ? `CRÃ‰DITO CON VENCIMIENTO ${fechaVencimiento}` : "", medio_de_pago: venta.condicionPago === "CREDITO" ? "" : ({ EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia bancaria", BILLETERA_DIGITAL: "Billetera digital", OTRO: "Otro" } as Record<string, string>)[venta.medioPago] ?? venta.medioPago,
      cancelado: venta.condicionPago === "CONTADO", formato_de_pdf: esFactura ? "A4" : "", items, guias: [],
      venta_al_credito: venta.condicionPago === "CREDITO" ? venta.cuotasPago.map((cuota) => ({ cuota: cuota.cuota, fecha_de_pago: `${cuota.fechaDePago.slice(8, 10)}-${cuota.fechaDePago.slice(5, 7)}-${cuota.fechaDePago.slice(0, 4)}`, importe: Number(cuota.importe) })) : [],
    };
    const total = Number(venta.total);
    const solicitud = { ...trama, total };
    await db.update(ingresos).set({ estado: "NUBEFACT_PENDIENTE", datosNubefact: { ambiente, serie, numero: correlativo.numero, solicitud } }).where(eq(ingresos.id, venta.id));
    let respuesta: Response;
    try {
      respuesta = await fetch(ruta, { method: "POST", headers: { Authorization: token, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(solicitud), signal: AbortSignal.timeout(validarConfiguracionEntorno().timeoutNubefactMs) });
    } catch {
      const resultado = { estado: "ERROR", ambiente, serie, numero: correlativo.numero, solicitud, mensaje: "No hubo respuesta del proveedor. Verifica el estado del comprobante en NubeFact antes de volver a emitir." };
      await db.update(ingresos).set({ estado: "NUBEFACT_PENDIENTE", datosNubefact: resultado }).where(eq(ingresos.id, venta.id));
      return { ...resultado, estado: "PENDIENTE" };
    }
    let cuerpo: Record<string, unknown>;
    try { const json: unknown = await respuesta.json(); cuerpo = typeof json === "object" && json !== null && !Array.isArray(json) ? json as Record<string, unknown> : { respuesta: json }; }
    catch { cuerpo = { error: "La respuesta de NubeFact no contenía JSON válido." }; }
    const errores = cuerpo.errors;
    const hayErrores = typeof errores === "string" ? errores.trim().length > 0
      : Array.isArray(errores) ? errores.length > 0
        : typeof errores === "object" && errores !== null ? Object.keys(errores).length > 0
          : Boolean(errores);
    const artefactoDemoEmitido = ambiente === "DEMO" && typeof cuerpo.enlace_del_pdf === "string" && cuerpo.enlace_del_pdf.length > 0;
    const rechazado = !respuesta.ok || hayErrores
      || (ambiente === "PRODUCCION" && cuerpo.aceptada_por_sunat !== true)
      || (ambiente === "DEMO" && !artefactoDemoEmitido);
    const datosNubefact = { ambiente, solicitud, respuesta: cuerpo };
    const estadoEmitido = ambiente === "DEMO" ? "EMITIDO_DEMO" : "EMITIDO";
    await db.update(ingresos).set({ estado: rechazado ? (ambiente === "DEMO" ? "ERROR_NUBEFACT_DEMO" : "ERROR_NUBEFACT") : estadoEmitido, datosNubefact }).where(eq(ingresos.id, venta.id));
    const archivosDrive = rechazado ? null : await this.archivarNubeFact("INGRESO", venta.id, venta.tipoComprobante, `${serie}-${String(correlativo.numero).padStart(6, "0")}`, cuerpo);
    if (archivosDrive) await db.update(ingresos).set({ datosNubefact: { ...datosNubefact, archivosDrive } }).where(eq(ingresos.id, venta.id));
    const mensajeProveedor = [cuerpo.errors, cuerpo.error, cuerpo.mensaje, cuerpo.message]
      .flatMap((valor) => typeof valor === "string" ? [valor.trim()] : Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [])
      .filter(Boolean).join(" ");
    const enlacePdf = archivosDrive?.guardados.find((archivo) => archivo.tipo === "PDF")?.ruta ?? cuerpo.enlace_del_pdf;
    return { estado: rechazado ? "ERROR" : estadoEmitido, ambiente, serie, numero: correlativo.numero, codigo: `${serie}-${String(correlativo.numero).padStart(6, "0")}`, ...(rechazado ? { mensaje: mensajeProveedor || (!respuesta.ok ? `NubeFact respondió con estado HTTP ${respuesta.status}.` : "NubeFact no confirmó la emisión del comprobante.") } : { enlace: cuerpo.enlace, enlacePdf, archivosDrive }) };
  }

  async listarPagos(ingresoIdEntrada: string) {
    if (!uuidValido(ingresoIdEntrada)) throw new BadRequestException("El comprobante no es válido.");
    const filas = await db.select({ id: ingresosPagos.id, ingresoId: ingresosPagos.ingresoId, fechaPago: ingresosPagos.fechaPago,
      importeAplicado: ingresosPagos.importeAplicado, medioPago: ingresosPagos.medioPago, referenciaPago: ingresosPagos.referenciaPago,
      observacion: ingresosPagos.observacion, usuarioId: ingresosPagos.usuarioId, creadoEn: ingresosPagos.creadoEn })
      .from(ingresosPagos).where(eq(ingresosPagos.ingresoId, ingresoIdEntrada)).orderBy(asc(ingresosPagos.fechaPago), asc(ingresosPagos.creadoEn));
    const [suma] = await db.select({ importeAplicado: sql<string>`coalesce(sum(${ingresosPagos.importeAplicado}), 0)::numeric(14,2)` }).from(ingresosPagos).where(eq(ingresosPagos.ingresoId, ingresoIdEntrada));
    const [venta] = await db.select({ total: ingresos.total }).from(ingresos).where(eq(ingresos.id, ingresoIdEntrada)).limit(1);
    if (!venta) throw new NotFoundException("No se encontró el comprobante.");
    const aplicado = Number(suma?.importeAplicado ?? 0);
    return { items: filas, importeAplicadoTotal: aplicado.toFixed(2), saldoPendiente: Math.max(0, redondear(Number(venta.total) - aplicado)).toFixed(2) };
  }
  async registrarPago(ingresoIdEntrada: string, valor: unknown, usuarioId: string) {
    if (!uuidValido(ingresoIdEntrada)) throw new BadRequestException("El comprobante no es válido.");
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del pago no son válidos.");
    const datos = valor as Record<string, unknown>;
    const claveIdempotencia = texto(datos.idempotencyKey, "La clave de pago", 36, true)!;
    if (!uuidValido(claveIdempotencia)) throw new BadRequestException("La clave de pago no es válida.");
    const fechaPago = texto(datos.fechaPago, "La fecha del pago", 10, true)!;
    validarFecha(fechaPago, "La fecha del pago");
    const importeAplicado = numero(datos.importeAplicado, "El importe aplicado", 2, 0.01);
    const medioPago = texto(datos.medioPago, "El medio de pago", 30, true)!;
    if (!(mediosPago as readonly string[]).includes(medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    const cuentaFinancieraId = await validarCuentaFinanciera(datos.cuentaFinancieraId, medioPago, true);
    const referenciaPago = texto(datos.referenciaPago, "La referencia del pago", 120);
    const observacion = texto(datos.observacion, "La observación del pago", 500);
    return db.transaction(async (tx) => {
      const [previo] = await tx.select({ id: ingresosPagos.id, ingresoId: ingresosPagos.ingresoId,
        fechaPago: ingresosPagos.fechaPago, importeAplicado: ingresosPagos.importeAplicado,
        medioPago: ingresosPagos.medioPago, cuentaFinancieraId: ingresosPagos.cuentaFinancieraId, referenciaPago: ingresosPagos.referenciaPago,
        observacion: ingresosPagos.observacion, usuarioId: ingresosPagos.usuarioId, creadoEn: ingresosPagos.creadoEn })
        .from(ingresosPagos).where(eq(ingresosPagos.claveIdempotencia, claveIdempotencia)).limit(1);
      if (previo) {
        if (previo.ingresoId !== ingresoIdEntrada) throw new ConflictException("La clave de pago ya fue usada para otro comprobante.");
        return previo;
      }
      const [ingreso] = await tx.select().from(ingresos).where(eq(ingresos.id, ingresoIdEntrada)).for("update").limit(1);
      if (!ingreso) throw new NotFoundException("No se encontró el comprobante.");
      if (!(ingreso.tipoComprobante === "BOLETA" || ingreso.tipoComprobante === "FACTURA") || !["EMITIDO", "EMITIDO_DEMO"].includes(ingreso.estado)) throw new BadRequestException("Registra cobros únicamente para comprobantes emitidos.");
      const [ultimoPago] = await tx.select({ fecha: sql<string>`max(${ingresosPagos.fechaPago})` }).from(ingresosPagos).where(eq(ingresosPagos.ingresoId, ingresoIdEntrada));
      if (ultimoPago?.fecha && fechaPago < ultimoPago.fecha) throw new BadRequestException("Registra los pagos en orden cronológico. Ya existe un pago hasta " + ultimoPago.fecha + ".");
      const [sumaPagos] = await tx.select({ total: sql<string>`coalesce(sum(${ingresosPagos.importeAplicado}), 0)::numeric(14,2)` }).from(ingresosPagos).where(eq(ingresosPagos.ingresoId, ingresoIdEntrada));
      const importeAplicadoPrevio = Number(sumaPagos?.total ?? 0);
      const inicialPendiente = Math.max(0, redondear(Number(ingreso.importePagoInicial) - importeAplicadoPrevio));
      if (inicialPendiente > 0) {
        if (importeAplicadoPrevio > 0) throw new ConflictException("Concilia el pago inicial existente antes de registrar otro cobro.");
        if (Math.abs(importeAplicado - inicialPendiente) > 0.01) throw new BadRequestException("El primer cobro debe coincidir con la inicial declarada de S/ " + inicialPendiente.toFixed(2) + ".");
        if (fechaPago !== ingreso.fecha) throw new BadRequestException("La inicial declarada debe registrarse con la fecha de emisión " + ingreso.fecha + ".");
      }
      const saldo = Math.max(0, redondear(Number(ingreso.total) - importeAplicadoPrevio));
      if (importeAplicado > saldo) throw new BadRequestException("El importe supera el saldo pendiente de " + saldo.toFixed(2) + ".");
      const [pago] = await tx.insert(ingresosPagos).values({
        ingresoId: ingresoIdEntrada, fechaPago, importeAplicado: importeAplicado.toFixed(2),
        esPagoInicial: inicialPendiente > 0, importeRecibido: importeAplicado.toFixed(2),
        medioPago, cuentaFinancieraId, referenciaPago, observacion, usuarioId, claveIdempotencia,
      }).returning({ id: ingresosPagos.id, ingresoId: ingresosPagos.ingresoId, fechaPago: ingresosPagos.fechaPago,
        importeAplicado: ingresosPagos.importeAplicado, medioPago: ingresosPagos.medioPago, cuentaFinancieraId: ingresosPagos.cuentaFinancieraId,
        referenciaPago: ingresosPagos.referenciaPago, observacion: ingresosPagos.observacion,
        usuarioId: ingresosPagos.usuarioId, creadoEn: ingresosPagos.creadoEn });
      return pago;
    });
  }

  async buscarClientes(busquedaEntrada?: string) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const filtroBusqueda = busqueda ? or(
      ilike(personas.numeroDocumento, coincidencia), ilike(personas.razonSocial, coincidencia),
      exists(db.select({ id: personasDocumentos.id }).from(personasDocumentos).where(and(eq(personasDocumentos.personaId, personas.id), ilike(personasDocumentos.numeroDocumento, coincidencia)))),
      ilike(sql`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`, coincidencia),
      ilike(clientes.nombreComercial, coincidencia), ilike(clientes.contactoNombre, coincidencia), ilike(clientes.correo, coincidencia), ilike(clientes.telefono, coincidencia),
    ) : undefined;
    const clientesEncontrados = await db.select({
      id: personas.id, tipoPersona: tiposPersona.codigo, tipoDocumento: tiposDocumento.codigo,
      numeroDocumento: personas.numeroDocumento, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno, fechaNacimiento: personas.fechaNacimiento, razonSocial: personas.razonSocial, nombreComercial: clientes.nombreComercial,
      contactoNombre: clientes.contactoNombre, correo: clientes.correo, telefono: clientes.telefono,
      direccion: clientes.direccionFiscal, direccionEntrega: clientes.direccionEntrega, observacion: clientes.observacion,
    }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id))
      .innerJoin(tiposPersona, eq(personas.tipoPersonaId, tiposPersona.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(and(eq(clientes.activo, true), eq(personas.activo, true), filtroBusqueda))
      .orderBy(desc(clientes.creadoEn), asc(personas.razonSocial), asc(personas.apellidoPaterno), asc(personas.nombres)).limit(50);
    if (!clientesEncontrados.length) return [];
    const documentosAdicionales = await db.select({ personaId: personasDocumentos.personaId, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personasDocumentos.numeroDocumento })
      .from(personasDocumentos).innerJoin(tiposDocumento, eq(personasDocumentos.tipoDocumentoId, tiposDocumento.id))
      .where(inArray(personasDocumentos.personaId, clientesEncontrados.map((cliente) => cliente.id)));
    const porPersona = new Map<string, { tipoDocumento: string; numeroDocumento: string }[]>();
    for (const documento of documentosAdicionales) porPersona.set(documento.personaId, [...(porPersona.get(documento.personaId) ?? []), { tipoDocumento: documento.tipoDocumento, numeroDocumento: documento.numeroDocumento }]);
    return clientesEncontrados.map((cliente) => ({ ...cliente, documentos: [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }, ...(porPersona.get(cliente.id) ?? [])] }));
  }

  async listarClientes(paginaEntrada?: string, porPaginaEntrada?: string, busquedaEntrada?: string) {
    const pagina = Math.max(1, Number.parseInt(paginaEntrada ?? "1", 10) || 1);
    const porPagina = Math.min(50, Math.max(1, Number.parseInt(porPaginaEntrada ?? "10", 10) || 10));
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const filtroBusqueda = busqueda ? or(
      ilike(personas.numeroDocumento, coincidencia), ilike(personas.razonSocial, coincidencia),
      exists(db.select({ id: personasDocumentos.id }).from(personasDocumentos).where(and(eq(personasDocumentos.personaId, personas.id), ilike(personasDocumentos.numeroDocumento, coincidencia)))),
      ilike(sql`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`, coincidencia),
      ilike(clientes.nombreComercial, coincidencia), ilike(clientes.contactoNombre, coincidencia), ilike(clientes.correo, coincidencia), ilike(clientes.telefono, coincidencia),
    ) : undefined;
    const condicion = and(eq(clientes.activo, true), eq(personas.activo, true), filtroBusqueda);
    const [{ total }] = await db.select({ total: count() }).from(clientes)
      .innerJoin(personas, eq(clientes.personaId, personas.id)).where(condicion);
    const clientesEncontrados = await db.select({
      id: personas.id, tipoPersona: tiposPersona.codigo, tipoDocumento: tiposDocumento.codigo,
      numeroDocumento: personas.numeroDocumento, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno, fechaNacimiento: personas.fechaNacimiento, razonSocial: personas.razonSocial, nombreComercial: clientes.nombreComercial,
      contactoNombre: clientes.contactoNombre, correo: clientes.correo, telefono: clientes.telefono,
      direccion: clientes.direccionFiscal, direccionEntrega: clientes.direccionEntrega, observacion: clientes.observacion,
    }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id))
      .innerJoin(tiposPersona, eq(personas.tipoPersonaId, tiposPersona.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(condicion).orderBy(desc(clientes.creadoEn), asc(personas.razonSocial), asc(personas.apellidoPaterno), asc(personas.nombres))
      .limit(porPagina).offset((pagina - 1) * porPagina);
    const documentosAdicionales = clientesEncontrados.length ? await db.select({ personaId: personasDocumentos.personaId, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personasDocumentos.numeroDocumento })
      .from(personasDocumentos).innerJoin(tiposDocumento, eq(personasDocumentos.tipoDocumentoId, tiposDocumento.id))
      .where(inArray(personasDocumentos.personaId, clientesEncontrados.map((cliente) => cliente.id))) : [];
    const porPersona = new Map<string, { tipoDocumento: string; numeroDocumento: string }[]>();
    for (const documento of documentosAdicionales) porPersona.set(documento.personaId, [...(porPersona.get(documento.personaId) ?? []), { tipoDocumento: documento.tipoDocumento, numeroDocumento: documento.numeroDocumento }]);
    const items = clientesEncontrados.map((cliente) => ({ ...cliente, documentos: [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }, ...(porPersona.get(cliente.id) ?? [])] }));
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async consultarIdentidadCliente(tipoDocumento?: string, numeroDocumento?: string) {
    return consultarIdentidadPeru(tipoDocumento, numeroDocumento);
  }

  async registrarCliente(valor: unknown) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del cliente no son válidos.");
    const datos = valor as Record<string, unknown>;
    const tipoDocumento = texto(datos.tipoDocumento, "El tipo de documento", 12, true)!;
    const codigosDocumento: Record<string, string> = { DNI: "01", RUC: "06", CE: "04", PASAPORTE: "07" };
    const codigoDocumento = codigosDocumento[tipoDocumento];
    if (!codigoDocumento) throw new BadRequestException("Selecciona DNI, RUC, carné de extranjería o pasaporte.");
    const numeroDocumento = texto(datos.numeroDocumento, "El número de documento", 30, true)!;
    if (tipoDocumento === "DNI" && !/^\d{8}$/.test(numeroDocumento)) throw new BadRequestException("El DNI debe tener 8 dígitos.");
    if (tipoDocumento === "RUC" && !rucPeruValido(numeroDocumento)) throw new BadRequestException("El RUC debe tener 11 dígitos y un dígito verificador válido.");
    if (tipoDocumento === "CE" && !/^[A-Za-z0-9-]{6,20}$/.test(numeroDocumento)) throw new BadRequestException("Revisa el número de carné de extranjería.");
    if (tipoDocumento === "PASAPORTE" && !/^[A-Za-z0-9-]{5,20}$/.test(numeroDocumento)) throw new BadRequestException("Revisa el número de pasaporte.");
    const personaSolicitada = datos.tipoPersona;
    const esJuridica = personaSolicitada === "JURIDICA" || (!personaSolicitada && tipoDocumento === "RUC" && numeroDocumento.startsWith("20"));
    if (personaSolicitada !== undefined && personaSolicitada !== "NATURAL" && personaSolicitada !== "JURIDICA") throw new BadRequestException("Selecciona persona natural o empresa.");
    if (esJuridica && (tipoDocumento !== "RUC" || !numeroDocumento.startsWith("20"))) throw new BadRequestException("Una empresa debe registrarse con RUC de persona jurídica.");
    if (personaSolicitada === "NATURAL" && tipoDocumento === "RUC" && numeroDocumento.startsWith("20")) throw new BadRequestException("Este RUC corresponde a una persona jurídica. Regístrala como empresa.");
    const razonSocial = esJuridica ? texto(datos.razonSocial, "La razón social", 180, true) : null;
    const nombres = esJuridica ? null : texto(datos.nombres, "Los nombres", 120, true);
    const apellidoPaterno = esJuridica ? null : texto(datos.apellidoPaterno, "El apellido paterno", 120, true);
    const apellidoMaterno = esJuridica ? null : texto(datos.apellidoMaterno, "El apellido materno", 120);
    const fechaNacimiento = esJuridica ? null : texto(datos.fechaNacimiento, "La fecha de nacimiento", 10);
    if (fechaNacimiento && (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) || Number.isNaN(Date.parse(fechaNacimiento)) || new Date(fechaNacimiento + "T00:00:00").toISOString().slice(0, 10) !== fechaNacimiento || fechaNacimiento > new Date().toISOString().slice(0, 10))) {
      throw new BadRequestException("Ingresa una fecha de nacimiento válida que no sea futura.");
    }
    const direccionFiscal = texto(datos.direccion, "La dirección", 240);
    const nombreComercial = texto(datos.nombreComercial, "El nombre comercial", 180);
    const contactoNombre = texto(datos.contactoNombre, "El contacto", 180);
    const correo = texto(datos.correo, "El correo", 254);
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException("Ingresa un correo válido.");
    const telefono = texto(datos.telefono, "El teléfono", 30);
    if (telefono && !/^[+()\d .-]{6,30}$/.test(telefono)) throw new BadRequestException("Ingresa un teléfono válido.");
    const direccionEntrega = texto(datos.direccionEntrega, "La dirección de entrega", 240);
    const observacion = texto(datos.observacion, "La observación", 1000);
    return db.transaction(async (tx) => {
      const [documento] = await tx.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, codigoDocumento), eq(tiposDocumento.activo, true))).limit(1);
      const [tipo] = await tx.select({ id: tiposPersona.id }).from(tiposPersona).where(and(eq(tiposPersona.codigo, esJuridica ? "JURIDICA" : "NATURAL"), eq(tiposPersona.activo, true))).limit(1);
      if (!documento || !tipo) throw new BadRequestException("Falta configurar el tipo de persona o documento en el catálogo.");
      let [existente] = await tx.select({ id: personas.id, tipoPersonaId: personas.tipoPersonaId }).from(personas).where(and(eq(personas.tipoDocumentoId, documento.id), eq(personas.numeroDocumento, numeroDocumento))).limit(1);
      let documentoSecundario: { tipoId: string; numero: string } | null = null;
      if (!existente) {
        const [alias] = await tx.select({ id: personas.id }).from(personasDocumentos).innerJoin(personas, eq(personasDocumentos.personaId, personas.id))
          .where(and(eq(personasDocumentos.tipoDocumentoId, documento.id), eq(personasDocumentos.numeroDocumento, numeroDocumento))).limit(1);
        if (alias) existente = { id: alias.id, tipoPersonaId: tipo.id };
      }
      if (!existente && !esJuridica && tipoDocumento === "RUC" && /^10\d{9}$/.test(numeroDocumento)) {
        const [dni] = await tx.select({ id: personas.id, tipoPersonaId: personas.tipoPersonaId, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno }).from(personas)
          .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
          .where(and(eq(tiposDocumento.codigo, "01"), eq(personas.numeroDocumento, numeroDocumento.slice(2, 10)))).limit(1);
        if (dni) {
          const normalizarNombre = (valor: string | null) => (valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
          const coincideNombre = normalizarNombre(dni.nombres) === normalizarNombre(nombres) && normalizarNombre(dni.apellidoPaterno) === normalizarNombre(apellidoPaterno) && normalizarNombre(dni.apellidoMaterno) === normalizarNombre(apellidoMaterno);
          if (!coincideNombre) throw new ConflictException("El DNI derivado de este RUC ya pertenece a otra ficha de cliente. Revisa los nombres y documentos antes de continuar.");
          existente = dni;
          documentoSecundario = { tipoId: documento.id, numero: numeroDocumento };
        }
      }
      if (existente) {
        if (fechaNacimiento) await tx.update(personas).set({ fechaNacimiento }).where(eq(personas.id, existente.id));
        if (!esJuridica && tipoDocumento === "RUC" && /^10\d{9}$/.test(numeroDocumento)) {
          const [dniTipo] = await tx.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, "01"), eq(tiposDocumento.activo, true))).limit(1);
          if (dniTipo) documentoSecundario = { tipoId: dniTipo.id, numero: numeroDocumento.slice(2, 10) };
        }
        if (documentoSecundario) {
          const [principalAjeno] = await tx.select({ id: personas.id }).from(personas).where(and(eq(personas.tipoDocumentoId, documentoSecundario.tipoId), eq(personas.numeroDocumento, documentoSecundario.numero))).limit(1);
          const [aliasAjeno] = await tx.select({ personaId: personasDocumentos.personaId }).from(personasDocumentos).where(and(eq(personasDocumentos.tipoDocumentoId, documentoSecundario.tipoId), eq(personasDocumentos.numeroDocumento, documentoSecundario.numero))).limit(1);
          if ((principalAjeno && principalAjeno.id !== existente.id) || (aliasAjeno && aliasAjeno.personaId !== existente.id)) throw new ConflictException("Este documento ya está vinculado a otra ficha de cliente.");
          await tx.insert(personasDocumentos).values({ personaId: existente.id, tipoDocumentoId: documentoSecundario.tipoId, numeroDocumento: documentoSecundario.numero }).onConflictDoNothing();
        }
        const [clienteExistente] = await tx.select({ id: personas.id }).from(clientes).where(eq(clientes.personaId, existente.id)).limit(1);
        if (!clienteExistente) await tx.insert(clientes).values({ personaId: existente.id, direccionFiscal, nombreComercial, contactoNombre, correo, telefono, direccionEntrega, observacion });
        return { id: existente.id, creado: !clienteExistente };
      }
      const [persona] = await tx.insert(personas).values({ tipoPersonaId: tipo.id, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, razonSocial, tipoDocumentoId: documento.id, numeroDocumento }).returning({ id: personas.id });
      if (!esJuridica && tipoDocumento === "RUC" && /^10\d{9}$/.test(numeroDocumento)) {
        const [dni] = await tx.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, "01"), eq(tiposDocumento.activo, true))).limit(1);
        if (dni) {
          const dniNumero = numeroDocumento.slice(2, 10);
          const [dniPrincipal] = await tx.select({ id: personas.id }).from(personas).where(and(eq(personas.tipoDocumentoId, dni.id), eq(personas.numeroDocumento, dniNumero))).limit(1);
          if (dniPrincipal) throw new ConflictException("El DNI de este RUC ya está asociado a otra ficha de cliente.");
          await tx.insert(personasDocumentos).values({ personaId: persona.id, tipoDocumentoId: dni.id, numeroDocumento: dniNumero }).onConflictDoNothing();
        }
      }
      await tx.insert(clientes).values({ personaId: persona.id, direccionFiscal, nombreComercial, contactoNombre, correo, telefono, direccionEntrega, observacion });
      return { id: persona.id, creado: true };
    });
  }

  async actualizarCliente(id: string, valor: unknown) {
    if (!uuidValido(id)) throw new BadRequestException("Selecciona un cliente válido.");
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del cliente no son válidos.");
    const datos = valor as Record<string, unknown>;
    const nombreComercial = texto(datos.nombreComercial, "El nombre comercial", 180);
    const contactoNombre = texto(datos.contactoNombre, "El contacto", 180);
    const correo = texto(datos.correo, "El correo", 254);
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException("Ingresa un correo válido.");
    const telefono = texto(datos.telefono, "El teléfono", 30);
    if (telefono && !/^[+()\d .-]{6,30}$/.test(telefono)) throw new BadRequestException("Ingresa un teléfono válido.");
    const direccionFiscal = texto(datos.direccion, "La dirección fiscal", 240);
    const direccionEntrega = texto(datos.direccionEntrega, "La dirección de entrega", 240);
    const observacion = texto(datos.observacion, "La nota interna", 1000);
    const [actualizado] = await db.update(clientes).set({ nombreComercial, contactoNombre, correo, telefono, direccionFiscal, direccionEntrega, observacion, actualizadoEn: new Date() })
      .where(and(eq(clientes.personaId, id), eq(clientes.activo, true))).returning({ personaId: clientes.personaId });
    if (!actualizado) throw new NotFoundException("El cliente no existe o ya no está activo.");
    const [cliente] = await db.select({
      id: personas.id, tipoPersona: tiposPersona.codigo, tipoDocumento: tiposDocumento.codigo,
      numeroDocumento: personas.numeroDocumento, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno, fechaNacimiento: personas.fechaNacimiento, razonSocial: personas.razonSocial, nombreComercial: clientes.nombreComercial,
      contactoNombre: clientes.contactoNombre, correo: clientes.correo, telefono: clientes.telefono,
      direccion: clientes.direccionFiscal, direccionEntrega: clientes.direccionEntrega, observacion: clientes.observacion,
    }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id))
      .innerJoin(tiposPersona, eq(personas.tipoPersonaId, tiposPersona.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(eq(personas.id, id)).limit(1);
    if (!cliente) throw new NotFoundException("No se pudo recuperar el cliente actualizado.");
    return cliente;
  }

  async buscarProductos(busquedaEntrada?: string, incluirCatalogo = false, limiteEntrada?: string, escaneoExacto = false) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    if (busqueda.length < 4 && !incluirCatalogo) return [];
    const limiteSolicitado = Number.parseInt(limiteEntrada ?? "8", 10);
    const limiteResultados = Number.isFinite(limiteSolicitado) ? Math.max(1, Math.min(8, limiteSolicitado)) : 8;
    const textoBusqueda = normalizarTextoBusqueda(busqueda);
    const coincidencia = `%${textoBusqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const codigosExactos = escaneoExacto && busqueda ? await db.selectDistinct({ productoId: productosCodigos.productoId })
      .from(productosCodigos)
      .where(and(inArray(productosCodigos.tipo, ["BARRAS", "GTIN"]), sql`lower(${productosCodigos.codigo}) = lower(${busqueda})`))
      .limit(2) : [];
    if (codigosExactos.length > 1) return [];
    const productoPorCodigoInterno = escaneoExacto && codigosExactos.length === 0 && busqueda
      ? (await db.select({ id: productos.id }).from(productos).where(sql`lower(${productos.codigoInterno}) = lower(${busqueda})`).limit(1))[0]?.id
      : undefined;
    if (escaneoExacto && codigosExactos.length === 0 && !productoPorCodigoInterno) return [];
    const productoPorCodigoExacto = codigosExactos[0]?.productoId ?? productoPorCodigoInterno;
    const ahora = new Date();
    return db.select({
      productoId: productos.id, codigo: productos.codigoInterno, nombre: productos.nombre, marca: marcasProductos.nombre, rutaImagen: productos.rutaImagen,
      afectacionIgv: productos.afectacionIgv, afectoIgv: productos.afectoIgv, presentacionId: productosPresentaciones.id, presentacion: productosPresentaciones.nombre,
      unidadCodigo: productosPresentaciones.unidadMedidaCodigo, unidad: unidadesMedida.nombre,
      factorAUnidadBase: productosPresentaciones.factorAUnidadBase, precio: preciosProductos.precio,
      listaPrecioCodigo: tiposListasPrecio.codigo, listaPrecioNombre: tiposListasPrecio.nombre,
      stockBase: sql<string>`coalesce(${saldosStock.cantidad}, '0')`,
    }).from(productosPresentaciones)
      .innerJoin(productos, eq(productosPresentaciones.productoId, productos.id))
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
      .innerJoin(preciosProductos, and(eq(preciosProductos.presentacionId, productosPresentaciones.id), eq(preciosProductos.productoId, productos.id), eq(preciosProductos.activo, true)))
      .innerJoin(tiposListasPrecio, and(eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id), eq(tiposListasPrecio.codigo, "GENERAL"), eq(tiposListasPrecio.activo, true)))
      .leftJoin(saldosStock, eq(saldosStock.productoId, productos.id))
      .where(and(eq(productos.activo, true), eq(productosPresentaciones.activo, true), eq(productosPresentaciones.seVende, true), lte(preciosProductos.cantidadMinima, "1"),
        productoPorCodigoExacto ? and(eq(productos.id, productoPorCodigoExacto), eq(productosPresentaciones.esBase, true)) : incluirCatalogo && !busqueda ? undefined : or(contieneSinTildes(productos.nombre, coincidencia), contieneSinTildes(productos.descripcion, coincidencia), contieneSinTildes(productos.codigoInterno, coincidencia), contieneSinTildes(marcasProductos.nombre, coincidencia),
          exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), contieneSinTildes(productosCodigos.codigo, coincidencia)))),
        ),
        or(isNull(preciosProductos.vigenteDesde), lte(preciosProductos.vigenteDesde, ahora)),
        or(isNull(preciosProductos.vigenteHasta), gt(preciosProductos.vigenteHasta, ahora)),
      )).orderBy(asc(productos.nombre), asc(productosPresentaciones.esBase), desc(preciosProductos.cantidadMinima)).limit(limiteResultados);
  }

  async buscarMototaxisVenta(busquedaEntrada?: string) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    if (busqueda.length < 2) return [];
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    return db.select({
      mototaxiUnidadId: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, marca: marcasProductos.nombre,
      modelo: modelosMototaxis.nombre, version: modelosMototaxis.version, precioVenta: modelosMototaxis.precioVenta, vin: unidadesMototaxis.vin,
      numeroMotor: unidadesMototaxis.numeroMotor, color: unidadesMototaxis.color,
    }).from(unidadesMototaxis)
      .innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id))
      .innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .where(and(eq(unidadesMototaxis.estado, "DISPONIBLE"), or(
        ilike(unidadesMototaxis.codigo, coincidencia), ilike(unidadesMototaxis.vin, coincidencia),
        ilike(unidadesMototaxis.numeroMotor, coincidencia), ilike(modelosMototaxis.nombre, coincidencia),
        ilike(marcasProductos.nombre, coincidencia),
      )))
      .orderBy(desc(unidadesMototaxis.creadoEn)).limit(24);
  }

  async crear(valor: unknown, usuarioId: string) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del ingreso no son válidos.");
    const datos = valor as DatosIngreso;
    const fecha = texto(datos.fecha, "La fecha", 10, true)!;
    const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) throw new BadRequestException("Indica una fecha válida.");
    const tipoComprobante = datos.tipoComprobante ?? "BOLETA";
    if (tipoComprobante !== "BOLETA" && tipoComprobante !== "FACTURA" && tipoComprobante !== "NOTA_VENTA") throw new BadRequestException("Selecciona boleta, factura o nota de venta interna.");
    const ambienteNubefact = process.env.NUBEFACT_AMBIENTE === "PRODUCCION" ? "PRODUCCION" : "DEMO";
    const regimenTributario = process.env.REGIMEN_TRIBUTARIO?.trim() || "NRUS";
    if (tipoComprobante === "FACTURA" && ambienteNubefact === "PRODUCCION" && regimenTributario === "NRUS") throw new BadRequestException("La emisión de facturas en producción requiere que la empresa ya no esté acogida al NRUS.");
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha del comprobante no puede ser posterior a hoy.");
    if (tipoComprobante === "FACTURA" && diasEntreFechas(fecha, fechaActualPeru()) > 3) throw new BadRequestException("La fecha de la factura supera el plazo de envío electrónico: NubeFact debe remitirla dentro de los 3 días calendario posteriores a su emisión.");
    if (tipoComprobante === "BOLETA" && diasEntreFechas(fecha, fechaActualPeru()) > 5) throw new BadRequestException("La fecha de la boleta supera el plazo de envío individual por OSE: debe remitirse a NubeFact dentro de los 5 días calendario desde su emisión.");
    const claveIdempotencia = texto(datos.idempotencyKey, "La clave de idempotencia", 36, true)!;
    if (!uuidValido(claveIdempotencia)) throw new BadRequestException("La clave de idempotencia no tiene un formato válido.");
    if (typeof datos.medioPago !== "string" || !mediosPago.includes(datos.medioPago as typeof mediosPago[number])) throw new BadRequestException("Selecciona un medio de pago.");
    const medioPago = datos.medioPago as string;
    const condicionPago = datos.condicionPago === undefined ? "CONTADO" : datos.condicionPago;
    if (condicionPago !== "CONTADO" && condicionPago !== "CREDITO") throw new BadRequestException("Selecciona contado o crédito.");
    const importePagoInicial = datos.importePagoInicial === undefined || datos.importePagoInicial === null || datos.importePagoInicial === "" ? 0 : numero(datos.importePagoInicial, "El pago inicial", 2, 0);
    const vencimientoEnviado = texto(datos.fechaVencimientoPago, "La fecha de vencimiento", 10);
    let cuotasPago: { cuota: number; fechaDePago: string; importe: string }[] = [];
    let fechaVencimientoPago: string | null = null;
    if (condicionPago === "CREDITO") {
      if (!Array.isArray(datos.cuotasPago) || datos.cuotasPago.length < 1 || datos.cuotasPago.length > 24) throw new BadRequestException("Define entre 1 y 24 cuotas para la venta al crédito.");
      let fechaAnterior = fecha;
      cuotasPago = datos.cuotasPago.map((valorCuota, indice) => {
        if (typeof valorCuota !== "object" || valorCuota === null || Array.isArray(valorCuota)) throw new BadRequestException(`La cuota ${indice + 1} no es válida.`);
        const cuotaEntrada = valorCuota as Record<string, unknown>;
        const numeroCuota = Number(cuotaEntrada.cuota);
        const fechaDePago = texto(cuotaEntrada.fechaDePago, `La fecha de la cuota ${indice + 1}`, 10, true)!;
        const fechaParseada = new Date(`${fechaDePago}T00:00:00.000Z`);
        const importe = numero(cuotaEntrada.importe, `El importe de la cuota ${indice + 1}`, 2, 0.01);
        if (numeroCuota !== indice + 1) throw new BadRequestException("Numera las cuotas en orden consecutivo desde 1.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDePago) || Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fechaDePago || fechaDePago <= fechaAnterior) throw new BadRequestException(`La fecha de la cuota ${indice + 1} debe ser posterior a la emisión y a la cuota anterior.`);
        fechaAnterior = fechaDePago;
        return { cuota: numeroCuota, fechaDePago, importe: importe.toFixed(2) };
      });
      fechaVencimientoPago = cuotasPago.at(-1)!.fechaDePago;
      if (vencimientoEnviado && vencimientoEnviado !== fechaVencimientoPago) throw new BadRequestException("La fecha de vencimiento debe coincidir con la última cuota.");
    } else if (vencimientoEnviado || (Array.isArray(datos.cuotasPago) && datos.cuotasPago.length > 0) || importePagoInicial > 0) throw new BadRequestException("El pago inicial, las cuotas y las fechas de vencimiento solo corresponden a una venta al crédito.");
    if (!Array.isArray(datos.detalles) || datos.detalles.length < 1 || datos.detalles.length > 100) throw new BadRequestException("Agrega entre 1 y 100 productos o servicios.");
    const estadoIntegracion = tipoComprobante === "NOTA_VENTA" ? null : await this.estadoNubefact();
    if (tipoComprobante === "BOLETA" && !estadoIntegracion?.emisionHabilitada) throw new BadRequestException("Configura en el servidor la ruta, el token y la serie de boletas de NubeFact antes de emitir.");
    if (tipoComprobante === "FACTURA" && !estadoIntegracion?.emisionFacturaHabilitada) throw new BadRequestException("Configura la conexión de NubeFact, la serie productiva de facturas y un régimen que permita emitirlas antes de continuar.");
    let clienteId: string | null = null;
    let clienteTipoDocumento = texto(datos.clienteTipoDocumento, "El tipo de documento", 10);
    let clienteNumeroDocumento = texto(datos.clienteNumeroDocumento, "El número de documento", 20);
    let clienteNombre = texto(datos.clienteNombre, "El cliente", 180) ?? "CLIENTES VARIOS";
    let clienteDireccion = texto(datos.clienteDireccion, "La dirección del cliente", 240);
    let clienteCorreo: string | null = null;
    if (datos.clienteId !== undefined && datos.clienteId !== null && datos.clienteId !== "") {
      if (!uuidValido(datos.clienteId)) throw new BadRequestException("Selecciona un cliente válido.");
      const [cliente] = await db.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento,
        nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
        razonSocial: personas.razonSocial, direccion: clientes.direccionFiscal, correo: clientes.correo,
      }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
        .where(and(eq(clientes.personaId, datos.clienteId as string), eq(clientes.activo, true), eq(personas.activo, true))).limit(1);
      if (!cliente) throw new NotFoundException("El cliente ya no está activo. Vuelve a buscarlo.");
      clienteId = cliente.id;
      const tipoSolicitado = ({ DNI: "01", RUC: "06", CE: "04", PASAPORTE: "07" } as Record<string, string>)[clienteTipoDocumento ?? ""];
      if (tipoSolicitado && clienteNumeroDocumento) {
        const [tipoDocumentoSolicitado] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, tipoSolicitado), eq(tiposDocumento.activo, true))).limit(1);
        const esPrincipal = cliente.tipoDocumento === tipoSolicitado && cliente.numeroDocumento === clienteNumeroDocumento;
        const [esSecundario] = tipoDocumentoSolicitado ? await db.select({ id: personasDocumentos.id }).from(personasDocumentos)
          .where(and(eq(personasDocumentos.personaId, cliente.id), eq(personasDocumentos.tipoDocumentoId, tipoDocumentoSolicitado.id), eq(personasDocumentos.numeroDocumento, clienteNumeroDocumento))).limit(1) : [];
        if (!esPrincipal && !esSecundario) throw new BadRequestException("El documento elegido no está asociado al cliente seleccionado.");
      } else {
        clienteTipoDocumento = ({ "01": "DNI", "06": "RUC", "04": "CE", "07": "PASAPORTE" } as Record<string, string>)[cliente.tipoDocumento] ?? cliente.tipoDocumento;
        clienteNumeroDocumento = cliente.numeroDocumento;
      }
      clienteNombre = cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
      clienteDireccion = cliente.direccion;
      clienteCorreo = cliente.correo;
    }
    if (clienteTipoDocumento === "DNI" && !/^\d{8}$/.test(clienteNumeroDocumento ?? "")) throw new BadRequestException("El DNI debe tener 8 dígitos.");
    if (clienteTipoDocumento === "RUC" && !rucPeruValido(clienteNumeroDocumento ?? "")) throw new BadRequestException("El RUC debe tener 11 dígitos y un dígito verificador válido.");
    if (tipoComprobante === "FACTURA" && (!clienteId || clienteTipoDocumento !== "RUC" || !rucPeruValido(clienteNumeroDocumento ?? "") || !clienteNombre.trim())) throw new BadRequestException("Para emitir una factura, selecciona un cliente registrado con RUC válido y razón social.");
    if (tipoComprobante === "FACTURA" && clienteNombre.length > 100) throw new BadRequestException("La razón social o denominación del cliente no puede superar los 100 caracteres permitidos por NubeFact.");
    if (tipoComprobante === "FACTURA" && (!clienteDireccion?.trim() || clienteDireccion.length > 100)) throw new BadRequestException("La factura requiere la dirección fiscal del cliente, con un máximo de 100 caracteres. Actualiza la ficha del cliente.");
    if ((clienteTipoDocumento && !clienteNumeroDocumento) || (!clienteTipoDocumento && clienteNumeroDocumento)) throw new BadRequestException("Completa juntos el tipo y número de documento del cliente.");
    if (tipoComprobante === "NOTA_VENTA" && !clienteId) throw new BadRequestException("Selecciona el cliente que recibe los productos o servicios para registrar la nota interna.");
    const observacion = texto(datos.observacion, "La observación", 1000);

    const lineas = datos.detalles.map((item, indice) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) throw new BadRequestException(`La línea ${indice + 1} no es válida.`);
      const linea = item as Linea;
      const cantidad = numero(linea.cantidad, `Cantidad en línea ${indice + 1}`, 3, 0.001);
      if (linea.tipo === "PRODUCTO") {
        if (!uuidValido(linea.presentacionId)) throw new BadRequestException(`Selecciona una presentación válida en la línea ${indice + 1}.`);
        if (linea.precioUnitario !== undefined) throw new BadRequestException("No se acepta precio enviado por el navegador; usa el precio vigente del catálogo.");
        const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
        const afectacionIgv = linea.afectacionIgv;
        if (afectacionIgv !== "GRAVADO" && afectacionIgv !== "EXONERADO" && afectacionIgv !== "INAFECTO") throw new BadRequestException(`Selecciona el tipo de operación de la línea ${indice + 1}.`);
        return { tipo: "PRODUCTO" as const, presentacionId: linea.presentacionId as string, cantidad, descuento, afectacionIgv };
      }
      if (linea.tipo === "SERVICIO") {
        const descripcion = texto(linea.descripcion, `Descripción del servicio ${indice + 1}`, 240, true)!;
        const precio = numero(linea.precioUnitario, `Precio en línea ${indice + 1}`, 2, 0);
        const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
        const afectacionIgv = linea.afectacionIgv;
        if (afectacionIgv !== "GRAVADO" && afectacionIgv !== "EXONERADO" && afectacionIgv !== "INAFECTO") throw new BadRequestException(`Selecciona el tipo de operación del servicio ${indice + 1}.`);
        return { tipo: "SERVICIO" as const, descripcion, cantidad, precio, descuento, afectacionIgv: afectacionIgv as AfectacionIgv };
      }
        if (linea.tipo === "MOTOTAXI") {
        if (!uuidValido(linea.mototaxiUnidadId)) throw new BadRequestException(`Selecciona una unidad de mototaxi válida en la línea ${indice + 1}.`);
        if (cantidad !== 1) throw new BadRequestException("Cada línea de mototaxi debe representar una sola unidad identificada.");
        const precio = numero(linea.precioUnitario, `Precio de mototaxi ${indice + 1}`, 2, 0.01);
        const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
        const afectacionIgv = linea.afectacionIgv;
        if (afectacionIgv !== "GRAVADO" && afectacionIgv !== "EXONERADO" && afectacionIgv !== "INAFECTO") throw new BadRequestException(`Selecciona el tipo de operación de la línea ${indice + 1}.`);
        return { tipo: "MOTOTAXI" as const, mototaxiUnidadId: linea.mototaxiUnidadId, cantidad, precio, descuento, afectacionIgv };
      }
      throw new BadRequestException(`El tipo de línea ${indice + 1} debe ser producto, servicio o mototaxi.`);
    });
    const tiposLinea = new Set(lineas.map((linea) => linea.tipo));
    if (tiposLinea.has("MOTOTAXI") && tiposLinea.size > 1) throw new BadRequestException("Registra la venta de mototaxis por separado de la venta de repuestos o servicios.");

    const huellaSolicitud = createHash("sha256").update(JSON.stringify({ usuarioId, fecha, tipoComprobante: datos.tipoComprobante, clienteId, clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, medioPago: datos.medioPago, condicionPago, importePagoInicial, fechaVencimientoPago, cuotasPago, observacion, lineas })).digest("hex");
    const anterior = await this.recuperarPorIdempotencia(claveIdempotencia, huellaSolicitud);
    if (anterior) return anterior;
    const tasaIgv = 18;

    let ventaRegistrada: { id: string; codigo: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; clienteTipoDocumento: string | null; clienteNumeroDocumento: string | null; clienteNombre: string | null; clienteDireccion: string | null; clienteCorreo: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; importePagoInicial: string; fechaVencimientoPago: string | null; cuotasPago: { cuota: number; fechaDePago: string; importe: string }[]; observacion: string | null; subtotal: string; tasaIgv: string; igv: string; total: string; estado: string; detalles: (typeof ingresosDetalle.$inferInsert)[] };
    try { ventaRegistrada = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(918273645)`);
      const id = randomUUID();
      let codigo = `ING-${fecha.replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
      if (tipoComprobante === "NOTA_VENTA") {
        const [correlativo] = await tx.update(correlativosDocumentosInternos)
          .set({ ultimoNumero: sql`${correlativosDocumentosInternos.ultimoNumero} + 1` })
          .where(eq(correlativosDocumentosInternos.tipo, "NOTA_VENTA"))
          .returning({ numero: correlativosDocumentosInternos.ultimoNumero });
        if (!correlativo) throw new Error("No se encontró el correlativo configurado para notas de venta.");
        codigo = `NV-${String(correlativo.numero).padStart(6, "0")}`;
      }
      const detallesGuardados: (typeof ingresosDetalle.$inferInsert)[] = [];
      let subtotalHeader = 0, igvHeader = 0, totalHeader = 0;

      for (const linea of lineas) {
        let producto: { id: string; codigoInterno: string; nombre: string; afectoIgv: boolean; afectacionIgv: AfectacionIgv; marca: string } | undefined;
        let unidadMototaxi: { id: string; codigo: string; vin: string | null; estado: string; marca: string; modelo: string; version: string | null } | undefined;
        let presentacion: { id: string; nombre: string; unidad: string; unidadCodigo: string; factor: string; precio: string } | undefined;
        let descripcion: string, nombrePresentacion: string | null = null, unidadCodigo: string | null = null, factor: string | null = null, cantidadBase: string | null = null;
        let precioUnitario: number, afectoIgv: boolean, afectacionIgv: AfectacionIgv;

        if (linea.tipo === "PRODUCTO") {
          const filas = await tx.select({ productoId: productos.id, codigo: productos.codigoInterno, nombre: productos.nombre, afectoIgv: productos.afectoIgv, afectacionIgv: productos.afectacionIgv, marca: marcasProductos.nombre,
            presentacionId: productosPresentaciones.id, presentacion: productosPresentaciones.nombre, unidad: unidadesMedida.nombre, unidadCodigo: productosPresentaciones.unidadMedidaCodigo,
            factor: productosPresentaciones.factorAUnidadBase, precio: preciosProductos.precio,
          }).from(productosPresentaciones).innerJoin(productos, eq(productosPresentaciones.productoId, productos.id))
            .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id)).innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
            .innerJoin(preciosProductos, and(eq(preciosProductos.presentacionId, productosPresentaciones.id), eq(preciosProductos.productoId, productos.id), eq(preciosProductos.activo, true)))
            .innerJoin(tiposListasPrecio, and(eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id), eq(tiposListasPrecio.codigo, "GENERAL"), eq(tiposListasPrecio.activo, true)))
            .where(and(eq(productosPresentaciones.id, linea.presentacionId), eq(productos.activo, true), eq(productosPresentaciones.activo, true), eq(productosPresentaciones.seVende, true),
              lte(preciosProductos.cantidadMinima, String(linea.cantidad)), sql`(${preciosProductos.vigenteDesde} IS NULL OR ${preciosProductos.vigenteDesde} <= now())`, sql`(${preciosProductos.vigenteHasta} IS NULL OR ${preciosProductos.vigenteHasta} > now())`)).orderBy(desc(preciosProductos.cantidadMinima)).limit(1);
          const fila = filas[0];
          if (!fila) throw new NotFoundException("Un producto dejó de estar disponible o ya no tiene precio general vigente. Actualiza la lista y vuelve a intentar.");
          producto = { id: fila.productoId, codigoInterno: fila.codigo, nombre: fila.nombre, afectoIgv: fila.afectoIgv, afectacionIgv: fila.afectacionIgv as AfectacionIgv, marca: fila.marca };
          presentacion = { id: fila.presentacionId, nombre: fila.presentacion, unidad: fila.unidad, unidadCodigo: fila.unidadCodigo, factor: fila.factor, precio: fila.precio };
          descripcion = fila.nombre;
          nombrePresentacion = presentacion.nombre; unidadCodigo = presentacion.unidadCodigo; factor = presentacion.factor;
          precioUnitario = Number(presentacion.precio); afectacionIgv = linea.afectacionIgv as AfectacionIgv; afectoIgv = afectacionIgv === "GRAVADO";
          const base = Number((linea.cantidad * Number(presentacion.factor)).toFixed(6));
          cantidadBase = base.toFixed(6);
        } else if (linea.tipo === "MOTOTAXI") {
          const [unidad] = await tx.select({ id: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin, numeroMotor: unidadesMototaxis.numeroMotor, numeroChasis: unidadesMototaxis.numeroChasis, estado: unidadesMototaxis.estado,
            marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version })
            .from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
            .where(eq(unidadesMototaxis.id, linea.mototaxiUnidadId as string)).for("update", { of: unidadesMototaxis }).limit(1);
          if (!unidad) throw new NotFoundException("La mototaxi seleccionada ya no está en el inventario.");
          if (unidad.estado !== "DISPONIBLE") throw new BadRequestException(`${unidad.marca} ${unidad.modelo} ya no está disponible para venta.`);
          unidadMototaxi = unidad;
          descripcion = `${unidad.marca} ${unidad.modelo}${unidad.version ? ` ${unidad.version}` : ""} · ${unidad.codigo}${tipoComprobante === "FACTURA" ? ` · VIN ${unidad.vin}${unidad.numeroMotor ? ` · Motor ${unidad.numeroMotor}` : ""}${unidad.numeroChasis ? ` · Chasis ${unidad.numeroChasis}` : ""}` : ""}`;
          nombrePresentacion = unidad.vin ? `VIN ${unidad.vin}` : null;
          precioUnitario = linea.precio; afectacionIgv = linea.afectacionIgv as AfectacionIgv; afectoIgv = afectacionIgv === "GRAVADO";
        } else {
          descripcion = linea.descripcion;
          precioUnitario = linea.precio;
          afectacionIgv = linea.afectacionIgv as AfectacionIgv; afectoIgv = afectacionIgv === "GRAVADO";
        }

        const totalBruto = redondear(linea.cantidad * precioUnitario);
        const descuento = linea.descuento ?? 0;
        if (descuento > totalBruto) throw new BadRequestException(`El descuento de ${descripcion} supera el importe de la línea.`);
        const maximoDescuento = totalBruto * validarConfiguracionEntorno().descuentoMaximoPorcentaje / 100;
        if (descuento > redondear(maximoDescuento)) throw new BadRequestException(`El descuento máximo permitido es ${validarConfiguracionEntorno().descuentoMaximoPorcentaje}% por línea.`);
        const totalLineaBase = redondear(totalBruto - descuento);
        // En boleta NRUS el precio va íntegro a la base; en factura los precios de la pantalla incluyen IGV.
        const igvLinea = tipoComprobante !== "NOTA_VENTA" && regimenTributario !== "NRUS" && afectacionIgv === "GRAVADO" ? redondear(totalLineaBase - totalLineaBase / (1 + tasaIgv / 100)) : 0;
        const subtotalLinea = redondear(totalLineaBase - igvLinea);
        const totalLinea = totalLineaBase;
        if (tipoComprobante !== "NOTA_VENTA" && descripcion.length > 250) throw new BadRequestException(`La descripción de la línea ${detallesGuardados.length + 1} supera los 250 caracteres permitidos por NubeFact.`);
        subtotalHeader = redondear(subtotalHeader + subtotalLinea); igvHeader = redondear(igvHeader + igvLinea); totalHeader = redondear(totalHeader + totalLinea);
        detallesGuardados.push({ id: randomUUID(), ingresoId: id, tipo: linea.tipo, productoId: producto?.id ?? null, mototaxiUnidadId: unidadMototaxi?.id ?? null, presentacionId: presentacion?.id ?? null,
          codigoProducto: producto?.codigoInterno ?? null, descripcion, presentacion: nombrePresentacion, unidadMedidaCodigo: unidadCodigo,
          cantidad: linea.cantidad.toFixed(3), factorAUnidadBase: factor, cantidadBase, precioUnitario: precioUnitario.toFixed(4), descuento: descuento.toFixed(2), afectacionIgv, afectoIgv,
          subtotal: subtotalLinea.toFixed(2), igv: igvLinea.toFixed(2), total: totalLinea.toFixed(2) });
      }

      if (tipoComprobante === "BOLETA" && totalHeader > 700 && (!clienteTipoDocumento || !clienteNumeroDocumento || !clienteNombre.trim() || clienteNombre === "CLIENTES VARIOS")) {
        throw new BadRequestException("Para una boleta cuyo importe supera S/ 700.00, SUNAT requiere el tipo y número de documento del comprador.");
      }

      const saldoCreditoPendiente = redondear(totalHeader - importePagoInicial);
      if (condicionPago === "CREDITO") {
        if (importePagoInicial >= totalHeader) throw new BadRequestException("El pago inicial debe ser menor que el total; registra la venta como pagada al contado.");
        if (redondear(cuotasPago.reduce((total, cuota) => total + Number(cuota.importe), 0)) !== saldoCreditoPendiente) throw new BadRequestException(`Las cuotas deben sumar el saldo pendiente de S/ ${saldoCreditoPendiente.toFixed(2)} después del pago inicial.`);
      }

      await tx.insert(ingresos).values({ id, codigo, fecha, tipoComprobante, clienteId, clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, medioPago, condicionPago: condicionPago as "CONTADO" | "CREDITO", fechaVencimientoPago, cuotasPago, importePagoInicial: importePagoInicial.toFixed(2), observacion, estado: "REGISTRADO",
        subtotal: subtotalHeader.toFixed(2), tasaIgv: tasaIgv.toFixed(2), igv: igvHeader.toFixed(2), total: totalHeader.toFixed(2), usuarioId, claveIdempotencia, huellaSolicitud });
      await tx.insert(ingresosDetalle).values(detallesGuardados);
      for (const detalle of detallesGuardados) {
         if (detalle.tipo === "MOTOTAXI" && detalle.mototaxiUnidadId) {
           const [unidad] = await tx.update(unidadesMototaxis).set({ estado: "VENDIDA" }).where(and(eq(unidadesMototaxis.id, detalle.mototaxiUnidadId), eq(unidadesMototaxis.estado, "DISPONIBLE"))).returning({ id: unidadesMototaxis.id, estado: unidadesMototaxis.estado });
           if (!unidad) throw new BadRequestException(`La unidad ${detalle.descripcion} dejó de estar disponible. No se registró la venta.`);
           const [movimiento] = await tx.insert(movimientosMototaxis).values({ unidadId: unidad.id, tipo: "VENTA", estadoAnterior: "DISPONIBLE", estadoNuevo: "VENDIDA", motivo: "VENTA", observacion: `Venta ${codigo}`, usuarioId }).returning({ id: movimientosMototaxis.id });
           await tx.insert(movimientosMototaxisVentas).values({ movimientoId: movimiento.id, ventaDetalleId: detalle.id! });
           continue;
         }
         if (detalle.tipo !== "PRODUCTO" || !detalle.productoId || !detalle.cantidadBase) continue;
        const [saldo] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} - ${detalle.cantidadBase}`, actualizadoEn: new Date() })
          .where(and(eq(saldosStock.productoId, detalle.productoId), gte(saldosStock.cantidad, detalle.cantidadBase))).returning({ cantidad: saldosStock.cantidad });
        if (!saldo) throw new BadRequestException(`Stock insuficiente para ${detalle.descripcion} (${detalle.presentacion}). No se registró ningún ingreso.`);
        const [costo] = await tx.select({ valor: sql<string>`coalesce(sum(${entradasStockDetalle.cantidadBase} * ${entradasStockDetalle.costoUnitario} / nullif(${entradasStockDetalle.factorAUnidadBase}, 0)) / nullif(sum(${entradasStockDetalle.cantidadBase}), 0), 0)::numeric(14,6)` })
          .from(entradasStockDetalle).where(eq(entradasStockDetalle.productoId, detalle.productoId));
        await tx.insert(movimientosStock).values({ productoId: detalle.productoId, tipo: "SALIDA", origenTipo: "INGRESO", origenId: id,
          origenDetalleId: detalle.id!, cantidadBase: detalle.cantidadBase, costoUnitarioBase: costo?.valor ?? "0", usuarioId });
      }
      return { id, codigo, fecha, tipoComprobante: tipoComprobante as "BOLETA" | "FACTURA" | "NOTA_VENTA", clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, clienteCorreo, medioPago, condicionPago: condicionPago as "CONTADO" | "CREDITO", importePagoInicial: importePagoInicial.toFixed(2), fechaVencimientoPago, cuotasPago, observacion, subtotal: subtotalHeader.toFixed(2), tasaIgv: tasaIgv.toFixed(2), igv: igvHeader.toFixed(2), total: totalHeader.toFixed(2), estado: "REGISTRADO", detalles: detallesGuardados };
    }); } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        const repetida = await this.recuperarPorIdempotencia(claveIdempotencia, huellaSolicitud);
        if (repetida) return repetida;
        throw new ConflictException("La venta ya fue registrada por otra solicitud.");
      }
      throw error;
    }
    if (ventaRegistrada.tipoComprobante === "NOTA_VENTA") {
      let archivosDrive: { guardados: { id: string; tipo: string; nombre: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] };
      try {
        const archivo = await this.drive.archivarDocumentoNotaVenta({ ...ventaRegistrada, detalles: ventaRegistrada.detalles.map((detalle) => ({ ...detalle, unidadMedidaCodigo: detalle.unidadMedidaCodigo ?? null })) });
        archivosDrive = { guardados: [{ id: archivo.id, tipo: "HTML", nombre: archivo.nombre, ruta: archivo.ruta }], errores: [] };
      } catch (causa) {
        archivosDrive = { guardados: [], errores: [{ tipo: "HTML", mensaje: causa instanceof Error ? causa.message : "No se pudo archivar la nota de venta." }] };
      }
      await db.update(ingresos).set({ datosNubefact: { archivosDrive } }).where(eq(ingresos.id, ventaRegistrada.id));
      return { ...ventaRegistrada, nubefact: null, archivosDrive };
    }
    const detallesEmitidos = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, ventaRegistrada.id));
    const comprobanteRegistrado = { ...ventaRegistrada, tipoComprobante: ventaRegistrada.tipoComprobante as "BOLETA" | "FACTURA" };
    const nubefact = await this.emitirComprobante(comprobanteRegistrado, detallesEmitidos);
    const { clienteCorreo: _clienteCorreo, ...ventaRespuesta } = ventaRegistrada;
    return { ...ventaRespuesta, estado: nubefact.estado, nubefact };
  }

}
