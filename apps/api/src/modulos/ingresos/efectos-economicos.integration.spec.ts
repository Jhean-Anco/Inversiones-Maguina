import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { ServicioMototaxis } from "../mototaxis/mototaxis.service";
import { ServicioFinanzas } from "../finanzas/finanzas.service";
import { ServicioReportes } from "../reportes/reportes.service";
import { ServicioIngresos } from "./ingresos.service";
import { ServicioNotaVentaEdicion } from "./nota-venta-edicion.service";

/*
 * Efectos de dinero e inventario de las ventas (anulaciones, notas y reportes) contra PostgreSQL real desechable.
 * NubeFact y el archivado de documentos se simulan: ninguna prueba sale a la red.
 */

function validarBaseDePruebas() {
  assert.equal(process.env.NODE_ENV, "test", "La integración exige NODE_ENV=test.");
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname));
  assert.equal(url.pathname, "/magina_test");
  assert.equal(url.username, "ci");
  assert.equal(url.password, "ci-only-password");
  assert.equal(process.env.NUBEFACT_RUTA, "https://example.invalid/api", "NubeFact debe apuntar a un dominio inválido en pruebas.");
}
validarBaseDePruebas();

// @magina/database carga el .env local sin sobrescribir variables: se fijan las que cambian el comportamiento.
const entornoBase: Record<string, string | undefined> = {
  REGIMEN_TRIBUTARIO: "NRUS", DESCUENTO_MAXIMO_PORCENTAJE: "0", NUBEFACT_TIMEOUT_MS: "20000", APIS_PERU_TOKEN: undefined,
  NUBEFACT_RUTA: process.env.NUBEFACT_RUTA, NUBEFACT_TOKEN: process.env.NUBEFACT_TOKEN,
};
function restaurarEntorno() {
  for (const [clave, valor] of Object.entries(entornoBase)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
}

type Paquete = typeof import("@magina/database");
let db: Paquete["db"];
let esquema: Paquete;
let cerrarBaseDatos: Paquete["cerrarBaseDatos"];

type Guardado = { id: string; tipo: string; nombre: string; ruta: string };
const almacenamiento = {
  fallar: false as false | "error" | "texto",
  llamadas: [] as { entidadTipo: string; entidadId: string; tipoComprobante: string; codigo: string }[],
  async archivarDocumentosNubeFact(entidadTipo: string, entidadId: string, tipoComprobante: string, codigo: string, datos: Record<string, unknown>) {
    this.llamadas.push({ entidadTipo, entidadId, tipoComprobante, codigo });
    if (this.fallar === "error") throw new Error("Disco lleno simulado");
    if (this.fallar === "texto") throw "fallo sin detalle";
    const campos = { PDF: "enlace_del_pdf", XML: "enlace_del_xml", CDR: "enlace_del_cdr" } as const;
    const guardados: Guardado[] = Object.entries(campos).flatMap(([tipo, campo]) => typeof datos[campo] === "string"
      ? [{ id: randomUUID(), tipo, nombre: `${codigo}-${tipo}`, ruta: `/archivos/${entidadId}-${tipo}/contenido` }] : []);
    return { guardados, errores: [] as { tipo: string; mensaje: string }[] };
  },
  async archivarDocumentoNotaVenta(venta: { id: string; codigo: string }) {
    if (this.fallar === "error") throw new Error("No se pudo escribir la nota simulada");
    if (this.fallar === "texto") throw "fallo sin detalle";
    return { id: randomUUID(), nombre: `${venta.codigo}.html`, ruta: `/archivos/${venta.id}/contenido` };
  },
};

const servicio = new ServicioIngresos(almacenamiento as never);
const servicioMototaxis = new ServicioMototaxis();

// ---- Simulación de NubeFact ----
const fetchOriginal = globalThis.fetch;
const fetchProhibido = (async (entrada: URL | RequestInfo) => {
  throw new Error(`Llamada de red no simulada: ${String(entrada)}`);
}) as typeof fetch;
let llamadasNubefact: { cuerpo: Record<string, unknown>; autorizacion: string }[] = [];
function simularNubefact(responder: (cuerpo: Record<string, unknown>) => Response | Promise<Response>) {
  llamadasNubefact = [];
  globalThis.fetch = (async (entrada: URL | RequestInfo, init?: RequestInit) => {
    assert.equal(String(entrada), "https://example.invalid/api", "Solo se permite la ruta NubeFact simulada.");
    const cuerpo = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    llamadasNubefact.push({ cuerpo, autorizacion: new Headers(init?.headers).get("Authorization") ?? "" });
    return responder(cuerpo);
  }) as typeof fetch;
}
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
const sinRespuesta = (): Response => { throw new TypeError("fetch failed: conexión rechazada simulada"); };
const aceptada = (extra: Record<string, unknown> = {}) => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/doc.pdf", enlace_del_xml: "https://example.invalid/doc.xml", ...extra });

// ---- Datos de prueba ----
const hoy = fechaActualPeru();
const diasAtras = (dias: number) => fechaActualPeru(new Date(Date.now() - dias * 86_400_000));
const diasAdelante = (dias: number) => fechaActualPeru(new Date(Date.now() + dias * 86_400_000));
const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
const SERIES = { BOLETA: "BEF1", FACTURA: "FEF1", NOTA_VENTA: "NEF1", NOTA_CREDITO_BOLETA: "BEF2", COTIZACION: "CEF1" } as const;

let usuarioId: string;
let tipos: { natural: string; juridica: string; dni: string; ruc: string; ce: string };
let unidadCodigo: string;
let listaGeneralId: string;
let categoriaId: string;
let marcaId: string;
type Cliente = { id: string; documento: string; nombre: string };
let natural: Cliente;
let empresa: Cliente;
let documentoCe: string;
const personasCreadas: string[] = [];
const productosCreados: string[] = [];
const ingresosDirectos: string[] = [];
const clavesUsadas: string[] = [];
const cuentasCreadas: string[] = [];
const cotizacionesCreadas: string[] = [];
const marcasMototaxi: string[] = [];
const modelosMototaxi: string[] = [];

function numeroAleatorio(digitos: number) {
  return String(BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`) % 10n ** BigInt(digitos)).padStart(digitos, "0");
}
function rucConDigito(prefijo: "10" | "20", cuerpo = numeroAleatorio(8)) {
  const base = `${prefijo}${cuerpo}`;
  const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0);
  const resto = 11 - (suma % 11);
  return `${base}${resto === 10 ? 0 : resto === 11 ? 1 : resto}`;
}

async function crearCliente(opciones: { ruc?: boolean; nombres?: string; razonSocial?: string; direccion?: string | null; correo?: string | null }): Promise<Cliente> {
  const documento = opciones.ruc ? rucConDigito("20") : numeroAleatorio(8);
  const [persona] = await db.insert(esquema.personas).values(opciones.ruc
    ? { tipoPersonaId: tipos.juridica, tipoDocumentoId: tipos.ruc, numeroDocumento: documento, razonSocial: opciones.razonSocial ?? `EMPRESA QA ${sufijo} SAC` }
    : { tipoPersonaId: tipos.natural, tipoDocumentoId: tipos.dni, numeroDocumento: documento, nombres: opciones.nombres ?? `Cliente${sufijo}`, apellidoPaterno: "Prueba" })
    .returning({ id: esquema.personas.id });
  personasCreadas.push(persona.id);
  await db.insert(esquema.clientes).values({ personaId: persona.id, direccionFiscal: opciones.direccion === undefined ? "Jr. Prueba 123" : opciones.direccion, correo: opciones.correo === undefined ? "cliente.qa@example.invalid" : opciones.correo });
  return { id: persona.id, documento, nombre: opciones.ruc ? (opciones.razonSocial ?? `EMPRESA QA ${sufijo} SAC`) : `${opciones.nombres ?? `Cliente${sufijo}`} Prueba` };
}

async function crearProducto(opciones: { stock?: number; precio?: string; nombre?: string } = {}) {
  const codigo = `QAV-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const [producto] = await db.insert(esquema.productos).values({ codigoInterno: codigo, nombre: opciones.nombre ?? `Repuesto ${sufijo} ${codigo}`, categoriaId, marcaId, unidadBaseCodigo: unidadCodigo, afectacionIgv: "GRAVADO", afectoIgv: true })
    .returning({ id: esquema.productos.id });
  productosCreados.push(producto.id);
  const [presentacion] = await db.insert(esquema.productosPresentaciones).values({ productoId: producto.id, unidadMedidaCodigo: unidadCodigo, nombre: "Unidad", factorAUnidadBase: "1.000000", seCompra: true, seVende: true, esBase: true })
    .returning({ id: esquema.productosPresentaciones.id });
  await db.insert(esquema.preciosProductos).values({ productoId: producto.id, presentacionId: presentacion.id, tipoListaPrecioId: listaGeneralId, precio: opciones.precio ?? "10.00", cantidadMinima: "1.000" });
  await db.insert(esquema.saldosStock).values({ productoId: producto.id, cantidad: (opciones.stock ?? 10).toFixed(6) });
  return { productoId: producto.id, presentacionId: presentacion.id, codigo };
}

async function crearCuenta(tipo: "EFECTIVO" | "BANCO") {
  const [cuenta] = await db.insert(esquema.cuentasFinancieras).values({ tipo, nombre: `QA ${tipo} ${sufijo}`, moneda: "PEN", usuarioId }).returning({ id: esquema.cuentasFinancieras.id });
  cuentasCreadas.push(cuenta.id);
  return cuenta.id;
}

async function asegurarSerie(tipo: string, serie: string) {
  const [activa] = await db.select({ serie: esquema.seriesComprobantes.serie }).from(esquema.seriesComprobantes)
    .where(and(eq(esquema.seriesComprobantes.tipoComprobante, tipo), eq(esquema.seriesComprobantes.activa, true))).limit(1);
  if (activa) return activa.serie;
  await servicio.guardarSerieConfigurada({ tipoComprobante: tipo, serie, ultimoNumero: 0 });
  return serie;
}
async function asegurarSeries() {
  for (const [tipo, serie] of Object.entries(SERIES)) await asegurarSerie(tipo, serie);
}

function clave() {
  const valor = randomUUID();
  clavesUsadas.push(valor);
  return valor;
}

async function venta(id: string) {
  const [fila] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, id));
  return { ...fila, datos: (fila.datosNubefact ?? {}) as Record<string, any> };
}
async function stock(productoId: string) {
  const [fila] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock).where(eq(esquema.saldosStock.productoId, productoId));
  return Number(fila.cantidad);
}
async function rechazaCon(promesa: Promise<unknown>, tipo: new (...args: never[]) => Error, mensaje: RegExp) {
  await assert.rejects(promesa, (error: unknown) => {
    assert.ok(error instanceof tipo, `Se esperaba ${tipo.name} y se obtuvo ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`);
    assert.match((error as Error).message, mensaje);
    return true;
  });
}

