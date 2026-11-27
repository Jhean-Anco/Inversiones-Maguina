import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { ServicioIngresos } from "./ingresos.service";

/*
 * Integración de órdenes de servicio, cotizaciones, clientes, series, guías y búsquedas contra PostgreSQL (magina_test).
 * NubeFact se simula con un fetch local; el archivado usa un almacenamiento falso.
 */
const url = new URL(process.env.DATABASE_URL ?? "");
assert.equal(process.env.NODE_ENV, "test");
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname));
assert.equal(url.pathname, "/magina_test");
assert.equal(url.username, "ci");
assert.equal(process.env.NUBEFACT_RUTA, "https://example.invalid/api");

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

const almacenamiento = {
  async archivarDocumentosNubeFact() { return { guardados: [], errores: [] }; },
  async archivarDocumentoNotaVenta(venta: { id: string; codigo: string }) { return { id: randomUUID(), nombre: `${venta.codigo}.html`, ruta: `/archivos/${venta.id}/contenido` }; },
};
const servicio = new ServicioIngresos(almacenamiento as never);

const fetchOriginal = globalThis.fetch;
const fetchProhibido = (async (entrada: URL | RequestInfo) => { throw new Error(`Llamada de red no simulada: ${String(entrada)}`); }) as typeof fetch;
let llamadas: Record<string, unknown>[] = [];
function simularNubefact(responder: (cuerpo: Record<string, unknown>) => Response) {
  llamadas = [];
  globalThis.fetch = (async (entrada: URL | RequestInfo, init?: RequestInit) => {
    assert.equal(String(entrada), "https://example.invalid/api");
    const cuerpo = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    llamadas.push(cuerpo);
    return responder(cuerpo);
  }) as typeof fetch;
}
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
const aceptada = () => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/doc.pdf" });

const hoy = fechaActualPeru();
const diasAtras = (dias: number) => fechaActualPeru(new Date(Date.now() - dias * 86_400_000));
const diasAdelante = (dias: number) => fechaActualPeru(new Date(Date.now() + dias * 86_400_000));
const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
const SERIES = { BOLETA: "BIT1", NOTA_VENTA: "NIT1", ORDEN_SERVICIO: "OIT1", COTIZACION: "CIT1", GUIA_REMITENTE: "TIT1" } as const;

let usuarioId: string;
let tipos: { natural: string; juridica: string; dni: string; ruc: string; ce: string };
let unidadCodigo: string;
let listaGeneralId: string;
let categoriaId: string;
let marcaId: string;
let cuentaEfectivo: string;
let cliente: { id: string; documento: string; nombre: string };
let otroCliente: { id: string; documento: string; nombre: string };
const personasCreadas: string[] = [];
const productosCreados: string[] = [];
const cuentasCreadas: string[] = [];
const ingresosDirectos: string[] = [];
const guiasCreadas: string[] = [];

