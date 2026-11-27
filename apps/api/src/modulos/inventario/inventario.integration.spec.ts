import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ContextoPostgres, fechaHoyPeru, rucAleatorio } from "../../pruebas/contexto-postgres";
import { ServicioCategorias } from "./categorias.service";
import { ServicioEntradasStock } from "./entradas-stock.service";
import { ServicioMarcas } from "./marcas.service";
import { ServicioMovimientosStock } from "./movimientos-stock.service";
import { ServicioProductos } from "./productos.service";

let contexto: ContextoPostgres;
let usuarioId: string;
let categoriaId: string;
let marcaId: string;
let cuentaId: string;
let listaGeneralId: string;
const hoy = fechaHoyPeru();
const entradas = new ServicioEntradasStock();
const movimientos = new ServicioMovimientosStock();
const productos = new ServicioProductos();
const categorias = new ServicioCategorias();
const marcas = new ServicioMarcas();

const esBadRequest = (patron?: RegExp) => (error: unknown) => error instanceof BadRequestException && (!patron || patron.test(error.message));
const esDuplicado = (error: unknown) => error instanceof ConflictException;

before(async () => {
  contexto = await ContextoPostgres.crear();
  usuarioId = (await contexto.crearUsuario([])).id;
  categoriaId = await contexto.crearCategoria();
  marcaId = await contexto.crearMarca("REPUESTOS");
  cuentaId = await contexto.crearCuenta(usuarioId);
  listaGeneralId = await contexto.idCatalogo("tipos_listas_precio", "GENERAL");
});
after(async () => { if (contexto) await contexto.cerrar(); });

function compra(productoId: string, presentacionId: string, extra: Record<string, unknown> = {}) {
  return {
    fecha: hoy, tipoDocumento: "SIN_DOCUMENTO", pagos: [{ cuentaFinancieraId: cuentaId, medioPago: "EFECTIVO", importePagado: 12.75 }],
    detalles: [{ productoId, presentacionId, cantidad: 3, costoUnitario: 4.25 }], ...extra,
  };
}

describe("categorías y marcas", () => {
  test("crea, edita y valida categorías", async () => {
    await assert.rejects(categorias.crear({ nombre: "x" }), esBadRequest(/entre 2 y 100/));
    const nombre = `QA Cat ${contexto.sufijo}`;
    const categoria = (await categorias.crear({ nombre, descripcion: "  " }))!;
    contexto.categorias.push(categoria.id);
    assert.equal(categoria.descripcion, null);
    await assert.rejects(categorias.crear({ nombre: nombre.toUpperCase() }), esDuplicado);
    const editada = (await categorias.actualizar(categoria.id, { nombre: `${nombre} B`, descripcion: "Desc", activo: false }))!;
    assert.deepEqual([editada.descripcion, editada.activo], ["Desc", false]);
    await assert.rejects(categorias.actualizar(categoria.id, {}), (error) => error instanceof BadRequestException && /al menos un dato/.test(error.message));
    await assert.rejects(categorias.actualizar(randomUUID(), { activo: true }), NotFoundException);
    await assert.rejects(categorias.actualizar(categoria.id, { nombre: 1 }), BadRequestException);
    assert.ok((await categorias.listar()).some((item) => item.id === categoria.id));
  });

  test("crea marcas, valida el uso y protege registros asociados", async () => {
    await assert.rejects(marcas.crear({ nombre: "Marca", uso: "OTRO" }), esBadRequest(/repuestos, mototaxis o ambos/));
    const marca = (await marcas.crear({ nombre: `QA Mar ${contexto.sufijo}`, descripcion: "D" }))!;
    contexto.marcas.push(marca.id);
    assert.equal(marca.uso, "REPUESTOS");
    await assert.rejects(marcas.crear({ nombre: marca.nombre }), esDuplicado);
    await contexto.crearProducto({ categoriaId, marcaId: marca.id });
    await assert.rejects(marcas.actualizar(marca.id, { uso: "MOTOTAXIS" }), ConflictException);
    const editada = (await marcas.actualizar(marca.id, { uso: "AMBOS", nombre: `${marca.nombre} 2`, descripcion: "", activo: false }))!;
    assert.deepEqual([editada.uso, editada.descripcion, editada.activo], ["AMBOS", null, false]);
    await assert.rejects(marcas.actualizar(randomUUID(), { descripcion: "x" }), NotFoundException);
    await assert.rejects(marcas.actualizar(marca.id, { nombre: "" }), BadRequestException);
    const otra = (await marcas.crear({ nombre: `QA Mar2 ${contexto.sufijo}` }))!;
    contexto.marcas.push(otra.id);
    await assert.rejects(marcas.actualizar(otra.id, { nombre: editada.nombre }), esDuplicado);
    assert.ok((await marcas.listar()).length >= 2);
  });
});

