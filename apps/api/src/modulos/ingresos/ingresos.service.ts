import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, exists, gt, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, clientes, entradasStockDetalle, ingresos, ingresosDetalle, ingresosPagos, marcasProductos, movimientosMototaxis, movimientosMototaxisVentas, movimientosStock, nubefactCorrelativos, personas, personasDocumentos, preciosProductos, productos, productosCodigos, productosPresentaciones, saldosStock, tiposDocumento, tiposListasPrecio, tiposPersona, unidadesMedida, unidadesMototaxis, modelosMototaxis, marcasMototaxis } from "@magina/database";
import { ServicioEmisorFacturacion } from "../facturacion-electronica/emisor.service";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { rucPeruValido } from "../../utilidades/ruc-peru";

type AfectacionIgv = "GRAVADO" | "EXONERADO" | "INAFECTO";
type Linea = { tipo?: unknown; presentacionId?: unknown; mototaxiUnidadId?: unknown; cantidad?: unknown; precioUnitario?: unknown; descuento?: unknown; descripcion?: unknown; afectacionIgv?: unknown };
type DatosIngreso = { idempotencyKey?: unknown; fecha?: unknown; tipoComprobante?: unknown; clienteId?: unknown; clienteDireccion?: unknown; clienteTipoDocumento?: unknown; clienteNumeroDocumento?: unknown; clienteNombre?: unknown; medioPago?: unknown; condicionPago?: unknown; fechaVencimientoPago?: unknown; importePagoInicial?: unknown; cuotasPago?: unknown; observacion?: unknown; detalles?: unknown };
const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;

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
const validarFecha = (fecha: string, nombre: string) => {
  const parseada = new Date(`${fecha}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(parseada.getTime()) || parseada.toISOString().slice(0, 10) !== fecha || fecha > fechaActualPeru()) {
    throw new BadRequestException(`${nombre} debe ser una fecha real y no futura.`);
  }
};
@Injectable()
export class ServicioIngresos {
  constructor(private readonly configuracionEmisor: ServicioEmisorFacturacion) {}

  async estadoNubefact() {
    const emisor = await this.configuracionEmisor.obtenerParaEmision();
    return this.configuracionEmisor.estadoIntegracion(emisor);
  }

  async obtenerNumeraciones() {
    const ambiente = process.env.NUBEFACT_AMBIENTE === "PRODUCCION" ? "PRODUCCION" : "DEMO";
    const serieBoleta = process.env.NUBEFACT_SERIE_BOLETA?.trim() || null;
    const correlativos = await db.select({ serie: nubefactCorrelativos.serie, tipoComprobante: nubefactCorrelativos.tipoComprobante, ultimoNumero: nubefactCorrelativos.ultimoNumero }).from(nubefactCorrelativos).where(eq(nubefactCorrelativos.ambiente, ambiente));
    const siguiente = (serie: string | null, tipo: number) => serie ? Number(correlativos.find((fila) => fila.serie === serie && fila.tipoComprobante === tipo)?.ultimoNumero ?? 0) + 1 : null;
    const formato = (serie: string | null, numero: number | null) => serie && numero ? `${serie}-${String(numero).padStart(6, "0")}` : null;
    const numeroBoleta = siguiente(serieBoleta, 2);
    return { BOLETA: { serie: serieBoleta, numero: numeroBoleta, codigo: formato(serieBoleta, numeroBoleta) }, ambiente };
  }

  async obtenerControlNrus(fechaEntrada?: string) {
    const fecha = fechaEntrada?.trim() || fechaActualPeru();
    const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) throw new BadRequestException("La fecha del control mensual no es válida.");
    const periodo = fecha.slice(0, 7);
    const [inicioMes, finMes] = [`${periodo}-01`, new Date(Date.UTC(Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7)), 0)).toISOString().slice(0, 10)];
    const [acumulado] = await db.select({ total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(14,2)` })
      .from(ingresos).where(and(gte(ingresos.fecha, inicioMes), lte(ingresos.fecha, finMes), eq(ingresos.tipoComprobante, "BOLETA")));
    return { periodo, ingresoBruto: Number(acumulado?.total ?? 0), alertaCategoria1: 4500, limiteCategoria1: 5000, alertaLimiteMensual: 7500, limiteMensual: 8000 };
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

  private async emitirComprobante(venta: { id: string; tipoComprobante: "BOLETA"; fecha: string; clienteTipoDocumento: string | null; clienteNumeroDocumento: string | null; clienteNombre: string | null; clienteDireccion: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; fechaVencimientoPago: string | null; cuotasPago: { cuota: number; fechaDePago: string; importe: string }[]; observacion: string | null; total: string; igv: string; tasaIgv: string }, detalles: (typeof ingresosDetalle.$inferSelect)[]) {
    const estado = await this.estadoNubefact();
    if (!estado.emisionHabilitada) throw new BadRequestException("Completa las variables de NubeFact y los datos del emisor en Facturación electrónica antes de registrar una venta.");
    const ambiente = estado.ambiente;
    const emisor = await this.configuracionEmisor.obtenerParaEmision();
    if (!emisor) throw new BadRequestException("Completa los datos del emisor antes de registrar una venta.");
    const ruta = process.env.NUBEFACT_RUTA!.trim(); const token = process.env.NUBEFACT_TOKEN!.trim();
    const tasaIgv = Number(venta.tasaIgv);
    const tipoNumero = 2;
    const serie = process.env.NUBEFACT_SERIE_BOLETA!.trim();
    const [correlativo] = await db.insert(nubefactCorrelativos).values({ ambiente, serie, tipoComprobante: tipoNumero, ultimoNumero: 1 }).onConflictDoUpdate({
      target: [nubefactCorrelativos.ambiente, nubefactCorrelativos.serie, nubefactCorrelativos.tipoComprobante],
      set: { ultimoNumero: sql`${nubefactCorrelativos.ultimoNumero} + 1`, actualizadoEn: new Date() },
    }).returning({ numero: nubefactCorrelativos.ultimoNumero });
    const redondearCentimos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const items = detalles.map((detalle) => {
      const cantidad = Number(detalle.cantidad); const precioBrutoUnitario = Number(detalle.precioUnitario);
      const brutoAntesDescuento = redondearCentimos(cantidad * precioBrutoUnitario);
      const brutoFinal = Number(detalle.total); const baseAntesDescuento = detalle.afectacionIgv === "GRAVADO" ? redondearCentimos(brutoAntesDescuento * 100 / (100 + tasaIgv)) : brutoAntesDescuento;
      const descuentoAntesImpuestos = redondearCentimos(Math.max(0, baseAntesDescuento - Number(detalle.subtotal)));
      const valorUnitario = detalle.afectacionIgv === "GRAVADO" ? precioBrutoUnitario / (1 + tasaIgv / 100) : precioBrutoUnitario;
      return {
        unidad_de_medida: detalle.unidadMedidaCodigo || (detalle.tipo === "PRODUCTO" ? "NIU" : "ZZ"),
        codigo: detalle.codigoProducto || "SERVICIO", codigo_producto_sunat: "",
        descripcion: detalle.descripcion, cantidad, valor_unitario: detalle.afectacionIgv === "GRAVADO" ? Number((valorUnitario).toFixed(10)) : Number((Number(detalle.subtotal) + descuentoAntesImpuestos).toFixed(10)),
        precio_unitario: Number(precioBrutoUnitario.toFixed(10)), descuento: descuentoAntesImpuestos || "",
        subtotal: Number(detalle.subtotal), tipo_de_igv: detalle.afectacionIgv === "GRAVADO" ? 1 : detalle.afectacionIgv === "EXONERADO" ? 8 : 9,
        igv: Number(detalle.igv), total: brutoFinal,
        anticipo_regularizacion: false, anticipo_documento_serie: "", anticipo_documento_numero: "",
      };
    });
    const totalGravada = redondearCentimos(detalles.filter((d) => d.afectacionIgv === "GRAVADO").reduce((s, d) => s + Number(d.subtotal), 0));
    const totalExonerada = redondearCentimos(detalles.filter((d) => d.afectacionIgv === "EXONERADO").reduce((s, d) => s + Number(d.subtotal), 0));
    const totalInafecta = redondearCentimos(detalles.filter((d) => d.afectacionIgv === "INAFECTO").reduce((s, d) => s + Number(d.subtotal), 0));
    const totalDescuento = redondearCentimos(items.reduce((s, item) => s + (typeof item.descuento === "number" ? item.descuento : 0), 0));
    const codigoDocumento = ({ DNI: 1, RUC: 6, CE: 4, PASAPORTE: 7 } as Record<string, number>)[venta.clienteTipoDocumento ?? ""];
    const fecha = `${venta.fecha.slice(8, 10)}-${venta.fecha.slice(5, 7)}-${venta.fecha.slice(0, 4)}`;
    const fechaVencimiento = venta.fechaVencimientoPago ? `${venta.fechaVencimientoPago.slice(8, 10)}-${venta.fechaVencimientoPago.slice(5, 7)}-${venta.fechaVencimientoPago.slice(0, 4)}` : "";
    const trama = {
      operacion: "generar_comprobante", tipo_de_comprobante: tipoNumero, serie, numero: correlativo.numero, sunat_transaction: 1,
      cliente_tipo_de_documento: codigoDocumento ?? "-", cliente_numero_de_documento: venta.clienteNumeroDocumento ?? "-",
      cliente_denominacion: venta.clienteNombre ?? "CLIENTES VARIOS", cliente_direccion: venta.clienteDireccion ?? "",
      fecha_de_emision: fecha, fecha_de_vencimiento: fechaVencimiento, moneda: 1, tipo_de_cambio: "", porcentaje_de_igv: tasaIgv,
      descuento_global: "", total_descuento: totalDescuento || "", total_anticipo: "", total_gravada: totalGravada || "",
      total_inafecta: totalInafecta || "", total_exonerada: totalExonerada || "", total_igv: Number(venta.igv), total_gratuita: "", total_otros_cargos: "",
      
      observaciones: venta.observacion ?? "",
      enviar_automaticamente_a_la_sunat: ambiente === "PRODUCCION", enviar_automaticamente_al_cliente: false,
      condiciones_de_pago: venta.condicionPago === "CREDITO" ? `CRÉDITO CON VENCIMIENTO ${fechaVencimiento}` : "", medio_de_pago: venta.condicionPago === "CREDITO" ? "" : venta.medioPago,
      cancelado: venta.condicionPago === "CONTADO", formato_de_pdf: "", items, guias: [],
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
      await db.update(ingresos).set({ estado: ambiente === "DEMO" ? "ERROR_NUBEFACT_DEMO" : "ERROR_NUBEFACT", datosNubefact: resultado }).where(eq(ingresos.id, venta.id));
      return resultado;
    }
    let cuerpo: Record<string, unknown>;
    try { const json: unknown = await respuesta.json(); cuerpo = typeof json === "object" && json !== null && !Array.isArray(json) ? json as Record<string, unknown> : { respuesta: json }; }
    catch { cuerpo = { error: "La respuesta de NubeFact no contenía JSON válido." }; }
    const errores = cuerpo.errors;
    const hayErrores = typeof errores === "string" ? errores.trim().length > 0
      : Array.isArray(errores) ? errores.length > 0
        : typeof errores === "object" && errores !== null ? Object.keys(errores).length > 0
          : Boolean(errores);
    const rechazado = !respuesta.ok || hayErrores || cuerpo.aceptada_por_sunat === false || (ambiente === "PRODUCCION" && cuerpo.aceptada_por_sunat !== true);
    const datosNubefact = { ambiente, solicitud, respuesta: cuerpo };
    const estadoEmitido = ambiente === "DEMO" ? "EMITIDO_DEMO" : "EMITIDO";
    await db.update(ingresos).set({ estado: rechazado ? (ambiente === "DEMO" ? "ERROR_NUBEFACT_DEMO" : "ERROR_NUBEFACT") : estadoEmitido, datosNubefact }).where(eq(ingresos.id, venta.id));
    return { estado: rechazado ? "ERROR" : estadoEmitido, ambiente, serie, numero: correlativo.numero, codigo: `${serie}-${String(correlativo.numero).padStart(6, "0")}`, ...(rechazado ? { mensaje: typeof cuerpo.errors === "string" ? cuerpo.errors : "NubeFact no aceptó el comprobante." } : { enlace: cuerpo.enlace, enlacePdf: cuerpo.enlace_del_pdf }) };
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
    const referenciaPago = texto(datos.referenciaPago, "La referencia del pago", 120);
    const observacion = texto(datos.observacion, "La observación del pago", 500);
    return db.transaction(async (tx) => {
      const [previo] = await tx.select({ id: ingresosPagos.id, ingresoId: ingresosPagos.ingresoId,
        fechaPago: ingresosPagos.fechaPago, importeAplicado: ingresosPagos.importeAplicado,
        medioPago: ingresosPagos.medioPago, referenciaPago: ingresosPagos.referenciaPago,
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
        medioPago, referenciaPago, observacion, usuarioId, claveIdempotencia,
      }).returning({ id: ingresosPagos.id, ingresoId: ingresosPagos.ingresoId, fechaPago: ingresosPagos.fechaPago,
        importeAplicado: ingresosPagos.importeAplicado, medioPago: ingresosPagos.medioPago,
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
      apellidoMaterno: personas.apellidoMaterno, razonSocial: personas.razonSocial, nombreComercial: clientes.nombreComercial,
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

  async consultarIdentidadCliente(tipoEntrada?: string, numeroEntrada?: string) {
    const tipoDocumento = tipoEntrada?.trim().toUpperCase();
    const numeroDocumento = numeroEntrada?.trim() ?? "";
    if (tipoDocumento !== "DNI" && tipoDocumento !== "RUC") throw new BadRequestException("La consulta de APIS Perú está disponible para DNI y RUC.");
    if (tipoDocumento === "DNI" && !/^\d{8}$/.test(numeroDocumento)) throw new BadRequestException("Ingresa los 8 dígitos del DNI.");
    if (tipoDocumento === "RUC" && !rucPeruValido(numeroDocumento)) throw new BadRequestException("Ingresa un RUC válido de 11 dígitos.");
    const token = process.env.APIS_PERU_TOKEN?.trim();
    if (!token) throw new ServiceUnavailableException("Falta configurar APIS_PERU_TOKEN en el servidor.");
    const ruta = tipoDocumento === "RUC" ? "ruc" : "dni";
    let respuesta: Response;
    try {
      const url = new URL(`https://dniruc.apisperu.com/api/v1/${ruta}/${encodeURIComponent(numeroDocumento)}`);
      url.searchParams.set("token", token);
      respuesta = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "InversionesMagina/1.0" },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ServiceUnavailableException("No se pudo conectar con APIS Perú. Inténtalo nuevamente.");
    }
    if (respuesta.status === 401) throw new ServiceUnavailableException("APIS Perú rechazó APIS_PERU_TOKEN. Genera o copia un token vigente de dniruc.apisperu.com en el .env del servidor y reinicia el API.");
    if (respuesta.status === 403) throw new ServiceUnavailableException("APIS Perú denegó la consulta. Revisa los permisos del token o el acceso de la IP del servidor.");
    if (respuesta.status === 404) throw new NotFoundException(`No se encontró información para ese ${tipoDocumento}.`);
    if (respuesta.status === 422) throw new BadRequestException(`APIS Perú rechazó el número de ${tipoDocumento}. Verifica el documento.`);
    if (respuesta.status === 429) throw new ServiceUnavailableException("APIS Perú alcanzó el límite de consultas. Espera un momento e inténtalo nuevamente.");
    if (!respuesta.ok) throw new BadGatewayException("APIS Perú no pudo completar la consulta. Inténtalo nuevamente.");
    const original = await respuesta.json() as Record<string, unknown>;
    const campo = (valor: unknown) => typeof valor === "string" ? valor.trim() : "";
    if (original.success === false) throw new NotFoundException(`No se encontró información para ese ${tipoDocumento}.`);
    const nombre = campo(original.razon_social) || campo(original.razonSocial) || campo(original.full_name) || campo(original.nombre);
    if (tipoDocumento === "RUC") {
      if (!nombre) throw new BadGatewayException("APIS Perú devolvió una respuesta sin razón social.");
      if (numeroDocumento.startsWith("20")) return { tipoDocumento, numeroDocumento, tipoPersona: "JURIDICA", razonSocial: nombre, direccion: campo(original.direccion) };
      const partes = nombre.split(/\s+/).filter(Boolean);
      return { tipoDocumento, numeroDocumento, tipoPersona: "NATURAL", razonSocial: nombre, apellidoPaterno: partes[0] ?? "", apellidoMaterno: partes[1] ?? "", nombres: partes.slice(2).join(" "), direccion: campo(original.direccion) };
    }
    const partes = nombre.split(/\s+/).filter(Boolean);
    const nombres = campo(original.first_name) || campo(original.nombres) || partes.slice(2).join(" ");
    const apellidoPaterno = campo(original.first_last_name) || campo(original.apellidoPaterno) || partes[0] || "";
    const apellidoMaterno = campo(original.second_last_name) || campo(original.apellidoMaterno) || partes[1] || "";
    if (!nombres || !apellidoPaterno) throw new BadGatewayException("APIS Perú devolvió una respuesta incompleta para este DNI.");
    return { tipoDocumento, numeroDocumento, tipoPersona: "NATURAL", nombres, apellidoPaterno, apellidoMaterno, direccion: campo(original.direccion) };
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
      const [persona] = await tx.insert(personas).values({ tipoPersonaId: tipo.id, nombres, apellidoPaterno, apellidoMaterno, razonSocial, tipoDocumentoId: documento.id, numeroDocumento }).returning({ id: personas.id });
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
      apellidoMaterno: personas.apellidoMaterno, razonSocial: personas.razonSocial, nombreComercial: clientes.nombreComercial,
      contactoNombre: clientes.contactoNombre, correo: clientes.correo, telefono: clientes.telefono,
      direccion: clientes.direccionFiscal, direccionEntrega: clientes.direccionEntrega, observacion: clientes.observacion,
    }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id))
      .innerJoin(tiposPersona, eq(personas.tipoPersonaId, tiposPersona.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(eq(personas.id, id)).limit(1);
    if (!cliente) throw new NotFoundException("No se pudo recuperar el cliente actualizado.");
    return cliente;
  }

  async buscarProductos(busquedaEntrada?: string, incluirCatalogo = false, limiteEntrada?: string) {
    const busqueda = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    if (busqueda.length < 4 && !incluirCatalogo) return [];
    const limiteSolicitado = Number.parseInt(limiteEntrada ?? "8", 10);
    const limiteResultados = Number.isFinite(limiteSolicitado) ? Math.max(1, Math.min(8, limiteSolicitado)) : 8;
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
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
        incluirCatalogo && !busqueda ? undefined : or(ilike(productos.nombre, coincidencia), ilike(productos.descripcion, coincidencia), ilike(productos.codigoInterno, coincidencia), ilike(marcasProductos.nombre, coincidencia),
          exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), ilike(productosCodigos.codigo, coincidencia)))),
        ),
        or(isNull(preciosProductos.vigenteDesde), lte(preciosProductos.vigenteDesde, ahora)),
        or(isNull(preciosProductos.vigenteHasta), gt(preciosProductos.vigenteHasta, ahora)),
      )).orderBy(asc(productos.nombre), asc(productosPresentaciones.esBase), desc(preciosProductos.cantidadMinima)).limit(limiteResultados);
  }

  async crear(valor: unknown, usuarioId: string) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del ingreso no son válidos.");
    const datos = valor as DatosIngreso;
    const fecha = texto(datos.fecha, "La fecha", 10, true)!;
    const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) throw new BadRequestException("Indica una fecha válida.");
    const tipoComprobante = datos.tipoComprobante ?? "BOLETA";
    if (tipoComprobante === "FACTURA") throw new BadRequestException("Este negocio está acogido al Nuevo RUS y solo puede emitir boletas de venta.");
    if (tipoComprobante !== "BOLETA" && tipoComprobante !== "NOTA_VENTA") throw new BadRequestException("Selecciona boleta de venta o nota de venta interna.");
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha del comprobante no puede ser posterior a hoy.");
    const claveIdempotencia = texto(datos.idempotencyKey, "La clave de idempotencia", 36, true)!;
    if (!uuidValido(claveIdempotencia)) throw new BadRequestException("La clave de idempotencia no tiene un formato válido.");
    if (typeof datos.medioPago !== "string" || !mediosPago.includes(datos.medioPago as typeof mediosPago[number])) throw new BadRequestException("Selecciona un medio de pago.");
    const medioPago = datos.medioPago as string;
    const condicionPago = tipoComprobante === "NOTA_VENTA" ? "CONTADO" : datos.condicionPago === undefined ? "CONTADO" : datos.condicionPago;
    if (condicionPago !== "CONTADO" && condicionPago !== "CREDITO") throw new BadRequestException("Selecciona contado o crédito.");
    const importePagoInicial = tipoComprobante === "NOTA_VENTA" ? 0 : datos.importePagoInicial === undefined || datos.importePagoInicial === null || datos.importePagoInicial === "" ? 0 : numero(datos.importePagoInicial, "El pago inicial", 2, 0);
    const vencimientoEnviado = tipoComprobante === "NOTA_VENTA" ? null : texto(datos.fechaVencimientoPago, "La fecha de vencimiento", 10);
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
    const emisor = tipoComprobante === "BOLETA" ? await this.configuracionEmisor.obtenerParaEmision() : null;
    const estadoIntegracion = tipoComprobante === "BOLETA" ? await this.estadoNubefact() : null;
    if (tipoComprobante === "BOLETA" && !estadoIntegracion?.emisionHabilitada) throw new BadRequestException("Completa las variables de NubeFact y los datos del emisor en Facturación electrónica antes de registrar una boleta.");
    let clienteId: string | null = null;
    let clienteTipoDocumento = texto(datos.clienteTipoDocumento, "El tipo de documento", 10);
    let clienteNumeroDocumento = texto(datos.clienteNumeroDocumento, "El número de documento", 20);
    let clienteNombre = texto(datos.clienteNombre, "El cliente", 180) ?? "CLIENTES VARIOS";
    let clienteDireccion = texto(datos.clienteDireccion, "La dirección del cliente", 240);
    if (datos.clienteId !== undefined && datos.clienteId !== null && datos.clienteId !== "") {
      if (!uuidValido(datos.clienteId)) throw new BadRequestException("Selecciona un cliente válido.");
      const [cliente] = await db.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento,
        nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
        razonSocial: personas.razonSocial, direccion: clientes.direccionFiscal,
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
    }
    if (clienteTipoDocumento === "DNI" && !/^\d{8}$/.test(clienteNumeroDocumento ?? "")) throw new BadRequestException("El DNI debe tener 8 dígitos.");
    if (clienteTipoDocumento === "RUC" && !rucPeruValido(clienteNumeroDocumento ?? "")) throw new BadRequestException("El RUC debe tener 11 dígitos y un dígito verificador válido.");
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
        return { tipo: "PRODUCTO" as const, presentacionId: linea.presentacionId as string, cantidad, descuento };
      }
      if (linea.tipo === "SERVICIO") {
        const descripcion = texto(linea.descripcion, `Descripción del servicio ${indice + 1}`, 240, true)!;
        const precio = numero(linea.precioUnitario, `Precio en línea ${indice + 1}`, 2, 0);
        const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
        const afectacionIgv = linea.afectacionIgv === undefined ? "GRAVADO" : linea.afectacionIgv;
        if (afectacionIgv !== "GRAVADO" && afectacionIgv !== "EXONERADO" && afectacionIgv !== "INAFECTO") throw new BadRequestException(`El tratamiento de impuesto del servicio no es válido en la línea ${indice + 1}.`);
        return { tipo: "SERVICIO" as const, descripcion, cantidad, precio, descuento, afectacionIgv: afectacionIgv as AfectacionIgv };
      }
      if (linea.tipo === "MOTOTAXI") {
        if (!uuidValido(linea.mototaxiUnidadId)) throw new BadRequestException(`Selecciona una unidad de mototaxi válida en la línea ${indice + 1}.`);
        if (cantidad !== 1) throw new BadRequestException("Cada línea de mototaxi debe representar una sola unidad identificada.");
        const precio = numero(linea.precioUnitario, `Precio de mototaxi ${indice + 1}`, 2, 0);
        const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
        return { tipo: "MOTOTAXI" as const, mototaxiUnidadId: linea.mototaxiUnidadId, cantidad, precio, descuento };
      }
      throw new BadRequestException(`El tipo de línea ${indice + 1} debe ser producto, servicio o mototaxi.`);
    });

    const huellaSolicitud = createHash("sha256").update(JSON.stringify({ usuarioId, fecha, tipoComprobante: datos.tipoComprobante, clienteId, clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, medioPago: datos.medioPago, condicionPago, importePagoInicial, fechaVencimientoPago, cuotasPago, observacion, lineas })).digest("hex");
    const anterior = await this.recuperarPorIdempotencia(claveIdempotencia, huellaSolicitud);
    if (anterior) return anterior;
    const tasaIgv = 18;

    let ventaRegistrada: { id: string; codigo: string; fecha: string; tipoComprobante: "BOLETA" | "NOTA_VENTA"; clienteTipoDocumento: string | null; clienteNumeroDocumento: string | null; clienteNombre: string | null; clienteDireccion: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; importePagoInicial: string; fechaVencimientoPago: string | null; cuotasPago: { cuota: number; fechaDePago: string; importe: string }[]; observacion: string | null; subtotal: string; tasaIgv: string; igv: string; total: string; estado: string; detalles: (typeof ingresosDetalle.$inferInsert)[] };
    try { ventaRegistrada = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(918273645)`);
      const id = randomUUID();
      let codigo = `ING-${fecha.replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
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
          precioUnitario = Number(presentacion.precio); afectacionIgv = producto.afectacionIgv; afectoIgv = afectacionIgv === "GRAVADO";
          const base = Number((linea.cantidad * Number(presentacion.factor)).toFixed(6));
          cantidadBase = base.toFixed(6);
        } else if (linea.tipo === "MOTOTAXI") {
          const [unidad] = await tx.select({ id: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin, estado: unidadesMototaxis.estado,
            marca: marcasMototaxis.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version })
            .from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasMototaxis, eq(modelosMototaxis.marcaId, marcasMototaxis.id))
            .where(eq(unidadesMototaxis.id, linea.mototaxiUnidadId as string)).for("update", { of: unidadesMototaxis }).limit(1);
          if (!unidad) throw new NotFoundException("La mototaxi seleccionada ya no está en el inventario.");
          if (unidad.estado !== "DISPONIBLE") throw new BadRequestException(`${unidad.marca} ${unidad.modelo} ya no está disponible para venta.`);
          unidadMototaxi = unidad;
          descripcion = `${unidad.marca} ${unidad.modelo}${unidad.version ? ` ${unidad.version}` : ""} · ${unidad.codigo}`;
          nombrePresentacion = unidad.vin ? `VIN ${unidad.vin}` : null;
          precioUnitario = linea.precio; afectacionIgv = "GRAVADO"; afectoIgv = true;
        } else {
          descripcion = linea.descripcion;
          precioUnitario = linea.precio;
          afectacionIgv = linea.afectacionIgv; afectoIgv = afectacionIgv === "GRAVADO";
        }

        if (tipoComprobante === "NOTA_VENTA" || tipoComprobante === "BOLETA") { afectacionIgv = "INAFECTO"; afectoIgv = false; }

        const totalBruto = redondear(linea.cantidad * precioUnitario);
        const descuento = linea.descuento ?? 0;
        if (descuento > totalBruto) throw new BadRequestException(`El descuento de ${descripcion} supera el importe de la línea.`);
        const maximoDescuento = totalBruto * validarConfiguracionEntorno().descuentoMaximoPorcentaje / 100;
        if (descuento > redondear(maximoDescuento)) throw new BadRequestException(`El descuento máximo permitido es ${validarConfiguracionEntorno().descuentoMaximoPorcentaje}% por línea.`);
        const totalLineaBase = redondear(totalBruto - descuento);
        const igvLinea = afectoIgv ? redondear(totalLineaBase * tasaIgv / (100 + tasaIgv)) : 0;
        const subtotalLinea = redondear(totalLineaBase - igvLinea);
        const totalLinea = totalLineaBase;
        subtotalHeader = redondear(subtotalHeader + subtotalLinea); igvHeader = redondear(igvHeader + igvLinea); totalHeader = redondear(totalHeader + totalLinea);
        detallesGuardados.push({ id: randomUUID(), ingresoId: id, tipo: linea.tipo, productoId: producto?.id ?? null, mototaxiUnidadId: unidadMototaxi?.id ?? null, presentacionId: presentacion?.id ?? null,
          codigoProducto: producto?.codigoInterno ?? null, descripcion, presentacion: nombrePresentacion, unidadMedidaCodigo: unidadCodigo,
          cantidad: linea.cantidad.toFixed(3), factorAUnidadBase: factor, cantidadBase, precioUnitario: precioUnitario.toFixed(4), descuento: descuento.toFixed(2), afectacionIgv, afectoIgv,
          subtotal: subtotalLinea.toFixed(2), igv: igvLinea.toFixed(2), total: totalLinea.toFixed(2) });
      }

      const saldoCreditoPendiente = redondear(totalHeader - importePagoInicial);
      const periodoVenta = fecha.slice(0, 7);
      const [inicioPeriodo, finPeriodo] = [`${periodoVenta}-01`, new Date(Date.UTC(Number(periodoVenta.slice(0, 4)), Number(periodoVenta.slice(5, 7)), 0)).toISOString().slice(0, 10)];
       const [ingresosPeriodo] = await tx.select({ total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(14,2)` })
         .from(ingresos).where(and(gte(ingresos.fecha, inicioPeriodo), lte(ingresos.fecha, finPeriodo), eq(ingresos.tipoComprobante, "BOLETA")));
      const acumuladoMes = Number(ingresosPeriodo?.total ?? 0);
      if (tipoComprobante === "BOLETA" && redondear(acumuladoMes + totalHeader) >= 8000) {
        throw new BadRequestException(`No se puede emitir esta boleta: la venta llevaría los ingresos del mes a S/ ${redondear(acumuladoMes + totalHeader).toFixed(2)}. El límite mensual NRUS es menor a S/ 8,000.00.`);
      }
      if (condicionPago === "CREDITO") {
        if (importePagoInicial >= totalHeader) throw new BadRequestException("El pago inicial debe ser menor que el total; registra la venta como pagada al contado.");
        if (redondear(cuotasPago.reduce((total, cuota) => total + Number(cuota.importe), 0)) !== saldoCreditoPendiente) throw new BadRequestException(`Las cuotas deben sumar el saldo pendiente de S/ ${saldoCreditoPendiente.toFixed(2)} después del pago inicial.`);
      }

      await tx.insert(ingresos).values({ id, codigo, rucEmisor: tipoComprobante === "BOLETA" ? emisor?.ruc ?? null : null, fecha, tipoComprobante, clienteId, clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, medioPago, condicionPago: condicionPago as "CONTADO" | "CREDITO", fechaVencimientoPago, cuotasPago, importePagoInicial: importePagoInicial.toFixed(2), observacion, estado: "REGISTRADO",
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
      return { id, codigo, fecha, tipoComprobante: tipoComprobante as "BOLETA" | "NOTA_VENTA", clienteTipoDocumento, clienteNumeroDocumento, clienteNombre, clienteDireccion, medioPago, condicionPago: condicionPago as "CONTADO" | "CREDITO", importePagoInicial: importePagoInicial.toFixed(2), fechaVencimientoPago, cuotasPago, observacion, subtotal: subtotalHeader.toFixed(2), tasaIgv: tasaIgv.toFixed(2), igv: igvHeader.toFixed(2), total: totalHeader.toFixed(2), estado: "REGISTRADO", detalles: detallesGuardados };
    }); } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        const repetida = await this.recuperarPorIdempotencia(claveIdempotencia, huellaSolicitud);
        if (repetida) return repetida;
        throw new ConflictException("La venta ya fue registrada por otra solicitud.");
      }
      throw error;
    }
    if (ventaRegistrada.tipoComprobante === "NOTA_VENTA") return { ...ventaRegistrada, nubefact: null };
    const detallesEmitidos = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, ventaRegistrada.id));
    const boletaRegistrada = { ...ventaRegistrada, tipoComprobante: "BOLETA" as const };
    const nubefact = await this.emitirComprobante(boletaRegistrada, detallesEmitidos);
    return { ...ventaRegistrada, estado: nubefact.estado, nubefact };
  }

}

















