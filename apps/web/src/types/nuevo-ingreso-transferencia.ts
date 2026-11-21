export type CotizacionTransferida = {
  id: string;
  codigo: string;
  clienteId: string | null;
  clienteNombre: string | null;
  observacion: string | null;
  tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA";
  detalles: Record<string, unknown>[];
};

export type OrdenServicioTransferida = {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNombre: string;
  motivo: string;
  adelanto: string;
  adelantoMedioPago: string | null;
  adelantoCuentaFinancieraId: string | null;
  tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA";
  detalles: Record<string, unknown>[];
};
