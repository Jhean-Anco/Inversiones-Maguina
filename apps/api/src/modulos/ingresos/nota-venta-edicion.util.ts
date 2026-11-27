import { createHash } from "node:crypto";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { mediosPago, numero, redondear, texto, uuidValido, validarFecha } from "./ingresos.service";

/*
 * Reglas puras de la edición de una nota de venta (documento interno). Nada aquí toca la base de datos:
 * se valida la solicitud, se calculan importes, deltas de inventario y reducciones de pagos, y se resumen los cambios.
 */

export type AfectacionNota = "GRAVADO" | "EXONERADO" | "INAFECTO";
export type TipoLineaNota = "PRODUCTO" | "SERVICIO" | "MOTOTAXI";

export type LineaSolicitada = {
  id?: string; tipo: TipoLineaNota; presentacionId?: string; mototaxiModeloId?: string; descripcion?: string;
  cantidad: number; precioUnitario?: number; descuento: number; afectacionIgv: AfectacionNota;
};
export type SolicitudEdicionNota = {
  versionDocumento?: string; fecha?: string; clienteId?: string; medioPago?: string; observacion?: string | null;
  detalles: LineaSolicitada[]; confirmarDevolucionExceso: boolean;
};
export type LineaSnapshot = {
  id: string | null; tipo: string; presentacionId: string | null; mototaxiModeloId: string | null; descripcion: string;
  cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: string;
};
export type SnapshotNota = {
  fecha: string; clienteId: string | null; medioPago: string; observacion: string | null;
  subtotal: string; igv: string; total: string; detalles: LineaSnapshot[];
};

const MAXIMO_LINEAS = 100;
const afectaciones: readonly string[] = ["GRAVADO", "EXONERADO", "INAFECTO"];

