import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { validarConfiguracionEntorno } from "./configuracion-entorno";
import { ContextoPostgres, dniAleatorio, fechaHoyPeru, rucAleatorio, sumarDias } from "./pruebas/contexto-postgres";
import { ServicioAlmacenamiento } from "./modulos/almacenamiento/almacenamiento.service";
import { ServicioEgresos } from "./modulos/egresos/egresos.service";
import { ServicioFinanzas } from "./modulos/finanzas/finanzas.service";
import { ServicioConductores } from "./modulos/personas/conductores.service";
import { ServicioTransportistas } from "./modulos/personas/transportistas.service";
import { ServicioMetas } from "./modulos/reportes/metas.service";
import { ServicioReportes } from "./modulos/reportes/reportes.service";

let contexto: ContextoPostgres;
let usuarioId: string;
let cuentaId: string;
const hoy = fechaHoyPeru();
const esBadRequest = (patron?: RegExp) => (error: unknown) => error instanceof BadRequestException && (!patron || patron.test(error.message));
const esDuplicado = (error: unknown) => error instanceof ConflictException;

before(async () => {
  contexto = await ContextoPostgres.crear();
  usuarioId = (await contexto.crearUsuario([])).id;
  cuentaId = await contexto.crearCuenta(usuarioId, { saldoInicial: "100.00", fechaSaldoInicial: sumarDias(hoy, -2) });
});
after(async () => { if (contexto) await contexto.cerrar(); });

describe("egresos", () => {
  const servicio = new ServicioEgresos();
  const datos = (extra: Record<string, unknown> = {}) => ({
    tipo: "MOTOTAXI", fecha: hoy, categoria: "Compra", concepto: `Egreso ${contexto.sufijo}`, beneficiario: "Proveedor", monto: "200",
    mototaxiMarca: "Marca", mototaxiModelo: "Modelo", mototaxiNumeroMotor: `m-${randomUUID()}`, mototaxiNumeroChasis: `c-${randomUUID()}`, ...extra,
  });

  test("registra egresos con pago inicial y evita duplicados de motor y factura", async () => {
    await assert.rejects(servicio.crear(datos({ importePagoInicial: 50 }), usuarioId), esBadRequest(/medio de pago/));
    await assert.rejects(servicio.crear(datos({ proveedorRuc: "20000000002" }), usuarioId), esBadRequest(/RUC del proveedor/));
    await assert.rejects(servicio.crear(datos({ categoria: 5 }), usuarioId), esBadRequest(/no es válido/));
    const ruc = rucAleatorio("20");
    const egreso = await servicio.crear(datos({ importePagoInicial: "50", medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId, proveedorRuc: ruc, documentoTipo: "FACTURA", documentoNumero: "f1-9", moneda: "", observacion: "Obs" }), usuarioId);
    assert.deepEqual([egreso.documentoNumero, egreso.moneda, egreso.medioPago], ["F1-9", "PEN", "EFECTIVO"]);
    await assert.rejects(servicio.crear(datos({ mototaxiNumeroMotor: egreso.mototaxiNumeroMotor }), usuarioId), ConflictException);
    await assert.rejects(servicio.crear(datos({ proveedorRuc: ruc, documentoTipo: "FACTURA", documentoNumero: "F1-9" }), usuarioId), ConflictException);

    const listado = await servicio.listar({ tipo: "MOTOTAXI", busqueda: contexto.sufijo });
    const item = listado.items.find((fila) => fila.id === egreso.id)!;
    assert.deepEqual([item.importePagadoAcumulado, item.saldoPendiente, item.pagos.length], ["50.00", "150.00", 1]);

    const pago = { fechaPago: hoy, importePagado: 100, medioPago: "EFECTIVO", cuentaFinancieraId: cuentaId, claveIdempotencia: randomUUID() };
    await assert.rejects(servicio.registrarPago(randomUUID(), pago, usuarioId), NotFoundException);
    await assert.rejects(servicio.registrarPago(egreso.id, { ...pago, claveIdempotencia: "x" }, usuarioId), esBadRequest(/idempotencia/));
    await assert.rejects(servicio.registrarPago(egreso.id, { ...pago, importePagado: 500 }, usuarioId), esBadRequest(/supera el saldo/));
    await assert.rejects(servicio.registrarPago(egreso.id, { ...pago, fechaPago: sumarDias(hoy, -1) }, usuarioId), esBadRequest(/anterior al egreso/));
    const registrado = await servicio.registrarPago(egreso.id, pago, usuarioId);
    assert.equal(registrado.importePagado, "100.00");
    assert.equal((await servicio.registrarPago(egreso.id, pago, usuarioId)).id, registrado.id);
    await assert.rejects(servicio.registrarPago(egreso.id, { ...pago, importePagado: 1 }, usuarioId), ConflictException);
  });
});

