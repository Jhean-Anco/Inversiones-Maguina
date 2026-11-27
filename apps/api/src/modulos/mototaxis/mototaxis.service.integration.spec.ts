import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ContextoPostgres, dniAleatorio, fechaHoyPeru, rucAleatorio, sumarDias } from "../../pruebas/contexto-postgres";
import { ServicioMototaxis } from "./mototaxis.service";
import { moverSaldoModelo } from "./inventario-modelos";

let contexto: ContextoPostgres;
let servicio: ServicioMototaxis;
let usuarioId: string;
let marcaMotoId: string;
let marcaRepuestosId: string;
let cuentaEfectivoId: string;
let cuentaBancoId: string;
let cuentaDolaresId: string;
let cuentaInactivaId: string;
const hoy = fechaHoyPeru();
const ayer = sumarDias(hoy, -1);
const manana = sumarDias(hoy, 1);

const esBadRequest = (patron?: RegExp) => (error: unknown) => error instanceof BadRequestException && (!patron || patron.test(error.message));
const esConflicto = (error: unknown) => error instanceof ConflictException;
const esNoEncontrado = (error: unknown) => error instanceof NotFoundException;
/**
 * Drizzle 0.45 envuelve los errores de PostgreSQL en `DrizzleQueryError` (código en `cause.code`), así que
 * `esDuplicado` del servicio no reconoce el 23505 y el duplicado sale como error 500 en vez de 409.
 * Se acepta cualquiera de las dos formas para cubrir la ruta sin fijar el defecto (ver test.todo).
 */
const esDuplicadoPostgres = (error: unknown) => error instanceof ConflictException;

async function crearModelo(datos: Record<string, unknown> = {}) {
  return servicio.crearModelo({ marcaId: marcaMotoId, nombre: `Modelo ${randomUUID().slice(0, 8)}`, ...datos });
}

async function crearProveedorRuc() {
  const proveedor = await servicio.crearProveedor({ tipoDocumento: "RUC", numeroDocumento: rucAleatorio("20"), razonSocial: `Proveedor QA ${contexto.sufijo}`, nombreComercial: `Comercial QA ${randomUUID().slice(0, 6)}` });
  contexto.personas.push(proveedor.id);
  return proveedor;
}

function datosCompra(proveedorPersonaId: string, modeloId: string, extra: Record<string, unknown> = {}) {
  return {
    proveedorPersonaId, fecha: hoy, documentoTipo: "FACTURA", documentoNumero: `F001-${randomUUID().slice(0, 6)}`,
    importePagoInicial: 9000, cuentaFinancieraId: cuentaEfectivoId,
    detalles: [{ modeloId, cantidad: 2, costoUnitario: 4500 }],
    ...extra,
  };
}

before(async () => {
  contexto = await ContextoPostgres.crear();
  servicio = new ServicioMototaxis();
  usuarioId = (await contexto.crearUsuario([])).id;
  marcaMotoId = await contexto.crearMarca("MOTOTAXIS");
  marcaRepuestosId = await contexto.crearMarca("REPUESTOS");
  cuentaEfectivoId = await contexto.crearCuenta(usuarioId);
  cuentaBancoId = await contexto.crearCuenta(usuarioId, { tipo: "BANCO", entidad: "Banco QA", numeroCuenta: "000-111" });
  cuentaDolaresId = await contexto.crearCuenta(usuarioId, { moneda: "USD" });
  cuentaInactivaId = await contexto.crearCuenta(usuarioId, { activa: false });
});

after(async () => { if (contexto) await contexto.cerrar(); });