describe("entradas de stock", () => {
  test("valida cabecera, proveedor, documento, pagos y líneas", async () => {
    const { productoId, presentacionId } = await contexto.crearProducto({ categoriaId, marcaId });
    const base = compra(productoId, presentacionId);
    const ruc = rucAleatorio("20");
    const proveedor = { tipoDocumento: "FACTURA", numeroDocumento: "f001-1", proveedor: "Prov", proveedorTipoPersona: "JURIDICA", proveedorTipoDocumento: "RUC", proveedorNumeroDocumento: ruc };
    await assert.rejects(entradas.crear(base, "x"), BadRequestException);
    for (const [entrada, patron] of [
      [[], /no son válidos/], [{ ...base, fecha: "x" }, /fecha válida/], [{ ...base, fecha: "2026-02-30" }, /no existe/],
      [{ ...base, tipoDocumento: "TICKET" }, /tipo de documento válido/], [{ ...base, tipoDocumento: "BOLETA" }, /número del comprobante/],
      [{ ...base, totalDocumento: -1 }, /total del documento/], [{ ...base, detallesDocumento: "x" }, /lineas del documento/],
      [{ ...base, detallesDocumento: [null] }, /linea documental 1/], [{ ...base, detallesDocumento: [{ clave: "x" }] }, /clave de la linea/],
      [{ ...base, medioPago: "CHEQUE" }, /medio de pago válido/], [{ ...base, pagos: [null] }, /medios de pago/],
      [{ ...base, pagos: [{ importePagado: 1, medioPago: "CHEQUE" }] }, /medio de pago válido/],
      [{ ...base, ...proveedor, proveedorTipoPersona: "OTRA" }, /natural o jurídica/], [{ ...base, ...proveedor, proveedorTipoDocumento: "CE" }, /DNI, RUC/],
      [{ ...base, ...proveedor, proveedorNumeroDocumento: "123" }, /corresponder al tipo/],
      [{ ...base, ...proveedor, proveedorTipoDocumento: "DNI", proveedorNumeroDocumento: "12345678" }, /persona natural/],
      [{ ...base, ...proveedor, proveedorNumeroDocumento: rucAleatorio("17") }, /iniciar con 10 o 15/],
      [{ ...base, ...proveedor, proveedorTipoPersona: "NATURAL" }, /no coincide con el prefijo/],
      [{ ...base, proveedorTipoPersona: "JURIDICA" }, /jurídico debe identificarse/],
      [{ ...base, tipoDocumento: "OTRO" }, /tipo de documento válido/], [{ ...base, detalles: [] }, /Agrega lineas/],
      [{ ...base, detalles: [null] }, /producto 1 no es válido/],
      [{ ...base, detalles: [{ ...base.detalles[0], detalleDocumentoId: randomUUID() }] }, /linea documental inexistente/],
      [{ ...base, detalles: [base.detalles[0], base.detalles[0]] }, /repetidos/], [{ ...base, pagos: [] }, /Distribuye/],
      [{ ...base, detalles: [{ productoId, presentacionId: randomUUID(), cantidad: 1, costoUnitario: 1 }] }, /no está disponible/],
    ] as const) {
      await assert.rejects(entradas.crear(entrada, usuarioId), esBadRequest(patron), JSON.stringify(entrada).slice(0, 100));
    }
    const clave = randomUUID();
    await assert.rejects(entradas.crear({ ...base, detallesDocumento: Array.from({ length: 101 }, () => ({ clave: randomUUID(), descripcion: "L", cantidad: 1, costoUnitario: 1, subtotal: 1, total: 1 })) }, usuarioId), esBadRequest(/hasta 100/));
    await assert.rejects(entradas.crear({ ...base, detallesDocumento: [1, 2].map(() => ({ clave, descripcion: "L", cantidad: 1, costoUnitario: 1, subtotal: 1, total: 1 })) }, usuarioId), esBadRequest(/repetidas/));
  });

  test("registra una factura con líneas documentales, pagos y movimientos; evita duplicarla", async () => {
    const { productoId, presentacionId } = await contexto.crearProducto({ categoriaId, marcaId, stock: 1 });
    const ruc = rucAleatorio("20");
    const claveLinea = randomUUID();
    const datos = {
      fecha: hoy, tipoDocumento: "FACTURA", numeroDocumento: "f001-77", proveedor: `Proveedor ${contexto.sufijo}`, proveedorTipoPersona: "JURIDICA",
      proveedorTipoDocumento: "RUC", proveedorNumeroDocumento: ruc, proveedorDireccion: "Av. QA", totalDocumento: "20.00", observacion: "Obs",
      medioPago: "EFECTIVO", montoPagado: "20", cuentaFinancieraId: cuentaId,
      detallesDocumento: [{ clave: claveLinea, codigo: "C1", descripcion: "Filtro", unidad: "UND", cantidad: 2, costoUnitario: 10, descuento: "", subtotal: 20, total: 20 }],
      detalles: [{ productoId, presentacionId, detalleDocumentoId: claveLinea, cantidad: 2, costoUnitario: 10, importeTotal: 20 }],
    };
    const entrada = await entradas.crear(datos, usuarioId);
    assert.deepEqual([entrada.numeroDocumento, entrada.total, entrada.detalles[0].costoUnitario, entrada.detallesDocumento.length], ["F001-77", "20.00", "10.0000", 1]);
    assert.equal(entrada.detalles[0].detalleDocumentoId, entrada.detallesDocumento[0].id);
    await assert.rejects(entradas.crear(datos, usuarioId), ConflictException);
    const listado = await entradas.listar({ busqueda: ruc, estadoPago: "PAGADAS", porPagina: "4" });
    assert.deepEqual([listado.total, listado.porPagina, listado.conteosPago.pagadas], [1, 4, 1]);
    assert.deepEqual((await entradas.listar({ busqueda: ruc, estadoPago: "PENDIENTES" })).items, []);
    const pendientes = await entradas.listar({ busqueda: ruc, estadoPago: "PENDIENTES" });
    assert.equal(pendientes.total, 0);
    assert.equal(pendientes.conteosPago.pagadas, 1);
    assert.equal((await entradas.listar({})).pagina, 1);
    await assert.rejects(entradas.consultar("x"), BadRequestException);
    const busqueda = await entradas.buscarProductos(entrada.detalles[0].codigoProducto);
    assert.equal(busqueda[0]?.productoId, productoId);
    assert.deepEqual(await entradas.buscarProductos(undefined), []);
    const costos = await productos.costosCompra(productoId);
    assert.deepEqual([costos.ultima?.importe, costos.promedioPonderado], ["10.0000", "10.0000"]);
    assert.equal((await productos.historial(productoId)).compra?.importe, "10.0000");
  });

});

