import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, test } from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { ServicioIngresos } from "./ingresos.service";
import { analizarEstadoComprobante, validarElegibilidadReintento } from "./comprobante-emision.util";

// Estas pruebas no tocan PostgreSQL: cada validación falla antes de la primera consulta.
const servicio = new ServicioIngresos({} as never);
const usuarioId = randomUUID();
// @magina/database carga el .env local sin sobrescribir; se fija el régimen para que la prueba sea determinista.
process.env.REGIMEN_TRIBUTARIO = "NRUS";
const entornoOriginal = { ...process.env };

afterEach(() => {
  for (const clave of ["REGIMEN_TRIBUTARIO", "NUBEFACT_RUTA", "NUBEFACT_TOKEN"]) {
    if (entornoOriginal[clave] === undefined) delete process.env[clave];
    else process.env[clave] = entornoOriginal[clave];
  }
});

function hoyPeru(desplazamientoDias = 0) {
  const fecha = new Date(Date.now() + desplazamientoDias * 86_400_000);
  return fecha.toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
}

async function rechazaCon(promesa: Promise<unknown>, tipo: new (...args: never[]) => Error, mensaje: RegExp) {
  await assert.rejects(promesa, (error: unknown) => {
    assert.ok(error instanceof tipo, `Se esperaba ${tipo.name} y se obtuvo ${String(error)}`);
    assert.match((error as Error).message, mensaje);
    return true;
  });
}

