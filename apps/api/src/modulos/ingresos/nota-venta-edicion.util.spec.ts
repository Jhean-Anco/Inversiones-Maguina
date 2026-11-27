import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  calcularDeltasConsumo, calcularLineaNota, huellaNotaVenta, normalizarSolicitudEdicion, planificarPagos, resumirCambios, sumarTotales, validarNotaEditable,
  type SnapshotNota,
} from "./nota-venta-edicion.util";

const servicio = (extra: Record<string, unknown> = {}) => ({ tipo: "SERVICIO", descripcion: "Cambio de aceite", cantidad: 1, precioUnitario: "20.00", afectacionIgv: "INAFECTO", ...extra });
const lanza = (accion: () => unknown, tipo: new (...args: never[]) => Error, mensaje: RegExp) => assert.throws(accion, (error: unknown) => { assert.ok(error instanceof tipo, String(error)); assert.match((error as Error).message, mensaje); return true; });

describe("normalizarSolicitudEdicion", () => {
  test("acepta una solicitud completa y normaliza los tipos", () => {
    const id = randomUUID(), cliente = randomUUID(), presentacion = randomUUID(), modelo = randomUUID();
    const solicitud = normalizarSolicitudEdicion({ versionDocumento: "abc", fecha: "2020-01-02", clienteId: cliente, medioPago: "TARJETA", observacion: "  nota  ", confirmarDevolucionExceso: true,
      detalles: [{ id, tipo: "PRODUCTO", presentacionId: presentacion, cantidad: "2", precioUnitario: "10.5", descuento: "1", afectacionIgv: "GRAVADO" }] });
    assert.deepEqual(solicitud, { detalles: [{ id, tipo: "PRODUCTO", presentacionId: presentacion, cantidad: 2, precioUnitario: 10.5, descuento: 1, afectacionIgv: "GRAVADO" }],
      confirmarDevolucionExceso: true, versionDocumento: "abc", fecha: "2020-01-02", clienteId: cliente, medioPago: "TARJETA", observacion: "nota" });
    const moto = normalizarSolicitudEdicion({ detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: modelo, cantidad: 1, afectacionIgv: "GRAVADO" }], observacion: null });
    assert.equal(moto.observacion, null);
    assert.equal(moto.detalles[0].precioUnitario, undefined);
    assert.equal(moto.confirmarDevolucionExceso, false);
  });

  test("rechaza datos mal formados con mensajes claros", () => {
    for (const entrada of [null, [], "x"]) lanza(() => normalizarSolicitudEdicion(entrada), BadRequestException, /no son válidos/);
    for (const detalles of [undefined, [], Array.from({ length: 101 }, () => servicio())]) lanza(() => normalizarSolicitudEdicion({ detalles }), BadRequestException, /entre 1 y 100/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio()], fecha: "2999-01-01" }), BadRequestException, /fecha/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio()], clienteId: "x" }), BadRequestException, /cliente válido/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio()], medioPago: "CHEQUE" }), BadRequestException, /medio de pago/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio()], medioPago: 5 }), BadRequestException, /medio de pago/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio()], versionDocumento: "" }), BadRequestException, /obligatorio/);
    lanza(() => normalizarSolicitudEdicion({ detalles: ["x"] }), BadRequestException, /línea 1 no es válida/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ cantidad: 0 })] }), BadRequestException, /Cantidad/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ afectacionIgv: "X" })] }), BadRequestException, /tipo de operación/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ id: "x" })] }), BadRequestException, /identificador/);
    const id = randomUUID();
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ id }), servicio({ id })] }), BadRequestException, /repetida/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [{ tipo: "PRODUCTO", cantidad: 1, afectacionIgv: "GRAVADO" }] }), BadRequestException, /presentación/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ descripcion: "" })] }), BadRequestException, /obligatorio/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ precioUnitario: undefined })] }), BadRequestException, /precio del servicio/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio({ precioUnitario: "1.2345" })] }), BadRequestException, /2 decimales/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [{ tipo: "MOTOTAXI", cantidad: 1, afectacionIgv: "GRAVADO" }] }), BadRequestException, /modelo/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: randomUUID(), cantidad: 1.5, afectacionIgv: "GRAVADO" }] }), BadRequestException, /entera/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [{ tipo: "OTRO", cantidad: 1, afectacionIgv: "GRAVADO" }] }), BadRequestException, /producto, servicio o mototaxi/);
    lanza(() => normalizarSolicitudEdicion({ detalles: [servicio(), { tipo: "MOTOTAXI", mototaxiModeloId: randomUUID(), cantidad: 1, afectacionIgv: "GRAVADO" }] }), BadRequestException, /por separado/);
  });
});

