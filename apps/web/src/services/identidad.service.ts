import { solicitarApi } from "./api-cliente";

export type TipoDocumentoIdentidad = "DNI" | "RUC";
export type IdentidadConsultada = {
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  tipoPersona: "NATURAL" | "JURIDICA";
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  razonSocial?: string;
  direccion?: string;
};

export const servicioIdentidad = {
  consultar(tipoDocumento: TipoDocumentoIdentidad, numeroDocumento: string) {
    const parametros = new URLSearchParams({ tipoDocumento, numeroDocumento });
    return solicitarApi<IdentidadConsultada>(`/personas/consulta-identidad?${parametros.toString()}`);
  },
};
