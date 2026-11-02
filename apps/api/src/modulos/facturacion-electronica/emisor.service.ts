import { BadRequestException, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { configuracionEmisorFacturacion, db, ingresos } from "@magina/database";
import { rucPeruValido } from "../../utilidades/ruc-peru";

const limpiar = (valor: unknown, campo: string, maximo: number, requerido = false) => {
  if (valor === undefined || valor === null || valor === "") {
    if (requerido) throw new BadRequestException(`${campo} es obligatorio.`);
    return null;
  }
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim())) throw new BadRequestException(`${campo} no es válido.`);
  return valor.trim() || null;
};

@Injectable()
export class ServicioEmisorFacturacion {
  async obtener() {
    const [emisor] = await db.select({
      ruc: configuracionEmisorFacturacion.ruc, razonSocial: configuracionEmisorFacturacion.razonSocial,
      nombreComercial: configuracionEmisorFacturacion.nombreComercial, domicilioFiscal: configuracionEmisorFacturacion.domicilioFiscal,
      ubigeo: configuracionEmisorFacturacion.ubigeo, urbanizacion: configuracionEmisorFacturacion.urbanizacion,
      distrito: configuracionEmisorFacturacion.distrito, provincia: configuracionEmisorFacturacion.provincia,
      departamento: configuracionEmisorFacturacion.departamento, correo: configuracionEmisorFacturacion.correo,
      telefono: configuracionEmisorFacturacion.telefono, logoUrl: configuracionEmisorFacturacion.logoUrl,
      actualizadoEn: configuracionEmisorFacturacion.actualizadoEn,
    }).from(configuracionEmisorFacturacion).where(eq(configuracionEmisorFacturacion.codigo, "PRINCIPAL")).limit(1);
    return { emisor: emisor ?? null, integracion: this.estadoIntegracion(emisor ?? null) };
  }

  async obtenerParaEmision() {
    const [emisor] = await db.select({ ruc: configuracionEmisorFacturacion.ruc }).from(configuracionEmisorFacturacion)
      .where(eq(configuracionEmisorFacturacion.codigo, "PRINCIPAL")).limit(1);
    return emisor ?? null;
  }