before(async () => {
  restaurarEntorno();
  globalThis.fetch = fetchProhibido;
  esquema = await import("@magina/database");
  ({ db, cerrarBaseDatos } = esquema);
  const tiposPersona = await db.select().from(esquema.tiposPersona);
  const tiposDocumento = await db.select().from(esquema.tiposDocumento);
  const porCodigo = (filas: { id: string; codigo: string }[], codigo: string) => filas.find((fila) => fila.codigo === codigo)!.id;
  tipos = { natural: porCodigo(tiposPersona, "NATURAL"), juridica: porCodigo(tiposPersona, "JURIDICA"), dni: porCodigo(tiposDocumento, "01"), ruc: porCodigo(tiposDocumento, "06"), ce: porCodigo(tiposDocumento, "04") };
  const [unidad] = await db.select({ codigo: esquema.unidadesMedida.codigo }).from(esquema.unidadesMedida).where(eq(esquema.unidadesMedida.activo, true)).limit(1);
  unidadCodigo = unidad.codigo;
  const [lista] = await db.select({ id: esquema.tiposListasPrecio.id }).from(esquema.tiposListasPrecio).where(eq(esquema.tiposListasPrecio.codigo, "GENERAL"));
  listaGeneralId = lista.id;

  const [personaUsuario] = await db.insert(esquema.personas).values({ tipoPersonaId: tipos.natural, tipoDocumentoId: tipos.dni, numeroDocumento: numeroAleatorio(8), nombres: `Usuario${sufijo}`, apellidoPaterno: "QA" }).returning({ id: esquema.personas.id });
  personasCreadas.push(personaUsuario.id);
  await db.insert(esquema.trabajadores).values({ personaId: personaUsuario.id, fechaIngreso: hoy });
  const [usuario] = await db.insert(esquema.usuarios).values({ trabajadorId: personaUsuario.id, nombreUsuario: `qa_efectos_${sufijo.toLowerCase()}`, correo: `qa-efectos-${sufijo.toLowerCase()}@example.invalid`, contrasenaHash: "hash-ficticio", requiereCambioContrasena: false }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;

  const [categoria] = await db.insert(esquema.categoriasProductos).values({ nombre: `QA efectos ${sufijo}` }).returning({ id: esquema.categoriasProductos.id });
  categoriaId = categoria.id;
  const [marca] = await db.insert(esquema.marcasProductos).values({ nombre: `QA efectos ${sufijo}`, uso: "REPUESTOS" }).returning({ id: esquema.marcasProductos.id });
  marcaId = marca.id;

  natural = await crearCliente({});
  empresa = await crearCliente({ ruc: true, direccion: "Av. Industrial 456" });
  documentoCe = `CE${numeroAleatorio(8)}`;
  await db.insert(esquema.personasDocumentos).values({ personaId: natural.id, tipoDocumentoId: tipos.ce, numeroDocumento: documentoCe });
  await asegurarSeries();
});

// Otras suites de integración corren en paralelo y pueden borrar la serie activa que reutilizamos: si la venta falla por
// falta de serie, se reactiva la propia y se reintenta una vez (la validación ocurre antes de registrar nada).
const crearOriginal = servicio.crear.bind(servicio);
servicio.crear = (async (valor: unknown, usuario: string, lineas?: Record<string, unknown>[]) => {
  try { return await crearOriginal(valor, usuario, lineas); } catch (error) {
    if (!(error instanceof BadRequestException) || !/serie (activa|de boletas|de facturas)/.test(error.message) || !process.env.NUBEFACT_TOKEN?.trim()) throw error;
    await asegurarSeries();
    // La venta pudo quedar registrada sin emitir: se reintenta con otra clave para no recuperar esa venta incompleta.
    const nuevaClave = randomUUID();
    clavesUsadas.push(nuevaClave); return crearOriginal(valor && typeof valor === "object" ? { ...valor, idempotencyKey: nuevaClave } : valor, usuario, lineas);
  }
}) as typeof servicio.crear;

beforeEach(async () => {
  await asegurarSeries();
});

afterEach(() => {
  globalThis.fetch = fetchProhibido;
  almacenamiento.fallar = false;
  restaurarEntorno();
});

const finanzas = new ServicioFinanzas();
const reportes = new ServicioReportes();
const edicion = new ServicioNotaVentaEdicion(almacenamiento as never);

/* Cada escenario de reportes se traslada a un día antiguo propio para medir sus totales sin interferencia de otras suites. */
let diaBase = 1 + Math.floor(Math.random() * 300);
const diaAislado = () => { const fecha = new Date(Date.UTC(1971 + Math.floor(Math.random() * 20), 0, diaBase++)); return fecha.toISOString().slice(0, 10); };

const baja = (cuerpo: Record<string, unknown> = { aceptada_por_sunat: true }) => simularNubefact(() => json(cuerpo));
const pendiente = { sunat_ticket_numero: "T-1" };
const rechazo = { errors: "SUNAT rechazó la baja" };
const confirmar = { motivo: "Prueba de reversa", confirmoNoEntregado: true };

async function movimientos(productoId: string) {
  const filas = await db.select().from(esquema.movimientosStock).where(eq(esquema.movimientosStock.productoId, productoId));
  return filas.map((fila) => `${fila.tipo}:${fila.origenTipo}:${Number(fila.cantidadBase)}`).sort();
}
async function caja(cuentaId: string) {
  const fila = (await finanzas.resumenDelMes()).items.find((item) => item.id === cuentaId)!;
  return Number(fila.netoMes);
}
async function vender(opciones: { tipo?: "BOLETA" | "NOTA_VENTA"; credito?: { inicial: number }; cantidad?: number; stock?: number; cuenta: string }) {
  const producto = await crearProducto({ stock: opciones.stock ?? 10, precio: "10.00" });
  const cantidad = opciones.cantidad ?? 4;
  const total = cantidad * 10;
  const tipo = opciones.tipo ?? "BOLETA";
  simularNubefact(() => aceptada());
  const resultado = await servicio.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: tipo, clienteId: natural.id, medioPago: "EFECTIVO",
    detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad, afectacionIgv: "GRAVADO" }] }, usuarioId);
  // El registro nuevo solo admite contado; las ventas a crédito (órdenes e históricas) se preparan sobre la venta ya emitida.
  if (opciones.credito) await db.update(esquema.ingresos).set({ condicionPago: "CREDITO", importePagoInicial: opciones.credito.inicial.toFixed(2), fechaVencimientoPago: diasAdelante(30),
    cuotasPago: [{ cuota: 1, fechaDePago: diasAdelante(30), importe: (total - opciones.credito.inicial).toFixed(2) }] }).where(eq(esquema.ingresos.id, resultado.id));
  const [detalle] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, resultado.id));
  return { id: resultado.id, detalle: detalle.id, producto, total };
}
const cobrar = (ventaId: string, importe: number, cuenta: string) => servicio.registrarPago(ventaId, { idempotencyKey: randomUUID(), fechaPago: hoy, importeAplicado: importe, medioPago: "EFECTIVO", cuentaFinancieraId: cuenta }, usuarioId);
/** Cobro de notas de venta (el endpoint de cobros solo admite comprobantes electrónicos). */
const cobroDirecto = (ventaId: string, importe: string, cuenta: string) => db.insert(esquema.ingresosPagos).values({ ingresoId: ventaId, fechaPago: hoy, importeAplicado: importe, importeRecibido: importe, medioPago: "EFECTIVO", cuentaFinancieraId: cuenta, usuarioId, claveIdempotencia: randomUUID() });
function emitir(ventaId: string, tipo: "NOTA_CREDITO" | "NOTA_DEBITO", detalle: string, monto: string, cuenta: string, responder: (cuerpo: Record<string, unknown>) => Response = () => aceptada()) {
  simularNubefact(responder);
  return servicio.emitirNota(ventaId, { tipo, cuentaFinancieraId: cuenta, medioPago: "EFECTIVO", lineas: [{ detalleId: detalle, monto }] }, usuarioId);
}
async function saldo(ventaId: string) {
  const pagos = await servicio.listarPagos(ventaId);
  const fila = await venta(ventaId);
  const listado = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: fila.codigo });
  assert.equal(listado.items[0].saldoPendiente, pagos.saldoPendiente, "El listado y los cobros informan el mismo saldo.");
  return pagos.saldoPendiente;
}
async function cifras(dia: string) {
  const rango = { desde: dia, hasta: dia };
  const [ingreso, cobranza, rentabilidad, articulos, comparativo, panel] = await Promise.all([
    reportes.reporteIngresos(rango), reportes.cobranza(rango), reportes.rentabilidad(rango, []), reportes.articulosMasVendidos(rango), reportes.ingresosComparativo(rango), reportes.ingresosDashboard(rango, rango),
  ]);
  const sumar = (filas: { total: string | null }[]) => filas.reduce((suma, fila) => suma + Number(fila.total), 0).toFixed(2);
  return {
    neto: ingreso.resumen.totalNeto, facturado: Number(cobranza.facturado).toFixed(2), cobrado: Number(cobranza.cobrado).toFixed(2),
    rentabilidad: rentabilidad.filas.reduce((suma, fila) => suma + Number(fila.venta), 0).toFixed(2),
    articulos: Number(articulos.totalVentas).toFixed(2), porArticulo: sumar(articulos.articulos),
    comparativo: sumar(comparativo.dias), panel: sumar([...panel.anual.flujoPorComprobante, ...panel.anual.flujoPorNotaDebito]), concepto: sumar(panel.anual.flujoPorConcepto),
  };
}
async function trasladar(ventaId: string, dia: string) {
  await db.update(esquema.ingresos).set({ fecha: dia }).where(eq(esquema.ingresos.id, ventaId));
  await db.update(esquema.comprobantesRelacionados).set({ fecha: dia }).where(eq(esquema.comprobantesRelacionados.ingresoOrigenId, ventaId));
}
const todas = (importe: string, cobrado: string) => ({ neto: importe, facturado: importe, cobrado, rentabilidad: importe, articulos: importe, porArticulo: importe, comparativo: importe, panel: importe, concepto: importe });