describe("crear venta: validaciones previas a la base de datos", () => {
  const base = () => ({ idempotencyKey: randomUUID(), fecha: hoyPeru(), tipoComprobante: "NOTA_VENTA", medioPago: "EFECTIVO", detalles: [{ tipo: "SERVICIO" }] });

  test("rechaza cuerpos que no son objetos", async () => {
    for (const valor of [null, "texto", [], 5]) await rechazaCon(servicio.crear(valor, usuarioId), BadRequestException, /datos del ingreso no son válidos/);
  });

  test("valida fecha, tipo de comprobante y plazos de envío", async () => {
    await rechazaCon(servicio.crear({ ...base(), fecha: undefined }, usuarioId), BadRequestException, /La fecha es obligatorio/);
    await rechazaCon(servicio.crear({ ...base(), fecha: 20240101 }, usuarioId), BadRequestException, /La fecha no es válido/);
    await rechazaCon(servicio.crear({ ...base(), fecha: "2024-02-30" }, usuarioId), BadRequestException, /Indica una fecha válida/);
    await rechazaCon(servicio.crear({ ...base(), fecha: "01/02/2024" }, usuarioId), BadRequestException, /Indica una fecha válida/);
    await rechazaCon(servicio.crear({ ...base(), tipoComprobante: "TICKET" }, usuarioId), BadRequestException, /boleta, factura o nota de venta/);
    await rechazaCon(servicio.crear({ ...base(), tipoComprobante: "FACTURA" }, usuarioId), BadRequestException, /NRUS no permite emitir facturas/);
    await rechazaCon(servicio.crear({ ...base(), fecha: hoyPeru(3) }, usuarioId), BadRequestException, /no puede ser posterior a hoy/);
    await rechazaCon(servicio.crear({ ...base(), tipoComprobante: "BOLETA", fecha: hoyPeru(-6) }, usuarioId), BadRequestException, /5 días calendario/);
    process.env.REGIMEN_TRIBUTARIO = "GENERAL";
    await rechazaCon(servicio.crear({ ...base(), tipoComprobante: "FACTURA", fecha: hoyPeru(-4) }, usuarioId), BadRequestException, /3 días calendario/);
  });

  test("valida la clave de idempotencia, el medio y la condición de pago", async () => {
    await rechazaCon(servicio.crear({ ...base(), idempotencyKey: undefined }, usuarioId), BadRequestException, /clave de idempotencia es obligatorio/);
    await rechazaCon(servicio.crear({ ...base(), idempotencyKey: "no-es-uuid" }, usuarioId), BadRequestException, /formato válido/);
    await rechazaCon(servicio.crear({ ...base(), medioPago: "CHEQUE" }, usuarioId), BadRequestException, /Selecciona un medio de pago/);
    await rechazaCon(servicio.crear({ ...base(), medioPago: 1 }, usuarioId), BadRequestException, /Selecciona un medio de pago/);
    await rechazaCon(servicio.crear({ ...base(), condicionPago: "CREDITO" }, usuarioId), BadRequestException, /se pagan al contado/);
    await rechazaCon(servicio.crear({ ...base(), importePagoInicial: "abc" }, usuarioId), BadRequestException, /El pago inicial debe tener/);
    await rechazaCon(servicio.crear({ ...base(), importePagoInicial: 5 }, usuarioId), BadRequestException, /pagarse completa al contado/);
    await rechazaCon(servicio.crear({ ...base(), fechaVencimientoPago: hoyPeru() }, usuarioId), BadRequestException, /pagarse completa al contado/);
    await rechazaCon(servicio.crear({ ...base(), cuotasPago: [{ cuota: 1 }] }, usuarioId), BadRequestException, /pagarse completa al contado/);
  });

  test("exige entre 1 y 100 líneas", async () => {
    await rechazaCon(servicio.crear({ ...base(), detalles: [] }, usuarioId), BadRequestException, /entre 1 y 100/);
    await rechazaCon(servicio.crear({ ...base(), detalles: "x" }, usuarioId), BadRequestException, /entre 1 y 100/);
    await rechazaCon(servicio.crear({ ...base(), detalles: Array.from({ length: 101 }, () => ({})) }, usuarioId), BadRequestException, /entre 1 y 100/);
  });

  test("valida los datos del cliente de una nota de venta", async () => {
    await rechazaCon(servicio.crear({ ...base(), clienteId: "123" }, usuarioId), BadRequestException, /Selecciona un cliente válido/);
    await rechazaCon(servicio.crear({ ...base(), clienteTipoDocumento: "DNI", clienteNumeroDocumento: "123" }, usuarioId), BadRequestException, /DNI debe tener 8 dígitos/);
    await rechazaCon(servicio.crear({ ...base(), clienteTipoDocumento: "RUC", clienteNumeroDocumento: "20123456789" }, usuarioId), BadRequestException, /RUC debe tener 11 dígitos/);
    await rechazaCon(servicio.crear({ ...base(), clienteTipoDocumento: "CE" }, usuarioId), BadRequestException, /Completa juntos/);
    await rechazaCon(servicio.crear({ ...base(), clienteNumeroDocumento: "X1234" }, usuarioId), BadRequestException, /Completa juntos/);
    await rechazaCon(servicio.crear({ ...base(), clienteNombre: "x".repeat(181) }, usuarioId), BadRequestException, /El cliente no es válido/);
    await rechazaCon(servicio.crear(base(), usuarioId), BadRequestException, /Selecciona el cliente que recibe/);
  });
});

