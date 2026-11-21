import type { LineaOrden } from "./types";

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
export const TASA_IGV_ORDEN = 18;

export function importesOrden(lineas: LineaOrden[]) {
  let subtotal = 0;
  let igv = 0;
  for (const linea of lineas) {
    const cantidad = Number(linea.cantidad) || 0;
    const precio = Number(linea.precioUnitario) || 0;
    const descuento = Number(linea.descuento) || 0;
    const totalLinea = Math.max(0, redondear(redondear(cantidad * precio) - descuento));
    const igvLinea = linea.afectacionIgv === "GRAVADO" ? redondear(totalLinea - totalLinea / (1 + TASA_IGV_ORDEN / 100)) : 0;
    subtotal = redondear(subtotal + totalLinea - igvLinea);
    igv = redondear(igv + igvLinea);
  }
  return { subtotal, igv, total: redondear(subtotal + igv) };
}
