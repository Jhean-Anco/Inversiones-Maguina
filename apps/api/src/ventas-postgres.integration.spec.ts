import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { ServicioAlmacenamiento } from "./modulos/almacenamiento/almacenamiento.service";
import { ServicioEgresos } from "./modulos/egresos/egresos.service";
import { ServicioIngresos } from "./modulos/ingresos/ingresos.service";
import { ServicioFinanzas } from "./modulos/finanzas/finanzas.service";
import { ServicioEntradasStock } from "./modulos/inventario/entradas-stock.service";
import { ServicioProductos } from "./modulos/inventario/productos.service";
import { ServicioMovimientosStock } from "./modulos/inventario/movimientos-stock.service";
import { ServicioMototaxis } from "./modulos/mototaxis/mototaxis.service";

function validarBaseDePruebas() {
  assert.equal(process.env.NODE_ENV, "test", "La integración exige NODE_ENV=test.");
  const valor = process.env.DATABASE_URL;
  assert.ok(valor, "La integración exige DATABASE_URL explícita.");
  const url = new URL(valor);
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname));
  assert.equal(url.pathname, "/magina_test");
  assert.equal(url.username, "ci");
  assert.equal(url.password, "ci-only-password");
}

validarBaseDePruebas();

type PaqueteBaseDatos = typeof import("@magina/database");
let db: PaqueteBaseDatos["db"];
let cerrarBaseDatos: PaqueteBaseDatos["cerrarBaseDatos"];
let esquema: PaqueteBaseDatos;
let servicio: ServicioIngresos;
let servicioEgresos: ServicioEgresos;
let servicioEntradasStock: ServicioEntradasStock;
let servicioMototaxis: ServicioMototaxis;
let usuarioId: string;
let clienteId: string;
let clienteDni: string;
let categoriaId: string;
let marcaId: string;
let unidadCodigo: string;
let listaPrecioId: string;
const productoIds: string[] = [];
const egresoIds: string[] = [];
const entradaStockIds: string[] = [];
const cuentaFinancieraIds: string[] = [];
const comprobantesRelacionadosIds: string[] = [];
const presentacionPorProducto = new Map<string, string>();
const clavesVenta: string[] = [];
const seriesFiscalesPrueba: string[] = [];
const marcasMototaxisPrueba: string[] = [];
const modelosMototaxisPrueba: string[] = [];
const comprasMototaxisPrueba: string[] = [];
const listasPrecioPrueba: string[] = [];
let quitarProveedorPrueba = false;

function fechaHoyPeru() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
}

before(async () => {
  const modulo = await import("@magina/database");
  esquema = modulo;
  ({ db, cerrarBaseDatos } = modulo);
  servicio = new ServicioIngresos(new ServicioAlmacenamiento());
  servicioEgresos = new ServicioEgresos();
  servicioEntradasStock = new ServicioEntradasStock();
  servicioMototaxis = new ServicioMototaxis();
  const serieBoleta = `BQA${randomUUID().replaceAll("-", "").slice(0, 1).toUpperCase()}`;
  seriesFiscalesPrueba.push(serieBoleta);
  await servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: serieBoleta, ultimoNumero: 0 });
  const serieNotaVenta = `NQA${randomUUID().replaceAll("-", "").slice(0, 1).toUpperCase()}`;
  seriesFiscalesPrueba.push(serieNotaVenta);
  await servicio.guardarSerieConfigurada({ tipoComprobante: "NOTA_VENTA", serie: serieNotaVenta, ultimoNumero: 0 });

  const [tipoNatural] = await db.select({ id: esquema.tiposPersona.id }).from(esquema.tiposPersona)
    .where(eq(esquema.tiposPersona.codigo, "NATURAL")).limit(1);
  const [tipoDni] = await db.select({ id: esquema.tiposDocumento.id }).from(esquema.tiposDocumento)
    .where(eq(esquema.tiposDocumento.codigo, "01")).limit(1);
  const [unidad] = await db.select({ codigo: esquema.unidadesMedida.codigo }).from(esquema.unidadesMedida)
    .where(eq(esquema.unidadesMedida.activo, true)).limit(1);
  const [listaGeneral] = await db.select({ id: esquema.tiposListasPrecio.id }).from(esquema.tiposListasPrecio)
    .where(and(eq(esquema.tiposListasPrecio.codigo, "GENERAL"), eq(esquema.tiposListasPrecio.activo, true))).limit(1);
  assert.ok(tipoNatural && tipoDni && unidad && listaGeneral, "Faltan catálogos base creados por las migraciones.");
  unidadCodigo = unidad.codigo;
  listaPrecioId = listaGeneral.id;

  const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  clienteDni = String(BigInt(`0x${sufijo.slice(0, 8)}`) % 100_000_000n).padStart(8, "0");

  const [personaUsuario] = await db.insert(esquema.personas).values({
    tipoPersonaId: tipoNatural.id,
    tipoDocumentoId: tipoDni.id,
    numeroDocumento: String(BigInt(`0x${sufijo.slice(2, 10)}`) % 100_000_000n).padStart(8, "0"),
    nombres: `QA Usuario ${sufijo}`,
    apellidoPaterno: "Pruebas",
  }).returning({ id: esquema.personas.id });
  const fechaHoy = fechaHoyPeru();
  await db.insert(esquema.trabajadores).values({ personaId: personaUsuario.id, fechaIngreso: fechaHoy });
  const [usuario] = await db.insert(esquema.usuarios).values({
    trabajadorId: personaUsuario.id,
    nombreUsuario: `qa_${sufijo.toLowerCase()}`,
    correo: `qa-${sufijo.toLowerCase()}@example.invalid`,
    contrasenaHash: "hash-ficticio-no-utilizado-en-el-test",
    requiereCambioContrasena: false,
  }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;

  const [personaCliente] = await db.insert(esquema.personas).values({
    tipoPersonaId: tipoNatural.id,
    tipoDocumentoId: tipoDni.id,
    numeroDocumento: clienteDni,
    nombres: `QA Cliente ${sufijo}`,
    apellidoPaterno: "Venta",
  }).returning({ id: esquema.personas.id });
  const [cliente] = await db.insert(esquema.clientes).values({ personaId: personaCliente.id }).returning({ personaId: esquema.clientes.personaId });
  clienteId = cliente.personaId;

  const [categoria] = await db.insert(esquema.categoriasProductos).values({ nombre: `QA ${sufijo}` }).returning({ id: esquema.categoriasProductos.id });
  categoriaId = categoria.id;
  const [marca] = await db.insert(esquema.marcasProductos).values({ nombre: `QA ${sufijo}`, uso: "REPUESTOS" }).returning({ id: esquema.marcasProductos.id });
  marcaId = marca.id;
});

