import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ContextoPostgres, fechaHoyPeru, rucAleatorio, sumarDias } from "../../pruebas/contexto-postgres";
import { ServicioFinanzas } from "../finanzas/finanzas.service";
import { ServicioEntradasStock } from "../inventario/entradas-stock.service";
import { ServicioMovimientosStock } from "../inventario/movimientos-stock.service";
import { ServicioProductos } from "../inventario/productos.service";
import { ServicioMototaxis } from "../mototaxis/mototaxis.service";
import { ServicioEgresos } from "./egresos.service";

let contexto: ContextoPostgres;
let usuarioId: string;
let categoriaId: string;
let marcaId: string;
let marcaMotoId: string;
const hoy = fechaHoyPeru();
const entradas = new ServicioEntradasStock();
const movimientos = new ServicioMovimientosStock();
const productos = new ServicioProductos();
const mototaxis = new ServicioMototaxis();
const egresos = new ServicioEgresos();
const finanzas = new ServicioFinanzas();
const motivo = { motivo: "Registro duplicado QA" };

before(async () => {
  contexto = await ContextoPostgres.crear();
  usuarioId = (await contexto.crearUsuario([])).id;
  categoriaId = await contexto.crearCategoria();
  marcaId = await contexto.crearMarca("REPUESTOS");
  marcaMotoId = await contexto.crearMarca("MOTOTAXIS");
});
after(async () => { if (contexto) await contexto.cerrar(); });

const crearCuenta = () => contexto.crearCuenta(usuarioId, { saldoInicial: "100000.00", fechaSaldoInicial: hoy });

/** Salidas del día de una cuenta según Finanzas y, si la conciliación es posible, su saldo actual. */
async function caja(cuentaId: string) {
  const dia = await finanzas.movimientosPorPeriodo("DIA", hoy, cuentaId);
  const resumen = (await finanzas.resumenDelMes()).items.find((item) => item.id === cuentaId)!;
  const egresado = dia.items.find((item) => item.id === cuentaId)!.egresos;
  assert.equal(resumen.egresosMes, egresado);
  if (resumen.saldoEstado === "CONCILIADO") assert.equal(resumen.saldoActual, (100000 - Number(egresado)).toFixed(2));
  return { egresado, movimientos: dia.totalMovimientos };
}

async function filas<T extends object>(consulta: string, parametros: string[]) {
  return await contexto.sql.unsafe<T[]>(consulta, parametros);
}
const stock = async (productoId: string) => Number((await filas<{ cantidad: string }>("SELECT cantidad FROM saldos_stock WHERE producto_id = $1", [productoId]))[0]?.cantidad ?? 0);
const stockModelo = async (modeloId: string) => (await filas<{ stock_disponible: number }>("SELECT stock_disponible FROM modelos_mototaxis WHERE id = $1", [modeloId]))[0].stock_disponible;
const resultados = (lista: PromiseSettledResult<unknown>[]) => ({
  ok: lista.filter((item) => item.status === "fulfilled").length,
  errores: lista.flatMap((item) => item.status === "rejected" ? [item.reason] : []),
});