describe("órdenes de servicio y cotizaciones: validaciones de entrada", () => {
  test("rechaza cuerpos inválidos y clientes con formato incorrecto", async () => {
    await rechazaCon(servicio.crearOrdenServicio(null, usuarioId), BadRequestException, /Completa los datos de la orden/);
    await rechazaCon(servicio.crearOrdenServicio([], usuarioId), BadRequestException, /Completa los datos de la orden/);
    await rechazaCon(servicio.crearOrdenServicio({ clienteId: "x" }, usuarioId), BadRequestException, /Selecciona un cliente para la orden/);
    await rechazaCon(servicio.actualizarOrdenServicio(randomUUID(), "x", usuarioId), BadRequestException, /actualización no son válidos/);
    await rechazaCon(servicio.emitirOrdenServicio(randomUUID(), null, usuarioId), BadRequestException, /Elige el comprobante/);
    await rechazaCon(servicio.crearCotizacion(undefined, usuarioId), BadRequestException, /Completa la cotización/);
    await rechazaCon(servicio.crearCotizacion({ clienteId: "abc" }, usuarioId), BadRequestException, /cliente seleccionado no es valido/);
    await rechazaCon(servicio.actualizarCotizacion(randomUUID(), []), BadRequestException, /actualización no son válidos/);
    await rechazaCon(servicio.convertirCotizacion(randomUUID(), 1, usuarioId), BadRequestException, /Elige el comprobante de la venta/);
  });

  test("valida estados permitidos de una cotización", async () => {
    for (const valor of [null, [], { estado: "CONVERTIDA" }, { estado: "BORRADOR" }]) {
      await rechazaCon(servicio.cambiarEstadoCotizacion(randomUUID(), valor), BadRequestException, /estado válido para la cotización/);
    }
  });

  test("valida cada línea de una cotización antes de numerarla", async () => {
    const crear = (detalles: unknown) => servicio.crearCotizacion({ detalles }, usuarioId);
    const servicioValido = { tipo: "SERVICIO", descripcion: "Cambio de aceite", cantidad: 1, precioUnitario: 20 };
    await rechazaCon(crear(undefined), BadRequestException, /Agrega entre 1 y 100 líneas/);
    await rechazaCon(crear([]), BadRequestException, /Agrega entre 1 y 100 líneas/);
    await rechazaCon(crear(Array.from({ length: 101 }, () => servicioValido)), BadRequestException, /Agrega entre 1 y 100 líneas/);
    await rechazaCon(crear([null]), BadRequestException, /La línea 1 no es válida/);
    await rechazaCon(crear([[]]), BadRequestException, /La línea 1 no es válida/);
    await rechazaCon(crear([{ tipo: "MOTOTAXI" }]), BadRequestException, /repuesto o un trabajo/);
    await rechazaCon(crear([{ tipo: "PRODUCTO", presentacionId: "x" }]), BadRequestException, /presentación del repuesto en la línea 1/);
    await rechazaCon(crear([{ tipo: "SERVICIO", descripcion: "  " }]), BadRequestException, /descripción de la línea 1 no es válido/);
    await rechazaCon(crear([{ tipo: "SERVICIO" }]), BadRequestException, /descripción de la línea 1 es obligatorio/);
    await rechazaCon(crear([{ tipo: "PRODUCTO", presentacionId: randomUUID(), nombreVisible: 5 }]), BadRequestException, /nombre del repuesto en la línea 1/);
    await rechazaCon(crear([{ ...servicioValido, cantidad: 0 }]), BadRequestException, /cantidad de la línea 1 debe tener hasta 3 decimales y ser mayor que cero/);
    await rechazaCon(crear([{ ...servicioValido, cantidad: 1.0001 }]), BadRequestException, /cantidad de la línea 1/);
    await rechazaCon(crear([{ ...servicioValido, precioUnitario: -1 }]), BadRequestException, /precio de la línea 1 debe tener hasta 4 decimales y ser mayor que o igual a cero/);
    await rechazaCon(crear([{ ...servicioValido, precioUnitario: "" }]), BadRequestException, /precio de la línea 1/);
    await rechazaCon(crear([{ ...servicioValido, descuento: "x" }]), BadRequestException, /descuento de la línea 1 debe/);
    await rechazaCon(crear([{ ...servicioValido, descuento: 25 }]), BadRequestException, /supera su importe/);
    await rechazaCon(crear([{ ...servicioValido, afectacionIgv: "EXPORTACION" }]), BadRequestException, /afectación de IGV de la línea 1/);
  });
});

