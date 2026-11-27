import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { ServicioMototaxis } from "../mototaxis/mototaxis.service";
import { ServicioIngresos } from "./ingresos.service";
import { ServicioNotaVentaEdicion } from "./nota-venta-edicion.service";

/*
 * Edición de notas de venta contra PostgreSQL real (magina_test desechable). El archivado se simula y no hay red.
 */

function validarBaseDePruebas() {
  assert.equal(process.env.NODE_ENV, "test", "La integración exige NODE_ENV=test.");
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname));
  assert.equal(url.pathname, "/magina_test");
  assert.equal(url.username, "ci");
  assert.equal(url.password, "ci-only-password");
}
validarBaseDePruebas();

const entornoBase: Record<string, string | undefined> = { REGIMEN_TRIBUTARIO: "NRUS", DESCUENTO_MAXIMO_PORCENTAJE: "0", APIS_PERU_TOKEN: undefined };
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
  fallar: false as boolean,
  archivadas: [] as { id: string; codigo: string; total: string; detalles: { descripcion: string; cantidad: string }[] }[],
  async archivarDocumentoNotaVenta(venta: { id: string; codigo: string; total: string; detalles: { descripcion: string; cantidad: string }[] }) {
    if (this.fallar) throw new Error("Disco lleno simulado");
    this.archivadas.push(venta);
    return { id: randomUUID(), nombre: `${venta.codigo}.html`, ruta: `/archivos/${venta.id}/${this.archivadas.length}` };
  },
};
const servicioIngresos = new ServicioIngresos(almacenamiento as never);
const edicion = new ServicioNotaVentaEdicion(almacenamiento as never);
const servicioMototaxis = new ServicioMototaxis();

const fetchOriginal = globalThis.fetch;
const fetchProhibido = (async (entrada: URL | RequestInfo) => { throw new Error(`Llamada de red no simulada: ${String(entrada)}`); }) as typeof fetch;

const hoy = fechaActualPeru();
const sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();

let usuarioId: string;
let tipos: { natural: string; dni: string };
let unidadCodigo: string;
let listaGeneralId: string;
let categoriaId: string;
let marcaId: string;
let cuentaEfectivo: string;
let natural: { id: string; documento: string; nombre: string };
let otro: { id: string; documento: string; nombre: string };
const personasCreadas: string[] = [];
const productosCreados: string[] = [];
const ingresosCreados: string[] = [];
const clavesUsadas: string[] = [];
const marcasMototaxi: string[] = [];
const modelosMototaxi: string[] = [];
const guiasCreadas: string[] = [];
const ordenesCreadas: string[] = [];

const numeroAleatorio = (digitos: number) => String(BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`) % 10n ** BigInt(digitos)).padStart(digitos, "0");
const clave = () => { const valor = randomUUID(); clavesUsadas.push(valor); return valor; };

async function crearCliente(nombres: string) {
  const documento = numeroAleatorio(8);
  const [persona] = await db.insert(esquema.personas).values({ tipoPersonaId: tipos.natural, tipoDocumentoId: tipos.dni, numeroDocumento: documento, nombres, apellidoPaterno: "Edicion" }).returning({ id: esquema.personas.id });
  personasCreadas.push(persona.id);
  await db.insert(esquema.clientes).values({ personaId: persona.id, direccionFiscal: "Jr. Edicion 1", correo: "edicion.qa@example.invalid" });
  return { id: persona.id, documento, nombre: `${nombres} Edicion` };
}

async function crearProducto(opciones: { stock?: number; precio?: string } = {}) {
  const codigo = `QAE-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const [producto] = await db.insert(esquema.productos).values({ codigoInterno: codigo, nombre: `Repuesto edicion ${codigo}`, categoriaId, marcaId, unidadBaseCodigo: unidadCodigo, afectacionIgv: "GRAVADO", afectoIgv: true, usuarioId } as never)
    .returning({ id: esquema.productos.id });
  productosCreados.push(producto.id);
  const [presentacion] = await db.insert(esquema.productosPresentaciones).values({ productoId: producto.id, unidadMedidaCodigo: unidadCodigo, nombre: "Unidad", factorAUnidadBase: "1.000000", seCompra: true, seVende: true, esBase: true })
    .returning({ id: esquema.productosPresentaciones.id });
  await db.insert(esquema.preciosProductos).values({ productoId: producto.id, presentacionId: presentacion.id, tipoListaPrecioId: listaGeneralId, precio: opciones.precio ?? "10.00", cantidadMinima: "1.000" });
  await db.insert(esquema.saldosStock).values({ productoId: producto.id, cantidad: (opciones.stock ?? 10).toFixed(6) });
  return { productoId: producto.id, presentacionId: presentacion.id, nombre: `Repuesto edicion ${codigo}` };
}
type Producto = Awaited<ReturnType<typeof crearProducto>>;

async function crearNota(detalles: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  const resultado = await servicioIngresos.crear({ idempotencyKey: clave(), fecha: hoy, tipoComprobante: "NOTA_VENTA", clienteId: natural.id, medioPago: "EFECTIVO", detalles, ...extra }, usuarioId);
  ingresosCreados.push(resultado.id);
  return resultado.id as string;
}
const lineaProducto = (producto: Producto, cantidad: number, extra: Record<string, unknown> = {}) => ({ tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad, afectacionIgv: "GRAVADO", precioEsperado: "10.00", ...extra });
const editaProducto = (id: string | undefined, producto: Producto, cantidad: number, extra: Record<string, unknown> = {}) => ({ ...(id ? { id } : {}), tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad, afectacionIgv: "GRAVADO", precioUnitario: "10.00", ...extra });
const editaServicio = (id: string | undefined, precio: string, extra: Record<string, unknown> = {}) => ({ ...(id ? { id } : {}), tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: precio, afectacionIgv: "INAFECTO", ...extra });