async function crearProductoConStock(cantidad: number) {
  const sufijo = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const [producto] = await db.insert(esquema.productos).values({
    codigoInterno: `QA-${sufijo}`,
    nombre: `Producto sintético ${sufijo}`,
    categoriaId,
    marcaId,
    unidadBaseCodigo: unidadCodigo,
    afectacionIgv: "GRAVADO",
    afectoIgv: true,
  }).returning({ id: esquema.productos.id });
  productoIds.push(producto.id);
  const [presentacion] = await db.insert(esquema.productosPresentaciones).values({
    productoId: producto.id,
    unidadMedidaCodigo: unidadCodigo,
    nombre: "Unidad base de prueba",
    factorAUnidadBase: "1.000000",
    seCompra: true,
    seVende: true,
    esBase: true,
  }).returning({ id: esquema.productosPresentaciones.id });
  presentacionPorProducto.set(producto.id, presentacion.id);
  await db.insert(esquema.preciosProductos).values({
    productoId: producto.id,
    presentacionId: presentacion.id,
    tipoListaPrecioId: listaPrecioId,
    precio: "10.00",
    cantidadMinima: "1.000",
  });
  await db.insert(esquema.saldosStock).values({ productoId: producto.id, cantidad: cantidad.toFixed(6) });
  return { productoId: producto.id, presentacionId: presentacion.id };
}

function datosVenta(presentacionId: string, cantidad: number, clave = randomUUID()) {
  clavesVenta.push(clave);
  return {
    idempotencyKey: clave,
    fecha: fechaHoyPeru(),
    tipoComprobante: "NOTA_VENTA",
    clienteId,
    clienteTipoDocumento: "DNI",
    clienteNumeroDocumento: clienteDni,
    medioPago: "EFECTIVO",
    condicionPago: "CONTADO",
    detalles: [{ tipo: "PRODUCTO", presentacionId, cantidad, afectacionIgv: "GRAVADO" }],
  };
}

function datosBoleta(presentacionId: string, clave = randomUUID()) {
  const venta = datosVenta(presentacionId, 1, clave);
  return { ...venta, tipoComprobante: "BOLETA" };
}

function datosEntradaStock(productoId: string, presentacionId: string, cantidad: number, costoUnitario: number, cuentaFinancieraId: string) {
  return {
    fecha: fechaHoyPeru(),
    tipoDocumento: "SIN_DOCUMENTO",
    proveedorDireccion: "Dirección sintética de prueba",
    observacion: "Recepción de prueba automatizada",
    pagos: [{ cuentaFinancieraId, medioPago: "EFECTIVO", importePagado: Number((cantidad * costoUnitario).toFixed(2)) }],
    detalles: [{ productoId, presentacionId, cantidad, costoUnitario }],
  };
}

async function crearCuentaEfectivo() {
  const [cuenta] = await db.insert(esquema.cuentasFinancieras).values({
    tipo: "EFECTIVO",
    nombre: `QA caja ${randomUUID().slice(0, 8)}`,
    moneda: "PEN",
    usuarioId,
  }).returning({ id: esquema.cuentasFinancieras.id });
  cuentaFinancieraIds.push(cuenta.id);
  return cuenta.id;
}

async function crearEgresoParaPago(monto: number) {
  const registro = await servicioEgresos.crear({
    tipo: "MOTOTAXI",
    fecha: fechaHoyPeru(),
    categoria: "Prueba automatizada",
    concepto: `Egreso sintético ${randomUUID().slice(0, 8)}`,
    beneficiario: "Proveedor de prueba",
    moneda: "PEN",
    monto,
    mototaxiMarca: "Marca QA",
    mototaxiModelo: "Modelo QA",
    mototaxiNumeroMotor: `MOTOR-${randomUUID()}`,
    mototaxiNumeroChasis: `CHASIS-${randomUUID()}`,
  }, usuarioId);
  egresoIds.push(registro.id);
  return registro.id;
}

function datosPagoEgreso(importePagado: number, cuentaFinancieraId: string, claveIdempotencia = randomUUID()) {
  return {
    fechaPago: fechaHoyPeru(),
    importePagado,
    medioPago: "EFECTIVO",
    cuentaFinancieraId,
    claveIdempotencia,
  };
}

async function ventasPorClaves(claves: string[]) {
  return db.select({ id: esquema.ingresos.id, clave: esquema.ingresos.claveIdempotencia })
    .from(esquema.ingresos).where(inArray(esquema.ingresos.claveIdempotencia, claves));
}

test("venta rechazada por stock insuficiente revierte cabecera, detalle y movimientos en PostgreSQL", async () => {
  const producto = await crearProductoConStock(1);
  const datos = datosVenta(producto.presentacionId, 2);

  await assert.rejects(
    () => servicio.crear(datos, usuarioId),
    (error) => error instanceof BadRequestException && /Stock insuficiente/.test(error.message),
  );

  const [saldo] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock)
    .where(eq(esquema.saldosStock.productoId, producto.productoId));
  const [movimientos] = await db.select({ total: esquema.movimientosStock.id }).from(esquema.movimientosStock)
    .where(and(eq(esquema.movimientosStock.productoId, producto.productoId), eq(esquema.movimientosStock.origenTipo, "INGRESO")));
  assert.equal(Number(saldo.cantidad), 1);
  assert.equal(movimientos, undefined);
  assert.deepEqual(await ventasPorClaves([datos.idempotencyKey]), []);
});