describe("guías de remisión: validaciones sin base de datos", () => {
  test("rechaza tipos y cuerpos no admitidos", async () => {
    await rechazaCon(servicio.emitirGuia(null, usuarioId), BadRequestException, /Completa los datos de la guía/);
    await rechazaCon(servicio.emitirGuia({ tipo: "TRANSPORTISTA" }, usuarioId), BadRequestException, /solo emite guías de remisión de remitente/);
    await rechazaCon(servicio.emitirGuia({}, usuarioId), BadRequestException, /Selecciona guía de remisión de remitente/);
    await rechazaCon(servicio.consultarGuia("no-uuid"), BadRequestException, /La guía no es válida/);
    await rechazaCon(servicio.obtenerDocumentoParaGuia("no-uuid"), BadRequestException, /comprobante válido/);
    await rechazaCon(servicio.buscarDocumentosParaGuia("", "GUIA"), BadRequestException, /tipo de documento válido/);
  });

  test("una búsqueda de un solo carácter no consulta documentos", async () => {
    assert.deepEqual(await servicio.buscarDocumentosParaGuia(" a "), []);
  });
});

describe("comprobantes electrónicos: identificadores y cuerpos inválidos", () => {
  test("rechaza identificadores que no son UUID", async () => {
    await rechazaCon(servicio.anularIngreso("x", {}, usuarioId), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.anularIngreso(randomUUID(), null, usuarioId), BadRequestException, /motivo de la anulación/);
    await rechazaCon(servicio.consultarAnulacionIngreso("x", usuarioId), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.anularNota(randomUUID(), "x", {}, usuarioId), BadRequestException, /identificadores del comprobante/);
    await rechazaCon(servicio.anularNota(randomUUID(), randomUUID(), [], usuarioId), BadRequestException, /motivo de la anulación/);
    await rechazaCon(servicio.consultarAnulacionNota("x", randomUUID()), BadRequestException, /identificadores del comprobante/);
    await rechazaCon(servicio.reintentarEmision("x"), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.consultarEstadoComprobante("x"), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.obtenerFuenteNota("x"), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.listarNotas("x"), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.listarPagos("x"), BadRequestException, /comprobante no es válido/);
  });

  test("el listado exige tipo de venta y un estado conocido", async () => {
    await rechazaCon(servicio.listarVentas({}), BadRequestException, /repuestos o de mototaxis/);
    await rechazaCon(servicio.listarVentas({ tipoVenta: "REPUESTOS", estado: "BORRADOR" }), BadRequestException, /estado de venta válido/);
  });
});

describe("pagos de ventas: validaciones de entrada", () => {
  const pago = () => ({ idempotencyKey: randomUUID(), fechaPago: hoyPeru(), importeAplicado: "10.00", medioPago: "EFECTIVO" });

  test("valida cuerpo, clave, fecha, importe, medio y cuenta", async () => {
    const id = randomUUID();
    await rechazaCon(servicio.registrarPago("x", pago(), usuarioId), BadRequestException, /comprobante no es válido/);
    await rechazaCon(servicio.registrarPago(id, null, usuarioId), BadRequestException, /datos del pago no son válidos/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), idempotencyKey: undefined }, usuarioId), BadRequestException, /clave de pago es obligatorio/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), idempotencyKey: "clave" }, usuarioId), BadRequestException, /clave de pago no es válida/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), fechaPago: "2024-13-01" }, usuarioId), BadRequestException, /fecha real y no futura/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), fechaPago: hoyPeru(2) }, usuarioId), BadRequestException, /fecha real y no futura/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), importeAplicado: 0 }, usuarioId), BadRequestException, /importe aplicado/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), medioPago: "CHEQUE" }, usuarioId), BadRequestException, /medio de pago válido/);
    await rechazaCon(servicio.registrarPago(id, pago(), usuarioId), BadRequestException, /Selecciona la cuenta o caja/);
    await rechazaCon(servicio.registrarPago(id, { ...pago(), cuentaFinancieraId: "caja" }, usuarioId), BadRequestException, /cuenta financiera no es válida/);
  });
});