async function cargar(id: string) {
  const [cabecera] = await db.select().from(esquema.ingresos).where(eq(esquema.ingresos.id, id));
  const detalles = await db.select().from(esquema.ingresosDetalle).where(eq(esquema.ingresosDetalle.ingresoId, id)).orderBy(esquema.ingresosDetalle.creadoEn);
  const movimientos = await db.select().from(esquema.movimientosStock).where(eq(esquema.movimientosStock.origenId, id));
  const ediciones = await db.select().from(esquema.ingresosEdiciones).where(eq(esquema.ingresosEdiciones.ingresoId, id));
  return { cabecera, detalles, movimientos, ediciones };
}
async function stock(productoId: string) {
  const [fila] = await db.select({ cantidad: esquema.saldosStock.cantidad }).from(esquema.saldosStock).where(eq(esquema.saldosStock.productoId, productoId));
  return Number(fila.cantidad);
}
async function stockModelo(modeloId: string) {
  const [fila] = await db.select({ saldo: esquema.modelosMototaxis.stockDisponible }).from(esquema.modelosMototaxis).where(eq(esquema.modelosMototaxis.id, modeloId));
  return fila.saldo;
}
async function rechazaCon(promesa: Promise<unknown>, tipo: new (...args: never[]) => Error, mensaje: RegExp) {
  await assert.rejects(promesa, (error: unknown) => {
    assert.ok(error instanceof tipo, `Se esperaba ${tipo.name} y se obtuvo ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`);
    assert.match((error as Error).message, mensaje);
    return true;
  });
}
async function asegurarSerie() {
  const [activa] = await db.select({ serie: esquema.seriesComprobantes.serie }).from(esquema.seriesComprobantes)
    .where(and(eq(esquema.seriesComprobantes.tipoComprobante, "NOTA_VENTA"), eq(esquema.seriesComprobantes.activa, true))).limit(1);
  if (!activa) await servicioIngresos.guardarSerieConfigurada({ tipoComprobante: "NOTA_VENTA", serie: "NIE1", ultimoNumero: 0 });
}

before(async () => {
  restaurarEntorno();
  globalThis.fetch = fetchProhibido;
  esquema = await import("@magina/database");
  ({ db, cerrarBaseDatos } = esquema);
  const tiposPersona = await db.select().from(esquema.tiposPersona);
  const tiposDocumento = await db.select().from(esquema.tiposDocumento);
  tipos = { natural: tiposPersona.find((fila) => fila.codigo === "NATURAL")!.id, dni: tiposDocumento.find((fila) => fila.codigo === "01")!.id };
  const [unidad] = await db.select({ codigo: esquema.unidadesMedida.codigo }).from(esquema.unidadesMedida).where(eq(esquema.unidadesMedida.activo, true)).limit(1);
  unidadCodigo = unidad.codigo;
  const [lista] = await db.select({ id: esquema.tiposListasPrecio.id }).from(esquema.tiposListasPrecio).where(eq(esquema.tiposListasPrecio.codigo, "GENERAL"));
  listaGeneralId = lista.id;
  const [personaUsuario] = await db.insert(esquema.personas).values({ tipoPersonaId: tipos.natural, tipoDocumentoId: tipos.dni, numeroDocumento: numeroAleatorio(8), nombres: `UsuarioEd${sufijo}`, apellidoPaterno: "QA" }).returning({ id: esquema.personas.id });
  personasCreadas.push(personaUsuario.id);
  await db.insert(esquema.trabajadores).values({ personaId: personaUsuario.id, fechaIngreso: hoy });
  const [usuario] = await db.insert(esquema.usuarios).values({ trabajadorId: personaUsuario.id, nombreUsuario: `qa_edicion_${sufijo.toLowerCase()}`, correo: `qa-edicion-${sufijo.toLowerCase()}@example.invalid`, contrasenaHash: "hash-ficticio" }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;
  const [categoria] = await db.insert(esquema.categoriasProductos).values({ nombre: `QA edicion ${sufijo}` }).returning({ id: esquema.categoriasProductos.id });
  categoriaId = categoria.id;
  const [marca] = await db.insert(esquema.marcasProductos).values({ nombre: `QA edicion ${sufijo}`, uso: "REPUESTOS" }).returning({ id: esquema.marcasProductos.id });
  marcaId = marca.id;
  natural = await crearCliente(`Cliente${sufijo}`);
  otro = await crearCliente(`Otro${sufijo}`);
  const [cuenta] = await db.insert(esquema.cuentasFinancieras).values({ tipo: "EFECTIVO", nombre: `QA EDI ${sufijo}`, moneda: "PEN", usuarioId }).returning({ id: esquema.cuentasFinancieras.id });
  cuentaEfectivo = cuenta.id;
  await asegurarSerie();
});

beforeEach(async () => { await asegurarSerie(); almacenamiento.archivadas.length = 0; });
afterEach(() => { globalThis.fetch = fetchProhibido; almacenamiento.fallar = false; restaurarEntorno(); });

after(async () => {
  globalThis.fetch = fetchOriginal;
  if (!db) return;
  const porClave = clavesUsadas.length ? await db.select({ id: esquema.ingresos.id }).from(esquema.ingresos).where(inArray(esquema.ingresos.claveIdempotencia, clavesUsadas)) : [];
  const ids = [...new Set([...ingresosCreados, ...porClave.map((fila) => fila.id)])];
  if (ordenesCreadas.length) await db.delete(esquema.ordenesServicio).where(inArray(esquema.ordenesServicio.id, ordenesCreadas));
  if (guiasCreadas.length) await db.delete(esquema.guiasRemision).where(inArray(esquema.guiasRemision.id, guiasCreadas));
  if (ids.length) {
    const detalles = await db.select({ id: esquema.ingresosDetalle.id }).from(esquema.ingresosDetalle).where(inArray(esquema.ingresosDetalle.ingresoId, ids));
    if (detalles.length) await db.delete(esquema.garantiasVentasMototaxis).where(inArray(esquema.garantiasVentasMototaxis.ingresoDetalleId, detalles.map((fila) => fila.id)));
    await db.delete(esquema.ingresosEdiciones).where(inArray(esquema.ingresosEdiciones.ingresoId, ids));
    await db.delete(esquema.ingresosPagos).where(inArray(esquema.ingresosPagos.ingresoId, ids));
    await db.delete(esquema.movimientosStock).where(inArray(esquema.movimientosStock.origenId, ids));
    await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, ids));
  }
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
  await db.delete(esquema.cuentasFinancieras).where(eq(esquema.cuentasFinancieras.id, cuentaEfectivo));
  if (categoriaId) await db.delete(esquema.categoriasProductos).where(eq(esquema.categoriasProductos.id, categoriaId));
  if (marcaId) await db.delete(esquema.marcasProductos).where(eq(esquema.marcasProductos.id, marcaId));
  if (usuarioId) await db.delete(esquema.usuarios).where(eq(esquema.usuarios.id, usuarioId));
  if (personasCreadas.length) {
    await db.delete(esquema.clientes).where(inArray(esquema.clientes.personaId, personasCreadas));
    await db.delete(esquema.trabajadores).where(inArray(esquema.trabajadores.personaId, personasCreadas));
    await db.delete(esquema.personas).where(inArray(esquema.personas.id, personasCreadas));
  }
  await cerrarBaseDatos();
});

