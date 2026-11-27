import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { servicioIngresos, type ClienteRegistrado, type MedioPagoDisponible } from "../../services/ingresos.service";
import { useAltaRapidaRepuesto } from "../../components/productos/use-alta-rapida-repuesto";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import { useNuevoIngresoTransferencia } from "../../hooks/use-nuevo-ingreso-transferencia";
import type { TipoVenta } from "../../types/nuevo-ingreso";
import type { CotizacionTransferida, OrdenServicioTransferida } from "../../types/nuevo-ingreso-transferencia";
import { urlApi } from "../../services/api-cliente";
import { PagoIngresoDialog } from "../../components/ingresos/pago-ingreso-dialog/pago-ingreso-dialog";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { documentoDeIngreso } from "../../impresion/servicio-impresion";
import type { ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { ClienteDetalleDialog } from "./cliente-detalle-dialog";
import { NuevaVentaEditor } from "./nueva-venta-editor";
import { CatalogoVenta } from "./catalogo-venta";
import { useNuevoIngresoClienteForm } from "./use-nuevo-ingreso-cliente-form";
import { useNuevoIngresoCatalogo } from "./use-nuevo-ingreso-catalogo";
import { obtenerVistaNuevoIngreso } from "./obtener-vista-nuevo-ingreso";
import { SelectorClienteVenta } from "./selector-cliente-venta";
import { fechaHoyPeru, soles } from "./nuevo-ingreso-formatters";

export function NuevoIngresoPage({ tipoVenta = "REPUESTOS", permisos = [] }: { tipoVenta?: TipoVenta; permisos?: string[] }) {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const venta = useNuevoIngreso(tipoVenta);
  const formularioCliente = useNuevoIngresoClienteForm(venta);
  const transferenciaCotizacion = (ubicacion.state as { cotizacion?: CotizacionTransferida } | null)?.cotizacion ?? null;
  const transferenciaOS = (ubicacion.state as { ordenServicio?: OrdenServicioTransferida } | null)?.ordenServicio ?? null;
  const [cuentaSaldoOS, setCuentaSaldoOS] = useState("");
  const [medioSaldoOS, setMedioSaldoOS] = useState("EFECTIVO");
  const [cuentaPagoId, setCuentaPagoId] = useState("");
  const [confirmarDescarteVenta, setConfirmarDescarteVenta] = useState(false);
  const imprimirAlEmitir = useImprimirAlEmitir(useAlertas());
  const [intentoIdentificacionComprobante, setIntentoIdentificacionComprobante] = useState(false);
  const [clienteEnDetalle, setClienteEnDetalle] = useState<ClienteRegistrado | null>(null);
  const [numeraciones, setNumeraciones] = useState<Awaited<ReturnType<typeof servicioIngresos.numeraciones>> | null>(null);
  const [mediosPagoDisponibles, setMediosPagoDisponibles] = useState<MedioPagoDisponible[]>([]);
  const [cargandoMediosPago, setCargandoMediosPago] = useState(true);
  const [errorMediosPago, setErrorMediosPago] = useState("");
  const [mostrarCobranza, setMostrarCobranza] = useState(false);
  const [cobranzaContadoRegistradaId, setCobranzaContadoRegistradaId] = useState<string | null>(null);
  const catalogo = useNuevoIngresoCatalogo(venta);
  const { buscarProductoConEnter } = catalogo;
  const altaRepuesto = useAltaRapidaRepuesto({ busqueda: venta.busqueda, alCrear: (producto) => { venta.agregarProducto(producto); venta.setBusqueda(""); }, alError: venta.setError });
  const transferencia = useNuevoIngresoTransferencia({
    venta,
    tipoVenta,
    cotizacion: transferenciaCotizacion,
    ordenServicio: transferenciaOS,
    cuentaSaldo: cuentaSaldoOS,
    medioSaldo: medioSaldoOS,
    setCuentaSaldo: setCuentaSaldoOS,
    setMedioSaldo: setMedioSaldoOS,
    setTipoDocumentoBusqueda: formularioCliente.setTipoDocumentoBusqueda,
    mediosPagoDisponibles,
  });
  const actualizar = (campo: string, valor: string) => venta.actualizarCampoNubefact(campo, valor);
  const { cargandoOS, vinculandoOS, ordenVinculadaOS, saldoOrdenServicio, medioAdelantoOrden } = transferencia;
  const vista = obtenerVistaNuevoIngreso(venta, numeraciones, transferenciaOS, cobranzaContadoRegistradaId);
  const { esFactura, esNotaVenta, nombreCliente, numeroDocumento, tipoDocumento, identificacionFacturaPendiente, identificacionBoletaPendiente, identificacionComprobantePendiente, lineasOrdenadas, numeracionActual, cpeEmitido, enlaceNotaVenta, contadoEmitido, pagoInicialCreditoPendiente, cobranzaContadoPendiente } = vista;


  useEffect(() => {
    if (cobranzaContadoPendiente) setMostrarCobranza(true);
  }, [cobranzaContadoPendiente]);

  function cargarNumeraciones() { void servicioIngresos.numeraciones().then(setNumeraciones).catch(() => undefined); }
  useEffect(() => { let vigente = true; void servicioIngresos.numeraciones().then((data) => { if (vigente) setNumeraciones(data); }).catch(() => undefined); return () => { vigente = false; }; }, []);
  useEffect(() => {
    let vigente = true;
    void servicioIngresos.mediosPagoDisponibles().then((medios) => { if (vigente) { setMediosPagoDisponibles(medios); setErrorMediosPago(""); } })
      .catch(() => { if (vigente) setErrorMediosPago("No se pudieron cargar los medios de pago de Tesorería."); })
      .finally(() => { if (vigente) setCargandoMediosPago(false); });
    return () => { vigente = false; };
  }, []);
  useEffect(() => {
    if (mediosPagoDisponibles.length && !mediosPagoDisponibles.some((medio) => medio.codigo === venta.medioPago)) venta.setMedioPago(mediosPagoDisponibles[0].codigo);
  }, [mediosPagoDisponibles, venta.medioPago]);

  function limpiarVenta() {
    venta.lineas.forEach((linea) => venta.quitarLinea(linea.clave));
    venta.quitarCliente();
    venta.setBusqueda("");
    venta.setObservacion("");
    const fechaNueva = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    venta.setFecha(fechaNueva);
    venta.actualizarCampoNubefact("fecha_de_emision", fechaNueva);
    venta.setMedioPago("EFECTIVO");
    setCuentaPagoId("");
    venta.setTipoComprobante("BOLETA");
    venta.reiniciarIdempotencia();
    cargarNumeraciones();
    venta.setError("");
    venta.setExito(null);
    formularioCliente.limpiarFormularioCliente();
  }

  function cancelarVenta() {
    const tieneDatos = venta.lineas.length > 0 || Boolean(venta.clienteSeleccionado) || Boolean(venta.busqueda.trim()) || Boolean(venta.busquedaMototaxi.trim()) || Boolean(venta.busquedaCliente.trim()) || Boolean(venta.observacion.trim()) || Boolean(cuentaPagoId) || venta.fecha !== fechaHoyPeru() || venta.tipoComprobante !== "BOLETA" || venta.condicionPago !== "CONTADO" || venta.medioPago !== "EFECTIVO" || Boolean(venta.importePagoInicial.trim()) || venta.cuotasNubefact.some((cuota) => Boolean(cuota.importe.trim())) || [venta.camposNubefact.cliente_numero_de_documento, venta.camposNubefact.cliente_denominacion, venta.camposNubefact.cliente_direccion].some((valor) => String(valor ?? "").trim() !== "");
    if (tieneDatos) { setConfirmarDescarteVenta(true); return; }
    navegar(tipoVenta === "MOTOTAXIS" ? "/ingresos/ventas/mototaxis" : "/ingresos/ventas/repuestos");
  }

  function descartarVentaYVolver() {
    setConfirmarDescarteVenta(false);
    limpiarVenta();
    navegar(tipoVenta === "MOTOTAXIS" ? "/ingresos/ventas/mototaxis" : "/ingresos/ventas/repuestos");
  }

  function cambiarTipoComprobante(tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") {
    setIntentoIdentificacionComprobante(false);
    venta.setTipoComprobante(tipo);
    if (tipo === "FACTURA") {
      formularioCliente.setTipoDocumentoBusqueda("06");
      if (String(venta.camposNubefact.cliente_tipo_de_documento ?? "") !== "6") venta.quitarCliente();
    } else if (tipo === "BOLETA") formularioCliente.setTipoDocumentoBusqueda("01");
    venta.reiniciarIdempotencia();
    venta.setExito(null);
  }

  const facturaSinConfigurar = esFactura && !venta.estadoNubefact?.emisionFacturaHabilitada;
  const saldoOSSinCuenta = Boolean(transferenciaOS && venta.totales.total > Number(transferenciaOS.adelanto || 0) && !cuentaSaldoOS);
  const nombreDocumento = esFactura ? "factura" : esNotaVenta ? "nota de venta" : "boleta";
  const etiquetaGuardar = venta.exito ? (esNotaVenta ? "Nota de venta registrada" : cpeEmitido ? "Comprobante emitido" : "Emisión no confirmada")
    : venta.guardando ? (esFactura ? "Emitiendo factura…" : esNotaVenta ? "Registrando nota de venta…" : "Emitiendo boleta…")
    : `Imprimir ${nombreDocumento}`;

  /** Valida, pide la impresora en el mismo clic, emite y luego imprime el ticket oficial. */
  function emitirEImprimir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (venta.exito || venta.guardando) return;
    if (!evento.currentTarget.reportValidity()) return;
    if (!venta.lineas.length) { venta.setError(tipoVenta === "MOTOTAXIS" ? "Agrega al menos una mototaxi para continuar." : "Agrega al menos un repuesto o servicio para continuar."); return; }
    if (cargandoMediosPago) { venta.setError("Espera a que se carguen las cuentas de pago de Tesorería."); return; }
    if (errorMediosPago || mediosPagoDisponibles.length === 0) { venta.setError(errorMediosPago || "No hay cuentas activas en soles. Configura una caja o cuenta en Tesorería para registrar la venta."); return; }
    if (venta.tipoComprobante === "NOTA_VENTA" && !venta.clienteSeleccionado) { venta.setError("Selecciona al cliente que recibe los artículos para registrar la nota de venta."); return; }
    if (identificacionComprobantePendiente) { setIntentoIdentificacionComprobante(true); return; }
    setIntentoIdentificacionComprobante(false);
    venta.setError("");
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { venta.setError(mensajeErrorImpresion(problema)); return; }
      const resultado = await venta.guardar(evento);
      if (!resultado) return;
      if (resultado.tipoComprobante === "NOTA_VENTA" || resultado.nubefact?.estado === "EMITIDO") await imprimirAlEmitir.imprimir(documentoDeIngreso({ ingresoId: resultado.id }), preparada);
    })();
  }

  const avisos = <>
    {venta.error && <NotificacionFlotante mensaje={venta.error} onCerrar={() => venta.setError("")} />}
    {formularioCliente.busquedaSinResultados && formularioCliente.mostrarNotificacionSinCliente && <NotificacionFlotante tipo="error" titulo="Cliente no encontrado" mensaje={`No se encontró un cliente con ${formularioCliente.tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"} ${venta.busquedaCliente.trim()}. Puedes registrarlo para usarlo en esta venta.`} duracionMs={0} accion={{ etiqueta: "Crear cliente", ejecutar: formularioCliente.abrirRegistroCliente }} onCerrar={() => formularioCliente.setMostrarNotificacionSinCliente(false)} />}
    {venta.exito && <NotificacionFlotante
      tipo={cpeEmitido || venta.exito.tipoComprobante === "NOTA_VENTA" ? "exito" : "advertencia"}
      mensaje={venta.exito.tipoComprobante === "NOTA_VENTA" ? `Nota de venta ${venta.exito.codigo} registrada.` : cpeEmitido ? `Comprobante ${venta.exito.nubefact?.codigo ?? venta.exito.codigo} emitido.` : `Venta ${venta.exito.codigo} registrada. NubeFact aún no confirma la emisión.`}
    />}
    {cobranzaContadoPendiente && venta.exito && <NotificacionFlotante tipo="advertencia" mensaje={`Registra en cobranza ${contadoEmitido ? "el pago completo al contado" : `la inicial de ${soles(Number(venta.exito.importePagoInicial))}`}.`} accion={{ etiqueta: "Completar pago", ejecutar: () => setMostrarCobranza(true) }} />}
    {(errorMediosPago || (!cargandoMediosPago && mediosPagoDisponibles.length === 0)) && <NotificacionFlotante mensaje={errorMediosPago || "No hay cuentas activas en soles. Configura una caja o cuenta bancaria en Tesorería."} />}
  </>;

  const ventaRegistrada = venta.exito && <section className={`venta-registrada${cpeEmitido || venta.exito.tipoComprobante === "NOTA_VENTA" ? "" : " es-pendiente"}`} aria-label="Detalle de la venta registrada">
    <strong>{venta.exito.tipoComprobante === "NOTA_VENTA" ? "Nota de venta registrada" : "Venta registrada"}: {venta.exito.nubefact?.codigo ?? venta.exito.codigo}</strong>
    {venta.exito.tipoComprobante === "NOTA_VENTA" ? <span>Salida de inventario registrada. {enlaceNotaVenta ? <a href={urlApi(enlaceNotaVenta)} target="_blank" rel="noreferrer">Abrir nota</a> : venta.exito.archivos?.errores.length ? `No se pudo archivar la nota: ${venta.exito.archivos.errores[0].mensaje}` : null}</span>
      : cpeEmitido ? (venta.exito.nubefact?.enlacePdf ? <a href={venta.exito.nubefact.enlacePdf.startsWith("/") ? urlApi(venta.exito.nubefact.enlacePdf) : venta.exito.nubefact.enlacePdf} target="_blank" rel="noreferrer">Abrir comprobante</a> : venta.exito.nubefact?.enlace ? <a href={venta.exito.nubefact.enlace} target="_blank" rel="noreferrer">Ver comprobante</a> : null)
      : <span>NubeFact no confirmó la emisión: {venta.exito.nubefact?.mensaje || "revisa el estado del comprobante en el listado antes de volver a intentarlo."}</span>}
    {cobranzaContadoPendiente && <span>Pago pendiente de registrar en cobranza.</span>}
    {transferenciaOS && ordenVinculadaOS && <span>Orden de servicio {transferenciaOS.codigo} vinculada. Adelanto y saldo quedaron registrados.</span>}
    <div className="venta-registrada-acciones">
      {(venta.exito.tipoComprobante === "NOTA_VENTA" || cpeEmitido) && <MenuImpresion origen={{ ingresoId: venta.exito.id }} codigo={venta.exito.nubefact?.codigo ?? venta.exito.codigo} />}
      {cpeEmitido && <button type="button" onClick={() => setMostrarCobranza(true)}>{cobranzaContadoPendiente ? "Completar pago" : "Registrar / ver pagos"}</button>}
      <button type="button" disabled={cobranzaContadoPendiente} title={cobranzaContadoPendiente ? "Completa el pago antes de iniciar otra venta." : undefined} onClick={limpiarVenta}>Nueva venta</button>
    </div>
  </section>;

  return <>
    <NuevaVentaEditor
      venta={venta}
      tipoVenta={tipoVenta}
      etiquetaNumero={venta.exito ? "NÚMERO ASIGNADO" : esNotaVenta ? "N.° DE NOTA" : esFactura ? "N.° DE FACTURA" : "N.° DE BOLETA"}
      numero={venta.exito ? (venta.exito.nubefact?.codigo ?? venta.exito.codigo) : numeracionActual || (numeraciones ? "FALTA CONFIGURAR SERIE" : "Cargando correlativo…")}
      fecha={String(venta.camposNubefact.fecha_de_emision ?? venta.fecha)}
      fechaMaxima={fechaHoyPeru()}
      onFechaChange={(fecha) => { actualizar("fecha_de_emision", fecha); venta.setFecha(fecha); }}
      onTipoComprobanteChange={cambiarTipoComprobante}
      selectorCliente={<SelectorClienteVenta venta={venta} formulario={formularioCliente} esFactura={esFactura} nombreCliente={nombreCliente} numeroDocumento={numeroDocumento} tipoDocumento={tipoDocumento} intentoIdentificacion={intentoIdentificacionComprobante} identificacionFacturaPendiente={identificacionFacturaPendiente} identificacionBoletaPendiente={identificacionBoletaPendiente} onVerDetalle={setClienteEnDetalle} />}
      catalogo={<CatalogoVenta venta={venta} tipoVenta={tipoVenta} onCrearRepuesto={permisos.includes("INVENTARIO.CREAR") ? () => void altaRepuesto.abrir() : undefined} onKeyDownBusquedaRepuesto={buscarProductoConEnter} />}
      puedeAgregarServicio={tipoVenta === "REPUESTOS" && permisos.includes("INGRESOS.SERVICIO_PRECIO_MANUAL")}
      lineas={lineasOrdenadas}
      avisos={avisos}
      etiquetaGuardar={etiquetaGuardar}
      guardando={venta.guardando}
      guardarDeshabilitado={venta.guardando || cargandoOS || vinculandoOS || !venta.lineas.length || Boolean(venta.exito) || saldoOSSinCuenta || facturaSinConfigurar}
      tituloGuardar={facturaSinConfigurar ? "Configura la conexión de NubeFact y la serie de facturas en el servidor." : undefined}
      onSubmit={emitirEImprimir}
      onCancelar={venta.exito ? () => navegar(tipoVenta === "MOTOTAXIS" ? "/ingresos/ventas/mototaxis" : "/ingresos/ventas/repuestos") : cancelarVenta}
      resumen={<>
        {transferenciaOS && <div className="venta-saldo-os"><strong>Saldo a pagar {soles(saldoOrdenServicio)}</strong><small>Adelanto: {soles(Number(transferenciaOS.adelanto || 0))} · {Number(transferenciaOS.adelanto || 0) > 0 ? medioAdelantoOrden : "Sin adelanto"}</small></div>}
        {!venta.exito && (transferenciaOS ? <SelectorCuentaFinanciera value={cuentaSaldoOS} medioActual={medioSaldoOS} etiqueta="Cuenta para completar el pago" onChange={(id, medio) => { setCuentaSaldoOS(id); setMedioSaldoOS(medio); venta.setMedioPago(medio); }} required={saldoOrdenServicio > 0} /> : <SelectorCuentaFinanciera value={cuentaPagoId} medioActual={venta.medioPago} etiqueta="Cuenta donde se recibe el pago" onChange={(id, medio) => { setCuentaPagoId(id); venta.setMedioPago(medio); }} />)}
        {ventaRegistrada}
      </>}
    />
    {confirmarDescarteVenta && <ConfirmarDescarteFormulario elemento="esta venta" detalle="Si sales ahora, se perderán el cliente, los productos o servicios y los demás datos que ingresaste. ¿Quieres descartarla?" accion="Descartar y volver al listado" onSeguirEditando={() => setConfirmarDescarteVenta(false)} onDescartar={descartarVentaYVolver} />}
    {clienteEnDetalle && <ClienteDetalleDialog cliente={clienteEnDetalle} editable={permisos.includes("PERSONAS.EDITAR")} onClose={() => setClienteEnDetalle(null)} onSave={async (datos) => { const clienteActualizado = await servicioIngresos.actualizarCliente(clienteEnDetalle.id, datos); venta.actualizarClienteEnResultados(clienteActualizado); setClienteEnDetalle(clienteActualizado); }} />}
    {mostrarCobranza && venta.exito?.nubefact && venta.exito.tipoComprobante  && createPortal(<PagoIngresoDialog cuentaFinancieraInicialId={cuentaPagoId} ingresoId={venta.exito.id} total={venta.exito.total} contadoPendiente={contadoEmitido && cobranzaContadoPendiente} importeInicialObligatorio={pagoInicialCreditoPendiente && cobranzaContadoPendiente} fechaPagoInicial={venta.fecha} importeInicial={contadoEmitido ? venta.exito.total : venta.exito.importePagoInicial} medioPagoInicial={venta.exito.medioPago} onPaymentRecorded={() => { if (cobranzaContadoPendiente) setCobranzaContadoRegistradaId(venta.exito?.id ?? null); }} onClose={() => setMostrarCobranza(false)} />, document.body)}
    {altaRepuesto.dialogo}
  </>;
}
