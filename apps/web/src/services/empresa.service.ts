import type { DocumentoImprimible } from "../impresion/tipos";
import { solicitarApi } from "./api-cliente";

export type DatosEmpresa = NonNullable<DocumentoImprimible["emisor"]>;

export const servicioEmpresa = {
  obtener: () => solicitarApi<{ empresa: DatosEmpresa | null }>("/empresa").then((respuesta) => respuesta.empresa),
};
