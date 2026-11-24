export type TipoOrigenIngresoGrafico = "BOLETA" | "FACTURA" | "NOTA_VENTA" | "NOTA_DEBITO" | "ADELANTO";
export type TipoConceptoGrafico = "PRODUCTO" | "SERVICIO" | "MOTOTAXI";
export type ModoDesgloseGrafico = "TOTAL" | "ORIGEN" | "CONCEPTO";
export type ImportesGrafico = Record<TipoOrigenIngresoGrafico | TipoConceptoGrafico, number>;
export type PuntoIngresos = { fecha: string; total: number; etiqueta?: string } & ImportesGrafico;
export type PuntoVentasMensuales = { etiqueta: string; total: number } & ImportesGrafico;