describe("edición de repuestos y servicios", () => {
  test("subir y bajar la cantidad mueve solo la diferencia de stock y recalcula el total", async () => {
    const producto = await crearProducto({ stock: 10 });
    const id = await crearNota([lineaProducto(producto, 2)]);
    assert.equal(await stock(producto.productoId), 8);
    const inicial = await edicion.obtener(id);
    assert.equal(inicial.editable, true);
    assert.equal(inicial.motivoNoEditable, null);
    assert.equal(inicial.importePagado, "0.00");
    const lineaId = inicial.detalles[0].id;
    almacenamiento.archivadas.length = 0;

    const subida = await edicion.editar(id, { versionDocumento: inicial.versionDocumento, detalles: [editaProducto(lineaId, producto, 5)] }, usuarioId);
    assert.equal(subida.sinCambios, false);
    assert.deepEqual(subida.cambios.slice(0, 2), [`cantidad de ${producto.nombre}: 2.000 -> 5.000`, "total: 20.00 -> 50.00"]);
    assert.equal(subida.nota.total, "50.00");
    assert.notEqual(subida.nota.versionDocumento, inicial.versionDocumento);
    assert.equal(await stock(producto.productoId), 5);
    let estado = await cargar(id);
    assert.deepEqual(estado.movimientos.map((movimiento) => [movimiento.tipo, Number(movimiento.cantidadBase), movimiento.origenDetalleId]), [["SALIDA", 5, lineaId]]);
    assert.equal(estado.detalles[0].id, lineaId);
    assert.equal(estado.detalles[0].cantidadBase, "5.000000");
    assert.equal(estado.cabecera.subtotal, "50.00");
    assert.equal(estado.cabecera.igv, "0.00");

    const bajada = await edicion.editar(id, { detalles: [editaProducto(lineaId, producto, 1)] }, usuarioId);
    assert.equal(bajada.nota.total, "10.00");
    assert.equal(await stock(producto.productoId), 9);
    estado = await cargar(id);
    assert.equal(Number(estado.movimientos[0].cantidadBase), 1);
    assert.equal(estado.ediciones.length, 2);
    assert.deepEqual(estado.ediciones.map((fila) => fila.usuarioId), [usuarioId, usuarioId]);
    assert.equal((estado.ediciones[0].antes as { total: string }).total, "20.00");
    assert.equal((estado.ediciones[0].despues as { total: string }).total, "50.00");
    assert.deepEqual((estado.ediciones[0].efectos as { stockProductos: unknown[] }).stockProductos, [{ productoId: producto.productoId, consumoAdicionalBase: 3 }]);
    // El HTML archivado se regenera con los datos vigentes y reemplaza el enlace anterior.
    assert.equal(almacenamiento.archivadas.length, 2);
    assert.equal(almacenamiento.archivadas.at(-1)!.total, "10.00");
    assert.equal(almacenamiento.archivadas.at(-1)!.detalles[0].cantidad, "1.000");
    assert.deepEqual((estado.cabecera.datosNubefact as { archivos: { guardados: { ruta: string }[] } }).archivos.guardados.map((archivo) => archivo.ruta), [`/archivos/${id}/2`]);
    const listado = await servicioIngresos.listarVentas({ tipoVenta: "REPUESTOS", busqueda: estado.cabecera.codigo });
    assert.equal(listado.items[0].total, "10.00");
    assert.equal(listado.items[0].lineasImpresion?.[0].cantidad, "1.000");
  });

  test("cambiar el producto devuelve el stock anterior y descuenta el nuevo en la misma línea", async () => {
    const viejo = await crearProducto({ stock: 10 });
    const nuevo = await crearProducto({ stock: 3, precio: "25.00" });
    const id = await crearNota([lineaProducto(viejo, 4)]);
    const lineaId = (await cargar(id)).detalles[0].id;
    const resultado = await edicion.editar(id, { detalles: [editaProducto(lineaId, nuevo, 2, { precioUnitario: "25.00" })] }, usuarioId);
    assert.equal(resultado.nota.total, "50.00");
    assert.equal(await stock(viejo.productoId), 10);
    assert.equal(await stock(nuevo.productoId), 1);
    const estado = await cargar(id);
    assert.deepEqual(estado.movimientos.map((movimiento) => [movimiento.productoId, Number(movimiento.cantidadBase), movimiento.origenDetalleId]), [[nuevo.productoId, 2, lineaId]]);
    assert.equal(estado.detalles[0].productoId, nuevo.productoId);
    assert.ok(resultado.cambios.some((cambio) => cambio.startsWith("artículo:")));
  });

  test("agregar y quitar líneas ajusta inventario, movimientos y detalle", async () => {
    const uno = await crearProducto({ stock: 5 });
    const dos = await crearProducto({ stock: 5 });
    const id = await crearNota([lineaProducto(uno, 1), { tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO" }]);
    const [lineaUno, lineaServicio] = (await cargar(id)).detalles;
    const resultado = await edicion.editar(id, { detalles: [editaServicio(lineaServicio.id, "20.00"), editaProducto(undefined, dos, 3)] }, usuarioId);
    assert.equal(resultado.nota.total, "50.00");
    assert.equal(await stock(uno.productoId), 5);
    assert.equal(await stock(dos.productoId), 2);
    const estado = await cargar(id);
    assert.deepEqual(estado.detalles.map((detalle) => detalle.productoId), [null, dos.productoId]);
    assert.ok(!estado.detalles.some((detalle) => detalle.id === lineaUno.id));
    assert.deepEqual(estado.movimientos.map((movimiento) => [movimiento.productoId, Number(movimiento.cantidadBase)]), [[dos.productoId, 3]]);
    assert.ok(resultado.cambios.includes(`línea agregada: ${dos.nombre}`));
    assert.ok(resultado.cambios.includes(`línea eliminada: ${uno.nombre}`));
  });

  test("precio y descuento recalculan importes sin IGV y respetan el descuento máximo", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 2, precioUnitario: "20.00", afectacionIgv: "GRAVADO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "30.00", { cantidad: 2, descuento: "5.00", afectacionIgv: "GRAVADO" })] }, usuarioId), BadRequestException, /máximo permitido es 0%/);
    process.env.DESCUENTO_MAXIMO_PORCENTAJE = "50";
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "30.00", { cantidad: 2, descuento: "61.00", afectacionIgv: "GRAVADO" })] }, usuarioId), BadRequestException, /supera el importe/);
    const resultado = await edicion.editar(id, { detalles: [editaServicio(lineaId, "30.00", { cantidad: 2, descuento: "5.50", afectacionIgv: "GRAVADO" })] }, usuarioId);
    assert.equal(resultado.nota.total, "54.50");
    assert.equal(resultado.nota.igv, "0.00");
    assert.equal(resultado.nota.subtotal, "54.50");
    const [detalle] = (await cargar(id)).detalles;
    assert.deepEqual([detalle.precioUnitario, detalle.descuento, detalle.total, detalle.igv], ["30.0000", "5.50", "54.50", "0.00"]);
  });

  test("cliente, medio de pago, fecha y observación se corrigen sin tocar inventario", async () => {
    const producto = await crearProducto({ stock: 4 });
    const id = await crearNota([lineaProducto(producto, 1)], { observacion: "Con error" });
    const lineaId = (await cargar(id)).detalles[0].id;
    const resultado = await edicion.editar(id, { clienteId: otro.id, medioPago: "TARJETA", observacion: "Corregida", fecha: hoy, detalles: [editaProducto(lineaId, producto, 1)] }, usuarioId);
    assert.deepEqual(resultado.cambios, ["cliente", "medio de pago", "observación"]);
    const { cabecera } = await cargar(id);
    assert.deepEqual([cabecera.clienteId, cabecera.clienteNombre, cabecera.clienteNumeroDocumento, cabecera.clienteTipoDocumento, cabecera.medioPago, cabecera.observacion],
      [otro.id, otro.nombre, otro.documento, "DNI", "TARJETA", "Corregida"]);
    assert.equal(await stock(producto.productoId), 3);
    const borrada = await edicion.editar(id, { observacion: null, detalles: [editaProducto(lineaId, producto, 1)] }, usuarioId);
    assert.deepEqual(borrada.cambios, ["observación"]);
    assert.equal((await cargar(id)).cabecera.observacion, null);
    const otraFecha = await edicion.editar(id, { fecha: "2020-02-03", detalles: [editaProducto(lineaId, producto, 1)] }, usuarioId);
    assert.deepEqual(otraFecha.cambios, ["fecha"]);
    await rechazaCon(edicion.editar(id, { clienteId: randomUUID(), detalles: [editaProducto(lineaId, producto, 1)] }, usuarioId), NotFoundException, /cliente ya no está activo/);
  });

  test("una edición idéntica o solo de orden no cambia nada ni deja auditoría", async () => {
    const producto = await crearProducto({ stock: 4 });
    const id = await crearNota([lineaProducto(producto, 1), { tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO" }]);
    const [linea, servicio] = (await cargar(id)).detalles;
    const payload = { detalles: [editaProducto(linea.id, producto, 1), editaServicio(servicio.id, "20.00")] };
    almacenamiento.archivadas.length = 0;
    const repetida = await edicion.editar(id, payload, usuarioId);
    assert.equal(repetida.sinCambios, true);
    assert.deepEqual(repetida.cambios, []);
    const reordenada = await edicion.editar(id, { detalles: [...payload.detalles].reverse() }, usuarioId);
    assert.equal(reordenada.sinCambios, true);
    assert.equal((await cargar(id)).ediciones.length, 0);
    assert.equal(almacenamiento.archivadas.length, 0);
    assert.equal(await stock(producto.productoId), 3);
  });
});

describe("rechazos atómicos", () => {
  test("exceder el stock disponible rechaza la edición y no deja ningún cambio", async () => {
    const producto = await crearProducto({ stock: 5 });
    const otroProducto = await crearProducto({ stock: 5 });
    const id = await crearNota([lineaProducto(producto, 2), lineaProducto(otroProducto, 1)]);
    const [uno, dos] = (await cargar(id)).detalles;
    const antes = await cargar(id);
    const payload = { detalles: [editaProducto(uno.id, producto, 1), editaProducto(dos.id, otroProducto, 6, { precioUnitario: "11.00" })], observacion: "No debe guardarse" };
    await rechazaCon(edicion.editar(id, payload, usuarioId), ConflictException, /Stock insuficiente/);
    const despues = await cargar(id);
    assert.deepEqual(despues.cabecera, antes.cabecera);
    assert.deepEqual(despues.detalles, antes.detalles);
    assert.deepEqual(despues.movimientos, antes.movimientos);
    assert.equal(despues.ediciones.length, 0);
    assert.equal(await stock(producto.productoId), 3);
    assert.equal(await stock(otroProducto.productoId), 4);
  });

  test("las notas anuladas no se editan", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await db.update(esquema.ingresos).set({ estado: "ANULADO" }).where(eq(esquema.ingresos.id, id));
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "30.00")] }, usuarioId), ConflictException, /anulada/);
    assert.equal((await edicion.obtener(id)).editable, false);
    await db.update(esquema.ingresos).set({ estado: "REGISTRADO", datosNubefact: { anulacion: { estado: "PENDIENTE" } } }).where(eq(esquema.ingresos.id, id));
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "30.00")] }, usuarioId), ConflictException, /anulada/);
    assert.match((await edicion.obtener(id)).motivoNoEditable ?? "", /anulada/);
  });

  test("las boletas y facturas son documentos fiscales y no se editan por esta vía", async () => {
    for (const tipo of ["BOLETA", "FACTURA"]) {
      const id = randomUUID();
      await db.insert(esquema.ingresos).values({ id, codigo: `QAE-${id}`, fecha: hoy, tipoComprobante: tipo, clienteId: natural.id, medioPago: "EFECTIVO", subtotal: "10.00", igv: "0.00", total: "10.00", estado: "EMITIDO", usuarioId });
      ingresosCreados.push(id);
      await rechazaCon(edicion.editar(id, { detalles: [editaServicio(undefined, "5.00")] }, usuarioId), BadRequestException, /documento fiscal/);
      assert.equal((await edicion.obtener(id)).editable, false);
      assert.equal((await cargar(id)).ediciones.length, 0);
    }
  });

  test("valida identificadores, líneas ajenas, cambios de tipo, versión y precios faltantes", async () => {
    const producto = await crearProducto({ stock: 5 });
    const ajeno = await crearProducto({ stock: 5 });
    const id = await crearNota([lineaProducto(producto, 1)]);
    const [linea] = (await cargar(id)).detalles;
    await rechazaCon(edicion.editar("x", { detalles: [] }, usuarioId), BadRequestException, /no es válida/);
    await rechazaCon(edicion.obtener("x"), BadRequestException, /no es válida/);
    await rechazaCon(edicion.editar(randomUUID(), { detalles: [editaServicio(undefined, "1.00")] }, usuarioId), NotFoundException, /No se encontró/);
    await rechazaCon(edicion.obtener(randomUUID()), NotFoundException, /No se encontró/);
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(randomUUID(), "1.00")] }, usuarioId), BadRequestException, /no pertenece/);
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(linea.id, "1.00")] }, usuarioId), BadRequestException, /no puede cambiar de tipo/);
    await rechazaCon(edicion.editar(id, { versionDocumento: "0".repeat(64), detalles: [editaProducto(linea.id, producto, 2)] }, usuarioId), ConflictException, /cambió mientras la editabas/);
    await rechazaCon(edicion.editar(id, { detalles: [editaProducto(linea.id, ajeno, 1, { precioUnitario: undefined })] }, usuarioId), BadRequestException, /Indica el precio/);
    await rechazaCon(edicion.editar(id, { detalles: [editaProducto(linea.id, { ...ajeno, presentacionId: randomUUID() }, 1)] }, usuarioId), NotFoundException, /no existe/);
    await db.update(esquema.productos).set({ activo: false }).where(eq(esquema.productos.id, ajeno.productoId));
    await rechazaCon(edicion.editar(id, { detalles: [editaProducto(linea.id, ajeno, 1)] }, usuarioId), NotFoundException, /ya no está disponible/);
    // La línea actual sigue editable aunque el producto se haya desactivado después de la venta.
    await db.update(esquema.productos).set({ activo: false }).where(eq(esquema.productos.id, producto.productoId));
    const mantenida = await edicion.editar(id, { detalles: [{ id: linea.id, tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: 2, afectacionIgv: "GRAVADO" }] }, usuarioId);
    assert.equal(mantenida.nota.total, "20.00");
    assert.equal((await cargar(id)).ediciones.length, 1);
  });

  test("la nota de una orden de servicio o con guía vigente queda protegida", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    const cambio = { detalles: [editaServicio(lineaId, "30.00")] };
    const [guia] = await db.insert(esquema.guiasRemision).values({ ingresoId: id, tipo: "REMITENTE", fecha: hoy, serie: "TE01", numero: Number(numeroAleatorio(6)) + 1, estado: "ERROR_NUBEFACT", usuarioId }).returning({ id: esquema.guiasRemision.id });
    guiasCreadas.push(guia.id);
    assert.equal((await edicion.editar(id, cambio, usuarioId)).nota.total, "30.00");
    await db.update(esquema.guiasRemision).set({ estado: "EMITIDO" }).where(eq(esquema.guiasRemision.id, guia.id));
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "40.00")] }, usuarioId), ConflictException, /guía de remisión vigente/);
    await db.delete(esquema.guiasRemision).where(eq(esquema.guiasRemision.id, guia.id));
    const [orden] = await db.insert(esquema.ordenesServicio).values({ codigo: `OSE${numeroAleatorio(8)}`, clienteId: natural.id, vehiculoPlaca: "QAE-001", motivo: "Prueba", fechaRecepcion: hoy, ingresoId: id, claveEmision: randomUUID(), usuarioId, estado: "FACTURADA" }).returning({ id: esquema.ordenesServicio.id });
    ordenesCreadas.push(orden.id);
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "50.00")] }, usuarioId), ConflictException, /orden de servicio/);
    assert.match((await edicion.obtener(id)).motivoNoEditable ?? "", /orden de servicio/);
  });
});

