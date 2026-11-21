import type { Cotizacion } from "../../services/ingresos.service";
import { igvIncluido, importeLinea, subtotalSinIgv, TASA_IGV } from "../../domain/ingresos/importes-venta";

export type LineaGestion = Record<string, unknown> & {
  tipo: "PRODUCTO" | "SERVICIO";
  nombreVisible: string;
  precioUnitario: string;
  cantidad: string;
  descuento: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
};

export function importeLineaCotizacion(linea: Record<string, unknown>) {
  return importeLinea(Number(linea.cantidad ?? 1), Number(linea.precioUnitario ?? 0), Number(linea.descuento ?? 0));
}

export function calcularTotalesCotizacion(lineas: Record<string, unknown>[], aplicaIgv?: boolean) {
  let total = 0;
  let igv = 0;
  for (const linea of lineas) {
    const importe = importeLineaCotizacion(linea);
    total += Math.round(importe * 100);
    if (aplicaIgv && (linea.afectacionIgv ?? "GRAVADO") === "GRAVADO") {
      igv += Math.round(igvIncluido(importe) * 100);
    }
  }
  return {
    total: total / 100,
    subtotal: aplicaIgv === undefined ? null : subtotalSinIgv(total / 100, igv / 100),
    igv: aplicaIgv === undefined ? null : igv / 100,
    tasaIgv: aplicaIgv ? TASA_IGV : undefined,
  };
}

export function mensajeWhatsAppCotizacion(cotizacion: Cotizacion, dinero: (valor: number) => string) {
  const { total, subtotal, igv, tasaIgv } = calcularTotalesCotizacion(cotizacion.detalles, cotizacion.aplicaIgv);
  return [
    `Cotización ${cotizacion.codigo}`,
    `Cliente: ${cotizacion.clienteNombre ?? "Sin cliente"}`,
    `Vigente hasta: ${cotizacion.vigenteHasta ?? "sin fecha"}`,
    ...cotizacion.detalles.map((linea) =>
      `${String(linea.nombreVisible ?? linea.descripcion ?? "Artículo")} · Cant. ${Number(linea.cantidad ?? 1)} · ${dinero(importeLineaCotizacion(linea))}`
    ),
    `Subtotal sin IGV: ${subtotal == null ? "—" : dinero(subtotal)}`,
    `${tasaIgv ? `IGV (${tasaIgv}%)` : "IGV"}: ${igv == null ? "—" : dinero(igv)}`,
    `Total a pagar: ${dinero(total)}`,
  ].join("\n");
}