describe("clientes: validaciones de registro y actualización", () => {
  const natural = { tipoDocumento: "DNI", numeroDocumento: "12345678", nombres: "Ana", apellidoPaterno: "Pérez" };

  test("valida tipo y número de documento", async () => {
    await rechazaCon(servicio.registrarCliente(null), BadRequestException, /datos del cliente no son válidos/);
    await rechazaCon(servicio.registrarCliente({}), BadRequestException, /tipo de documento es obligatorio/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "LIBRETA", numeroDocumento: "1" }), BadRequestException, /Selecciona DNI, RUC/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "DNI" }), BadRequestException, /número de documento es obligatorio/);
    await rechazaCon(servicio.registrarCliente({ ...natural, numeroDocumento: "1234567" }), BadRequestException, /DNI debe tener 8 dígitos/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: "20123456789" }), BadRequestException, /dígito verificador/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "CE", numeroDocumento: "12" }), BadRequestException, /carné de extranjería/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "PASAPORTE", numeroDocumento: "A#1" }), BadRequestException, /número de pasaporte/);
  });

  test("valida el tipo de persona y los nombres obligatorios", async () => {
    await rechazaCon(servicio.registrarCliente({ ...natural, tipoPersona: "EMPRESA" }), BadRequestException, /persona natural o empresa/);
    await rechazaCon(servicio.registrarCliente({ ...natural, tipoPersona: "JURIDICA" }), BadRequestException, /RUC de persona jurídica/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: "20100070970", tipoPersona: "NATURAL" }), BadRequestException, /Regístrala como empresa/);
    await rechazaCon(servicio.registrarCliente({ tipoDocumento: "RUC", numeroDocumento: "20100070970" }), BadRequestException, /razón social es obligatorio/);
    await rechazaCon(servicio.registrarCliente({ ...natural, nombres: undefined }), BadRequestException, /Los nombres es obligatorio/);
    await rechazaCon(servicio.registrarCliente({ ...natural, apellidoPaterno: "" }), BadRequestException, /apellido paterno es obligatorio/);
  });

  test("valida fecha de nacimiento, correo, teléfono y longitudes", async () => {
    await rechazaCon(servicio.registrarCliente({ ...natural, fechaNacimiento: "1990-02-31" }), BadRequestException, /fecha de nacimiento válida/);
    await rechazaCon(servicio.registrarCliente({ ...natural, fechaNacimiento: "31/01/1990" }), BadRequestException, /fecha de nacimiento válida/);
    await rechazaCon(servicio.registrarCliente({ ...natural, fechaNacimiento: hoyPeru(400) }), BadRequestException, /fecha de nacimiento válida/);
    await rechazaCon(servicio.registrarCliente({ ...natural, correo: "sin-arroba" }), BadRequestException, /correo válido/);
    await rechazaCon(servicio.registrarCliente({ ...natural, telefono: "abc" }), BadRequestException, /teléfono válido/);
    await rechazaCon(servicio.registrarCliente({ ...natural, direccion: "x".repeat(241) }), BadRequestException, /La dirección no es válido/);
  });

  test("valida la actualización de contacto", async () => {
    await rechazaCon(servicio.actualizarCliente("x", {}), BadRequestException, /cliente válido/);
    await rechazaCon(servicio.actualizarCliente(randomUUID(), "x"), BadRequestException, /datos del cliente no son válidos/);
    await rechazaCon(servicio.actualizarCliente(randomUUID(), { correo: "a@b" }), BadRequestException, /correo válido/);
    await rechazaCon(servicio.actualizarCliente(randomUUID(), { telefono: "12" }), BadRequestException, /teléfono válido/);
    await rechazaCon(servicio.actualizarCliente(randomUUID(), { observacion: 7 }), BadRequestException, /nota interna no es válido/);
  });

  test("la consulta de identidad solo admite DNI y RUC", async () => {
    await rechazaCon(servicio.consultarIdentidadCliente("CE", "123456"), BadRequestException, /DNI y RUC/);
  });
});