function numeroAleatorio(digitos: number) {
  return String(BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`) % 10n ** BigInt(digitos)).padStart(digitos, "0");
}
function rucConDigito(prefijo: "10" | "20", cuerpo = numeroAleatorio(8)) {
  const base = `${prefijo}${cuerpo}`;
  const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0);
  const resto = 11 - (suma % 11);
  return `${base}${resto === 10 ? 0 : resto === 11 ? 1 : resto}`;
}
async function crearPersona(valores: { ruc?: string; dni?: string; nombres?: string; razonSocial?: string; apellidoPaterno?: string; apellidoMaterno?: string }) {
  const [persona] = await db.insert(esquema.personas).values(valores.razonSocial
    ? { tipoPersonaId: tipos.juridica, tipoDocumentoId: tipos.ruc, numeroDocumento: valores.ruc ?? rucConDigito("20"), razonSocial: valores.razonSocial }
    : { tipoPersonaId: tipos.natural, tipoDocumentoId: valores.ruc ? tipos.ruc : tipos.dni, numeroDocumento: valores.ruc ?? valores.dni ?? numeroAleatorio(8), nombres: valores.nombres ?? `Persona${sufijo}`, apellidoPaterno: valores.apellidoPaterno ?? "Prueba", apellidoMaterno: valores.apellidoMaterno ?? null })
    .returning({ id: esquema.personas.id, numeroDocumento: esquema.personas.numeroDocumento });
  personasCreadas.push(persona.id);
  return persona;
}
async function crearCliente(nombres: string, direccion: string | null = "Jr. Gestión 321") {
  const persona = await crearPersona({ nombres });
  await db.insert(esquema.clientes).values({ personaId: persona.id, direccionFiscal: direccion, telefono: "987654321", correo: `${nombres.toLowerCase()}@example.invalid` });
  return { id: persona.id, documento: persona.numeroDocumento, nombre: `${nombres} Prueba` };
}
async function crearProducto(precio = "10.00", stock = 20) {
  const codigo = `QAG-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const [producto] = await db.insert(esquema.productos).values({ codigoInterno: codigo, nombre: `Pieza ${sufijo} ${codigo}`, descripcion: `Descripción técnica ${sufijo}`, categoriaId, marcaId, unidadBaseCodigo: unidadCodigo }).returning({ id: esquema.productos.id });
  productosCreados.push(producto.id);
  const [presentacion] = await db.insert(esquema.productosPresentaciones).values({ productoId: producto.id, unidadMedidaCodigo: unidadCodigo, nombre: "Unidad", factorAUnidadBase: "1.000000", seCompra: true, seVende: true, esBase: true }).returning({ id: esquema.productosPresentaciones.id });
  await db.insert(esquema.preciosProductos).values({ productoId: producto.id, presentacionId: presentacion.id, tipoListaPrecioId: listaGeneralId, precio, cantidadMinima: "1.000" });
  await db.insert(esquema.saldosStock).values({ productoId: producto.id, cantidad: stock.toFixed(6) });
  return { productoId: producto.id, presentacionId: presentacion.id, codigo };
}
async function asegurarSerie(tipo: string, serie: string) {
  const [activa] = await db.select({ serie: esquema.seriesComprobantes.serie }).from(esquema.seriesComprobantes)
    .where(and(eq(esquema.seriesComprobantes.tipoComprobante, tipo), eq(esquema.seriesComprobantes.activa, true))).limit(1);
  if (activa) return activa.serie;
  await servicio.guardarSerieConfigurada({ tipoComprobante: tipo, serie, ultimoNumero: 0 });
  return serie;
}
async function asegurarSeries() { for (const [tipo, serie] of Object.entries(SERIES)) await asegurarSerie(tipo, serie); }
async function rechazaCon(promesa: Promise<unknown>, tipo: new (...args: never[]) => Error, mensaje: RegExp) {
  await assert.rejects(promesa, (error: unknown) => {
    assert.ok(error instanceof tipo, `Se esperaba ${tipo.name} y se obtuvo ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`);
    assert.match((error as Error).message, mensaje);
    return true;
  });
}
const trabajo = (precio = 50, extra: Record<string, unknown> = {}) => ({ tipo: "SERVICIO", descripcion: `Trabajo ${sufijo}`, cantidad: 1, precioUnitario: precio, afectacionIgv: "INAFECTO", ...extra });

before(async () => {
  restaurarEntorno();
  globalThis.fetch = fetchProhibido;
  esquema = await import("@magina/database");
  ({ db, cerrarBaseDatos } = esquema);
  const tiposPersona = await db.select().from(esquema.tiposPersona);
  const tiposDocumento = await db.select().from(esquema.tiposDocumento);
  const id = (filas: { id: string; codigo: string }[], codigo: string) => filas.find((fila) => fila.codigo === codigo)!.id;
  tipos = { natural: id(tiposPersona, "NATURAL"), juridica: id(tiposPersona, "JURIDICA"), dni: id(tiposDocumento, "01"), ruc: id(tiposDocumento, "06"), ce: id(tiposDocumento, "04") };
  const [unidad] = await db.select({ codigo: esquema.unidadesMedida.codigo }).from(esquema.unidadesMedida).where(eq(esquema.unidadesMedida.activo, true)).limit(1);
  unidadCodigo = unidad.codigo;
  const [lista] = await db.select({ id: esquema.tiposListasPrecio.id }).from(esquema.tiposListasPrecio).where(eq(esquema.tiposListasPrecio.codigo, "GENERAL"));
  listaGeneralId = lista.id;
  const personaUsuario = await crearPersona({ nombres: `Usuario${sufijo}` });
  await db.insert(esquema.trabajadores).values({ personaId: personaUsuario.id, fechaIngreso: hoy });
  const [usuario] = await db.insert(esquema.usuarios).values({ trabajadorId: personaUsuario.id, nombreUsuario: `qa_gestion_${sufijo.toLowerCase()}`, correo: `qa-gestion-${sufijo.toLowerCase()}@example.invalid`, contrasenaHash: "hash-ficticio", requiereCambioContrasena: false }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;
  const [categoria] = await db.insert(esquema.categoriasProductos).values({ nombre: `QA gestión ${sufijo}` }).returning({ id: esquema.categoriasProductos.id });
  categoriaId = categoria.id;
  const [marca] = await db.insert(esquema.marcasProductos).values({ nombre: `QA gestión ${sufijo}`, uso: "REPUESTOS" }).returning({ id: esquema.marcasProductos.id });
  marcaId = marca.id;
  const [cuenta] = await db.insert(esquema.cuentasFinancieras).values({ tipo: "EFECTIVO", nombre: `QA caja gestión ${sufijo}`, moneda: "PEN", usuarioId }).returning({ id: esquema.cuentasFinancieras.id });
  cuentasCreadas.push(cuenta.id);
  cuentaEfectivo = cuenta.id;
  cliente = await crearCliente(`Gestion${sufijo}`);
  otroCliente = await crearCliente(`Otro${sufijo}`);
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
    return crearOriginal(valor && typeof valor === "object" ? { ...valor, idempotencyKey: nuevaClave } : valor, usuario, lineas);
  }
}) as typeof servicio.crear;

beforeEach(async () => { await asegurarSeries(); });
afterEach(() => { globalThis.fetch = fetchProhibido; restaurarEntorno(); });

describe("series y numeraciones", () => {
  test("guarda series internas y fiscales, desactiva la anterior y expone la siguiente numeración", async () => {
    const serieAnterior = (await servicio.listarSeriesConfiguradas()).find((fila) => fila.tipoComprobante === "COTIZACION" && fila.activa)?.serie;
    assert.ok(serieAnterior);
    const internas = await servicio.guardarSerieConfigurada({ tipoComprobante: "COTIZACION", serie: "cit2", ultimoNumero: 0 });
    assert.deepEqual({ ...internas, ultimoNumero: undefined }, { tipoComprobante: "COTIZACION", serie: "CIT2", activa: true, ultimoNumero: undefined });
    let series = await servicio.listarSeriesConfiguradas();
    assert.equal(series.find((fila) => fila.tipoComprobante === "COTIZACION" && fila.activa)?.serie, "CIT2");
    if (serieAnterior !== "CIT2") assert.equal(series.find((fila) => fila.tipoComprobante === "COTIZACION" && fila.serie === serieAnterior)?.activa, false);
    await servicio.guardarSerieConfigurada({ tipoComprobante: "COTIZACION", serie: "CIT1" });
    const fiscal = await servicio.guardarSerieConfigurada({ tipoComprobante: "GUIA_REMITENTE", serie: "TIT1", ultimoNumero: 3 });
    assert.ok(fiscal.ultimoNumero >= 3);
    series = await servicio.listarSeriesConfiguradas();
    assert.equal(series.find((fila) => fila.serie === "TIT1" && fila.tipoComprobante === "GUIA_REMITENTE")?.ultimoNumero, fiscal.ultimoNumero);
    assert.ok(series.every((fila) => fila.tipoComprobante !== "GUIA_TRANSPORTISTA"));

    const numeraciones = await servicio.obtenerNumeraciones();
    assert.equal(numeraciones.COTIZACION.serie, "CIT1");
    assert.equal(numeraciones.COTIZACION.codigo, `CIT1-${String(numeraciones.COTIZACION.numero).padStart(6, "0")}`);
    assert.equal(numeraciones.COTIZACION.aplicaIgv, false);
    assert.equal(numeraciones.GUIA_REMITENTE.numero, fiscal.ultimoNumero + 1);
    assert.ok(numeraciones.BOLETA.codigo?.startsWith(`${numeraciones.BOLETA.serie}-`));
    assert.ok(numeraciones.NOTA_VENTA.numero && numeraciones.ORDEN_SERVICIO.numero);

    await db.update(esquema.seriesComprobantes).set({ activa: false }).where(eq(esquema.seriesComprobantes.tipoComprobante, "GUIA_REMITENTE"));
    const sinGuia = await servicio.obtenerNumeraciones();
    assert.deepEqual(sinGuia.GUIA_REMITENTE, { serie: null, numero: null, codigo: null });
    await rechazaCon(servicio.emitirGuia({ tipo: "REMITENTE" }, usuarioId), BadRequestException, /Configura una serie activa para guia_remitente/);
  });
});

describe("órdenes de servicio", () => {
  test("crea, lista y actualiza órdenes validando cliente, fechas y adelantos", async () => {
    const base = { clienteId: cliente.id, vehiculoPlaca: "abc-123", fechaRecepcion: hoy, fechaAcabado: diasAdelante(0), motivo: "Ruido en motor", detalles: [trabajo(50)] };
    await rechazaCon(servicio.crearOrdenServicio({ ...base, clienteId: randomUUID() }, usuarioId), NotFoundException, /no está activo/);
    await rechazaCon(servicio.crearOrdenServicio({ ...base, vehiculoPlaca: "" }, usuarioId), BadRequestException, /placa o identificador/);
    await rechazaCon(servicio.crearOrdenServicio({ ...base, fechaRecepcion: diasAdelante(2) }, usuarioId), BadRequestException, /no futura/);
    await rechazaCon(servicio.crearOrdenServicio({ ...base, fechaRecepcion: hoy, fechaAcabado: diasAtras(1) }, usuarioId), BadRequestException, /anterior a la fecha de recepción/);
    await rechazaCon(servicio.crearOrdenServicio({ ...base, adelanto: 10 }, usuarioId), BadRequestException, /medio de pago del adelanto/);
    await rechazaCon(servicio.crearOrdenServicio({ ...base, adelanto: 10, adelantoMedioPago: "TARJETA", adelantoCuentaFinancieraId: cuentaEfectivo }, usuarioId), BadRequestException, /no coincide/);

    const orden = await servicio.crearOrdenServicio({ ...base, adelanto: 20, adelantoMedioPago: "EFECTIVO", adelantoCuentaFinancieraId: cuentaEfectivo, diagnostico: "Bujía gastada" }, usuarioId);
    assert.equal(orden.vehiculoPlaca, "ABC-123");
    assert.equal(orden.adelanto, "20.00");
    assert.match(orden.codigo, /^[A-Z0-9]{1,4}-\d{6}$/);
    assert.equal(orden.estado, "ABIERTA");
    assert.deepEqual(orden.detalles, [{ tipo: "SERVICIO", descripcion: `Trabajo ${sufijo}`, cantidad: "1.000", precioUnitario: "50.0000", descuento: "0.00", afectacionIgv: "INAFECTO", nombreVisible: `Trabajo ${sufijo}` }]);
    const listado = await servicio.listarOrdenesServicio(" abc-123 ");
    const fila = listado.find((item) => item.id === orden.id);
    assert.deepEqual([fila?.clienteNombre, fila?.clienteTelefono], [cliente.nombre, "987654321"]);
    assert.ok((await servicio.listarOrdenesServicio()).length >= 1);

    await rechazaCon(servicio.actualizarOrdenServicio(randomUUID(), {}, usuarioId), NotFoundException, /No se encontró la orden/);
    await rechazaCon(servicio.actualizarOrdenServicio(orden.id, { estado: "FACTURADA" }, usuarioId), BadRequestException, /estado válido para la orden/);
    await rechazaCon(servicio.actualizarOrdenServicio(orden.id, { fechaAcabado: "2000-01-01" }, usuarioId), BadRequestException, /anterior a la fecha de recepción/);
    const actualizada = await servicio.actualizarOrdenServicio(orden.id, { estado: "EN_PROCESO", notaAvance: "Se desmontó el motor", motivo: "Ruido fuerte", diagnostico: null, detalles: [trabajo(60)] }, usuarioId);
    assert.deepEqual([actualizada.estado, actualizada.motivo, actualizada.diagnostico, actualizada.notasTrabajo.length, actualizada.notasTrabajo[0].texto], ["EN_PROCESO", "Ruido fuerte", null, 1, "Se desmontó el motor"]);
    const sinAdelanto = await servicio.actualizarOrdenServicio(orden.id, { adelanto: 0, notaAvance: "  " }, usuarioId);
    assert.deepEqual([sinAdelanto.adelanto, sinAdelanto.adelantoMedioPago, sinAdelanto.adelantoCuentaFinancieraId, sinAdelanto.notasTrabajo.length], ["0.00", null, null, 1]);
    const conAdelanto = await servicio.actualizarOrdenServicio(orden.id, { adelanto: 15, adelantoMedioPago: "EFECTIVO", adelantoCuentaFinancieraId: cuentaEfectivo }, usuarioId);
    assert.equal(conAdelanto.adelanto, "15.00");
    assert.equal((await servicio.actualizarOrdenServicio(orden.id, { adelanto: 16 }, usuarioId)).adelantoCuentaFinancieraId, cuentaEfectivo);
    await db.update(esquema.ordenesServicio).set({ estado: "ANULADA" }).where(eq(esquema.ordenesServicio.id, orden.id));
    await rechazaCon(servicio.actualizarOrdenServicio(orden.id, {}, usuarioId), ConflictException, /ya no admite cambios/);
  });

  test("emitir una orden genera la boleta, registra adelanto y saldo, y la marca facturada", async () => {
    const orden = await servicio.crearOrdenServicio({ clienteId: cliente.id, vehiculoPlaca: "MOT-1", fechaRecepcion: hoy, fechaAcabado: hoy, detalles: [trabajo(50)], adelanto: 20, adelantoMedioPago: "EFECTIVO", adelantoCuentaFinancieraId: cuentaEfectivo }, usuarioId);
    simularNubefact(() => aceptada());
    const emitida = await servicio.emitirOrdenServicio(orden.id, { tipoComprobante: "BOLETA", saldoMedioPago: "EFECTIVO", saldoCuentaFinancieraId: cuentaEfectivo }, usuarioId);
    assert.equal(emitida.ingreso.estado, "EMITIDO");
    assert.equal(emitida.ingreso.total, "50.00");
    assert.match(String(llamadas[0].observaciones), new RegExp(`Orden de servicio ${orden.codigo} · Vehículo MOT-1`));
    const [guardada] = await db.select().from(esquema.ordenesServicio).where(eq(esquema.ordenesServicio.id, orden.id));
    assert.deepEqual([guardada.estado, guardada.ingresoId, guardada.fechaCierre], ["FACTURADA", emitida.ingreso.id, hoy]);
    const pagos = await servicio.listarPagos(String(emitida.ingreso.id));
    assert.deepEqual(pagos.items.map((pago) => pago.importeAplicado).sort(), ["20.00", "30.00"]);
    assert.equal(pagos.saldoPendiente, "0.00");
    await rechazaCon(servicio.emitirOrdenServicio(orden.id, {}, usuarioId), ConflictException, /ya fue cerrada/);
  });

  test("una orden pagada por completo con el adelanto usa su medio y una venta inválida revierte la orden", async () => {
    const pagada = await servicio.crearOrdenServicio({ clienteId: cliente.id, vehiculoPlaca: "MOT-2", fechaRecepcion: hoy, fechaAcabado: hoy, detalles: [trabajo(30)], adelanto: 30, adelantoMedioPago: "EFECTIVO", adelantoCuentaFinancieraId: cuentaEfectivo, motivo: " " }, usuarioId);
    const resultado = await servicio.emitirOrdenServicio(pagada.id, { tipoComprobante: "NOTA_VENTA", medioPago: "TARJETA" }, usuarioId);
    assert.equal(resultado.ingreso.tipoComprobante, "NOTA_VENTA");
    const [venta] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, String(resultado.ingreso.id)));
    assert.equal(venta.medioPago, "EFECTIVO");
    assert.equal(venta.observacion, `Orden de servicio ${pagada.codigo} · Vehículo MOT-2`);

    const excedida = await servicio.crearOrdenServicio({ clienteId: cliente.id, vehiculoPlaca: "MOT-3", fechaRecepcion: hoy, fechaAcabado: hoy, detalles: [trabajo(10)], adelanto: 30, adelantoMedioPago: "EFECTIVO", adelantoCuentaFinancieraId: cuentaEfectivo }, usuarioId);
    await rechazaCon(servicio.emitirOrdenServicio(excedida.id, {}, usuarioId), BadRequestException, /adelanto no puede superar/);
    const [revertida] = await db.select().from(esquema.ordenesServicio).where(eq(esquema.ordenesServicio.id, excedida.id));
    assert.equal(revertida.estado, "COMPLETADA");
  });

  test("vincula una venta registrada con la orden solo si coincide en tipo, cliente, total y líneas", async () => {
    const producto = await crearProducto();
    const detalles = [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, precioUnitario: 10, afectacionIgv: "GRAVADO" }, trabajo(40)];
    const orden = await servicio.crearOrdenServicio({ clienteId: cliente.id, vehiculoPlaca: "MOT-4", fechaRecepcion: hoy, fechaAcabado: hoy, detalles }, usuarioId);
    const venta = (extra: Record<string, unknown> = {}) => servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: cliente.id, medioPago: "EFECTIVO", ordenServicioId: orden.id,
      detalles: orden.detalles.map((linea) => ({ ...linea, precioUnitario: Number(linea.precioUnitario) })), ...extra }, usuarioId);
    await rechazaCon(venta({ ordenServicioId: "x" }), BadRequestException, /orden de servicio asociada no es válida/);
    await rechazaCon(venta({ ordenServicioId: randomUUID() }), ConflictException, /no corresponde al cliente/);
    await rechazaCon(venta({ clienteId: otroCliente.id }), ConflictException, /no corresponde al cliente/);
    await rechazaCon(venta({ detalles: [trabajo(40)] }), BadRequestException, /deben corresponder a las líneas/);
    await rechazaCon(venta({ detalles: [{ ...detalles[0], precioUnitario: undefined }, trabajo(40)] }), BadRequestException, /conservar el precio cotizado/);
    await rechazaCon(venta({ detalles: [{ ...detalles[0], cantidad: 2 }, trabajo(40)] }), BadRequestException, /repuesto no coincide/);
    await rechazaCon(venta({ detalles: [{ ...detalles[0], precioUnitario: 11 }, trabajo(40)] }), BadRequestException, /cambiar el precio cotizado/);
    await rechazaCon(venta({ detalles: [detalles[0], trabajo(41)] }), BadRequestException, /servicio no coincide/);
    const registrada = await venta();
    assert.equal(registrada.total, "50.00");

    const emitir = (datos: Record<string, unknown>) => servicio.emitirOrdenServicio(orden.id, { tipoComprobante: "NOTA_VENTA", saldoMedioPago: "EFECTIVO", saldoCuentaFinancieraId: cuentaEfectivo, ...datos }, usuarioId);
    await rechazaCon(emitir({ ingresoId: randomUUID() }), NotFoundException, /No se encontró la venta emitida/);
    await rechazaCon(emitir({ ingresoId: registrada.id, tipoComprobante: "BOLETA" }), ConflictException, /no coincide con el tipo/);
    const otraLinea = await servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [trabajo(50)] }, usuarioId);
    await rechazaCon(emitir({ ingresoId: otraLinea.id }), ConflictException, /líneas emitidas no coinciden/);
    const lineaExtra = await servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [{ ...detalles[0], precioUnitario: undefined }, trabajo(30), trabajo(10, { descripcion: "Extra" })] }, usuarioId);
    await rechazaCon(emitir({ ingresoId: lineaExtra.id }), ConflictException, /no coinciden|no pertenecen/);
    const boletaPendiente = await db.insert(esquema.ingresos).values({ codigo: `QAG-${randomUUID()}`.slice(0, 40), fecha: hoy, tipoComprobante: "BOLETA", clienteId: cliente.id, medioPago: "EFECTIVO", subtotal: "50.00", igv: "0.00", total: "50.00", estado: "ERROR_NUBEFACT", usuarioId }).returning({ id: esquema.ingresos.id });
    ingresosDirectos.push(boletaPendiente[0].id);
    await rechazaCon(emitir({ ingresoId: boletaPendiente[0].id, tipoComprobante: "BOLETA" }), ConflictException, /aún no fue confirmado/);
    const vinculada = await emitir({ ingresoId: registrada.id });
    assert.deepEqual(vinculada.ingreso, { id: registrada.id, codigo: registrada.codigo, tipoComprobante: "NOTA_VENTA", total: "50.00", estado: "REGISTRADO" });
  });

  test("emite directamente órdenes y cotizaciones con repuestos conservando el precio registrado", async () => {
    const producto = await crearProducto("10.00");
    const detalles = [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, precioUnitario: 10 }, trabajo(40)];
    const orden = await servicio.crearOrdenServicio({ clienteId: cliente.id, vehiculoPlaca: "REP-1", fechaRecepcion: hoy, fechaAcabado: hoy, detalles }, usuarioId);
    const resultado = await servicio.emitirOrdenServicio(orden.id, { tipoComprobante: "NOTA_VENTA", saldoMedioPago: "EFECTIVO", saldoCuentaFinancieraId: cuentaEfectivo }, usuarioId);
    assert.equal(resultado.ingreso.total, "50.00");
    const salidas = await db.select().from(esquema.movimientosStock).where(eq(esquema.movimientosStock.origenId, String(resultado.ingreso.id)));
    assert.deepEqual(salidas.map((fila) => [fila.productoId, Number(fila.cantidadBase)]), [[producto.productoId, 1]]);

    const cotizacion = await servicio.crearCotizacion({ clienteId: cliente.id, detalles }, usuarioId);
    simularNubefact(() => aceptada());
    const convertida = await servicio.convertirCotizacion(cotizacion.id, { medioPago: "EFECTIVO" }, usuarioId);
    assert.deepEqual([convertida.ingreso.total, convertida.ingreso.estado], ["50.00", "EMITIDO"]);
    // Una venta directa sigue sin poder imponer el precio de un repuesto.
    await rechazaCon(servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [{ ...detalles[0], precioUnitario: 1, afectacionIgv: "GRAVADO" }] }, usuarioId), BadRequestException, /repuesto no coincide/);
  });
});