test("dos ventas concurrentes por la última unidad producen una sola venta y un saldo final coherente", async () => {
  const producto = await crearProductoConStock(1);
  const primera = datosVenta(producto.presentacionId, 1);
  const segunda = datosVenta(producto.presentacionId, 1);
  const resultados = await Promise.allSettled([
    servicio.crear(primera, usuarioId),
    servicio.crear(segunda, usuarioId),
  ]);

  assert.equal(resultados.filter((resultado) => resultado.status === "fulfilled").length, 1);
  const rechazada = resultados.find((resultado) => resultado.status === "rejected");
  assert.ok(rechazada && rechazada.status === "rejected");
  assert.ok(rechazada.reason instanceof BadRequestException);
  assert.match(rechazada.reason.message, /Stock insuficiente/);

  const [saldo] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock)
    .where(eq(esquema.saldosStock.productoId, producto.productoId));
  assert.equal(Number(saldo.cantidad), 0);
  assert.equal((await ventasPorClaves([primera.idempotencyKey, segunda.idempotencyKey])).length, 1);
  const movimientos = await db.select({ id: esquema.movimientosStock.id }).from(esquema.movimientosStock)
    .where(and(eq(esquema.movimientosStock.productoId, producto.productoId), eq(esquema.movimientosStock.origenTipo, "INGRESO")));
  assert.equal(movimientos.length, 1);
});

test("dos solicitudes concurrentes con la misma clave de idempotencia solo descuentan stock una vez", async () => {
  const producto = await crearProductoConStock(2);
  const clave = randomUUID();
  const datos = datosVenta(producto.presentacionId, 1, clave);
  const [primera, segunda] = await Promise.all([
    servicio.crear(datos, usuarioId),
    servicio.crear(datos, usuarioId),
  ]);

  assert.equal(primera.id, segunda.id);
  assert.equal((await ventasPorClaves([clave])).length, 1);
  const [saldo] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock)
    .where(eq(esquema.saldosStock.productoId, producto.productoId));
  assert.equal(Number(saldo.cantidad), 1);
  const movimientos = await db.select({ id: esquema.movimientosStock.id }).from(esquema.movimientosStock)
    .where(and(eq(esquema.movimientosStock.productoId, producto.productoId), eq(esquema.movimientosStock.origenTipo, "INGRESO")));
  assert.equal(movimientos.length, 1);
});