describe("efecto monetario", () => {
  async function registrarPagos(id: string, importes: string[]) {
    for (const [indice, importe] of importes.entries()) {
      await db.insert(esquema.ingresosPagos).values({ ingresoId: id, fechaPago: hoy, importeAplicado: importe, importeRecibido: importe, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaEfectivo, usuarioId, claveIdempotencia: randomUUID(), observacion: `Pago ${indice + 1}` });
    }
  }
  const pagosDe = async (id: string) => (await db.select().from(esquema.ingresosPagos).where(eq(esquema.ingresosPagos.ingresoId, id)).orderBy(esquema.ingresosPagos.creadoEn)).map((pago) => Number(pago.importeAplicado));

  test("si los pagos superan el nuevo total exige confirmar la devolución y recorta los últimos pagos", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "50.00", afectacionIgv: "INAFECTO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await registrarPagos(id, ["30.00", "20.00"]);
    assert.equal((await edicion.obtener(id)).importePagado, "50.00");
    await rechazaCon(edicion.editar(id, { detalles: [editaServicio(lineaId, "40.00")] }, usuarioId), ConflictException, /Confirma la devolución de S\/ 10\.00/);
    assert.deepEqual(await pagosDe(id), [30, 20]);
    assert.equal((await cargar(id)).cabecera.total, "50.00");

    const recortado = await edicion.editar(id, { confirmarDevolucionExceso: true, detalles: [editaServicio(lineaId, "40.00")] }, usuarioId);
    assert.deepEqual(await pagosDe(id), [30, 10]);
    assert.equal((recortado.efectos as { pagos: { devuelto: number } }).pagos.devuelto, 10);
    const [auditoria] = (await cargar(id)).ediciones;
    assert.equal((auditoria.efectos as { pagos: { pagadoAntes: number } }).pagos.pagadoAntes, 50);

    await edicion.editar(id, { confirmarDevolucionExceso: true, detalles: [editaServicio(lineaId, "20.00")] }, usuarioId);
    assert.deepEqual(await pagosDe(id), [20]);
    const listado = await servicioIngresos.listarVentas({ tipoVenta: "REPUESTOS", busqueda: (await cargar(id)).cabecera.codigo });
    assert.equal(listado.items[0].saldoPendiente, "0.00");
  });

  test("subir el total deja el saldo pendiente sin tocar los pagos aplicados", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "50.00", afectacionIgv: "INAFECTO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await registrarPagos(id, ["50.00"]);
    const resultado = await edicion.editar(id, { medioPago: "TARJETA", detalles: [editaServicio(lineaId, "70.00")] }, usuarioId);
    assert.equal(resultado.nota.total, "70.00");
    assert.deepEqual(await pagosDe(id), [50]);
    const listado = await servicioIngresos.listarVentas({ tipoVenta: "REPUESTOS", busqueda: resultado.nota.codigo });
    assert.equal(listado.items[0].saldoPendiente, "20.00");
    const [pago] = await db.select().from(esquema.ingresosPagos).where(eq(esquema.ingresosPagos.ingresoId, id));
    assert.equal(pago.medioPago, "EFECTIVO");
  });
});