describe("anulación de boletas", () => {
  test("al contado: la baja pendiente no revierte nada y la aceptada devuelve dinero y stock una sola vez", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta });
    await cobrar(v.id, 40, cuenta);
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta)], [6, 40]);

    baja(pendiente);
    assert.equal((await servicio.anularIngreso(v.id, confirmar, usuarioId)).estado, "ANULACION_PENDIENTE");
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta), (await venta(v.id)).estado], [6, 40, "EMITIDO"]);
    await rechazaCon(servicio.anularIngreso(v.id, confirmar, usuarioId), BadRequestException, /pendiente/);
    await rechazaCon(cobrar(v.id, 1, cuenta), ConflictException, /baja de este comprobante está pendiente/);
    await rechazaCon(emitir(v.id, "NOTA_DEBITO", v.detalle, "1.00", cuenta), ConflictException, /pendiente de respuesta/);

    baja();
    assert.equal((await servicio.consultarAnulacionIngreso(v.id, usuarioId)).estado, "ANULADO");
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta), (await venta(v.id)).estado, await saldo(v.id)], [10, 0, "ANULADO", "0.00"]);
    assert.deepEqual(await movimientos(v.producto.productoId), ["ENTRADA:ANULACION_INGRESO:4", "SALIDA:INGRESO:4"]);
    const pagos = await servicio.listarPagos(v.id);
    assert.deepEqual([pagos.anulada, pagos.importeAplicadoTotal, pagos.items.length], [true, "0.00", 1]);
    await rechazaCon(servicio.consultarAnulacionIngreso(v.id, usuarioId), BadRequestException, /No hay una comunicación de baja pendiente/);
    await rechazaCon(servicio.anularIngreso(v.id, confirmar, usuarioId), BadRequestException, /aún no anulada/);
    await rechazaCon(cobrar(v.id, 1, cuenta), BadRequestException, /comprobantes emitidos/);
    assert.equal(await stock(v.producto.productoId), 10);
    const dia = diaAislado();
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("0.00", "0.00"));
  });

  test("a crédito con pagos parciales: la baja rechazada o fuera de plazo no revierte; la aceptada sí", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta, credito: { inicial: 10 } });
    await cobrar(v.id, 10, cuenta);
    await cobrar(v.id, 5, cuenta);
    assert.equal(await saldo(v.id), "25.00");
    baja(rechazo);
    assert.equal((await servicio.anularIngreso(v.id, confirmar, usuarioId)).estado, "RECHAZADO");
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta), await saldo(v.id)], [6, 15, "25.00"]);
    await db.update(esquema.ingresos).set({ fecha: diasAtras(8) }).where(eq(esquema.ingresos.id, v.id));
    await rechazaCon(servicio.anularIngreso(v.id, confirmar, usuarioId), BadRequestException, /plazo de 7 días/);
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta)], [6, 15]);
    await db.update(esquema.ingresos).set({ fecha: hoy }).where(eq(esquema.ingresos.id, v.id));
    baja();
    await servicio.anularIngreso(v.id, confirmar, usuarioId);
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta), await saldo(v.id)], [10, 0, "0.00"]);
  });

  test("mototaxis: devuelve el stock del modelo y libera la garantía; un reclamo la bloquea", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const marca = await servicioMototaxis.crearMarca({ nombre: `QA Moto Efectos ${sufijo}` });
    marcasMototaxi.push(marca.id);
    const modelo = await servicioMototaxis.crearModelo({ marcaId: marca.id, nombre: `Efectos ${sufijo}`, version: "V1" });
    modelosMototaxi.push(modelo.id);
    await servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 5, motivo: "Conteo inicial QA" }, usuarioId);
    await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta: "150.00" }, usuarioId);
    const disponibles = async () => (await servicio.buscarMototaxisVenta(`Efectos ${sufijo}`))[0]?.stockDisponible;
    const moto = (tipo: "BOLETA" | "NOTA_VENTA", cantidad: number) => {
      simularNubefact(() => aceptada());
      return servicio.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: tipo, clienteId: natural.id, medioPago: "EFECTIVO",
        detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: modelo.id, cantidad, precioUnitario: "150.00", afectacionIgv: "GRAVADO" }] }, usuarioId);
    };
    const boleta = await moto("BOLETA", 2);
    await cobrar(boleta.id, 300, cuenta);
    const [detalle] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, boleta.id));
    await servicioMototaxis.guardarGarantiaModelo(modelo.id, { activa: true, mesesVigencia: 6, alcance: "Motor y transmisión" });
    await servicioMototaxis.aplicarGarantiaVenta(detalle.id);
    // Un reclamo de garantía registrado impide anular antes de comunicar nada a SUNAT.
    const [proveedor] = await db.insert(esquema.proveedores).values({ personaId: empresa.id }).onConflictDoNothing().returning();
    const [unidad] = await db.insert(esquema.unidadesMototaxis).values({ codigo: `QAE-${sufijo}`, modeloId: modelo.id, vin: `QAEVIN${sufijo}`, numeroMotor: `QAEM${sufijo}`, numeroChasis: `QAEC${sufijo}`, color: "Rojo", costoAdquisicion: "100.00" } as never).returning();
    const [politica] = await db.insert(esquema.garantiasMototaxis).values({ unidadId: unidad.id, proveedorPersonaId: empresa.id, porcentajeProveedor: "70", mesesVigencia: 6, iniciaEn: hoy, terminaEn: diasAdelante(90) }).returning();
    const [reclamo] = await db.insert(esquema.reclamosGarantiaMototaxis).values({ garantiaId: politica.id, ingresoDetalleId: detalle.id, fecha: hoy, descripcionFalla: "Falla QA", costoTotal: "0", porcentajeProveedorAplicado: "70", importeProveedor: "0", importeEmpresa: "0", usuarioId }).returning();
    await rechazaCon(servicio.anularIngreso(boleta.id, confirmar, usuarioId), ConflictException, /reclamos de garantía/);
    await db.delete(esquema.reclamosGarantiaMototaxis).where(eq(esquema.reclamosGarantiaMototaxis.id, reclamo.id));
    await db.delete(esquema.garantiasMototaxis).where(eq(esquema.garantiasMototaxis.id, politica.id));
    await db.delete(esquema.unidadesMototaxis).where(eq(esquema.unidadesMototaxis.id, unidad.id));
    if (proveedor) await db.delete(esquema.proveedores).where(eq(esquema.proveedores.personaId, empresa.id));
    const garantias = () => db.select().from(esquema.garantiasVentasMototaxis).where(eq(esquema.garantiasVentasMototaxis.ingresoDetalleId, detalle.id));
    assert.deepEqual([await disponibles(), (await garantias()).length], [3, 1]);
    baja(pendiente);
    await servicio.anularIngreso(boleta.id, confirmar, usuarioId);
    assert.deepEqual([await disponibles(), (await garantias()).length, await caja(cuenta)], [3, 1, 300]);
    baja();
    await servicio.consultarAnulacionIngreso(boleta.id, usuarioId);
    assert.deepEqual([await disponibles(), (await garantias()).length, await caja(cuenta)], [5, 0, 0]);

    // Nota de venta editada (de 1 a 3 unidades): la anulación devuelve la cantidad vigente.
    const nota = await moto("NOTA_VENTA", 1);
    const [linea] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, nota.id));
    await edicion.editar(nota.id, { detalles: [{ id: linea.id, tipo: "MOTOTAXI", mototaxiModeloId: modelo.id, cantidad: 3, precioUnitario: 150, afectacionIgv: "GRAVADO" }] }, usuarioId);
    assert.equal(await disponibles(), 2);
    await servicio.anularNotaVenta(nota.id, { motivo: "Desistimiento" }, usuarioId);
    assert.equal(await disponibles(), 5);
  });
});