describe("compra de repuestos: dinero e inventario", () => {
  function datos(cuentaId: string, linea: { productoId: string; presentacionId: string }, extra: Record<string, unknown> = {}) {
    return { fecha: hoy, tipoDocumento: "SIN_DOCUMENTO", pagos: [{ cuentaFinancieraId: cuentaId, medioPago: "EFECTIVO", importePagado: 50 }],
      detalles: [{ productoId: linea.productoId, presentacionId: linea.presentacionId, cantidad: 5, costoUnitario: 10 }], ...extra };
  }

  test("registra al contado, anula revirtiendo caja, stock y costos, y no revierte dos veces", async () => {
    const cuentaId = await crearCuenta();
    const linea = await contexto.crearProducto({ categoriaId, marcaId, stock: 2 });
    const compra = await entradas.crear(datos(cuentaId, linea), usuarioId);
    assert.equal(await stock(linea.productoId), 7);
    assert.deepEqual(await caja(cuentaId), { egresado: "50.00", movimientos: 1 });
    assert.equal((await productos.costosCompra(linea.productoId)).promedioPonderado, "10.0000");
    for (const entrada of [undefined, {}, { motivo: "no" }]) await assert.rejects(entradas.anular(compra.id, entrada, usuarioId), BadRequestException);
    await assert.rejects(entradas.anular(randomUUID(), motivo, usuarioId), NotFoundException);

    const carrera = resultados(await Promise.allSettled([entradas.anular(compra.id, motivo, usuarioId), entradas.anular(compra.id, motivo, usuarioId)]));
    assert.equal(carrera.ok, 1);
    assert.ok(carrera.errores[0] instanceof ConflictException);

    const anulada = await entradas.consultar(compra.id);
    assert.deepEqual([anulada.estado, anulada.motivoAnulacion, Boolean(anulada.anuladoEn), Boolean(anulada.anuladoPor)], ["ANULADA", motivo.motivo, true, true]);
    assert.equal(await stock(linea.productoId), 2);
    assert.deepEqual(await caja(cuentaId), { egresado: "0.00", movimientos: 0 });
    const kardex = await filas<{ tipo: string; origen_tipo: string; cantidad_base: string; saldo_anterior: string | null; saldo_final: string | null; costo_unitario_base: string }>(
      "SELECT tipo, origen_tipo, cantidad_base, saldo_anterior, saldo_final, costo_unitario_base FROM movimientos_stock WHERE producto_id = $1 ORDER BY creado_en", [linea.productoId]);
    assert.deepEqual(kardex.map((fila) => [fila.tipo, fila.origen_tipo]), [["ENTRADA", "ENTRADA_STOCK"], ["SALIDA", "ANULACION_ENTRADA"]]);
    assert.deepEqual([Number(kardex[1].saldo_anterior), Number(kardex[1].saldo_final), Number(kardex[1].costo_unitario_base)], [7, 2, 10]);
    const pagos = await filas<{ anulado_en: Date | null; anulado_por_usuario_id: string }>("SELECT anulado_en, anulado_por_usuario_id FROM pagos_entradas_stock WHERE entrada_id = $1", [compra.id]);
    assert.deepEqual([pagos.length, Boolean(pagos[0].anulado_en), pagos[0].anulado_por_usuario_id], [1, true, usuarioId]);
    const costos = await productos.costosCompra(linea.productoId);
    assert.deepEqual([costos.ultima, costos.promedioPonderado], [null, null]);
    assert.equal((await productos.historial(linea.productoId)).compra, null);
    assert.ok((await movimientos.listar({ busqueda: compra.codigo })).total >= 2);
    const listado = await entradas.listar({ busqueda: compra.codigo, estadoPago: "ANULADAS" });
    assert.deepEqual([listado.total, listado.conteosPago.anuladas, listado.conteosPago.pagadas, listado.conteosPago.pendientes], [1, 1, 0, 0]);
    assert.equal((await entradas.listar({ busqueda: compra.codigo, estadoPago: "PAGADAS", pagina: "5" })).total, 0);
  });

  test("bloquea la anulación con 409 cuando el stock ya salió, sin cambios", async () => {
    const cuentaId = await crearCuenta();
    const linea = await contexto.crearProducto({ categoriaId, marcaId });
    const compra = await entradas.crear(datos(cuentaId, linea), usuarioId);
    await movimientos.crearAjuste({ productoId: linea.productoId, sentido: "RETIRO", cantidad: 1, motivo: "MERMA" }, usuarioId);
    await assert.rejects(entradas.anular(compra.id, motivo, usuarioId), (error) => error instanceof ConflictException && /ya se vendió o se ajustó/.test(error.message));
    assert.equal((await entradas.consultar(compra.id)).estado, "REGISTRADA");
    assert.equal(await stock(linea.productoId), 4);
    assert.equal((await caja(cuentaId)).egresado, "50.00");
  });

  test("anulación y retiro simultáneos nunca dejan stock negativo", async () => {
    const cuentaId = await crearCuenta();
    const linea = await contexto.crearProducto({ categoriaId, marcaId });
    const compra = await entradas.crear(datos(cuentaId, linea), usuarioId);
    const carrera = resultados(await Promise.allSettled([
      entradas.anular(compra.id, motivo, usuarioId),
      movimientos.crearAjuste({ productoId: linea.productoId, sentido: "RETIRO", cantidad: 5, motivo: "MERMA" }, usuarioId),
    ]));
    assert.equal(carrera.ok, 1);
    assert.equal(await stock(linea.productoId), 0);
  });

  test("es idempotente, permite registrar de nuevo el comprobante anulado y valida fecha y totales", async () => {
    const cuentaId = await crearCuenta();
    const linea = await contexto.crearProducto({ categoriaId, marcaId });
    const factura = datos(cuentaId, linea, { tipoDocumento: "FACTURA", numeroDocumento: "F009-1", proveedor: "Prov", proveedorTipoPersona: "JURIDICA",
      proveedorTipoDocumento: "RUC", proveedorNumeroDocumento: rucAleatorio("20"), claveIdempotencia: randomUUID() });
    const [a, b] = await Promise.all([entradas.crear(factura, usuarioId), entradas.crear(factura, usuarioId)]);
    assert.equal(a.id, b.id);
    assert.equal(await stock(linea.productoId), 5);
    assert.equal((await caja(cuentaId)).movimientos, 1);
    await assert.rejects(entradas.crear({ ...factura, fecha: sumarDias(hoy, -1) }, usuarioId), (error) => error instanceof ConflictException && /otra compra/.test(error.message));
    await assert.rejects(entradas.crear({ ...factura, claveIdempotencia: randomUUID() }, usuarioId), ConflictException);
    await entradas.anular(a.id, motivo, usuarioId);
    await assert.rejects(entradas.crear(factura, usuarioId), (error) => error instanceof ConflictException && /anulada/.test(error.message));
    const corregida = await entradas.crear({ ...factura, claveIdempotencia: randomUUID() }, usuarioId);
    assert.notEqual(corregida.id, a.id);
    assert.equal(await stock(linea.productoId), 5);
    assert.equal((await caja(cuentaId)).egresado, "50.00");
    await assert.rejects(entradas.crear(datos(cuentaId, linea, { fecha: sumarDias(hoy, 1) }), usuarioId), /posterior a hoy/);
    await assert.rejects(entradas.crear(datos(cuentaId, linea, { totalDocumento: 49 }), usuarioId), /no puede ser menor/);
    await assert.rejects(entradas.crear(datos(cuentaId, linea, { claveIdempotencia: "x" }), usuarioId), BadRequestException);
    await assert.rejects(entradas.crear(datos(cuentaId, linea, { pagos: [{ cuentaFinancieraId: cuentaId, medioPago: "EFECTIVO", importePagado: 60 }] }), usuarioId), /Distribuye/);
  });

  test("compras y retiros concurrentes conservan el saldo", async () => {
    const cuentaId = await crearCuenta();
    const linea = await contexto.crearProducto({ categoriaId, marcaId, stock: 10 });
    await Promise.all([
      ...[1, 2, 3].map(() => entradas.crear(datos(cuentaId, linea), usuarioId)),
      ...[1, 2, 3].map(() => movimientos.crearAjuste({ productoId: linea.productoId, sentido: "RETIRO", cantidad: 2, motivo: "MERMA" }, usuarioId)),
    ]);
    assert.equal(await stock(linea.productoId), 19);
    assert.equal((await caja(cuentaId)).egresado, "150.00");
  });
});