describe("búsquedas cortas y series", () => {
  test("las búsquedas demasiado cortas devuelven una lista vacía sin consultar", async () => {
    assert.deepEqual(await servicio.buscarProductos("abc"), []);
    assert.deepEqual(await servicio.buscarProductos(undefined), []);
    assert.deepEqual(await servicio.buscarMototaxisVenta(" a "), []);
    assert.deepEqual(await servicio.buscarMototaxisVenta(undefined), []);
  });

  test("valida la configuración de series antes de guardarla", async () => {
    await rechazaCon(servicio.guardarSerieConfigurada(null), BadRequestException, /Datos de serie inválidos/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: "B001", ultimoNumero: -1 }), BadRequestException, /entero entre 0/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: "B001", ultimoNumero: 1.5 }), BadRequestException, /entero entre 0/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: "B001", ultimoNumero: 100_000_000 }), BadRequestException, /entero entre 0/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "GUIA_TRANSPORTISTA", serie: "V001" }), BadRequestException, /guía de remisión de remitente/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "BOLETA", serie: "F001" }), BadRequestException, /formato esperado/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "GUIA_REMITENTE", serie: "B001" }), BadRequestException, /formato esperado/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "NOTA_VENTA", serie: "NV-01" }), BadRequestException, /formato esperado/);
    await rechazaCon(servicio.guardarSerieConfigurada({ tipoComprobante: "DESCONOCIDO", serie: "X001" }), BadRequestException, /formato esperado/);
    await rechazaCon(servicio.guardarSerieConfigurada({}), BadRequestException, /formato esperado/);
  });
});

describe("reglas de reintento de emisión", () => {
  const rechazo = { aceptada_por_sunat: false, sunat_responsecode: "2335", sunat_description: "El documento no coincide" };

  test("solo admite boletas o facturas rechazadas dentro del plazo", () => {
    assert.throws(() => validarElegibilidadReintento({ tipoComprobante: "NOTA_VENTA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: rechazo, fechaHoy: "2026-01-01" }), BadRequestException);
    assert.throws(() => validarElegibilidadReintento({ tipoComprobante: "BOLETA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: { aceptada_por_sunat: true }, fechaHoy: "2026-01-01" }), ConflictException);
    assert.throws(() => validarElegibilidadReintento({ tipoComprobante: "BOLETA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: rechazo, fechaHoy: "2026-01-07" }), /plazo de envío de esta boleta venció/);
    assert.throws(() => validarElegibilidadReintento({ tipoComprobante: "FACTURA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: rechazo, fechaHoy: "2026-01-05" }), /plazo de envío de esta factura venció/);
    assert.doesNotThrow(() => validarElegibilidadReintento({ tipoComprobante: "BOLETA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: rechazo, fechaHoy: "2026-01-06" }));
    assert.doesNotThrow(() => validarElegibilidadReintento({ tipoComprobante: "FACTURA", fecha: "2026-01-01", estado: "ERROR_NUBEFACT", datos: {}, respuesta: rechazo, fechaHoy: "2026-01-04" }));
  });

  test("interpreta estados remotos, tickets y errores de emisión", () => {
    assert.equal(analizarEstadoComprobante("EMITIDO", {}, { estado: "Rechazado por SUNAT" }).estadoProveedor, "RECHAZADO_SUNAT");
    assert.equal(analizarEstadoComprobante("EMITIDO", {}, { sunat_ticket_numero: 123 }).estadoProveedor, "EN_PROCESO");
    assert.equal(analizarEstadoComprobante("ERROR", {}, {}).estadoProveedor, "ERROR_EMISION");
    assert.equal(analizarEstadoComprobante("EMITIDO", {}, {}).estadoProveedor, "EMITIDO");
  });
});