describe("anulación interna de notas de venta", () => {
  test("revierte cobros y stock al instante, incluso tras editarla, y no se repite", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta, tipo: "NOTA_VENTA" });
    await edicion.editar(v.id, { detalles: [{ id: v.detalle, tipo: "PRODUCTO", presentacionId: v.producto.presentacionId, cantidad: 6, precioUnitario: 10, afectacionIgv: "GRAVADO" }] }, usuarioId);
    await cobroDirecto(v.id, "60.00", cuenta);
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta)], [4, 60]);
    const dia = diaAislado();
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("60.00", "60.00"));

    await rechazaCon(servicio.anularNotaVenta(v.id, {}, usuarioId), BadRequestException, /motivo/);
    const intentos = await Promise.allSettled([servicio.anularNotaVenta(v.id, { motivo: "Error" }, usuarioId), servicio.anularNotaVenta(v.id, { motivo: "Error" }, usuarioId)]);
    assert.deepEqual(intentos.map((intento) => intento.status).sort(), ["fulfilled", "rejected"]);
    await rechazaCon(servicio.anularNotaVenta(v.id, { motivo: "Error" }, usuarioId), ConflictException, /ya figura anulada/);
    assert.deepEqual([await stock(v.producto.productoId), await caja(cuenta), (await venta(v.id)).estado, await saldo(v.id)], [10, 0, "ANULADO", "0.00"]);
    assert.deepEqual(await movimientos(v.producto.productoId), ["ENTRADA:ANULACION_INGRESO:6", "SALIDA:INGRESO:6"]);
    assert.deepEqual(await cifras(dia), todas("0.00", "0.00"));

    const boleta = await vender({ cuenta });
    await rechazaCon(servicio.anularNotaVenta(boleta.id, { motivo: "x" }, usuarioId), BadRequestException, /Solo una nota de venta/);
    await rechazaCon(servicio.anularNotaVenta(randomUUID(), { motivo: "x" }, usuarioId), NotFoundException, /No se encontró/);
    await rechazaCon(servicio.anularNotaVenta("x", { motivo: "x" }, usuarioId), BadRequestException, /no es válida/);
  });
});

