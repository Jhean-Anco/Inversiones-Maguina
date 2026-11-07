import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";

const URL_TOKEN_BASE = "https://api-seguridad.sunat.gob.pe/v1/clientessol";
const URL_SIRE = "https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros";
const TIMEOUT_MS = 25000;

type Json = Record<string, unknown>;

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
    const datos = (tipo.includes("json") ? await respuesta.json().catch(() => ({})) : {}) as T;
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

  async solicitarPropuesta(periodoEntrada: string, fechaInicio?: string, fechaFin?: string) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const inicioDefault = `${periodo.slice(0, 4)}-${periodo.slice(4)}-01`;
    const finDefault = new Date(Date.UTC(Number(periodo.slice(0, 4)), Number(periodo.slice(4)), 0)).toISOString().slice(0, 10);
    const inicio = fechaInicio || inicioDefault;
    const fin = fechaFin || finDefault;
    const validaFecha = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha.startsWith(`${periodo.slice(0, 4)}-${periodo.slice(4)}`) && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`));
    if (!validaFecha(inicio) || !validaFecha(fin) || inicio > fin) throw new BadRequestException("Las fechas deben ser válidas, pertenecer al periodo indicado y estar en orden.");
    const token = await this.obtenerToken();
    const parametros = new URLSearchParams({ codTipoArchivo: "1", codOrigenEnvio: "2", fecEmisionIni: inicio, fecEmisionFin: fin });
    const ruta = `rce/propuesta/web/propuesta/${periodo}/exportacioncomprobantepropuesta?${parametros}`;
    const { datos } = await this.sire<Json>(ruta, token);
    const ticket = datos.numTicket;
    if (typeof ticket !== "string" || !ticket) throw new BadGatewayException("SUNAT no devolvió un ticket para la descarga de la propuesta.");
    return { periodo, ticket, formato: "CSV", mensaje: "Solicitud enviada. Consulta el estado del ticket y descarga el archivo cuando figure como terminado." };
  }

  async consultarTicket(periodoEntrada: string, ticketEntrada: string) {
    const periodo = this.validarPeriodo(periodoEntrada);
    const ticket = ticketEntrada.trim();
    if (!/^\d{12}$/.test(ticket)) throw new BadRequestException("El número de ticket de SUNAT no tiene un formato válido.");
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
    const parametros = new URLSearchParams({ perIni: periodo, perFin: periodo, page: "1", perPage: "20", numTicket: ticket, codLibro: "080000", codOrigenEnvio: "2" });
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
    if (!/^\d{12}$/.test(ticket) || !/^[\w.-]{1,180}\.zip$/i.test(nombre) || !/^(\d{1,2}|null)$/.test(tipo)) throw new BadRequestException("Los datos de descarga del ticket no son válidos.");
    const token = await this.obtenerToken();
    const registro = await this.obtenerEstadoTicket(periodo, ticket, token);
    const detalle = objeto(registro.detalleTicket);
    const estado = String(detalle.desEstadoEnvio ?? registro.desEstadoProceso ?? "");
    const archivos = Array.isArray(registro.archivoReporte) ? registro.archivoReporte.map(objeto) : [];
    const archivoTicket = archivos.find((archivo) => archivo.nomArchivoReporte === nombre && String(archivo.codTipoAchivoReporte ?? archivo.codTipoArchivoReporte ?? "null") === tipo);
    const proceso = String(registro.codProceso ?? "");
    const listo = /terminad/i.test(estado) || ["3", "4"].includes(String(detalle.codEstadoEnvio)) || ["3", "4"].includes(String(registro.codEstadoProceso));
    if (!listo || !archivoTicket || !/^\d{1,3}$/.test(proceso)) throw new BadRequestException("SUNAT todavía no habilita la descarga de este archivo. Consulta nuevamente el estado del ticket.");
    const parametros = new URLSearchParams({ nomArchivoReporte: nombre, codTipoArchivoReporte: tipo, perTributario: periodo, codProceso: proceso, numTicket: ticket, codLibro: "080000" });
    const { respuesta } = await this.sire(`rvierce/gestionprocesosmasivos/web/masivo/archivoreporte?${parametros}`, token);
    const contenido = Buffer.from(await respuesta.arrayBuffer());
    if (!contenido.length) throw new BadGatewayException("SUNAT devolvió un archivo vacío.");
    return { contenido, nombre };
  }
}
