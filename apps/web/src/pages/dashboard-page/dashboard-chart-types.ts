export type TipoComprobanteGrafico = "BOLETA" | "FACTURA" | "NOTA_VENTA";
export type TipoConceptoGrafico = "PRODUCTO" | "SERVICIO" | "MOTOTAXI";
export type ModoDesgloseGrafico = "TOTAL" | "COMPROBANTE" | "CONCEPTO";
export type ImportesGrafico = Record<TipoComprobanteGrafico | TipoConceptoGrafico, number>;
export type PuntoIngresos = { fecha: string; total: number; etiqueta?: string } & ImportesGrafico;
export type PuntoVentasMensuales = { etiqueta: string; total: number } & ImportesGrafico;