  async guardar(valor: unknown, usuarioId: string) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos del emisor no son válidos.");
    const datos = valor as Record<string, unknown>;
    const ruc = limpiar(datos.ruc, "El RUC", 11, true)!;
    if (!rucPeruValido(ruc)) throw new BadRequestException("El RUC del emisor no es válido.");
    const razonSocial = limpiar(datos.razonSocial, "La razón social", 180, true)!;
    const domicilioFiscal = limpiar(datos.domicilioFiscal, "El domicilio fiscal", 240, true)!;
    const ubigeo = limpiar(datos.ubigeo, "El ubigeo", 6);
    if (ubigeo && !/^\d{6}$/.test(ubigeo)) throw new BadRequestException("El ubigeo debe tener seis dígitos.");
    const nombreComercial = limpiar(datos.nombreComercial, "El nombre comercial", 180);
    const urbanizacion = limpiar(datos.urbanizacion, "La urbanización", 100);
    const distrito = limpiar(datos.distrito, "El distrito", 100);
    const provincia = limpiar(datos.provincia, "La provincia", 100);
    const departamento = limpiar(datos.departamento, "El departamento", 100);
    const correo = limpiar(datos.correo, "El correo", 254);
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException("El correo no es válido.");
    const telefono = limpiar(datos.telefono, "El teléfono", 30);
    const logoUrl = limpiar(datos.logoUrl, "El logo", 1000);
    if (logoUrl && (!logoUrl.startsWith("https://") || !URL.canParse(logoUrl))) throw new BadRequestException("El logo debe usar una URL HTTPS válida.");
    await db.insert(configuracionEmisorFacturacion).values({
      codigo: "PRINCIPAL", ruc, razonSocial, domicilioFiscal, nombreComercial, ubigeo, urbanizacion,
      distrito, provincia, departamento, correo, telefono, logoUrl, actualizadoPorUsuarioId: usuarioId,
    }).onConflictDoUpdate({
      target: configuracionEmisorFacturacion.codigo,
      set: { ruc, razonSocial, domicilioFiscal, nombreComercial, ubigeo, urbanizacion, distrito, provincia, departamento, correo, telefono, logoUrl, actualizadoPorUsuarioId: usuarioId, actualizadoEn: new Date() },
    });
    return this.obtener();
  }

  async listarComprobantes(filtros: { pagina?: string; busqueda?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = `%${busqueda.replace(/[\\%_]/g, "\\$&")}%`;
    const condicion = busqueda ? or(ilike(ingresos.codigo, coincidencia), ilike(ingresos.clienteNombre, coincidencia), ilike(ingresos.clienteNumeroDocumento, coincidencia), ilike(ingresos.estado, coincidencia)) : undefined;
    const [filas, [conteo]] = await Promise.all([
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, tipoComprobante: ingresos.tipoComprobante,
        clienteNumeroDocumento: ingresos.clienteNumeroDocumento, clienteNombre: ingresos.clienteNombre, subtotal: ingresos.subtotal,
        tasaIgv: ingresos.tasaIgv, igv: ingresos.igv, total: ingresos.total, estado: ingresos.estado,
        creadoEn: ingresos.creadoEn, datosNubefact: ingresos.datosNubefact }).from(ingresos).where(and(condicion, inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA"])))
        .orderBy(desc(ingresos.creadoEn)).limit(20).offset((pagina - 1) * 20),
      db.select({ total: count() }).from(ingresos).where(and(condicion, inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA"]))),
    ]);
    const items = filas.map((fila) => {
      const datos = fila.datosNubefact && typeof fila.datosNubefact === "object" ? fila.datosNubefact as Record<string, unknown> : {};
      const solicitud = datos.solicitud && typeof datos.solicitud === "object" ? datos.solicitud as Record<string, unknown> : {};
      const respuesta = datos.respuesta && typeof datos.respuesta === "object" ? datos.respuesta as Record<string, unknown> : {};
      const serie = typeof solicitud.serie === "string" ? solicitud.serie : "";
      const numero = Number(solicitud.numero ?? 0);
      return { id: fila.id, codigoVenta: fila.codigo, fecha: fila.fecha, tipoComprobante: fila.tipoComprobante,
        clienteNumeroDocumento: fila.clienteNumeroDocumento, clienteNombre: fila.clienteNombre, subtotal: fila.subtotal,
        tasaIgv: fila.tasaIgv, igv: fila.igv, total: fila.total, estado: fila.estado,
        ambiente: datos.ambiente === "PRODUCCION" ? "PRODUCCION" : datos.ambiente === "DEMO" ? "DEMO" : null,
        serie, numero, codigoComprobante: serie && numero ? `${serie}-${String(numero).padStart(6, "0")}` : null,
        enlace: typeof respuesta.enlace === "string" ? respuesta.enlace : null,
        enlacePdf: typeof respuesta.enlace_del_pdf === "string" ? respuesta.enlace_del_pdf : null,
        enlaceXml: typeof respuesta.enlace_del_xml === "string" ? respuesta.enlace_del_xml : null,
        mensaje: typeof respuesta.errors === "string" ? respuesta.errors : typeof datos.mensaje === "string" ? datos.mensaje : null,
        creadoEn: fila.creadoEn };
    });
    const total = conteo?.total ?? 0;
    return { items, pagina, total, totalPaginas: Math.max(1, Math.ceil(total / 20)) };
  }

  estadoIntegracion(emisor: { ruc?: string } | null) {
    const ambiente = process.env.NUBEFACT_AMBIENTE === "PRODUCCION" ? "PRODUCCION" : "DEMO";
    const credencialesConfiguradas = Boolean(process.env.NUBEFACT_RUTA?.trim() && process.env.NUBEFACT_TOKEN?.trim());
    const seriesConfiguradas = Boolean(process.env.NUBEFACT_SERIE_BOLETA?.trim());
    const emisorConfigurado = Boolean(emisor?.ruc);
    return { ambiente, credencialesConfiguradas, seriesConfiguradas, emisorConfigurado,
      emisionHabilitada: credencialesConfiguradas && seriesConfiguradas && emisorConfigurado };
  }
}
