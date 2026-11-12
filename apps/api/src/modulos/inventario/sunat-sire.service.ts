import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { db, documentosRecibidos } from "@magina/database";
import { and, count, desc, ilike, or, eq } from "drizzle-orm";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";

const URL_TOKEN_BASE = "https://api-seguridad.sunat.gob.pe/v1/clientessol";
const URL_SIRE = "https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros";
const TIMEOUT_MS = 25000;

type Json = Record<string, unknown>;
type ConsultaDocumentoSire = { rucProveedor: string; tipoDocumento: string; serie: string; correlativo: string };

function objeto(valor: unknown): Json {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? valor as Json : {};
}

function mensajeProveedor(valor: unknown) {
  const datos = objeto(valor);
  const mensaje = datos.msg ?? datos.message ?? datos.mensaje;
  return typeof mensaje === "string" ? mensaje.slice(0, 400) : "SUNAT no pudo completar la consulta.";
}

@Injectable()
export class ServicioSunatSire {
  private tokenCache: { valor: string; vence: number } | null = null;

  estaConfigurado() {
    return /^\d{11}$/.test(process.env.SUNAT_SIRE_RUC?.trim() ?? "")
      && Boolean(process.env.SUNAT_SIRE_USUARIO_SOL?.trim())
      && Boolean(process.env.SUNAT_SIRE_CLAVE_SOL)
      && Boolean(process.env.SUNAT_SIRE_CLIENT_ID?.trim())
      && Boolean(process.env.SUNAT_SIRE_CLIENT_SECRET);
  }

  private async credenciales() {
    const ruc = process.env.SUNAT_SIRE_RUC?.trim() ?? "";
    const usuario = process.env.SUNAT_SIRE_USUARIO_SOL?.trim() ?? "";
    const claveSol = process.env.SUNAT_SIRE_CLAVE_SOL ?? "";
    const clientId = process.env.SUNAT_SIRE_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.SUNAT_SIRE_CLIENT_SECRET ?? "";
    if (!/^\d{11}$/.test(ruc) || !usuario || !claveSol || !clientId || !clientSecret) {
      throw new ServiceUnavailableException("Falta configurar el acceso de SUNAT SIRE en el servidor.");
    }
    return { ruc, usuario, claveSol, clientId, clientSecret };
  }

