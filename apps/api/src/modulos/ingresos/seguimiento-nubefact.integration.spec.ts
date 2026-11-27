import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { ServicioAlmacenamiento } from "../almacenamiento/almacenamiento.service";
import { ServicioIngresos } from "./ingresos.service";
import { ServicioSeguimientoNubefact } from "./seguimiento-nubefact.service";

/* Seguimiento automático contra PostgreSQL real (magina_test desechable). NubeFact se simula: nada sale a la red. */

const url = new URL(process.env.DATABASE_URL ?? "");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(url.pathname, "/magina_test");
assert.equal(process.env.NUBEFACT_RUTA, "https://example.invalid/api");

type Paquete = typeof import("@magina/database");
let paquete: Paquete;

const almacenamiento = new ServicioAlmacenamiento();
const servicio = new ServicioIngresos(almacenamiento);
const crearSeguimiento = () => new ServicioSeguimientoNubefact(servicio, almacenamiento);

const fetchOriginal = globalThis.fetch;
let consultas: Record<string, unknown>[] = [];
function simular(responder: (cuerpo: Record<string, unknown>) => Response | Promise<Response>, descarga: (ruta: string) => Response = () => new Response("contenido")) {
  consultas = [];
  globalThis.fetch = (async (entrada: URL | RequestInfo, init?: RequestInit) => {
    const ruta = String(entrada);
    assert.ok(ruta.startsWith("https://example.invalid/"), `Llamada de red no simulada: ${ruta}`);
    if (ruta !== "https://example.invalid/api") return descarga(ruta);
    const cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
    consultas.push(cuerpo);
    return responder(cuerpo);
  }) as typeof fetch;
}
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });
const sinRed = (): Response => { throw new TypeError("fetch failed"); };
const enlaces = (cdr = true) => ({ enlace_del_pdf: "https://example.invalid/d.pdf", enlace_del_xml: "https://example.invalid/d.xml", ...(cdr ? { enlace_del_cdr: "https://example.invalid/d.zip" } : {}) });
const aceptada = (cdr = true) => json({ aceptada_por_sunat: true, ...enlaces(cdr) });
const rechazo = () => json({ aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "El documento no coincide" });

const hoy = fechaActualPeru();
const ids: string[] = [];
const ventas: string[] = [];
const notas: string[] = [];
const guias: string[] = [];
let usuarioId: string;
let personaId: string;
let serieCreada = false;
const numero = () => 100_000 + Math.floor(Math.random() * 800_000);
const despues = (segundos: number) => new Date(Date.now() + segundos * 1000);