describe("importes y deltas", () => {
  test("calcula la línea sin IGV desglosado y valida el descuento", () => {
    assert.deepEqual(calcularLineaNota({ cantidad: 3, precio: 10.5, descuento: 1.5, descripcion: "x", descuentoMaximoPorcentaje: 50 }), { subtotal: 30, igv: 0, total: 30 });
    lanza(() => calcularLineaNota({ cantidad: 1, precio: 10, descuento: 11, descripcion: "Filtro", descuentoMaximoPorcentaje: 100 }), BadRequestException, /supera el importe/);
    lanza(() => calcularLineaNota({ cantidad: 1, precio: 10, descuento: 6, descripcion: "x", descuentoMaximoPorcentaje: 50 }), BadRequestException, /máximo permitido es 50%/);
    assert.deepEqual(sumarTotales([{ subtotal: 10.1, igv: 0, total: 10.1 }, { subtotal: 0.2, igv: 0, total: 0.2 }]), { subtotal: 10.3, igv: 0, total: 10.3 });
    assert.deepEqual(sumarTotales([]), { subtotal: 0, igv: 0, total: 0 });
  });

  test("solo informa diferencias de consumo reales, ordenadas por clave", () => {
    const deltas = calcularDeltasConsumo(
      [{ clave: "b", cantidad: "2.000000" }, { clave: "a", cantidad: 1 }, { clave: "c", cantidad: 4 }],
      [{ clave: "b", cantidad: 5 }, { clave: "a", cantidad: "1.000000" }, { clave: "d", cantidad: 0.5 }, { clave: "c", cantidad: 1 }, { clave: "b", cantidad: 1 }]);
    assert.deepEqual([...deltas], [["b", 4], ["c", -3], ["d", 0.5]]);
    assert.equal(calcularDeltasConsumo([], []).size, 0);
  });
});

const snapshot = (extra: Partial<SnapshotNota> = {}): SnapshotNota => ({
  fecha: "2026-01-01", clienteId: "c1", medioPago: "EFECTIVO", observacion: null, subtotal: "20.00", igv: "0.00", total: "20.00",
  detalles: [{ id: "l1", tipo: "SERVICIO", presentacionId: null, mototaxiModeloId: null, descripcion: "Aceite", cantidad: "1.000", precioUnitario: "20.0000", descuento: "0.00", afectacionIgv: "INAFECTO" }], ...extra,
});

describe("resumirCambios y huella", () => {
  test("una copia idéntica no tiene cambios y comparte huella", () => {
    assert.deepEqual(resumirCambios(snapshot(), snapshot()), []);
    assert.equal(huellaNotaVenta(snapshot()), huellaNotaVenta(snapshot()));
    assert.notEqual(huellaNotaVenta(snapshot()), huellaNotaVenta(snapshot({ total: "21.00" })));
  });

  test("describe cabecera, líneas modificadas, agregadas y eliminadas", () => {
    const base = snapshot();
    const linea = base.detalles[0];
    const cambiado = snapshot({
      fecha: "2026-01-02", clienteId: "c2", medioPago: "TARJETA", observacion: "ok", total: "35.00",
      detalles: [
        { ...linea, presentacionId: "p", descripcion: "Aceite 2", cantidad: "2.000", precioUnitario: "15.0000", descuento: "1.00", afectacionIgv: "GRAVADO" },
        { ...linea, id: null, descripcion: "Nuevo" },
      ],
    });
    const cambios = resumirCambios(base, cambiado);
    for (const esperado of ["fecha", "cliente", "medio de pago", "observación", "artículo: Aceite -> Aceite 2", "cantidad de Aceite 2: 1.000 -> 2.000", "precio de Aceite 2", "descuento de Aceite 2", "operación de Aceite 2", "línea agregada: Nuevo", "total: 20.00 -> 35.00"]) {
      assert.ok(cambios.some((cambio) => cambio.startsWith(esperado)), `${esperado} en ${cambios.join(" | ")}`);
    }
    assert.deepEqual(resumirCambios(base, snapshot({ detalles: [{ ...linea, id: null, descripcion: "Otro" }] })).slice(0, 2), ["línea agregada: Otro", "línea eliminada: Aceite"]);
  });
});

describe("estado y pagos", () => {
  test("solo se editan notas de venta vigentes", () => {
    lanza(() => validarNotaEditable({ tipoComprobante: "BOLETA", estado: "EMITIDO", datosNubefact: null }), BadRequestException, /documento fiscal/);
    lanza(() => validarNotaEditable({ tipoComprobante: "FACTURA", estado: "EMITIDO", datosNubefact: null }), BadRequestException, /nota de crédito/);
    lanza(() => validarNotaEditable({ tipoComprobante: "NOTA_VENTA", estado: "ANULADO", datosNubefact: null }), ConflictException, /anulada/);
    lanza(() => validarNotaEditable({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO", datosNubefact: { anulacion: { estado: "ANULADO" } } }), ConflictException, /anulada/);
    validarNotaEditable({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO", datosNubefact: { archivos: {} } });
    validarNotaEditable({ tipoComprobante: "NOTA_VENTA", estado: "REGISTRADO", datosNubefact: null });
  });

  test("los pagos que exceden el nuevo total exigen confirmar la devolución y se recortan desde el último", () => {
    const pagos = [{ id: "a", importe: 30 }, { id: "b", importe: 20 }];
    assert.deepEqual(planificarPagos(pagos, 50, false), { pagado: 50, devuelto: 0, ajustes: [] });
    assert.deepEqual(planificarPagos([], 10, false), { pagado: 0, devuelto: 0, ajustes: [] });
    lanza(() => planificarPagos(pagos, 40, false), ConflictException, /Confirma la devolución de S\/ 10\.00/);
    assert.deepEqual(planificarPagos(pagos, 40, true), { pagado: 50, devuelto: 10, ajustes: [{ id: "b", importe: 10 }] });
    assert.deepEqual(planificarPagos(pagos, 20, true), { pagado: 50, devuelto: 30, ajustes: [{ id: "b", importe: 0 }, { id: "a", importe: 20 }] });
  });
});