describe("cotizaciones", () => {
  test("crea, lista, actualiza y cambia el estado de cotizaciones", async () => {
    await rechazaCon(servicio.crearCotizacion({ clienteId: randomUUID(), detalles: [trabajo()] }, usuarioId), NotFoundException, /no esta activo/);
    const anonima = await servicio.crearCotizacion({ detalles: [trabajo(25)], observacion: "Precio referencial", vigenteHasta: diasAdelante(5) }, usuarioId);
    assert.deepEqual([anonima.clienteId, anonima.estado, anonima.aplicaIgv, anonima.observacion], [null, "BORRADOR", false, "Precio referencial"]);
    const conCliente = await servicio.crearCotizacion({ clienteId: cliente.id, detalles: [trabajo(35)] }, usuarioId);
    const listado = await servicio.listarCotizaciones(cliente.nombre.split(" ")[0]);
    assert.equal(listado.find((item) => item.id === conCliente.id)?.clienteNombre, cliente.nombre);
    assert.equal((await servicio.listarCotizaciones(anonima.codigo))[0]?.clienteNombre, null);
    assert.ok((await servicio.listarCotizaciones()).length >= 2);

    await rechazaCon(servicio.actualizarCotizacion(randomUUID(), {}), NotFoundException, /No se encontró la cotización/);
    await rechazaCon(servicio.actualizarCotizacion(anonima.id, { clienteId: "x" }), BadRequestException, /cliente seleccionado no es válido/);
    await rechazaCon(servicio.actualizarCotizacion(anonima.id, { clienteId: randomUUID() }), NotFoundException, /no está activo/);
    await rechazaCon(servicio.actualizarCotizacion(anonima.id, { vigenteHasta: "2026-02-31" }), BadRequestException, /vigencia no es válida/);
    await rechazaCon(servicio.actualizarCotizacion(anonima.id, { vigenteHasta: diasAtras(1) }), BadRequestException, /anterior a la emisión/);
    const actualizada = await servicio.actualizarCotizacion(anonima.id, { clienteId: cliente.id, detalles: [trabajo(30)], observacion: null, vigenteHasta: null });
    assert.deepEqual([actualizada.clienteId, actualizada.observacion, actualizada.vigenteHasta, actualizada.aplicaIgv], [cliente.id, null, null, false]);
    assert.equal((await servicio.actualizarCotizacion(anonima.id, { clienteId: cliente.id })).clienteId, cliente.id);
    assert.equal((await servicio.actualizarCotizacion(anonima.id, { clienteId: "" })).clienteId, null);
    assert.equal((await servicio.cambiarEstadoCotizacion(anonima.id, { estado: "ENVIADA" })).estado, "ENVIADA");
    assert.equal((await servicio.cambiarEstadoCotizacion(anonima.id, { estado: "RECHAZADA" })).estado, "RECHAZADA");
    await rechazaCon(servicio.cambiarEstadoCotizacion(anonima.id, { estado: "ACEPTADA" }), NotFoundException, /ya fue convertida/);
    await rechazaCon(servicio.actualizarCotizacion(anonima.id, {}), ConflictException, /ya no admite cambios/);
  });

  test("convierte una cotización vigente en boleta y valida vencimiento y precios", async () => {
    await rechazaCon(servicio.convertirCotizacion(randomUUID(), {}, usuarioId), NotFoundException, /No se encontró la cotización/);
    const vencida = await servicio.crearCotizacion({ detalles: [trabajo()], vigenteHasta: diasAtras(1) }, usuarioId);
    await rechazaCon(servicio.convertirCotizacion(vencida.id, {}, usuarioId), ConflictException, /La cotización venció/);
    const producto = await crearProducto("12.00");
    const precioCambiado = await servicio.crearCotizacion({ detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, precioUnitario: 11 }] }, usuarioId);
    await rechazaCon(servicio.convertirCotizacion(precioCambiado.id, {}, usuarioId), ConflictException, /Cambió el precio de un repuesto/);
    const sinPrecio = await servicio.crearCotizacion({ detalles: [{ tipo: "PRODUCTO", presentacionId: randomUUID(), cantidad: 1, precioUnitario: 11 }] }, usuarioId);
    await rechazaCon(servicio.convertirCotizacion(sinPrecio.id, {}, usuarioId), ConflictException, /Cambió el precio/);

    const cotizacion = await servicio.crearCotizacion({ clienteId: cliente.id, detalles: [trabajo(45)], observacion: "Incluye revisión" }, usuarioId);
    await rechazaCon(servicio.convertirCotizacion(cotizacion.id, { tipoComprobante: "TICKET" }, usuarioId), BadRequestException, /boleta, factura o nota de venta/);
    const [revertida] = await db.select().from(esquema.cotizaciones).where(eq(esquema.cotizaciones.id, cotizacion.id));
    assert.equal(revertida.estado, "ACEPTADA");
    simularNubefact(() => aceptada());
    const convertida = await servicio.convertirCotizacion(cotizacion.id, { medioPago: "EFECTIVO" }, usuarioId);
    assert.equal(convertida.ingreso.estado, "EMITIDO");
    assert.equal(llamadas[0].observaciones, `Cotización ${cotizacion.codigo} · Incluye revisión`);
    const [guardada] = await db.select().from(esquema.cotizaciones).where(eq(esquema.cotizaciones.id, cotizacion.id));
    assert.deepEqual([guardada.estado, guardada.ingresoId], ["CONVERTIDA", convertida.ingreso.id]);
    const listado = await servicio.listarCotizaciones(cotizacion.codigo);
    assert.deepEqual([listado[0].ingresoEstado, listado[0].ingresoTipoComprobante], ["EMITIDO", "BOLETA"]);
    await rechazaCon(servicio.convertirCotizacion(cotizacion.id, {}, usuarioId), ConflictException, /ya no puede convertirse/);
  });

  test("una venta con cotizacionId respeta su cliente y estado y la marca convertida", async () => {
    const nota = (extra: Record<string, unknown>) => servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [trabajo(20)], ...extra }, usuarioId);
    await rechazaCon(nota({ cotizacionId: "x" }), BadRequestException, /cotización asociada no es válida/);
    await rechazaCon(nota({ cotizacionId: randomUUID() }), NotFoundException, /No se encontró la cotización asociada/);
    const rechazada = await servicio.crearCotizacion({ detalles: [trabajo(20)] }, usuarioId);
    await servicio.cambiarEstadoCotizacion(rechazada.id, { estado: "RECHAZADA" });
    await rechazaCon(nota({ cotizacionId: rechazada.id }), ConflictException, /no está disponible/);
    const vencida = await servicio.crearCotizacion({ detalles: [trabajo(20)], vigenteHasta: diasAtras(2) }, usuarioId);
    await rechazaCon(nota({ cotizacionId: vencida.id }), ConflictException, /venció/);
    const deOtro = await servicio.crearCotizacion({ clienteId: otroCliente.id, detalles: [trabajo(20)] }, usuarioId);
    await rechazaCon(nota({ cotizacionId: deOtro.id }), ConflictException, /conservar el cliente/);
    const valida = await servicio.crearCotizacion({ clienteId: cliente.id, detalles: [trabajo(20)] }, usuarioId);
    const venta = await nota({ cotizacionId: valida.id });
    const [guardada] = await db.select().from(esquema.cotizaciones).where(eq(esquema.cotizaciones.id, valida.id));
    assert.deepEqual([guardada.estado, guardada.ingresoId], ["CONVERTIDA", venta.id]);
    const paraBoleta = await servicio.crearCotizacion({ clienteId: cliente.id, detalles: [trabajo(20)] }, usuarioId);
    simularNubefact(() => aceptada());
    const boleta = await servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "BOLETA", clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [trabajo(20)], cotizacionId: paraBoleta.id }, usuarioId);
    const [convertida] = await db.select().from(esquema.cotizaciones).where(eq(esquema.cotizaciones.id, paraBoleta.id));
    assert.equal(convertida.ingresoId, boleta.id);
  });
});

