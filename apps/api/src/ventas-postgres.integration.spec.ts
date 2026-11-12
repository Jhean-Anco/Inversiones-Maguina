import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { ServicioAlmacenamiento } from "./modulos/almacenamiento/almacenamiento.service";
import { ServicioEgresos } from "./modulos/egresos/egresos.service";
import { ServicioIngresos } from "./modulos/ingresos/ingresos.service";

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
let clientePostgres: PaqueteBaseDatos["clientePostgres"];
let cerrarBaseDatos: PaqueteBaseDatos["cerrarBaseDatos"];
let esquema: PaqueteBaseDatos;
let servicio: ServicioIngresos;
let servicioEgresos: ServicioEgresos;
let usuarioId: string;
let clienteId: string;
let clienteDni: string;
let categoriaId: string;
let marcaId: string;
let unidadCodigo: string;
let listaPrecioId: string;
const productoIds: string[] = [];
const egresoIds: string[] = [];
const cuentaFinancieraIds: string[] = [];
const presentacionPorProducto = new Map<string, string>();
const clavesVenta: string[] = [];
const seriesFiscalesPrueba: string[] = [];

function fechaHoyPeru() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
}

before(async () => {
  const modulo = await import("@magina/database");
  esquema = modulo;
  ({ db, clientePostgres, cerrarBaseDatos } = modulo);
  servicio = new ServicioIngresos(new ServicioAlmacenamiento());
  servicioEgresos = new ServicioEgresos();
  const serieBoleta = `BQA${randomUUID().replaceAll("-", "").slice(0, 1).toUpperCase()}`;
  seriesFiscalesPrueba.push(serieBoleta);
  await servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: serieBoleta, ultimoNumero: 0 });

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
    tipo: "GASTO_OPERATIVO",
    fecha: fechaHoyPeru(),
    categoria: "Prueba automatizada",
    concepto: `Egreso sintético ${randomUUID().slice(0, 8)}`,
    beneficiario: "Proveedor de prueba",
    moneda: "PEN",
    monto,
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

test("emisión de boleta usa el NubeFact simulado y persiste el rechazo junto con la solicitud", async () => {
  const originalFetch = globalThis.fetch;
  let solicitudCapturada: Record<string, unknown> | undefined;
  let autorizacionCapturada = "";
  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    solicitudCapturada = JSON.parse(String(init?.body)) as Record<string, unknown>;
    autorizacionCapturada = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response(JSON.stringify({ errors: "Rechazo sintético del proveedor" }), {
      status: 422,
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
    assert.deepEqual((venta.datosNubefact as { respuesta: unknown }).respuesta, { errors: "Rechazo sintético del proveedor" });
    assert.equal(solicitudCapturada?.operacion, "generar_comprobante");
    assert.equal(solicitudCapturada?.tipo_de_comprobante, 2);
    assert.equal(autorizacionCapturada, "ci-only-fake-token");
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

after(async () => {
  if (db && esquema) {
    if (seriesFiscalesPrueba.length) {
      await db.delete(esquema.nubefactCorrelativos).where(inArray(esquema.nubefactCorrelativos.serie, seriesFiscalesPrueba));
      await db.delete(esquema.seriesComprobantes).where(inArray(esquema.seriesComprobantes.serie, seriesFiscalesPrueba));
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
    if (productoIds.length) {
      await db.delete(esquema.saldosStock).where(inArray(esquema.saldosStock.productoId, productoIds));
      await db.delete(esquema.productos).where(inArray(esquema.productos.id, productoIds));
    }
    if (categoriaId) await db.delete(esquema.categoriasProductos).where(eq(esquema.categoriasProductos.id, categoriaId));
    if (marcaId) await db.delete(esquema.marcasProductos).where(eq(esquema.marcasProductos.id, marcaId));
    if (clienteId) {
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