describe("finanzas", () => {
  const servicio = new ServicioFinanzas();

  test("crea, actualiza y cambia el estado de cuentas", async () => {
    const cuenta = await servicio.crear({ tipo: "BANCO", nombre: "Banco QA", entidad: "Banco", numeroCuenta: "123456789", saldoInicial: 10, fechaSaldoInicial: hoy }, usuarioId);
    await assert.rejects(servicio.actualizar("x", {}), BadRequestException);
    await assert.rejects(servicio.actualizar(randomUUID(), { tipo: "EFECTIVO", nombre: "Caja" }), NotFoundException);
    await assert.rejects(servicio.actualizar(cuenta.id, { tipo: "BANCO", nombre: "Banco QA", entidad: "Banco", cci: "1", moneda: "USD", saldoInicial: 5, fechaSaldoInicial: hoy }), esBadRequest(/cambiar la moneda/));
    assert.equal((await servicio.actualizar(cuenta.id, { tipo: "BANCO", nombre: "Banco QA", entidad: "Banco", cci: "1", moneda: "USD" })).moneda, "USD");
    await assert.rejects(servicio.cambiarEstado(cuenta.id, { activa: 1 }), BadRequestException);
    await assert.rejects(servicio.cambiarEstado(randomUUID(), { activa: true }), NotFoundException);
    assert.equal((await servicio.cambiarEstado(cuenta.id, { activa: false })).activa, false);
    assert.equal((await servicio.opciones()).some((item) => item.id === cuenta.id), false);
    for (const entrada of [{ tipo: "EFECTIVO", nombre: "Caja", saldoInicial: true, fechaSaldoInicial: hoy }, { tipo: "EFECTIVO", nombre: "Caja", saldoInicial: 1, fechaSaldoInicial: 20260101 },
      { tipo: "EFECTIVO", nombre: "Caja", saldoInicial: 1, fechaSaldoInicial: "2999-01-01" }, { tipo: "EFECTIVO", nombre: 5 }, { tipo: "TARJETA", nombre: "T", entidad: "B" },
      { tipo: "BILLETERA", nombre: "B" }]) {
      await assert.rejects(servicio.crear(entrada, usuarioId), BadRequestException);
    }
  });

  test("resume, concilia y lista movimientos por periodo y cuenta", async () => {
    const cuenta = await contexto.crearCuenta(usuarioId, { saldoInicial: "50.00", fechaSaldoInicial: sumarDias(hoy, -1), numeroCuenta: "987654321" });
    await contexto.crearCuenta(usuarioId, { moneda: "USD", saldoInicial: "1.00", fechaSaldoInicial: hoy });
    await contexto.crearVenta(usuarioId, { total: "30.00", cuentaFinancieraId: cuenta });
    const resumen = await servicio.resumenDelMes();
    const item = resumen.items.find((fila) => fila.id === cuenta)!;
    assert.deepEqual([item.ingresosMes, item.identificador], ["30.00", "•••• 4321"]);
    assert.ok(["CONCILIADO", "MOVIMIENTOS_SIN_CUENTA"].includes(item.saldoEstado));
    if (item.saldoEstado === "CONCILIADO") assert.equal(item.saldoActual, "80.00");
    assert.ok(resumen.items.some((fila) => fila.saldoEstado === "MONEDA_NO_COMPATIBLE"));
    for (const periodo of ["DIA", "SEMANA", "MES"]) assert.equal((await servicio.flujoPorPeriodo(periodo)).hasta, hoy);
    await assert.rejects(servicio.flujoPorPeriodo("ANIO"), BadRequestException);
    const composicion = await servicio.composicionDeCaja({ desde: hoy, hasta: hoy });
    assert.ok(composicion.items.some((fila) => fila.concepto === "COBRANZA"));
    const dia = await servicio.movimientosPorPeriodo("DIA", hoy, cuenta, "1", "5");
    assert.deepEqual([dia.totalMovimientos, dia.movimientos[0]?.importe, dia.totalesPorMoneda.PEN !== undefined], [1, "30.00", true]);
    assert.equal((await servicio.movimientosPorPeriodo("MES", hoy.slice(0, 7))).hasta.slice(0, 7), hoy.slice(0, 7));
    assert.equal((await servicio.movimientosPorPeriodo("ANIO", hoy.slice(0, 4))).desde, `${hoy.slice(0, 4)}-01-01`);
    for (const [periodo, fecha, cuentaFiltro] of [["MES", "2026-13"], ["ANIO", "1800"], ["SEMANA", hoy], ["DIA", hoy, "x"]] as const) {
      await assert.rejects(servicio.movimientosPorPeriodo(periodo, fecha, cuentaFiltro), BadRequestException);
    }
  });
});