describe("clientes", () => {
  test("registra personas naturales, empresas y RUC 10 vinculando su DNI", async () => {
    const dni = numeroAleatorio(8);
    const nuevo = await servicio.registrarCliente({ tipoDocumento: "DNI", numeroDocumento: dni, nombres: "Lucía", apellidoPaterno: "Quispe", apellidoMaterno: "Rojas", fechaNacimiento: "1990-05-10", direccion: "Av. Sol 1", correo: "lucia@example.invalid", telefono: "+51 987 654 321" });
    personasCreadas.push(nuevo.id);
    assert.equal(nuevo.creado, true);
    assert.deepEqual(await servicio.registrarCliente({ tipoDocumento: "DNI", numeroDocumento: dni, nombres: "Lucía", apellidoPaterno: "Quispe", fechaNacimiento: "1991-01-01" }), { id: nuevo.id, creado: false });
    const [persona] = await db.select().from(esquema.personas).where(eq(esquema.personas.id, nuevo.id));
    assert.equal(persona.fechaNacimiento, "1991-01-01");
    const ruc10 = rucConDigito("10", dni);
    assert.deepEqual(await servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: ruc10, nombres: "lucia", apellidoPaterno: "QUISPE", apellidoMaterno: "Rojas" }), { id: nuevo.id, creado: false });
    const alias = await db.select().from(esquema.personasDocumentos).where(eq(esquema.personasDocumentos.personaId, nuevo.id));
    // El RUC 10 queda vinculado como documento secundario de la ficha que ya existía por su DNI.
    assert.deepEqual(alias.map((fila) => fila.numeroDocumento), [ruc10]);
    assert.deepEqual(await servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: ruc10, nombres: "Lucía", apellidoPaterno: "Quispe", apellidoMaterno: "Rojas" }), { id: nuevo.id, creado: false }, "El alias RUC encuentra a la misma persona.");
    const ajeno = numeroAleatorio(8);
    await crearPersona({ dni: ajeno, nombres: "Pedro", apellidoPaterno: "Ajeno" });
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: rucConDigito("10", ajeno), nombres: "Otro", apellidoPaterno: "Nombre" }), ConflictException, /DNI derivado de este RUC ya pertenece/);
    const conAlias = await crearPersona({ dni: numeroAleatorio(8), nombres: "Con", apellidoPaterno: "Alias" });
    const pasaporteAlias = `PA${numeroAleatorio(7)}`;
    const [tipoPasaporte] = await db.select({ id: esquema.tiposDocumento.id }).from(esquema.tiposDocumento).where(eq(esquema.tiposDocumento.codigo, "07"));
    await db.insert(esquema.personasDocumentos).values({ personaId: conAlias.id, tipoDocumentoId: tipoPasaporte.id, numeroDocumento: pasaporteAlias });
    assert.deepEqual(await servicio.registrarCliente({ tipoDocumento: "PASAPORTE", numeroDocumento: pasaporteAlias, nombres: "Con", apellidoPaterno: "Alias" }), { id: conAlias.id, creado: true }, "La persona con alias sin ficha de cliente se promueve a cliente.");
    const personaSinCliente = await crearPersona({ dni: numeroAleatorio(8), nombres: "Sin", apellidoPaterno: "Ficha" });
    assert.deepEqual(await servicio.registrarCliente({ tipoDocumento: "DNI", numeroDocumento: personaSinCliente.numeroDocumento, nombres: "Sin", apellidoPaterno: "Ficha" }), { id: personaSinCliente.id, creado: true });

    const dniNuevo = numeroAleatorio(8);
    const ruc10Nuevo = await servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: rucConDigito("10", dniNuevo), nombres: "Nuevo", apellidoPaterno: "Ruc", tipoPersona: "NATURAL" });
    personasCreadas.push(ruc10Nuevo.id);
    const documentos = await db.select().from(esquema.personasDocumentos).where(eq(esquema.personasDocumentos.personaId, ruc10Nuevo.id));
    assert.deepEqual(documentos.map((fila) => fila.numeroDocumento), [dniNuevo]);

    const rucConflicto = rucConDigito("10", numeroAleatorio(8));
    const principal = await crearPersona({ ruc: rucConflicto, nombres: "Dueño", apellidoPaterno: "Ruc" });
    await crearPersona({ dni: rucConflicto.slice(2, 10), nombres: "Dueño", apellidoPaterno: "Dni" });
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: rucConflicto, nombres: "Dueño", apellidoPaterno: "Ruc" }), ConflictException, /vinculado a otra ficha/);
    assert.ok(principal.id);

    const empresa = await servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: rucConDigito("20"), razonSocial: `Empresa ${sufijo} SAC`, nombreComercial: "Comercial QA", contactoNombre: "Ana", observacion: "VIP", direccionEntrega: "Almacén 2" });
    personasCreadas.push(empresa.id);
    assert.equal(empresa.creado, true);
    const pasaporte = await servicio.registrarCliente({ tipoDocumento: "PASAPORTE", numeroDocumento: `P${numeroAleatorio(8)}`, nombres: "John", apellidoPaterno: "Doe" });
    personasCreadas.push(pasaporte.id);
    const ce = await servicio.registrarCliente({ tipoDocumento: "CE", numeroDocumento: `C${numeroAleatorio(8)}`, nombres: "Ana", apellidoPaterno: "Extranjera" });
    personasCreadas.push(ce.id);
  });


  test("busca, lista y actualiza clientes activos con sus documentos", async () => {
    const documentoCe = `CE${numeroAleatorio(7)}`;
    await db.insert(esquema.personasDocumentos).values({ personaId: cliente.id, tipoDocumentoId: tipos.ce, numeroDocumento: documentoCe });
    const porCe = await servicio.buscarClientes(documentoCe);
    assert.equal(porCe.length, 1);
    assert.deepEqual(porCe[0].documentos, [{ tipoDocumento: "01", numeroDocumento: cliente.documento }, { tipoDocumento: "04", numeroDocumento: documentoCe }]);
    assert.equal((await servicio.buscarClientes(`Gestion${sufijo} Prueba`))[0]?.id, cliente.id);
    assert.deepEqual(await servicio.buscarClientes(`inexistente-${sufijo}`), []);
    assert.ok((await servicio.buscarClientes()).length > 0);

    const listado = await servicio.listarClientes("1", "1", sufijo);
    assert.ok(listado.total >= 2);
    assert.deepEqual([listado.items.length, listado.porPagina, listado.totalPaginas], [1, 1, listado.total]);
    const normalizado = await servicio.listarClientes("x", "999", `inexistente-${sufijo}`);
    assert.deepEqual([normalizado.pagina, normalizado.porPagina, normalizado.total, normalizado.items, normalizado.totalPaginas], [1, 50, 0, [], 1]);

    const actualizado = await servicio.actualizarCliente(otroCliente.id, { nombreComercial: "Taller Otro", correo: "nuevo@example.invalid", telefono: "999 888 777", direccion: "Calle Nueva 5", direccionEntrega: null, observacion: "Paga puntual" });
    assert.deepEqual([actualizado.nombreComercial, actualizado.correo, actualizado.direccion, actualizado.direccionEntrega, actualizado.observacion], ["Taller Otro", "nuevo@example.invalid", "Calle Nueva 5", null, "Paga puntual"]);
    await rechazaCon(servicio.actualizarCliente(randomUUID(), {}), NotFoundException, /no existe o ya no está activo/);
  });
});

