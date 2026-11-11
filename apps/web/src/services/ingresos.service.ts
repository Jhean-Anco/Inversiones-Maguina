import { solicitarApi } from "./api-cliente";
import { servicioIdentidad } from "./identidad.service";

export type ProductoParaIngreso = {
  productoId: string; codigo: string; nombre: string; marca: string; rutaImagen: string | null; afectoIgv: boolean; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; presentacionId: string;
  presentacion: string; unidadCodigo: string; unidad: string; factorAUnidadBase: string; precio: string; stockBase: string;
  listaPrecioCodigo: string; listaPrecioNombre: string;
};
export type MototaxiParaIngreso = { mototaxiUnidadId: string; codigo: string; marca: string; modelo: string; version: string | null; precioVenta: string | null; vin: string; numeroMotor: string; color: string | null };
export type LineaIngreso =
  | { tipo: "PRODUCTO"; presentacionId: string; cantidad: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" }
  | { tipo: "SERVICIO"; descripcion: string; cantidad: string; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" }
  | { tipo: "MOTOTAXI"; mototaxiUnidadId: string; cantidad: "1"; precioUnitario: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" };
export type DatosNuevoIngreso = {
  idempotencyKey: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; clienteId?: string; clienteDireccion?: string; clienteTipoDocumento?: string; clienteNumeroDocumento?: string; clienteNombre?: string;
  medioPago: string; condicionPago?: "CONTADO" | "CREDITO"; importePagoInicial?: string; fechaVencimientoPago?: string; cuotasPago?: { cuota: number; fechaDePago: string; importe: string }[]; observacion?: string; detalles: LineaIngreso[];
};
export type IngresoCreado = { id: string; codigo: string; tipoComprobante?: "BOLETA" | "FACTURA" | "NOTA_VENTA"; condicionPago?: "CONTADO" | "CREDITO"; medioPago?: string; importePagoInicial?: string; total: string; igv: string; subtotal: string; estado: string; archivos?: { guardados: { id: string; tipo: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] }; nubefact?: { estado: "EMITIDO" | "PENDIENTE" | "ERROR"; serie: string; numero: number; codigo: string; enlace?: string; enlacePdf?: string; archivos?: { guardados: { id: string; tipo: string; ruta: string }[]; errores: { tipo: string; mensaje: string }[] }; mensaje?: string } | null };
export type VentaListado = { id: string; codigoVenta: string; codigoComprobante: string; fecha: string; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; clienteNombre: string | null; clienteNumeroDocumento: string | null; medioPago: string; condicionPago: "CONTADO" | "CREDITO"; total: string; estado: string; estadoProveedor: string; estadoAnulacion: string | null; motivoAnulacion: string | null; detalleProveedor: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null };
export type NotaRelacionada = { id: string; tipoComprobante: "NOTA_CREDITO" | "NOTA_DEBITO"; codigoComprobante: string; codigoMotivo: number; motivo: string; fecha: string; total: string; estado: string; estadoAnulacion: string | null; motivoAnulacion: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null };
export type ResultadoAnulacion = { estado: "ANULADO" | "ANULACION_PENDIENTE" | "RECHAZADO"; motivo?: string; detalle?: string | null; ticket?: string | null; mensaje?: string };
export type LineaFuenteNota = { id: string; tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; codigo: string | null; descripcion: string; cantidad: string; unidad: string | null; precioUnitario: string; subtotal: string; igv: string; total: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO"; creditoAplicado: string; saldoParaCredito: string };
export type FuenteNota = { id: string; codigo: string; tipoComprobante: "BOLETA" | "FACTURA"; fecha: string; clienteNombre: string | null; clienteNumeroDocumento: string | null; total: string; moneda: "PEN"; lineas: LineaFuenteNota[] };
export type PaginaVentas = { items: VentaListado[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type EstadoNubefact = { regimenTributario: "NRUS" | "RER" | "RMT" | "GENERAL"; credencialesConfiguradas: boolean; seriesConfiguradas: boolean; emisionHabilitada: boolean; serieFacturaConfigurada: boolean; emisionFacturaHabilitada: boolean };
export type GuiaRemision = { id: string; tipo: "REMITENTE" | "TRANSPORTISTA"; fecha: string; codigo: string; estado: string; detalle: string | null; enlacePdf: string | null; enlaceXml: string | null; enlaceCdr: string | null };
export type PaginaGuiasRemision = { items: GuiaRemision[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type NumeracionesIngreso = { BOLETA: { serie: string | null; numero: number | null; codigo: string | null }; FACTURA: { serie: string | null; numero: number | null; codigo: string | null }; NOTA_VENTA: { serie: string; numero: number; codigo: string } };
export type DatosPagoIngreso = { idempotencyKey: string; fechaPago: string; importeAplicado: string; medioPago: string; cuentaFinancieraId: string; referenciaPago?: string; observacion?: string };
export type MedioPagoDisponible = { codigo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "BILLETERA_DIGITAL"; nombre: string };
export type PagoIngreso = { id: string; fechaPago: string; importeAplicado: string; medioPago: string };
export type TrazabilidadPagosIngreso = { items: PagoIngreso[]; importeAplicadoTotal: string };
export type IdentificadorCliente = { tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string };
export type ClienteRegistrado = { id: string; tipoPersona: "NATURAL" | "JURIDICA"; tipoDocumento: "01" | "04" | "06" | "07"; numeroDocumento: string; documentos?: IdentificadorCliente[]; nombres: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; fechaNacimiento: string | null; razonSocial: string | null; nombreComercial: string | null; contactoNombre: string | null; correo: string | null; telefono: string | null; direccion: string | null; direccionEntrega: string | null; observacion: string | null };
export type PaginaClientes = { items: ClienteRegistrado[]; pagina: number; porPagina: number; total: number; totalPaginas: number };
export type DatosClienteNuevo = { tipoPersona?: "NATURAL" | "JURIDICA"; tipoDocumento: "DNI" | "RUC" | "CE" | "PASAPORTE"; numeroDocumento: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; fechaNacimiento?: string; razonSocial?: string; nombreComercial?: string; contactoNombre?: string; correo?: string; telefono?: string; direccion?: string; direccionEntrega?: string; observacion?: string };
export type OrdenServicio = { id: string; codigo: string; clienteId: string; clienteNombre: string; vehiculoPlaca: string; vehiculoVin: string | null; vehiculoMarca: string | null; vehiculoModelo: string | null; motivo: string; diagnostico: string | null; detalles: Record<string, unknown>[]; notasTrabajo: { fecha: string; texto: string; usuarioId: string }[]; estado: "ABIERTA" | "EN_PROCESO" | "ESPERANDO_REPUESTOS" | "COMPLETADA" | "EMITIENDO" | "FACTURADA" | "ANULADA"; fechaRecepcion: string; fechaCierre: string | null; ingresoId: string | null };
export type Cotizacion = { id: string; codigo: string; clienteId: string; clienteNombre: string; detalles: Record<string, unknown>[]; observacion: string | null; estado: "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA" | "VENCIDA" | "CONVERTIDA" | "ANULADA"; fecha: string; vigenteHasta: string | null; ingresoId: string | null };
export type { IdentidadConsultada } from "./identidad.service";

export const servicioIngresos = {
  listarGuias(pagina = 1, porPagina = 10) {
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina) });
    return solicitarApi<PaginaGuiasRemision>(`/ingresos/guias?${consulta}`);
  },
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
  emitirOrdenServicio(id: string, datos: { tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; medioPago: string }) { return solicitarApi<{ ordenId: string; ingreso: IngresoCreado }>(`/ingresos/ordenes-servicio/${encodeURIComponent(id)}/emitir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  listarCotizaciones(busqueda = "") { return solicitarApi<Cotizacion[]>(`/ingresos/cotizaciones?busqueda=${encodeURIComponent(busqueda)}`); },
  crearCotizacion(datos: Record<string, unknown>) { return solicitarApi<Cotizacion>("/ingresos/cotizaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  cambiarEstadoCotizacion(id: string, estado: string) { return solicitarApi<Cotizacion>(`/ingresos/cotizaciones/${encodeURIComponent(id)}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) }); },
  convertirCotizacion(id: string, datos: { tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; medioPago: string }) { return solicitarApi<{ cotizacionId: string; ingreso: IngresoCreado }>(`/ingresos/cotizaciones/${encodeURIComponent(id)}/convertir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
  listarVentas(tipoVenta: "REPUESTOS" | "MOTOTAXIS", pagina = 1, porPagina = 10, busqueda = "") {
    const consulta = new URLSearchParams({ tipoVenta, pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaVentas>(`/ingresos?${consulta}`);
  },
  listarNotas(ingresoId: string) { return solicitarApi<NotaRelacionada[]>(`/ingresos/${encodeURIComponent(ingresoId)}/notas`); },
  anularIngreso(ingresoId: string, motivo: string, confirmoNoEntregado: boolean) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/anulacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo, confirmoNoEntregado }) }); },
  consultarAnulacionIngreso(ingresoId: string) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/anulacion/consultar`, { method: "POST" }); },
  anularNota(ingresoId: string, notaId: string, motivo: string, confirmoNoEntregado: boolean) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/${encodeURIComponent(notaId)}/anulacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo, confirmoNoEntregado }) }); },
  consultarAnulacionNota(ingresoId: string, notaId: string) { return solicitarApi<ResultadoAnulacion>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/${encodeURIComponent(notaId)}/anulacion/consultar`, { method: "POST" }); },
  fuenteNota(ingresoId: string) { return solicitarApi<FuenteNota>(`/ingresos/${encodeURIComponent(ingresoId)}/notas/fuente`); },
  emitirNota(ingresoId: string, datos: { tipo: "NOTA_CREDITO" | "NOTA_DEBITO"; lineas: { detalleId: string; monto: string }[]; observacion?: string }) {
    return solicitarApi<{ id: string; tipoComprobante: "NOTA_CREDITO" | "NOTA_DEBITO"; codigoComprobante: string; estado: string }>(`/ingresos/${encodeURIComponent(ingresoId)}/notas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  },
  estadoNubefact() { return solicitarApi<EstadoNubefact>("/ingresos/nubefact/estado"); },
  numeraciones() { return solicitarApi<NumeracionesIngreso>("/ingresos/series"); },
  buscarProductos(busqueda: string, catalogo = false, escaneo = false) {
    return solicitarApi<ProductoParaIngreso[]>(`/ingresos/productos?busqueda=${encodeURIComponent(busqueda)}&limite=8${catalogo ? "&catalogo=1" : ""}${escaneo ? "&escaneo=1" : ""}`);
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
  registrarPago(ingresoId: string, datos: DatosPagoIngreso) { return solicitarApi<PagoIngreso>(`/ingresos/${encodeURIComponent(ingresoId)}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); },
};