export function normalizarSolicitudEdicion(valor: unknown): SolicitudEdicionNota {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Los datos de la edición no son válidos.");
  const datos = valor as Record<string, unknown>;
  if (!Array.isArray(datos.detalles) || datos.detalles.length < 1 || datos.detalles.length > MAXIMO_LINEAS) throw new BadRequestException("La nota debe conservar entre 1 y 100 productos o servicios.");
  const solicitud: SolicitudEdicionNota = { detalles: [], confirmarDevolucionExceso: datos.confirmarDevolucionExceso === true };
  if (datos.versionDocumento !== undefined) solicitud.versionDocumento = texto(datos.versionDocumento, "La versión del documento", 64, true)!;
  if (datos.fecha !== undefined) { const fecha = texto(datos.fecha, "La fecha", 10, true)!; validarFecha(fecha, "La fecha"); solicitud.fecha = fecha; }
  if (datos.clienteId !== undefined) {
    if (!uuidValido(datos.clienteId)) throw new BadRequestException("Selecciona un cliente válido.");
    solicitud.clienteId = datos.clienteId as string;
  }
  if (datos.medioPago !== undefined) {
    if (typeof datos.medioPago !== "string" || !(mediosPago as readonly string[]).includes(datos.medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    solicitud.medioPago = datos.medioPago;
  }
  if (datos.observacion !== undefined) solicitud.observacion = texto(datos.observacion, "La observación", 1000);
  const tiposLinea = new Set<string>();
  const idsUsados = new Set<string>();
  solicitud.detalles = datos.detalles.map((item, indice) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new BadRequestException(`La línea ${indice + 1} no es válida.`);
    const linea = item as Record<string, unknown>;
    const cantidad = numero(linea.cantidad, `Cantidad en línea ${indice + 1}`, 3, 0.001);
    const descuento = numero(linea.descuento ?? "0", `Descuento en línea ${indice + 1}`, 2, 0);
    if (typeof linea.afectacionIgv !== "string" || !afectaciones.includes(linea.afectacionIgv)) throw new BadRequestException(`Selecciona el tipo de operación de la línea ${indice + 1}.`);
    const base: Pick<LineaSolicitada, "cantidad" | "descuento" | "afectacionIgv" | "id"> = { cantidad, descuento, afectacionIgv: linea.afectacionIgv as AfectacionNota };
    if (linea.id !== undefined && linea.id !== null) {
      if (!uuidValido(linea.id)) throw new BadRequestException(`El identificador de la línea ${indice + 1} no es válido.`);
      if (idsUsados.has(linea.id as string)) throw new BadRequestException(`La línea ${indice + 1} está repetida.`);
      idsUsados.add(linea.id as string);
      base.id = linea.id as string;
    }
    const precio = linea.precioUnitario === undefined || linea.precioUnitario === null || linea.precioUnitario === "" ? undefined : numero(linea.precioUnitario, `Precio en línea ${indice + 1}`, 4, 0);
    tiposLinea.add(String(linea.tipo));
    if (linea.tipo === "PRODUCTO") {
      if (!uuidValido(linea.presentacionId)) throw new BadRequestException(`Selecciona una presentación válida en la línea ${indice + 1}.`);
      return { ...base, tipo: "PRODUCTO" as const, presentacionId: linea.presentacionId as string, precioUnitario: precio };
    }
    if (linea.tipo === "SERVICIO") {
      const descripcion = texto(linea.descripcion, `Descripción del servicio ${indice + 1}`, 240, true)!;
      if (precio === undefined) throw new BadRequestException(`Indica el precio del servicio ${indice + 1}.`);
      if (Number(precio.toFixed(2)) !== precio) throw new BadRequestException(`El precio del servicio ${indice + 1} admite hasta 2 decimales.`);
      return { ...base, tipo: "SERVICIO" as const, descripcion, precioUnitario: precio };
    }
    if (linea.tipo === "MOTOTAXI") {
      if (!uuidValido(linea.mototaxiModeloId)) throw new BadRequestException(`Selecciona un modelo de mototaxi válido en la línea ${indice + 1}.`);
      if (!Number.isInteger(cantidad) || cantidad > 2_147_483_647) throw new BadRequestException("Ingresa una cantidad entera de mototaxis por modelo.");
      return { ...base, tipo: "MOTOTAXI" as const, mototaxiModeloId: linea.mototaxiModeloId as string, precioUnitario: precio };
    }
    throw new BadRequestException(`El tipo de línea ${indice + 1} debe ser producto, servicio o mototaxi.`);
  });
  if (tiposLinea.has("MOTOTAXI") && tiposLinea.size > 1) throw new BadRequestException("Registra la venta de mototaxis por separado de la venta de repuestos o servicios.");
  return solicitud;
}

/** Importes de una línea de nota de venta: documento interno, sin IGV desglosado (el precio va íntegro a la base). */
export function calcularLineaNota(entrada: { cantidad: number; precio: number; descuento: number; descripcion: string; descuentoMaximoPorcentaje: number }) {
  const totalBruto = redondear(entrada.cantidad * entrada.precio);
  if (entrada.descuento > totalBruto) throw new BadRequestException(`El descuento de ${entrada.descripcion} supera el importe de la línea.`);
  if (entrada.descuento > redondear(totalBruto * entrada.descuentoMaximoPorcentaje / 100)) throw new BadRequestException(`El descuento máximo permitido es ${entrada.descuentoMaximoPorcentaje}% por línea.`);
  const total = redondear(totalBruto - entrada.descuento);
  return { subtotal: total, igv: 0, total };
}

export function sumarTotales(lineas: { subtotal: number; igv: number; total: number }[]) {
  const sumar = (campo: "subtotal" | "igv" | "total") => lineas.reduce((acumulado, linea) => redondear(acumulado + linea[campo]), 0);
  return { subtotal: sumar("subtotal"), igv: sumar("igv"), total: sumar("total") };
}

const micro = (valor: number | string) => Math.round(Number(valor) * 1_000_000);

/** Diferencia de existencias por clave (producto o modelo): positivo = la venta consume más; negativo = devuelve al inventario. */
export function calcularDeltasConsumo(antes: { clave: string; cantidad: number | string }[], despues: { clave: string; cantidad: number | string }[]) {
  const acumulado = new Map<string, number>();
  for (const { clave, cantidad } of despues) acumulado.set(clave, (acumulado.get(clave) ?? 0) + micro(cantidad));
  for (const { clave, cantidad } of antes) acumulado.set(clave, (acumulado.get(clave) ?? 0) - micro(cantidad));
  return new Map([...acumulado].filter(([, delta]) => delta !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([clave, delta]) => [clave, delta / 1_000_000]));
}

export function huellaNotaVenta(snapshot: SnapshotNota) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function resumirCambios(antes: SnapshotNota, despues: SnapshotNota) {
  const cambios: string[] = [];
  if (antes.fecha !== despues.fecha) cambios.push("fecha");
  if (antes.clienteId !== despues.clienteId) cambios.push("cliente");
  if (antes.medioPago !== despues.medioPago) cambios.push("medio de pago");
  if (antes.observacion !== despues.observacion) cambios.push("observación");
  const previas = new Map(antes.detalles.map((linea) => [linea.id, linea]));
  const conservadas = new Set<string>();
  for (const linea of despues.detalles) {
    const previa = linea.id ? previas.get(linea.id) : undefined;
    if (!previa) { cambios.push(`línea agregada: ${linea.descripcion}`); continue; }
    conservadas.add(previa.id!);
    if (previa.presentacionId !== linea.presentacionId || previa.mototaxiModeloId !== linea.mototaxiModeloId || previa.descripcion !== linea.descripcion) cambios.push(`artículo: ${previa.descripcion} -> ${linea.descripcion}`);
    if (Number(previa.cantidad) !== Number(linea.cantidad)) cambios.push(`cantidad de ${linea.descripcion}: ${previa.cantidad} -> ${linea.cantidad}`);
    if (Number(previa.precioUnitario) !== Number(linea.precioUnitario)) cambios.push(`precio de ${linea.descripcion}: ${previa.precioUnitario} -> ${linea.precioUnitario}`);
    if (Number(previa.descuento) !== Number(linea.descuento)) cambios.push(`descuento de ${linea.descripcion}: ${previa.descuento} -> ${linea.descuento}`);
    if (previa.afectacionIgv !== linea.afectacionIgv) cambios.push(`operación de ${linea.descripcion}: ${previa.afectacionIgv} -> ${linea.afectacionIgv}`);
  }
  for (const linea of antes.detalles) if (!conservadas.has(linea.id!)) cambios.push(`línea eliminada: ${linea.descripcion}`);
  if (antes.total !== despues.total) cambios.push(`total: ${antes.total} -> ${despues.total}`);
  return cambios;
}

export function validarNotaEditable(venta: { tipoComprobante: string; estado: string; datosNubefact: unknown }) {
  if (venta.tipoComprobante !== "NOTA_VENTA") throw new BadRequestException("Solo las notas de venta internas se pueden editar. Una boleta o factura es un documento fiscal: corrígela con una nota de crédito o débito, o anúlala.");
  const datos = venta.datosNubefact && typeof venta.datosNubefact === "object" ? venta.datosNubefact as Record<string, unknown> : {};
  if (venta.estado !== "REGISTRADO" || datos.anulacion) throw new ConflictException("La nota de venta está anulada o ya no admite cambios.");
}

/**
 * Si los pagos aplicados superan el nuevo total hay dinero que debería devolverse: se rechaza salvo confirmación explícita,
 * en cuyo caso se recortan los pagos más recientes y se informa el importe devuelto.
 */
export function planificarPagos(pagos: { id: string; importe: number }[], nuevoTotal: number, confirmarDevolucion: boolean) {
  const pagado = pagos.reduce((total, pago) => redondear(total + pago.importe), 0);
  if (pagado <= nuevoTotal) return { pagado, devuelto: 0, ajustes: [] as { id: string; importe: number }[] };
  const exceso = redondear(pagado - nuevoTotal);
  if (!confirmarDevolucion) throw new ConflictException(`Los pagos registrados (S/ ${pagado.toFixed(2)}) superan el nuevo total (S/ ${nuevoTotal.toFixed(2)}). Confirma la devolución de S/ ${exceso.toFixed(2)} al cliente para reducir los pagos, o conserva un total mínimo de S/ ${pagado.toFixed(2)}.`);
  let pendiente = exceso;
  const ajustes: { id: string; importe: number }[] = [];
  for (const pago of [...pagos].reverse()) {
    if (pendiente <= 0) break;
    const recorte = Math.min(pago.importe, pendiente);
    ajustes.push({ id: pago.id, importe: redondear(pago.importe - recorte) });
    pendiente = redondear(pendiente - recorte);
  }
  return { pagado, devuelto: exceso, ajustes };
}