describe("marcas y modelos", () => {
  test("crea marcas de mototaxi y rechaza nombres vacíos o repetidos", async () => {
    await assert.rejects(servicio.crearMarca(null), esBadRequest(/obligatorio/));
    const nombre = `QA Moto ${contexto.sufijo}`;
    const marca = await servicio.crearMarca({ nombre: `  ${nombre}  ` });
    contexto.marcas.push(marca.id);
    assert.equal(marca.nombre, nombre);
    assert.equal(marca.uso, "MOTOTAXIS");
    await assert.rejects(servicio.crearMarca({ nombre: nombre.toLowerCase() }), esDuplicadoPostgres);
    const marcas = await servicio.listarMarcas();
    assert.ok(marcas.some((item) => item.id === marca.id));
    assert.equal(marcas.some((item) => item.id === marcaRepuestosId), false);
    await assert.rejects(servicio.crearMarca({ nombre: "x".repeat(101) }), esBadRequest(/supera el máximo/));
  });

  test("valida la ficha técnica completa del modelo", async () => {
    const base = { marcaId: marcaMotoId, nombre: "Ficha" };
    for (const [entrada, patron] of [
      [null, /ficha del modelo/], [[], /ficha del modelo/], [{ ...base, marcaId: "x" }, /marca válida/],
      [{ ...base, nombre: " " }, /obligatorio/], [{ ...base, categoriaVehicular: "L9" }, /categoría vehicular/],
      [{ ...base, tipoMototaxi: "MIXTO" }, /tipo de mototaxi/], [{ ...base, tipoMotor: "DIESEL" }, /tipo de motor/],
      [{ ...base, tipoRefrigeracion: "AGUA" }, /refrigeración/], [{ ...base, coloresDisponibles: "rojo" }, /lista de colores/],
      [{ ...base, coloresDisponibles: Array.from({ length: 25 }, (_, i) => `Color ${i}`) }, /hasta 24 colores/],
      [{ ...base, coloresDisponibles: [""] }, /obligatorio/],
      [{ ...base, cilindradaCc: -1 }, /cilindrada/], [{ ...base, capacidadAsientos: 1.5 }, /asientos/],
      [{ ...base, capacidadCargaKg: 1.234 }, /capacidad de carga/], [{ ...base, capacidadCargaKg: 0 }, /capacidad de carga/],
    ] as const) {
      await assert.rejects(servicio.crearModelo(entrada), esBadRequest(patron), JSON.stringify(entrada));
    }
    await assert.rejects(servicio.crearModelo({ ...base, marcaId: marcaRepuestosId }), esBadRequest(/no está habilitada para mototaxis/));
  });

  test("guarda el modelo normalizado, evita duplicados y permite actualizarlo", async () => {
    const nombre = `Bajaj QA ${randomUUID().slice(0, 6)}`;
    const modelo = await servicio.crearModelo({
      marcaId: marcaMotoId, nombre, version: "RE 205", categoriaVehicular: "L5", fabricante: "Fábrica QA", paisFabricacion: "India",
      marcaMotor: "Bajaj", modeloMotor: "4S", tipoMototaxi: "PASAJERO", tipoMotor: "4_TIEMPOS", tipoRefrigeracion: "AIRE",
      coloresDisponibles: ["Rojo", "rojo", "Azul"], cilindradaCc: "205", combustible: "Gasolina", transmision: "Manual", carroceria: "Cabina",
      capacidadAsientos: 3, capacidadCargaKg: 350.5, especificacionesAdicionales: "Faros LED",
    });
    assert.equal(modelo.nombre, nombre);
    assert.deepEqual(modelo.coloresDisponibles, ["rojo", "Azul"]);
    assert.equal(modelo.cilindradaCc, 205);
    assert.equal(Number(modelo.capacidadCargaKg), 350.5);
    assert.equal(modelo.precioVenta, null);
    assert.match(modelo.codigo, /^MOT-[0-9A-F]{10}$/);
    await assert.rejects(servicio.crearModelo({ marcaId: marcaMotoId, nombre: nombre.toUpperCase(), version: "re 205" }), esDuplicadoPostgres);

    const otro = await crearModelo({ cilindradaCc: "", capacidadAsientos: "", capacidadCargaKg: null });
    assert.equal(otro.cilindradaCc, null);
    await assert.rejects(servicio.actualizarModelo("no-uuid", {}), esBadRequest());
    await assert.rejects(servicio.actualizarModelo(randomUUID(), { marcaId: marcaMotoId, nombre: "Inexistente" }), esNoEncontrado);
    await assert.rejects(servicio.actualizarModelo(otro.id, { marcaId: marcaMotoId, nombre, version: "RE 205" }), esDuplicadoPostgres);
    const actualizado = await servicio.actualizarModelo(otro.id, { marcaId: marcaMotoId, nombre: otro.nombre, version: "2027" });
    assert.equal(actualizado.version, "2027");

    await contexto.sql.unsafe("UPDATE modelos_mototaxis SET activo = false WHERE id = $1", [otro.id]);
    assert.equal((await servicio.listarModelos(otro.nombre)).length, 0);
    assert.equal((await servicio.listarModelos(`  ${otro.nombre}  `, true))[0]?.id, otro.id);
    assert.ok((await servicio.listarModelos()).some((item) => item.id === modelo.id));
    assert.deepEqual(await servicio.listarModelos("100%_\\"), []);
  });
});

