import { solicitarApi } from "./api-cliente";

export type DatosEmisor = {
  ruc: string; razonSocial: string; nombreComercial: string | null; domicilioFiscal: string;
  ubigeo: string | null; urbanizacion: string | null; distrito: string | null; provincia: string | null; departamento: string | null;
  correo: string | null; telefono: string | null; logoUrl: string | null;
};

export type EstadoFacturacion = {
  ambiente: "DEMO" | "PRODUCCION"; credencialesConfiguradas: boolean; seriesConfiguradas: boolean;
  emisorConfigurado: boolean; emisionHabilitada: boolean;
};

export type ComprobanteEmitido = {
  id: string; codigoVenta: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA";
  clienteNumeroDocumento: string | null; clienteNombre: string | null; subtotal: string; tasaIgv: string; igv: string; total: string;
  estado: string; ambiente: "DEMO" | "PRODUCCION" | null; serie: string; numero: number;
  codigoComprobante: string | null; enlace: string | null; enlacePdf: string | null; enlaceXml: string | null;
  mensaje: string | null;
};

export const servicioFacturacionElectronica = {
  consultarEmisor: () => solicitarApi<{ emisor: (DatosEmisor & { actualizadoEn: string }) | null; integracion: EstadoFacturacion }>("/facturacion-electronica/emisor"),
  guardarEmisor: (datos: DatosEmisor) => solicitarApi<{ emisor: (DatosEmisor & { actualizadoEn: string }) | null; integracion: EstadoFacturacion }>("/facturacion-electronica/emisor", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  }),
  listarComprobantes: (pagina: number, busqueda: string) => {
    const parametros = new URLSearchParams({ pagina: String(pagina), busqueda });
    return solicitarApi<{ items: ComprobanteEmitido[]; pagina: number; total: number; totalPaginas: number }>(`/facturacion-electronica/comprobantes?${parametros.toString()}`);
  },
};
