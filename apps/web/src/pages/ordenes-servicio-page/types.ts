export type LineaOrden = Record<string, unknown> & {
  tipo: "PRODUCTO" | "SERVICIO";
  nombreVisible: string;
  descripcion?: string;
  precioUnitario: string;
  cantidad: string;
  descuento: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
};
