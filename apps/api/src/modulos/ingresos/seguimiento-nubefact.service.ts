import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { archivosLocales, comprobantesRelacionados, db, guiasRemision, ingresos, nubefactSeguimientos } from "@magina/database";
import { and, eq, gte, inArray, or, sql, type AnyColumn, type SQLWrapper } from "drizzle-orm";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";
import { ServicioAlmacenamiento } from "../almacenamiento/almacenamiento.service";
import { analizarEstadoComprobante } from "./comprobante-emision.util";
import { CODIGO_MOTIVO_NOTA_LIBERADA } from "./saldos-venta";
import { ServicioIngresos } from "./ingresos.service";
import { enviarANubefact, ErrorRedNubefact, solicitudConsultaComprobante, type CuerpoNubefact } from "./nubefact-cliente";
import { retardoInicialSegundos, transicionarSeguimiento, type ResultadoSeguimiento } from "./seguimiento-nubefact.util";

type EntidadSeguimiento = "INGRESO" | "COMPROBANTE_RELACIONADO" | "GUIA_REMISION";
type OperacionSeguimiento = "EMISION" | "ANULACION" | "ARCHIVOS";
type TipoDocumento = "BOLETA" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO";
type FilaSeguimiento = typeof nubefactSeguimientos.$inferSelect;
type Registro = Record<string, unknown>;
/** Restringe un ciclo a ciertas entidades (útil en pruebas con una base compartida). */
type Alcance = { entidadIds?: string[] };

const TIEMPO_CONSULTA_MS = 10_000;
const ARRENDAMIENTO_MS = 3 * 60_000;
const CONCURRENCIA = 4;
const TIPOS_ARCHIVO = ["PDF", "XML", "CDR"] as const;
/** Estados del proveedor que merecen seguir consultándose: sin resultado final de SUNAT (ERROR_SUNAT suele ser una caída transitoria). */
const ESTADOS_EN_ESPERA = ["PENDIENTE_CONFIRMACION", "EN_PROCESO", "ERROR_SUNAT"];

const objeto = (valor: unknown): Registro => (valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Registro : {});
const aceptadaPorSunat = (datos: unknown) => [objeto(datos).respuesta, objeto(objeto(datos).consultaComprobante).respuesta].some((respuesta) => objeto(respuesta).aceptada_por_sunat === true);
const sinAceptacionNota = sql`coalesce(${comprobantesRelacionados.datosNubefact}->'respuesta'->>'aceptada_por_sunat', '') <> 'true' and coalesce(${comprobantesRelacionados.datosNubefact}->'consultaComprobante'->'respuesta'->>'aceptada_por_sunat', '') <> 'true'`;
const formatoCodigo = (serie: string, numero: number) => `${serie}-${String(numero).padStart(6, "0")}`;
/** Fusiona `parche` en la columna jsonb en una sola sentencia, sin pisar claves que otra operación haya escrito entre tanto. */
const fusionarDatos = (columna: SQLWrapper, parche: Registro) => sql`coalesce(${columna}, '{}'::jsonb) || ${JSON.stringify(parche)}::jsonb`;

@Injectable()
export class ServicioSeguimientoNubefact implements OnModuleInit, OnModuleDestroy {
  private readonly registro = new Logger(ServicioSeguimientoNubefact.name);
  private temporizador: NodeJS.Timeout | null = null;
  private enEjecucion = false;

  constructor(private readonly ingresosServicio: ServicioIngresos, private readonly almacenamiento: ServicioAlmacenamiento) {}