describe("personas", () => {
  const conductores = new ServicioConductores();
  const transportistas = new ServicioTransportistas();

  test("registra conductores, reutiliza personas y actualiza la licencia", async () => {
    for (const [entrada, patron] of [[null, /no son válidos/], [{ tipoDocumento: "RUC" }, /DNI, carné/], [{ tipoDocumento: "DNI", numeroDocumento: "1" }, /8 dígitos/],
      [{ tipoDocumento: "CE", numeroDocumento: "1" }, /extranjería/], [{ tipoDocumento: "PASAPORTE", numeroDocumento: "1" }, /pasaporte/],
      [{ tipoDocumento: "DNI", numeroDocumento: dniAleatorio(), nombres: "A", apellidoPaterno: "B", numeroLicencia: "x".repeat(11) }, /máximo/]] as const) {
      await assert.rejects(conductores.crear(entrada), esBadRequest(patron));
    }
    const licencia = `Q${randomUUID().slice(0, 8)}`;
    const nuevo = await conductores.crear({ tipoDocumento: "CE", numeroDocumento: `CE${randomUUID().slice(0, 6)}`, nombres: "Ana", apellidoPaterno: "Ruiz", numeroLicencia: licencia, telefono: "999" });
    contexto.personas.push(nuevo.id);
    assert.equal(nuevo.numeroLicencia, licencia.toUpperCase());
    const persona = await contexto.crearPersonaNatural();
    const reutilizado = await conductores.crear({ tipoDocumento: "DNI", numeroDocumento: persona.numeroDocumento, nombres: "X", apellidoPaterno: "Y", numeroLicencia: `R${randomUUID().slice(0, 8)}` });
    assert.deepEqual([reutilizado.id, reutilizado.nombres], [persona.id, `QA ${contexto.sufijo}`]);
    await assert.rejects(conductores.crear({ tipoDocumento: "DNI", numeroDocumento: persona.numeroDocumento, nombres: "X", apellidoPaterno: "Y", numeroLicencia: "Z1" }), ConflictException);
    await assert.rejects(conductores.crear({ tipoDocumento: "PASAPORTE", numeroDocumento: `P${randomUUID().slice(0, 6)}`, nombres: "X", apellidoPaterno: "Y", numeroLicencia: licencia }), esDuplicado);
    await assert.rejects(conductores.actualizar("x", {}), BadRequestException);
    await assert.rejects(conductores.actualizar(reutilizado.id, { numeroLicencia: licencia }), ConflictException);
    assert.equal((await conductores.actualizar(nuevo.id, { numeroLicencia: "nueva1", telefono: "" })).telefono, null);
    const listado = await conductores.listar(" Ruiz ");
    assert.equal(listado.find((fila) => fila.id === nuevo.id)?.tipoDocumento, "CE");
    assert.ok((await conductores.listar()).length >= 2);
    const pagina = await conductores.listarPaginado("x", "500", "Ruiz");
    assert.deepEqual([pagina.pagina, pagina.porPagina], [1, 50]);
    assert.equal((await conductores.listarPaginado()).porPagina, 12);
  });

  test("registra transportistas jurídicos y rechaza RUC inconsistentes", async () => {
    await assert.rejects(transportistas.crear(null), BadRequestException);
    await assert.rejects(transportistas.crear({ numeroDocumento: "123" }), esBadRequest(/RUC válido/));
    await assert.rejects(transportistas.crear({ numeroDocumento: rucAleatorio("20") }), esBadRequest(/razón social/));
    const ruc = rucAleatorio("20");
    const creado = await transportistas.crear({ numeroDocumento: ruc, razonSocial: `Transportes ${contexto.sufijo}` });
    contexto.personas.push(creado.id);
    await assert.rejects(transportistas.crear({ numeroDocumento: ruc, razonSocial: "Otra" }), ConflictException);
    const [persona] = await contexto.sql.unsafe<{ id: string }[]>("INSERT INTO personas (tipo_persona_id, tipo_documento_id, numero_documento, razon_social) VALUES ($1, $2, $3, 'Existente QA') RETURNING id",
      [await contexto.idCatalogo("tipos_persona", "JURIDICA"), await contexto.idCatalogo("tipos_documento", "06"), rucAleatorio("20")]);
    contexto.personas.push(persona.id);
    const [{ numero_documento: rucExistente }] = await contexto.sql.unsafe<{ numero_documento: string }[]>("SELECT numero_documento FROM personas WHERE id = $1", [persona.id]);
    assert.equal((await transportistas.crear({ numeroDocumento: rucExistente, razonSocial: "Ignorada" })).razonSocial, "Existente QA");
    const [natural] = await contexto.sql.unsafe<{ id: string }[]>("INSERT INTO personas (tipo_persona_id, tipo_documento_id, numero_documento, nombres, apellido_paterno) VALUES ($1, $2, $3, 'Nat', 'Ural') RETURNING id",
      [await contexto.idCatalogo("tipos_persona", "NATURAL"), await contexto.idCatalogo("tipos_documento", "06"), rucAleatorio("10")]);
    contexto.personas.push(natural.id);
    const [{ numero_documento: rucNatural }] = await contexto.sql.unsafe<{ numero_documento: string }[]>("SELECT numero_documento FROM personas WHERE id = $1", [natural.id]);
    await assert.rejects(transportistas.crear({ numeroDocumento: rucNatural, razonSocial: "X" }), ConflictException);
    assert.equal((await transportistas.listar(ruc))[0]?.tipoDocumento, "RUC");
    assert.ok((await transportistas.listar()).length >= 2);
  });
});