describe("notas de crédito y débito: dinero, saldo y reportes", () => {
  test("en una venta a crédito la nota de crédito reduce la deuda y solo reembolsa lo cobrado de más", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta, credito: { inicial: 10 } });
    await cobrar(v.id, 10, cuenta);

    const credito = await emitir(v.id, "NOTA_CREDITO", v.detalle, "15.00", cuenta);
    const leer = async (id: string) => (await db.select().from(esquema.comprobantesRelacionados).where(eq(esquema.comprobantesRelacionados.id, id)))[0];
    assert.equal((await leer(credito.id)).importeReembolsado, "0.00");
    assert.deepEqual([await saldo(v.id), await caja(cuenta), await stock(v.producto.productoId)], ["15.00", 10, 6]);
    const dia = diaAislado();
    const fechaOriginal = (await venta(v.id)).fecha;
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("25.00", "10.00"));
    await trasladar(v.id, fechaOriginal);
    await rechazaCon(cobrar(v.id, 16, cuenta), BadRequestException, /supera el saldo pendiente/);

    baja(pendiente);
    await servicio.anularNota(v.id, credito.id, confirmar, usuarioId);
    assert.equal(await saldo(v.id), "15.00");
    baja(rechazo);
    await servicio.consultarAnulacionNota(v.id, credito.id);
    assert.equal(await saldo(v.id), "15.00");
    await rechazaCon(servicio.anularIngreso(v.id, confirmar, usuarioId), BadRequestException, /notas electrónicas vinculadas/);
    baja();
    await servicio.anularNota(v.id, credito.id, confirmar, usuarioId);
    assert.deepEqual([await saldo(v.id), await caja(cuenta)], ["30.00", 10]);
    assert.equal(almacenamiento.llamadas.at(-1)?.entidadTipo, "COMPROBANTE_RELACIONADO");

    // Dada de baja la anterior, se puede emitir otra; cobrado todo, la siguiente nota total devuelve el dinero.
    await cobrar(v.id, 30, cuenta);
    const total = await emitir(v.id, "NOTA_CREDITO", v.detalle, "40.00", cuenta);
    assert.equal((await leer(total.id)).importeReembolsado, "40.00");
    assert.deepEqual([await saldo(v.id), await caja(cuenta), await stock(v.producto.productoId)], ["0.00", 0, 6]);
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("0.00", "0.00"));
    const listadas = await servicio.listarNotas(v.id);
    assert.deepEqual(listadas.map((fila) => fila.codigoMotivo), [5, 5]);
  });

  test("reembolso parcial: lo que excede la deuda sale de la cuenta", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta, credito: { inicial: 10 } });
    await cobrar(v.id, 10, cuenta);
    await cobrar(v.id, 20, cuenta);
    await emitir(v.id, "NOTA_CREDITO", v.detalle, "15.00", cuenta);
    assert.deepEqual([await saldo(v.id), await caja(cuenta)], ["0.00", 25]);
    const dia = diaAislado();
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("25.00", "25.00"));
  });

  test("la nota de débito suma ingreso y dinero sin tocar inventario, y su baja lo retira", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta });
    await cobrar(v.id, 40, cuenta);
    const debito = await emitir(v.id, "NOTA_DEBITO", v.detalle, "5.00", cuenta);
    assert.deepEqual([await saldo(v.id), await caja(cuenta), await stock(v.producto.productoId)], ["0.00", 45, 6]);
    await rechazaCon(emitir(v.id, "NOTA_DEBITO", v.detalle, "1.00", cuenta), ConflictException, /ya tiene la nota de débito/);
    const dia = diaAislado();
    await trasladar(v.id, dia);
    assert.deepEqual(await cifras(dia), todas("45.00", "45.00"));
    await trasladar(v.id, hoy);
    baja();
    await servicio.anularNota(v.id, debito.id, confirmar, usuarioId);
    assert.deepEqual([await caja(cuenta), await stock(v.producto.productoId)], [40, 6]);
    await servicio.anularIngreso(v.id, confirmar, usuarioId);
    assert.deepEqual([await caja(cuenta), await stock(v.producto.productoId)], [0, 10]);
  });

  test("reintento de notas fallidas: rechazo definitivo se reemite; sin respuesta primero se consulta", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta });
    await cobrar(v.id, 40, cuenta);
    await rechazaCon(emitir(v.id, "NOTA_CREDITO", v.detalle, "5.00", cuenta, () => json({ errors: "Serie no autorizada" })), BadRequestException, /Serie no autorizada/);
    await rechazaCon(emitir(v.id, "NOTA_CREDITO", v.detalle, "5.00", cuenta, sinRespuesta), BadRequestException, /No hubo respuesta/);
    assert.equal(await caja(cuenta), 40);
    await rechazaCon(cobrar(v.id, 1, cuenta), ConflictException, /sin resultado confirmado/);
    await rechazaCon(emitir(v.id, "NOTA_CREDITO", v.detalle, "5.00", cuenta, sinRespuesta), ConflictException, /No se sabe si NubeFact/);
    await rechazaCon(emitir(v.id, "NOTA_CREDITO", v.detalle, "5.00", cuenta, () => json(pendiente)), ConflictException, /No se sabe|sigue pendiente/);
    // NubeFact informa que nunca recibió el documento: se permite emitirlo otra vez.
    const emitida = await emitir(v.id, "NOTA_CREDITO", v.detalle, "5.00", cuenta, (cuerpo) => cuerpo.operacion === "consultar_comprobante" ? json({ errors: "El documento no existe" }, 400) : aceptada());
    assert.equal(emitida.estado, "EMITIDO");
    assert.equal(await caja(cuenta), 35);

    const otra = await vender({ cuenta });
    await rechazaCon(emitir(otra.id, "NOTA_CREDITO", otra.detalle, "5.00", cuenta, sinRespuesta), BadRequestException, /No hubo respuesta/);
    baja();
    await rechazaCon(servicio.anularIngreso(otra.id, confirmar, usuarioId), ConflictException, /sí fue aceptada/);
    assert.equal((await servicio.listarNotas(otra.id))[0].estado, "EMITIDO");
    assert.equal(await stock(otra.producto.productoId), 6);
  });

  test("dos notas de crédito simultáneas no superan el total ni duplican el reembolso", async () => {
    const cuenta = await crearCuenta("EFECTIVO");
    const v = await vender({ cuenta });
    await cobrar(v.id, 40, cuenta);
    simularNubefact(() => aceptada());
    const datos = { tipo: "NOTA_CREDITO", cuentaFinancieraId: cuenta, medioPago: "EFECTIVO", lineas: [{ detalleId: v.detalle, monto: "30.00" }] };
    const resultados = await Promise.allSettled([servicio.emitirNota(v.id, datos, usuarioId), servicio.emitirNota(v.id, datos, usuarioId)]);
    assert.deepEqual(resultados.map((resultado) => resultado.status).sort(), ["fulfilled", "rejected"]);
    const rechazada = resultados.find((resultado) => resultado.status === "rejected") as PromiseRejectedResult;
    assert.ok(rechazada.reason instanceof ConflictException || rechazada.reason instanceof BadRequestException, String(rechazada.reason));
    assert.equal(await caja(cuenta), 10);
  });
});

