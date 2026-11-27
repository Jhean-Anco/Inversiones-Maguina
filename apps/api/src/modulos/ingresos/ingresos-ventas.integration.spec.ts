import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { ServicioMototaxis } from "../mototaxis/mototaxis.service";
import { ServicioIngresos } from "./ingresos.service";

/*
 * Integración del módulo de ingresos contra PostgreSQL real (magina_test desechable).
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
const textoPlano = (cuerpo: string, status = 200) => new Response(cuerpo, { status, headers: { "content-type": "text/html" } });
const sinRespuesta = (): Response => { throw new TypeError("fetch failed: conexión rechazada simulada"); };
const tiempoAgotado = (): Response => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); };
const aceptada = (extra: Record<string, unknown> = {}) => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/doc.pdf", enlace_del_xml: "https://example.invalid/doc.xml", ...extra });

// ---- Datos de prueba ----
const hoy = fechaActualPeru();
const diasAtras = (dias: number) => fechaActualPeru(new Date(Date.now() - dias * 86_400_000));
const diasAdelante = (dias: number) => fechaActualPeru(new Date(Date.now() + dias * 86_400_000));
const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
const SERIES = { BOLETA: "BIT1", FACTURA: "FIT1", NOTA_VENTA: "NIT1", NOTA_CREDITO_BOLETA: "BIT2", COTIZACION: "CIT1" } as const;

let usuarioId: string;
let tipos: { natural: string; juridica: string; dni: string; ruc: string; ce: string };
let unidadCodigo: string;
let listaGeneralId: string;
let categoriaId: string;
let marcaId: string;
let cuentaEfectivo: string;
let cuentaBanco: string;
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
const servicioLinea = (precio: number | string, extra: Record<string, unknown> = {}) => ({ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: precio, afectacionIgv: "INAFECTO", ...extra });
function boletaServicio(precio: number | string = 20, extra: Record<string, unknown> = {}) {
  return { idempotencyKey: clave(), fecha: hoy, tipoComprobante: "BOLETA", medioPago: "EFECTIVO", detalles: [servicioLinea(precio)], ...extra };
}

async function insertarVenta(valores: Partial<typeof esquema.ingresos.$inferInsert> = {}) {
  const id = randomUUID();
  await db.insert(esquema.ingresos).values({ id, codigo: `QAI-${id}`, fecha: hoy, tipoComprobante: "BOLETA", clienteId: natural.id, clienteTipoDocumento: "DNI",
    clienteNumeroDocumento: natural.documento, clienteNombre: natural.nombre, medioPago: "EFECTIVO", subtotal: "10.00", igv: "0.00", total: "10.00", estado: "EMITIDO", usuarioId,
    datosNubefact: { solicitud: { serie: SERIES.BOLETA, numero: 900_000 + Math.floor(Math.random() * 99_999) }, respuesta: { aceptada_por_sunat: true } }, ...valores });
  ingresosDirectos.push(id);
  return id;
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
  const [usuario] = await db.insert(esquema.usuarios).values({ trabajadorId: personaUsuario.id, nombreUsuario: `qa_ventas_${sufijo.toLowerCase()}`, correo: `qa-ventas-${sufijo.toLowerCase()}@example.invalid`, contrasenaHash: "hash-ficticio", requiereCambioContrasena: false }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;

  const [categoria] = await db.insert(esquema.categoriasProductos).values({ nombre: `QA ventas ${sufijo}` }).returning({ id: esquema.categoriasProductos.id });
  categoriaId = categoria.id;
  const [marca] = await db.insert(esquema.marcasProductos).values({ nombre: `QA ventas ${sufijo}`, uso: "REPUESTOS" }).returning({ id: esquema.marcasProductos.id });
  marcaId = marca.id;

  natural = await crearCliente({});
  empresa = await crearCliente({ ruc: true, direccion: "Av. Industrial 456" });
  documentoCe = `CE${numeroAleatorio(8)}`;
  await db.insert(esquema.personasDocumentos).values({ personaId: natural.id, tipoDocumentoId: tipos.ce, numeroDocumento: documentoCe });
  cuentaEfectivo = await crearCuenta("EFECTIVO");
  cuentaBanco = await crearCuenta("BANCO");
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

describe("configuración de emisión", () => {
  test("estadoNubefact refleja credenciales, series y régimen tributario", async () => {
    let estado = await servicio.estadoNubefact();
    assert.deepEqual({ ...estado }, { regimenTributario: "NRUS", credencialesConfiguradas: true, seriesConfiguradas: true, emisionHabilitada: true, serieFacturaConfigurada: true, emisionFacturaHabilitada: false });
    process.env.REGIMEN_TRIBUTARIO = "GENERAL";
    estado = await servicio.estadoNubefact();
    assert.equal(estado.emisionFacturaHabilitada, true);
    for (const ruta of ["http://example.invalid/api", "https://usuario:clave@example.invalid/api", "no es una url"]) {
      process.env.NUBEFACT_RUTA = ruta;
      estado = await servicio.estadoNubefact();
      assert.equal(estado.credencialesConfiguradas, false, ruta);
      assert.equal(estado.emisionHabilitada, false);
      assert.equal(estado.emisionFacturaHabilitada, false);
    }
    restaurarEntorno();
    process.env.NUBEFACT_TOKEN = "   ";
    assert.equal((await servicio.estadoNubefact()).credencialesConfiguradas, false);
  });

  test("los medios de pago disponibles dependen de las cuentas activas en soles", async () => {
    const medios = await servicio.mediosPagoDisponibles();
    const codigos = medios.map((medio) => medio.codigo);
    assert.ok(codigos.includes("EFECTIVO") && codigos.includes("TRANSFERENCIA"));
    assert.ok(codigos.indexOf("EFECTIVO") < codigos.indexOf("TRANSFERENCIA"));
    assert.deepEqual(medios.find((medio) => medio.codigo === "TRANSFERENCIA"), { codigo: "TRANSFERENCIA", nombre: "Transferencia" });
  });
});

describe("registro y emisión de ventas", () => {
  test("una boleta aceptada descuenta stock, arma la trama NRUS y archiva los documentos", async () => {
    const producto = await crearProducto({ stock: 5 });
    simularNubefact(() => aceptada({ enlace: "https://example.invalid/ver/1", sunat_description: "La Boleta ha sido aceptada" }));
    const datos = { idempotencyKey: clave(), fecha: hoy, tipoComprobante: "BOLETA", clienteId: natural.id, medioPago: "TARJETA", observacion: "Venta QA",
      detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 2, afectacionIgv: "GRAVADO", precioEsperado: "10.00" },
        { tipo: "SERVICIO", descripcion: "Instalación QA", cantidad: 1, precioUnitario: "15.50", afectacionIgv: "INAFECTO" }] };
    const resultado = await servicio.crear(datos, usuarioId);

    assert.equal(resultado.estado, "EMITIDO");
    assert.equal(resultado.total, "35.50");
    assert.equal(resultado.subtotal, "35.50");
    assert.equal(resultado.igv, "0.00");
    assert.equal(resultado.clienteTipoDocumento, "DNI");
    assert.equal(resultado.clienteNumeroDocumento, natural.documento);
    assert.equal(resultado.clienteNombre, natural.nombre);
    assert.equal("clienteCorreo" in resultado, false);
    const trama = llamadasNubefact[0].cuerpo;
    assert.equal(llamadasNubefact[0].autorizacion, "ci-only-fake-token");
    assert.equal(resultado.nubefact.codigo, `${trama.serie}-${String(trama.numero).padStart(6, "0")}`);
    assert.equal(resultado.nubefact.enlace, "https://example.invalid/ver/1");
    assert.equal(resultado.nubefact.enlacePdf, `/archivos/${resultado.id}-PDF/contenido`);
    assert.equal(trama.operacion, "generar_comprobante");
    assert.equal(trama.tipo_de_comprobante, 2);
    assert.equal(trama.cliente_tipo_de_documento, 1);
    assert.equal(trama.cliente_denominacion, natural.nombre);
    assert.equal(trama.medio_de_pago, "Tarjeta");
    assert.equal(trama.cancelado, true);
    assert.equal(trama.condiciones_de_pago, "");
    assert.equal(trama.total, 35.5);
    assert.equal(trama.total_inafecta, 35.5);
    assert.equal(trama.total_gravada, "");
    assert.equal(trama.total_igv, 0);
    assert.equal(trama.observaciones, "Venta QA");
    assert.equal(trama.fecha_de_emision, `${hoy.slice(8, 10)}-${hoy.slice(5, 7)}-${hoy.slice(0, 4)}`);
    assert.equal("cliente_email" in trama, false);
    const items = trama.items as Record<string, unknown>[];
    assert.deepEqual(items.map((item) => [item.tipo_de_igv, item.unidad_de_medida, item.total]), [[9, unidadCodigo, 20], [9, "ZZ", 15.5]]);
    assert.equal(items[1].codigo, "SERVICIO");

    const guardada = await venta(resultado.id);
    assert.equal(guardada.estado, "EMITIDO");
    assert.equal(guardada.datos.archivos.guardados.length, 2);
    assert.equal(await stock(producto.productoId), 3);
    const movimientos = await db.select().from(esquema.movimientosStock).where(eq(esquema.movimientosStock.origenId, resultado.id));
    assert.deepEqual(movimientos.map((movimiento) => [movimiento.tipo, Number(movimiento.cantidadBase)]), [["SALIDA", 2]]);
    assert.deepEqual(almacenamiento.llamadas.at(-1), { entidadTipo: "INGRESO", entidadId: resultado.id, tipoComprobante: "BOLETA", codigo: resultado.nubefact.codigo });

    const repetida = await servicio.crear(datos, usuarioId);
    assert.equal(repetida.id, resultado.id);
    assert.equal(repetida.detalles.length, 2);
    assert.equal(repetida.nubefact, null);
    assert.equal(llamadasNubefact.length, 1, "La repetición idempotente no vuelve a emitir.");
    assert.equal(await stock(producto.productoId), 3);
    await rechazaCon(servicio.crear({ ...datos, observacion: "Otra observación" }, usuarioId), ConflictException, /ya se usó con otros datos/);
  });

  test("una boleta sin respuesta queda pendiente y se confirma al consultar su estado", async () => {
    simularNubefact(sinRespuesta);
    const resultado = await servicio.crear(boletaServicio(20), usuarioId);
    assert.equal(resultado.estado, "PENDIENTE");
    assert.equal(resultado.nubefact.estado, "PENDIENTE");
    assert.match(resultado.nubefact.mensaje, /No hubo respuesta del proveedor/);
    const trama = llamadasNubefact[0].cuerpo;
    assert.deepEqual([trama.cliente_tipo_de_documento, trama.cliente_numero_de_documento, trama.cliente_denominacion], ["-", "-", "CLIENTES VARIOS"]);
    let guardada = await venta(resultado.id);
    assert.equal(guardada.estado, "NUBEFACT_PENDIENTE");
    assert.equal(guardada.datos.estado, "ERROR");

    const listado = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: guardada.codigo, estado: "PENDIENTES" });
    assert.equal(listado.total, 1);
    assert.equal(listado.items[0].estadoProveedor, "PENDIENTE_CONFIRMACION");
    assert.equal(listado.items[0].codigoComprobante, `${trama.serie}-${String(trama.numero).padStart(6, "0")}`);
    assert.equal((await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: guardada.codigo, estado: "EMITIDAS" })).total, 0);

    simularNubefact(tiempoAgotado);
    await rechazaCon(servicio.consultarEstadoComprobante(resultado.id), BadRequestException, /No se pudo consultar NubeFact/);
    simularNubefact(() => aceptada());
    const consulta = await servicio.consultarEstadoComprobante(resultado.id);
    assert.deepEqual(llamadasNubefact[0].cuerpo, { operacion: "consultar_comprobante", tipo_de_comprobante: 2, serie: trama.serie, numero: trama.numero });
    assert.equal(consulta.respuestaHttp, 200);
    // La aceptación de SUNAT prevalece sobre el mensaje local obsoleto de "sin respuesta".
    assert.equal(consulta.estadoProveedor, "ACEPTADO_SUNAT");
    guardada = await venta(resultado.id);
    assert.equal(guardada.estado, "EMITIDO");
    assert.equal(guardada.datos.consultaComprobante.respuesta.aceptada_por_sunat, true);
  });

  test("consultar una boleta NUBEFACT_PENDIENTE aceptada por SUNAT la marca EMITIDO y archiva sus documentos", async () => {
    const pendiente = await insertarVenta({ estado: "NUBEFACT_PENDIENTE", datosNubefact: { solicitud: { serie: SERIES.BOLETA, numero: 31 } } });
    simularNubefact(() => json({ estado: "en cola" }));
    assert.equal((await servicio.consultarEstadoComprobante(pendiente)).estadoProveedor, "PENDIENTE_CONFIRMACION");
    assert.equal((await venta(pendiente)).estado, "NUBEFACT_PENDIENTE");
    simularNubefact(() => aceptada());
    const consulta = await servicio.consultarEstadoComprobante(pendiente);
    assert.equal(consulta.estadoProveedor, "ACEPTADO_SUNAT");
    const guardada = await venta(pendiente);
    assert.equal(guardada.estado, "EMITIDO");
    assert.equal(guardada.datos.archivos.guardados.length, 2);
    await rechazaCon(servicio.consultarEstadoComprobante(pendiente), ConflictException, /Solo se puede consultar un comprobante pendiente/);
  });


  test("las respuestas inválidas o rechazadas de NubeFact quedan registradas con un mensaje explicativo", async () => {
    const casos: [() => Response, string][] = [
      [() => textoPlano("<html>Error interno</html>", 500), "La respuesta de NubeFact no contenía JSON válido."],
      [() => json([1, 2]), "NubeFact no confirmó la emisión del comprobante."],
      [() => json({}, 502), "NubeFact respondió con estado HTTP 502."],
      [() => json({ errors: { cliente: "documento inválido" }, enlace_del_pdf: "https://example.invalid/x.pdf" }), "cliente: documento inválido"],
      [() => json({ errors: ["Serie inválida", 3] }), "Serie inválida"],
      [() => json({ aceptada_por_sunat: false, sunat_soap_error: "0109 - Servicio SUNAT no disponible" }), "0109 - Servicio SUNAT no disponible"],
      [() => json({ errors: true, enlace_del_pdf: "https://example.invalid/x.pdf" }), "NubeFact no confirmó la emisión del comprobante."],
      [() => json({ sunat_responsecode: "0" }), "0"],
    ];
    for (const [respuesta, mensaje] of casos) {
      simularNubefact(respuesta);
      const resultado = await servicio.crear(boletaServicio(12), usuarioId);
      assert.equal(resultado.estado, "ERROR", mensaje);
      assert.equal(resultado.nubefact.mensaje, mensaje);
      assert.equal((await venta(resultado.id)).estado, "ERROR_NUBEFACT");
    }
    simularNubefact(() => json({ errors: "  ", enlace_del_pdf: "https://example.invalid/x.pdf" }));
    const aceptadaConErroresVacios = await servicio.crear(boletaServicio(12), usuarioId);
    assert.equal(aceptadaConErroresVacios.estado, "EMITIDO");
  });

  test("una factura en régimen general calcula IGV por afectación, descuentos y correo del cliente", async () => {
    process.env.REGIMEN_TRIBUTARIO = "GENERAL";
    process.env.DESCUENTO_MAXIMO_PORCENTAJE = "50";
    const producto = await crearProducto({ stock: 10 });
    simularNubefact(() => aceptada());
    const resultado = await servicio.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "FACTURA", clienteId: empresa.id, medioPago: "TRANSFERENCIA",
      detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 3, descuento: "6.00", afectacionIgv: "GRAVADO" },
        { tipo: "SERVICIO", descripcion: "Mano de obra", cantidad: 1, precioUnitario: 20, afectacionIgv: "EXONERADO" },
        { tipo: "SERVICIO", descripcion: "Flete", cantidad: 1, precioUnitario: 5, afectacionIgv: "INAFECTO" }] }, usuarioId);
    assert.equal(resultado.estado, "EMITIDO");
    assert.deepEqual([resultado.subtotal, resultado.igv, resultado.total], ["45.34", "3.66", "49.00"]);
    const trama = llamadasNubefact[0].cuerpo;
    assert.equal(trama.tipo_de_comprobante, 1);
    assert.equal(trama.cliente_tipo_de_documento, 6);
    assert.equal(trama.cliente_numero_de_documento, empresa.documento);
    assert.equal(trama.cliente_denominacion, empresa.nombre);
    assert.equal(trama.cliente_direccion, "Av. Industrial 456");
    assert.equal(trama.cliente_email, "cliente.qa@example.invalid");
    assert.equal(trama.medio_de_pago, "Transferencia bancaria");
    assert.deepEqual([trama.total_gravada, trama.total_exonerada, trama.total_inafecta, trama.total_igv, trama.total_descuento], [20.34, 20, 5, 3.66, 5.08]);
    const items = trama.items as Record<string, unknown>[];
    assert.deepEqual(items.map((item) => item.tipo_de_igv), [1, 8, 9]);
    assert.equal(items[0].valor_unitario, Number((10 / 1.18).toFixed(10)));
    assert.equal(items[1].descuento, "");
    assert.equal(await stock(producto.productoId), 7);

    await rechazaCon(servicio.crear({ ...boletaServicio(10), tipoComprobante: "FACTURA" }, usuarioId), BadRequestException, /cliente registrado con RUC válido/);
    await rechazaCon(servicio.crear({ ...boletaServicio(10), tipoComprobante: "FACTURA", clienteId: natural.id }, usuarioId), BadRequestException, /cliente registrado con RUC válido/);
    const sinDireccion = await crearCliente({ ruc: true, razonSocial: `SIN DIRECCION ${sufijo} SAC`, direccion: null });
    await rechazaCon(servicio.crear({ ...boletaServicio(10), tipoComprobante: "FACTURA", clienteId: sinDireccion.id }, usuarioId), BadRequestException, /requiere la dirección fiscal/);
    const razonLarga = await crearCliente({ ruc: true, razonSocial: `RAZON ${sufijo} ${"X".repeat(100)}` });
    await rechazaCon(servicio.crear({ ...boletaServicio(10), tipoComprobante: "FACTURA", clienteId: razonLarga.id }, usuarioId), BadRequestException, /no puede superar los 100 caracteres/);
    const descuentoExcesivo = { idempotencyKey: clave(), fecha: hoy, tipoComprobante: "FACTURA", clienteId: empresa.id, medioPago: "EFECTIVO" };
    await rechazaCon(servicio.crear({ ...descuentoExcesivo, detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 3, descuento: "16.00", afectacionIgv: "GRAVADO" }] }, usuarioId), BadRequestException, /descuento máximo permitido es 50%/);
    await rechazaCon(servicio.crear({ ...descuentoExcesivo, idempotencyKey: clave(), detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 3, descuento: "31.00", afectacionIgv: "GRAVADO" }] }, usuarioId), BadRequestException, /supera el importe de la línea/);
    assert.equal(await stock(producto.productoId), 7, "Las ventas rechazadas no descuentan stock.");

    process.env.NUBEFACT_TOKEN = "";
    await rechazaCon(servicio.crear({ ...descuentoExcesivo, idempotencyKey: clave(), detalles: [servicioLinea(5)] }, usuarioId), BadRequestException, /serie de facturas y un régimen/);
    await rechazaCon(servicio.crear(boletaServicio(5), usuarioId), BadRequestException, /serie de boletas de NubeFact/);
  });

  test("valida el cliente elegido y los documentos asociados", async () => {
    simularNubefact(() => aceptada());
    await rechazaCon(servicio.crear({ ...boletaServicio(10), clienteId: randomUUID() }, usuarioId), NotFoundException, /ya no está activo/);
    await rechazaCon(servicio.crear({ ...boletaServicio(10), clienteId: natural.id, clienteTipoDocumento: "RUC", clienteNumeroDocumento: rucConDigito("10") }, usuarioId), BadRequestException, /no está asociado al cliente/);
    const conCe = await servicio.crear({ ...boletaServicio(10), clienteId: natural.id, clienteTipoDocumento: "CE", clienteNumeroDocumento: documentoCe }, usuarioId);
    assert.equal(conCe.clienteTipoDocumento, "CE");
    assert.equal(llamadasNubefact.at(-1)?.cuerpo.cliente_tipo_de_documento, 4);
    const conDni = await servicio.crear({ ...boletaServicio(10), clienteId: natural.id, clienteTipoDocumento: "DNI", clienteNumeroDocumento: natural.documento }, usuarioId);
    assert.equal(conDni.clienteNumeroDocumento, natural.documento);
    const conTipoDesconocido = await servicio.crear({ ...boletaServicio(10), clienteId: natural.id, clienteTipoDocumento: "LIBRETA", clienteNumeroDocumento: "123" }, usuarioId);
    assert.deepEqual([conTipoDesconocido.clienteTipoDocumento, conTipoDesconocido.clienteNumeroDocumento], ["DNI", natural.documento]);
    await rechazaCon(servicio.crear(boletaServicio(701), usuarioId), BadRequestException, /supera S\/ 700.00/);
    const conDocumentoLibre = await servicio.crear(boletaServicio(701, { clienteTipoDocumento: "DNI", clienteNumeroDocumento: "45678912", clienteNombre: "Comprador Libre", clienteDireccion: "Calle 1" }), usuarioId);
    assert.equal(conDocumentoLibre.clienteNombre, "Comprador Libre");
    assert.equal(conDocumentoLibre.clienteId, undefined);
  });

  test("valida cada línea: tipos, precios, descuentos, stock y mototaxis", async () => {
    const producto = await crearProducto({ stock: 1 });
    const nota = (detalles: unknown[]) => servicio.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: natural.id, medioPago: "EFECTIVO", detalles }, usuarioId);
    const repuesto = (extra: Record<string, unknown> = {}) => ({ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, afectacionIgv: "GRAVADO", ...extra });
    const moto = (extra: Record<string, unknown> = {}) => ({ tipo: "MOTOTAXI", mototaxiModeloId: randomUUID(), cantidad: 1, precioUnitario: "100.00", afectacionIgv: "GRAVADO", ...extra });
    await rechazaCon(nota([null]), BadRequestException, /La línea 1 no es válida/);
    await rechazaCon(nota([repuesto({ cantidad: "abc" })]), BadRequestException, /Cantidad en línea 1/);
    await rechazaCon(nota([repuesto({ presentacionId: "x" })]), BadRequestException, /presentación válida en la línea 1/);
    await rechazaCon(nota([repuesto({ precioUnitario: "10.00" })]), BadRequestException, /no coincide con la línea registrada en la orden/);
    await rechazaCon(nota([repuesto({ afectacionIgv: undefined })]), BadRequestException, /tipo de operación de la línea 1/);
    await rechazaCon(nota([repuesto({ listaPrecioCodigo: "" })]), BadRequestException, /lista de precios es obligatorio/);
    await rechazaCon(nota([repuesto({ precioEsperado: "-1" })]), BadRequestException, /precio mostrado/);
    await rechazaCon(nota([servicioLinea("1.234")]), BadRequestException, /Precio en línea 1/);
    await rechazaCon(nota([servicioLinea(10, { afectacionIgv: "OTRA" })]), BadRequestException, /tipo de operación del servicio 1/);
    await rechazaCon(nota([moto({ mototaxiModeloId: "x" })]), BadRequestException, /modelo de mototaxi válido/);
    await rechazaCon(nota([moto({ cantidad: 1.5 })]), BadRequestException, /cantidad entera de mototaxis/);
    await rechazaCon(nota([moto({ precioUnitario: 0 })]), BadRequestException, /Precio de mototaxi 1/);
    await rechazaCon(nota([moto({ afectacionIgv: "X" })]), BadRequestException, /tipo de operación de la línea 1/);
    await rechazaCon(nota([{ tipo: "KIT", cantidad: 1 }]), BadRequestException, /producto, servicio o mototaxi/);
    await rechazaCon(nota([moto(), servicioLinea(10)]), BadRequestException, /mototaxis por separado/);
    await rechazaCon(nota([moto()]), NotFoundException, /modelo de mototaxi ya no está disponible/);
    await rechazaCon(nota([repuesto({ presentacionId: randomUUID() })]), NotFoundException, /no tiene un precio vigente/);
    await rechazaCon(nota([repuesto({ precioEsperado: "9.99" })]), ConflictException, /cambió/);
    await rechazaCon(nota([repuesto({ cantidad: 2 })]), BadRequestException, /Stock insuficiente/);
    await rechazaCon(nota([servicioLinea(3, { descuento: 5 })]), BadRequestException, /supera el importe de la línea/);
    await rechazaCon(nota([servicioLinea(10, { descuento: 1 })]), BadRequestException, /descuento máximo permitido es 0%/);
    assert.equal(await stock(producto.productoId), 1);
  });

  test("las notas de venta se numeran internamente y conservan el archivo o el error de archivado", async () => {
    const producto = await crearProducto({ stock: 4 });
    const datos = () => ({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: natural.id, medioPago: "EFECTIVO",
      detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, afectacionIgv: "GRAVADO" }] });
    const serieNota = await asegurarSerie("NOTA_VENTA", SERIES.NOTA_VENTA);
    const primera = await servicio.crear(datos(), usuarioId);
    assert.match(primera.codigo, new RegExp(`^${serieNota}-\\d{6}$`));
    assert.equal(primera.estado, "REGISTRADO");
    assert.equal(primera.nubefact, null);
    assert.deepEqual(primera.archivos.guardados.map((archivo: Guardado) => archivo.tipo), ["HTML"]);
    assert.deepEqual((await venta(primera.id)).datos, { archivos: primera.archivos });

    almacenamiento.fallar = "error";
    const segunda = await servicio.crear(datos(), usuarioId);
    assert.deepEqual(segunda.archivos, { guardados: [], errores: [{ tipo: "HTML", mensaje: "No se pudo escribir la nota simulada" }] });
    almacenamiento.fallar = "texto";
    const tercera = await servicio.crear(datos(), usuarioId);
    assert.equal(tercera.archivos.errores[0].mensaje, "No se pudo archivar la nota de venta.");
    assert.ok(Number(tercera.codigo.split("-")[1]) > Number(primera.codigo.split("-")[1]));
    assert.equal(await stock(producto.productoId), 1);
  });

  test("las ventas de mototaxis descuentan el saldo del modelo y la baja aceptada lo devuelve", async () => {
    const marca = await servicioMototaxis.crearMarca({ nombre: `QA Moto Ventas ${sufijo}` });
    marcasMototaxi.push(marca.id);
    const modelo = await servicioMototaxis.crearModelo({ marcaId: marca.id, nombre: `Modelo ${sufijo}`, version: "V1" });
    modelosMototaxi.push(modelo.id);
    await servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 2, motivo: "Conteo inicial QA" }, usuarioId);
    const datos = (precio = "150.00") => ({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "BOLETA", clienteId: natural.id, medioPago: "EFECTIVO",
      detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: modelo.id, cantidad: 1, precioUnitario: precio, afectacionIgv: "GRAVADO" }] });
    await rechazaCon(servicio.crear(datos(), usuarioId), BadRequestException, /Configura un precio de venta/);
    await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta: "150.00" }, usuarioId);
    await rechazaCon(servicio.crear(datos("140.00"), usuarioId), BadRequestException, /cambió. Vuelve a agregar el modelo/);
    simularNubefact(() => aceptada());
    const resultado = await servicio.crear(datos(), usuarioId);
    assert.equal(resultado.total, "150.00");
    const items = llamadasNubefact[0].cuerpo.items as Record<string, unknown>[];
    assert.equal(items[0].unidad_de_medida, "NIU");
    assert.match(String(items[0].descripcion), new RegExp(`Modelo ${sufijo} V1$`));
    assert.equal((await servicio.buscarMototaxisVenta(`Modelo ${sufijo}`))[0]?.stockDisponible, 1);

    const motos = await servicio.listarVentas({ tipoVenta: "MOTOTAXIS", busqueda: resultado.codigo });
    assert.equal(motos.total, 1);
    assert.equal(motos.items[0].mototaxis.length, 1);
    assert.equal(motos.items[0].mototaxis[0].modeloId, modelo.id);
    assert.equal(motos.items[0].mototaxis[0].garantiaAplicada, null);
    assert.equal((await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: resultado.codigo })).total, 0);

    simularNubefact(() => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/baja.pdf", sunat_description: "Baja aceptada" }));
    const baja = await servicio.anularIngreso(resultado.id, { motivo: "Error de digitación", confirmoNoEntregado: true }, usuarioId);
    assert.equal(baja.estado, "ANULADO");
    assert.equal(baja.detalle, "Baja aceptada");
    const anulada = await venta(resultado.id);
    assert.equal(anulada.estado, "ANULADO");
    assert.equal(anulada.datos.anulacion.archivos.guardados.length, 1);
    assert.equal((await servicio.buscarMototaxisVenta(`Modelo ${sufijo}`))[0]?.stockDisponible, 2);
  });
});

describe("listado de ventas", () => {
  test("filtra por estado, documento, medio, saldo y búsqueda con paginación y conteos", async () => {
    const token = `LST${sufijo}`;
    const cliente = await crearCliente({ nombres: token });
    const producto = await crearProducto({ stock: 10, nombre: `Filtro ${token} aceite` });
    const linea = { tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 1, afectacionIgv: "GRAVADO" };
    const base = { fecha: hoy, clienteId: cliente.id, medioPago: "EFECTIVO", detalles: [linea] };
    const notaVenta = await servicio.crear({ ...base, idempotencyKey: clave(), tipoComprobante: "NOTA_VENTA" }, usuarioId);
    simularNubefact(() => aceptada());
    const emitida = await servicio.crear({ ...base, idempotencyKey: clave(), tipoComprobante: "BOLETA", medioPago: "TARJETA" }, usuarioId);
    simularNubefact(() => json({ aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "Documento no coincide" }));
    const rechazada = await servicio.crear({ ...base, idempotencyKey: clave(), tipoComprobante: "BOLETA" }, usuarioId);
    simularNubefact(sinRespuesta);
    const pendiente = await servicio.crear({ ...base, idempotencyKey: clave(), tipoComprobante: "BOLETA" }, usuarioId);
    const comunes = { clienteId: cliente.id, clienteNombre: cliente.nombre, clienteNumeroDocumento: cliente.documento };
    const credito = await insertarVenta({ ...comunes, condicionPago: "CREDITO", fechaVencimientoPago: diasAdelante(30), cuotasPago: [{ cuota: 1, fechaDePago: diasAdelante(30), importe: "100.00" }], subtotal: "100.00", total: "100.00" });
    const anulada = await insertarVenta({ ...comunes, estado: "ANULADO", datosNubefact: { solicitud: { serie: "BIT1", numero: 77 }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "ANULADO", motivo: "Duplicada", detalle: "Baja aceptada" } } });
    const bajaPendiente = await insertarVenta({ ...comunes, datosNubefact: { solicitud: { serie: "BIT1", numero: 78 }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "PENDIENTE", motivo: "Error" } } });
    const bajaRechazada = await insertarVenta({ ...comunes, datosNubefact: { solicitud: { serie: "BIT1", numero: 79 }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "RECHAZADO", motivo: "Error", detalle: "Plazo vencido" } } });
    const conArchivos = await insertarVenta({ ...comunes, medioPago: "BILLETERA_DIGITAL", datosNubefact: { solicitud: { serie: "BIT1", numero: 80 },
      respuesta: { aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/r.pdf", enlace_del_xml: "https://example.invalid/r.xml", enlace_del_cdr: "https://example.invalid/r.zip" },
      archivos: { guardados: [{ tipo: "XML", ruta: "/archivos/xml/contenido" }, { tipo: "CDR", ruta: "/archivos/cdr/contenido" }, { tipo: "PDF" }] } } });
    const enProceso = await insertarVenta({ ...comunes, estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: "BIT1", numero: 81 }, respuesta: { aceptada_por_sunat: false, sunat_responsecode: "2335" },
      consultaComprobante: { respuesta: { sunat_ticket_numero: "T-55", enlace_del_pdf: "https://example.invalid/consulta.pdf" } } } });

    const todas = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: token });
    assert.equal(todas.total, 10);
    assert.deepEqual(todas.conteos, { todas: 10, emitidas: 4, pendientes: 3, rechazadas: 2, anuladas: 1, conSaldo: 1 });
    const porId = new Map(todas.items.map((item) => [item.id, item]));
    const fila = (id: string) => porId.get(id)!;
    assert.deepEqual(fila(notaVenta.id).lineasImpresion, [{ descripcion: `Filtro ${token} aceite`, cantidad: "1.000", precioUnitario: "10.0000", total: "10.00" }]);
    assert.equal(fila(notaVenta.id).codigoComprobante, notaVenta.codigo);
    assert.equal(fila(notaVenta.id).estadoProveedor, "EMITIDO");
    assert.equal(fila(emitida.id).lineasImpresion, undefined);
    assert.equal(fila(emitida.id).estadoProveedor, "ACEPTADO_SUNAT");
    assert.equal(fila(rechazada.id).estadoProveedor, "RECHAZADO_SUNAT");
    assert.equal(fila(pendiente.id).estadoProveedor, "PENDIENTE_CONFIRMACION");
    assert.equal(fila(credito).saldoPendiente, "100.00");
    assert.equal(fila(emitida.id).saldoPendiente, "10.00");
    assert.deepEqual([fila(anulada).estado, fila(anulada).estadoProveedor, fila(anulada).detalleProveedor, fila(anulada).motivoAnulacion], ["ANULADO", "ANULADO", "Baja aceptada", "Duplicada"]);
    assert.deepEqual([fila(bajaPendiente).estado, fila(bajaPendiente).estadoProveedor], ["ANULACION_PENDIENTE", "ANULACION_PENDIENTE"]);
    assert.match(fila(bajaPendiente).detalleProveedor ?? "", /SUNAT aun no confirma/);
    assert.deepEqual([fila(bajaRechazada).estado, fila(bajaRechazada).estadoProveedor, fila(bajaRechazada).detalleProveedor], ["EMITIDO", "BAJA_RECHAZADA", "Plazo vencido"]);
    assert.deepEqual([fila(conArchivos).enlacePdf, fila(conArchivos).enlaceXml, fila(conArchivos).enlaceCdr], ["https://example.invalid/r.pdf", "/archivos/xml/contenido", "/archivos/cdr/contenido"]);
    assert.equal(fila(notaVenta.id).enlacePdf, `/archivos/${notaVenta.id}/contenido`);
    assert.deepEqual([fila(enProceso).estadoProveedor, fila(enProceso).enlacePdf], ["EN_PROCESO", "https://example.invalid/consulta.pdf"]);
    assert.equal(fila(credito).enlaceXml, null);

    const ids = async (filtros: Record<string, string>) => (await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: token, ...filtros })).items.map((item) => item.id).sort();
    assert.deepEqual(await ids({ estado: "ANULADAS" }), [anulada]);
    assert.deepEqual(await ids({ estado: "RECHAZADAS" }), [rechazada.id, bajaRechazada].sort());
    assert.deepEqual(await ids({ estado: "PENDIENTES" }), [pendiente.id, bajaPendiente, enProceso].sort());
    assert.deepEqual(await ids({ estado: "EMITIDAS" }), [notaVenta.id, emitida.id, credito, conArchivos].sort());
    assert.deepEqual(await ids({ estado: "TODAS", tipoDocumento: "NOTA_VENTA" }), [notaVenta.id]);
    assert.equal((await ids({ tipoDocumento: "TICKET" })).length, 10);
    assert.deepEqual(await ids({ medioPago: "TARJETA" }), [emitida.id]);
    assert.equal((await ids({ medioPago: "CHEQUE" })).length, 10);
    assert.deepEqual(await ids({ conSaldo: "true" }), [credito]);
    assert.deepEqual(await ids({ busqueda: `Filtro ${token}` }), [notaVenta.id, emitida.id, rechazada.id, pendiente.id].sort());
    assert.deepEqual(await ids({ busqueda: `${token}%_` }), []);

    const pagina = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: token, pagina: "2", porPagina: "4" });
    assert.deepEqual([pagina.pagina, pagina.porPagina, pagina.items.length, pagina.totalPaginas], [2, 4, 4, 3]);
    const normalizada = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: token, pagina: "abc", porPagina: "500" });
    assert.deepEqual([normalizada.pagina, normalizada.porPagina], [1, 100]);
    assert.equal((await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: token, porPagina: "0" })).porPagina, 10);
    const vacia = await servicio.listarVentas({ tipoVenta: "MOTOTAXIS", busqueda: token });
    assert.deepEqual([vacia.total, vacia.totalPaginas, vacia.items.length], [0, 1, 0]);
  });
});

describe("cobros de ventas", () => {
  test("una venta al contado se cancela en un solo pago idempotente", async () => {
    simularNubefact(() => aceptada());
    const contado = await servicio.crear(boletaServicio(20), usuarioId);
    const pago = (extra: Record<string, unknown> = {}) => ({ idempotencyKey: randomUUID(), fechaPago: hoy, importeAplicado: "20.00", medioPago: "EFECTIVO", cuentaFinancieraId: cuentaEfectivo, ...extra });
    await rechazaCon(servicio.registrarPago(contado.id, pago({ importeAplicado: "5.00" }), usuarioId), BadRequestException, /saldo completo de S\/ 20.00/);
    await rechazaCon(servicio.registrarPago(contado.id, pago({ importeAplicado: "25.00" }), usuarioId), BadRequestException, /supera el saldo pendiente de 20.00/);
    await rechazaCon(servicio.registrarPago(contado.id, pago({ cuentaFinancieraId: cuentaBanco }), usuarioId), BadRequestException, /no coincide con la cuenta/);
    await rechazaCon(servicio.registrarPago(randomUUID(), pago(), usuarioId), NotFoundException, /No se encontró el comprobante/);
    const datosPago = pago({ referenciaPago: "OP-001", observacion: "Pago en caja" });
    const registrado = await servicio.registrarPago(contado.id, datosPago, usuarioId);
    assert.deepEqual([registrado.importeAplicado, registrado.medioPago, registrado.referenciaPago, registrado.observacion, registrado.cuentaFinancieraId], ["20.00", "EFECTIVO", "OP-001", "Pago en caja", cuentaEfectivo]);
    assert.equal((await servicio.registrarPago(contado.id, datosPago, usuarioId)).id, registrado.id);
    const otraVenta = await insertarVenta();
    await rechazaCon(servicio.registrarPago(otraVenta, datosPago, usuarioId), ConflictException, /ya fue usada para otro comprobante/);
    await rechazaCon(servicio.registrarPago(contado.id, pago({ fechaPago: diasAtras(1), importeAplicado: "1.00" }), usuarioId), BadRequestException, /orden cronológico/);
    await rechazaCon(servicio.registrarPago(contado.id, pago({ importeAplicado: "1.00" }), usuarioId), BadRequestException, /saldo pendiente de 0.00/);

    const listado = await servicio.listarPagos(contado.id);
    assert.equal(listado.items.length, 1);
    assert.equal(listado.items[0].cuentaFinancieraNombre, `QA EFECTIVO ${sufijo}`);
    assert.deepEqual([listado.importeAplicadoTotal, listado.saldoPendiente], ["20.00", "0.00"]);
    await rechazaCon(servicio.listarPagos(randomUUID()), NotFoundException, /No se encontró el comprobante/);
    const notaVenta = await insertarVenta({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO" });
    await rechazaCon(servicio.registrarPago(notaVenta, pago(), usuarioId), BadRequestException, /únicamente para comprobantes emitidos/);
  });

  test("una venta a crédito exige registrar primero la inicial declarada en la fecha de emisión", async () => {
    const credito = (inicial: string) => insertarVenta({ fecha: diasAtras(1), condicionPago: "CREDITO", importePagoInicial: inicial, fechaVencimientoPago: diasAdelante(30),
      cuotasPago: [{ cuota: 1, fechaDePago: diasAdelante(30), importe: "60.00" }], subtotal: "100.00", total: "100.00" });
    const id = await credito("40.00");
    const pago = (importe: string, fechaPago = hoy) => ({ idempotencyKey: randomUUID(), fechaPago, importeAplicado: importe, medioPago: "TRANSFERENCIA", cuentaFinancieraId: cuentaBanco });
    await rechazaCon(servicio.registrarPago(id, pago("30.00"), usuarioId), BadRequestException, /inicial declarada de S\/ 40.00/);
    await rechazaCon(servicio.registrarPago(id, pago("40.00"), usuarioId), BadRequestException, /fecha de emisión/);
    await servicio.registrarPago(id, pago("40.00", diasAtras(1)), usuarioId);
    await servicio.registrarPago(id, pago("25.00"), usuarioId);
    const pagos = await db.select().from(esquema.ingresosPagos).where(eq(esquema.ingresosPagos.ingresoId, id));
    assert.deepEqual(pagos.map((fila) => [fila.importeAplicado, fila.esPagoInicial]).sort(), [["25.00", false], ["40.00", true]]);
    assert.deepEqual(await servicio.listarPagos(id).then(({ importeAplicadoTotal, saldoPendiente }) => [importeAplicadoTotal, saldoPendiente]), ["65.00", "35.00"]);

    const conAbonoPrevio = await credito("40.00");
    await db.insert(esquema.ingresosPagos).values({ ingresoId: conAbonoPrevio, fechaPago: diasAtras(1), importeAplicado: "10.00", importeRecibido: "10.00", medioPago: "EFECTIVO", usuarioId, claveIdempotencia: randomUUID() });
    await rechazaCon(servicio.registrarPago(conAbonoPrevio, pago("30.00"), usuarioId), ConflictException, /Concilia el pago inicial/);
  });
});

describe("consulta y reintento de comprobantes", () => {
  test("consultarEstadoComprobante valida el documento y conserva la respuesta del proveedor", async () => {
    await rechazaCon(servicio.consultarEstadoComprobante(randomUUID()), NotFoundException, /No se encontró la venta/);
    await rechazaCon(servicio.consultarEstadoComprobante(await insertarVenta({ tipoComprobante: "NOTA_VENTA" })), BadRequestException, /boleta o factura electrónica/);
    await rechazaCon(servicio.consultarEstadoComprobante(await insertarVenta({ datosNubefact: null })), ConflictException, /serie y número del comprobante/);
    await rechazaCon(servicio.consultarEstadoComprobante(await insertarVenta()), ConflictException, /pendiente, en proceso, con error o rechazado/);

    const rechazada = await insertarVenta({ estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: SERIES.BOLETA }, numero: 7, respuesta: { aceptada_por_sunat: false, sunat_responsecode: "2800", sunat_description: "Rechazado" } } });
    process.env.NUBEFACT_TOKEN = "";
    await rechazaCon(servicio.consultarEstadoComprobante(rechazada), BadRequestException, /no está configurado/);
    restaurarEntorno();
    simularNubefact(() => json({ error: "Servicio no disponible" }, 503));
    await rechazaCon(servicio.consultarEstadoComprobante(rechazada), BadRequestException, /HTTP 503/);

    simularNubefact(() => textoPlano("no es json"));
    let consulta = await servicio.consultarEstadoComprobante(rechazada);
    assert.deepEqual([consulta.estadoProveedor, consulta.detalleProveedor], ["ERROR_NUBEFACT", "NubeFact devolvió una respuesta que no se pudo interpretar."]);
    assert.deepEqual(llamadasNubefact[0].cuerpo, { operacion: "consultar_comprobante", tipo_de_comprobante: 2, serie: SERIES.BOLETA, numero: 7 });
    assert.equal((await venta(rechazada)).estado, "ERROR_NUBEFACT");

    simularNubefact(() => json(["sin", "objeto"]));
    consulta = await servicio.consultarEstadoComprobante(rechazada);
    assert.equal(consulta.estadoProveedor, "ERROR_EMISION");
    assert.deepEqual((await venta(rechazada)).datos.consultaComprobante.respuesta, { respuesta: ["sin", "objeto"] });

    simularNubefact(() => json({ aceptada_por_sunat: false, sunat_responsecode: "2800", sunat_description: "Documento inválido" }));
    consulta = await servicio.consultarEstadoComprobante(rechazada);
    assert.equal(consulta.estadoProveedor, "RECHAZADO_SUNAT");
    assert.equal((await venta(rechazada)).estado, "ERROR_NUBEFACT");

    const factura = await insertarVenta({ tipoComprobante: "FACTURA", estado: "ERROR", datosNubefact: { solicitud: { serie: "FIT1", numero: 12 } } });
    simularNubefact(() => aceptada());
    consulta = await servicio.consultarEstadoComprobante(factura);
    assert.equal(llamadasNubefact[0].cuerpo.tipo_de_comprobante, 1);
    assert.equal(consulta.estadoProveedor, "ACEPTADO_SUNAT");
    const emitida = await venta(factura);
    assert.equal(emitida.estado, "EMITIDO");
    assert.equal(emitida.datos.archivos.guardados.length, 2);
    assert.equal(almacenamiento.llamadas.at(-1)?.codigo, "FIT1-000012");
  });

  test("reintentarEmision guarda el historial, renumera y restaura el estado si no puede emitir", async () => {
    await rechazaCon(servicio.reintentarEmision(randomUUID()), NotFoundException, /No se encontró la venta/);
    await rechazaCon(servicio.reintentarEmision(await insertarVenta()), ConflictException, /SUNAT haya rechazado/);
    const vencida = await insertarVenta({ fecha: diasAtras(7), estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: "BIT1", numero: 5 }, respuesta: { aceptada_por_sunat: false, sunat_responsecode: "2335" } } });
    await rechazaCon(servicio.reintentarEmision(vencida), BadRequestException, /plazo de envío de esta boleta venció/);

    simularNubefact(() => json({ aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "El documento del cliente no coincide" }));
    const rechazada = await servicio.crear(boletaServicio(15), usuarioId);
    const original = await venta(rechazada.id);

    process.env.NUBEFACT_TOKEN = "";
    await rechazaCon(servicio.reintentarEmision(rechazada.id), BadRequestException, /Configura en el servidor la ruta/);
    const restaurada = await venta(rechazada.id);
    assert.equal(restaurada.estado, "ERROR_NUBEFACT");
    assert.deepEqual(restaurada.datos, original.datos);
    restaurarEntorno();

    simularNubefact(sinRespuesta);
    const pendiente = await servicio.reintentarEmision(rechazada.id);
    assert.equal(pendiente.estado, "PENDIENTE");
    let actual = await venta(rechazada.id);
    assert.equal(actual.estado, "NUBEFACT_PENDIENTE");
    assert.equal(actual.datos.historialEmisiones.length, 1);
    assert.equal(actual.datos.historialEmisiones[0].estadoProveedor, "RECHAZADO_SUNAT");
    assert.equal(actual.datos.historialEmisiones[0].codigoComprobante, `${original.datos.solicitud.serie}-${original.datos.solicitud.numero}`);
    assert.equal(actual.datos.historialEmisiones[0].consultaComprobante, null);
    assert.notEqual(llamadasNubefact[0].cuerpo.codigo_unico, original.datos.solicitud.codigo_unico);

    // Una venta NUBEFACT_PENDIENTE no puede resolverse por consulta (ver BUG documentado); se simula el estado de error previo.
    await db.update(esquema.ingresos).set({ estado: "ERROR_NUBEFACT" }).where(eq(esquema.ingresos.id, rechazada.id));
    simularNubefact(() => json({ aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "Sigue sin coincidir" }));
    assert.equal((await servicio.consultarEstadoComprobante(rechazada.id)).estadoProveedor, "RECHAZADO_SUNAT");
    simularNubefact(() => aceptada());
    const emitida = await servicio.reintentarEmision(rechazada.id);
    assert.equal(emitida.estado, "EMITIDO");
    actual = await venta(rechazada.id);
    assert.equal(actual.estado, "EMITIDO");
    assert.equal(actual.datos.historialEmisiones.length, 2);
    assert.match(actual.datos.historialEmisiones[1].detalleProveedor, /Sigue sin coincidir/);
    assert.ok(actual.datos.historialEmisiones[1].consultaComprobante);
  });
});

describe("comunicación de baja de boletas", () => {
  test("valida el comprobante, el motivo, el plazo y la confirmación de entrega", async () => {
    const motivo = { motivo: "Error de digitación", confirmoNoEntregado: true };
    await rechazaCon(servicio.anularIngreso(randomUUID(), motivo, usuarioId), NotFoundException, /No se encontró la venta/);
    await rechazaCon(servicio.anularIngreso(await insertarVenta({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO" }), motivo, usuarioId), BadRequestException, /boleta o factura emitida/);
    const emitida = await insertarVenta();
    await rechazaCon(servicio.anularIngreso(emitida, { motivo: "x" }, usuarioId), BadRequestException, /no fue entregado/);
    await rechazaCon(servicio.anularIngreso(await insertarVenta({ datosNubefact: { respuesta: { aceptada_por_sunat: true } } }), motivo, usuarioId), BadRequestException, /serie y número NubeFact/);
    await rechazaCon(servicio.anularIngreso(emitida, { ...motivo, motivo: "  " }, usuarioId), BadRequestException, /motivo de anulación es obligatorio/);
    await rechazaCon(servicio.anularIngreso(emitida, { ...motivo, motivo: "x".repeat(101) }, usuarioId), BadRequestException, /hasta 100 caracteres/);
    await rechazaCon(servicio.anularIngreso(await insertarVenta({ fecha: diasAtras(8) }), motivo, usuarioId), BadRequestException, /plazo de 7 días/);
    await rechazaCon(servicio.anularIngreso(await insertarVenta({ datosNubefact: { solicitud: { serie: "BIT1", numero: 1 }, respuesta: { aceptada_por_sunat: false } } }), motivo, usuarioId), BadRequestException, /aceptado por SUNAT/);
    const consultaAceptada = await insertarVenta({ datosNubefact: { solicitud: { serie: "BIT1", numero: 1 }, respuesta: { aceptada_por_sunat: false }, consultaComprobante: { respuesta: { aceptada_por_sunat: true } }, anulacion: { estado: "ANULADO" } } });
    await rechazaCon(servicio.anularIngreso(consultaAceptada, motivo, usuarioId), BadRequestException, /ya figura anulado/);
    await rechazaCon(servicio.anularIngreso(await insertarVenta({ datosNubefact: { solicitud: { serie: "BIT1", numero: 1 }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "PENDIENTE" } } }), motivo, usuarioId), BadRequestException, /anulación está pendiente/);
    process.env.NUBEFACT_RUTA = "http://example.invalid/api";
    await rechazaCon(servicio.anularIngreso(emitida, motivo, usuarioId), BadRequestException, /antes de comunicar la baja/);
    restaurarEntorno();

    const conNota = await insertarVenta();
    await db.insert(esquema.comprobantesRelacionados).values({ ingresoOrigenId: conNota, tipoComprobante: "NOTA_CREDITO", codigoMotivo: 5, motivo: "Descuento", fecha: hoy, serie: "BZZ9", numero: 800_000 + Math.floor(Math.random() * 99_999), subtotal: "1.00", igv: "0.00", total: "1.00", estado: "EMITIDO", usuarioId });
    await rechazaCon(servicio.anularIngreso(conNota, motivo, usuarioId), BadRequestException, /Primero resuelve la baja de las notas/);

    await rechazaCon(servicio.consultarAnulacionIngreso(randomUUID(), usuarioId), NotFoundException, /No se encontró la venta/);
    await rechazaCon(servicio.consultarAnulacionIngreso(await insertarVenta({ datosNubefact: {} }), usuarioId), BadRequestException, /numeración válida/);
    await rechazaCon(servicio.consultarAnulacionIngreso(emitida, usuarioId), BadRequestException, /No hay una comunicación de baja pendiente/);
  });

  test("una baja sin respuesta queda pendiente y su consulta la confirma o la mantiene", async () => {
    const id = await insertarVenta({ fecha: diasAtras(2) });
    simularNubefact(sinRespuesta);
    const enviada = await servicio.anularIngreso(id, { motivo: "Cliente desistió", confirmoNoEntregado: true }, usuarioId);
    assert.equal(enviada.estado, "ANULACION_PENDIENTE");
    assert.match(String(enviada.mensaje), /Consulta el estado de la anulación/);
    const solicitud = llamadasNubefact[0].cuerpo;
    const datosVenta = (await venta(id)).datos;
    assert.deepEqual({ ...solicitud, codigo_unico: undefined }, { operacion: "generar_anulacion", tipo_de_comprobante: 2, serie: SERIES.BOLETA, numero: datosVenta.solicitud.numero,
      fecha: `${diasAtras(2).slice(8, 10)}-${diasAtras(2).slice(5, 7)}-${diasAtras(2).slice(0, 4)}`, motivo: "Cliente desistió", codigo_unico: undefined });
    assert.equal(solicitud.codigo_unico, `BOLETA-${SERIES.BOLETA}-${datosVenta.solicitud.numero}-${id}`);
    let guardada = await venta(id);
    assert.equal(guardada.estado, "EMITIDO");
    assert.equal(guardada.datos.anulacion.estado, "PENDIENTE");

    simularNubefact(tiempoAgotado);
    assert.equal((await servicio.consultarAnulacionIngreso(id, usuarioId)).estado, "ANULACION_PENDIENTE");
    simularNubefact(() => json({ sunat_ticket_numero: "T-900", sunat_responsecode: "0" }));
    assert.deepEqual(await servicio.consultarAnulacionIngreso(id, usuarioId), { estado: "PENDIENTE", detalle: null, ticket: "T-900" });
    assert.deepEqual(llamadasNubefact[0].cuerpo, { operacion: "consultar_anulacion", tipo_de_comprobante: 2, serie: SERIES.BOLETA, numero: datosVenta.solicitud.numero });
    simularNubefact(() => json({ anulado: true, sunat_description: "Comunicación aceptada", enlace_del_pdf: "https://example.invalid/baja.pdf" }));
    assert.deepEqual(await servicio.consultarAnulacionIngreso(id, usuarioId), { estado: "ANULADO", detalle: "Comunicación aceptada", ticket: null });
    guardada = await venta(id);
    assert.equal(guardada.estado, "ANULADO");
    assert.equal(guardada.datos.anulacion.archivos.guardados.length, 1);
    assert.equal(almacenamiento.llamadas.at(-1)?.tipoComprobante, "BOLETA_ANULACION");
    await rechazaCon(servicio.consultarAnulacionIngreso(id, usuarioId), BadRequestException, /No hay una comunicación de baja pendiente/);
  });

  test("las respuestas de baja rechazadas, inválidas o en cola se interpretan sin perder la venta", async () => {
    const motivo = { motivo: "Duplicado", confirmoNoEntregado: true };
    const casos: [() => Response, string, string | null][] = [
      [() => json({ sunat_responsecode: "2324", sunat_description: "Fuera de plazo" }), "RECHAZADO", "Fuera de plazo"],
      [() => textoPlano("<html>"), "RECHAZADO", "NubeFact no devolvió una respuesta JSON válida."],
      [() => json({ errors: ["Comprobante no existe"] }), "RECHAZADO", null],
      [() => json({}, 500), "RECHAZADO", null],
      [() => json({ errors: [] }), "ANULACION_PENDIENTE", null],
      [() => json(["en", "cola"]), "ANULACION_PENDIENTE", null],
      [() => json({ errors: { codigo: 1 } }), "RECHAZADO", null],
    ];
    for (const [respuesta, estado, detalle] of casos) {
      const id = await insertarVenta();
      simularNubefact(respuesta);
      const resultado = await servicio.anularIngreso(id, motivo, usuarioId);
      assert.equal(resultado.estado, estado);
      assert.equal(resultado.detalle, detalle);
      assert.equal((await venta(id)).estado, "EMITIDO");
    }
    const reintentable = await insertarVenta();
    simularNubefact(() => json({ sunat_responsecode: 2324, error: "Rechazo de baja" }));
    assert.equal((await servicio.anularIngreso(reintentable, motivo, usuarioId)).estado, "RECHAZADO");
    const listado = await servicio.listarVentas({ tipoVenta: "REPUESTOS", busqueda: `QAI-${reintentable}` });
    assert.deepEqual([listado.items[0].estadoProveedor, listado.items[0].detalleProveedor], ["BAJA_RECHAZADA", "Rechazo de baja"]);
    almacenamiento.fallar = "error";
    simularNubefact(() => json({ aceptada_por_sunat: true, sunat_ticket_numero: "T-1" }));
    const aceptadaSinArchivo = await servicio.anularIngreso(reintentable, motivo, usuarioId);
    assert.deepEqual(aceptadaSinArchivo, { estado: "ANULADO", motivo: "Duplicado", detalle: null, ticket: "T-1", archivos: { guardados: [], errores: [{ tipo: "GENERAL", mensaje: "Disco lleno simulado" }] } });
    almacenamiento.fallar = "texto";
    simularNubefact(() => json({ aceptada_por_sunat: true }));
    const otra = await servicio.anularIngreso(await insertarVenta(), motivo, usuarioId);
    assert.equal(otra.archivos?.errores[0]?.mensaje, "No se pudieron archivar los documentos de NubeFact.");
  });

  test("la consulta de baja interpreta rechazos y no reactiva una venta ya anulada", async () => {
    const pendiente = (valores: Partial<typeof esquema.ingresos.$inferInsert> = {}) => insertarVenta({ datosNubefact: { solicitud: { serie: "BIT1", numero: 3 }, respuesta: { aceptada_por_sunat: true }, anulacion: { estado: "PENDIENTE", ticket: "T-ANTERIOR", solicitud: { tipo_de_comprobante: 2 } } }, ...valores });
    const casos: [() => Response, string, string | null][] = [
      [() => textoPlano("<xml>"), "RECHAZADO", "NubeFact no devolvió una respuesta JSON válida."],
      [() => json({}, 500), "RECHAZADO", null],
      [() => json({ sunat_soap_error: "0127 - El ticket no existe" }), "RECHAZADO", "0127 - El ticket no existe"],
      [() => json({ sunat_responsecode: "99" }), "RECHAZADO", null],
      [() => json(["cola"]), "PENDIENTE", null],
    ];
    for (const [respuesta, estado, detalle] of casos) {
      const id = await pendiente();
      simularNubefact(respuesta);
      assert.deepEqual(await servicio.consultarAnulacionIngreso(id, usuarioId), { estado, detalle, ticket: "T-ANTERIOR" });
      assert.equal((await venta(id)).datos.anulacion.estado, estado);
    }
    const yaAnulada = await pendiente({ estado: "ANULADO" });
    const antes = await venta(yaAnulada);
    simularNubefact(() => json({ sunat_responsecode: "99" }));
    assert.equal((await servicio.consultarAnulacionIngreso(yaAnulada, usuarioId)).estado, "RECHAZADO");
    const despues = await venta(yaAnulada);
    assert.equal(despues.estado, "ANULADO");
    assert.deepEqual(despues.datos, antes.datos, "Una venta ya anulada no se modifica con una respuesta tardía.");
  });
});

describe("notas de crédito y débito", () => {
  let origen: { id: string; producto: string; servicio: string; serie: string };
  let origenNrus: { id: string; producto: string; servicio: string; serie: string };

  async function crearOrigen() {
    const producto = await crearProducto({ stock: 5 });
    simularNubefact(() => aceptada({ aceptada_por_sunat: true }));
    const resultado = await servicio.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "BOLETA", clienteId: natural.id, medioPago: "EFECTIVO",
      detalles: [{ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 2, afectacionIgv: "GRAVADO" }, { tipo: "SERVICIO", descripcion: "Diagnóstico", cantidad: 1, precioUnitario: 30, afectacionIgv: "EXONERADO" }] }, usuarioId);
    const detalles = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, resultado.id));
    globalThis.fetch = fetchProhibido;
    return { id: resultado.id, producto: detalles.find((detalle) => detalle.tipo === "PRODUCTO")!.id, servicio: detalles.find((detalle) => detalle.tipo === "SERVICIO")!.id, serie: String(llamadasNubefact[0].cuerpo.serie) };
  }

  before(async () => {
    process.env.REGIMEN_TRIBUTARIO = "GENERAL";
    await asegurarSeries();
    origen = await crearOrigen();
    origenNrus = await crearOrigen();
    restaurarEntorno();
  });

  const nota = (tipo: "NOTA_CREDITO" | "NOTA_DEBITO", lineas: unknown[], extra: Record<string, unknown> = {}) =>
    ({ tipo, cuentaFinancieraId: cuentaEfectivo, medioPago: "EFECTIVO", lineas, ...extra });

  test("valida el comprobante de origen y las líneas antes de emitir", async () => {
    await rechazaCon(servicio.obtenerFuenteNota(randomUUID()), BadRequestException, /boletas o facturas emitidas/);
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "1.00" }], { cuentaFinancieraId: cuentaBanco }), usuarioId), BadRequestException, /no coincide con la cuenta/);
    await rechazaCon(servicio.emitirNota(randomUUID(), nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "1.00" }]), usuarioId), NotFoundException, /No se encontró la venta/);
    await rechazaCon(servicio.emitirNota(await insertarVenta({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO" }), nota("NOTA_DEBITO", [{ detalleId: origen.producto, monto: "1.00" }]), usuarioId), BadRequestException, /Solo puedes emitir notas/);
    process.env.NUBEFACT_TOKEN = " ";
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_DEBITO", [{ detalleId: origen.producto, monto: "1.00" }]), usuarioId), BadRequestException, /antes de emitir una nota/);
    restaurarEntorno();
    await rechazaCon(servicio.emitirNota(await insertarVenta({ datosNubefact: { respuesta: { aceptada_por_sunat: true } } }), nota("NOTA_DEBITO", [{ detalleId: origen.producto, monto: "1.00" }]), usuarioId), BadRequestException, /numeración de NubeFact válida/);
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: randomUUID(), monto: "1.00" }]), usuarioId), BadRequestException, /no pertenece al comprobante original/);
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "0" }]), usuarioId), BadRequestException, /El ajuste de/);
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "20.01" }]), usuarioId), BadRequestException, /supera el saldo disponible de esa línea/);
    const fuente = await servicio.obtenerFuenteNota(origen.id);
    assert.equal(fuente.moneda, "PEN");
    assert.deepEqual(fuente.lineas.map((linea) => [linea.tipo, linea.total, linea.creditoAplicado, linea.saldoParaCredito]).sort(), [["PRODUCTO", "20.00", "0.00", "20.00"], ["SERVICIO", "30.00", "0.00", "30.00"]]);
  });

  test("emite notas de crédito y débito con la trama correcta y descuenta el saldo acreditable", async () => {
    process.env.REGIMEN_TRIBUTARIO = "GENERAL";
    simularNubefact(() => aceptada());
    const credito = await servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "5.00" }], { observacion: "Descuento QA" }), usuarioId);
    const serieCredito = await asegurarSerie("NOTA_CREDITO_BOLETA", SERIES.NOTA_CREDITO_BOLETA);
    assert.equal(credito.estado, "EMITIDO");
    assert.match(credito.codigoComprobante, new RegExp(`^${serieCredito}-\\d{6}$`));
    assert.equal(credito.archivos.guardados.length, 2);
    const trama = llamadasNubefact[0].cuerpo;
    assert.deepEqual([trama.tipo_de_comprobante, trama.documento_que_se_modifica_tipo, trama.documento_que_se_modifica_serie, trama.tipo_de_nota_de_credito, trama.tipo_de_nota_de_debito, trama.total, trama.total_gravada, trama.total_igv, trama.observaciones, trama.cliente_tipo_de_documento],
      [3, 2, origen.serie, 5, "", 5, 4.24, 0.76, "Descuento QA", 1]);
    assert.deepEqual((trama.items as Record<string, unknown>[]).map((item) => [item.tipo_de_igv, item.subtotal, item.igv, item.precio_unitario]), [[1, 4.24, 0.76, 2.5]]);
    const [guardada] = await db.select().from(esquema.comprobantesRelacionados).where(eq(esquema.comprobantesRelacionados.id, credito.id));
    assert.deepEqual([guardada.estado, guardada.total, guardada.subtotal, guardada.igv, guardada.cuentaFinancieraId], ["EMITIDO", "5.00", "4.24", "0.76", cuentaEfectivo]);
    const detalleNota = await db.select().from(esquema.comprobantesRelacionadosDetalle).where(eq(esquema.comprobantesRelacionadosDetalle.comprobanteRelacionadoId, credito.id));
    assert.deepEqual(detalleNota.map((fila) => fila.ingresoDetalleId), [origen.producto]);
    assert.deepEqual(almacenamiento.llamadas.at(-1), { entidadTipo: "COMPROBANTE_RELACIONADO", entidadId: credito.id, tipoComprobante: "NOTA_CREDITO", codigo: credito.codigoComprobante });

    const fuente = await servicio.obtenerFuenteNota(origen.id);
    assert.deepEqual(fuente.lineas.find((linea) => linea.id === origen.producto)?.creditoAplicado, "5.00");
    assert.deepEqual(fuente.lineas.find((linea) => linea.id === origen.producto)?.saldoParaCredito, "15.00");
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.producto, monto: "15.01" }]), usuarioId), BadRequestException, /saldo disponible de esa línea/);

    simularNubefact(() => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/nd.pdf", errors: [] }));
    const debitoExonerado = await servicio.emitirNota(origen.id, nota("NOTA_DEBITO", [{ detalleId: origen.servicio, monto: "3.00" }]), usuarioId);
    const tramaDebito = llamadasNubefact[0].cuerpo;
    assert.deepEqual([tramaDebito.tipo_de_comprobante, tramaDebito.tipo_de_nota_de_debito, tramaDebito.tipo_de_nota_de_credito, tramaDebito.total_exonerada, tramaDebito.total_gravada, tramaDebito.total_igv], [4, 2, "", 3, "", 0]);
    assert.equal((tramaDebito.items as Record<string, unknown>[])[0].tipo_de_igv, 8);
    assert.equal(debitoExonerado.estado, "EMITIDO");

    process.env.REGIMEN_TRIBUTARIO = "NRUS";
    await db.update(esquema.seriesComprobantes).set({ activa: false }).where(eq(esquema.seriesComprobantes.tipoComprobante, "NOTA_DEBITO_BOLETA"));
    simularNubefact(() => json({ aceptada_por_sunat: true }));
    const debitoNrus = await servicio.emitirNota(origenNrus.id, nota("NOTA_DEBITO", [{ detalleId: origenNrus.producto, monto: "2.00" }]), usuarioId);
    assert.match(debitoNrus.codigoComprobante, new RegExp(`^${origenNrus.serie}-`), "Sin serie de nota de débito se usa la serie del comprobante original.");
    const tramaNrus = llamadasNubefact[0].cuerpo;
    assert.deepEqual([tramaNrus.total_inafecta, tramaNrus.total_igv, (tramaNrus.items as Record<string, unknown>[])[0].tipo_de_igv], [2, 0, 9]);

    const notaHistorica = randomUUID();
    await db.insert(esquema.comprobantesRelacionados).values({ id: notaHistorica, ingresoOrigenId: origen.id, tipoComprobante: "NOTA_CREDITO", codigoMotivo: 1, motivo: "Histórica", fecha: hoy, serie: "BZZ8", numero: 700_000 + Math.floor(Math.random() * 99_999), subtotal: "40.00", igv: "0.00", total: "40.00", estado: "EMITIDO", usuarioId, datosNubefact: { respuesta: {} } });
    await rechazaCon(servicio.emitirNota(origen.id, nota("NOTA_CREDITO", [{ detalleId: origen.servicio, monto: "10.00" }]), usuarioId), BadRequestException, /supera el saldo del comprobante original/);
    await db.update(esquema.comprobantesRelacionados).set({ estado: "ANULADO" }).where(eq(esquema.comprobantesRelacionados.id, notaHistorica));
  });

  test("los fallos del proveedor marcan la nota con error y explican el motivo", async () => {
    const origenes: string[] = [];
    const intentar = async (respuesta: () => Response) => {
      const fuente = await crearOrigen();
      origenes.push(fuente.id);
      simularNubefact(respuesta);
      return servicio.emitirNota(fuente.id, nota("NOTA_DEBITO", [{ detalleId: fuente.servicio, monto: "1.00" }]), usuarioId);
    };
    await rechazaCon(intentar(sinRespuesta), BadRequestException, /No hubo respuesta de NubeFact/);
    await rechazaCon(intentar(() => json({ errors: "Serie no autorizada" })), BadRequestException, /^Serie no autorizada$/);
    await rechazaCon(intentar(() => json({ aceptada_por_sunat: false })), BadRequestException, /no confirmó la emisión de la nota/);
    await rechazaCon(intentar(() => textoPlano("<html>")), BadRequestException, /no confirmó la emisión de la nota/);
    await rechazaCon(intentar(() => json(["x"])), BadRequestException, /no confirmó la emisión de la nota/);
    await rechazaCon(intentar(() => json({ errors: { serie: "x" }, enlace_del_pdf: "https://example.invalid/x.pdf" })), BadRequestException, /no confirmó la emisión de la nota/);
    await rechazaCon(intentar(() => json({ aceptada_por_sunat: true }, 500)), BadRequestException, /no confirmó la emisión de la nota/);
    const conError = await db.select().from(esquema.comprobantesRelacionados).where(and(inArray(esquema.comprobantesRelacionados.ingresoOrigenId, origenes), eq(esquema.comprobantesRelacionados.estado, "ERROR_NUBEFACT")));
    assert.equal(conError.length, 7);
    assert.ok(conError.some((fila) => /Sin respuesta del proveedor/.test(String((fila.datosNubefact as Record<string, unknown>).mensaje))));
  });

  test("reintentar una nota sin respuesta consulta primero su estado y permite emitirla si nunca se registró", async () => {
    const fuente = await crearOrigen();
    const datos = nota("NOTA_DEBITO", [{ detalleId: fuente.servicio, monto: "1.00" }]);
    simularNubefact(sinRespuesta);
    await rechazaCon(servicio.emitirNota(fuente.id, datos, usuarioId), BadRequestException, /No hubo respuesta/);
    await rechazaCon(servicio.emitirNota(fuente.id, datos, usuarioId), ConflictException, /No se sabe si NubeFact/);
    simularNubefact((cuerpo) => cuerpo.operacion === "consultar_comprobante" ? json({ errors: "El documento no existe" }, 400) : aceptada());
    assert.equal((await servicio.emitirNota(fuente.id, datos, usuarioId)).estado, "EMITIDO");
    await rechazaCon(servicio.emitirNota(fuente.id, datos, usuarioId), ConflictException, /ya tiene la nota de débito/);
  });

  test("las notas se listan y su baja se comunica y consulta", async () => {
    await rechazaCon(servicio.anularNota(origen.id, randomUUID(), { motivo: "x", confirmoNoEntregado: true }, usuarioId), NotFoundException, /No se encontró la nota/);
    await rechazaCon(servicio.consultarAnulacionNota(origen.id, randomUUID()), NotFoundException, /No se encontró la nota/);
    const notas = await servicio.listarNotas(origen.id);
    const credito = notas.find((fila) => fila.tipoComprobante === "NOTA_CREDITO" && fila.estado === "EMITIDO" && fila.total === "5.00")!;
    const debito = notas.find((fila) => fila.tipoComprobante === "NOTA_DEBITO" && fila.estado === "EMITIDO" && fila.total === "3.00")!;
    assert.ok(credito && debito);
    assert.equal(credito.enlacePdf, `/archivos/${credito.id}-PDF/contenido`);
    assert.equal(credito.enlaceCdr, null);
    assert.deepEqual([credito.codigoMotivo, credito.motivo, credito.estadoAnulacion], [5, "Descuento por ítem", null]);
    const ordenadas = notas.map((fila) => fila.id);
    assert.equal(new Set(ordenadas).size, ordenadas.length);

    const [fallida] = await db.select().from(esquema.comprobantesRelacionados).where(eq(esquema.comprobantesRelacionados.estado, "ERROR_NUBEFACT")).limit(1);
    if (fallida) await rechazaCon(servicio.anularNota(fallida.ingresoOrigenId, fallida.id, { motivo: "x", confirmoNoEntregado: true }, usuarioId), BadRequestException, /nota electrónica emitida/);
    await rechazaCon(servicio.anularNota(origen.id, credito.id, { motivo: "x" }, usuarioId), BadRequestException, /la nota no fue entregada/);
    await rechazaCon(servicio.consultarAnulacionNota(origen.id, credito.id), BadRequestException, /No hay una comunicación de baja pendiente/);

    simularNubefact(() => json({ sunat_ticket_numero: "T-NOTA" }));
    const enviada = await servicio.anularNota(origen.id, credito.id, { motivo: "Nota duplicada", confirmoNoEntregado: true }, usuarioId);
    assert.deepEqual([enviada.estado, enviada.ticket], ["ANULACION_PENDIENTE", "T-NOTA"]);
    assert.equal(llamadasNubefact[0].cuerpo.tipo_de_comprobante, 3);
    const listadas = await servicio.listarNotas(origen.id);
    const pendiente = listadas.find((fila) => fila.id === credito.id)!;
    assert.deepEqual([pendiente.estado, pendiente.estadoAnulacion, pendiente.motivoAnulacion], ["ANULACION_PENDIENTE", "PENDIENTE", "Nota duplicada"]);
    const [fila] = await db.select().from(esquema.comprobantesRelacionados).where(eq(esquema.comprobantesRelacionados.id, credito.id));
    assert.equal(fila.estado, "EMITIDO");

    simularNubefact(() => json({ aceptada_por_sunat: true, enlace_del_pdf: "https://example.invalid/baja-nota.pdf" }));
    assert.deepEqual(await servicio.consultarAnulacionNota(origen.id, credito.id), { estado: "ANULADO", detalle: null, ticket: null });
    const [anulada] = await db.select().from(esquema.comprobantesRelacionados).where(eq(esquema.comprobantesRelacionados.id, credito.id));
    assert.equal(anulada.estado, "ANULADO");
    assert.equal(almacenamiento.llamadas.at(-1)?.tipoComprobante, "NOTA_CREDITO_ANULACION");
    assert.equal((await servicio.listarNotas(origen.id)).find((item) => item.id === credito.id)?.estado, "ANULADO");

    simularNubefact(() => json({ aceptada_por_sunat: true, enlace_del_cdr: "https://example.invalid/baja.zip" }));
    const debitoAnulado = await servicio.anularNota(origen.id, debito.id, { motivo: "Error", confirmoNoEntregado: true }, usuarioId);
    assert.equal(debitoAnulado.estado, "ANULADO");
    assert.deepEqual(almacenamiento.llamadas.at(-1), { entidadTipo: "COMPROBANTE_RELACIONADO", entidadId: debito.id, tipoComprobante: "NOTA_DEBITO_ANULACION", codigo: `${debito.codigoComprobante}-ANULACION` });
    assert.equal(llamadasNubefact[0].cuerpo.tipo_de_comprobante, 4);

    const vigente = await servicio.listarNotas(origenNrus.id).then((filas) => filas.find((item) => item.estado === "EMITIDO"));
    assert.ok(vigente);
    await db.update(esquema.ingresos).set({ estado: "ANULADO" }).where(eq(esquema.ingresos.id, origenNrus.id));
    await rechazaCon(servicio.anularNota(origenNrus.id, vigente.id, { motivo: "x", confirmoNoEntregado: true }, usuarioId), BadRequestException, /comprobante original no esta vigente/);
  });

  test("consultar la baja de una nota archiva sus documentos como entidad COMPROBANTE_RELACIONADO", async () => {
    const llamada = almacenamiento.llamadas.find((item) => item.tipoComprobante === "NOTA_CREDITO_ANULACION");
    assert.ok(llamada, "La prueba anterior consulta la baja aceptada de una nota de crédito.");
    assert.equal(llamada.entidadTipo, "COMPROBANTE_RELACIONADO");
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
    await db.delete(esquema.ingresosPagos).where(inArray(esquema.ingresosPagos.ingresoId, ids));
    await db.delete(esquema.cotizaciones).where(inArray(esquema.cotizaciones.ingresoId, ids));
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, ids));
    await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, ids));
  }
  if (cotizacionesCreadas.length) await db.delete(esquema.cotizaciones).where(inArray(esquema.cotizaciones.id, cotizacionesCreadas));
  if (modelosMototaxi.length) {
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