async function venta(valores: Record<string, unknown> = {}) {
  const id = randomUUID();
  await paquete.db.insert(paquete.ingresos).values({ id, codigo: `QAS-${id}`, fecha: hoy, tipoComprobante: "BOLETA", medioPago: "EFECTIVO", subtotal: "10.00", igv: "0.00", total: "10.00", estado: "NUBEFACT_PENDIENTE", usuarioId,
    datosNubefact: { solicitud: { serie: "BSG1", numero: numero() } }, ...valores });
  ids.push(id); ventas.push(id);
  return id;
}
async function nota(origen: string, valores: Record<string, unknown> = {}) {
  const id = randomUUID();
  await paquete.db.insert(paquete.comprobantesRelacionados).values({ id, ingresoOrigenId: origen, tipoComprobante: "NOTA_CREDITO", codigoMotivo: 1, motivo: "Prueba", fecha: hoy, serie: "BSG2", numero: numero(),
    subtotal: "1.00", igv: "0.00", total: "1.00", estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { tipo_de_nota_de_credito: 1 } }, usuarioId, ...valores });
  ids.push(id); notas.push(id);
  return id;
}
async function guia(estado = "PENDIENTE_SUNAT") {
  const id = randomUUID();
  await paquete.db.insert(paquete.guiasRemision).values({ id, tipo: "REMITENTE", fecha: hoy, serie: "TSG1", numero: numero(), estado, datosNubefact: { solicitud: {} }, usuarioId });
  ids.push(id); guias.push(id);
  return id;
}
const leerVenta = async (id: string) => {
  const [fila] = await paquete.db.select().from(paquete.ingresos).where(eq(paquete.ingresos.id, id));
  return { ...fila, datos: (fila.datosNubefact ?? {}) as Record<string, any> };
};
const leerNota = async (id: string) => (await paquete.db.select().from(paquete.comprobantesRelacionados).where(eq(paquete.comprobantesRelacionados.id, id)))[0];
const leerGuia = async (id: string) => (await paquete.db.select().from(paquete.guiasRemision).where(eq(paquete.guiasRemision.id, id)))[0];
const seguimientos = (id: string) => paquete.db.select().from(paquete.nubefactSeguimientos).where(eq(paquete.nubefactSeguimientos.entidadId, id));
const seguimiento = async (id: string, operacion = "EMISION") => (await seguimientos(id)).find((fila) => fila.operacion === operacion)!;
const archivos = async (id: string) => (await paquete.db.select().from(paquete.archivosLocales).where(eq(paquete.archivosLocales.entidadId, id))).map((fila) => fila.tipoArchivo).sort();
/** Descubre el documento y ejecuta el ciclo cuando su siguiente intento ya venció. */
async function ciclo(id: string, segundos = 3600) {
  const trabajador = crearSeguimiento();
  await trabajador.descubrir(new Date(), { entidadIds: [id] });
  return trabajador.ejecutarCiclo(despues(segundos), { entidadIds: [id] });
}

before(async () => {
  paquete = await import("@magina/database");
  const { db } = paquete;
  const tipoPersona = (await db.select().from(paquete.tiposPersona)).find((fila) => fila.codigo === "NATURAL")!;
  const tipoDocumento = (await db.select().from(paquete.tiposDocumento)).find((fila) => fila.codigo === "01")!;
  const sufijo = randomUUID().replaceAll("-", "").slice(0, 10);
  const [persona] = await db.insert(paquete.personas).values({ tipoPersonaId: tipoPersona.id, tipoDocumentoId: tipoDocumento.id, numeroDocumento: String(BigInt(`0x${sufijo}`) % 100_000_000n).padStart(8, "0"), nombres: `Seguimiento${sufijo}`, apellidoPaterno: "QA" }).returning({ id: paquete.personas.id });
  personaId = persona.id;
  await db.insert(paquete.trabajadores).values({ personaId, fechaIngreso: hoy });
  const [usuario] = await db.insert(paquete.usuarios).values({ trabajadorId: personaId, nombreUsuario: `qa_seg_${sufijo}`, correo: `qa-seg-${sufijo}@example.invalid`, contrasenaHash: "hash-ficticio" }).returning({ id: paquete.usuarios.id });
  usuarioId = usuario.id;
});

beforeEach(() => { process.env.NUBEFACT_CONSULTA_INMEDIATA_ESPERAS_MS = "1,1"; });
afterEach(() => {
  globalThis.fetch = fetchOriginal;
  delete process.env.NUBEFACT_CONSULTA_INMEDIATA_ESPERAS_MS;
});

after(async () => {
  const { db } = paquete;
  if (ids.length) {
    await db.delete(paquete.nubefactSeguimientos).where(inArray(paquete.nubefactSeguimientos.entidadId, ids));
    await db.delete(paquete.archivosLocales).where(inArray(paquete.archivosLocales.entidadId, ids));
  }
  if (guias.length) await db.delete(paquete.guiasRemision).where(inArray(paquete.guiasRemision.id, guias));
  if (notas.length) await db.delete(paquete.comprobantesRelacionados).where(inArray(paquete.comprobantesRelacionados.id, notas));
  if (ventas.length) await db.delete(paquete.ingresos).where(inArray(paquete.ingresos.id, ventas));
  if (serieCreada) await db.delete(paquete.seriesComprobantes).where(eq(paquete.seriesComprobantes.serie, "BSG9"));
  await db.delete(paquete.usuarios).where(eq(paquete.usuarios.id, usuarioId));
  await db.delete(paquete.trabajadores).where(eq(paquete.trabajadores.personaId, personaId));
  await db.delete(paquete.personas).where(eq(paquete.personas.id, personaId));
  await paquete.cerrarBaseDatos();
});