describe("precios de venta por modelo", () => {
  test("valida identificadores, importes y vigencias", async () => {
    const modelo = await crearModelo();
    await assert.rejects(servicio.listarPreciosModelo("x"), esBadRequest());
    await assert.rejects(servicio.actualizarPrecioVentaModelo("x", {}, usuarioId), esBadRequest(/modelo válido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, {}, usuarioId, "x"), esBadRequest(/precio válido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, [], usuarioId), esBadRequest(/precio de venta válido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 0 }, usuarioId), esBadRequest(/importe válido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: "10.001" }, usuarioId), esBadRequest(/importe válido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 1_000_000_000_000 }, usuarioId), esBadRequest(/máximo permitido/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 10, vigenteDesde: "2026-02-30" }, usuarioId), esBadRequest(/fecha válida/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 10, vigenteHasta: "31/12/2026" }, usuarioId), esBadRequest(/fecha válida/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(randomUUID(), { precioVenta: 10 }, usuarioId), esNoEncontrado);
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 10, precioAnterior: 10 }, usuarioId, randomUUID()), esNoEncontrado);
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 10, vigenteDesde: ayer }, usuarioId), esBadRequest(/vigencia futura/));
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 10, vigenteDesde: manana, vigenteHasta: manana }, usuarioId), esBadRequest(/vigencia futura/));
  });

  test("programa, corrige y reemplaza precios sin superponer vigencias", async () => {
    const modelo = await crearModelo();
    const vigente = await servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: "4999.90" }, usuarioId);
    assert.equal(vigente.precioVenta, "4999.90");

    const enDiezDias = sumarDias(hoy, 10);
    await servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 5200, vigenteDesde: enDiezDias }, usuarioId);
    const [listado] = await servicio.listarModelos(modelo.nombre);
    assert.equal(listado.precioProgramado, "5200.00");
    assert.ok(listado.precioProgramadoDesde);
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 5100, vigenteDesde: sumarDias(hoy, 5) }, usuarioId), esConflicto);

    let precios = await servicio.listarPreciosModelo(modelo.id);
    assert.equal(precios.length, 2);
    const programado = precios.find((precio) => precio.precio === "5200.00")!;
    const actual = precios.find((precio) => precio.precio === "4999.90")!;
    assert.ok(actual.vigenteHasta, "el precio vigente se cierra al iniciar el programado");
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 5300, precioAnterior: 1 }, usuarioId, programado.id), esConflicto);
    await servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 5300, precioAnterior: 5200 }, usuarioId, programado.id);
    precios = await servicio.listarPreciosModelo(modelo.id);
    assert.equal(precios.filter((precio) => precio.precio === "5300.00").length, 1);
    assert.equal(precios.length, 2, "corregir un precio programado lo actualiza en su lugar");

    await servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 4999.9, precioAnterior: 4999.9 }, usuarioId, actual.id);
    assert.equal((await servicio.listarPreciosModelo(modelo.id)).length, 2, "corregir con el mismo importe no crea registros");
    const corregido = await servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 4800, precioAnterior: 4999.9 }, usuarioId, actual.id);
    assert.equal(corregido.precioVenta, "4800.00");
    precios = await servicio.listarPreciosModelo(modelo.id);
    assert.equal(precios.length, 3);
    const nuevo = precios.find((precio) => precio.precio === "4800.00")!;
    assert.equal(nuevo.vigenteHasta?.toISOString(), actual.vigenteHasta?.toISOString(), "el reemplazo conserva el fin de la vigencia anterior");

    await contexto.sql.unsafe("UPDATE precios_modelos_mototaxis SET vigente_desde = now() - interval '2 minutes', vigente_hasta = now() - interval '1 minute' WHERE id = $1", [nuevo.id]);
    await assert.rejects(servicio.actualizarPrecioVentaModelo(modelo.id, { precioVenta: 4700, precioAnterior: 4800 }, usuarioId, nuevo.id), esConflicto);
  });
});