test("una boleta rechazada muestra la respuesta SUNAT y puede reintentarse sin repetir la venta", async () => {
  const originalFetch = globalThis.fetch;
  let solicitudCapturada: Record<string, unknown> | undefined;
  let solicitudReintento: Record<string, unknown> | undefined;
  let autorizacionCapturada = "";
  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    solicitudCapturada = JSON.parse(String(init?.body)) as Record<string, unknown>;
    autorizacionCapturada = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response(JSON.stringify({
      aceptada_por_sunat: false,
      sunat_description: "El documento del cliente no coincide.",
      sunat_note: "Revise el tipo de documento.",
      sunat_responsecode: 2335,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const producto = await crearProductoConStock(2);
    const datos = datosBoleta(producto.presentacionId);
    const resultado = await servicio.crear(datos, usuarioId);
    const [venta] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, resultado.id));

    assert.equal(resultado.estado, "ERROR");
    assert.equal(venta.estado, "ERROR_NUBEFACT");
    assert.deepEqual((venta.datosNubefact as { respuesta: unknown }).respuesta, {
      aceptada_por_sunat: false,
      sunat_description: "El documento del cliente no coincide.",
      sunat_note: "Revise el tipo de documento.",
      sunat_responsecode: 2335,
    });
    assert.equal(solicitudCapturada?.operacion, "generar_comprobante");
    assert.equal(solicitudCapturada?.tipo_de_comprobante, 2);
    assert.equal(autorizacionCapturada, "ci-only-fake-token");

    const listado = await servicio.listarVentas({ tipoVenta: "REPUESTOS" });
    const filaRechazada = listado.items.find((item) => item.id === venta.id);
    assert.equal(filaRechazada?.estadoProveedor, "RECHAZADO_SUNAT");
    assert.match(filaRechazada?.detalleProveedor ?? "", /2335/);
    assert.match(filaRechazada?.detalleProveedor ?? "", /El documento del cliente no coincide/);

    await assert.rejects(() => servicio.consultarEstadoComprobante("id-inválido"), (error) => error instanceof BadRequestException);
    await assert.rejects(() => servicio.consultarEstadoComprobante(randomUUID()), (error) => error instanceof NotFoundException);
    globalThis.fetch = (async () => { throw new Error("fallo de red simulado"); }) as typeof fetch;
    await assert.rejects(() => servicio.consultarEstadoComprobante(venta.id), (error) => error instanceof BadRequestException);
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "Servicio temporalmente no disponible" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
    await assert.rejects(() => servicio.consultarEstadoComprobante(venta.id), (error) => error instanceof BadRequestException && /HTTP 503/.test(error.message));

    let consultaCapturada: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
      consultaCapturada = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        aceptada_por_sunat: false,
        sunat_description: "El documento del cliente no coincide.",
        sunat_note: "Validado nuevamente en NubeFact.",
        sunat_responsecode: 2335,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const resultadoConsulta = await servicio.consultarEstadoComprobante(venta.id);
    const [ventaConsultada] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, venta.id));
    const datosConsultados = ventaConsultada.datosNubefact as { respuesta: unknown; consultaComprobante: { respuesta: Record<string, unknown> } };
    assert.deepEqual(consultaCapturada, { operacion: "consultar_comprobante", tipo_de_comprobante: 2, serie: solicitudCapturada?.serie, numero: solicitudCapturada?.numero });
    assert.equal(resultadoConsulta.estadoProveedor, "RECHAZADO_SUNAT");
    assert.match(resultadoConsulta.detalleProveedor ?? "", /Validado nuevamente en NubeFact/);
    assert.deepEqual(datosConsultados.respuesta, (venta.datosNubefact as { respuesta: unknown }).respuesta);
    assert.equal(datosConsultados.consultaComprobante.respuesta.sunat_note, "Validado nuevamente en NubeFact.");
    const listadoConsultado = await servicio.listarVentas({ tipoVenta: "REPUESTOS" });
    const filaConsultada = listadoConsultado.items.find((item) => item.id === venta.id);
    assert.match(filaConsultada?.detalleProveedor ?? "", /Validado nuevamente en NubeFact/);

    const movimientosAntes = await db.select({ id: esquema.movimientosStock.id }).from(esquema.movimientosStock)
      .where(and(eq(esquema.movimientosStock.origenId, venta.id), eq(esquema.movimientosStock.origenTipo, "INGRESO")));
    const pagosAntes = await db.select({ id: esquema.ingresosPagos.id }).from(esquema.ingresosPagos)
      .where(eq(esquema.ingresosPagos.ingresoId, venta.id));
    assert.equal(movimientosAntes.length, 1);

    let emitirRespuesta: ((respuesta: Response) => void) | undefined;
    let indicarSolicitudEnCurso: (() => void) | undefined;
    const proveedorRecibioReintento = new Promise<void>((resolve) => { indicarSolicitudEnCurso = resolve; });
    let llamadasReintento = 0;
    globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
      llamadasReintento += 1;
      solicitudReintento = JSON.parse(String(init?.body)) as Record<string, unknown>;
      indicarSolicitudEnCurso?.();
      return new Promise<Response>((resolve) => {
        emitirRespuesta = resolve;
      });
    }) as typeof fetch;

    const reintentoEnCurso = servicio.reintentarEmision(venta.id);
    await proveedorRecibioReintento;
    await assert.rejects(
      () => servicio.reintentarEmision(venta.id),
      (error) => error instanceof ConflictException,
    );
    emitirRespuesta?.(new Response(JSON.stringify({ aceptada_por_sunat: true, sunat_description: "Aceptada en prueba" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const resultadoReintento = await reintentoEnCurso;
    const [ventaReintentada] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, venta.id));
    const solicitudInicial = (venta.datosNubefact as { solicitud: Record<string, unknown> }).solicitud;
    const datosActuales = ventaReintentada.datosNubefact as { historialEmisiones: { respuesta: unknown; detalleProveedor: string }[]; solicitud: Record<string, unknown> };
    const movimientosDespues = await db.select({ id: esquema.movimientosStock.id }).from(esquema.movimientosStock)
      .where(and(eq(esquema.movimientosStock.origenId, venta.id), eq(esquema.movimientosStock.origenTipo, "INGRESO")));
    const pagosDespues = await db.select({ id: esquema.ingresosPagos.id }).from(esquema.ingresosPagos)
      .where(eq(esquema.ingresosPagos.ingresoId, venta.id));

    assert.equal(resultadoReintento.estado, "EMITIDO");
    assert.equal(ventaReintentada.estado, "EMITIDO");
    assert.notEqual(solicitudReintento?.codigo_unico, solicitudInicial.codigo_unico);
    assert.ok(Number(datosActuales.solicitud.numero) > Number(solicitudInicial.numero));
    assert.equal(datosActuales.historialEmisiones.length, 1);
    assert.match(datosActuales.historialEmisiones[0].detalleProveedor, /2335/);
    assert.deepEqual(movimientosDespues, movimientosAntes);
    assert.deepEqual(pagosDespues, pagosAntes);
    assert.equal(llamadasReintento, 1);

    await assert.rejects(
      () => servicio.reintentarEmision(venta.id),
      (error) => error instanceof ConflictException,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("respuesta aceptada del NubeFact simulado marca la boleta como emitida", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ aceptada_por_sunat: true, mensaje: "Aceptación sintética" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;

  try {
    const producto = await crearProductoConStock(2);
    const resultado = await servicio.crear(datosBoleta(producto.presentacionId), usuarioId);
    const [venta] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, resultado.id));

    assert.equal(resultado.estado, "EMITIDO");
    assert.equal(venta.estado, "EMITIDO");
    assert.deepEqual((venta.datosNubefact as { respuesta: unknown }).respuesta, { aceptada_por_sunat: true, mensaje: "Aceptación sintética" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("las notas de crédito y débito mueven la cuenta seleccionada y el resumen financiero", async () => {
  const producto = await crearProductoConStock(2);
  const cuentaId = await crearCuentaEfectivo();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ aceptada_por_sunat: true })) as typeof fetch;

  try {
    const venta = await servicio.crear(datosBoleta(producto.presentacionId), usuarioId);
    const [detalle] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, venta.id));
    assert.ok(detalle);
    const finanzas = new ServicioFinanzas();
    const emitirNota = (tipo: "NOTA_CREDITO" | "NOTA_DEBITO", lineas: unknown[], medioPago = "EFECTIVO") =>
      servicio.emitirNota(venta.id, { tipo, cuentaFinancieraId: cuentaId, medioPago, lineas }, usuarioId);
    await assert.rejects(emitirNota("NOTA_CREDITO", []), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", [null]), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", Array.from({ length: 101 }, () => ({ detalleId: detalle.id, monto: "1.00" }))), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", [{ detalleId: detalle.id, monto: "1.00" }, { detalleId: detalle.id, monto: "1.00" }]), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", [{ detalleId: randomUUID(), monto: "1.00" }]), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", [{ detalleId: detalle.id, monto: "999.00" }]), BadRequestException);
    await assert.rejects(emitirNota("NOTA_CREDITO", [], "TRANSFERENCIA"), BadRequestException);
    const resumenInicial = await finanzas.resumenDelMes();
    const cuentaInicial = resumenInicial.items.find((item) => item.id === cuentaId);
    assert.ok(cuentaInicial);

    const debito = await servicio.emitirNota(venta.id, { tipo: "NOTA_DEBITO", cuentaFinancieraId: cuentaId, medioPago: "EFECTIVO", lineas: [{ detalleId: detalle.id, monto: "2.00" }] }, usuarioId);
    const credito = await servicio.emitirNota(venta.id, { tipo: "NOTA_CREDITO", cuentaFinancieraId: cuentaId, medioPago: "EFECTIVO", lineas: [{ detalleId: detalle.id, monto: "1.00" }] }, usuarioId);
    comprobantesRelacionadosIds.push(debito.id, credito.id);

    const notasGuardadas = await db.select({ id: esquema.comprobantesRelacionados.id, cuentaFinancieraId: esquema.comprobantesRelacionados.cuentaFinancieraId })
      .from(esquema.comprobantesRelacionados).where(inArray(esquema.comprobantesRelacionados.id, [debito.id, credito.id]));
    assert.equal(notasGuardadas.length, 2);
    assert.ok(notasGuardadas.every((nota) => nota.cuentaFinancieraId === cuentaId));

    const cuentaFinal = (await finanzas.resumenDelMes()).items.find((item) => item.id === cuentaId);
    assert.ok(cuentaFinal);
    assert.equal(Number(cuentaFinal.ingresosMes) - Number(cuentaInicial.ingresosMes), 2);
    assert.equal(Number(cuentaFinal.egresosMes) - Number(cuentaInicial.egresosMes), 1);
    assert.equal(Number(cuentaFinal.netoMes) - Number(cuentaInicial.netoMes), 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("compra de repuestos registra el documento, actualiza saldo y genera movimiento en PostgreSQL", async () => {
  const producto = await crearProductoConStock(0);
  const cuentaId = await crearCuentaEfectivo();
  const entrada = await servicioEntradasStock.crear(datosEntradaStock(producto.productoId, producto.presentacionId, 3, 4.25, cuentaId), usuarioId);
  entradaStockIds.push(entrada.id);

  const [saldo] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock)
    .where(eq(esquema.saldosStock.productoId, producto.productoId));
  const movimientos = await db.select({ cantidadBase: esquema.movimientosStock.cantidadBase, origenId: esquema.movimientosStock.origenId })
    .from(esquema.movimientosStock).where(and(eq(esquema.movimientosStock.productoId, producto.productoId), eq(esquema.movimientosStock.origenTipo, "ENTRADA_STOCK")));

  assert.equal(entrada.detalles.length, 1);
  assert.equal(entrada.total, "12.75");
  assert.equal(entrada.detalles[0].subtotal, "12.75");
  assert.equal(Number(saldo.cantidad), 3);
  assert.equal(movimientos.length, 1);
  assert.equal(movimientos[0].origenId, entrada.id);
  assert.equal(Number(movimientos[0].cantidadBase), 3);
});

test("compra de repuestos inválida revierte cabecera y conserva el saldo de PostgreSQL", async () => {
  const producto = await crearProductoConStock(2);
  const cuentaId = await crearCuentaEfectivo();
  const antes = await db.select({ id: esquema.entradasStock.id }).from(esquema.entradasStock);

  await assert.rejects(
    () => servicioEntradasStock.crear(datosEntradaStock(producto.productoId, randomUUID(), 1, 5, cuentaId), usuarioId),
    (error) => error instanceof BadRequestException && /no está disponible para compra/.test(error.message),
  );

  const despues = await db.select({ id: esquema.entradasStock.id }).from(esquema.entradasStock);
  const [saldo] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock)
    .where(eq(esquema.saldosStock.productoId, producto.productoId));
  assert.equal(despues.length, antes.length);
  assert.equal(Number(saldo.cantidad), 2);
  assert.deepEqual(await db.select({ id: esquema.movimientosStock.id }).from(esquema.movimientosStock)
    .where(and(eq(esquema.movimientosStock.productoId, producto.productoId), eq(esquema.movimientosStock.origenTipo, "ENTRADA_STOCK"))), []);
});

test("dos pagos concurrentes no exceden el saldo del egreso en PostgreSQL", async () => {
  const egresoId = await crearEgresoParaPago(100);
  const cuentaId = await crearCuentaEfectivo();
  const resultados = await Promise.allSettled([
    servicioEgresos.registrarPago(egresoId, datosPagoEgreso(60, cuentaId), usuarioId),
    servicioEgresos.registrarPago(egresoId, datosPagoEgreso(60, cuentaId), usuarioId),
  ]);

  assert.equal(resultados.filter((resultado) => resultado.status === "fulfilled").length, 1);
  const rechazado = resultados.find((resultado) => resultado.status === "rejected");
  assert.ok(rechazado && rechazado.status === "rejected");
  assert.ok(rechazado.reason instanceof BadRequestException);
  assert.match(rechazado.reason.message, /supera el saldo pendiente/);

  const pagos = await db.select({ importePagado: esquema.egresosPagos.importePagado })
    .from(esquema.egresosPagos).where(eq(esquema.egresosPagos.egresoId, egresoId));
  assert.equal(pagos.length, 1);
  assert.equal(Number(pagos[0].importePagado), 60);
  assert.equal(100 - pagos.reduce((total, pago) => total + Number(pago.importePagado), 0), 40);
});

test("dos pagos concurrentes con la misma clave idempotente crean un solo abono", async () => {
  const egresoId = await crearEgresoParaPago(100);
  const cuentaId = await crearCuentaEfectivo();
  const datos = datosPagoEgreso(60, cuentaId);
  const [primero, segundo] = await Promise.all([
    servicioEgresos.registrarPago(egresoId, datos, usuarioId),
    servicioEgresos.registrarPago(egresoId, datos, usuarioId),
  ]);

  assert.equal(primero.id, segundo.id);
  const pagos = await db.select({ importePagado: esquema.egresosPagos.importePagado })
    .from(esquema.egresosPagos).where(eq(esquema.egresosPagos.egresoId, egresoId));
  assert.equal(pagos.length, 1);
  assert.equal(Number(pagos[0].importePagado), 60);
});

test("el ajuste de mototaxis aplica el saldo por modelo y conserva el historial de VIN", async () => {
  const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const marca = await servicioMototaxis.crearMarca({ nombre: `QA Moto ${sufijo}` });
  marcasMototaxisPrueba.push(marca.id);
  const modeloCreado = await servicioMototaxis.crearModelo({ marcaId: marca.id, nombre: `Modelo QA ${sufijo}`, version: "V1" });
  const modeloActualizado = await servicioMototaxis.actualizarModelo(modeloCreado.id, {
    marcaId: marca.id,
    nombre: `Modelo QA ${sufijo}`,
    version: "V2",
    categoriaVehicular: "L5",
    tipoMototaxi: "PASAJERO",
    tipoMotor: "MONOCILINDRICO_4T",
    tipoRefrigeracion: "AIRE",
    coloresDisponibles: ["Rojo", "rojo", "Azul"],
    cilindradaCc: 200,
    capacidadAsientos: 3,
    capacidadCargaKg: 250.5,
    precioVenta: 150,
    fabricante: "Fabricante QA",
    paisFabricacion: "Perú",
    marcaMotor: "Motor QA",
    modeloMotor: "M200",
    combustible: "Gasolina",
    transmision: "Manual",
    carroceria: "Metálica",
    especificacionesAdicionales: "Ficha sintética",
  });
  const modelo = { id: modeloActualizado.id };
  modelosMototaxisPrueba.push(modelo.id);
  assert.equal(modeloActualizado.version, "V2");
  assert.equal(modeloActualizado.tipoMotor, "MONOCILINDRICO_4T");
  assert.equal(modeloActualizado.coloresDisponibles.length, 2);
  assert.equal(modeloActualizado.precioVenta, null);
  assert.equal((await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 175 }, usuarioId)).precioVenta, "175.00");
  const [disponible] = await db.insert(esquema.unidadesMototaxis).values({ codigo: `QA-MT-${sufijo}-1`, modeloId: modelo.id, vin: `VIN-QA-${sufijo}-1`, numeroMotor: `MOTOR-QA-${sufijo}-1`, costoAdquisicion: "100.00", estado: "DISPONIBLE" }).returning({ id: esquema.unidadesMototaxis.id });
  await db.insert(esquema.unidadesMototaxis).values([
    { codigo: `QA-MT-${sufijo}-2`, modeloId: modelo.id, vin: `VIN-QA-${sufijo}-2`, numeroMotor: `MOTOR-QA-${sufijo}-2`, costoAdquisicion: "100.00", estado: "FALTANTE" },
    { codigo: `QA-MT-${sufijo}-3`, modeloId: modelo.id, vin: `VIN-QA-${sufijo}-3`, numeroMotor: `MOTOR-QA-${sufijo}-3`, costoAdquisicion: "100.00", estado: "VENDIDA" },
  ]);

  assert.ok((await servicioMototaxis.listarMarcas()).some((fila) => fila.id === marca.id));
  assert.ok((await servicioMototaxis.listarModelos(sufijo)).some((fila) => fila.id === modelo.id));
  const analisis = await servicioMototaxis.obtenerAnalisisModelo(modelo.id);
  assert.equal(analisis.existencias.disponibles, 0);
  assert.equal(analisis.compras.unidades, 0);
  assert.equal(analisis.ventas.unidades, 0);
  const reconteo = await servicioMototaxis.obtenerReconteoModelo(modelo.id);
  assert.equal(reconteo.cantidadSistema, 0);
  assert.ok(!(await servicioMototaxis.listarAjustesInventario()).some((ajuste) => ajuste.modeloId === modelo.id));

  const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 1, motivo: "Conteo físico" }, usuarioId);
  assert.equal(resultado.cantidadSistema, 0);
  assert.equal(resultado.cantidadContada, 1);
  assert.equal((await servicioMototaxis.obtenerReconteoModelo(modelo.id)).cantidadSistema, 1);
  assert.equal((await servicio.buscarMototaxisVenta(sufijo))[0]?.stockDisponible, 1);
  const [ajuste] = await db.select().from(esquema.ajustesInventarioMototaxis).where(eq(esquema.ajustesInventarioMototaxis.id, resultado.id));
  assert.equal(ajuste.cantidadContada, 1);
  const detalles = await db.select().from(esquema.ajustesInventarioMototaxisDetalle).where(eq(esquema.ajustesInventarioMototaxisDetalle.ajusteId, resultado.id));
  assert.equal(detalles.length, 0);
  const [unidad] = await db.select({ estado: esquema.unidadesMototaxis.estado }).from(esquema.unidadesMototaxis).where(eq(esquema.unidadesMototaxis.id, disponible.id));
  assert.equal(unidad.estado, "DISPONIBLE");
  const ajustesListados = await servicioMototaxis.listarAjustesInventario();
  assert.ok(ajustesListados.some((ajusteListado) => ajusteListado.id === resultado.id && ajusteListado.aplicado));
  assert.deepEqual(await servicioMototaxis.listarMovimientos(disponible.id), []);
  await assert.rejects(servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadSistema: 0, cantidadContada: 2, motivo: "Conteo desactualizado" }, usuarioId), ConflictException);

  await assert.rejects(servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: -1, motivo: "Conteo inválido" }, usuarioId), BadRequestException);
  await assert.rejects(servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 1.5, motivo: "Conteo inválido" }, usuarioId), BadRequestException);
  const ajustes = await db.select().from(esquema.ajustesInventarioMototaxis).where(eq(esquema.ajustesInventarioMototaxis.modeloId, modelo.id));
  assert.equal(ajustes.length, 1);
});