describe("seguimiento automático de boletas y facturas", () => {
  test("una boleta pendiente pasa a emitida sin intervención y archiva PDF, XML y CDR", async () => {
    const id = await venta();
    simular(() => aceptada());
    const trabajador = crearSeguimiento();
    assert.equal(await trabajador.descubrir(new Date(), { entidadIds: [id] }), 1);
    assert.equal((await trabajador.ejecutarCiclo(new Date(), { entidadIds: [id] })).procesados, 0, "Un envío en vuelo no se consulta de inmediato.");
    assert.equal((await trabajador.ejecutarCiclo(despues(60), { entidadIds: [id] })).procesados, 1);
    assert.equal((await leerVenta(id)).estado, "EMITIDO");
    assert.deepEqual(await archivos(id), ["BOLETA_CDR", "BOLETA_PDF", "BOLETA_XML"]);
    const fila = await seguimiento(id);
    assert.deepEqual([fila.estado, fila.intentos, fila.ultimoError], ["RESUELTO", 1, null]);
    assert.equal(await trabajador.descubrir(new Date(), { entidadIds: [id] }), 0);
    // Si vuelve a quedar pendiente (reintento), el seguimiento se reactiva con un horizonte nuevo.
    await paquete.db.update(paquete.nubefactSeguimientos).set({ creadoEn: despues(-100 * 3600) }).where(eq(paquete.nubefactSeguimientos.entidadId, id));
    await paquete.db.update(paquete.ingresos).set({ estado: "NUBEFACT_PENDIENTE" }).where(eq(paquete.ingresos.id, id));
    assert.equal(await trabajador.descubrir(new Date(), { entidadIds: [id] }), 1);
    const reactivada = await seguimiento(id);
    assert.deepEqual([reactivada.estado, reactivada.intentos], ["ACTIVO", 0]);
    assert.ok(Date.now() - reactivada.creadoEn.getTime() < 60_000);
  });

  test("un rechazo de SUNAT se aplica tanto a envíos sin respuesta como a respuestas en proceso", async () => {
    for (const valores of [{}, { estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: "BSG1", numero: numero() }, respuesta: { aceptada_por_sunat: false } } }]) {
      const id = await venta(valores);
      simular(rechazo);
      await ciclo(id);
      const guardada = await leerVenta(id);
      assert.equal(guardada.estado, "ERROR_NUBEFACT");
      assert.equal(guardada.datos.consultaComprobante.respuesta.sunat_responsecode, "2335");
      assert.equal((await seguimiento(id)).estado, "RESUELTO");
      assert.equal((await ciclo(id)).procesados, 0);
    }
  });

  test("los fallos de consulta se reintentan con espera creciente sin cambiar el documento", async () => {
    const id = await venta();
    for (const [respuesta, error] of [[sinRed, /No se pudo consultar/], [() => json({}, 500), /HTTP 500/], [() => json({ aceptada_por_sunat: false }), /confirma|SUNAT|NubeFact/]] as const) {
      simular(respuesta);
      await ciclo(id);
      const fila = await seguimiento(id);
      assert.equal(fila.estado, "ACTIVO");
      assert.match(fila.ultimoError ?? "", error);
      assert.ok(fila.proximoIntento.getTime() > Date.now());
    }
    assert.equal((await seguimiento(id)).intentos, 3);
    assert.equal((await leerVenta(id)).estado, "NUBEFACT_PENDIENTE");
  });

  test("al agotar el horizonte queda marcado para atención manual y no se reabre", async () => {
    const id = await venta();
    simular(() => json({ aceptada_por_sunat: false }));
    const trabajador = crearSeguimiento();
    await trabajador.descubrir(new Date(), { entidadIds: [id] });
    await paquete.db.update(paquete.nubefactSeguimientos).set({ creadoEn: despues(-49 * 3600) }).where(eq(paquete.nubefactSeguimientos.entidadId, id));
    await trabajador.ejecutarCiclo(despues(60), { entidadIds: [id] });
    assert.equal((await seguimiento(id)).estado, "AGOTADO");
    assert.equal((await ciclo(id)).procesados, 0);
    assert.equal((await seguimiento(id)).estado, "AGOTADO");
  });

  test("los archivos que faltan se descargan después sin duplicar los existentes", async () => {
    const id = await venta();
    simular(() => aceptada(false));
    await ciclo(id);
    assert.deepEqual(await archivos(id), ["BOLETA_PDF", "BOLETA_XML"]);
    await ciclo(id);
    let fila = await seguimiento(id, "ARCHIVOS");
    assert.equal(fila.estado, "ACTIVO");
    assert.match(fila.ultimoError ?? "", /Aún faltan archivos de NubeFact: CDR/);
    simular(() => aceptada(), () => new Response("", { status: 404 }));
    await ciclo(id, 7200);
    assert.match((await seguimiento(id, "ARCHIVOS")).ultimoError ?? "", /respondió 404/);
    simular(() => aceptada());
    await ciclo(id, 14_400);
    fila = await seguimiento(id, "ARCHIVOS");
    assert.equal(fila.estado, "RESUELTO");
    assert.deepEqual(await archivos(id), ["BOLETA_CDR", "BOLETA_PDF", "BOLETA_XML"]);
    assert.equal((await leerVenta(id)).datos.archivos.guardados.length, 3);
  });

  test("dos instancias no consultan dos veces el mismo documento", async () => {
    const id = await venta();
    simular(async () => { await new Promise((resolver) => setTimeout(resolver, 50)); return json({ aceptada_por_sunat: false }); });
    await crearSeguimiento().descubrir(new Date(), { entidadIds: [id] });
    const resultados = await Promise.all([1, 2].map(() => crearSeguimiento().ejecutarCiclo(despues(60), { entidadIds: [id] })));
    assert.equal(resultados.reduce((total, resultado) => total + resultado.procesados, 0), 1);
    assert.equal(consultas.length, 1);

    // Una fila bloqueada por otra transacción se salta en lugar de esperar.
    await paquete.db.transaction(async (tx) => {
      await tx.select().from(paquete.nubefactSeguimientos).where(eq(paquete.nubefactSeguimientos.entidadId, id)).for("update");
      assert.deepEqual(await crearSeguimiento().reclamar(despues(7200), { entidadIds: [id] }), []);
    });

    const trabajador = crearSeguimiento();
    const [primero, segundo] = await Promise.all([trabajador.ejecutarCiclo(despues(7200), { entidadIds: [id] }), trabajador.ejecutarCiclo(despues(7200), { entidadIds: [id] })]);
    assert.deepEqual([primero.omitido, segundo.omitido], [false, true]);
  });

  test("un documento resuelto a mano o inexistente cierra su seguimiento", async () => {
    const id = await venta();
    simular(sinRed);
    const trabajador = crearSeguimiento();
    await trabajador.descubrir(new Date(), { entidadIds: [id] });
    await paquete.db.update(paquete.ingresos).set({ estado: "EMITIDO", datosNubefact: { solicitud: { serie: "BSG1", numero: 1 }, respuesta: { aceptada_por_sunat: true } } }).where(eq(paquete.ingresos.id, id));
    const huerfano = randomUUID(); ids.push(huerfano);
    await paquete.db.insert(paquete.nubefactSeguimientos).values([
      { entidadTipo: "INGRESO", entidadId: huerfano, operacion: "EMISION", proximoIntento: new Date() },
      { entidadTipo: "INGRESO", entidadId: huerfano, operacion: "ANULACION", proximoIntento: new Date() },
      { entidadTipo: "INGRESO", entidadId: huerfano, operacion: "ARCHIVOS", proximoIntento: new Date() },
      { entidadTipo: "COMPROBANTE_RELACIONADO", entidadId: huerfano, operacion: "EMISION", proximoIntento: new Date() },
      { entidadTipo: "COMPROBANTE_RELACIONADO", entidadId: huerfano, operacion: "ANULACION", proximoIntento: new Date() },
      { entidadTipo: "GUIA_REMISION", entidadId: huerfano, operacion: "EMISION", proximoIntento: new Date() },
    ]);
    await trabajador.ejecutarCiclo(despues(60), { entidadIds: [id, huerfano] });
    for (const fila of [await seguimiento(id), ...await seguimientos(huerfano)]) assert.equal(fila.estado, "RESUELTO");
    assert.equal(consultas.length, 0);
  });

  test("tras emitir, las consultas inmediatas resuelven una respuesta aún no aceptada", async () => {
    const { db, seriesComprobantes } = paquete;
    if (!(await servicio.estadoNubefact()).emisionHabilitada) {
      await servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: "BSG9", ultimoNumero: 0 });
      serieCreada = Boolean((await db.select().from(seriesComprobantes).where(eq(seriesComprobantes.serie, "BSG9"))).length);
    }
    const rechazada = () => venta({ estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: "BSG1", numero: numero() }, respuesta: { aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "El documento no coincide" } } });

    const resuelta = await rechazada();
    simular((cuerpo) => cuerpo.operacion === "consultar_comprobante" ? aceptada() : json({ aceptada_por_sunat: false, ...enlaces(false) }));
    assert.equal((await servicio.reintentarEmision(resuelta)).estado, "EMITIDO");
    assert.equal((await leerVenta(resuelta)).estado, "EMITIDO");
    assert.equal(consultas.length, 2);

    const enEspera = await rechazada();
    simular(() => json({ aceptada_por_sunat: false, ...enlaces(false) }));
    assert.equal((await servicio.reintentarEmision(enEspera)).estado, "PENDIENTE");
    assert.equal(consultas.length, 3);
    simular(() => aceptada());
    await ciclo(enEspera);
    assert.equal((await leerVenta(enEspera)).estado, "EMITIDO");
  });
});

