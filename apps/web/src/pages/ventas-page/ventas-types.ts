export type DocumentoAnulacion = {
  ingresoId: string;
  documentoId: string;
  codigo: string;
  tipo: string;
  esNota: boolean;
  pendiente: boolean;
  /** Nota de venta interna: se anula al instante, sin comunicar baja a SUNAT. */
  interna?: boolean;
};