describe("búsquedas de catálogo", () => {
  test("busca repuestos por texto, catálogo y código escaneado", async () => {
    const producto = await crearProducto("15.00");
    const barras = `77${numeroAleatorio(11)}`;
    await db.insert(esquema.productosCodigos).values({ productoId: producto.productoId, tipo: "BARRAS", codigo: barras });
    const porTexto = await servicio.buscarProductos(producto.codigo);
    assert.deepEqual([porTexto.length, porTexto[0].precio, porTexto[0].listaPrecioCodigo, Number(porTexto[0].stockBase)], [1, "15.00", "GENERAL", 20]);
    assert.equal("tramos" in porTexto[0], false);
    const paraVenta = await servicio.buscarProductos(producto.codigo, false, "abc", false, true);
    assert.deepEqual((paraVenta[0] as { tramos: unknown[] }).tramos, [{ precio: "15.00", cantidadMinima: "1.000", listaCodigo: "GENERAL", listaNombre: (paraVenta[0] as { tramos: { listaNombre: string }[] }).tramos[0].listaNombre }]);
    assert.ok((await servicio.buscarProductos("", true, "3")).length <= 3);
    assert.equal((await servicio.buscarProductos(`descripción técnica ${sufijo}`.toUpperCase())).length >= 1, true);
    assert.equal((await servicio.buscarProductos(barras, false, undefined, true))[0]?.productoId, producto.productoId);
    assert.equal((await servicio.buscarProductos(producto.codigo.toLowerCase(), false, undefined, true))[0]?.productoId, producto.productoId);
    assert.deepEqual(await servicio.buscarProductos(`NOEXISTE${sufijo}`, false, undefined, true), []);
    const otro = await crearProducto();
    await db.insert(esquema.productosCodigos).values({ productoId: otro.productoId, tipo: "GTIN", codigo: barras });
    assert.deepEqual(await servicio.buscarProductos(barras, false, undefined, true), [], "Un código ambiguo no selecciona ningún producto.");
  });
});

