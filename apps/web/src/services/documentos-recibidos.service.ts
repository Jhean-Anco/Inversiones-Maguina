import { solicitarApi } from "./api-cliente";

export type DocumentoRecibido = { id: string; emisorRuc: string; emisorNombre: string | null; tipoDocumento: string; serie: string; correlativo: string; fechaEmision: string | null; moneda: string | null; total: string | null; estado: string; periodoSire: string | null; destino: string | null };
export type PaginaDocumentosRecibidos = { registros: DocumentoRecibido[]; total: number; pagina: number; porPagina: number; paginas: number };
type TicketSire = { estado: string; listo: boolean; archivos: { nombre: string | null; tipo: string | null }[] };
export type ConsultaDocumentoSire = { rucProveedor: string; tipoDocumento: string; serie: string; correlativo: string };
type ResultadoImportacionSire = { documentosGuardados: number; documentoConsultado: DocumentoRecibido };

export const servicioDocumentosRecibidos = {
  configuracion() { return solicitarApi<{ configurado: boolean }>("/inventario/sunat-sire/configuracion"); },
  listar(pagina: number, porPagina: number, busqueda: string, filtros: { estado: string; periodo: string; destino: string; tipoDocumento: string }) {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda, estado: filtros.estado, periodo: filtros.periodo, destino: filtros.destino, tipoDocumento: filtros.tipoDocumento });
    return solicitarApi<PaginaDocumentosRecibidos>(`/egresos/documentos-recibidos?${parametros}`);
  },
  registrarManual(datos: { emisorRuc: string; emisorNombre: string; tipoDocumento: string; serie: string; correlativo: string; fechaEmision: string; moneda: string; total: string }) {
    return solicitarApi<{ id: string }>("/egresos/documentos-recibidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  clasificar(id: string, destino: string) {
    return solicitarApi<{ id: string; destino: string; estado: string }>(`/egresos/documentos-recibidos/${encodeURIComponent(id)}/destino`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destino }) });
  },
  solicitar(periodo: string, documento: ConsultaDocumentoSire) {
    const parametros = new URLSearchParams({ periodo, ...documento });
    return solicitarApi<{ ticket: string }>(`/inventario/sunat-sire/propuesta?${parametros}`);
  },
  consultarTicket(periodo: string, ticket: string) { return solicitarApi<TicketSire>(`/inventario/sunat-sire/ticket?periodo=${encodeURIComponent(periodo)}&numero=${encodeURIComponent(ticket)}`); },
  importar(periodo: string, ticket: string, archivo: { nombre: string; tipo: string }, documento: ConsultaDocumentoSire) {
    return solicitarApi<ResultadoImportacionSire>("/egresos/documentos-recibidos/importar-sire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodo, ticket, ...archivo, ...documento }) });
  },
};
