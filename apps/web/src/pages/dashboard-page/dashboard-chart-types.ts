export type TipoOrigenIngresoGrafico = "BOLETA" | "FACTURA" | "NOTA_VENTA" | "NOTA_DEBITO" | "ADELANTO";
export type TipoConceptoGrafico = "PRODUCTO" | "SERVICIO" | "MOTOTAXI";
export type ImportesGrafico = Record<TipoOrigenIngresoGrafico | TipoConceptoGrafico, number>;
export type PuntoIngresos = { fecha: string; total: number; etiqueta?: string } & ImportesGrafico;