describe("concurrencia y archivado", () => {
  test("dos ediciones simultáneas con la misma versión: una se aplica y la otra recibe conflicto", async () => {
    const producto = await crearProducto({ stock: 10 });
    const id = await crearNota([lineaProducto(producto, 1)]);
    const inicial = await edicion.obtener(id);
    const lineaId = inicial.detalles[0].id;
    const intento = (cantidad: number) => edicion.editar(id, { versionDocumento: inicial.versionDocumento, detalles: [editaProducto(lineaId, producto, cantidad)] }, usuarioId);
    const resultados = await Promise.allSettled([intento(3), intento(4)]);
    const exitosos = resultados.filter((resultado) => resultado.status === "fulfilled");
    const fallidos = resultados.filter((resultado): resultado is PromiseRejectedResult => resultado.status === "rejected");
    assert.equal(exitosos.length, 1);
    assert.equal(fallidos.length, 1);
    assert.ok(fallidos[0].reason instanceof ConflictException);
    const estado = await cargar(id);
    const aplicada = Number(estado.detalles[0].cantidad);
    assert.ok(aplicada === 3 || aplicada === 4);
    assert.equal(await stock(producto.productoId), 10 - aplicada);
    assert.equal(estado.ediciones.length, 1);
  });

  test("sin versión las ediciones concurrentes se serializan y el inventario queda consistente", async () => {
    const producto = await crearProducto({ stock: 10 });
    const id = await crearNota([lineaProducto(producto, 1)]);
    const lineaId = (await cargar(id)).detalles[0].id;
    const intento = (cantidad: number) => edicion.editar(id, { detalles: [editaProducto(lineaId, producto, cantidad)] }, usuarioId);
    const resultados = await Promise.all([intento(2), intento(5), intento(3)]);
    assert.equal(resultados.length, 3);
    const estado = await cargar(id);
    const final = Number(estado.detalles[0].cantidad);
    assert.equal(await stock(producto.productoId), 10 - final);
    assert.equal(Number(estado.movimientos[0].cantidadBase), final);
    assert.ok(estado.ediciones.length >= 2);
  });

  test("un fallo al archivar no revierte la edición y conserva el enlace anterior", async () => {
    const id = await crearNota([{ tipo: "SERVICIO", descripcion: `Servicio ${sufijo}`, cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO" }]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await db.update(esquema.ingresos).set({ datosNubefact: { archivos: { guardados: [{ id: randomUUID(), tipo: "HTML", nombre: "x.html", ruta: "/archivos/previo" }], errores: [] } } }).where(eq(esquema.ingresos.id, id));
    almacenamiento.fallar = true;
    const resultado = await edicion.editar(id, { detalles: [editaServicio(lineaId, "25.00")] }, usuarioId);
    assert.equal(resultado.nota.total, "25.00");
    const { archivos } = (await cargar(id)).cabecera.datosNubefact as { archivos: { guardados: { ruta: string }[]; errores: { mensaje: string }[] } };
    assert.deepEqual(archivos.guardados.map((archivo) => archivo.ruta), ["/archivos/previo"]);
    assert.equal(archivos.errores[0].mensaje, "Disco lleno simulado");
    almacenamiento.fallar = false;
    await db.update(esquema.ingresos).set({ datosNubefact: null }).where(eq(esquema.ingresos.id, id));
    almacenamiento.fallar = true;
    await edicion.editar(id, { detalles: [editaServicio(lineaId, "26.00")] }, usuarioId);
    assert.deepEqual(((await cargar(id)).cabecera.datosNubefact as { archivos: { guardados: unknown[] } }).archivos.guardados, []);
  });
});

describe("mototaxis", () => {
  async function crearModelo(stock: number, precio = "1500.00") {
    const marca = await servicioMototaxis.crearMarca({ nombre: `QA Moto Edicion ${randomUUID().slice(0, 8)}` });
    marcasMototaxi.push(marca.id);
    const modelo = await servicioMototaxis.crearModelo({ marcaId: marca.id, nombre: `Modelo ${randomUUID().slice(0, 6)}`, version: "V1" });
    modelosMototaxi.push(modelo.id);
    await servicioMototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: stock, motivo: "Conteo inicial QA" }, usuarioId);
    await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta: precio }, usuarioId);
    return modelo.id as string;
  }
  const lineaMoto = (modeloId: string, cantidad: number, extra: Record<string, unknown> = {}) => ({ tipo: "MOTOTAXI", mototaxiModeloId: modeloId, cantidad, precioUnitario: "1500.00", afectacionIgv: "GRAVADO", ...extra });

  test("cambiar la cantidad mueve el saldo del modelo y respeta la existencia", async () => {
    const modeloId = await crearModelo(3);
    const id = await crearNota([lineaMoto(modeloId, 2)]);
    assert.equal(await stockModelo(modeloId), 1);
    const lineaId = (await cargar(id)).detalles[0].id;
    const reducida = await edicion.editar(id, { detalles: [lineaMoto(modeloId, 1, { id: lineaId, precioUnitario: undefined })] }, usuarioId);
    assert.equal(reducida.nota.total, "1500.00");
    assert.equal(await stockModelo(modeloId), 2);
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(modeloId, 9, { id: lineaId })] }, usuarioId), BadRequestException, /excede las existencias/);
    assert.equal(await stockModelo(modeloId), 2);
    assert.equal(Number((await cargar(id)).detalles[0].cantidad), 1);
    const ampliada = await edicion.editar(id, { detalles: [lineaMoto(modeloId, 3, { id: lineaId })] }, usuarioId);
    assert.equal(ampliada.nota.total, "4500.00");
    assert.equal(await stockModelo(modeloId), 0);
    const movimientos = await db.select().from(esquema.movimientosModelosMototaxis).where(eq(esquema.movimientosModelosMototaxis.modeloId, modeloId));
    assert.deepEqual(movimientos.map((movimiento) => movimiento.tipo).filter((tipo) => tipo !== "AJUSTE").sort(), ["ANULACION_VENTA", "VENTA", "VENTA"]);
  });

  test("cambiar de modelo devuelve el anterior, y el precio debe ser el vigente salvo el ya vendido", async () => {
    const primero = await crearModelo(2);
    const segundo = await crearModelo(2, "1800.00");
    const id = await crearNota([lineaMoto(primero, 1)]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(segundo, 1, { id: lineaId, precioUnitario: "1500.00" })] }, usuarioId), BadRequestException, /cambió/);
    const cambiado = await edicion.editar(id, { detalles: [lineaMoto(segundo, 1, { id: lineaId, precioUnitario: "1800.00" })] }, usuarioId);
    assert.equal(cambiado.nota.total, "1800.00");
    assert.equal(await stockModelo(primero), 2);
    assert.equal(await stockModelo(segundo), 1);
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(randomUUID(), 1, { id: lineaId })] }, usuarioId), NotFoundException, /no existe/);
    await db.update(esquema.modelosMototaxis).set({ activo: false }).where(eq(esquema.modelosMototaxis.id, primero));
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(primero, 1, { id: lineaId })] }, usuarioId), NotFoundException, /ya no está disponible/);
    // Con descuento sobre el precio vendido (sin precio explícito) no se exige el precio vigente.
    process.env.DESCUENTO_MAXIMO_PORCENTAJE = "10";
    await db.update(esquema.preciosModelosMototaxis).set({ vigenteHasta: new Date() }).where(eq(esquema.preciosModelosMototaxis.modeloId, segundo));
    const descuento = await edicion.editar(id, { detalles: [lineaMoto(segundo, 1, { id: lineaId, precioUnitario: undefined, descuento: "100.00" })] }, usuarioId);
    assert.equal(descuento.nota.total, "1700.00");
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(segundo, 1, { id: lineaId, precioUnitario: "1900.00" })] }, usuarioId), BadRequestException, /cambió/);
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(segundo, 1, { id: undefined, precioUnitario: undefined })] }, usuarioId), BadRequestException, /Configura un precio de venta/);
  });

  test("con garantía o unidad asignada no se cambia la cantidad, el modelo ni la fecha, ni se quita la línea", async () => {
    const modeloId = await crearModelo(5);
    const id = await crearNota([lineaMoto(modeloId, 2)]);
    const lineaId = (await cargar(id)).detalles[0].id;
    await servicioMototaxis.guardarGarantiaModelo(modeloId, { activa: true, mesesVigencia: 12, alcance: "Motor y caja" });
    const [politica] = await db.select().from(esquema.garantiasModelosMototaxis).where(eq(esquema.garantiasModelosMototaxis.modeloId, modeloId));
    await db.insert(esquema.garantiasVentasMototaxis).values({ ingresoDetalleId: lineaId, garantiaModeloId: politica.id, cantidad: 2, mesesVigencia: 12, iniciaEn: hoy, terminaEn: "2099-01-01", alcance: "Motor y caja" });
    const bloqueada = await edicion.obtener(id);
    assert.equal(bloqueada.detalles[0].bloqueo, "Tiene una garantía aplicada.");
    await rechazaCon(edicion.editar(id, { detalles: [lineaMoto(modeloId, 1, { id: lineaId })] }, usuarioId), ConflictException, /garantía aplicada/);
    await rechazaCon(edicion.editar(id, { fecha: "2020-01-01", detalles: [lineaMoto(modeloId, 2, { id: lineaId })] }, usuarioId), ConflictException, /cambiar la fecha/);
    const servicioExtra = { tipo: "SERVICIO", descripcion: `Placa ${sufijo}`, cantidad: 1, precioUnitario: "50.00", afectacionIgv: "INAFECTO" };
    await rechazaCon(edicion.editar(id, { detalles: [servicioExtra] }, usuarioId), ConflictException, /No se puede quitar.*garantía aplicada/);
    // Cambios permitidos: observación y descuento, sin mover unidades.
    process.env.DESCUENTO_MAXIMO_PORCENTAJE = "10";
    const permitido = await edicion.editar(id, { observacion: "Entrega pendiente", detalles: [lineaMoto(modeloId, 2, { id: lineaId, descuento: "50.00" })] }, usuarioId);
    assert.equal(permitido.nota.total, "2950.00");
    assert.equal(await stockModelo(modeloId), 3);
  });

  test("anular una nota editada devuelve exactamente las cantidades vigentes y bloquea nuevas ediciones", async () => {
    const repuesto = await crearProducto({ stock: 10 });
    const agregado = await crearProducto({ stock: 10 });
    const nota = await crearNota([lineaProducto(repuesto, 2)]);
    const lineaId = (await cargar(nota)).detalles[0].id;
    await edicion.editar(nota, { detalles: [editaProducto(lineaId, repuesto, 6), editaProducto(undefined, agregado, 3)] }, usuarioId);
    const modeloId = await crearModelo(5);
    const modeloExtra = await crearModelo(5);
    const notaMoto = await crearNota([lineaMoto(modeloId, 1)]);
    const lineaMotoId = (await cargar(notaMoto)).detalles[0].id;
    await edicion.editar(notaMoto, { detalles: [lineaMoto(modeloId, 3, { id: lineaMotoId }), lineaMoto(modeloExtra, 2)] }, usuarioId);
    assert.deepEqual([await stockModelo(modeloId), await stockModelo(modeloExtra)], [2, 3]);

    await servicioIngresos.anularNotaVenta(nota, { motivo: "QA anulación" }, usuarioId);
    await servicioIngresos.anularNotaVenta(notaMoto, { motivo: "QA anulación" }, usuarioId);
    assert.deepEqual([await stock(repuesto.productoId), await stock(agregado.productoId)], [10, 10]);
    assert.deepEqual([await stockModelo(modeloId), await stockModelo(modeloExtra)], [5, 5]);
    await rechazaCon(edicion.editar(nota, { detalles: [editaProducto(lineaId, repuesto, 1)] }, usuarioId), ConflictException, /anulada/);
    assert.equal(await stock(repuesto.productoId), 10);
  });
});
