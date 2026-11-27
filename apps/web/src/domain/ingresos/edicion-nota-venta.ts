import type { DatosEdicionNotaVenta, LineaNotaVentaEditable, MototaxiParaIngreso, NotaVentaEditable, ProductoParaIngreso } from "../../services/ingresos.service";
import { importeLinea } from "./importes-venta";

export type LineaEdicion = {
  clave: string; id?: string; tipo: LineaNotaVentaEditable["tipo"]; presentacionId?: string; mototaxiModeloId?: string;
  descripcion: string; detalle: string | null; cantidad: string; precio: string; descuento: string;
  afectacionIgv: LineaNotaVentaEditable["afectacionIgv"]; bloqueo: string | null;
};
export type FormularioNota = { fecha: string; clienteId: string | null; clienteNombre: string; medioPago: string; observacion: string; lineas: LineaEdicion[] };

const redondear = (monto: number) => Math.round((monto + Number.EPSILON) * 100) / 100;
/** Muestra dos decimales, salvo que el precio guardado necesite más. */
const precioVisible = (valor: string) => Number(Number(valor).toFixed(2)) === Number(valor) ? Number(valor).toFixed(2) : String(Number(valor));

export function formularioDesdeNota(nota: NotaVentaEditable): FormularioNota {
  return {
    fecha: nota.fecha, clienteId: nota.clienteId, clienteNombre: nota.clienteNombre ?? "", medioPago: nota.medioPago, observacion: nota.observacion ?? "",
    lineas: nota.detalles.map((linea) => ({
      clave: linea.id, id: linea.id, tipo: linea.tipo, presentacionId: linea.presentacionId ?? undefined, mototaxiModeloId: linea.mototaxiModeloId ?? undefined,
      descripcion: linea.descripcion, detalle: linea.presentacion, cantidad: String(Number(linea.cantidad)), precio: precioVisible(linea.precioUnitario),
      descuento: Number(linea.descuento).toFixed(2), afectacionIgv: linea.afectacionIgv, bloqueo: linea.bloqueo,
    })),
  };
}

export function lineaDesdeProducto(clave: string, producto: ProductoParaIngreso): LineaEdicion {
  const tramo = producto.tramos?.find((item) => item.listaCodigo === "GENERAL" && Number(item.cantidadMinima) <= 1);
  return { clave, tipo: "PRODUCTO", presentacionId: producto.presentacionId, descripcion: producto.nombre, detalle: producto.presentacion,
    cantidad: "1", precio: precioVisible(tramo?.precio ?? (producto.precio || "0")), descuento: "0.00", afectacionIgv: producto.afectacionIgv, bloqueo: null };
}

export function lineaDesdeMototaxi(clave: string, mototaxi: MototaxiParaIngreso): LineaEdicion {
  return { clave, tipo: "MOTOTAXI", mototaxiModeloId: mototaxi.mototaxiModeloId, descripcion: [mototaxi.marca, mototaxi.modelo, mototaxi.version].filter(Boolean).join(" "), detalle: null,
    cantidad: "1", precio: precioVisible(mototaxi.precioVenta ?? "0"), descuento: "0.00", afectacionIgv: "GRAVADO", bloqueo: null };
}

export function lineaDeServicio(clave: string): LineaEdicion {
  return { clave, tipo: "SERVICIO", descripcion: "", detalle: null, cantidad: "1", precio: "0.00", descuento: "0.00", afectacionIgv: "GRAVADO", bloqueo: null };
}

export const importeLineaEdicion = (linea: LineaEdicion) => importeLinea(Number(linea.cantidad) || 0, Number(linea.precio) || 0, Number(linea.descuento) || 0);
export const totalEdicion = (lineas: LineaEdicion[]) => lineas.reduce((total, linea) => redondear(total + importeLineaEdicion(linea)), 0);

export function validarEdicion(formulario: FormularioNota, hoy: string) {
  if (!formulario.fecha || formulario.fecha > hoy) return "Indica una fecha válida que no sea posterior a hoy.";
  if (!formulario.lineas.length) return "La nota debe conservar al menos un artículo o servicio.";
  for (const [indice, linea] of formulario.lineas.entries()) {
    const posicion = `la línea ${indice + 1}`;
    if (linea.tipo === "SERVICIO" && !linea.descripcion.trim()) return `Describe el servicio de ${posicion}.`;
    const cantidad = Number(linea.cantidad);
    if (!(cantidad > 0)) return `Ingresa una cantidad mayor que cero en ${posicion}.`;
    if (linea.tipo === "MOTOTAXI" && !Number.isInteger(cantidad)) return `Las mototaxis se venden por unidades enteras (${posicion}).`;
    if (linea.precio.trim() === "" || !(Number(linea.precio) >= 0)) return `Ingresa un precio válido en ${posicion}.`;
    if (!(Number(linea.descuento || 0) >= 0) || Number(linea.descuento || 0) > redondear(cantidad * Number(linea.precio))) return `El descuento de ${posicion} no puede superar su importe.`;
  }
  return "";
}

export function datosDeEdicion(formulario: FormularioNota, versionDocumento: string, confirmarDevolucionExceso: boolean): DatosEdicionNotaVenta {
  return {
    versionDocumento, fecha: formulario.fecha, clienteId: formulario.clienteId ?? undefined, medioPago: formulario.medioPago,
    observacion: formulario.observacion.trim() || null, ...(confirmarDevolucionExceso ? { confirmarDevolucionExceso: true } : {}),
    detalles: formulario.lineas.map((linea) => ({
      id: linea.id, tipo: linea.tipo, presentacionId: linea.presentacionId, mototaxiModeloId: linea.mototaxiModeloId,
      descripcion: linea.tipo === "SERVICIO" ? linea.descripcion.trim() : undefined,
      cantidad: linea.cantidad, precioUnitario: linea.precio, descuento: linea.descuento || "0", afectacionIgv: linea.afectacionIgv,
    })),
  };
}