  onModuleInit() {
    const { activo, intervaloMs } = validarConfiguracionEntorno().seguimientoNubefact;
    if (!activo) return;
    this.temporizador = setInterval(() => {
      void this.ejecutarCiclo().catch((error) => this.registro.error(`Ciclo de seguimiento NubeFact fallido: ${error instanceof Error ? error.message : String(error)}`));
    }, intervaloMs);
    this.temporizador.unref();
    this.registro.log(`Seguimiento automático de NubeFact activo (cada ${intervaloMs} ms).`);
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  /** Un ciclo: registra documentos pendientes nuevos y consulta los que ya toca. Nunca se solapa con otro ciclo del mismo proceso. */
  async ejecutarCiclo(ahora = new Date(), alcance: Alcance = {}) {
    if (this.enEjecucion) return { omitido: true as const, descubiertos: 0, procesados: 0 };
    this.enEjecucion = true;
    try {
      const descubiertos = await this.descubrir(ahora, alcance);
      const filas = await this.reclamar(ahora, alcance);
      for (let inicio = 0; inicio < filas.length; inicio += CONCURRENCIA) {
        await Promise.all(filas.slice(inicio, inicio + CONCURRENCIA).map((fila) => this.procesarFila(fila, new Date())));
      }
      return { omitido: false as const, descubiertos, procesados: filas.length };
    } finally {
      this.enEjecucion = false;
    }
  }

  // ---- Descubrimiento ----

  private async registrar(entidadTipo: EntidadSeguimiento, operacion: OperacionSeguimiento, items: { id: string; enVuelo?: boolean }[], ahora: Date) {
    if (!items.length) return 0;
    const { seguimientoNubefact, timeoutNubefactMs } = validarConfiguracionEntorno();
    const insertadas = await db.insert(nubefactSeguimientos).values(items.map((item) => ({
      entidadTipo, entidadId: item.id, operacion,
      proximoIntento: new Date(ahora.getTime() + retardoInicialSegundos(Boolean(item.enVuelo), timeoutNubefactMs, seguimientoNubefact.esperasSegundos) * 1000),
    }))).onConflictDoUpdate({
      target: [nubefactSeguimientos.entidadTipo, nubefactSeguimientos.entidadId, nubefactSeguimientos.operacion],
      // Un documento que vuelve a quedar pendiente (p. ej. reintento tras un rechazo) reinicia su seguimiento; los agotados no se reabren solos.
      set: { estado: "ACTIVO", intentos: 0, ultimoError: null, resueltoEn: null, creadoEn: ahora, proximoIntento: sql`excluded.proximo_intento` },
      setWhere: eq(nubefactSeguimientos.estado, "RESUELTO"),
    }).returning({ id: nubefactSeguimientos.id });
    return insertadas.length;
  }

  private sinSeguimientoVigente(entidadTipo: EntidadSeguimiento, operacion: OperacionSeguimiento, entidadId: AnyColumn) {
    return sql`not exists (select 1 from ${nubefactSeguimientos} s where s.entidad_tipo = ${entidadTipo} and s.entidad_id = ${entidadId} and s.operacion = ${operacion} and s.estado <> 'RESUELTO')`;
  }

  private archivosIncompletos(entidadTipo: EntidadSeguimiento, entidadId: AnyColumn, tipoComprobante: AnyColumn) {
    return sql`(select count(distinct a.tipo_archivo) from ${archivosLocales} a where a.entidad_tipo = ${entidadTipo} and a.entidad_id = ${entidadId}
      and a.tipo_archivo in (${tipoComprobante} || '_PDF', ${tipoComprobante} || '_XML', ${tipoComprobante} || '_CDR')) < 3`;
  }

  /** Registra en el seguimiento todo documento que sigue sin resultado final o sin sus archivos. Devuelve cuántos registró o reactivó. */
  async descubrir(ahora = new Date(), alcance: Alcance = {}) {
    const { horizonteHoras, lote } = validarConfiguracionEntorno().seguimientoNubefact;
    const desde = new Date(ahora.getTime() - horizonteHoras * 3_600_000);
    const limite = lote * 5;
    const ambito = (columna: AnyColumn) => (alcance.entidadIds ? inArray(columna, alcance.entidadIds) : undefined);
    const enEspera = (estado: string, datos: unknown, sinRespuestaCuentaComoEspera = false) => {
      const d = objeto(datos);
      const respuesta = objeto(objeto(d.consultaComprobante).respuesta ?? d.respuesta);
      if (estado === "NUBEFACT_PENDIENTE") return true;
      if (sinRespuestaCuentaComoEspera && !Object.keys(respuesta).length) return true;
      return ESTADOS_EN_ESPERA.includes(analizarEstadoComprobante(estado, d, respuesta).estadoProveedor);
    };
    let total = 0;

    // Emisión de boletas y facturas.
    const ventas = await db.select({ id: ingresos.id, estado: ingresos.estado, datos: ingresos.datosNubefact }).from(ingresos).where(and(
      inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA"]), inArray(ingresos.estado, ["NUBEFACT_PENDIENTE", "ERROR_NUBEFACT"]),
      gte(ingresos.creadoEn, desde), sql`${ingresos.datosNubefact}->'solicitud'->>'serie' is not null`, this.sinSeguimientoVigente("INGRESO", "EMISION", ingresos.id), ambito(ingresos.id),
    )).limit(1000);
    total += await this.registrar("INGRESO", "EMISION", ventas.filter((venta) => enEspera(venta.estado, venta.datos)).map((venta) => ({ id: venta.id, enVuelo: venta.estado === "NUBEFACT_PENDIENTE" })), ahora);

    // Notas de crédito y débito, incluidas las dadas por emitidas (con PDF) que SUNAT todavía no aceptó.
    const notas = await db.select({ id: comprobantesRelacionados.id, estado: comprobantesRelacionados.estado, datos: comprobantesRelacionados.datosNubefact }).from(comprobantesRelacionados).where(and(
      or(inArray(comprobantesRelacionados.estado, ["NUBEFACT_PENDIENTE", "ERROR_NUBEFACT"]), and(eq(comprobantesRelacionados.estado, "EMITIDO"), sinAceptacionNota)), gte(comprobantesRelacionados.creadoEn, desde),
      this.sinSeguimientoVigente("COMPROBANTE_RELACIONADO", "EMISION", comprobantesRelacionados.id), ambito(comprobantesRelacionados.id),
    )).limit(1000);
    total += await this.registrar("COMPROBANTE_RELACIONADO", "EMISION", notas.filter((nota) => nota.estado === "EMITIDO" || enEspera(nota.estado, nota.datos, true)).map((nota) => ({ id: nota.id, enVuelo: nota.estado === "NUBEFACT_PENDIENTE" })), ahora);

    // Guías de remisión.
    const guias = await db.select({ id: guiasRemision.id, estado: guiasRemision.estado }).from(guiasRemision).where(and(
      inArray(guiasRemision.estado, ["NUBEFACT_PENDIENTE", "PENDIENTE_SUNAT"]), gte(guiasRemision.creadoEn, desde), this.sinSeguimientoVigente("GUIA_REMISION", "EMISION", guiasRemision.id), ambito(guiasRemision.id),
    )).limit(limite);
    total += await this.registrar("GUIA_REMISION", "EMISION", guias.map((guia) => ({ id: guia.id, enVuelo: guia.estado === "NUBEFACT_PENDIENTE" })), ahora);

    // Bajas (anulaciones) pendientes: no dependen de la antigüedad del documento original.
    const bajasVentas = await db.select({ id: ingresos.id }).from(ingresos).where(and(
      sql`${ingresos.datosNubefact}->'anulacion'->>'estado' = 'PENDIENTE'`, this.sinSeguimientoVigente("INGRESO", "ANULACION", ingresos.id), ambito(ingresos.id),
    )).limit(limite);
    total += await this.registrar("INGRESO", "ANULACION", bajasVentas, ahora);
    const bajasNotas = await db.select({ id: comprobantesRelacionados.id }).from(comprobantesRelacionados).where(and(
      sql`${comprobantesRelacionados.datosNubefact}->'anulacion'->>'estado' = 'PENDIENTE'`, this.sinSeguimientoVigente("COMPROBANTE_RELACIONADO", "ANULACION", comprobantesRelacionados.id), ambito(comprobantesRelacionados.id),
    )).limit(limite);
    total += await this.registrar("COMPROBANTE_RELACIONADO", "ANULACION", bajasNotas, ahora);

    // Documentos aceptados a los que aún les faltan PDF/XML/CDR locales.
    const ventasSinArchivos = await db.select({ id: ingresos.id }).from(ingresos).where(and(
      inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA"]), eq(ingresos.estado, "EMITIDO"), gte(ingresos.creadoEn, desde),
      sql`${ingresos.datosNubefact}->'solicitud'->>'serie' is not null`, sql`coalesce(${ingresos.datosNubefact}->'anulacion'->>'estado', '') <> 'ANULADO'`,
      this.archivosIncompletos("INGRESO", ingresos.id, ingresos.tipoComprobante), this.sinSeguimientoVigente("INGRESO", "ARCHIVOS", ingresos.id), ambito(ingresos.id),
    )).limit(limite);
    total += await this.registrar("INGRESO", "ARCHIVOS", ventasSinArchivos, ahora);
    const notasSinArchivos = await db.select({ id: comprobantesRelacionados.id }).from(comprobantesRelacionados).where(and(
      eq(comprobantesRelacionados.estado, "EMITIDO"), gte(comprobantesRelacionados.creadoEn, desde),
      this.archivosIncompletos("COMPROBANTE_RELACIONADO", comprobantesRelacionados.id, comprobantesRelacionados.tipoComprobante),
      this.sinSeguimientoVigente("COMPROBANTE_RELACIONADO", "ARCHIVOS", comprobantesRelacionados.id), ambito(comprobantesRelacionados.id),
    )).limit(limite);
    total += await this.registrar("COMPROBANTE_RELACIONADO", "ARCHIVOS", notasSinArchivos, ahora);
    return total;
  }

  // ---- Reclamo (multi-instancia) ----

  /** Toma las filas vencidas con FOR UPDATE SKIP LOCKED y les fija un arrendamiento: otra instancia no las toma mientras se procesan. */
  async reclamar(ahora = new Date(), alcance: Alcance = {}) {
    const { lote } = validarConfiguracionEntorno().seguimientoNubefact;
    return db.transaction(async (tx) => {
      const vencidas = await tx.select({ id: nubefactSeguimientos.id }).from(nubefactSeguimientos)
        .where(and(eq(nubefactSeguimientos.estado, "ACTIVO"), alcance.entidadIds ? inArray(nubefactSeguimientos.entidadId, alcance.entidadIds) : undefined, sql`${nubefactSeguimientos.proximoIntento} <= ${ahora.toISOString()}::timestamptz`))
        .orderBy(nubefactSeguimientos.proximoIntento).limit(lote).for("update", { skipLocked: true });
      if (!vencidas.length) return [] as FilaSeguimiento[];
      return tx.update(nubefactSeguimientos).set({ proximoIntento: new Date(ahora.getTime() + ARRENDAMIENTO_MS), ultimoIntento: ahora })
        .where(inArray(nubefactSeguimientos.id, vencidas.map((fila) => fila.id))).returning();
    });
  }

  // ---- Procesamiento ----

  private async procesarFila(fila: FilaSeguimiento, ahora: Date) {
    let resultado: ResultadoSeguimiento | { tipo: "FALLO"; mensaje: string };
    try {
      resultado = await this.consultar(fila);
    } catch (error) {
      resultado = { tipo: "FALLO", mensaje: error instanceof Error ? error.message : "No se pudo consultar NubeFact." };
    }
    const { horizonteHoras, esperasSegundos } = validarConfiguracionEntorno().seguimientoNubefact;
    const transicion = transicionarSeguimiento({ intentos: fila.intentos, creadoEn: fila.creadoEn, ahora, horizonteHoras, esperas: esperasSegundos, resultado });
    await db.update(nubefactSeguimientos).set({
      estado: transicion.estado, intentos: transicion.intentos, ultimoError: transicion.ultimoError, resueltoEn: transicion.resueltoEn, ultimoIntento: ahora,
      ...(transicion.proximoIntento ? { proximoIntento: transicion.proximoIntento } : {}),
    }).where(eq(nubefactSeguimientos.id, fila.id));
    if (transicion.estado === "AGOTADO") {
      this.registro.warn(`Seguimiento NubeFact agotado para ${fila.entidadTipo} ${fila.entidadId} (${fila.operacion}); requiere atención manual.`);
    }
  }

  private async consultar(fila: FilaSeguimiento): Promise<ResultadoSeguimiento> {
    try {
      if (fila.operacion === "ARCHIVOS") return await this.refrescarArchivos(fila);
      if (fila.entidadTipo === "GUIA_REMISION") return await this.consultarGuia(fila.entidadId);
      if (fila.operacion === "ANULACION") return await this.consultarBaja(fila);
      return fila.entidadTipo === "INGRESO" ? await this.consultarVenta(fila.entidadId) : await this.consultarNota(fila.entidadId);
    } catch (error) {
      // El documento ya no admite consulta (alguien lo resolvió a mano) o desapareció: no hay nada más que seguir.
      if (error instanceof ConflictException || error instanceof NotFoundException) return { tipo: "RESUELTO" };
      if (error instanceof BadRequestException || error instanceof ErrorRedNubefact) throw new Error(error.message);
      throw error;
    }
  }

  private async consultarVenta(id: string): Promise<ResultadoSeguimiento> {
    const resultado = await this.ingresosServicio.consultarEstadoComprobante(id);
    return ["ACEPTADO_SUNAT", "RECHAZADO_SUNAT"].includes(resultado.estadoProveedor)
      ? { tipo: "RESUELTO" } : { tipo: "PENDIENTE", detalle: resultado.detalleProveedor };
  }

  private async consultarBaja(fila: FilaSeguimiento): Promise<ResultadoSeguimiento> {
    if (fila.entidadTipo === "INGRESO") {
      const [venta] = await db.select({ datos: ingresos.datosNubefact, usuarioId: ingresos.usuarioId }).from(ingresos).where(eq(ingresos.id, fila.entidadId)).limit(1);
      if (!venta) throw new NotFoundException();
      const anulacion = objeto(objeto(venta.datos).anulacion);
      if (anulacion.estado !== "PENDIENTE") return { tipo: "RESUELTO" };
      const usuarioId = typeof anulacion.usuarioId === "string" ? anulacion.usuarioId : venta.usuarioId;
      return this.resultadoBaja(await this.ingresosServicio.consultarAnulacionIngreso(fila.entidadId, usuarioId, true));
    }
    const [nota] = await db.select({ origen: comprobantesRelacionados.ingresoOrigenId, datos: comprobantesRelacionados.datosNubefact }).from(comprobantesRelacionados).where(eq(comprobantesRelacionados.id, fila.entidadId)).limit(1);
    if (!nota) throw new NotFoundException();
    if (objeto(objeto(nota.datos).anulacion).estado !== "PENDIENTE") return { tipo: "RESUELTO" };
    return this.resultadoBaja(await this.ingresosServicio.consultarAnulacionNota(nota.origen, fila.entidadId, true));
  }

  private resultadoBaja(resultado: { estado: unknown; detalle?: unknown; mensaje?: unknown }): ResultadoSeguimiento {
    if (resultado.estado === "ANULADO" || resultado.estado === "RECHAZADO") return { tipo: "RESUELTO" };
    return { tipo: "PENDIENTE", detalle: typeof resultado.mensaje === "string" ? resultado.mensaje : typeof resultado.detalle === "string" ? resultado.detalle : null };
  }

  private async consultaComprobante(tipo: TipoDocumento, serie: string, numero: number) {
    const solicitud = solicitudConsultaComprobante(tipo, serie, numero);
    const respuesta = await enviarANubefact(solicitud, { timeoutMs: TIEMPO_CONSULTA_MS });
    if (!respuesta.ok) throw new Error(`NubeFact respondió con HTTP ${respuesta.status} al consultar el comprobante.`);
    if (!respuesta.cuerpo) throw new Error("NubeFact devolvió una respuesta que no se pudo interpretar.");
    return { cuerpo: respuesta.cuerpo, consulta: { solicitud, respuesta: respuesta.cuerpo, respuestaHttp: respuesta.status, consultadoEn: new Date().toISOString() } };
  }

  private async consultarNota(id: string): Promise<ResultadoSeguimiento> {
    const [nota] = await db.select().from(comprobantesRelacionados).where(eq(comprobantesRelacionados.id, id)).limit(1);
    if (!nota) throw new NotFoundException();
    const sinConfirmar = nota.estado === "EMITIDO" && !aceptadaPorSunat(nota.datosNubefact);
    if (!sinConfirmar && !["NUBEFACT_PENDIENTE", "ERROR_NUBEFACT"].includes(nota.estado)) return { tipo: "RESUELTO" };
    const { cuerpo, consulta } = await this.consultaComprobante(nota.tipoComprobante as TipoDocumento, nota.serie, nota.numero);
    const analisis = analizarEstadoComprobante(nota.estado, { ...objeto(nota.datosNubefact), consultaComprobante: consulta }, cuerpo);
    if (analisis.estadoProveedor === "ACEPTADO_SUNAT") {
      await db.update(comprobantesRelacionados).set({ estado: "EMITIDO", datosNubefact: fusionarDatos(comprobantesRelacionados.datosNubefact, { respuesta: cuerpo, consultaComprobante: consulta }) }).where(eq(comprobantesRelacionados.id, id));
      await this.recuperarMotivo(nota);
      return { tipo: "RESUELTO" };
    }
    const rechazada = analisis.estadoProveedor === "RECHAZADO_SUNAT";
    await db.update(comprobantesRelacionados).set({
      ...(rechazada ? { estado: "ERROR_NUBEFACT" } : {}),
      // Un resultado no concluyente se guarda aparte: `consultaComprobante` indica a las notas y cobros que ya se conoce su resultado.
      datosNubefact: fusionarDatos(comprobantesRelacionados.datosNubefact, rechazada ? { respuesta: cuerpo, consultaComprobante: consulta } : { ultimaConsulta: consulta }),
    }).where(eq(comprobantesRelacionados.id, id));
    return rechazada ? { tipo: "RESUELTO" } : { tipo: "PENDIENTE", detalle: analisis.detalleProveedor };
  }

  /** Una nota apartada como fallida (motivo liberado) que SUNAT sí aceptó recupera su motivo, salvo que ya exista otra vigente igual. */
  private async recuperarMotivo(nota: typeof comprobantesRelacionados.$inferSelect) {
    if (nota.codigoMotivo !== CODIGO_MOTIVO_NOTA_LIBERADA) return;
    const solicitud = objeto(objeto(nota.datosNubefact).solicitud);
    const original = Number(nota.tipoComprobante === "NOTA_CREDITO" ? solicitud.tipo_de_nota_de_credito : solicitud.tipo_de_nota_de_debito);
    if (!Number.isInteger(original) || original <= 0 || original === CODIGO_MOTIVO_NOTA_LIBERADA) return;
    try { await db.update(comprobantesRelacionados).set({ codigoMotivo: original }).where(eq(comprobantesRelacionados.id, nota.id)); }
    catch { this.registro.warn(`La nota ${nota.id} fue aceptada por SUNAT y existe otra vigente con el mismo motivo; revísala manualmente.`); }
  }

  private async consultarGuia(id: string): Promise<ResultadoSeguimiento> {
    const [guia] = await db.select().from(guiasRemision).where(eq(guiasRemision.id, id)).limit(1);
    if (!guia) throw new NotFoundException();
    if (!["NUBEFACT_PENDIENTE", "PENDIENTE_SUNAT"].includes(guia.estado)) return { tipo: "RESUELTO" };
    const solicitud = { operacion: "consultar_guia", tipo_de_comprobante: guia.tipo === "REMITENTE" ? 7 : 8, serie: guia.serie, numero: guia.numero };
    const respuesta = await enviarANubefact(solicitud, { timeoutMs: TIEMPO_CONSULTA_MS });
    // A diferencia de la consulta manual, un fallo HTTP o una respuesta ilegible no degrada el estado: la guía sigue pendiente y se reintenta.
    if (!respuesta.ok) throw new Error(`NubeFact respondió con HTTP ${respuesta.status} al consultar la guía.`);
    if (!respuesta.cuerpo) throw new Error("NubeFact devolvió una respuesta que no se pudo interpretar.");
    const cuerpo = respuesta.cuerpo;
    const estado = cuerpo.aceptada_por_sunat === true ? "EMITIDO" : cuerpo.aceptada_por_sunat === false && cuerpo.sunat_soap_error ? "RECHAZADO_SUNAT" : "PENDIENTE_SUNAT";
    await db.update(guiasRemision).set({ estado, datosNubefact: fusionarDatos(guiasRemision.datosNubefact, { consulta: solicitud, respuesta: cuerpo }) }).where(eq(guiasRemision.id, id));
    return estado === "PENDIENTE_SUNAT" ? { tipo: "PENDIENTE", detalle: typeof cuerpo.sunat_description === "string" ? cuerpo.sunat_description : null } : { tipo: "RESUELTO" };
  }

  private async cargarEmitido(fila: FilaSeguimiento) {
    if (fila.entidadTipo === "INGRESO") {
      const [venta] = await db.select({ tipo: ingresos.tipoComprobante, estado: ingresos.estado, datos: ingresos.datosNubefact }).from(ingresos).where(eq(ingresos.id, fila.entidadId)).limit(1);
      if (!venta) return null;
      const datos = objeto(venta.datos);
      const solicitud = objeto(datos.solicitud);
      return { tipo: venta.tipo as TipoDocumento, estado: venta.estado, serie: typeof solicitud.serie === "string" ? solicitud.serie : "", numero: Number(solicitud.numero ?? datos.numero) };
    }
    const [nota] = await db.select({ tipo: comprobantesRelacionados.tipoComprobante, estado: comprobantesRelacionados.estado, serie: comprobantesRelacionados.serie, numero: comprobantesRelacionados.numero })
      .from(comprobantesRelacionados).where(eq(comprobantesRelacionados.id, fila.entidadId)).limit(1);
    return nota ? { ...nota, tipo: nota.tipo as TipoDocumento } : null;
  }

  /** Vuelve a consultar un documento ya aceptado para descargar los archivos que NubeFact publica con retraso (p. ej. el CDR). */
  private async refrescarArchivos(fila: FilaSeguimiento): Promise<ResultadoSeguimiento> {
    const documento = await this.cargarEmitido(fila);
    if (!documento || documento.estado !== "EMITIDO" || !documento.serie || !Number.isInteger(documento.numero) || documento.numero < 1) return { tipo: "RESUELTO" };
    const { tipo, serie, numero } = documento;
    const { cuerpo, consulta } = await this.consultaComprobante(tipo, serie, numero);
    const archivos = await this.archivar(fila.entidadTipo, fila.entidadId, tipo, formatoCodigo(serie, numero), cuerpo);
    const parche: Registro = {
      ...(cuerpo.aceptada_por_sunat === true ? { consultaComprobante: consulta } : {}),
      ...(archivos.guardados.length ? { archivos } : {}),
    };
    if (Object.keys(parche).length) {
      if (fila.entidadTipo === "INGRESO") await db.update(ingresos).set({ datosNubefact: fusionarDatos(ingresos.datosNubefact, parche) }).where(eq(ingresos.id, fila.entidadId));
      else await db.update(comprobantesRelacionados).set({ datosNubefact: fusionarDatos(comprobantesRelacionados.datosNubefact, parche) }).where(eq(comprobantesRelacionados.id, fila.entidadId));
    }
    const locales = await db.select({ tipo: archivosLocales.tipoArchivo }).from(archivosLocales).where(and(
      eq(archivosLocales.entidadTipo, fila.entidadTipo), eq(archivosLocales.entidadId, fila.entidadId), inArray(archivosLocales.tipoArchivo, TIPOS_ARCHIVO.map((sufijo) => `${tipo}_${sufijo}`)),
    ));
    const presentes = new Set(locales.map((local) => local.tipo));
    if (presentes.size >= TIPOS_ARCHIVO.length) return { tipo: "RESUELTO" };
    const faltantes = TIPOS_ARCHIVO.filter((sufijo) => !presentes.has(`${tipo}_${sufijo}`));
    return { tipo: "PENDIENTE", detalle: archivos.errores[0]?.mensaje ?? `Aún faltan archivos de NubeFact: ${faltantes.join(", ")}.` };
  }

  private async archivar(entidadTipo: string, entidadId: string, tipo: string, codigo: string, cuerpo: CuerpoNubefact) {
    try { return await this.almacenamiento.archivarDocumentosNubeFact(entidadTipo, entidadId, tipo, codigo, cuerpo); }
    catch (causa) { return { guardados: [], errores: [{ tipo: "GENERAL", mensaje: causa instanceof Error ? causa.message : "No se pudieron archivar los documentos de NubeFact." }] }; }
  }
}