describe("guías de remisión", () => {
  let documento: { id: string; detalleId: string; codigo: string };
  let transportistaId: string;
  let conductorId: string;

  before(async () => {
    const producto = await crearProducto();
    simularNubefact(() => aceptada());
    const venta = await servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "BOLETA", clienteId: cliente.id, medioPago: "EFECTIVO",
      detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 3, afectacionIgv: "GRAVADO" }] }, usuarioId);
    globalThis.fetch = fetchProhibido;
    const [detalle] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, venta.id));
    documento = { id: venta.id, detalleId: detalle.id, codigo: venta.nubefact.codigo };
    const transportista = await crearPersona({ razonSocial: `Transportes ${sufijo} SAC` });
    await db.insert(esquema.transportistas).values({ personaId: transportista.id });
    transportistaId = transportista.id;
    const conductor = await crearPersona({ nombres: "Carlos", apellidoPaterno: "Chofer", apellidoMaterno: "Ruta" });
    await db.insert(esquema.conductores).values({ personaId: conductor.id, numeroLicencia: `Q${numeroAleatorio(8)}` });
    conductorId = conductor.id;
  });

  const datosGuia = (extra: Record<string, unknown> = {}) => ({ tipo: "REMITENTE", ingresoId: documento.id, fechaInicio: hoy, pesoBrutoTotal: 12.5, numeroBultos: 2, tipoTransporte: "02",
    items: [{ detalleId: documento.detalleId, cantidad: 2 }], partidaUbigeo: "150101", partidaDireccion: "Av. Origen 1", llegadaUbigeo: "010101", llegadaDireccion: "Jr. Destino 2",
    motivoTraslado: "01", placa: "abc123", conductorId, ...extra });

  test("busca y obtiene documentos de venta aptos para guía", async () => {
    const porCodigo = await servicio.buscarDocumentosParaGuia(documento.codigo.replace(/-0+/, "-"));
    assert.equal(porCodigo[0]?.id, documento.id);
    assert.equal(porCodigo[0]?.codigo, documento.codigo);
    assert.ok((await servicio.buscarDocumentosParaGuia(`Gestion${sufijo}`, "BOLETA")).some((fila) => fila.id === documento.id));
    assert.ok((await servicio.buscarDocumentosParaGuia(`Pieza ${sufijo}`)).some((fila) => fila.id === documento.id));
    assert.equal((await servicio.buscarDocumentosParaGuia(`Gestion${sufijo}`, "FACTURA")).length, 0);
    assert.ok((await servicio.buscarDocumentosParaGuia(undefined)).length <= 10);
    const detalle = await servicio.obtenerDocumentoParaGuia(documento.id);
    assert.deepEqual([detalle.clienteNombreCompleto, detalle.clienteDireccion, detalle.clienteTipoDocumento, detalle.detalles.length], [cliente.nombre, "Jr. Gestión 321", "01", 1]);
    await rechazaCon(servicio.obtenerDocumentoParaGuia(randomUUID()), NotFoundException, /documento de venta válido/);
    const ubigeos = await servicio.listarUbigeos();
    assert.ok(ubigeos.length > 1800);
    assert.deepEqual(Object.keys(ubigeos[0]).sort(), ["codigo", "departamento", "distrito", "provincia"]);
  });

  test("valida los datos de traslado, transportista y conductor", async () => {
    const emitir = (extra: Record<string, unknown>) => servicio.emitirGuia(datosGuia(extra), usuarioId);
    process.env.NUBEFACT_TOKEN = "";
    await rechazaCon(emitir({}), BadRequestException, /Configura la ruta y el token/);
    restaurarEntorno();
    await rechazaCon(emitir({ ingresoId: undefined }), BadRequestException, /comprobante de venta es obligatorio/);
    await rechazaCon(emitir({ fechaInicio: "2026/01/01" }), BadRequestException, /fecha de inicio del traslado no es válida/);
    await rechazaCon(emitir({ fechaInicio: diasAtras(1) }), BadRequestException, /no puede ser anterior a hoy/);
    await rechazaCon(emitir({ pesoBrutoTotal: 0 }), BadRequestException, /peso bruto total/);
    await rechazaCon(emitir({ numeroBultos: 1.5 }), BadRequestException, /número de bultos/);
    await rechazaCon(emitir({ tipoTransporte: "03" }), BadRequestException, /transporte público o privado/);
    await rechazaCon(emitir({ items: [] }), BadRequestException, /entre 1 y 100 bienes/);
    await rechazaCon(emitir({ items: [null] }), BadRequestException, /El bien 1 no es válido/);
    await rechazaCon(emitir({ items: [{ detalleId: randomUUID(), cantidad: 1 }] }), BadRequestException, /no pertenece al comprobante/);
    await rechazaCon(emitir({ items: [{ detalleId: documento.detalleId, cantidad: 1 }, { detalleId: documento.detalleId, cantidad: 1 }] }), BadRequestException, /El bien 2 no pertenece/);
    await rechazaCon(emitir({ items: [{ detalleId: documento.detalleId, cantidad: 4 }] }), BadRequestException, /supera la del comprobante/);
    await rechazaCon(emitir({ partidaUbigeo: "999999" }), BadRequestException, /departamento, provincia y distrito válidos/);
    await rechazaCon(emitir({ tipoTransporte: "01", fechaEntregaTransportista: "x" }), BadRequestException, /fecha de entrega al transportista no es válida/);
    await rechazaCon(emitir({ tipoTransporte: "01", fechaEntregaTransportista: hoy, transportistaId: "abc" }), BadRequestException, /transportista del catálogo/);
    await rechazaCon(emitir({ tipoTransporte: "01", fechaEntregaTransportista: hoy, transportistaId: randomUUID() }), BadRequestException, /transportista activo con RUC válido/);
    const naturalConRuc = await crearPersona({ ruc: rucConDigito("10"), nombres: "Fletero", apellidoPaterno: "Natural" });
    await db.insert(esquema.transportistas).values({ personaId: naturalConRuc.id });
    await rechazaCon(emitir({ tipoTransporte: "01", fechaEntregaTransportista: hoy, transportistaId: naturalConRuc.id }), BadRequestException, /razón social del transportista/);
    await rechazaCon(emitir({ conductorId: "x" }), BadRequestException, /conductor del catálogo/);
    await rechazaCon(emitir({ conductorId: randomUUID() }), BadRequestException, /no está activo en el catálogo/);
    const conductorRuc = await crearPersona({ razonSocial: `Conductor SAC ${sufijo}` });
    await db.insert(esquema.conductores).values({ personaId: conductorRuc.id, numeroLicencia: `R${numeroAleatorio(8)}` });
    await rechazaCon(emitir({ conductorId: conductorRuc.id }), BadRequestException, /documento compatible/);
    await rechazaCon(emitir({ motivoTraslado: "13", tipoTransporte: "01", fechaEntregaTransportista: hoy, transportistaId }), BadRequestException, /descripción del motivo de traslado/);
    const sinDireccion = await crearCliente(`SinDir${sufijo}`, null);
    const producto = await crearProducto();
    simularNubefact(() => aceptada());
    const venta = await servicio.crear({ idempotencyKey: randomUUID(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: sinDireccion.id, medioPago: "EFECTIVO", detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, afectacionIgv: "GRAVADO" }] }, usuarioId);
    await rechazaCon(emitir({ ingresoId: venta.id }), BadRequestException, /dirección del cliente registrado/);
  });

  test("emitir una guía de remitente usa el correlativo que anuncia la numeración", async () => {
    const prevista = (await servicio.obtenerNumeraciones()).GUIA_REMITENTE;
    simularNubefact(() => json({ enlace: "https://example.invalid/guia" }));
    const guia = await servicio.emitirGuia(datosGuia(), usuarioId);
    guiasCreadas.push(guia.id);
    assert.deepEqual([guia.estado, guia.codigo], ["PENDIENTE_SUNAT", prevista.codigo]);
    assert.equal(llamadas[0].tipo_de_comprobante, 7);
    const [correlativo] = await db.select().from(esquema.nubefactCorrelativos).where(and(eq(esquema.nubefactCorrelativos.serie, String(prevista.serie)), eq(esquema.nubefactCorrelativos.tipoComprobante, 5)));
    assert.equal(correlativo.ultimoNumero, prevista.numero);
  });

  test("registra guías con distintas respuestas de NubeFact, las consulta y las lista", async () => {
    const primera = guiasCreadas[0];
    try {
      simularNubefact(() => { throw new TypeError("sin red"); });
      const sinRespuesta = await servicio.emitirGuia(datosGuia({ clienteDireccion: "Entrega especial 9", observaciones: "Frágil" }), usuarioId);
      guiasCreadas.push(sinRespuesta.id);
      assert.equal(sinRespuesta.estado, "NUBEFACT_PENDIENTE");
      const solicitud = llamadas[0];
      assert.deepEqual([solicitud.operacion, solicitud.tipo_de_comprobante, solicitud.cliente_direccion, solicitud.conductor_nombre, solicitud.conductor_apellidos, solicitud.transportista_placa_numero, solicitud.observaciones],
        ["generar_guia", 7, "Entrega especial 9", "Carlos", "Chofer Ruta", "ABC123", "Frágil"]);
      simularNubefact(() => json({ errors: "Ubigeo inválido" }));
      const conError = await servicio.emitirGuia(datosGuia({ tipoTransporte: "01", fechaEntregaTransportista: hoy, transportistaId, motivoTraslado: "13", motivoTrasladoOtros: "Exhibición" }), usuarioId);
      guiasCreadas.push(conError.id);
      assert.deepEqual([conError.estado, conError.mensaje], ["ERROR_NUBEFACT", "Ubigeo inválido"]);
      assert.equal(llamadas[0].transportista_documento_tipo, "6");
      simularNubefact(() => new Response("<html>", { status: 200 }));
      const invalida = await servicio.emitirGuia(datosGuia(), usuarioId);
      guiasCreadas.push(invalida.id);
      assert.equal(invalida.estado, "ERROR_NUBEFACT");
      simularNubefact(() => json({ enlace: "https://example.invalid/guia" }));
      const pendiente = await servicio.emitirGuia(datosGuia(), usuarioId);
      guiasCreadas.push(pendiente.id);
      assert.deepEqual([pendiente.estado, pendiente.mensaje], ["PENDIENTE_SUNAT", null]);

      await rechazaCon(servicio.consultarGuia(randomUUID()), NotFoundException, /No se encontró la guía/);
      simularNubefact(() => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/g.pdf", enlace_del_xml: "https://example.invalid/g.xml", enlace_del_cdr: "https://example.invalid/g.zip", sunat_description: "Aceptada" }));
      const aceptadaGuia = await servicio.consultarGuia(pendiente.id);
      assert.deepEqual([aceptadaGuia.estado, aceptadaGuia.enlacePdf, aceptadaGuia.detalle], ["EMITIDO", "https://example.invalid/g.pdf", "Aceptada"]);
      assert.deepEqual({ ...llamadas[0], numero: undefined, serie: undefined }, { operacion: "consultar_guia", tipo_de_comprobante: 7, numero: undefined, serie: undefined });
      simularNubefact(() => json({ aceptada_por_sunat: false, sunat_soap_error: "Rechazo" }));
      assert.equal((await servicio.consultarGuia(conError.id)).estado, "RECHAZADO_SUNAT");
      simularNubefact(() => json({}, 500));
      assert.equal((await servicio.consultarGuia(invalida.id)).estado, "ERROR_NUBEFACT");
      simularNubefact(() => new Response("x", { status: 200 }));
      const sinJson = await servicio.consultarGuia(sinRespuesta.id);
      assert.deepEqual([sinJson.estado, sinJson.enlacePdf, sinJson.detalle], ["PENDIENTE_SUNAT", null, null]);
      simularNubefact(() => { throw new TypeError("sin red"); });
      await assert.rejects(servicio.consultarGuia(sinRespuesta.id), TypeError);

      const listado = await servicio.listarGuias("1", "50", "TODAS", `Gestion${sufijo}`);
      assert.equal(listado.total, 5);
      assert.deepEqual(listado.conteos, { todas: 5, emitidas: 1, pendientes: 2, rechazadas: 2 });
      const emitida = listado.items.find((item) => item.id === pendiente.id)!;
      assert.deepEqual([emitida.comprobanteOrigen?.codigo, emitida.comprobanteOrigen?.tipo, emitida.enlaceXml, emitida.detalle, emitida.clienteNombre], [documento.codigo, "BOLETA", "https://example.invalid/g.xml", "Aceptada", cliente.nombre]);
      assert.deepEqual((await servicio.listarGuias(undefined, undefined, "EMITIDAS", `Gestion${sufijo}`)).items.map((item) => item.id), [pendiente.id]);
      assert.equal((await servicio.listarGuias("1", "1", "RECHAZADAS", `Gestion${sufijo}`)).totalPaginas, 2);
      assert.deepEqual((await servicio.listarGuias("x", "0", "PENDIENTES", `Gestion${sufijo}`)).items.map((item) => item.id).sort(), [primera, sinRespuesta.id].sort());
      assert.equal((await servicio.listarGuias("1", "10", "OTRO", `Gestion${sufijo}`)).total, 5);
      await db.update(esquema.guiasRemision).set({ datosNubefact: null }).where(eq(esquema.guiasRemision.id, invalida.id));
      const sinDatos = (await servicio.listarGuias(undefined, undefined, undefined, `Gestion${sufijo}`)).items.find((item) => item.id === invalida.id)!;
      assert.deepEqual([sinDatos.comprobanteOrigen?.codigo, sinDatos.enlacePdf], [documento.codigo, null]);
      assert.ok((await servicio.listarGuias()).items.length <= 10);
    } finally {
      if (guiasCreadas.length) await db.delete(esquema.guiasRemision).where(inArray(esquema.guiasRemision.id, guiasCreadas));
    }
  });
});