describe("proveedores", () => {
  test("valida el documento y los nombres según el tipo de persona", async () => {
    for (const [entrada, patron] of [
      [null, /no son válidos/], [{ tipoDocumento: "CE", numeroDocumento: "123456" }, /DNI o RUC/],
      [{ tipoDocumento: "DNI", numeroDocumento: "1234" }, /8 dígitos/], [{ tipoDocumento: "RUC", numeroDocumento: "2012345" }, /11 dígitos/],
      [{ tipoDocumento: "RUC", numeroDocumento: rucAleatorio("20") }, /razón social/],
      [{ tipoDocumento: "DNI", numeroDocumento: dniAleatorio(), nombres: "Ana" }, /apellido paterno/],
    ] as const) {
      await assert.rejects(servicio.crearProveedor(entrada), esBadRequest(patron));
    }
  });

  test("registra proveedores naturales y jurídicos, reutiliza personas y evita duplicados", async () => {
    const juridico = await crearProveedorRuc();
    assert.equal(juridico.razonSocial, `Proveedor QA ${contexto.sufijo}`);
    assert.equal(juridico.nombres, null);
    await assert.rejects(servicio.crearProveedor({ tipoDocumento: "RUC", numeroDocumento: juridico.numeroDocumento, razonSocial: "Otra" }), esDuplicadoPostgres);

    const natural = await servicio.crearProveedor({ tipoDocumento: "RUC", numeroDocumento: rucAleatorio("10"), nombres: "Luis", apellidoPaterno: "Quispe", apellidoMaterno: "Mamani" });
    contexto.personas.push(natural.id);
    assert.equal(natural.nombre, "Luis Quispe Mamani");
    assert.equal(natural.razonSocial, null);

    const persona = await contexto.crearPersonaNatural();
    const reutilizado = await servicio.crearProveedor({ tipoDocumento: "DNI", numeroDocumento: persona.numeroDocumento, nombres: "Ignorado", apellidoPaterno: "Ignorado" });
    assert.equal(reutilizado.id, persona.id);

    const termino = `Proveedor QA ${contexto.sufijo}`;
    assert.ok((await servicio.listarProveedores(termino)).some((item) => item.id === juridico.id));
    assert.ok((await servicio.listarProveedores()).length >= 3);
    const pagina = await servicio.listarDirectorioProveedores("1", "1", termino);
    assert.equal(pagina.total, 1);
    assert.equal(pagina.items[0].id, juridico.id);
    const predeterminado = await servicio.listarDirectorioProveedores(undefined, "999", undefined);
    assert.equal(predeterminado.porPagina, 50);
    assert.equal(predeterminado.pagina, 1);
  });

  test("la ficha resume compras de repuestos y mototaxis según los permisos del usuario", async () => {
    const proveedor = await crearProveedorRuc();
    const modelo = await crearModelo();
    await servicio.crearCompra(datosCompra(proveedor.id, modelo.id, { fecha: ayer }), usuarioId);
    const sinPago = await servicio.crearCompra(datosCompra(proveedor.id, modelo.id, { fecha: ayer }), usuarioId);
    const parcial = await servicio.crearCompra(datosCompra(proveedor.id, modelo.id, { fecha: ayer, moneda: "USD" }), usuarioId);
    await contexto.sql.unsafe("DELETE FROM pagos_compras_mototaxis WHERE compra_id = $1", [sinPago.id]);
    await contexto.sql.unsafe("UPDATE pagos_compras_mototaxis SET importe_pagado = 8000 WHERE compra_id = $1", [parcial.id]);
    const insertarEntrada = (montoPagado: string | null, total: string, fecha: string) => contexto.sql.unsafe(
      `INSERT INTO entradas_stock (codigo, fecha, tipo_documento, total, usuario_id, proveedor_tipo_documento, proveedor_numero_documento, monto_pagado)
       VALUES ($1, $2, 'FACTURA', $3, $4, 'RUC', $5, $6)`,
      [`QA-E-${randomUUID().slice(0, 8)}`, fecha, total, usuarioId, proveedor.numeroDocumento, montoPagado]);
    await insertarEntrada(null, "100.00", hoy);
    await insertarEntrada("40.00", "100.00", hoy);
    await insertarEntrada("100.00", "100.00", "2025-01-10");

    await assert.rejects(servicio.obtenerFichaProveedor("x"), esBadRequest());
    await assert.rejects(servicio.obtenerFichaProveedor(randomUUID()), esNoEncontrado);
    const ficha = await servicio.obtenerFichaProveedor(proveedor.id, ["INVENTARIO.LEER", "MOTOTAXIS.LEER"]);
    assert.deepEqual(ficha.permisosCompras, { repuestos: true, mototaxis: true });
    assert.deepEqual(ficha.resumenCompras, [
      { moneda: "PEN", compras: 5, totalComprado: "18300.00", saldoPendiente: "9160.00" },
      { moneda: "USD", compras: 1, totalComprado: "9000.00", saldoPendiente: "1000.00" },
    ]);
    assert.deepEqual(ficha.compras.map((compra) => [compra.origen, compra.estadoPago]).sort(), [
      ["MOTOTAXIS", "PAGADA"], ["MOTOTAXIS", "SALDO_PENDIENTE"], ["MOTOTAXIS", "SIN_PAGO"],
      ["REPUESTOS", "PAGADA"], ["REPUESTOS", "SALDO_PENDIENTE"], ["REPUESTOS", "SIN_PAGO"],
    ]);
    assert.equal(ficha.compras.at(-1)?.fecha, "2025-01-10");

    const sinPermisos = await servicio.obtenerFichaProveedor(proveedor.id);
    assert.deepEqual(sinPermisos.compras, []);
    assert.deepEqual(sinPermisos.resumenCompras, []);
  });

});