test("el repuesto existe sin precio y conserva su presentación al editar los datos", async () => {
  const productos = new ServicioProductos();
  const movimientos = new ServicioMovimientosStock();
  const datos = {
    nombre: `Repuesto catálogo ${randomUUID().slice(0, 8)}`, categoriaId, marcaId, unidadBaseCodigo: unidadCodigo,
    afectacionIgv: "GRAVADO",
  };
  const nuevo = await productos.guardar(datos);
  productoIds.push(nuevo.id);
  const base = nuevo.presentaciones.find((item) => item.esBase);
  assert.ok(base);
  assert.equal(nuevo.precioGeneral, null);
  assert.equal(Number(nuevo.stockActual), 0);
  assert.equal(nuevo.precios.length, 0);
  assert.equal((await productos.listar({ busqueda: nuevo.codigoInterno, precio: "PENDIENTE" })).items[0]?.id, nuevo.id);
  const precioPendiente = (await servicio.buscarProductos(nuevo.codigoInterno, false, undefined, false, true))[0];
  assert.deepEqual(precioPendiente?.tramos, []);
  assert.equal((await servicio.buscarProductos(nuevo.codigoInterno)).length, 0);

  const [lista] = await db.insert(esquema.tiposListasPrecio).values({ codigo: `QA-${randomUUID().slice(0, 8)}`, nombre: nuevo.nombre }).returning();
  listasPrecioPrueba.push(lista.id);
  const tramo = { presentacionId: base.id, tipoListaPrecioId: listaPrecioId, cantidadMinima: "1" };
  await productos.configurarPrecio(nuevo.id, { ...tramo, precio: "15.00" }, usuarioId);
  const fechaFutura = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  await productos.configurarPrecio(nuevo.id, { ...tramo, precio: "16.00", vigenteDesde: fechaFutura }, usuarioId);
  await assert.rejects(productos.configurarPrecio(nuevo.id, { ...tramo, precio: "17.00", vigenteDesde: fechaFutura }, usuarioId), ConflictException);
  await productos.configurarPrecio(nuevo.id, { ...tramo, tipoListaPrecioId: lista.id, cantidadMinima: "5", precio: "12.00" }, usuarioId);

  const ajuste = await movimientos.crearAjuste({ productoId: nuevo.id, saldoEsperado: "0", cantidadContada: "9", motivo: "INVENTARIO_FISICO" }, usuarioId);
  assert.equal(Number(ajuste.saldoFinal), 9);
  await assert.rejects(movimientos.crearAjuste({ productoId: nuevo.id, saldoEsperado: "0", cantidadContada: "3", motivo: "INVENTARIO_FISICO" }, usuarioId), ConflictException);
  const venta = await servicio.crear({
    ...datosVenta(base.id, 5),
    detalles: [{ tipo: "PRODUCTO", presentacionId: base.id, cantidad: 5, listaPrecioCodigo: lista.codigo, precioEsperado: "12.00", afectacionIgv: "GRAVADO" }],
  }, usuarioId);
  assert.equal(venta.total, "60.00");
  const actualizado = await productos.guardar({ ...datos, nombre: `${datos.nombre} editado` }, nuevo.id);
  assert.equal(Number(actualizado.stockActual), 4);
  assert.equal(actualizado.presentaciones.find((item) => item.esBase)?.id, base.id);
  assert.equal(actualizado.precioGeneral, "15.00");
  assert.equal(actualizado.precios.length, 3);
  assert.equal((await productos.historial(nuevo.id)).venta?.importe, "12.0000");
});