after(async () => {
  globalThis.fetch = fetchOriginal;
  if (!db) return;
  const ventas = personasCreadas.length ? await db.select({ id: esquema.ingresos.id }).from(esquema.ingresos).where(inArray(esquema.ingresos.clienteId, personasCreadas)) : [];
  const ids = [...new Set([...ingresosDirectos, ...ventas.map((fila) => fila.id)])];
  if (personasCreadas.length) {
    await db.delete(esquema.ordenesServicio).where(inArray(esquema.ordenesServicio.clienteId, personasCreadas));
    await db.delete(esquema.cotizaciones).where(inArray(esquema.cotizaciones.usuarioId, [usuarioId]));
  }
  if (ids.length) {
    await db.delete(esquema.guiasRemision).where(inArray(esquema.guiasRemision.ingresoId, ids));
    await db.delete(esquema.ingresosPagos).where(inArray(esquema.ingresosPagos.ingresoId, ids));
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, ids));
    await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, ids));
  }
  if (productosCreados.length) {
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.productoId, productosCreados));
    await db.delete(esquema.saldosStock).where(inArray(esquema.saldosStock.productoId, productosCreados));
    await db.delete(esquema.productos).where(inArray(esquema.productos.id, productosCreados));
  }
  await db.delete(esquema.cuentasFinancieras).where(inArray(esquema.cuentasFinancieras.id, cuentasCreadas));
  await db.delete(esquema.categoriasProductos).where(eq(esquema.categoriasProductos.id, categoriaId));
  await db.delete(esquema.marcasProductos).where(eq(esquema.marcasProductos.id, marcaId));
  await db.delete(esquema.usuarios).where(eq(esquema.usuarios.id, usuarioId));
  await db.delete(esquema.transportistas).where(inArray(esquema.transportistas.personaId, personasCreadas));
  await db.delete(esquema.conductores).where(inArray(esquema.conductores.personaId, personasCreadas));
  await db.delete(esquema.clientes).where(inArray(esquema.clientes.personaId, personasCreadas));
  await db.delete(esquema.trabajadores).where(inArray(esquema.trabajadores.personaId, personasCreadas));
  await db.delete(esquema.personas).where(inArray(esquema.personas.id, personasCreadas));
  await cerrarBaseDatos();
});