describe("compra de mototaxis: dinero, existencias y garantías", () => {
  async function preparar() {
    const cuentaId = await crearCuenta();
    const modelo = await mototaxis.crearModelo({ marcaId: marcaMotoId, nombre: `Flujo ${randomUUID().slice(0, 8)}` });
    const proveedor = await mototaxis.crearProveedor({ tipoDocumento: "RUC", numeroDocumento: rucAleatorio("20"), razonSocial: `Proveedor ${contexto.sufijo}` });
    contexto.personas.push(proveedor.id);
    const datos = { proveedorPersonaId: proveedor.id, fecha: hoy, documentoTipo: "FACTURA", documentoNumero: "F001-5", importePagoInicial: 9000, cuentaFinancieraId: cuentaId,
      detalles: [{ modeloId: modelo.id, cantidad: 2, costoUnitario: 4500 }] };
    return { cuentaId, modelo, proveedor, datos };
  }
  const garantiasDe = async (compraId: string) => {
    const detalles = await filas<{ id: string }>("SELECT id FROM compras_mototaxis_detalle WHERE compra_id = $1", [compraId]);
    return (await mototaxis.listarGarantias()).filter((garantia) => detalles.some((detalle) => detalle.id === garantia.compraDetalleId));
  };

  test("anula la compra revirtiendo caja, stock, garantías y análisis", async () => {
    const { cuentaId, modelo, proveedor, datos } = await preparar();
    const clave = randomUUID();
    const compra = await mototaxis.crearCompra({ ...datos, claveIdempotencia: clave }, usuarioId);
    assert.equal(await stockModelo(modelo.id), 2);
    assert.equal((await caja(cuentaId)).egresado, "9000.00");
    const [garantia] = await garantiasDe(compra.id);
    await assert.rejects(mototaxis.crearCompra(datos, usuarioId), (error) => error instanceof ConflictException && /ya está registrado/.test(error.message));
    await assert.rejects(mototaxis.anularCompra(compra.id, { motivo: "" }, usuarioId), BadRequestException);
    await assert.rejects(mototaxis.anularCompra("x", motivo, usuarioId), BadRequestException);
    await assert.rejects(mototaxis.anularCompra(randomUUID(), motivo, usuarioId), NotFoundException);

    const carrera = resultados(await Promise.allSettled([mototaxis.anularCompra(compra.id, motivo, usuarioId), mototaxis.anularCompra(compra.id, motivo, usuarioId)]));
    assert.equal(carrera.ok, 1);
    assert.ok(carrera.errores[0] instanceof ConflictException);
    assert.equal(await stockModelo(modelo.id), 0);
    assert.deepEqual(await caja(cuentaId), { egresado: "0.00", movimientos: 0 });
    assert.equal((await garantiasDe(compra.id)).length, 0);
    await assert.rejects(mototaxis.crearReclamo({ garantiaId: garantia.id, fecha: hoy, descripcionFalla: "Falla", costoTotal: 10 }, usuarioId), ConflictException);
    const item = (await mototaxis.listarCompras(compra.codigo))[0];
    assert.deepEqual([item.estado, item.pagado, item.saldo, item.motivoAnulacion], ["ANULADA", "0.00", "0.00", motivo.motivo]);
    assert.ok((await mototaxis.listarPagosCompra(compra.id))[0].anuladoEn);
    const analisis = await mototaxis.obtenerAnalisisModelo(modelo.id);
    assert.deepEqual([analisis.compras.unidades, analisis.compras.ultima], [0, null]);
    assert.equal((await mototaxis.obtenerFichaProveedor(proveedor.id, ["MOTOTAXIS.LEER"])).compras.length, 0);
    await assert.rejects(mototaxis.aplicarPagoCompra(compra.id, { fechaPago: hoy, importePagado: 9000, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId, claveIdempotencia: randomUUID() }, usuarioId), /anulada/);
    await assert.rejects(mototaxis.crearCompra({ ...datos, claveIdempotencia: clave }, usuarioId), /anulada/);
    await mototaxis.crearCompra(datos, usuarioId);
    assert.equal(await stockModelo(modelo.id), 2);
  });

  test("bloquea la anulación si las unidades salieron o hay reclamos", async () => {
    const { cuentaId, modelo, datos } = await preparar();
    const compra = await mototaxis.crearCompra(datos, usuarioId);
    await mototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 1, motivo: "Salida" }, usuarioId);
    await assert.rejects(mototaxis.anularCompra(compra.id, motivo, usuarioId), (error) => error instanceof ConflictException && /ingresaron 2, hay 1/.test(error.message));
    await mototaxis.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 2, motivo: "Recuperada" }, usuarioId);

    const [detalle] = await filas<{ id: string }>("SELECT id FROM compras_mototaxis_detalle WHERE compra_id = $1", [compra.id]);
    const [unidad] = await filas<{ id: string }>(
      "INSERT INTO unidades_mototaxis (codigo, compra_detalle_id, modelo_id, vin, numero_motor, estado, costo_adquisicion) VALUES ($1, $2, $3, $4, $4, 'VENDIDA', 4500) RETURNING id",
      [`QA-${randomUUID().slice(0, 8)}`, detalle.id, modelo.id, randomUUID().slice(0, 17)]);
    await assert.rejects(mototaxis.anularCompra(compra.id, motivo, usuarioId), (error) => error instanceof ConflictException && /ya no están disponibles/.test(error.message));
    assert.equal(await stockModelo(modelo.id), 2);
    assert.equal((await caja(cuentaId)).egresado, "9000.00");

    const [garantia] = await garantiasDe(compra.id);
    await mototaxis.crearReclamo({ garantiaId: garantia.id, fecha: hoy, descripcionFalla: "Falla", costoTotal: 10 }, usuarioId);
    await assert.rejects(mototaxis.anularCompra(compra.id, motivo, usuarioId), (error) => error instanceof ConflictException && /reclamos/.test(error.message));
    assert.equal(unidad.id.length, 36);
  });

  test("da de baja las unidades físicas disponibles de la compra anulada", async () => {
    const { modelo, datos } = await preparar();
    const compra = await mototaxis.crearCompra(datos, usuarioId);
    const [detalle] = await filas<{ id: string }>("SELECT id FROM compras_mototaxis_detalle WHERE compra_id = $1", [compra.id]);
    const [unidad] = await filas<{ id: string }>(
      "INSERT INTO unidades_mototaxis (codigo, compra_detalle_id, modelo_id, vin, numero_motor, costo_adquisicion) VALUES ($1, $2, $3, $4, $4, 4500) RETURNING id",
      [`QA-${randomUUID().slice(0, 8)}`, detalle.id, modelo.id, randomUUID().slice(0, 17)]);
    await mototaxis.anularCompra(compra.id, motivo, usuarioId);
    assert.equal((await filas<{ estado: string }>("SELECT estado FROM unidades_mototaxis WHERE id = $1", [unidad.id]))[0].estado, "BAJA");
    assert.equal((await mototaxis.listarMovimientos(unidad.id))[0].motivo, "ANULACION_COMPRA");
  });

  test("una compra antigua con saldo admite un solo pago aunque lleguen dos a la vez o repetidos", async () => {
    const { cuentaId, datos } = await preparar();
    const compra = await mototaxis.crearCompra(datos, usuarioId);
    await filas("DELETE FROM pagos_compras_mototaxis WHERE compra_id = $1", [compra.id]);
    const pago = { fechaPago: hoy, importePagado: 9000, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId };
    const clave = randomUUID();
    const [a, b] = await Promise.all([1, 2].map(() => mototaxis.aplicarPagoCompra(compra.id, { ...pago, claveIdempotencia: clave }, usuarioId)));
    assert.equal(a.id, b.id);
    await assert.rejects(mototaxis.aplicarPagoCompra(compra.id, { ...pago, claveIdempotencia: randomUUID() }, usuarioId), BadRequestException);
    assert.equal((await caja(cuentaId)).egresado, "9000.00");
  });
});