describe("movimientos y ajustes de stock", () => {
  test("ajusta por sentido o por conteo con control de saldo", async () => {
    const { productoId, codigo } = await contexto.crearProducto({ categoriaId, marcaId, stock: 5 });
    for (const [entrada, patron] of [
      [null, /no son válidos/], [{ productoId: "x" }, /producto válido/], [{ productoId, sentido: "X" }, /suma o resta/],
      [{ productoId, sentido: "INGRESO", cantidad: 0 }, /mayor que cero/], [{ productoId, cantidadContada: -1 }, /igual o mayor/],
      [{ productoId, sentido: "INGRESO", cantidad: 1, saldoEsperado: 5 }, /referencia/], [{ productoId, sentido: "INGRESO", cantidad: 1, motivo: "X" }, /motivo válido/],
      [{ productoId, sentido: "INGRESO", cantidad: 1, motivo: "MERMA", observacion: "x".repeat(1001) }, /1000 caracteres/],
      [{ productoId, sentido: "RETIRO", cantidad: 9, motivo: "MERMA" }, /fuera del rango/], [{ productoId, cantidadContada: 5, motivo: "OTRO" }, /coincide/],
    ] as const) {
      await assert.rejects(movimientos.crearAjuste(entrada, usuarioId), esBadRequest(patron));
    }
    await assert.rejects(movimientos.crearAjuste({ productoId: randomUUID(), sentido: "INGRESO", cantidad: 1, motivo: "OTRO" }, usuarioId), NotFoundException);
    await assert.rejects(movimientos.crearAjuste({ productoId, sentido: "INGRESO", cantidad: 1, motivo: "OTRO", saldoEsperado: "4" }, usuarioId), ConflictException);
    const ingreso = await movimientos.crearAjuste({ productoId, sentido: "INGRESO", cantidad: "2", motivo: "DEVOLUCION", observacion: "  " }, usuarioId);
    assert.deepEqual([ingreso.sentido, Number(ingreso.saldoFinal), ingreso.observacion], ["INGRESO", 7, null]);
    const retiro = await movimientos.crearAjuste({ productoId, sentido: "RETIRO", cantidad: 1, motivo: "MERMA", saldoEsperado: "7" }, usuarioId);
    assert.equal(Number(retiro.saldoFinal), 6);
    const conteo = await movimientos.crearAjuste({ productoId, cantidadContada: 2, motivo: "INVENTARIO_FISICO", observacion: "Conteo" }, usuarioId);
    assert.deepEqual([conteo.sentido, Number(conteo.cantidadBase)], ["RETIRO", 4]);
    const listado = await movimientos.listar({ busqueda: codigo, tipo: "AJUSTE", porPagina: "4", pagina: "9" });
    assert.deepEqual([listado.total, listado.pagina], [3, 1]);
    assert.equal((await movimientos.listar({ tipo: "OTRO" })).porPagina, 10);
    assert.equal((await movimientos.buscarProductos(codigo))[0]?.id, productoId);
    assert.deepEqual(await movimientos.buscarProductos(undefined), []);
    assert.equal((await productos.historial(productoId)).movimientos.length, 3);
  });
});

