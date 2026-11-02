import { solicitarApi } from "./api-cliente";

export type ProductoParaIngreso = {
  productoId: string; codigo: string; nombre: string; marca: string; rutaImagen: string | null; afectoIgv: boolean; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; presentacionId: string;
  presentacion: string; unidadCodigo: string; unidad: string; factorAUnidadBase: string; precio: string; stockBase: string;
  listaPrecioCodigo: string; listaPrecioNombre: string;
};
export type LineaIngreso =
  | { tipo: "PRODUCTO"; presentacionId: string; cantidad: string; descuento: string }
  | { tipo: "SERVICIO"; descripcion: string; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" };
export type DatosNuevoIngreso = {
  idempotencyKey: string; fecha: string; tipoComprobante: "BOLETA" | "NOTA_VENTA"; clienteId?: string; clienteDireccion?: string; clienteTipoDocumento?: string; clienteNumeroDocumento?: string; clienteNombre?: string;
  medioPago: string; condicionPago?: "CONTADO" | "CREDITO"; importePagoInicial?: string; fechaVencimientoPago?: string; cuotasPago?: { cuota: number; fechaDePago: string; importe: string }[]; observacion?: string; detalles: LineaIngreso[];
};
export type IngresoCreado = { id: string; codigo: string; tipoComprobante?: "BOLETA" | "FACTURA" | "NOTA_VENTA"; condicionPago?: "CONTADO" | "CREDITO"; medioPago?: string; importePagoInicial?: string; total: string; igv: string; subtotal: string; estado: string; nubefact?: { estado: "EMITIDO_DEMO" | "EMITIDO" | "PENDIENTE" | "ERROR"; ambiente?: "DEMO" | "PRODUCCION"; serie: string; numero: number; codigo: string; enlace?: string; enlacePdf?: string; mensaje?: string } | null };
export type EstadoNubefact = { ambiente: "DEMO" | "PRODUCCION"; credencialesConfiguradas: boolean; seriesConfiguradas: boolean; emisorConfigurado: boolean; emisionHabilitada: boolean };
export type NumeracionesIngreso = { BOLETA: { serie: string | null; numero: number | null; codigo: string | null }; ambiente: "DEMO" | "PRODUCCION" };
export type DatosPagoIngreso = { idempotencyKey: string; fechaPago: string; importeAplicado: string; medioPago: string; cuentaFinancieraId: string; referenciaPago?: string; observacion?: string };
export type PagoIngreso = { id: string; fechaPago: string; importeAplicado: string; medioPago: string };
export type TrazabilidadPagosIngreso = { items: PagoIngreso[]; importeAplicadoTotal: string };
export type IdentificadorCliente = { tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string };
export type ClienteRegistrado = { id: string; tipoPersona: "NATURAL" | "JURIDICA"; tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string; documentos?: IdentificadorCliente[]; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; razonSocial: string | null; nombreComercial: string | null; contactoNombre: string | null; correo: string | null; telefono: string | null; direccion: string | null; direccionEntrega: string | null; observacion: string | null };
export type DatosClienteNuevo = { tipoPersona?: "NATURAL" | "JURIDICA"; tipoDocumento: "DNI" | "RUC" | "CE" | "PASAPORTE"; numeroDocumento: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; razonSocial?: string; nombreComercial?: string; contactoNombre?: string; correo?: string; telefono?: string; direccion?: string; direccionEntrega?: string; observacion?: string };
export type IdentidadConsultada = Pick<DatosClienteNuevo, "tipoDocumento" | "numeroDocumento" | "tipoPersona" | "nombres" | "apellidoPaterno" | "apellidoMaterno" | "razonSocial" | "direccion">;
export type ControlNrus = { periodo: string; ingresoBruto: number; alertaCategoria1: number; limiteCategoria1: number; alertaLimiteMensual: number; limiteMensual: number };

export const servicioIngresos = {
  estadoNubefact() { return solicitarApi<EstadoNubefact>("/ingresos/nubefact/estado"); },
  numeraciones() { return solicitarApi<NumeracionesIngreso>("/ingresos/series"); },
  controlNrus(fecha: string) { return solicitarApi<ControlNrus>(`/ingresos/control-nrus?fecha=${encodeURIComponent(fecha)}`); },
  buscarProductos(busqueda: string, catalogo = false) {
    return solicitarApi<ProductoParaIngreso[]>(`/ingresos/productos?busqueda=${encodeURIComponent(busqueda)}&limite=8${catalogo ? "&catalogo=1" : ""}`);
  },
  buscarClientes(busqueda: string) {
    return solicitarApi<ClienteRegistrado[]>(`/ingresos/clientes?busqueda=${encodeURIComponent(busqueda)}`);
  },
  consultarIdentidadCliente(tipoDocumento: "DNI" | "RUC", numeroDocumento: string) {
    const consulta = new URLSearchParams({ tipoDocumento, numeroDocumento });
    return solicitarApi<IdentidadConsultada>(`/ingresos/clientes/consulta-identidad?${consulta}`);
  },
  registrarCliente(datos: DatosClienteNuevo) {
    return solicitarApi<{ id: string; creado: boolean }>("/ingresos/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  actualizarCliente(id: string, datos: Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">) {
    return solicitarApi<ClienteRegistrado>(`/ingresos/clientes/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  crear(datos: DatosNuevoIngreso) {
    return solicitarApi<IngresoCreado>("/ingresos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  listarPagos(ingresoId: string, fechaEvaluacion?: string) { const consulta = fechaEvaluacion ? `?fechaEvaluacion=${encodeURIComponent(fechaEvaluacion)}` : ""; return solicitarApi<TrazabilidadPagosIngreso>(`/ingresos/${encodeURIComponent(ingresoId)}/pagos${consulta}`); },
  registrarPago(ingresoId: string, datos: DatosPagoIngreso) { return solicitarApi<PagoIngreso>(`/ingresos/${encodeURIComponent(ingresoId)}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
};