describe("almacenamiento", () => {
  const servicio = new ServicioAlmacenamiento();

  test("archiva documentos de NubeFact con hosts permitidos y reporta errores por documento", async () => {
    const entidadId = randomUUID();
    const original = globalThis.fetch;
    let llamadas = 0;
    globalThis.fetch = (async (url: URL) => {
      llamadas += 1;
      if (String(url).includes("xml")) return new Response("fallo", { status: 500 });
      return new Response(Buffer.from("%PDF"), { headers: { "content-type": "application/pdf; charset=binary" } });
    }) as typeof fetch;
    try {
      const datos = { enlace_del_pdf: "https://api.nubefact.com/doc.pdf", enlace_del_xml: "https://api.nubefact.com/doc.xml", enlace_del_cdr: "http://malicioso.example/cdr" };
      const resultado = await servicio.archivarDocumentosNubeFact("INGRESO", entidadId, "BOLETA", "B001-1", datos);
      contexto.archivos.push(...resultado.guardados.map((item) => item.id));
      assert.deepEqual(resultado.guardados.map((item) => item.tipo), ["PDF"]);
      assert.deepEqual(resultado.errores.map((item) => item.tipo), ["XML", "CDR"]);
      const repetido = await servicio.archivarDocumentosNubeFact("INGRESO", entidadId, "BOLETA_ANULACION", "B001-1", { enlace_del_pdf: datos.enlace_del_pdf, enlace_del_xml: " " });
      contexto.archivos.push(...repetido.guardados.map((item) => item.id));
      assert.equal((await servicio.archivarDocumentosNubeFact("INGRESO", entidadId, "BOLETA", "B001-1", { enlace_del_pdf: datos.enlace_del_pdf })).guardados[0].id, resultado.guardados[0].id);
      assert.equal(llamadas, 3);
      const descarga = await servicio.descargarArchivoRegistrado(resultado.guardados[0].id);
      assert.deepEqual([descarga.mime, descarga.contenido.toString()], ["application/pdf", "%PDF"]);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("genera la nota de venta HTML escapada, descarga y elimina archivos", async () => {
    const archivo = await servicio.archivarDocumentoNotaVenta({ id: randomUUID(), codigo: "NV-<1>", fecha: hoy, clienteNombre: null, clienteNumeroDocumento: null, clienteDireccion: "Jr. \"A\" & 'B'",
      medioPago: "EFECTIVO", total: "10.00", subtotal: "8.47", igv: "1.53", detalles: [{ descripcion: "<b>Item</b>", cantidad: "1", precioUnitario: "10.00", total: "10.00" }] });
    contexto.archivos.push(archivo.id);
    const html = (await servicio.descargarArchivoRegistrado(archivo.id)).contenido.toString();
    assert.ok(html.includes("NV-&lt;1&gt;") && html.includes("&lt;b&gt;Item") && html.includes("&quot;A&quot; &amp; &#39;B&#39;") && html.includes("Cliente no especificado"));
    await assert.rejects(servicio.descargarArchivoRegistrado(randomUUID()), NotFoundException);
    await unlink(resolve(validarConfiguracionEntorno().carpetaSubidas, archivo.rutaRelativa));
    await assert.rejects(servicio.descargarArchivoRegistrado(archivo.id), /almacenado/);
    assert.equal(await servicio.eliminarArchivoRegistrado(archivo.id), true);
    assert.equal(await servicio.eliminarArchivoRegistrado(archivo.id), false);
    const sinExtension = await servicio.guardarArchivo("X", "Y", "Ent Tipo", randomUUID(), "archivo", "", Buffer.from("x"));
    contexto.archivos.push(sinExtension.id);
    assert.deepEqual([sinExtension.mimeType, sinExtension.rutaRelativa.startsWith("documentos/ent-tipo/"), sinExtension.rutaRelativa.endsWith(".bin")], ["application/octet-stream", true, true]);
    await assert.rejects(servicio.guardarArchivo("X", "Y", "Z", "../../../fuera", "a.txt", "text/plain", Buffer.from("x")), BadRequestException);
  });
});

describe("reportes y metas", () => {
  const reportes = new ServicioReportes();
  const metas = new ServicioMetas();

  test("el reporte de ingresos suma ventas y notas por línea y documento", async () => {
    const fecha = "2025-03-10";
    const venta = await contexto.crearVenta(usuarioId, { fecha, total: "118.00", detalles: [{ tipo: "SERVICIO" }] });
    await contexto.crearVenta(usuarioId, { fecha, tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO", total: "50.00" });
    for (const [tipo, motivo, total] of [["NOTA_CREDITO", 1, "18.00"], ["NOTA_DEBITO", 2, "5.00"]] as const) {
      const [nota] = await contexto.sql.unsafe<{ id: string }[]>(`INSERT INTO comprobantes_relacionados (ingreso_origen_id, tipo_comprobante, codigo_motivo, motivo, fecha, serie, numero, subtotal, igv, total, estado, usuario_id, datos_nubefact)
        VALUES ($1, $2, $3, 'QA', $4, 'BQA9', $5, 0, 0, $6, 'EMITIDO', $7, $8::jsonb) RETURNING id`, [venta.ingresoId, tipo, motivo, fecha, Math.floor(Math.random() * 1e6), total, usuarioId, JSON.stringify({ lineasOrigen: [{ ingresoDetalleId: venta.detalles[0], montoAjuste: total }] })]);
      await contexto.sql.unsafe("INSERT INTO comprobantes_relacionados_detalle (comprobante_relacionado_id, ingreso_detalle_id, cantidad) VALUES ($1, $2, 1)", [nota.id, venta.detalles[0]]);
    }
    const rango = { desde: "2025-02-01", hasta: "2025-03-31" };
    const todas = await reportes.reporteIngresos(rango);
    assert.equal(todas.porMes.length, 2);
    const porTipo = Object.fromEntries(todas.porDocumento.map((fila) => [fila.tipo, fila.total]));
    assert.equal(porTipo.NOTA_CREDITO.startsWith("-"), true);
    const servicios = await reportes.reporteIngresos(rango, "SERVICIO");
    assert.equal(servicios.linea, "SERVICIO");
    assert.ok(Number(servicios.resumen.totalNeto) >= 118 - 18 + 5);
    const vacio = await reportes.reporteIngresos({ desde: "1990-01-01", hasta: "1990-01-31" }, "MOTOTAXI");
    assert.deepEqual([vacio.resumen.ticketPromedio, vacio.porMes[0].total], ["0.00", "0.00"]);
    assert.ok((await reportes.ingresosComparativo(rango)).dias.some((dia) => dia.fecha === fecha));
    assert.equal((await reportes.rentabilidad(rango, ["INVENTARIO.LEER"])).rango, rango);
    assert.ok((await reportes.horarios(rango)).ventasVigentes >= 2);
    // 118 + 50 de ventas, netos de la nota de crédito (18) y la de débito (5).
    assert.ok(Number((await reportes.cobranza(rango)).facturado) >= 155);
    assert.ok((await reportes.articulosMasVendidos(rango)).articulos.length >= 1);
    assert.ok((await reportes.ingresosDashboard(rango, rango)).anual.flujoPorComprobante.length >= 1);
  });

  test("inventario y resumen gerencial respetan permisos", async () => {
    const categoriaId = await contexto.crearCategoria();
    const marcaId = await contexto.crearMarca("AMBOS");
    await contexto.crearProducto({ categoriaId, marcaId, stock: 0 });
    const sinMototaxis = await reportes.inventario({ desde: hoy, hasta: hoy });
    assert.equal("mototaxis" in sinMototaxis, false);
    assert.ok(sinMototaxis.resumen.sinStock >= 1);
    const [modelo] = await contexto.sql.unsafe<{ id: string }[]>("INSERT INTO modelos_mototaxis (codigo, marca_id, nombre, version, stock_disponible) VALUES ($1, $2, 'Modelo rep', 'V1', 2) RETURNING id", [`MQ-${randomUUID().slice(0, 8)}`, marcaId]);
    const conMototaxis = await reportes.inventario({ desde: hoy, hasta: hoy }, ["MOTOTAXIS.LEER"]);
    assert.equal(conMototaxis.mototaxis?.items.find((item) => item.id === modelo.id)?.nombre, "Modelo rep V1");
    const resumen = await reportes.resumenGerencial(["INGRESOS.LEER", "PERSONAS.LEER", "INVENTARIO.LEER", "MOTOTAXIS.LEER"]);
    assert.equal(resumen.ventasUltimosSieteDias?.length, 7);
    assert.ok((resumen.inventarioMototaxis?.unidades ?? 0) >= 2);
  });

  test("guarda, reemplaza y quita metas mensuales y predeterminadas", async () => {
    await metas.guardar({ indicador: "MARGEN", periodo: null, valor: 30 }, usuarioId, "1998-02");
    const conMes = await metas.guardar({ indicador: "MARGEN", periodo: "1998-02", valor: 35.555 }, usuarioId, "1998-02");
    assert.deepEqual(conMes.metas.MARGEN, { valor: 35.56, origen: "MES" });
    assert.deepEqual((await metas.guardar({ indicador: "MARGEN", periodo: "1998-02", valor: null }, usuarioId, "1998-02")).metas.MARGEN, { valor: 30, origen: "PREDETERMINADA" });
    assert.equal((await metas.guardar({ indicador: "MARGEN", valor: null }, usuarioId, "1998-02")).metas.MARGEN, null);
    await assert.rejects(metas.obtener("1998-13"), BadRequestException);
  });
});

describe("configuración de entorno", () => {
  test("rechaza valores inválidos de cada variable", () => {
    const respaldo = { ...process.env };
    const casos: Array<[string, string | undefined, RegExp]> = [
      ["PORT", "70000", /PORT/], ["FRONTEND_ORIGIN", " , ", /FRONTEND_ORIGIN/], ["FRONTEND_ORIGIN", "no-url", /orígenes URL/], ["FRONTEND_ORIGIN", "https://a.pe/ruta", /solo el origen/],
      ["AUTENTICACION_DURACION_SEGUNDOS", "-1", /entero positivo/], ["DESCUENTO_MAXIMO_PORCENTAJE", "120", /DESCUENTO/], ["DATABASE_URL", "mysql://x", /PostgreSQL/],
      ["AUTENTICACION_SECRETO", "changeme-changeme-changeme-changeme", /AUTENTICACION_SECRETO/], ["NUBEFACT_RUTA", "http://x.pe", /HTTPS/],
      ["NUBEFACT_TOKEN", undefined, /NUBEFACT_TOKEN/], ["REGIMEN_TRIBUTARIO", "OTRO", /REGIMEN/],
    ];
    try {
      for (const [nombre, valor, patron] of casos) {
        Object.assign(process.env, respaldo);
        if (valor === undefined) delete process.env[nombre]; else process.env[nombre] = valor;
        assert.throws(() => validarConfiguracionEntorno(), patron, nombre);
      }
    } finally {
      for (const clave of Object.keys(process.env)) if (!(clave in respaldo)) delete process.env[clave];
      Object.assign(process.env, respaldo);
    }
  });
});