describe("productos", () => {
  test("lista con filtros, alertas y precios", async () => {
    const nombre = `Bujía ${contexto.sufijo}`;
    const bajo = await contexto.crearProducto({ categoriaId, marcaId, stock: 1, stockMinimo: "2", nombre });
    await contexto.crearProducto({ categoriaId, marcaId, stock: 10, nombre: `${nombre} B` });
    const base = { busqueda: nombre, marca: marcaId };
    assert.equal((await productos.listar({ ...base, estado: "STOCK_BAJO" })).total, 1);
    assert.equal((await productos.listar({ ...base, estado: "ACTIVOS", existencia: "CON_STOCK", porPagina: "4" })).total, 2);
    assert.equal((await productos.listar({ ...base, estado: "INACTIVOS", existencia: "SIN_STOCK" })).total, 0);
    const pendiente = await productos.listar({ ...base, precio: "PENDIENTE" });
    assert.deepEqual([pendiente.total, pendiente.conteosEstado.stockBajo, pendiente.conteosStock.conStock], [2, 1, 2]);
    await productos.configurarPrecio(bajo.productoId, { presentacionId: bajo.presentacionId, tipoListaPrecioId: listaGeneralId, precio: 5 }, usuarioId);
    assert.equal((await productos.listar({ ...base, precio: "VIGENTE" })).items[0].precioGeneral, "5.00");
    await assert.rejects(productos.listar({ marca: "x" }), BadRequestException);
    const alertas = await productos.alertasStockBajo({ porPagina: "1" });
    assert.equal(alertas.porPagina, 1);
    assert.equal((await productos.alertasStockBajo({ pagina: "2", porPagina: "x" })).total, undefined);
    assert.equal((await productos.alertasStockBajo()).pagina, 1);
    for (const vigencia of ["VIGENTE", "PROGRAMADO", "FINALIZADO", undefined]) {
      await productos.listarPrecios({ busqueda: nombre, marca: marcaId, lista: listaGeneralId, vigencia, porPagina: "6" });
    }
    assert.equal((await productos.listarPrecios({ busqueda: nombre, vigencia: "VIGENTE" })).total, 1);
    await assert.rejects(productos.listarPrecios({ lista: "x" }), BadRequestException);
    assert.ok((await productos.catalogos()).marcas.some((item) => item.id === marcaId));
  });

  test("configura precios programados, corrige y valida vigencias", async () => {
    const { productoId, presentacionId } = await contexto.crearProducto({ categoriaId, marcaId });
    const base = { presentacionId, tipoListaPrecioId: listaGeneralId, precio: "10.00" };
    for (const [id, entrada, patron, precioId] of [
      ["x", base, /producto no es válido/, undefined], [productoId, null, /precio válido/, undefined], [productoId, { ...base, precio: "10.05" }, /múltiplos/, undefined],
      [productoId, { ...base, vigenteDesde: "x" }, /fecha de vigencia/, undefined], [productoId, { ...base, vigenteDesde: "2026-02-30" }, /no es válida/, undefined],
      [productoId, { ...base, presentacionId: randomUUID() }, /presentación habilitada/, undefined], [productoId, { ...base, tipoListaPrecioId: randomUUID() }, /lista de precios activa/, undefined],
      [productoId, { ...base, cantidadMinima: 100_000_000_000 }, /cantidad mínima/, undefined], [productoId, { ...base, vigenteDesde: "2020-01-01" }, /vigencia futura/, undefined],
    ] as const) {
      await assert.rejects(productos.configurarPrecio(id, entrada, usuarioId, precioId), esBadRequest(patron));
    }
    await assert.rejects(productos.configurarPrecio(randomUUID(), base, usuarioId), NotFoundException);
    await assert.rejects(productos.configurarPrecio(productoId, { ...base, precioAnterior: 1 }, usuarioId, randomUUID()), NotFoundException);
    const actual = await productos.configurarPrecio(productoId, base, usuarioId);
    const futuro = new Date(Date.now() + 10 * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
    const programado = await productos.configurarPrecio(productoId, { ...base, precio: 12, vigenteDesde: futuro }, usuarioId);
    await assert.rejects(productos.configurarPrecio(productoId, { ...base, precio: 11, vigenteDesde: futuro }, usuarioId), ConflictException);
    const corregido = await productos.configurarPrecio(productoId, { precio: "12.50", precioAnterior: 12 }, usuarioId, programado.id);
    assert.deepEqual([corregido.id, corregido.precio], [programado.id, "12.50"]);
    await assert.rejects(productos.configurarPrecio(productoId, { precio: 9, precioAnterior: 1 }, usuarioId, actual.id), ConflictException);
    const reemplazo = await productos.configurarPrecio(productoId, { precio: 9, precioAnterior: 10 }, usuarioId, actual.id);
    assert.notEqual(reemplazo.id, actual.id);
    assert.equal((await productos.consultar(productoId)).precios.length, 3);
  });

  test("guarda productos con presentaciones y protege equivalencias usadas", async () => {
    const gtin = `${Date.now()}`.slice(-13).padStart(13, "7");
    const datos = { nombre: "Cadena QA", categoriaId, marcaId, unidadBaseCodigo: "NIU", afectacionIgv: "GRAVADO", codigos: [{ tipo: "gtin", codigo: gtin }],
      presentaciones: [{ clave: "caja", unidadMedidaCodigo: "BX", nombre: "Caja", factorAUnidadBase: 12, seCompra: true, seVende: true }] };
    const producto = await productos.guardar(datos);
    assert.deepEqual(producto.presentaciones.map((item) => item.nombre).sort(), ["Caja", "Unidad base"]);
    await assert.rejects(productos.guardar({ ...datos, nombre: "Otro" }), (error) => error instanceof ConflictException);
    await assert.rejects(productos.guardar({ ...datos, categoriaId: randomUUID() }), (error) => error instanceof BadRequestException);
    await assert.rejects(productos.guardar({ ...datos, presentaciones: [{ ...datos.presentaciones[0], unidadMedidaCodigo: "QQ" }] }), esBadRequest(/no está en el catálogo/));
    await assert.rejects(productos.guardar(datos, randomUUID()), NotFoundException);
    const caja = producto.presentaciones.find((item) => !item.esBase)!;
    const base = producto.presentaciones.find((item) => item.esBase)!;
    await assert.rejects(productos.guardar({ ...datos, presentaciones: [{ ...datos.presentaciones[0], clave: base.id }] }, producto.id), esBadRequest(/unidad base/));
    await productos.configurarPrecio(producto.id, { presentacionId: caja.id, tipoListaPrecioId: listaGeneralId, precio: 100 }, usuarioId);
    await assert.rejects(productos.guardar({ ...datos, presentaciones: [{ ...datos.presentaciones[0], clave: caja.id, factorAUnidadBase: 6 }] }, producto.id), ConflictException);
    const editado = await productos.guardar({ ...datos, nombre: "Cadena QA 2", activo: false, presentaciones: [] }, producto.id);
    assert.deepEqual([editado.nombre, editado.activo, editado.presentaciones.length], ["Cadena QA 2", false, 1]);
    await assert.rejects(productos.cambiarEstado(producto.id, "si"), BadRequestException);
    await assert.rejects(productos.cambiarEstado(randomUUID(), true), NotFoundException);
    assert.deepEqual(await productos.cambiarEstado(producto.id, true), { id: producto.id, activo: true });
  });
});