describe("egresos: pagos, anulación y saldo de cuentas", () => {
  const datos = (cuentaId: string, extra: Record<string, unknown> = {}) => ({ tipo: "MOTOTAXI", fecha: hoy, monto: 100, categoria: "Compra", concepto: "Mototaxi", beneficiario: "Prov",
    mototaxiMarca: "M", mototaxiModelo: "X", mototaxiNumeroMotor: `MT-${randomUUID().slice(0, 12)}`, mototaxiNumeroChasis: `CH-${randomUUID().slice(0, 12)}`,
    importePagoInicial: 40, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId, ...extra });
  const pago = (cuentaId: string, importePagado: number) => ({ fechaPago: hoy, importePagado, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId, claveIdempotencia: randomUUID() });
  const item = async (codigo: string) => (await egresos.listar({ busqueda: codigo })).items[0];

  test("evita sobrepago y duplicados concurrentes", async () => {
    const cuentaId = await crearCuenta();
    const egreso = await egresos.crear(datos(cuentaId), usuarioId);
    const carrera = resultados(await Promise.allSettled([egresos.registrarPago(egreso.id, pago(cuentaId, 60), usuarioId), egresos.registrarPago(egreso.id, pago(cuentaId, 60), usuarioId)]));
    assert.equal(carrera.ok, 1);
    assert.ok(carrera.errores[0] instanceof BadRequestException);
    assert.equal((await item(egreso.codigo)).saldoPendiente, "0.00");
    assert.equal((await caja(cuentaId)).egresado, "100.00");

    const otro = await egresos.crear(datos(cuentaId), usuarioId);
    const repetido = pago(cuentaId, 10);
    const [a, b] = await Promise.all([egresos.registrarPago(otro.id, repetido, usuarioId), egresos.registrarPago(otro.id, repetido, usuarioId)]);
    assert.equal(a.id, b.id);
    assert.equal((await item(otro.codigo)).importePagadoAcumulado, "50.00");
  });

  test("anula un pago y después el egreso, devolviendo el saldo de la cuenta", async () => {
    const cuentaId = await crearCuenta();
    const original = datos(cuentaId, { documentoTipo: "FACTURA", documentoNumero: "F7-1", proveedorRuc: rucAleatorio("20") });
    const egreso = await egresos.crear(original, usuarioId);
    const datosPago = pago(cuentaId, 60);
    const segundo = await egresos.registrarPago(egreso.id, datosPago, usuarioId);
    await assert.rejects(egresos.anularPago(egreso.id, segundo.id, {}, usuarioId), BadRequestException);
    await assert.rejects(egresos.anularPago(egreso.id, "x", motivo, usuarioId), BadRequestException);
    await assert.rejects(egresos.anularPago(randomUUID(), segundo.id, motivo, usuarioId), NotFoundException);
    await assert.rejects(egresos.anularPago(egreso.id, randomUUID(), motivo, usuarioId), NotFoundException);
    const carrera = resultados(await Promise.allSettled([egresos.anularPago(egreso.id, segundo.id, motivo, usuarioId), egresos.anularPago(egreso.id, segundo.id, motivo, usuarioId)]));
    assert.equal(carrera.ok, 1);
    assert.deepEqual([(await item(egreso.codigo)).importePagadoAcumulado, (await item(egreso.codigo)).saldoPendiente], ["40.00", "60.00"]);
    assert.equal((await caja(cuentaId)).egresado, "40.00");
    await assert.rejects(egresos.registrarPago(egreso.id, datosPago, usuarioId), /fue anulado/);
    await egresos.registrarPago(egreso.id, pago(cuentaId, 60), usuarioId);

    await assert.rejects(egresos.anular("x", motivo, usuarioId), BadRequestException);
    await assert.rejects(egresos.anular(randomUUID(), motivo, usuarioId), NotFoundException);
    assert.equal((await egresos.anular(egreso.id, motivo, usuarioId)).estado, "ANULADO");
    await assert.rejects(egresos.anular(egreso.id, motivo, usuarioId), ConflictException);
    await assert.rejects(egresos.anularPago(egreso.id, segundo.id, motivo, usuarioId), ConflictException);
    await assert.rejects(egresos.registrarPago(egreso.id, pago(cuentaId, 1), usuarioId), /anulado/);
    const anulado = await item(egreso.codigo);
    assert.deepEqual([anulado.estado, anulado.importePagadoAcumulado, anulado.saldoPendiente], ["ANULADO", "0.00", "0.00"]);
    assert.deepEqual(await caja(cuentaId), { egresado: "0.00", movimientos: 0 });
    const auditoria = await filas("SELECT id FROM egresos_pagos WHERE egreso_id = $1 AND anulado_en IS NOT NULL AND anulado_por_usuario_id IS NOT NULL AND motivo_anulacion IS NOT NULL", [egreso.id]);
    assert.equal(auditoria.length, 3);
    // El mismo comprobante, motor y chasis pueden registrarse de nuevo, ya corregidos.
    assert.equal((await egresos.crear(original, usuarioId)).estado, "REGISTRADO");
  });

  test("responde 409 ante dos altas simultáneas con el mismo motor", async () => {
    const cuentaId = await crearCuenta();
    const base = datos(cuentaId);
    const carrera = resultados(await Promise.allSettled([egresos.crear(base, usuarioId), egresos.crear(base, usuarioId)]));
    assert.equal(carrera.ok, 1);
    assert.ok(carrera.errores[0] instanceof ConflictException);
  });
});
