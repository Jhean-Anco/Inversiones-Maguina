import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { consultarEmisionInmediata, emisionPendienteDeConfirmacion } from "./consulta-inmediata";
import { conPresupuesto, enviarANubefact, ErrorRedNubefact, nubefactConfigurado, solicitudConsultaComprobante } from "./nubefact-cliente";
import { calcularProximoIntento, esperaSiguienteIntentoSegundos, horizonteAgotado, retardoInicialSegundos, transicionarSeguimiento } from "./seguimiento-nubefact.util";

describe("programación del seguimiento NubeFact", () => {
  const ahora = new Date("2026-11-26T12:00:00Z");

  test("la espera crece 15 s, 30 s, 1 m, 2 m, 5 m y se estabiliza en 10 m", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 40].map((intentos) => esperaSiguienteIntentoSegundos(intentos)), [15, 30, 60, 120, 300, 600, 600, 600]);
    assert.equal(esperaSiguienteIntentoSegundos(-3, [7, 9]), 7);
    assert.throws(() => esperaSiguienteIntentoSegundos(0, []), /al menos una espera/);
    assert.equal(calcularProximoIntento(ahora, 2).getTime() - ahora.getTime(), 60_000);
  });

  test("un envío en vuelo no se consulta antes de vencer su tiempo límite", () => {
    assert.equal(retardoInicialSegundos(false, 20_000), 15);
    assert.equal(retardoInicialSegundos(true, 20_000), 35);
    assert.equal(retardoInicialSegundos(true, 1_000, [60]), 60);
  });

  test("las transiciones resuelven, reprograman o agotan el seguimiento", () => {
    const base = { intentos: 1, creadoEn: ahora, ahora, horizonteHoras: 48 };
    assert.deepEqual(transicionarSeguimiento({ ...base, resultado: { tipo: "RESUELTO" } }),
      { estado: "RESUELTO", intentos: 2, proximoIntento: null, ultimoError: null, resueltoEn: ahora });
    const pendiente = transicionarSeguimiento({ ...base, resultado: { tipo: "PENDIENTE" } });
    assert.deepEqual([pendiente.estado, pendiente.ultimoError, pendiente.proximoIntento?.getTime()], ["ACTIVO", null, ahora.getTime() + 60_000]);
    assert.equal(transicionarSeguimiento({ ...base, resultado: { tipo: "FALLO", mensaje: "x".repeat(900) } }).ultimoError?.length, 500);
    const viejo = new Date(ahora.getTime() - 48 * 3_600_000);
    assert.equal(horizonteAgotado(viejo, ahora, 48), true);
    const agotado = transicionarSeguimiento({ ...base, creadoEn: viejo, resultado: { tipo: "PENDIENTE", detalle: "En cola" } });
    assert.deepEqual([agotado.estado, agotado.proximoIntento, agotado.ultimoError], ["AGOTADO", null, "En cola"]);
  });
});

describe("cliente NubeFact", () => {
  const original = globalThis.fetch;
  const { NUBEFACT_TOKEN } = process.env;
  const simular = (responder: () => Response | Promise<Response>) => { globalThis.fetch = (async () => responder()) as typeof fetch; };
  const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });
  const consulta = { tipoComprobante: "BOLETA" as const, serie: "B001", numero: 1 };
  afterEach(() => { globalThis.fetch = original; process.env.NUBEFACT_TOKEN = NUBEFACT_TOKEN; });

  test("normaliza respuestas y errores de red", async () => {
    assert.deepEqual(solicitudConsultaComprobante("NOTA_DEBITO", "B001", 2), { operacion: "consultar_comprobante", tipo_de_comprobante: 4, serie: "B001", numero: 2 });
    simular(() => json([1]));
    assert.deepEqual(await enviarANubefact({}), { ok: true, status: 200, cuerpo: { respuesta: [1] } });
    simular(() => new Response("<html>", { status: 502 }));
    assert.deepEqual(await enviarANubefact({}), { ok: false, status: 502, cuerpo: null });
    for (const [error, causa] of [[new DOMException("t", "TimeoutError"), "TIEMPO_AGOTADO"], [new TypeError("fetch failed"), "RED"]] as const) {
      simular(() => { throw error; });
      await assert.rejects(enviarANubefact({}), (fallo: unknown) => fallo instanceof ErrorRedNubefact && fallo.causa === causa);
    }
    assert.equal(nubefactConfigurado(), true);
    delete process.env.NUBEFACT_TOKEN;
    assert.equal(nubefactConfigurado(), false);
    await assert.rejects(enviarANubefact({}), /no está configurado/);
  });

  test("conPresupuesto no espera más del límite", async () => {
    assert.equal(await conPresupuesto(Promise.resolve("listo"), 50), "listo");
    assert.equal(await conPresupuesto(new Promise((_, fallar) => setTimeout(() => fallar(new Error("tarde")), 30)), 5), null);
    await assert.rejects(conPresupuesto(Promise.reject(new Error("disco")), 50), /disco/);
  });

  test("solo es pendiente una respuesta sin aceptación ni rechazo", () => {
    assert.equal(emisionPendienteDeConfirmacion({ aceptada_por_sunat: false, enlace_del_pdf: "x" }), true);
    assert.equal(emisionPendienteDeConfirmacion({ aceptada_por_sunat: true }), false);
    assert.equal(emisionPendienteDeConfirmacion({ aceptada_por_sunat: false, sunat_responsecode: "2335" }), false);
    assert.equal(emisionPendienteDeConfirmacion({ errors: "Serie inválida" }), false);
  });

  test("la consulta inmediata se detiene al obtener un resultado definitivo", async () => {
    const respuestas = [() => { throw new TypeError("red"); }, () => json({}, 500), () => json({ aceptada_por_sunat: false }), () => json({ aceptada_por_sunat: true })];
    let llamadas = 0;
    simular(() => respuestas[llamadas++]());
    assert.deepEqual(await consultarEmisionInmediata({ ...consulta, esperasMs: [1, 1, 1, 1, 1] }), { aceptada_por_sunat: true });
    assert.equal(llamadas, 4);
    simular(() => json({ aceptada_por_sunat: false, sunat_responsecode: "2800" }));
    assert.equal((await consultarEmisionInmediata({ ...consulta, esperasMs: [1] }))?.sunat_responsecode, "2800");
  });

  test("la consulta inmediata devuelve null si sigue pendiente o se agota el presupuesto", async () => {
    let llamadas = 0;
    simular(() => { llamadas += 1; return json({ aceptada_por_sunat: false }); });
    assert.equal(await consultarEmisionInmediata({ ...consulta, esperasMs: [1, 1] }), null);
    assert.equal(await consultarEmisionInmediata({ ...consulta, esperasMs: [100], presupuestoMs: 50 }), null);
    assert.equal(llamadas, 2);
  });
});