after(async () => {
  globalThis.fetch = fetchOriginal;
  if (!db) return;
  const ventasPorClave = clavesUsadas.length ? await db.select({ id: esquema.ingresos.id }).from(esquema.ingresos).where(inArray(esquema.ingresos.claveIdempotencia, clavesUsadas)) : [];
  const ventasPorCliente = personasCreadas.length ? await db.select({ id: esquema.ingresos.id }).from(esquema.ingresos).where(inArray(esquema.ingresos.clienteId, personasCreadas)) : [];
  const ids = [...new Set([...ingresosDirectos, ...ventasPorClave.map((fila) => fila.id), ...ventasPorCliente.map((fila) => fila.id)])];
  if (ids.length) {
    const notas = await db.select({ id: esquema.comprobantesRelacionados.id }).from(esquema.comprobantesRelacionados).where(inArray(esquema.comprobantesRelacionados.ingresoOrigenId, ids));
    if (notas.length) {
      await db.delete(esquema.comprobantesRelacionadosDetalle).where(inArray(esquema.comprobantesRelacionadosDetalle.comprobanteRelacionadoId, notas.map((nota) => nota.id)));
      await db.delete(esquema.comprobantesRelacionados).where(inArray(esquema.comprobantesRelacionados.id, notas.map((nota) => nota.id)));
    }
    const detallesVenta = (await db.select({ id: esquema.ingresosDetalle.id }).from(esquema.ingresosDetalle).where(inArray(esquema.ingresosDetalle.ingresoId, ids))).map((fila) => fila.id);
    if (detallesVenta.length) {
      await db.delete(esquema.reclamosGarantiaMototaxis).where(inArray(esquema.reclamosGarantiaMototaxis.ingresoDetalleId, detallesVenta));
      await db.delete(esquema.garantiasVentasMototaxis).where(inArray(esquema.garantiasVentasMototaxis.ingresoDetalleId, detallesVenta));
    }
    await db.delete(esquema.ingresosEdiciones).where(inArray(esquema.ingresosEdiciones.ingresoId, ids));
    await db.delete(esquema.ingresosPagos).where(inArray(esquema.ingresosPagos.ingresoId, ids));
    await db.delete(esquema.cotizaciones).where(inArray(esquema.cotizaciones.ingresoId, ids));
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, ids));
    await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, ids));
  }
  if (cotizacionesCreadas.length) await db.delete(esquema.cotizaciones).where(inArray(esquema.cotizaciones.id, cotizacionesCreadas));
  if (modelosMototaxi.length) {
    await db.delete(esquema.garantiasModelosMototaxis).where(inArray(esquema.garantiasModelosMototaxis.modeloId, modelosMototaxi));
    await db.delete(esquema.preciosModelosMototaxis).where(inArray(esquema.preciosModelosMototaxis.modeloId, modelosMototaxi));
    await db.delete(esquema.movimientosModelosMototaxis).where(inArray(esquema.movimientosModelosMototaxis.modeloId, modelosMototaxi));
    await db.delete(esquema.ajustesInventarioMototaxis).where(inArray(esquema.ajustesInventarioMototaxis.modeloId, modelosMototaxi));
    await db.delete(esquema.modelosMototaxis).where(inArray(esquema.modelosMototaxis.id, modelosMototaxi));
  }
  if (marcasMototaxi.length) await db.delete(esquema.marcasProductos).where(inArray(esquema.marcasProductos.id, marcasMototaxi));
  if (productosCreados.length) {
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.productoId, productosCreados));
    await db.delete(esquema.saldosStock).where(inArray(esquema.saldosStock.productoId, productosCreados));
    await db.delete(esquema.productos).where(inArray(esquema.productos.id, productosCreados));
  }
  if (cuentasCreadas.length) await db.delete(esquema.cuentasFinancieras).where(inArray(esquema.cuentasFinancieras.id, cuentasCreadas));
  if (categoriaId) await db.delete(esquema.categoriasProductos).where(eq(esquema.categoriasProductos.id, categoriaId));
  if (marcaId) await db.delete(esquema.marcasProductos).where(eq(esquema.marcasProductos.id, marcaId));
  if (usuarioId) {
    await db.delete(esquema.usuarios).where(eq(esquema.usuarios.id, usuarioId));
  }
  const clientes = personasCreadas.length ? await db.select({ id: esquema.clientes.personaId }).from(esquema.clientes).where(inArray(esquema.clientes.personaId, personasCreadas)) : [];
  if (clientes.length) await db.delete(esquema.clientes).where(inArray(esquema.clientes.personaId, clientes.map((fila) => fila.id)));
  if (personasCreadas.length) {
    await db.delete(esquema.trabajadores).where(inArray(esquema.trabajadores.personaId, personasCreadas));
    await db.delete(esquema.personas).where(inArray(esquema.personas.id, personasCreadas));
  }
  await cerrarBaseDatos();
});
