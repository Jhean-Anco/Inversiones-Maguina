import { solicitarApi } from "./api-cliente";
import { servicioIdentidad } from "./identidad.service";

export type TramoPrecio = { listaCodigo: string; listaNombre: string; precio: string; cantidadMinima: string };
export type ProductoParaIngreso = {
  productoId: string; codigo: string; nombre: string; marca: string; afectoIgv: boolean; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; presentacionId: string;
  presentacion: string; unidadCodigo: string; unidad: string; factorAUnidadBase: string; precio: string; stockBase: string;
  listaPrecioCodigo: string; listaPrecioNombre: string; tramos?: TramoPrecio[];
};
export type MototaxiParaIngreso = { mototaxiModeloId: string; codigo: string; marca: string; modelo: string; version: string | null; precioVenta: string | null; stockDisponible: number };
export type LineaIngreso =
  | { tipo: "PRODUCTO"; presentacionId: string; cantidad: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; precioUnitario?: string; listaPrecioCodigo?: string; precioEsperado?: string }
  | { tipo: "SERVICIO"; descripcion: string; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" }
  | { tipo: "MOTOTAXI"; mototaxiModeloId: string; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" };
export type DatosNuevoIngreso = {
  idempotencyKey: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; ordenServicioId?: string; cotizacionId?: string; clienteId?: string; clienteDireccion?: string; clienteTipoDocumento?: string; clienteNumeroDocumento?: string; clienteNombre?: string;
  medioPago: string; condicionPago?: "CONTADO" | "CREDITO"; importePagoInicial?: string; fechaVencimientoPago?: string; cuotasPago?: { cuota: number; fechaDePago: string; importe: string }[]; observacion?: string; detalles: LineaIngreso[];
};
export type IngresoCreado = { id: string; codigo: string; tipoComprobante?: "BOLETA" | "FACTURA" | "NOTA_VENTA"; condicionPago?: "CONTADO" | "CREDITO"; medioPago?: string; importePagoInicial?: string; total: string; igv: string; subtotal: string; estado: string; archivos?: { guardados: { id: string; tipo: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] }; nubefact?: { estado: "EMITIDO" | "PENDIENTE" | "ERROR"; serie: string; numero: number; codigo: string; enlace?: string; enlacePdf?: string; archivos?: { guardados: { id: string; tipo: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] }; mensaje?: string } | null };
export type VentaMototaxiDetalle = { id: string; ingresoId: string; modeloId: string | null; descripcion: string; cantidad: string; garantiaAplicada: { id: string; iniciaEn: string; terminaEn: string; mesesVigencia: number; cantidad: number; alcance: string; exclusiones: string | null } | null };
export type VentaListado = { id: string; codigoVenta: string; codigoComprobante: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; clienteNombre: string | null; clienteNumeroDocumento: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; subtotal?: string; igv?: string; tasaIgv?: string; total: string; saldoPendiente?: string; estado: string; estadoProveedor: string; estadoAnulacion: string | null; motivoAnulacion: string | null; detalleProveedor: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null; lineasImpresion?: Array<{ descripcion: string; cantidad: string; precioUnitario: string; total: string }>; mototaxis?: VentaMototaxiDetalle[] };
export type NotaRelacionada = { id: string; tipoComprobante: "NOTA_CREDITO" | "NOTA_DEBITO"; codigoComprobante: string; codigoMotivo: number; motivo: string; fecha: string; total: string; estado: string; estadoAnulacion: string | null; motivoAnulacion: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null };
export type ResultadoAnulacion = { estado: "ANULADO" | "ANULACION_PENDIENTE" | "RECHAZADO"; motivo?: string; detalle?: string | null; ticket?: string | null; mensaje?: string };
export type LineaFuenteNota = { id: string; tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; codigo: string | null; descripcion: string; cantidad: string; unidad: string | null; precioUnitario: string; subtotal: string; igv: string; total: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; creditoAplicado: string; saldoParaCredito: string };
export type FuenteNota = { id: string; codigo: string; tipoComprobante: "BOLETA" | "FACTURA"; fecha: string; clienteNombre: string | null; clienteNumeroDocumento: string | null; total: string; moneda: "PEN"; lineas: LineaFuenteNota[] };
export type EstadoFiltroVenta = "TODAS" | "EMITIDAS" | "PENDIENTES" | "RECHAZADAS" | "ANULADAS";
export type ConteosVentas = { todas: number; emitidas: number; pendientes: number; rechazadas: number; anuladas: number; conSaldo?: number };
export type PaginaVentas = { items: VentaListado[]; pagina: number; porPagina: number; total: number; totalPaginas: number; conteos?: ConteosVentas };
export type EstadoNubefact = { regimenTributario: "NRUS" | "RER" | "RMT" | "GENERAL"; credencialesConfiguradas: boolean; seriesConfiguradas: boolean; emisionHabilitada: boolean; serieFacturaConfigurada: boolean; emisionFacturaHabilitada: boolean };
export type GuiaRemision = { id: string; tipo: "REMITENTE" | "TRANSPORTISTA"; fecha: string; codigo: string; ingresoId?: string | null; clienteNombre?: string | null; comprobanteOrigen?: { codigo: string; tipo: string } | null; estado: string; detalle: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null };
export type UbigeoPeru = { codigo: string; departamento: string; provincia: string; distrito: string };
export type DocumentoOrigenGuia = { id: string; codigo: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; estado: string; clienteNombre: string | null; clienteNumeroDocumento: string | null; total: string };
export type DetalleDocumentoGuia = { id: string; tipo: "PRODUCTO" | "MOTOTAXI"; codigo: string | null; descripcion: string; unidad: string | null; cantidad: string };
export type DocumentoGuia = { id: string; codigo: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; clienteId: string; clienteNombreCompleto: string; clienteTipoDocumento: string; clienteNumeroDocumento: string; clienteDireccion: string; detalles: DetalleDocumentoGuia[] };
export type GrupoGuiasRemision = "TODAS" | "EMITIDAS" | "PENDIENTES" | "RECHAZADAS";
export type PaginaGuiasRemision = { items: GuiaRemision[]; pagina: number; porPagina: number; total: number; totalPaginas: number; conteos: Record<"todas" | "emitidas" | "pendientes" | "rechazadas", number> };
export type NumeracionesIngreso = { BOLETA: { serie: string | null; numero: number | null; codigo: string | null }; FACTURA: { serie: string | null; numero: number | null; codigo: string | null }; NOTA_VENTA: { serie: string | null; numero: number | null; codigo: string | null }; ORDEN_SERVICIO: { serie: string | null; numero: number | null; codigo: string | null }; COTIZACION: { aplicaIgv?: boolean; serie: string | null; numero: number | null; codigo: string | null }; GUIA_REMITENTE: { serie: string | null; numero: number | null; codigo: string | null } };
export type DatosPagoIngreso = { idempotencyKey: string; fechaPago: string; importeAplicado: string; medioPago: string; cuentaFinancieraId: string; referenciaPago?: string; observacion?: string };
export type MedioPagoDisponible = { codigo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "BILLETERA_DIGITAL"; nombre: string };
export type PagoIngreso = { id: string; fechaPago: string; importeAplicado: string; medioPago: string; cuentaFinancieraId?: string | null; cuentaFinancieraNombre?: string | null; observacion?: string | null };
export type TrazabilidadPagosIngreso = { items: PagoIngreso[]; importeAplicadoTotal: string; saldoPendiente: string };
export type IdentificadorCliente = { tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string };
export type ClienteRegistrado = { id: string; tipoPersona: "NATURAL" | "JURIDICA"; tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string; documentos?: IdentificadorCliente[]; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; fechaNacimiento: string | null; razonSocial: string | null; nombreComercial: string | null; contactoNombre: string | null; correo: string | null; telefono: string | null; direccion: string | null; direccionEntrega: string | null; observacion: string | null };
export type PaginaClientes = { items: ClienteRegistrado[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type DatosClienteNuevo = { tipoPersona?: "NATURAL" | "JURIDICA"; tipoDocumento: "DNI" | "RUC" | "CE" | "PASAPORTE"; numeroDocumento: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; fechaNacimiento?: string; razonSocial?: string; nombreComercial?: string; contactoNombre?: string; correo?: string; telefono?: string; direccion?: string; direccionEntrega?: string; observacion?: string };
export type OrdenServicio = { id: string; codigo: string; clienteId: string; clienteNombre: string; clienteTelefono: string | null; clienteCorreo: string | null; vehiculoPlaca: string; trabajadorResponsableId: string | null; responsableNombre?: string | null; condicionRecepcion: string | null; motivo: string; adelanto: string; adelantoMedioPago: string | null; adelantoCuentaFinancieraId: string | null; diagnostico: string | null; detalles: Record<string, unknown>[]; notasTrabajo: { fecha: string; texto: string; usuarioId: string }[]; estado: "ABIERTA" | "EN_PROCESO" | "ESPERANDO_REPUESTOS" | "COMPLETADA" | "EMITIENDO" | "FACTURADA" | "ANULADA"; fechaRecepcion: string; fechaAcabado: string | null; fechaCierre: string | null; ingresoId: string | null };
export type Cotizacion = { id: string; codigo: string; aplicaIgv?: boolean; clienteId: string | null; clienteNombre: string | null; detalles: Record<string, unknown>[]; observacion: string | null; estado: "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA" | "VENCIDA" | "CONVERTIDA" | "ANULADA"; fecha: string; vigenteHasta: string | null; ingresoId: string | null; ingresoEstado?: string | null; ingresoTipoComprobante?: "BOLETA" | "FACTURA" | "NOTA_VENTA" | null };
export type LineaNotaVentaEditable = { id: string; tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; presentacionId: string | null; mototaxiModeloId: string | null; codigoProducto: string | null; descripcion: string; presentacion: string | null; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; total: string; bloqueo: string | null };
export type NotaVentaEditable = { id: string; codigo: string; fecha: string; clienteId: string | null; clienteNombre: string | null; clienteNumeroDocumento: string | null; medioPago: string; observacion: string | null; total: string; importePagado: string; versionDocumento: string; editable: boolean; motivoNoEditable: string | null; detalles: LineaNotaVentaEditable[] };
export type DatosEdicionNotaVenta = { versionDocumento: string; fecha: string; clienteId?: string; medioPago: string; observacion: string | null; confirmarDevolucionExceso?: boolean; detalles: { id?: string; tipo: LineaNotaVentaEditable["tipo"]; presentacionId?: string; mototaxiModeloId?: string; descripcion?: string; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: LineaNotaVentaEditable["afectacionIgv"] }[] };
export type ResultadoEdicionNotaVenta = { sinCambios: boolean; cambios: string[]; nota: NotaVentaEditable };
export type { IdentidadConsultada } from "./identidad.service";

export const servicioIngresos = {
  listarGuias(pagina = 1, porPagina = 10, grupo: GrupoGuiasRemision = "TODAS", busqueda = "") {
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), ...(grupo === "TODAS" ? {} : { estado: grupo }), ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}) });
    return solicitarApi<PaginaGuiasRemision>(`/ingresos/guias?${consulta}`);
  },
  listarUbigeos() { return solicitarApi<UbigeoPeru[]>("/ingresos/ubigeos"); },
  buscarDocumentosParaGuia(busqueda: string, tipo: DocumentoOrigenGuia["tipoComprobante"] | "", signal: AbortSignal) {
    const consulta = new URLSearchParams({ busqueda });
    if (tipo) consulta.set("tipo", tipo);
    return solicitarApi<DocumentoOrigenGuia[]>(`/ingresos/guias/documentos?${consulta}`, { signal });
  },
  obtenerDocumentoParaGuia(id: string) { return solicitarApi<DocumentoGuia>(`/ingresos/guias/documentos/${encodeURIComponent(id)}`); },
  emitirGuia(datos: Record<string, unknown>) {
    return solicitarApi<{ id: string; tipo: "REMITENTE" | "TRANSPORTISTA"; codigo: string; estado: string; mensaje?: string | null }>("/ingresos/guias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  consultarGuia(id: string) {
    return solicitarApi<GuiaRemision>(`/ingresos/guias/${encodeURIComponent(id)}/consultar`, { method: "POST" });
  },
  mediosPagoDisponibles: () => solicitarApi<MedioPagoDisponible[]>("/ingresos/medios-pago"),
  listarOrdenesServicio(busqueda = "") { return solicitarApi<OrdenServicio[]>(`/ingresos/ordenes-servicio?busqueda=${encodeURIComponent(busqueda)}`); },
  crearOrdenServicio(datos: Record<string, unknown>) { return solicitarApi<OrdenServicio>("/ingresos/ordenes-servicio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  actualizarOrdenServicio(id: string, datos: Record<string, unknown>) { return solicitarApi<OrdenServicio>(`/ingresos/ordenes-servicio/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  emitirOrdenServicio(id: string, datos: { tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; medioPago: string; ingresoId?: string; saldoCuentaFinancieraId?: string }) { return solicitarApi<{ ordenId: string; ingreso: IngresoCreado }>(`/ingresos/ordenes-servicio/${encodeURIComponent(id)}/emitir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  listarCotizaciones(busqueda = "") { return solicitarApi<Cotizacion[]>(`/ingresos/cotizaciones?busqueda=${encodeURIComponent(busqueda)}`); },
  crearCotizacion(datos: Record<string, unknown>) { return solicitarApi<Cotizacion>("/ingresos/cotizaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  actualizarCotizacion(id: string, datos: Record<string, unknown>) { return solicitarApi<Cotizacion>(`/ingresos/cotizaciones/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  cambiarEstadoCotizacion(id: string, estado: string) { return solicitarApi<Cotizacion>(`/ingresos/cotizaciones/${encodeURIComponent(id)}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) }); },
  convertirCotizacion(id: string, datos: { tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; medioPago: string }) { return solicitarApi<{ cotizacionId: string; ingreso: IngresoCreado }>(`/ingresos/cotizaciones/${encodeURIComponent(id)}/convertir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  listarVentas(tipoVenta: "REPUESTOS" | "MOTOTAXIS", pagina = 1, porPagina = 10, busqueda = "", tipoDocumento = "", medioPago = "", estado: EstadoFiltroVenta = "TODAS", conSaldo = false) {
    const consulta = new URLSearchParams({ tipoVenta, pagina: String(pagina), porPagina: String(porPagina), busqueda, tipoDocumento, medioPago, estado, conSaldo: String(conSaldo) });
    return solicitarApi<PaginaVentas>(`/ingresos?${consulta}`);
  },
  reintentarEmision(ingresoId: string) {
    return solicitarApi<{ estado: "EMITIDO" | "ERROR" | "PENDIENTE"; serie?: string; numero?: number; codigo?: string; mensaje?: string }>(`/ingresos/${encodeURIComponent(ingresoId)}/reintentar-emision`, { method: "POST" });
  },
  consultarEstadoComprobante(ingresoId: string) {
    return solicitarApi<{ estadoProveedor: string; detalleProveedor: string | null; respuestaHttp: number; consultadoEn: string }>(`/ingresos/${encodeURIComponent(ingresoId)}/consultar-estado`, { method: "POST" });
  },
  listarNotas(ingresoId: string) { return solicitarApi<NotaRelacionada[]>(`/ingresos/${encodeURIComponent(ingresoId)}/notas`); },
  anularIngreso(ingresoId: string, motivo: string, confirmoNoEntregado: boolean) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/anulacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo, confirmoNoEntregado }) }); },
  anularNotaVenta(ingresoId: string, motivo: string) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/anulacion-interna`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo }) }); },
  obtenerNotaVenta(ingresoId: string) { return solicitarApi<NotaVentaEditable>(`/ingresos/${encodeURIComponent(ingresoId)}/nota-venta`); },
  editarNotaVenta(ingresoId: string, datos: DatosEdicionNotaVenta) { return solicitarApi<ResultadoEdicionNotaVenta>(`/ingresos/${encodeURIComponent(ingresoId)}/nota-venta`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  consultarAnulacionIngreso(ingresoId: string) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/anulacion/consultar`, { method: "POST" }); },
  anularNota(ingresoId: string, notaId: string, motivo: string, confirmoNoEntregado: boolean) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/${encodeURIComponent(notaId)}/anulacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo, confirmoNoEntregado }) }); },
  consultarAnulacionNota(ingresoId: string, notaId: string) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/${encodeURIComponent(notaId)}/anulacion/consultar`, { method: "POST" }); },
  fuenteNota(ingresoId: string) { return solicitarApi<FuenteNota>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/fuente`); },
  emitirNota(ingresoId: string, datos: { tipo: "NOTA_CREDITO" | "NOTA_DEBITO"; lineas: { detalleId: string; monto: string }[]; cuentaFinancieraId: string; medioPago: string; observacion?: string }) {
    return solicitarApi<{ id: string; tipoComprobante: "NOTA_CREDITO" | "NOTA_DEBITO"; codigoComprobante: string; estado: string }>(`/ingresos/${encodeURIComponent(ingresoId)}/notas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  estadoNubefact() { return solicitarApi<EstadoNubefact>("/ingresos/nubefact/estado"); },
  numeraciones() { return solicitarApi<NumeracionesIngreso>("/ingresos/series"); },
  buscarProductos(busqueda: string, catalogo = false, escaneo = false, paraVenta = false) {
    return solicitarApi<ProductoParaIngreso[]>(`/ingresos/productos?busqueda=${encodeURIComponent(busqueda)}&limite=10${catalogo ? "&catalogo=1" : ""}${escaneo ? "&escaneo=1" : ""}${paraVenta ? "&paraVenta=1" : ""}`);
  },
  buscarMototaxis(busqueda: string) { return solicitarApi<MototaxiParaIngreso[]>(`/ingresos/mototaxis?busqueda=${encodeURIComponent(busqueda)}`); },
  buscarClientes(busqueda: string) {
    return solicitarApi<ClienteRegistrado[]>(`/ingresos/clientes?busqueda=${encodeURIComponent(busqueda)}`);
  },
  listarClientes(pagina = 1, porPagina = 10, busqueda = "") {
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaClientes>(`/ingresos/clientes/listado?${consulta}`);
  },
  consultarIdentidadCliente(tipoDocumento: "DNI" | "RUC", numeroDocumento: string) {
    return servicioIdentidad.consultar(tipoDocumento, numeroDocumento);
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
  /** Cobro repartido en varias cuentas (sin repetir cuenta); el efectivo puede indicar lo recibido para el vuelto. */
  registrarCobroDividido(ingresoId: string, datos: { idempotencyKey: string; fechaPago: string; partes: { medioPago: string; cuentaFinancieraId: string; importeAplicado: string; importeRecibido?: string }[] }) { return solicitarApi<PagoIngreso[]>(`/ingresos/${encodeURIComponent(ingresoId)}/cobros`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  registrarPago(ingresoId: string, datos: DatosPagoIngreso) { return solicitarApi<PagoIngreso>(`/ingresos/${encodeURIComponent(ingresoId)}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
};
