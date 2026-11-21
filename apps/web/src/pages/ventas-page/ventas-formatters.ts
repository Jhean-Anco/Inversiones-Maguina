import type { VentaListado } from "../../services/ingresos.service";

export const soles = (valor: string) =>
  "S/ " +
  Number(valor).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fecha = (valor: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(valor.slice(0, 10) + "T00:00:00Z"));

export const comprobante = (tipo: VentaListado["tipoComprobante"]) =>
  ({ BOLETA: "Boleta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" })[tipo];

const etiquetasEstado: Record<string, string> = {
  ACEPTADO_SUNAT: "Aceptado por SUNAT",
  RECHAZADO_SUNAT: "Rechazado por SUNAT",
  ANULADO: "Anulado por SUNAT",
  ANULACION_PENDIENTE: "Baja pendiente de SUNAT",
  BAJA_RECHAZADA: "Baja rechazada por SUNAT",
  ERROR_SUNAT: "Error de SUNAT",
  ERROR_NUBEFACT: "Error de NubeFact",
  EN_PROCESO: "En proceso",
  PENDIENTE_CONFIRMACION: "Pendiente de confirmación",
  ERROR_EMISION: "Error de emisión",
  EMITIDO: "Emitido",
  REGISTRADO: "Registrado",
  NUBEFACT_PENDIENTE: "Pendiente de confirmación",
};

export const estado = (valor: string, estadoProveedor?: string) =>
  etiquetasEstado[estadoProveedor ?? ""] ??
  etiquetasEstado[valor] ??
  valor.replaceAll("_", " ").toLocaleLowerCase("es-PE");

export const estadoSunat = (venta: VentaListado) => {
  const actual = venta.estadoProveedor || venta.estado;
  if (venta.tipoComprobante === "NOTA_VENTA") return "No aplica";
  if (["RECHAZADO_SUNAT", "BAJA_RECHAZADA"].includes(actual)) return "Rechazado";
  if (["ACEPTADO_SUNAT", "EMITIDO"].includes(actual)) return "Emitido";
  if (actual === "ANULADO") return "Anulado";
  return "Pendiente";
};

export const medioPago = (valor: string) =>
  valor
    .replaceAll("_", " ")
    .toLocaleLowerCase("es-PE")
    .replace(/^\p{L}/u, (letra) => letra.toLocaleUpperCase("es-PE"));