describe("compras de mototaxis", () => {
  test("valida cabecera, pagos y líneas antes de registrar", async () => {
    const proveedor = await crearProveedorRuc();
    const modelo = await crearModelo();
    const base = datosCompra(proveedor.id, modelo.id);
    for (const [entrada, patron] of [
      [[], /no son válidos/], [{ ...base, proveedorPersonaId: "x" }, /proveedor del directorio/],
      [{ ...base, fecha: "2026-02-30" }, /fecha válida/], [{ ...base, fecha: manana }, /posterior a hoy/],
      [{ ...base, documentoTipo: "TICKET" }, /tipo de documento/], [{ ...base, detalles: [] }, /entre 1 y 30/],
      [{ ...base, detalles: Array.from({ length: 31 }, () => base.detalles[0]) }, /entre 1 y 30/],
      [{ ...base, claveIdempotencia: "abc" }, /referencia de la compra/], [{ ...base, moneda: "GBP" }, /moneda válida/],
      [{ ...base, importePagoInicial: "abc" }, /importe válido/], [{ ...base, pagosIniciales: [null] }, /medios de pago/],
      [{ ...base, medioPago: "CHEQUE" }, /medio de pago válido/], [{ ...base, cuentaFinancieraId: undefined }, /cuenta o caja/],
      [{ ...base, cuentaFinancieraId: "no-uuid" }, /cuenta financiera no es válida/],
      [{ ...base, cuentaFinancieraId: cuentaInactivaId }, /no existe o está inactiva/],
      [{ ...base, cuentaFinancieraId: cuentaDolaresId }, /soles/], [{ ...base, cuentaFinancieraId: cuentaBancoId }, /no coincide/],
      [{ ...base, detalles: [null] }, /línea 1 no es válida/], [{ ...base, detalles: [{ modeloId: "x" }] }, /modelo de la línea 1/],
      [{ ...base, detalles: [{ modeloId: modelo.id, cantidad: "1.5" }] }, /cantidad entera/],
      [{ ...base, detalles: [{ modeloId: modelo.id, cantidad: 1, porcentajeGarantia: 50 }] }, /garantía de la línea 1/],
      [{ ...base, detalles: [{ modeloId: modelo.id, cantidad: 1, mesesGarantia: 0 }] }, /garantía de la línea 1/],
      [{ ...base, detalles: [{ modeloId: modelo.id, cantidad: 1, costoUnitario: 0 }] }, /costo unitario/],
      [{ ...base, detalles: [{ modeloId: modelo.id, cantidad: 2_000_000, costoUnitario: 999_999_999 }] }, /máximo permitido/],
      [{ ...base, importePagoInicial: 1 }, /Distribuye el total/],
    ] as const) {
      await assert.rejects(servicio.crearCompra(entrada, usuarioId), esBadRequest(patron), JSON.stringify(entrada).slice(0, 120));
    }
    await assert.rejects(servicio.crearCompra(datosCompra(randomUUID(), modelo.id), usuarioId), esNoEncontrado);
    await assert.rejects(servicio.crearCompra(datosCompra(proveedor.id, randomUUID()), usuarioId), esBadRequest(/modelos activos/));
  });

  test("registra la compra, mueve el saldo del modelo, crea garantías y es idempotente", async () => {
    const proveedor = await crearProveedorRuc();
    const modelo = await crearModelo();
    const clave = randomUUID();
    const datos = datosCompra(proveedor.id, modelo.id, {
      fecha: "2026-01-31", documentoTipo: "SIN_DOCUMENTO", documentoNumero: "ignorado", moneda: "PEN", observacion: "Compra QA", claveIdempotencia: clave,
      importePagoInicial: 9000, pagosIniciales: [
        { importePagado: 5000, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaEfectivoId },
        { importePagado: 4000, medioPago: "TRANSFERENCIA", cuentaFinancieraId: cuentaBancoId },
      ],
      detalles: [{ modeloId: modelo.id, cantidad: "2", costoUnitario: "4500", porcentajeGarantia: 70, mesesGarantia: 1 }],
    });
    const compra = await servicio.crearCompra(datos, usuarioId);
    assert.equal(compra.total, "9000.00");
    assert.equal(compra.unidades, 2);
    assert.equal(compra.saldoPendiente, "0.00");
    assert.match(compra.codigo, /^CM-20260131-/);

    const [{ stock_disponible: stock }] = await contexto.sql.unsafe<{ stock_disponible: number }[]>("SELECT stock_disponible FROM modelos_mototaxis WHERE id = $1", [modelo.id]);
    assert.equal(stock, 2);
    const pagos = await servicio.listarPagosCompra(compra.id);
    assert.deepEqual(pagos.map((pago) => [pago.medioPago, pago.importePagado]).sort(), [["EFECTIVO", "5000.00"], ["TRANSFERENCIA", "4000.00"]]);
    const garantia = (await servicio.listarGarantias()).find((item) => item.codigo === compra.codigo);
    assert.ok(garantia);
    assert.equal(garantia.terminaEn, "2026-02-28", "la garantía de un mes vence el último día del mes siguiente");
    assert.equal(Number(garantia.porcentajeProveedor), 70);
    assert.equal(garantia.cantidad, 2);

    const repetida = await servicio.crearCompra(datos, usuarioId);
    assert.equal(repetida.id, compra.id);
    await assert.rejects(servicio.crearCompra({ ...datos, observacion: "Otra" }, usuarioId), esConflicto);

    const listado = await servicio.listarCompras(compra.codigo);
    assert.equal(listado.length, 1);
    assert.equal(listado[0].saldo, "0.00");
    assert.equal(listado[0].unidades, 2);
    assert.ok((await servicio.listarCompras()).some((item) => item.id === compra.id));
    await assert.rejects(servicio.listarPagosCompra("x"), esBadRequest());

    const analisis = await servicio.obtenerAnalisisModelo(modelo.id);
    assert.deepEqual([analisis.compras.unidades, analisis.compras.operaciones, analisis.compras.promedioPonderado], [2, 1, "4500.00"]);
    assert.equal(analisis.compras.ultima?.documentoTipo, "SIN_DOCUMENTO");
    assert.deepEqual(analisis.compras.historialMensual, [{ mes: "2026-01", promedio: "4500.00", cantidad: "2" }]);
    assert.equal(analisis.movimientos[0].tipo, "COMPRA");
    assert.equal(analisis.existencias.disponibles, 2);
  });

  test("aplica pagos de saldo completo con clave idempotente", async () => {
    const proveedor = await crearProveedorRuc();
    const modelo = await crearModelo();
    const compra = await servicio.crearCompra(datosCompra(proveedor.id, modelo.id), usuarioId);
    const pago = { fechaPago: hoy, importePagado: 9000, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaEfectivoId, claveIdempotencia: randomUUID() };
    for (const [compraId, entrada, patron] of [
      ["x", pago, /no son válidos/], [compra.id, [], /no son válidos/], [compra.id, { ...pago, fechaPago: "x" }, /fecha válida/],
      [compra.id, { ...pago, fechaPago: manana }, /posterior a hoy/], [compra.id, { ...pago, importePagado: -1 }, /importe válido/],
      [compra.id, { ...pago, medioPago: "CHEQUE" }, /medio de pago válido/], [compra.id, { ...pago, claveIdempotencia: "x" }, /idempotencia/],
    ] as const) {
      await assert.rejects(servicio.aplicarPagoCompra(compraId, entrada, usuarioId), esBadRequest(patron));
    }
    await assert.rejects(servicio.aplicarPagoCompra(randomUUID(), pago, usuarioId), esNoEncontrado);
    await assert.rejects(servicio.aplicarPagoCompra(compra.id, pago, usuarioId), esBadRequest(/saldo completo de S\/ 0\.00/));

    await contexto.sql.unsafe("DELETE FROM pagos_compras_mototaxis WHERE compra_id = $1", [compra.id]);
    const registrado = await servicio.aplicarPagoCompra(compra.id, pago, usuarioId);
    assert.equal(registrado.importePagado, "9000.00");
    assert.equal((await servicio.aplicarPagoCompra(compra.id, pago, usuarioId)).id, registrado.id);
    await assert.rejects(servicio.aplicarPagoCompra(compra.id, { ...pago, importePagado: 1 }, usuarioId), esConflicto);
  });
});

