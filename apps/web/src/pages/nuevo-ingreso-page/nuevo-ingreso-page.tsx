import "./nuevo-ingreso-page.css";
import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useLocation, useNavigate } from "react-router-dom";
import { servicioIngresos, type ClienteRegistrado, type MedioPagoDisponible } from "../../services/ingresos.service";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import { useNuevoIngresoTransferencia } from "../../hooks/use-nuevo-ingreso-transferencia";
import type { TipoVenta } from "../../types/nuevo-ingreso";
import type { CotizacionTransferida, OrdenServicioTransferida } from "../../types/nuevo-ingreso-transferencia";
import { urlApi } from "../../services/api-cliente";
import { DesgloseImportes } from "../../components/ingresos/desglose-importes";
import { precioRepuestoEnLinea, importeLinea, subtotalSinIgv, TASA_IGV } from "../../domain/ingresos/importes-venta";
import { PagoIngresoDialog } from "../../components/ingresos/pago-ingreso-dialog/pago-ingreso-dialog";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ClienteDetalleDialog } from "./cliente-detalle-dialog";
import { NuevaVentaEditor } from "./nueva-venta-editor";
import { CatalogoVenta } from "./catalogo-venta";
import { useNuevoIngresoClienteForm } from "./use-nuevo-ingreso-cliente-form";
import { useNuevoIngresoCatalogo } from "./use-nuevo-ingreso-catalogo";
import { obtenerVistaNuevoIngreso } from "./obtener-vista-nuevo-ingreso";
import { SelectorClienteVenta } from "./selector-cliente-venta";
import { nuevoIngresoClasses } from "./nuevo-ingreso-classes";
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
  const [paso, setPaso] = useState<"datos" | "previa">("datos");
  const [confirmarDescarteVenta, setConfirmarDescarteVenta] = useState(false);
  const [tamano, setTamano] = useState<"A4" | "TICKET">("A4");
  const [intentoIdentificacionComprobante, setIntentoIdentificacionComprobante] = useState(false);
  const [clienteEnDetalle, setClienteEnDetalle] = useState<ClienteRegistrado | null>(null);
  const [numeraciones, setNumeraciones] = useState<Awaited<ReturnType<typeof servicioIngresos.numeraciones>> | null>(null);
  const [mediosPagoDisponibles, setMediosPagoDisponibles] = useState<MedioPagoDisponible[]>([]);
  const [cargandoMediosPago, setCargandoMediosPago] = useState(true);
  const [errorMediosPago, setErrorMediosPago] = useState("");
  const [mostrarCobranza, setMostrarCobranza] = useState(false);
  const [cobranzaContadoRegistradaId, setCobranzaContadoRegistradaId] = useState<string | null>(null);
  const catalogo = useNuevoIngresoCatalogo(venta);
  const { mostrarAltaProducto, setMostrarAltaProducto, catalogosAltaProducto, cargandoAltaProducto, errorAltaProducto, buscarProductoConEnter, abrirAltaProducto, guardarProductoDesdeVenta } = catalogo;
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
  const { esBoleta, esFactura, esNotaVenta, mostrarAfectacionIgv, presentacionComprobante, nombreCliente, numeroDocumento, tipoDocumento, identificacionFacturaPendiente, identificacionBoletaPendiente, identificacionComprobantePendiente, cantidadTotal, lineasOrdenadas, numeracionActual, cpeEmitido, enlaceNotaVenta, contadoEmitido, pagoInicialCreditoPendiente, cobranzaContadoPendiente } = vista;
  const ajustesIgvConocidos = esNotaVenta || venta.estadoNubefact !== null;
  const muestraBasesIgv = !esNotaVenta && venta.estadoNubefact !== null && venta.estadoNubefact.regimenTributario !== "NRUS";
  const importesVenta = {
    subtotal: venta.exito?.subtotal ?? (ajustesIgvConocidos ? subtotalSinIgv(venta.totales.total, venta.totales.igv) : null),
    igv: venta.exito?.igv ?? (ajustesIgvConocidos ? venta.totales.igv : null),
    total: venta.exito?.total ?? venta.totales.total,
    tasaIgv: muestraBasesIgv ? TASA_IGV : undefined,
  };

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

  function avanzar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso === "datos") {
      if (!evento.currentTarget.reportValidity()) return;
      if (!venta.lineas.length) { venta.setError(tipoVenta === "MOTOTAXIS" ? "Agrega al menos una mototaxi para continuar." : "Agrega al menos un repuesto o servicio para continuar."); return; }
      if (cargandoMediosPago) { venta.setError('Espera a que se carguen las cuentas de pago de Tesorería.'); return; }
      if (errorMediosPago || mediosPagoDisponibles.length === 0) { venta.setError(errorMediosPago || 'No hay cuentas activas en soles. Configura una caja o cuenta en Tesorería para registrar la venta.'); return; }
      if (!transferenciaOS && venta.condicionPago === "CREDITO" && Number(venta.importePagoInicial) > 0 && !cuentaPagoId) { venta.setError("Selecciona la cuenta donde recibir?s el adelanto."); return; }
      if (venta.tipoComprobante === "NOTA_VENTA" && !venta.clienteSeleccionado) { venta.setError("Selecciona al cliente que recibe los artículos para registrar la nota interna."); return; }
      if (identificacionComprobantePendiente) { setIntentoIdentificacionComprobante(true); return; }
      setIntentoIdentificacionComprobante(false);
      venta.setError("");
      setPaso("previa");
      return;
    }
    if (identificacionComprobantePendiente) { setIntentoIdentificacionComprobante(true); return; }
    if (!venta.exito) {
      void (async () => {
        const abrirPdfNubefact = venta.tipoComprobante !== "NOTA_VENTA" && tamano === "A4";
        const ventanaPdf = abrirPdfNubefact ? window.open("about:blank", "_blank") : null;
        const resultado = await venta.guardar(evento);
        if (!resultado) { ventanaPdf?.close(); return; }
        if (resultado.tipoComprobante === "NOTA_VENTA" || (resultado.nubefact?.estado === "EMITIDO" && tamano === "TICKET")) {
          ventanaPdf?.close();
          window.setTimeout(() => window.print(), 180);
        } else if (resultado.nubefact?.estado === "EMITIDO") {
          const enlace = resultado.nubefact.enlacePdf ?? resultado.nubefact.enlace;
          if (enlace && ventanaPdf) ventanaPdf.location.replace(enlace.startsWith("/") ? urlApi(enlace) : enlace);
          else ventanaPdf?.close();
        } else {
          ventanaPdf?.close();
        }
      })();
    }
  }

  return <div className={paso === "datos" ? "flex h-full min-h-0 flex-1 flex-col gap-3" : `venta-page ${nuevoIngresoClasses.page} is-preview-step`}>
    {paso === "previa" && <header className={`venta-heading ${nuevoIngresoClasses.heading}`}><div><h1>{esFactura ? "Emitir factura" : "Vista previa e impresión"}</h1><p className="page-subtitle text-xs mobile-portrait:text-[11px]">{esFactura ? "Revisa los datos y emite la factura en NubeFact." : esBoleta ? "Revisa la boleta antes de enviarla a NubeFact." : "Revisa la nota interna de salida de inventario."}</p></div><span className="venta-status"><i /> {esFactura ? "FACTURA" : "VISTA PREVIA"}</span><div className={`venta-number-card ${nuevoIngresoClasses.numberCard}`}><span>{venta.exito ? "NÚMERO ASIGNADO" : esBoleta ? "N° DE BOLETA" : esFactura ? "N° DE FACTURA" : "N° DE NOTA · INTERNO"}</span><strong>{numeracionActual || (numeraciones ? "FALTA CONFIGURAR SERIE" : "Cargando correlativo…")}</strong></div></header>}
    {venta.error && <NotificacionFlotante mensaje={venta.error} onCerrar={() => venta.setError("")} />}
    {formularioCliente.busquedaSinResultados && formularioCliente.mostrarNotificacionSinCliente && <NotificacionFlotante tipo="error" titulo="Cliente no encontrado" mensaje={`No se encontró un cliente con ${formularioCliente.tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"} ${venta.busquedaCliente.trim()}. Puedes registrarlo para usarlo en esta venta.`} duracionMs={0} accion={{ etiqueta: "Crear cliente", ejecutar: formularioCliente.abrirRegistroCliente }} onCerrar={() => formularioCliente.setMostrarNotificacionSinCliente(false)} />}
    {venta.exito && <NotificacionFlotante
      tipo={cpeEmitido || venta.exito.tipoComprobante === "NOTA_VENTA" ? "exito" : "advertencia"}
      mensaje={venta.exito.tipoComprobante === "NOTA_VENTA" ? `Nota interna ${venta.exito.codigo} registrada.` : cpeEmitido ? `Comprobante ${venta.exito.nubefact?.codigo ?? venta.exito.codigo} emitido.` : `Venta ${venta.exito.codigo} registrada. NubeFact aún no confirma la emisión.`}
    />}
    {venta.exito && <section className="grid justify-items-start gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm" aria-label="Detalle de la venta registrada">
      <strong>{venta.exito.tipoComprobante === "NOTA_VENTA" ? "Nota interna registrada" : "Venta registrada"}: {venta.exito.codigo}</strong><span>{venta.exito.tipoComprobante === "NOTA_VENTA" ? "Valor referencial" : "Total"} {soles(Number(venta.exito.total))}</span>
      {venta.exito.tipoComprobante === "NOTA_VENTA" ? <span>Salida de inventario registrada. {enlaceNotaVenta ? <a href={urlApi(enlaceNotaVenta)} target="_blank" rel="noreferrer">Abrir e imprimir nota</a> : venta.exito.archivos?.errores.length ? `No se pudo archivar la nota: ${venta.exito.archivos.errores[0].mensaje}` : "La nota se archivó para su consulta e impresión."}</span> : cpeEmitido ? <span>Comprobante emitido: {venta.exito.nubefact?.codigo}{venta.exito.nubefact?.enlacePdf ? <>  · <a href={venta.exito.nubefact.enlacePdf.startsWith("/") ? urlApi(venta.exito.nubefact.enlacePdf) : venta.exito.nubefact.enlacePdf} target="_blank" rel="noreferrer">Abrir documento</a></> : venta.exito.nubefact?.enlace ? <>  · <a href={venta.exito.nubefact.enlace} target="_blank" rel="noreferrer">Ver comprobante</a></> : null}</span> : <span>La venta quedó registrada, pero NubeFact no confirmó la emisión: {venta.exito.nubefact?.mensaje || "revisa la configuración y el estado del comprobante antes de volver a intentarlo."}</span>}
      {cobranzaContadoPendiente && <>
        <NotificacionFlotante tipo="advertencia" mensaje={`Registra en cobranza ${contadoEmitido ? "el pago completo al contado" : `la inicial de ${soles(Number(venta.exito.importePagoInicial))}`}.`} accion={{ etiqueta: "Completar pago", ejecutar: () => setMostrarCobranza(true) }} />
        <p className="m-0">Pago pendiente de registrar en cobranza.</p>
      </>}
      {transferenciaOS && ordenVinculadaOS && <span>Orden de servicio {transferenciaOS.codigo} vinculada. Adelanto y saldo quedaron registrados con sus cuentas.</span>}
      {cpeEmitido && <button type="button" onClick={() => setMostrarCobranza(true)}>{cobranzaContadoPendiente ? "Completar conciliación del pago" : "Registrar / ver pagos"}</button>}
      <button type="button" disabled={cobranzaContadoPendiente} title={cobranzaContadoPendiente ? "Completa la conciliación antes de ocultar el detalle de la venta." : undefined} onClick={() => venta.setExito(null)}>Ocultar detalle</button></section>}

    <form className={paso === "datos" ? "flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto pb-12 pr-1 text-[#142b42]" : "venta-layout is-preview-step"} onSubmit={avanzar}>
      {paso === "datos" && <>
        {(errorMediosPago || (!cargandoMediosPago && mediosPagoDisponibles.length === 0)) && <NotificacionFlotante mensaje={errorMediosPago || "No hay cuentas activas en soles. Configura una caja o cuenta bancaria en Tesorería."} />}
        <NuevaVentaEditor
          venta={venta}
          tipoVenta={tipoVenta}
          etiquetaNumero={venta.exito ? "NÚMERO ASIGNADO" : esNotaVenta ? "N° DE NOTA" : esFactura ? "N° DE FACTURA" : "N° DE BOLETA"}
          numero={numeracionActual || (numeraciones ? "FALTA CONFIGURAR SERIE" : "Cargando correlativo…")}
          fecha={String(venta.camposNubefact.fecha_de_emision ?? venta.fecha)}
          fechaMaxima={fechaHoyPeru()}
          onFechaChange={(fecha) => { actualizar("fecha_de_emision", fecha); venta.setFecha(fecha); }}
          onTipoComprobanteChange={cambiarTipoComprobante}
          selectorCliente={<SelectorClienteVenta venta={venta} formulario={formularioCliente} esFactura={esFactura} nombreCliente={nombreCliente} numeroDocumento={numeroDocumento} tipoDocumento={tipoDocumento} intentoIdentificacion={intentoIdentificacionComprobante} identificacionFacturaPendiente={identificacionFacturaPendiente} identificacionBoletaPendiente={identificacionBoletaPendiente} onVerDetalle={setClienteEnDetalle} />}
          catalogo={<CatalogoVenta venta={venta} tipoVenta={tipoVenta} puedeRegistrarRepuesto={permisos.includes("INVENTARIO.CREAR")} onRegistrarRepuesto={() => void abrirAltaProducto()} onKeyDownBusquedaRepuesto={buscarProductoConEnter} />}
          puedeAgregarServicio={tipoVenta === "REPUESTOS" && permisos.includes("INGRESOS.SERVICIO_PRECIO_MANUAL")}
          lineas={lineasOrdenadas}
          cantidadTotal={cantidadTotal}
          onCancelar={cancelarVenta}
          resumen={<div className="flex flex-col gap-4 [&_.selector-cuenta-financiera]:grid [&_.selector-cuenta-financiera]:gap-1.5 [&_.selector-cuenta-financiera]:text-xs [&_.selector-cuenta-financiera]:font-semibold [&_.selector-cuenta-financiera]:text-[#3d566e] [&_.selector-cuenta-financiera_select]:box-border [&_.selector-cuenta-financiera_select]:h-[46px] [&_.selector-cuenta-financiera_select]:w-full [&_.selector-cuenta-financiera_select]:min-w-0 [&_.selector-cuenta-financiera_select]:rounded-[10px] [&_.selector-cuenta-financiera_select]:border [&_.selector-cuenta-financiera_select]:border-[#c5d1db] [&_.selector-cuenta-financiera_select]:bg-white [&_.selector-cuenta-financiera_select]:px-3 [&_.selector-cuenta-financiera_select]:text-sm [&_.selector-cuenta-financiera_select]:font-normal [&_.selector-cuenta-financiera_select]:text-[#142b42] [&_.selector-cuenta-hint]:font-medium [&_.selector-cuenta-hint]:text-[#5b7083]">
            <DesgloseImportes {...importesVenta} destacado />
            {transferenciaOS && <div className="grid gap-1 text-sm text-[#0b2545]"><strong>Saldo a pagar {soles(saldoOrdenServicio)}</strong><small className="text-xs text-[#5b7083]">Adelanto: {soles(Number(transferenciaOS.adelanto || 0))} · {Number(transferenciaOS.adelanto || 0) > 0 ? medioAdelantoOrden : "Sin adelanto"}</small></div>}
            {transferenciaOS ? <SelectorCuentaFinanciera value={cuentaSaldoOS} medioActual={medioSaldoOS} etiqueta="Cuenta para completar el pago" onChange={(id, medio) => { setCuentaSaldoOS(id); setMedioSaldoOS(medio); venta.setMedioPago(medio); }} required={saldoOrdenServicio > 0} /> : venta.condicionPago === "CONTADO" ? <SelectorCuentaFinanciera value={cuentaPagoId} medioActual={venta.medioPago} etiqueta="Cuenta donde se recibe el pago" onChange={(id, medio) => { setCuentaPagoId(id); venta.setMedioPago(medio); }} /> : null}
          </div>}
        />
      </>}

      {paso === "previa" && <section className={`venta-preview-stage paper-${tamano.toLowerCase()}`}>
        <div className="venta-preview-toolbar"><button type="button" className="venta-back" onClick={() => setPaso("datos")}>← Volver a editar</button><fieldset className="venta-size-picker"><legend>Tamaño de impresión</legend>{(["A4", "TICKET"] as const).map((opcion) => <button key={opcion} type="button" className={tamano === opcion ? "is-selected" : ""} aria-pressed={tamano === opcion} onClick={() => setTamano(opcion)}>{opcion === "TICKET" ? "Ticket 80 mm" : opcion}</button>)}</fieldset><span className="venta-preview-hint">Vista previa del documento</span></div>
      <aside className="boleta-preview" aria-label="Documento para impresión">
        <article className="boleta-paper">
          <div className="boleta-title"><strong>{presentacionComprobante.titulo}</strong>{esNotaVenta && venta.exito?.codigo && <span>{venta.exito.codigo}</span>}</div>
          {esFactura && !venta.exito && <div className="border-b border-[#efd8ad] bg-[#fff8eb] px-3 py-2 text-center text-[10px] font-extrabold tracking-[.08em] text-[#8a5a14]">BORRADOR</div>}
          {esNotaVenta ? <div className="boleta-client"><span>CLIENTE · MOVIMIENTO INTERNO DE INVENTARIO</span><strong>{nombreCliente}</strong>{numeroDocumento && <small>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"}: {numeroDocumento}</small>}{String(venta.camposNubefact.cliente_direccion ?? "").trim() && <small>{String(venta.camposNubefact.cliente_direccion)}</small>}<small>Fecha de salida: {venta.fecha}</small></div> : <div className="boleta-client"><span>CLIENTE</span><strong>{nombreCliente || (esBoleta ? "CLIENTES VARIOS" : "")}</strong>{numeroDocumento && <small>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"}: {numeroDocumento}</small>}{String(venta.camposNubefact.cliente_direccion ?? "").trim() && <small>{String(venta.camposNubefact.cliente_direccion)}</small>}<small>Emisión: {venta.fecha}</small></div>}
          <div className="boleta-items"><div className="boleta-items-head"><span>CANT.</span><span>DESCRIPCIÓN</span>{mostrarAfectacionIgv && <span>OPERACIÓN</span>}<span>IMPORTE</span></div>{venta.lineas.length ? lineasOrdenadas.map((linea) => { const precio = linea.tipo === "PRODUCTO" ? Number(precioRepuestoEnLinea(linea)) : Number(linea.precio) || 0; const descripcion = linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.tipo === "MOTOTAXI" ? `${linea.mototaxi.marca} ${linea.mototaxi.modelo}${linea.mototaxi.version ? ` ${linea.mototaxi.version}` : ""}` : linea.descripcion || "Servicio"; return <div className="boleta-item" key={linea.clave}><span>{linea.cantidad}</span><span>{descripcion}</span>{mostrarAfectacionIgv && <span>{linea.afectacionIgv === "GRAVADO" ? "Gravada" : linea.afectacionIgv === "EXONERADO" ? "Exonerada" : "Inafecta"}</span>}<span>{soles(importeLinea(Number(linea.cantidad) || 0, precio, Number(linea.descuento) || 0))}</span></div>; }) : <p>Los artículos de la venta aparecerán aquí.</p>}</div>
          <div className="boleta-totals">
            {muestraBasesIgv && <>
              <div><span>Base gravada</span><strong>{soles(venta.totales.gravada)}</strong></div>
              {venta.totales.exonerada > 0 && <div><span>Base exonerada</span><strong>{soles(venta.totales.exonerada)}</strong></div>}
              {venta.totales.inafecta > 0 && <div><span>Base inafecta</span><strong>{soles(venta.totales.inafecta)}</strong></div>}
            </>}
            <DesgloseImportes {...importesVenta} destacado />
          </div>
          <div className="boleta-payment-terms"><div><span>Condición de pago</span><strong>Contado</strong></div></div>
          <div className="boleta-foot"><span>Unidades: {cantidadTotal.toLocaleString("es-PE")}</span><span>Medio de pago: {venta.medioPago.toLocaleLowerCase("es-PE").replaceAll("_", " ")}</span></div>
        </article>
        <div className="boleta-actions"><button className="venta-submit" type="submit" disabled={venta.guardando || cargandoOS || vinculandoOS || !venta.lineas.length || Boolean(venta.exito) || Boolean(transferenciaOS && venta.totales.total > Number(transferenciaOS.adelanto || 0) && !cuentaSaldoOS) || (esFactura && !venta.estadoNubefact?.emisionFacturaHabilitada)} title={esFactura && !venta.estadoNubefact?.emisionFacturaHabilitada ? "Configura la conexión de NubeFact y la serie de facturas en el servidor." : undefined}>{venta.exito ? venta.tipoComprobante === "NOTA_VENTA" ? "Nota interna registrada" : venta.exito.nubefact?.estado === "EMITIDO" ? "Comprobante emitido" : "Emisión no confirmada" : venta.guardando ? esFactura ? "Enviando factura…" : venta.tipoComprobante === "BOLETA" ? "Emitiendo boleta…" : "Registrando nota interna…" : esFactura ? "Emitir e imprimir factura" : venta.tipoComprobante === "BOLETA" ? "Emitir e imprimir boleta" : "Registrar e imprimir nota de venta"}<span aria-hidden="true">⎙</span></button></div>
      </aside>
      </section>}
    </form>
    {confirmarDescarteVenta && <ConfirmarDescarteFormulario elemento="esta venta" detalle="Si sales ahora, se perderán el cliente, los productos o servicios y los demás datos que ingresaste. ¿Quieres descartarla?" accion="Descartar y volver al listado" onSeguirEditando={() => setConfirmarDescarteVenta(false)} onDescartar={descartarVentaYVolver} />}
    {clienteEnDetalle && <ClienteDetalleDialog cliente={clienteEnDetalle} editable={permisos.includes("PERSONAS.EDITAR")} onClose={() => setClienteEnDetalle(null)} onSave={async (datos) => { const clienteActualizado = await servicioIngresos.actualizarCliente(clienteEnDetalle.id, datos); venta.actualizarClienteEnResultados(clienteActualizado); setClienteEnDetalle(clienteActualizado); }} />}
    {mostrarCobranza && venta.exito?.nubefact && venta.exito.tipoComprobante  && createPortal(<PagoIngresoDialog cuentaFinancieraInicialId={cuentaPagoId} ingresoId={venta.exito.id} total={venta.exito.total} contadoPendiente={contadoEmitido && cobranzaContadoPendiente} importeInicialObligatorio={pagoInicialCreditoPendiente && cobranzaContadoPendiente} fechaPagoInicial={venta.fecha} importeInicial={contadoEmitido ? venta.exito.total : venta.exito.importePagoInicial} medioPagoInicial={venta.exito.medioPago} onPaymentRecorded={() => { if (cobranzaContadoPendiente) setCobranzaContadoRegistradaId(venta.exito?.id ?? null); }} onClose={() => setMostrarCobranza(false)} />, document.body)}
    {mostrarAltaProducto && (cargandoAltaProducto ? (
      <Dialogo titulo="Preparando el registro del repuesto" ancho="sm" onCerrar={() => setMostrarAltaProducto(false)}>
        <p className="m-0 text-sm text-[#52697d]">Cargando formulario de repuesto…</p>
      </Dialogo>
    ) : catalogosAltaProducto ? (
      <ProductoFormulario catalogos={catalogosAltaProducto} producto={null} error="" alCerrar={() => setMostrarAltaProducto(false)} alGuardar={guardarProductoDesdeVenta} alCrearMarca={catalogo.crearMarca} alCrearCategoria={catalogo.crearCategoria} />
    ) : (
      <Dialogo
        tipo="alerta"
        titulo="No se pudo abrir el registro"
        ancho="sm"
        onCerrar={() => setMostrarAltaProducto(false)}
        pie={
          <>
            <button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" onClick={() => setMostrarAltaProducto(false)}>Cancelar</button>
            <button type="button" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white max-sm:w-full" onClick={() => void abrirAltaProducto()}>Reintentar</button>
          </>
        }
      >
        <p className="m-0 text-sm text-[#52697d]">{errorAltaProducto}</p>
      </Dialogo>
    ))}
  </div>;
}