test("una compra repetida por modelo se recibe una sola vez y la anulación devuelve la cantidad vendida", async () => {
  const nombre = `Modelo compra QA ${randomUUID().slice(0, 8)}`;
  const marca = await servicioMototaxis.crearMarca({ nombre });
  marcasMototaxisPrueba.push(marca.id);
  const modelo = await servicioMototaxis.crearModelo({ marcaId: marca.id, nombre });
  modelosMototaxisPrueba.push(modelo.id);
  const proveedor = await servicioMototaxis.crearProveedor({
    tipoDocumento: "DNI", numeroDocumento: clienteDni, nombres: "QA", apellidoPaterno: "Proveedor",
  });
  assert.equal(proveedor.id, clienteId);
  quitarProveedorPrueba = true;
  const cuentaFinancieraId = await crearCuentaEfectivo();
  const datosCompra = {
    claveIdempotencia: randomUUID(), proveedorPersonaId: clienteId, fecha: fechaHoyPeru(), documentoTipo: "SIN_DOCUMENTO",
    importePagoInicial: "300.00", pagosIniciales: [{ medioPago: "EFECTIVO", cuentaFinancieraId, importePagado: "300.00" }],
    detalles: [{ modeloId: modelo.id, cantidad: 3, costoUnitario: "100.00" }],
  };
  const [primera, segunda] = await Promise.all([
    servicioMototaxis.crearCompra(datosCompra, usuarioId),
    servicioMototaxis.crearCompra(datosCompra, usuarioId),
  ]);
  comprasMototaxisPrueba.push(primera.id);
  assert.equal(primera.id, segunda.id);
  assert.equal((await servicioMototaxis.listarGarantias()).find((item) => item.codigo === primera.codigo)?.cantidad, 3);
  assert.equal((await servicioMototaxis.obtenerReconteoModelo(modelo.id)).cantidadSistema, 3);

  const payload = {
    ...datosBoleta(modelo.id),
    detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: modelo.id, cantidad: 2, precioUnitario: "150.00", afectacionIgv: "GRAVADO" }],
  };
  await assert.rejects(servicio.crear(payload, usuarioId), BadRequestException);
  await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta: "150.00" }, usuarioId);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, opciones) => {
    const solicitud = JSON.parse(String(opciones?.body));
    if (solicitud.operacion === "generar_anulacion") return Response.json({ sunat_ticket_numero: "QA-TICKET" });
    return Response.json({ aceptada_por_sunat: true });
  }) as typeof fetch;
  try {
    const venta = await servicio.crear(payload, usuarioId);
    assert.equal(venta.total, "300.00");
    assert.equal((await servicioMototaxis.obtenerReconteoModelo(modelo.id)).cantidadSistema, 1);
    const [detalle] = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, venta.id));
    assert.equal(detalle.mototaxiModeloId, modelo.id);
    assert.equal(detalle.mototaxiUnidadId, null);
    assert.equal((await servicio.anularIngreso(venta.id, { motivo: "Anulación sintética", confirmoNoEntregado: true }, usuarioId)).estado, "ANULACION_PENDIENTE");
    const resultados = await Promise.all([
      servicio.consultarAnulacionIngreso(venta.id, usuarioId),
      servicio.consultarAnulacionIngreso(venta.id, usuarioId),
    ]);
    assert.ok(resultados.every((item) => item.estado === "ANULADO"));
    const ficha = await servicioMototaxis.obtenerAnalisisModelo(modelo.id);
    assert.equal(ficha.existencias.disponibles, 3);
    assert.equal(ficha.movimientos.filter((item) => item.tipo === "ANULACION_VENTA").length, 1);
    assert.equal(ficha.ventas.unidades, 0);
  } finally { globalThis.fetch = originalFetch; }
});