describe("inventario por modelo y unidades", () => {
  test("el reconteo ajusta el saldo y valida concurrencia", async () => {
    const modelo = await crearModelo();
    await assert.rejects(servicio.obtenerReconteoModelo("x"), esBadRequest());
    await assert.rejects(servicio.obtenerReconteoModelo(randomUUID()), esNoEncontrado);
    assert.equal((await servicio.obtenerReconteoModelo(modelo.id)).cantidadSistema, 0);
    for (const [entrada, patron] of [
      [null, /reconteo no son válidos/], [{ modeloId: "x" }, /modelo de mototaxi válido/], [{ modeloId: modelo.id, cantidadContada: -1 }, /cantidad entera/],
      [{ modeloId: modelo.id, cantidadContada: "3" }, /cantidad entera/], [{ modeloId: modelo.id, cantidadContada: 3 }, /obligatorio/],
      [{ modeloId: modelo.id, cantidadContada: 3, motivo: "x" }, /al menos dos caracteres/],
    ] as const) {
      await assert.rejects(servicio.crearAjusteInventario(entrada, usuarioId), esBadRequest(patron));
    }
    await assert.rejects(servicio.crearAjusteInventario({ modeloId: randomUUID(), cantidadContada: 1, motivo: "Conteo" }, usuarioId), esNoEncontrado);
    await assert.rejects(servicio.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 1, cantidadSistema: 5, motivo: "Conteo" }, usuarioId), esConflicto);
    const ajuste = await servicio.crearAjusteInventario({ modeloId: modelo.id, cantidadContada: 3, cantidadSistema: 0, motivo: "Conteo anual", observacion: "Almacén" }, usuarioId);
    assert.deepEqual([ajuste.cantidadSistema, ajuste.cantidadContada], [0, 3]);
    const listado = (await servicio.listarAjustesInventario()).find((item) => item.id === ajuste.id);
    assert.equal(listado?.aplicado, true);
    assert.equal(listado?.observacion, "Almacén");

    await assert.rejects(contexto.db.transaction((tx) => moverSaldoModelo(tx, { modeloId: modelo.id, tipo: "VENTA", origenId: randomUUID(), diferencia: -4, usuarioId })), esBadRequest(/excede las existencias/));
  });

  test("lista unidades con filtros, paginación y disponibilidad por color", async () => {
    const modelo = await crearModelo();
    const vin = `VINQA${randomUUID().slice(0, 10).toUpperCase()}`;
    const [unidad] = await contexto.sql.unsafe<{ id: string }[]>(
      "INSERT INTO unidades_mototaxis (codigo, modelo_id, vin, numero_motor, color, estado, costo_adquisicion) VALUES ($1, $2, $3, $4, 'Rojo', 'DISPONIBLE', 4000) RETURNING id",
      [`UQA-${randomUUID().slice(0, 8)}`, modelo.id, vin, `MOT-${randomUUID().slice(0, 8)}`]);
    await assert.rejects(servicio.listarUnidades({ estado: "PERDIDA" }), esBadRequest());
    const filtrado = await servicio.listarUnidades({ busqueda: vin, estado: "DISPONIBLE", pagina: "1", porPagina: "48" });
    assert.deepEqual([filtrado.total, filtrado.porPagina, filtrado.items[0]?.id], [1, 48, unidad.id]);
    assert.ok(filtrado.disponiblesPorColor.some((fila) => fila.modeloId === modelo.id && fila.color === "Rojo" && fila.cantidad === 1));
    const todos = await servicio.listarUnidades({ estado: "TODOS", pagina: "-2", porPagina: "7", busqueda: "%_" });
    assert.deepEqual([todos.pagina, todos.porPagina], [1, 12]);
    assert.equal((await servicio.listarUnidades({})).pagina, 1);
    await assert.rejects(servicio.listarMovimientos("x"), esBadRequest());
    assert.deepEqual(await servicio.listarMovimientos(unidad.id), []);
  });
});

