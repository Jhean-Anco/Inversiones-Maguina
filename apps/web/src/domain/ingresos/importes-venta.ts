import type { LineaCarrito } from "../../types/nuevo-ingreso";

const redondear = (monto: number) => Math.round((monto + Number.EPSILON) * 100) / 100;
export const TASA_IGV = 18;

export function importeLinea(cantidad: number, precio: number, descuento: number) {
  return Math.max(0, redondear(redondear(cantidad * precio) - descuento));
}

export function igvIncluido(importe: number) {
  return redondear(importe - importe / (1 + TASA_IGV / 100));
}

export const subtotalSinIgv = (total: number, igv: number) => redondear(total - igv);

export function precioRepuestoEnLinea(linea: Extract<LineaCarrito, { tipo: "PRODUCTO" }>) {
  if (!linea.listaPrecioCodigo) return linea.producto.precio || null;
  return linea.producto.tramos?.find((tramo) =>
    tramo.listaCodigo === linea.listaPrecioCodigo && Number(tramo.cantidadMinima) <= Number(linea.cantidad),
  )?.precio ?? null;
}