after(async () => {
  if (db && esquema) {
    if (comprasMototaxisPrueba.length) {
      const detallesCompras = await db.select({ id: esquema.comprasMototaxisDetalle.id }).from(esquema.comprasMototaxisDetalle).where(inArray(esquema.comprasMototaxisDetalle.compraId, comprasMototaxisPrueba));
      if (detallesCompras.length) await db.delete(esquema.garantiasMototaxis).where(inArray(esquema.garantiasMototaxis.compraDetalleId, detallesCompras.map((item) => item.id)));
      await db.delete(esquema.pagosComprasMototaxis).where(inArray(esquema.pagosComprasMototaxis.compraId, comprasMototaxisPrueba));
      await db.delete(esquema.comprasMototaxisDetalle).where(inArray(esquema.comprasMototaxisDetalle.compraId, comprasMototaxisPrueba));
      await db.delete(esquema.comprasMototaxis).where(inArray(esquema.comprasMototaxis.id, comprasMototaxisPrueba));
    }
    if (entradaStockIds.length) {
      await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, entradaStockIds));
      await db.delete(esquema.entradasStock).where(inArray(esquema.entradasStock.id, entradaStockIds));
    }
    if (seriesFiscalesPrueba.length) {
      await db.delete(esquema.nubefactCorrelativos).where(inArray(esquema.nubefactCorrelativos.serie, seriesFiscalesPrueba));
      await db.delete(esquema.seriesComprobantes).where(inArray(esquema.seriesComprobantes.serie, seriesFiscalesPrueba));
    }
    if (comprobantesRelacionadosIds.length) {
      await db.delete(esquema.comprobantesRelacionadosDetalle).where(inArray(esquema.comprobantesRelacionadosDetalle.comprobanteRelacionadoId, comprobantesRelacionadosIds));
      await db.delete(esquema.comprobantesRelacionados).where(inArray(esquema.comprobantesRelacionados.id, comprobantesRelacionadosIds));
    }
    if (egresoIds.length) {
      await db.delete(esquema.egresosPagos).where(inArray(esquema.egresosPagos.egresoId, egresoIds));
      await db.delete(esquema.egresosRegistros).where(inArray(esquema.egresosRegistros.id, egresoIds));
    }
    if (cuentaFinancieraIds.length) {
      await db.delete(esquema.cuentasFinancieras).where(inArray(esquema.cuentasFinancieras.id, cuentaFinancieraIds));
    }
    const ventas = await ventasPorClaves(clavesVenta);
    const idsIngreso = ventas.map((venta) => venta.id);
    if (idsIngreso.length) {
      await db.delete(esquema.archivosLocales).where(inArray(esquema.archivosLocales.entidadId, idsIngreso));
      await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, idsIngreso));
      await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, idsIngreso));
    }
    if (modelosMototaxisPrueba.length) {
      await db.delete(esquema.preciosModelosMototaxis).where(inArray(esquema.preciosModelosMototaxis.modeloId, modelosMototaxisPrueba));
      await db.delete(esquema.movimientosModelosMototaxis).where(inArray(esquema.movimientosModelosMototaxis.modeloId, modelosMototaxisPrueba));
      await db.delete(esquema.ajustesInventarioMototaxis).where(inArray(esquema.ajustesInventarioMototaxis.modeloId, modelosMototaxisPrueba));
      await db.delete(esquema.unidadesMototaxis).where(inArray(esquema.unidadesMototaxis.modeloId, modelosMototaxisPrueba));
      await db.delete(esquema.modelosMototaxis).where(inArray(esquema.modelosMototaxis.id, modelosMototaxisPrueba));
    }
    if (marcasMototaxisPrueba.length) await db.delete(esquema.marcasProductos).where(inArray(esquema.marcasProductos.id, marcasMototaxisPrueba));
    if (productoIds.length) {
      await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.productoId, productoIds));
      await db.delete(esquema.saldosStock).where(inArray(esquema.saldosStock.productoId, productoIds));
      await db.delete(esquema.productos).where(inArray(esquema.productos.id, productoIds));
    }
    if (listasPrecioPrueba.length) await db.delete(esquema.tiposListasPrecio).where(inArray(esquema.tiposListasPrecio.id, listasPrecioPrueba));
    if (categoriaId) await db.delete(esquema.categoriasProductos).where(eq(esquema.categoriasProductos.id, categoriaId));
    if (marcaId) await db.delete(esquema.marcasProductos).where(eq(esquema.marcasProductos.id, marcaId));
    if (clienteId) {
      if (quitarProveedorPrueba) await db.delete(esquema.proveedores).where(eq(esquema.proveedores.personaId, clienteId));
      await db.delete(esquema.clientes).where(eq(esquema.clientes.personaId, clienteId));
      await db.delete(esquema.personas).where(eq(esquema.personas.id, clienteId));
    }
    if (usuarioId) {
      const [trabajador] = await db.select({ personaId: esquema.usuarios.trabajadorId }).from(esquema.usuarios)
        .where(eq(esquema.usuarios.id, usuarioId));
      await db.delete(esquema.usuarios).where(eq(esquema.usuarios.id, usuarioId));
      if (trabajador) {
        await db.delete(esquema.trabajadores).where(eq(esquema.trabajadores.personaId, trabajador.personaId));
        await db.delete(esquema.personas).where(eq(esquema.personas.id, trabajador.personaId));
      }
    }
  }
  if (cerrarBaseDatos) await cerrarBaseDatos();
});