describe("garantías y reclamos", () => {
  test("configura la política de garantía del modelo", async () => {
    const modelo = await crearModelo();
    await assert.rejects(servicio.obtenerGarantiaModelo("x"), esBadRequest());
    assert.equal(await servicio.obtenerGarantiaModelo(modelo.id), null);
    for (const [id, entrada, patron] of [
      ["x", {}, /modelo no es válido/], [modelo.id, null, /garantía no es válida/], [modelo.id, { activa: "si" }, /cuenta con garantía/],
      [modelo.id, { activa: true, mesesVigencia: 0 }, /entre 1 y 120/], [modelo.id, { activa: true, mesesVigencia: 12 }, /obligatorio/],
      [modelo.id, { activa: true, mesesVigencia: 12, alcance: "ok" }, /mínimo 3/],
    ] as const) {
      await assert.rejects(servicio.guardarGarantiaModelo(id, entrada), esBadRequest(patron));
    }
    await assert.rejects(servicio.guardarGarantiaModelo(randomUUID(), { activa: false, mesesVigencia: 6 }), esNoEncontrado);
    const inactiva = await servicio.guardarGarantiaModelo(modelo.id, { activa: false, mesesVigencia: 6 });
    assert.deepEqual([inactiva.activa, inactiva.alcance], [false, ""]);
    const activa = await servicio.guardarGarantiaModelo(modelo.id, { activa: true, mesesVigencia: 24, alcance: "Motor", exclusiones: "Choques" });
    assert.equal(activa.id, inactiva.id);
    assert.deepEqual((await servicio.obtenerGarantiaModelo(modelo.id))?.mesesVigencia, 24);
  });

  test("aplica la garantía a una venta emitida de mototaxi solo con política vigente", async () => {
    const modelo = await crearModelo();
    const sinPolitica = await crearModelo();
    await servicio.guardarGarantiaModelo(modelo.id, { activa: true, mesesVigencia: 12, alcance: "Motor y caja" });
    const venta = await contexto.crearVenta(usuarioId, { detalles: [{ tipo: "MOTOTAXI", modeloId: modelo.id, cantidad: 2 }, { tipo: "SERVICIO" }, { tipo: "MOTOTAXI", modeloId: sinPolitica.id }] });
    const ventaAntigua = await contexto.crearVenta(usuarioId, { fecha: "2020-01-15", detalles: [{ tipo: "MOTOTAXI", modeloId: modelo.id }] });
    const anulada = await contexto.crearVenta(usuarioId, { estado: "ANULADO", detalles: [{ tipo: "MOTOTAXI", modeloId: modelo.id }] });

    await assert.rejects(servicio.aplicarGarantiaVenta("x"), esBadRequest());
    for (const detalleId of [randomUUID(), venta.detalles[1], anulada.detalles[0]]) {
      await assert.rejects(servicio.aplicarGarantiaVenta(detalleId), esBadRequest(/venta emitida de mototaxi/));
    }
    await assert.rejects(servicio.aplicarGarantiaVenta(venta.detalles[2]), esConflicto);
    await assert.rejects(servicio.aplicarGarantiaVenta(ventaAntigua.detalles[0]), esConflicto);
    const aplicada = await servicio.aplicarGarantiaVenta(venta.detalles[0]);
    assert.deepEqual([aplicada.cantidad, aplicada.mesesVigencia, aplicada.alcance, aplicada.iniciaEn], [2, 12, "Motor y caja", hoy]);
    assert.equal((await servicio.aplicarGarantiaVenta(venta.detalles[0])).id, aplicada.id);

    const analisis = await servicio.obtenerAnalisisModelo(modelo.id);
    assert.deepEqual([analisis.ventas.unidades, analisis.ventas.operaciones], [3, 2]);
    assert.equal(analisis.ventas.ultima?.fecha, hoy);
    assert.equal(analisis.ventas.historialMensual.length, 2);
    await assert.rejects(servicio.obtenerAnalisisModelo("x"), esBadRequest());
  });

  test("registra reclamos dentro de la vigencia y reparte el costo con el proveedor", async () => {
    const proveedor = await crearProveedorRuc();
    const modelo = await crearModelo();
    const otroModelo = await crearModelo();
    const compra = await servicio.crearCompra(datosCompra(proveedor.id, modelo.id, { fecha: sumarDias(hoy, -20) }), usuarioId);
    const garantia = (await servicio.listarGarantias()).find((item) => item.codigo === compra.codigo)!;
    const ventaModelo = await contexto.crearVenta(usuarioId, { fecha: sumarDias(hoy, -5), detalles: [{ tipo: "MOTOTAXI", modeloId: modelo.id }] });
    const ventaOtro = await contexto.crearVenta(usuarioId, { detalles: [{ tipo: "MOTOTAXI", modeloId: otroModelo.id }, { tipo: "SERVICIO" }] });
    const base = { garantiaId: garantia.id, fecha: hoy, descripcionFalla: "Falla de encendido", costoTotal: 100.01 };

    for (const [entrada, patron] of [
      [[], /reclamo no son válidos/], [{ ...base, garantiaId: "x" }, /garantía válida/], [{ ...base, fecha: "hoy" }, /fecha válida/],
      [{ ...base, fecha: manana }, /no puede ser futura/], [{ ...base, descripcionFalla: "" }, /obligatorio/], [{ ...base, costoTotal: "x" }, /importe válido/],
      [{ ...base, costoTotal: 1_000_000_000_000 }, /máximo permitido/], [{ ...base, ingresoDetalleId: "x" }, /artículo vendido válido/],
      [{ ...base, ingresoDetalleId: ventaOtro.detalles[1] }, /venta emitida de mototaxi/], [{ ...base, ingresoDetalleId: ventaOtro.detalles[0] }, /no corresponde al modelo/],
      [{ ...base, fecha: sumarDias(hoy, -6), ingresoDetalleId: ventaModelo.detalles[0] }, /anterior a la venta/],
      [{ ...base, fecha: sumarDias(hoy, -30) }, /fuera de la vigencia/],
    ] as const) {
      await assert.rejects(servicio.crearReclamo(entrada, usuarioId), esBadRequest(patron));
    }
    await assert.rejects(servicio.crearReclamo({ ...base, garantiaId: randomUUID() }, usuarioId), esNoEncontrado);

    const reclamo = await servicio.crearReclamo({ ...base, ingresoDetalleId: ventaModelo.detalles[0] }, usuarioId);
    assert.deepEqual([reclamo.importeProveedor, reclamo.importeEmpresa, reclamo.estado], ["80.01", "20.00", "ABIERTO"]);
    const sinVenta = await servicio.crearReclamo({ ...base, costoTotal: 0 }, usuarioId);
    assert.equal(sinVenta.ingresoDetalleId, null);
    const listado = (await servicio.listarReclamos()).find((item) => item.id === reclamo.id);
    assert.equal(listado?.ventaMototaxi, `Línea QA ${contexto.sufijo}`);

    for (const [id, entrada, patron] of [
      ["x", {}, /reclamo válido/], [reclamo.id, null, /reclamo válido/], [reclamo.id, { estado: "RESUELTO", estadoAnterior: "ABIERTO" }, /no está permitido/],
      [reclamo.id, { estado: "X", estadoAnterior: "DESCONOCIDO" }, /no está permitido/], [reclamo.id, { estado: "APROBADO", estadoAnterior: "ENVIADO" }, /obligatorio/],
    ] as const) {
      await assert.rejects(servicio.avanzarReclamo(id, entrada), esBadRequest(patron));
    }
    const enviado = await servicio.avanzarReclamo(reclamo.id, { estado: "ENVIADO", estadoAnterior: "ABIERTO" });
    assert.deepEqual([enviado.estado, enviado.resolucion], ["ENVIADO", null]);
    await assert.rejects(servicio.avanzarReclamo(reclamo.id, { estado: "ENVIADO", estadoAnterior: "ABIERTO" }), esConflicto);
    const aprobado = await servicio.avanzarReclamo(reclamo.id, { estado: "APROBADO", estadoAnterior: "ENVIADO", resolucion: "Proveedor repone el motor" });
    assert.equal(aprobado.resolucion, "Proveedor repone el motor");
    assert.equal((await servicio.avanzarReclamo(reclamo.id, { estado: "RESUELTO", estadoAnterior: "APROBADO", resolucion: "Entregado" })).estado, "RESUELTO");
  });
});