  private async obtenerToken() {
    if (this.tokenCache && this.tokenCache.vence > Date.now() + 30000) return this.tokenCache.valor;
    const datos = await this.credenciales();
    const body = new URLSearchParams({
      grant_type: "password",
      scope: "https://api-sire.sunat.gob.pe",
      client_id: datos.clientId,
      client_secret: datos.clientSecret,
      username: `${datos.ruc}${datos.usuario}`,
      password: datos.claveSol,
    });
    let respuesta: Response;
    try {
      respuesta = await fetch(`${URL_TOKEN_BASE}/${encodeURIComponent(datos.clientId)}/oauth2/token/`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new BadGatewayException("No se pudo conectar con el servicio de autenticación de SUNAT.");
    }
    const contenido = objeto(await respuesta.json().catch(() => ({})));
    if (!respuesta.ok || typeof contenido.access_token !== "string") {
      const status = respuesta.status === 400 || respuesta.status === 401 ? 400 : 502;
      if (status === 400) throw new BadRequestException("SUNAT rechazó las credenciales configuradas para SIRE. Revisa el RUC, usuario SOL, Clave SOL y credenciales de API.");
      throw new BadGatewayException(mensajeProveedor(contenido));
    }
    const duracion = Number(contenido.expires_in);
    this.tokenCache = { valor: contenido.access_token, vence: Date.now() + (Number.isFinite(duracion) && duracion > 0 ? duracion : 300) * 1000 };
    return this.tokenCache.valor;
  }

  private async sire<T = unknown>(ruta: string, token: string): Promise<{ respuesta: Response; datos: T }> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${URL_SIRE}/${ruta}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new BadGatewayException("No se pudo conectar con la API de SUNAT SIRE.");
    }
    const tipo = respuesta.headers.get("content-type") ?? "";
    // SUNAT documenta application/json también en respuestas de descarga. Leer
    // el clone evita consumir el ZIP antes de que el importador obtenga sus bytes.
    let datos = {} as T;
    if (tipo.includes("json")) {
      try {
        datos = await respuesta.clone().json() as T;
      } catch {
        throw new BadGatewayException("SUNAT devolvió una respuesta JSON no válida.");
      }
    }
    if (!respuesta.ok) throw new BadGatewayException(mensajeProveedor(datos));
    return { respuesta, datos };
  }

  private validarPeriodo(periodo: string) {
    if (!/^\d{6}$/.test(periodo) || Number(periodo.slice(4)) < 1 || Number(periodo.slice(4)) > 12) throw new BadRequestException("El periodo debe tener el formato AAAAMM, por ejemplo 202611.");
    const actual = new Date();
    const periodoActual = `${actual.getFullYear()}${String(actual.getMonth() + 1).padStart(2, "0")}`;
    if (periodo > periodoActual) throw new BadRequestException("El periodo no puede ser posterior al mes actual.");
    return periodo;
  }

  async consultarPeriodos() {
    const token = await this.obtenerToken();
    const { datos } = await this.sire("rvierce/padron/web/omisos/080000/periodos", token);
    return datos;
  }

  private validarConsultaDocumento(entrada: ConsultaDocumentoSire): ConsultaDocumentoSire {
    const consulta = { rucProveedor: entrada.rucProveedor.trim(), tipoDocumento: entrada.tipoDocumento.trim(), serie: entrada.serie.trim().toUpperCase(), correlativo: entrada.correlativo.trim().toUpperCase() };
    if (!/^\d{11}$/.test(consulta.rucProveedor) || !["01", "03", "07", "08"].includes(consulta.tipoDocumento) || !/^[A-Z0-9-]{1,20}$/.test(consulta.serie) || !/^[A-Z0-9-]{1,40}$/.test(consulta.correlativo)) {
      throw new BadRequestException("El comprobante debe tener RUC de 11 dígitos, tipo válido, serie y número.");
    }
    return consulta;
  }

  async solicitarPropuesta(periodoEntrada: string, consultaEntrada: ConsultaDocumentoSire) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const consulta = this.validarConsultaDocumento(consultaEntrada);
    const token = await this.obtenerToken();
    const parametros = new URLSearchParams({ codTipoArchivo: "1", codOrigenEnvio: "2", codTipoCDP: consulta.tipoDocumento, numSerieCDP: consulta.serie, numCDP: consulta.correlativo });
    const ruta = `rce/propuesta/web/propuesta/${periodo}/exportacioncomprobantepropuesta?${parametros}`;
    const { datos } = await this.sire<Json>(ruta, token);
    const ticket = datos.numTicket;
    if (typeof ticket !== "string" || !ticket) throw new BadGatewayException("SUNAT no devolvió un ticket para la descarga de la propuesta.");
    return { periodo, ticket, formato: "CSV", documentoConsultado: consulta, mensaje: "Consulta puntual enviada. Descarga únicamente el comprobante solicitado cuando SUNAT termine de procesarla." };
  }

  async consultarTicket(periodoEntrada: string, ticketEntrada: string) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const ticket = ticketEntrada.trim();
    if (!/^\d{14}$/.test(ticket)) throw new BadRequestException("El número de ticket de SUNAT no tiene un formato válido.");
    const token = await this.obtenerToken();
    const registro = await this.obtenerEstadoTicket(periodo, ticket, token);
    const detalle = objeto(registro.detalleTicket);
    const archivos = Array.isArray(registro.archivoReporte) ? registro.archivoReporte.map(objeto) : [];
    const estado = String(detalle.desEstadoEnvio ?? registro.desEstadoProceso ?? "En proceso");
    const listo = (/terminad/i.test(estado) || ["3", "4"].includes(String(detalle.codEstadoEnvio)) || ["3", "4"].includes(String(registro.codEstadoProceso))) && archivos.length > 0;
    return {
      periodo,
      ticket,
      estado,
      codigoEstado: detalle.codEstadoEnvio ?? registro.codEstadoProceso ?? null,
      listo,
      codProceso: registro.codProceso ?? null,
      archivos: archivos.map((archivo) => ({ nombre: archivo.nomArchivoReporte ?? null, tipo: archivo.codTipoAchivoReporte ?? archivo.codTipoArchivoReporte ?? null })),
    };
  }

  private async obtenerEstadoTicket(periodo: string, ticket: string, token: string) {
    const parametros = new URLSearchParams({ perIni: periodo, perFin: periodo, page: "1", perPage: "20", numTicket: ticket });
    const { datos } = await this.sire<Json>(`rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?${parametros}`, token);
    const registros = Array.isArray(datos.registros) ? datos.registros : [];
    const registro = objeto(registros.map(objeto).find((item) => item.numTicket === ticket));
    if (!Object.keys(registro).length) throw new BadGatewayException("SUNAT no devolvió el estado del ticket solicitado.");
    return registro;
  }

  async descargarArchivo(periodoEntrada: string, ticketEntrada: string, nombreEntrada: string, tipoEntrada: string) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const ticket = ticketEntrada.trim();
    const nombre = nombreEntrada.trim();
    const tipo = tipoEntrada.trim();
    if (!/^\d{14}$/.test(ticket) || !/^[\w.-]{1,180}\.zip$/i.test(nombre) || !/^(\d{1,2}|null)$/.test(tipo)) throw new BadRequestException("Los datos de descarga del ticket no son válidos.");
    const token = await this.obtenerToken();
    const registro = await this.obtenerEstadoTicket(periodo, ticket, token);
    const detalle = objeto(registro.detalleTicket);
    const estado = String(detalle.desEstadoEnvio ?? registro.desEstadoProceso ?? "");
    const archivos = Array.isArray(registro.archivoReporte) ? registro.archivoReporte.map(objeto) : [];
    const archivoTicket = archivos.find((archivo) => archivo.nomArchivoReporte === nombre && String(archivo.codTipoAchivoReporte ?? archivo.codTipoArchivoReporte ?? "null") === tipo);
    const proceso = String(registro.codProceso ?? "");
    const listo = /terminad/i.test(estado) || ["3", "4"].includes(String(detalle.codEstadoEnvio)) || ["3", "4"].includes(String(registro.codEstadoProceso));
    if (!listo || !archivoTicket || !/^\d{1,3}$/.test(proceso)) throw new BadRequestException("SUNAT todavía no habilita la descarga de este archivo. Consulta nuevamente el estado del ticket.");
    const parametros = new URLSearchParams({ nomArchivoReporte: nombre, codTipoArchivoReporte: tipo, perTributario: periodo, codProceso: proceso, numTicket: ticket });
    const { respuesta } = await this.sire(`rvierce/gestionprocesosmasivos/web/masivo/archivoreporte?${parametros}`, token);
    const contenido = Buffer.from(await respuesta.arrayBuffer());
    if (!contenido.length) throw new BadGatewayException("SUNAT devolvió un archivo vacío.");
    return { contenido, nombre };
  }

  async importarPropuesta(periodoEntrada: string, ticket: string, nombre: string, tipo: string, consultaEntrada: ConsultaDocumentoSire, usuario: UsuarioAutenticado) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const consulta = this.validarConsultaDocumento(consultaEntrada);
    const archivo = await this.descargarArchivo(periodo, ticket, nombre, tipo);
    if (archivo.contenido.byteLength > 25 * 1024 * 1024) throw new BadRequestException("El archivo de SUNAT supera el límite de 25 MB.");
    let zip: Record<string, Uint8Array>;
    try { zip = unzipSync(new Uint8Array(archivo.contenido), { filter: (entrada) => !entrada.name.startsWith("__MACOSX/") }); }
    catch { throw new BadGatewayException("El archivo descargado de SUNAT no es un ZIP válido."); }
    const entradas = Object.entries(zip).filter(([ruta]) => ruta.toLowerCase().endsWith(".csv") && !ruta.startsWith("__MACOSX/"));
    if (!entradas.length) throw new BadGatewayException("El ZIP de SUNAT no contiene un CSV de comprobantes.");
    const filas = entradas.flatMap(([ruta, bytes]) => {
      if (bytes.byteLength > 20 * 1024 * 1024) throw new BadRequestException(`El CSV ${ruta} supera el límite de 20 MB.`);
      const contenido = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const primerLinea = contenido.split(/\r?\n/, 1)[0] ?? "";
      const delimitador = (primerLinea.match(/;/g)?.length ?? 0) > (primerLinea.match(/,/g)?.length ?? 0) ? ";" : ",";
      return parse(contenido, { bom: true, columns: true, delimiter: delimitador, skip_empty_lines: true, relax_quotes: false, max_record_size: 100_000 }) as Json[];
    });
    if (filas.length > 100_000) throw new BadRequestException("La propuesta supera el límite de 100,000 documentos por importación.");
    const normalizar = (valor: unknown) => String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const elegir = (fila: Json, aliases: string[]) => {
      const objetivo = new Set(aliases.map(normalizar));
      const clave = Object.keys(fila).find((item) => objetivo.has(normalizar(item)));
      return clave ? String(fila[clave] ?? "").trim() : "";
    };
    let importados = 0;
    let omitidos = 0;
    let documentoConsultado: { id: string; emisorRuc: string; emisorNombre: string | null; tipoDocumento: string; serie: string; correlativo: string; fechaEmision: string | null; moneda: string | null; total: string | null; estado: string; periodoSire: string | null; destino: string | null } | null = null;
    for (const fila of filas) {
      const ruc = elegir(fila, ["numDocIdentidadProveedor", "numRucProveedor", "numRuc", "rucEmisor", "rucProveedor", "numeroRucProveedor", "RUC del proveedor"]);
      const tipoDocumento = elegir(fila, ["codTipoCDP", "tipoDocumento", "codTipoComprobante"]);
      const serie = elegir(fila, ["numSerieCDP", "serie", "numeroSerie"]);
      const correlativo = elegir(fila, ["numCDP", "correlativo", "numeroDocumento"]);
      if (!/^\d{11}$/.test(ruc) || !tipoDocumento || !serie || !correlativo) { omitidos++; continue; }
      const codigoTipo = /^\d{1,2}$/.test(tipoDocumento) ? tipoDocumento.padStart(2, "0") : tipoDocumento;
      if (ruc !== consulta.rucProveedor || codigoTipo !== consulta.tipoDocumento || serie.trim().toUpperCase() !== consulta.serie || correlativo.trim().toUpperCase() !== consulta.correlativo) { omitidos++; continue; }
      const fechaRaw = elegir(fila, ["fecEmision", "fechaEmision", "fechaEmisionComprobante"]);
      const fechaEmision = /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(fechaRaw) ? `${fechaRaw.slice(6)}-${fechaRaw.slice(3, 5)}-${fechaRaw.slice(0, 2)}` : /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) ? fechaRaw : null;
      const totalRaw = elegir(fila, ["mtoTotalCP", "mtoTotal", "importeTotal", "totalComprobante", "montoTotal"]);
      const total = /^-?\d+(?:[.,]\d{1,2})?$/.test(totalRaw) ? totalRaw.replace(",", ".") : null;
      const emisor = elegir(fila, ["nomRazonSocialProveedor", "nomRazonSocial", "razonSocial", "nomEmisor", "nombreProveedor"]);
      const moneda = elegir(fila, ["codMoneda", "moneda"]).toUpperCase().slice(0, 3) || null;
      const resultado = await db.insert(documentosRecibidos).values({ periodoSire: periodo, ticketSire: ticket, emisorRuc: ruc, emisorNombre: emisor || null, tipoDocumento: codigoTipo, serie: serie.trim().toUpperCase(), correlativo: correlativo.trim(), fechaEmision, moneda, total, datosOrigen: fila, usuarioId: usuario.id })
        .onConflictDoUpdate({ target: [documentosRecibidos.emisorRuc, documentosRecibidos.tipoDocumento, documentosRecibidos.serie, documentosRecibidos.correlativo], set: { periodoSire: periodo, ticketSire: ticket, emisorNombre: emisor || null, fechaEmision, moneda, total, datosOrigen: fila } })
        .returning({ id: documentosRecibidos.id, emisorRuc: documentosRecibidos.emisorRuc, emisorNombre: documentosRecibidos.emisorNombre, tipoDocumento: documentosRecibidos.tipoDocumento, serie: documentosRecibidos.serie, correlativo: documentosRecibidos.correlativo, fechaEmision: documentosRecibidos.fechaEmision, moneda: documentosRecibidos.moneda, total: documentosRecibidos.total, estado: documentosRecibidos.estado, periodoSire: documentosRecibidos.periodoSire, destino: documentosRecibidos.destino });
      if (resultado[0]) { importados++; documentoConsultado = resultado[0]; }
    }
    if (!documentoConsultado) throw new NotFoundException("SUNAT no devolvió un comprobante que coincida exactamente con el RUC, tipo, serie y número consultados.");
    return { periodo, ticket, documentoConsultado, documentosGuardados: importados, documentosOmitidos: omitidos };
  }

  async listarDocumentos(filtros: { pagina?: string; porPagina?: string; busqueda?: string; estado?: string; periodo?: string; destino?: string; tipoDocumento?: string }) {
    const pagina = Math.max(1, Math.min(100_000, Number.parseInt(filtros.pagina ?? "1", 10) || 1));
    const porPagina = Math.max(1, Math.min(100, Number.parseInt(filtros.porPagina ?? "10", 10) || 10));
    const busqueda = filtros.busqueda?.trim();
    const estado = filtros.estado?.trim();
    const periodo = filtros.periodo?.trim().replace("-", "");
    const destino = filtros.destino?.trim();
    const tipoDocumento = filtros.tipoDocumento?.trim();
    if (periodo && !/^\d{6}$/.test(periodo)) throw new BadRequestException("El periodo debe tener formato AAAA-MM.");
    if (destino && !["REPUESTOS", "MOTOTAXI", "GASTO_OPERATIVO", "ACTIVO_HERRAMIENTA"].includes(destino)) throw new BadRequestException("El destino seleccionado no es válido.");
    if (tipoDocumento && !["01", "03", "07", "08"].includes(tipoDocumento)) throw new BadRequestException("El tipo de comprobante seleccionado no es válido.");
    const where = and(
      estado && ["PENDIENTE_REVISION", "OBSERVADO", "PENDIENTE_RECEPCION", "REGISTRADO", "DESCARTADO"].includes(estado) ? eq(documentosRecibidos.estado, estado) : undefined,
      periodo ? eq(documentosRecibidos.periodoSire, periodo) : undefined,
      destino ? eq(documentosRecibidos.destino, destino) : undefined,
      tipoDocumento ? eq(documentosRecibidos.tipoDocumento, tipoDocumento) : undefined,
      busqueda ? or(ilike(documentosRecibidos.emisorNombre, `%${busqueda}%`), ilike(documentosRecibidos.emisorRuc, `%${busqueda}%`), ilike(documentosRecibidos.serie, `%${busqueda}%`), ilike(documentosRecibidos.correlativo, `%${busqueda}%`)) : undefined,
    );
    const [registros, total] = await Promise.all([
      db.select({ id: documentosRecibidos.id, emisorRuc: documentosRecibidos.emisorRuc, emisorNombre: documentosRecibidos.emisorNombre, tipoDocumento: documentosRecibidos.tipoDocumento, serie: documentosRecibidos.serie, correlativo: documentosRecibidos.correlativo, fechaEmision: documentosRecibidos.fechaEmision, moneda: documentosRecibidos.moneda, total: documentosRecibidos.total, estado: documentosRecibidos.estado, periodoSire: documentosRecibidos.periodoSire, destino: documentosRecibidos.destino }).from(documentosRecibidos).where(where).orderBy(desc(documentosRecibidos.fechaEmision), desc(documentosRecibidos.importadoEn)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(documentosRecibidos).where(where),
    ]);
    return { registros, total: total[0]?.total ?? 0, pagina, porPagina, paginas: Math.ceil(Number(total[0]?.total ?? 0) / porPagina) };
  }

  async registrarManual(datos: Record<string, unknown>, usuario: UsuarioAutenticado) {
    const texto = (clave: string, maximo: number) => typeof datos[clave] === "string" ? (datos[clave] as string).trim().slice(0, maximo) : "";
    const emisorRuc = texto("emisorRuc", 11);
    const emisorNombre = texto("emisorNombre", 240);
    const tipoDocumento = texto("tipoDocumento", 10);
    const serie = texto("serie", 30).toUpperCase();
    const correlativo = texto("correlativo", 40);
    const fechaEmision = texto("fechaEmision", 10);
    const moneda = texto("moneda", 3).toUpperCase();
    const total = typeof datos.total === "string" || typeof datos.total === "number" ? String(datos.total).trim().replace(",", ".") : "";
    if (!/^\d{11}$/.test(emisorRuc) || !emisorNombre || !["01", "03", "07", "08"].includes(tipoDocumento) || !serie || !correlativo || !/^\d{4}-\d{2}-\d{2}$/.test(fechaEmision) || Number.isNaN(Date.parse(`${fechaEmision}T00:00:00Z`)) || !["PEN", "USD", "EUR"].includes(moneda) || !/^\d{1,12}(?:\.\d{1,2})?$/.test(total) || Number(total) <= 0) {
      throw new BadRequestException("Completa RUC, proveedor, tipo, serie, número, fecha, moneda e importe válido del comprobante.");
    }
    const [documento] = await db.insert(documentosRecibidos).values({ emisorRuc, emisorNombre, tipoDocumento, serie, correlativo, fechaEmision, moneda, total, datosOrigen: { origen: "MANUAL" }, usuarioId: usuario.id }).onConflictDoNothing().returning({ id: documentosRecibidos.id });
    if (!documento) throw new ConflictException("Este comprobante ya está registrado en la bandeja.");
    return documento;
  }

  async clasificarDocumento(idEntrada: string, destinoEntrada: unknown) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idEntrada)) throw new BadRequestException("El identificador del documento no es válido.");
    const destino = typeof destinoEntrada === "string" ? destinoEntrada : "";
    if (!["REPUESTOS", "MOTOTAXI", "GASTO_OPERATIVO", "ACTIVO_HERRAMIENTA"].includes(destino)) throw new BadRequestException("Selecciona el destino del comprobante.");
    const [actual] = await db.select({ id: documentosRecibidos.id, estado: documentosRecibidos.estado, destino: documentosRecibidos.destino }).from(documentosRecibidos).where(eq(documentosRecibidos.id, idEntrada)).limit(1);
    if (!actual) throw new NotFoundException("No se encontró el comprobante recibido.");
    if (["REGISTRADO", "DESCARTADO"].includes(actual.estado)) throw new ConflictException("Este comprobante ya fue procesado y no se puede reclasificar.");
    if (actual.destino && actual.destino !== destino) throw new ConflictException("Este comprobante ya fue asignado a otro tipo de egreso.");
    const estado = destino === "GASTO_OPERATIVO" ? "PENDIENTE_REVISION" : "PENDIENTE_RECEPCION";
    const [documento] = await db.update(documentosRecibidos).set({ destino, estado }).where(eq(documentosRecibidos.id, idEntrada)).returning({ id: documentosRecibidos.id, destino: documentosRecibidos.destino, estado: documentosRecibidos.estado });
    return documento;
  }
}