describe("notas, bajas y guías", () => {
  test("una nota sin respuesta se confirma y recupera su motivo liberado", async () => {
    const origen = await venta({ estado: "REGISTRADO", tipoComprobante: "NOTA_VENTA" });
    const id = await nota(origen, { codigoMotivo: 13, subtotal: "0.00", total: "0.00" });
    simular(() => json({}, 500));
    await ciclo(id);
    assert.equal((await seguimiento(id)).estado, "ACTIVO");
    simular(() => new Response("<html>"));
    await ciclo(id, 7200);
    assert.match((await seguimiento(id)).ultimoError ?? "", /no se pudo interpretar/);
    simular(() => json({ aceptada_por_sunat: false }));
    await ciclo(id, 14_400);
    const pendiente = await leerNota(id);
    assert.equal(pendiente.estado, "ERROR_NUBEFACT");
    assert.equal(pendiente.datosNubefact?.consultaComprobante, undefined, "Una consulta no concluyente no da por conocido el resultado.");
    simular(() => aceptada());
    await ciclo(id, 21_600);
    const guardada = await leerNota(id);
    assert.equal(guardada.estado, "EMITIDO");
    assert.equal(consultas[0].tipo_de_comprobante, 3);
    await ciclo(id, 28_800);
    assert.deepEqual(await archivos(id), ["NOTA_CREDITO_CDR", "NOTA_CREDITO_PDF", "NOTA_CREDITO_XML"]);
  });

  test("una nota con PDF que SUNAT termina rechazando deja de figurar emitida", async () => {
    const origen = await venta({ estado: "REGISTRADO", tipoComprobante: "NOTA_VENTA" });
    const id = await nota(origen, { estado: "EMITIDO", datosNubefact: { respuesta: { aceptada_por_sunat: false } } });
    simular(rechazo);
    await ciclo(id);
    assert.equal((await leerNota(id)).estado, "ERROR_NUBEFACT");
    assert.equal((await seguimiento(id)).estado, "RESUELTO");
  });

  test("las bajas pendientes de ventas y notas se confirman; un error HTTP no las rechaza", async () => {
    const datos = { solicitud: { serie: "BSG1", numero: numero() }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "PENDIENTE", motivo: "Error", usuarioId, solicitud: { tipo_de_comprobante: 2 } } };
    const origen = await venta({ estado: "EMITIDO", datosNubefact: datos });
    const idNota = await nota(origen, { estado: "EMITIDO", datosNubefact: datos });
    for (const id of [origen, idNota]) {
      for (const respuesta of [() => json({}, 500), () => new Response("<html>"), sinRed, () => json({})]) {
        simular(respuesta);
        await ciclo(id, 100_000);
        await paquete.db.update(paquete.nubefactSeguimientos).set({ proximoIntento: new Date() }).where(eq(paquete.nubefactSeguimientos.entidadId, id));
        assert.equal((await seguimiento(id, "ANULACION")).estado, "ACTIVO");
      }
    }
    assert.equal((await leerVenta(origen)).datos.anulacion.estado, "PENDIENTE");
    simular(() => json({ sunat_responsecode: "99" }));
    await ciclo(idNota, 100_000);
    assert.equal(((await leerNota(idNota)).datosNubefact?.anulacion as Record<string, unknown>).estado, "RECHAZADO");
    simular(() => json({ aceptada_por_sunat: true }));
    await ciclo(origen, 100_000);
    assert.equal((await leerVenta(origen)).estado, "ANULADO");
    assert.equal((await seguimiento(origen, "ANULACION")).estado, "RESUELTO");
    assert.equal((await seguimiento(idNota, "ANULACION")).estado, "RESUELTO");
  });

  test("las guías pendientes llegan a emitidas o rechazadas", async () => {
    const aceptado = await guia();
    simular(() => json({}, 503));
    await ciclo(aceptado);
    assert.equal((await leerGuia(aceptado)).estado, "PENDIENTE_SUNAT");
    simular(() => new Response("<html>"));
    await ciclo(aceptado, 7200);
    simular(() => json({ aceptada_por_sunat: false, sunat_description: "En proceso" }));
    await ciclo(aceptado, 14_400);
    assert.equal((await seguimiento(aceptado)).ultimoError, "En proceso");
    simular(() => aceptada());
    await ciclo(aceptado, 21_600);
    assert.equal((await leerGuia(aceptado)).estado, "EMITIDO");
    const rechazada = await guia("NUBEFACT_PENDIENTE");
    simular(() => json({ aceptada_por_sunat: false, sunat_soap_error: "Rechazo" }));
    await ciclo(rechazada);
    assert.equal((await leerGuia(rechazada)).estado, "RECHAZADO_SUNAT");
    assert.equal(consultas[0].operacion, "consultar_guia");
  });

  test("el temporizador solo arranca cuando está activado", async () => {
    const inactivo = crearSeguimiento();
    inactivo.onModuleInit();
    inactivo.onModuleDestroy();
    process.env.NUBEFACT_SEGUIMIENTO_ACTIVO = "true";
    process.env.NUBEFACT_SEGUIMIENTO_INTERVALO_MS = "5";
    const activo = crearSeguimiento();
    let ciclos = 0;
    activo.ejecutarCiclo = async () => { ciclos += 1; throw new Error("fallo simulado"); };
    try {
      activo.onModuleInit();
      await new Promise((resolver) => setTimeout(resolver, 60));
      assert.ok(ciclos > 0);
    } finally {
      activo.onModuleDestroy();
      delete process.env.NUBEFACT_SEGUIMIENTO_ACTIVO;
      delete process.env.NUBEFACT_SEGUIMIENTO_INTERVALO_MS;
    }
  });
});
