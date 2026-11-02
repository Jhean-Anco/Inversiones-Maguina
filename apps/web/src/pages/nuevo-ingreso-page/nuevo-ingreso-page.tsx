import "./nuevo-ingreso-page.css";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { servicioProductos, type CatalogosProducto, type DatosProducto } from "../../services/inventario/productos.service";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import { srcImagen } from "../../services/api-cliente";
import { PagoIngresoDialog } from "../../components/ingresos/pago-ingreso-dialog/pago-ingreso-dialog";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";

const soles = (monto: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(monto);
const redondearCentimos = (monto: number) => Math.round((monto + Number.EPSILON) * 100) / 100;
const sumarDiasFecha = (fecha: string, dias: number) => {
  const resultado = new Date(`${fecha}T12:00:00.000Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
};

export function NuevoIngresoPage({ permisos = [] }: { permisos?: string[] }) {
  const venta = useNuevoIngreso();
  const [paso, setPaso] = useState<"datos" | "previa">("datos");
  const [tamano, setTamano] = useState<"A4" | "A5" | "TICKET">("A4");
  const [mostrarRegistroCliente, setMostrarRegistroCliente] = useState(false);
  const [clienteEnDetalle, setClienteEnDetalle] = useState<ClienteRegistrado | null>(null);
  const [modoCliente, setModoCliente] = useState<"buscar" | "nuevo">("buscar");
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"01" | "06">("01");
  const [busquedaClienteEjecutada, setBusquedaClienteEjecutada] = useState("");
  const [errorBusquedaCliente, setErrorBusquedaCliente] = useState("");
  const [mostrarNotificacionSinCliente, setMostrarNotificacionSinCliente] = useState(false);
  const [mostrarAltaProducto, setMostrarAltaProducto] = useState(false);
  const [catalogosAltaProducto, setCatalogosAltaProducto] = useState<CatalogosProducto | null>(null);
  const [cargandoAltaProducto, setCargandoAltaProducto] = useState(false);
  const [errorAltaProducto, setErrorAltaProducto] = useState("");
  const [numeraciones, setNumeraciones] = useState<Awaited<ReturnType<typeof servicioIngresos.numeraciones>> | null>(null);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarCobranza, setMostrarCobranza] = useState(false);
  const [cobranzaContadoRegistradaId, setCobranzaContadoRegistradaId] = useState<string | null>(null);
  const codigoLector = useRef("");
  const tiempoUltimaTeclaLector = useRef(0);
  const objetivoLector = useRef<EventTarget | null>(null);
  const buscarCodigoLectorRef = useRef<(codigo: string) => Promise<void>>(async () => undefined);
  const [tipoDocumentoNuevo, setTipoDocumentoNuevo] = useState<DatosClienteNuevo["tipoDocumento"]>("DNI");
  const [numeroDocumentoNuevo, setNumeroDocumentoNuevo] = useState("");
  const [nombresNuevo, setNombresNuevo] = useState(""); const [apellidoPaternoNuevo, setApellidoPaternoNuevo] = useState(""); const [apellidoMaternoNuevo, setApellidoMaternoNuevo] = useState("");
  const [razonSocialNueva, setRazonSocialNueva] = useState(""); const [direccionNueva, setDireccionNueva] = useState("");
  const [errorRegistroCliente, setErrorRegistroCliente] = useState("");
  const [buscandoIdentidadNueva, setBuscandoIdentidadNueva] = useState(false);
  const personaJuridicaNueva = tipoDocumentoNuevo === "RUC" && numeroDocumentoNuevo.startsWith("20");
  const documentoNuevoValido = tipoDocumentoNuevo === "DNI" ? numeroDocumentoNuevo.length === 8 : tipoDocumentoNuevo === "RUC" ? numeroDocumentoNuevo.length === 11 : numeroDocumentoNuevo.trim().length > 0;
  const presentacionComprobante = { clase: venta.tipoComprobante === "BOLETA" ? "comprobante-boleta" : "comprobante-nota-venta", titulo: venta.tipoComprobante === "BOLETA" ? "BOLETA DE VENTA" : "NOTA DE VENTA" };
  const nombreCliente = String(venta.camposNubefact.cliente_denominacion ?? "");
  const numeroDocumento = String(venta.camposNubefact.cliente_numero_de_documento ?? "");
  const tipoDocumento = String(venta.camposNubefact.cliente_tipo_de_documento ?? "0");
  const actualizar = (campo: string, valor: string) => venta.actualizarCampoNubefact(campo, valor);
  const cantidadTotal = venta.lineas.reduce((suma, linea) => suma + (Number(linea.cantidad) || 0), 0);
  const subtotal = venta.totales.gravada + venta.totales.exonerada + venta.totales.inafecta;
  const saldoCreditoProgramado = redondearCentimos(Math.max(0, venta.totales.total - Number(venta.importePagoInicial || 0)));
  const numeracionActual = venta.exito?.nubefact?.codigo ?? numeraciones?.BOLETA.codigo;
  const cpeEmitido = ["EMITIDO_DEMO", "EMITIDO"].includes(venta.exito?.nubefact?.estado ?? "");
  const contadoEmitido = Boolean(venta.exito && cpeEmitido && venta.exito.condicionPago === "CONTADO");
  const pagoInicialCreditoPendiente = Boolean(venta.exito && venta.exito.condicionPago === "CREDITO" && Number(venta.exito.importePagoInicial) > 0);
  const cobranzaContadoPendiente = Boolean(cpeEmitido && venta.exito && (contadoEmitido || pagoInicialCreditoPendiente) && cobranzaContadoRegistradaId !== venta.exito.id);
  const consultaCatalogo = venta.busqueda.trim();
  const buscandoEnCatalogo = consultaCatalogo.length >= 4;
  const productosCatalogo = (buscandoEnCatalogo ? venta.resultados : venta.productosRecientes).slice(0, 8);
  const longitudDocumentoBusqueda = tipoDocumentoBusqueda === "01" ? 8 : 11;
  const busquedaSinResultados = busquedaClienteEjecutada === venta.busquedaCliente.trim() && venta.busquedaCliente.trim().length === longitudDocumentoBusqueda && !venta.buscandoClientes && venta.clientesEncontrados.length === 0;

  async function ejecutarBusquedaCliente() {
    const consulta = venta.busquedaCliente.trim();
    setBusquedaClienteEjecutada("");
    setMostrarNotificacionSinCliente(false);
    if (!new RegExp(`^\\d{${longitudDocumentoBusqueda}}$`).test(consulta)) {
      setErrorBusquedaCliente(`Ingresa ${longitudDocumentoBusqueda} dígitos para buscar por ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}.`);
      return;
    }
    setErrorBusquedaCliente("");
    const resultados = await venta.buscarClientes(tipoDocumentoBusqueda);
    if (resultados !== null) {
      setBusquedaClienteEjecutada(consulta);
      setMostrarNotificacionSinCliente(resultados.length === 0);
    }
  }

  function abrirRegistroCliente() {
    const documentoBuscado = venta.busquedaCliente.trim();
    setTipoDocumentoNuevo(tipoDocumentoBusqueda === "01" ? "DNI" : "RUC");
    setModoCliente("nuevo");
    venta.quitarCliente();
    setMostrarRegistroCliente(true);
    setErrorRegistroCliente("");
    if (/^\d+$/.test(documentoBuscado)) setNumeroDocumentoNuevo(documentoBuscado);
    venta.setBusquedaCliente("");
  }

  async function consultarIdentidadNueva() {
    if (tipoDocumentoNuevo !== "DNI" && tipoDocumentoNuevo !== "RUC") return;
    setBuscandoIdentidadNueva(true); setErrorRegistroCliente("");
    try {
      const identidad = await servicioIngresos.consultarIdentidadCliente(tipoDocumentoNuevo, numeroDocumentoNuevo.trim());
      if (identidad.tipoPersona === "JURIDICA") setRazonSocialNueva(identidad.razonSocial ?? "");
      else { setNombresNuevo(identidad.nombres ?? ""); setApellidoPaternoNuevo(identidad.apellidoPaterno ?? ""); setApellidoMaternoNuevo(identidad.apellidoMaterno ?? ""); }
      setDireccionNueva(identidad.direccion ?? "");
    } catch (problema) { setErrorRegistroCliente(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscandoIdentidadNueva(false); }
  }


  useEffect(() => {
    if (cobranzaContadoPendiente) setMostrarCobranza(true);
  }, [cobranzaContadoPendiente]);

  function cargarNumeraciones() { void servicioIngresos.numeraciones().then(setNumeraciones).catch(() => undefined); }
  useEffect(() => { let vigente = true; void servicioIngresos.numeraciones().then((data) => { if (vigente) setNumeraciones(data); }).catch(() => undefined); return () => { vigente = false; }; }, []);

  function buscarProductoConEnter(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    const consulta = venta.busqueda.trim().toLocaleLowerCase("es-PE");
    const coincidenciaExacta = venta.resultados.find((producto) => producto.codigo.toLocaleLowerCase("es-PE") === consulta);
    if (coincidenciaExacta) {
      evento.preventDefault();
      venta.agregarProducto(coincidenciaExacta);
    } else if (venta.resultados.length === 1) {
      evento.preventDefault();
      venta.agregarProducto(venta.resultados[0]);
    }
  }

  async function agregarCodigoLeido(codigo: string) {
    setMostrarCamara(false);
    try {
      const coincidencias = await servicioIngresos.buscarProductos(codigo, true);
      const consulta = codigo.trim().toLocaleLowerCase("es-PE");
      const producto = coincidencias.find((item) => item.codigo.toLocaleLowerCase("es-PE") === consulta) ?? (coincidencias.length === 1 ? coincidencias[0] : null);
      if (producto) venta.agregarProducto(producto);
      else venta.setBusqueda(codigo);
    } catch (problema) {
      venta.setError(problema instanceof Error ? problema.message : "No se pudo buscar el código leído.");
    }
  }

  async function abrirAltaProducto() {
    setMostrarAltaProducto(true);
    setErrorAltaProducto("");
    if (catalogosAltaProducto) return;
    setCargandoAltaProducto(true);
    try { setCatalogosAltaProducto(await servicioProductos.catalogos()); }
    catch (problema) { setErrorAltaProducto(problema instanceof Error ? problema.message : "No se pudieron cargar los datos para registrar el producto."); }
    finally { setCargandoAltaProducto(false); }
  }

  async function guardarProductoDesdeVenta(datos: DatosProducto, imagenesNuevas: File[], imagenesEliminadas: string[]) {
    try {
      const resultado = await servicioProductos.guardar(datos, undefined, imagenesNuevas, imagenesEliminadas);
      venta.setBusqueda(resultado.producto.codigoInterno);
      venta.setError(resultado.advertencia ?? "");
      setMostrarAltaProducto(false);
      return true;
    } catch (problema) {
      venta.setError(problema instanceof Error ? problema.message : "No se pudo registrar el producto.");
      return false;
    }
  }

  buscarCodigoLectorRef.current = agregarCodigoLeido;
  useEffect(() => {
    const capturarLector = (evento: globalThis.KeyboardEvent) => {
      const objetivo = evento.target;
      if (evento.key === "Enter" || evento.key === "Tab") {
        const codigo = codigoLector.current.trim(); codigoLector.current = "";
        const destino = objetivoLector.current;
        objetivoLector.current = null;
        const esLecturaRapida = codigo.length >= 3 && performance.now() - tiempoUltimaTeclaLector.current < 120;
        if (esLecturaRapida) {
          evento.preventDefault();
          if (destino instanceof HTMLInputElement || destino instanceof HTMLTextAreaElement) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(destino), "value")?.set;
            if (setter && destino.value.endsWith(codigo)) {
              setter.call(destino, destino.value.slice(0, -codigo.length));
              destino.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
          void buscarCodigoLectorRef.current(codigo);
        }
        return;
      }
      if (evento.key.length !== 1 || evento.ctrlKey || evento.altKey || evento.metaKey || evento.isComposing) { codigoLector.current = ""; objetivoLector.current = null; return; }
      const ahora = performance.now();
      if (ahora - tiempoUltimaTeclaLector.current > 100) { codigoLector.current = ""; objetivoLector.current = evento.target; }
      tiempoUltimaTeclaLector.current = ahora;
      codigoLector.current += evento.key;
      if (codigoLector.current.length > 128) { codigoLector.current = ""; objetivoLector.current = null; }
    };
    window.addEventListener("keydown", capturarLector, true);
    return () => window.removeEventListener("keydown", capturarLector, true);
  }, []);
  function limpiarVenta() {
    const tieneDatos = venta.lineas.length > 0 || Boolean(venta.clienteSeleccionado) || Boolean(venta.busqueda.trim()) || Boolean(venta.observacion.trim());
    if (tieneDatos && !window.confirm("Se eliminarán los productos, el cliente y la observación de esta venta. ¿Deseas continuar?")) return;
    venta.lineas.forEach((linea) => venta.quitarLinea(linea.clave));
    venta.quitarCliente();
    venta.setBusqueda("");
    venta.setObservacion("");
    const fechaNueva = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    venta.setFecha(fechaNueva);
    venta.actualizarCampoNubefact("fecha_de_emision", fechaNueva);
    venta.setMedioPago("EFECTIVO");
    venta.setTipoComprobante("BOLETA");
    venta.reiniciarIdempotencia();
    cargarNumeraciones();
    venta.setError("");
    venta.setExito(null);
    setMostrarRegistroCliente(false);
    setModoCliente("buscar");
  }

  function avanzar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso === "datos") {
      if (!evento.currentTarget.reportValidity()) return;
      if (!venta.lineas.length) { venta.setError("Agrega al menos un producto o servicio para continuar."); return; }
      if (venta.tipoComprobante === "NOTA_VENTA" && !venta.clienteSeleccionado) { venta.setError("Selecciona el cliente que recibe los productos o servicios para registrar la nota interna."); return; }
      venta.setError("");
      setPaso("previa");
      return;
    }
    if (!venta.exito) void venta.guardar(evento, saldoCreditoProgramado);
  }

  return <div className={`venta-page ${paso === "datos" ? "is-data-step" : "is-preview-step"}`}>
    <header className="venta-heading"><div><h1>{paso === "datos" ? "Nueva venta" : "Vista previa e impresión"}</h1><p className="page-subtitle">{paso === "datos" ? "Completa el encabezado y detalla los productos debajo." : venta.tipoComprobante === "BOLETA" ? "Revisa la boleta antes de enviarla a NubeFact." : "Revisa la nota interna de salida de inventario."}</p></div><span className="venta-status"><i /> {paso === "datos" ? venta.tipoComprobante === "BOLETA" ? "BOLETA" : "NOTA DE VENTA" : "VISTA PREVIA"}</span><div className="venta-number-card"><span>{venta.exito ? "NÚMERO ASIGNADO" : venta.tipoComprobante === "BOLETA" ? "N° DE BOLETA · ESTIMADO" : "N° DE NOTA · INTERNO"}</span><strong>{venta.tipoComprobante === "BOLETA" ? numeracionActual || "Se asigna al registrar" : venta.exito?.codigo || "Se asigna al registrar"}</strong></div></header>
    {venta.error && <div className="venta-alert" role="alert">{venta.error}<button type="button" aria-label="Cerrar alerta" onClick={() => venta.setError("")}>×</button></div>}
    {busquedaSinResultados && mostrarNotificacionSinCliente && <NotificacionFlotante tipo="error" titulo="Cliente no encontrado" mensaje={`No se encontró un cliente con ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"} ${venta.busquedaCliente.trim()}. Puedes registrarlo para usarlo en esta venta.`} duracionMs={0} accion={{ etiqueta: "Crear cliente", ejecutar: abrirRegistroCliente }} onCerrar={() => setMostrarNotificacionSinCliente(false)} />}
    {venta.exito && <div className={`venta-alert ${cpeEmitido ? "venta-alert-ok" : ""}`} role="status">
      <strong>{venta.exito.tipoComprobante === "NOTA_VENTA" ? "Nota interna registrada" : "Venta registrada"}: {venta.exito.codigo}</strong><span>{venta.exito.tipoComprobante === "NOTA_VENTA" ? "Valor referencial" : "Total"} {soles(Number(venta.exito.total))}</span>
      {venta.exito.tipoComprobante === "NOTA_VENTA" ? <span>Salida de inventario registrada. La nota no se envió a NubeFact ni se contabilizó como ingreso.</span> : cpeEmitido ? <span>Comprobante emitido en NubeFact {venta.exito.nubefact?.ambiente}: {venta.exito.nubefact?.codigo}{venta.exito.nubefact?.enlacePdf ? <>  · <a href={venta.exito.nubefact.enlacePdf} target="_blank" rel="noreferrer">Descargar PDF</a></> : venta.exito.nubefact?.enlace ? <>  · <a href={venta.exito.nubefact.enlace} target="_blank" rel="noreferrer">Ver comprobante</a></> : null}</span> : <span>La venta quedó registrada, pero NubeFact no confirmó la emisión: {venta.exito.nubefact?.mensaje || "revisa la configuración y el estado del comprobante antes de volver a intentarlo."}</span>}
      {cobranzaContadoPendiente && <strong role="alert">Pendiente: registra en cobranza {contadoEmitido ? "el pago completo al contado" : `la inicial de ${soles(Number(venta.exito.importePagoInicial))}`}.</strong>}
      {cpeEmitido && <button type="button" onClick={() => setMostrarCobranza(true)}>{cobranzaContadoPendiente ? "Completar conciliación del pago" : "Registrar / ver pagos"}</button>}
      <button type="button" disabled={cobranzaContadoPendiente} title={cobranzaContadoPendiente ? "Completa la conciliación del pago al contado para cerrar este aviso." : undefined} onClick={() => venta.setExito(null)}>Cerrar</button>
    </div>}

    <form className={`venta-layout ${paso === "previa" ? "is-preview-step" : "is-data-step"}`} onSubmit={avanzar}>
      {paso === "datos" && <>
      <div className="venta-editor is-catalog-open">
        <aside className="venta-catalog-sidebar" aria-label="Catálogo de productos">
          <header><div><span>CATÁLOGO</span><h2>Productos disponibles</h2><p>Revisa precios y stock antes de agregarlos.</p></div></header>
          <div className="venta-catalog-search"><span aria-hidden="true">⌕</span><input autoFocus value={venta.busqueda} onChange={(evento) => venta.setBusqueda(evento.target.value)} onKeyDown={buscarProductoConEnter} placeholder="Buscar producto por nombre o código…" aria-label="Buscar en catálogo" /></div>
          <div className="venta-catalog-results" aria-live="polite">{venta.buscando ? <p className="venta-catalog-status">Buscando en inventario…</p> : <>{!buscandoEnCatalogo && productosCatalogo.length > 0 && <p className="venta-catalog-recent-label">Últimos productos agregados</p>}{!buscandoEnCatalogo && productosCatalogo.length > 0 && consultaCatalogo.length > 0 && <p className="venta-catalog-status">Escribe 4 caracteres para buscar en inventario.</p>}{productosCatalogo.length ? productosCatalogo.map((producto) => <article className="venta-catalog-product" key={producto.presentacionId}><div className="venta-catalog-product-image">{producto.rutaImagen ? <img src={srcImagen(producto.rutaImagen)} alt={producto.nombre} loading="lazy" onError={(evento) => { evento.currentTarget.hidden = true; evento.currentTarget.parentElement?.classList.add("is-image-missing"); }} /> : <span aria-hidden="true">▧</span>}</div><div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigo} · {producto.presentacion}</span></div><div className="venta-catalog-product-meta"><span>Stock <b>{Number(producto.stockBase).toLocaleString("es-PE")}</b></span><strong>{soles(Number(producto.precio))}</strong></div><button type="button" onClick={() => venta.agregarProducto(producto)}>{Number(producto.stockBase) > 0 ? "Agregar a la venta" : "Agregar de nuevo"}</button></article>) : <div className={`venta-catalog-empty${buscandoEnCatalogo ? "" : " is-hint"}`}>{buscandoEnCatalogo && <span className="venta-catalog-empty-face" role="img" aria-label="Sin resultados">😞</span>}{buscandoEnCatalogo && <strong>No hay productos para mostrar</strong>}<span>{buscandoEnCatalogo ? "No encontramos coincidencias. Prueba con otro nombre o código." : "Escribe al menos 4 caracteres para buscar productos en inventario."}</span>{buscandoEnCatalogo && permisos.includes("INVENTARIO.CREAR") && <button type="button" onClick={() => void abrirAltaProducto()}>Registrar producto</button>}</div>}</>}</div>
        </aside>
        <article className={`venta-form-paper ${presentacionComprobante.clase}`}>
          <header className="venta-form-heading"><div><p>{venta.tipoComprobante === "BOLETA" ? "COMPROBANTE DE VENTA" : "DOCUMENTO INTERNO DE INVENTARIO"}</p><h2>{presentacionComprobante.titulo}</h2></div></header>
          <div className="venta-form-header-fields">
          <div className="venta-fields venta-document-fields">
            <label className="venta-field-primary">Tipo de comprobante<select value={venta.tipoComprobante} onChange={(e) => { venta.setTipoComprobante(e.target.value as "BOLETA" | "NOTA_VENTA"); venta.reiniciarIdempotencia(); venta.setExito(null); }}><option value="BOLETA">Boleta de venta</option><option value="NOTA_VENTA">Nota de venta</option></select></label>
            <label>{venta.tipoComprobante === "BOLETA" ? "Fecha de emisión" : "Fecha de salida"}<input type="date" value={String(venta.camposNubefact.fecha_de_emision ?? venta.fecha)} onChange={(e) => { actualizar("fecha_de_emision", e.target.value); venta.setFecha(e.target.value); }} required /></label>
            {venta.tipoComprobante === "BOLETA" && <><label>Condición de pago<select value={venta.condicionPago} onChange={(evento) => venta.setCondicionPago(evento.target.value as "CONTADO" | "CREDITO")}><option value="CONTADO">Contado · pagado al emitir</option><option value="CREDITO">Crédito · pago único o cuotas</option></select></label>{venta.condicionPago === "CREDITO" ? <fieldset className="venta-credit-schedule"><legend>Vencimientos y cuotas</legend><label>Pago inicial hoy (S/)<input type="number" min="0" max={Math.max(0, venta.totales.total - - 0.01).toFixed(2)} step="0.01" value={venta.importePagoInicial} onChange={(evento) => venta.setImportePagoInicial(evento.target.value)} placeholder="0.00" /></label>{Number(venta.importePagoInicial) > 0 && <label>Medio de pago de la inicial<select value={venta.medioPago} onChange={(evento) => venta.setMedioPago(evento.target.value)}><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="BILLETERA_DIGITAL">Billetera digital</option><option value="OTRO">Otro</option></select></label>}{venta.cuotasNubefact.map((cuota, indice) => <div className="venta-credit-installment" key={indice}><label>Cuota {indice + 1}<input type="date" min={sumarDiasFecha(indice && venta.cuotasNubefact[indice - 1].fecha_de_pago ? venta.cuotasNubefact[indice - 1].fecha_de_pago : venta.fecha, 1)} value={cuota.fecha_de_pago} onChange={(evento) => venta.actualizarCuotaCredito(indice, "fecha_de_pago", evento.target.value)} required /></label><label>Importe (S/)<input type="number" min="0.01" step="0.01" value={cuota.importe || (venta.cuotasNubefact.length === 1 ? saldoCreditoProgramado.toFixed(2) : "")} onChange={(evento) => venta.actualizarCuotaCredito(indice, "importe", evento.target.value)} required /></label>{venta.cuotasNubefact.length > 1 && <button type="button" aria-label={`Quitar cuota ${indice + 1}`} onClick={() => venta.quitarCuotaCredito(indice)}>Quitar</button>}</div>)}<button type="button" className="venta-credit-add" disabled={venta.cuotasNubefact.length >= 24} onClick={() => venta.agregarCuotaCredito(saldoCreditoProgramado)}>＋ Agregar cuota</button></fieldset> : <label>Medio de pago<select value={venta.medioPago} onChange={(evento) => venta.setMedioPago(evento.target.value)}><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="BILLETERA_DIGITAL">Billetera digital</option><option value="OTRO">Otro</option></select></label>}</>}
            {venta.tipoComprobante === "NOTA_VENTA" && <label>Medio de pago<select value={venta.medioPago} onChange={(evento) => venta.setMedioPago(evento.target.value)}><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="BILLETERA_DIGITAL">Billetera digital</option><option value="OTRO">Otro</option></select></label>}
          </div>
          <section className="venta-customer-section" aria-labelledby="venta-customer-title">
            <div className="venta-section-heading"><h3 id="venta-customer-title">Cliente</h3><div className="venta-customer-modes" role="group" aria-label="Tipo de cliente">
              <button type="button" className={modoCliente === "buscar" ? "is-active" : ""} aria-pressed={modoCliente === "buscar"} disabled={venta.buscandoClientes} onClick={() => { setModoCliente("buscar"); setMostrarRegistroCliente(false); void ejecutarBusquedaCliente(); }}>Buscar cliente</button>
              <button type="button" className={modoCliente === "nuevo" ? "is-active" : ""} aria-label="Crear cliente" title="Crear cliente" aria-pressed={modoCliente === "nuevo"} disabled={!busquedaSinResultados} onClick={abrirRegistroCliente}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7" /></svg>
              </button>
            </div></div>
            <div className="venta-client-picker">
              <label className="venta-sr-only" htmlFor="venta-buscar-cliente">Buscar cliente por nombre, DNI o RUC</label>
              {venta.clienteSeleccionado ? <div className="venta-client-selected"><div><strong>{nombreCliente}</strong><span>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"} {numeroDocumento}</span>{String(venta.camposNubefact.cliente_direccion ?? "").trim() ? <span>{String(venta.camposNubefact.cliente_direccion)}</span> : null}</div><div className="venta-client-selected-actions"><button className="venta-client-detail-trigger" type="button" aria-label="Ver detalle del cliente seleccionado" title="Ver detalle del cliente" onClick={() => setClienteEnDetalle(venta.clienteSeleccionado)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg></button><button className="venta-client-remove" type="button" aria-label="Quitar cliente de la venta" title="Quitar cliente" onClick={() => venta.quitarCliente()}>×</button></div></div> : <>
                <select className="venta-client-search-document" aria-label="Tipo de documento para buscar" value={tipoDocumentoBusqueda} onChange={(e) => { setTipoDocumentoBusqueda(e.target.value as "01" | "06"); venta.setBusquedaCliente(""); setBusquedaClienteEjecutada(""); setErrorBusquedaCliente(""); setMostrarNotificacionSinCliente(false); }}><option value="01">DNI</option><option value="06">RUC</option></select>
                <input id="venta-buscar-cliente" inputMode="numeric" maxLength={longitudDocumentoBusqueda} value={venta.busquedaCliente} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} onChange={(e) => { venta.setBusquedaCliente(e.target.value.replace(/\D/g, "").slice(0, longitudDocumentoBusqueda)); setBusquedaClienteEjecutada(""); setErrorBusquedaCliente(""); setMostrarNotificacionSinCliente(false); setMostrarRegistroCliente(false); }} placeholder={`Ingresa ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}`} autoComplete="off" aria-describedby={errorBusquedaCliente ? "venta-busqueda-cliente-error" : undefined} />
                {venta.buscandoClientes && <small className="venta-client-hint">Buscando en clientes…</small>}
                {busquedaClienteEjecutada === venta.busquedaCliente.trim() && venta.clientesEncontrados.length > 0 && <div className="venta-client-results">{venta.clientesEncontrados.map((cliente) => <div className="venta-client-result" key={cliente.id}><button className="venta-client-result-select" type="button" onClick={() => { const consultaDocumento = venta.busquedaCliente.trim(); const documentos = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]; const documento = documentos.find((item) => item.tipoDocumento === tipoDocumentoBusqueda && item.numeroDocumento.includes(consultaDocumento)) ?? documentos[0]; venta.seleccionarCliente(cliente); if (documento) venta.seleccionarDocumentoCliente(documento); setModoCliente("buscar"); setMostrarRegistroCliente(false); }}><strong>{cliente.nombreComercial ?? cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ")}</strong><span>{(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((doc) => `${doc.tipoDocumento === "06" ? "RUC" : doc.tipoDocumento === "01" ? "DNI" : doc.tipoDocumento} ${doc.numeroDocumento}`).join(" · ")}</span></button><button className="venta-client-detail-trigger" type="button" aria-label={`Ver detalle de ${cliente.nombreComercial ?? cliente.razonSocial ?? cliente.numeroDocumento}`} title="Ver detalle del cliente" onClick={() => setClienteEnDetalle(cliente)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg></button></div>)}</div>}
                {errorBusquedaCliente && <p id="venta-busqueda-cliente-error" className="venta-client-hint" role="alert">{errorBusquedaCliente}</p>}
                {mostrarRegistroCliente && createPortal(<div className="venta-new-client-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setMostrarRegistroCliente(false); }}><section className="venta-new-client" role="dialog" aria-modal="true" aria-labelledby="venta-new-client-title">
                  <div className="venta-new-client-heading"><div><strong id="venta-new-client-title">Registrar cliente</strong><small>Ya se buscó el {tipoDocumentoNuevo} {numeroDocumentoNuevo} y no hubo coincidencias.</small></div><button type="button" aria-label="Cerrar formulario" onClick={() => setMostrarRegistroCliente(false)}>×</button></div>
                  <div className="venta-new-client-fields">
                    <label>Documento<select value={tipoDocumentoNuevo} onChange={(e) => setTipoDocumentoNuevo(e.target.value as DatosClienteNuevo["tipoDocumento"])}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label>
                    <label>{tipoDocumentoNuevo}<span className="venta-inline-search"><input inputMode={tipoDocumentoNuevo === "PASAPORTE" || tipoDocumentoNuevo === "CE" ? "text" : "numeric"} value={numeroDocumentoNuevo} maxLength={tipoDocumentoNuevo === "DNI" ? 8 : tipoDocumentoNuevo === "RUC" ? 11 : 20} onChange={(e) => setNumeroDocumentoNuevo(tipoDocumentoNuevo === "CE" || tipoDocumentoNuevo === "PASAPORTE" ? e.target.value : e.target.value.replace(/\D/g, ""))} />{(tipoDocumentoNuevo === "DNI" || tipoDocumentoNuevo === "RUC") && <button type="button" className="venta-client-identity-search" onClick={() => void consultarIdentidadNueva()} disabled={buscandoIdentidadNueva || !documentoNuevoValido}>{buscandoIdentidadNueva ? "Consultando…" : "Buscar"}</button>}</span></label>
                    {personaJuridicaNueva ? <label className="venta-new-client-wide">Razón social<input value={razonSocialNueva} onChange={(e) => setRazonSocialNueva(e.target.value)} maxLength={180} /></label> : <><label>Nombres<input value={nombresNuevo} onChange={(e) => setNombresNuevo(e.target.value)} maxLength={120} /></label><label>Apellido paterno<input value={apellidoPaternoNuevo} onChange={(e) => setApellidoPaternoNuevo(e.target.value)} maxLength={120} /></label><label>Apellido materno<input value={apellidoMaternoNuevo} onChange={(e) => setApellidoMaternoNuevo(e.target.value)} maxLength={120} /></label></>}
                    <label className="venta-new-client-wide">Dirección fiscal<input value={direccionNueva} onChange={(e) => setDireccionNueva(e.target.value)} maxLength={240} /></label>
                  </div>
                  {errorRegistroCliente && <p className="venta-identity-status" role="alert">{errorRegistroCliente}</p>}
                  <button className="venta-save-client" type="button" disabled={venta.registrandoCliente || !documentoNuevoValido} onClick={async () => { const payload: DatosClienteNuevo = { tipoDocumento: tipoDocumentoNuevo, numeroDocumento: numeroDocumentoNuevo.trim(), ...(personaJuridicaNueva ? { razonSocial: razonSocialNueva.trim() } : { nombres: nombresNuevo.trim(), apellidoPaterno: apellidoPaternoNuevo.trim(), apellidoMaterno: apellidoMaternoNuevo.trim() }), direccion: direccionNueva.trim() }; const ok = await venta.guardarCliente(payload); if (ok) setMostrarRegistroCliente(false); }}>{venta.registrandoCliente ? "Guardando cliente…" : "Guardar y usar en esta venta"}</button>
                </section></div>, document.getElementById("root") ?? document.body)}
              </>}
            </div>
          </section>
          </div>
        <section className="venta-form-body">
          {venta.controlNrus && venta.ingresoBrutoProyectadoNrus !== null && venta.ingresoBrutoProyectadoNrus >= venta.controlNrus.alertaCategoria1 && venta.ingresoBrutoProyectadoNrus < venta.controlNrus.alertaLimiteMensual && <div className="venta-nrus-alert is-warning" role="status"><strong>Alerta preventiva de ingresos NRUS</strong><span>Con esta venta, el acumulado de {venta.controlNrus.periodo} sería {soles(venta.ingresoBrutoProyectadoNrus)}. {venta.ingresoBrutoProyectadoNrus < venta.controlNrus.limiteCategoria1 ? `Te acercas al umbral de S/ ${venta.controlNrus.limiteCategoria1.toLocaleString("es-PE")}.` : `El tope mensual es menor a S/ ${venta.controlNrus.limiteMensual.toLocaleString("es-PE")}.`}</span></div>}
          {venta.controlNrus && venta.ingresoBrutoProyectadoNrus !== null && venta.ingresoBrutoProyectadoNrus >= venta.controlNrus.alertaLimiteMensual && venta.ingresoBrutoProyectadoNrus < venta.controlNrus.limiteMensual && <div className="venta-nrus-alert is-critical" role="status"><strong>Alerta: estás por alcanzar el límite mensual</strong><span>Con esta venta, el acumulado sería {soles(venta.ingresoBrutoProyectadoNrus)}. El sistema bloqueará nuevas boletas al llegar a S/ {venta.controlNrus.limiteMensual.toLocaleString("es-PE")}.</span></div>}
          {venta.controlNrus && venta.ingresoBrutoProyectadoNrus !== null && venta.ingresoBrutoProyectadoNrus >= venta.controlNrus.limiteMensual && <div className="venta-nrus-alert is-blocked" role="alert"><strong>Boleta bloqueada por el límite mensual NRUS</strong><span>El acumulado de {venta.controlNrus.periodo} llegaría a {soles(venta.ingresoBrutoProyectadoNrus)}. La emisión se bloquea desde S/ 8,000.00.</span></div>}
          <div className="venta-form-body-heading"><h3>Productos y servicios</h3><div className="venta-product-tools"><span>{venta.lineas.length} líneas</span><button type="button" onClick={() => setMostrarCamara(true)}>Leer con cámara</button>{permisos.includes("INGRESOS.SERVICIO_PRECIO_MANUAL") && <button type="button" onClick={venta.agregarServicio}>+ Agregar servicio</button>}</div></div>
          <div className="venta-inline-product-search">
            <label className="venta-inline-product-input"><span aria-hidden="true">⌕</span><input value={venta.busqueda} onChange={(evento) => venta.setBusqueda(evento.target.value)} onKeyDown={buscarProductoConEnter} placeholder="Buscar producto por nombre o código…" aria-label="Buscar productos para la venta" autoComplete="off" /></label>
            <div className="venta-inline-product-list" aria-live="polite">
              {venta.buscando ? <p className="venta-catalog-status">Buscando en inventario…</p> : buscandoEnCatalogo ? productosCatalogo.length > 0 ? productosCatalogo.map((producto) => <button className="venta-inline-product-row" key={producto.presentacionId} type="button" onClick={() => venta.agregarProducto(producto)}><span><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.presentacion} · Stock {Number(producto.stockBase).toLocaleString("es-PE")}</small></span><strong>{soles(Number(producto.precio))}</strong></button>) : <div className="venta-inline-product-empty"><span className="venta-catalog-empty-face" role="img" aria-label="Sin resultados">😞</span><strong>No hay productos para mostrar</strong><span>No encontramos coincidencias. Prueba con otro nombre o código.</span>{permisos.includes("INVENTARIO.CREAR") && <button type="button" onClick={() => void abrirAltaProducto()}>Registrar producto</button>}</div> : null}
            </div>
          </div>
          {venta.lineas.length === 0 ? <div className="venta-empty"><strong>Agrega el primer producto</strong><span>Busca en el catálogo o añade un servicio para iniciar.</span></div> : <div className="venta-lines"><div className="venta-table-head"><span>Descripción</span><span>Cant.</span><span>Precio</span><span>Descuento</span><span>Total</span><i /></div>{venta.lineas.map((linea, indice) => { const separadorTipo = indice > 0 && venta.lineas[indice - 1].tipo !== linea.tipo; const precio = linea.tipo === "PRODUCTO" ? Number(linea.producto.precio) : Number(linea.precio) || 0; const importe = precio * (Number(linea.cantidad) || 0); const descuento = Number(linea.descuento) || 0; const totalLinea = Math.max(0, importe - descuento); return <div className={`venta-line${separadorTipo ? " has-type-separator" : ""}`} key={linea.clave}><div className="venta-line-name"><strong>{linea.tipo === "PRODUCTO" ? linea.producto.nombre : <input aria-label="Descripción del servicio" placeholder="Descripción del servicio" value={linea.descripcion.toLocaleUpperCase("es-PE")} onChange={(e) => venta.actualizarLinea(linea.clave, { descripcion: e.target.value.toLocaleUpperCase("es-PE") })} />}</strong><small>{linea.tipo === "PRODUCTO" ? `${linea.producto.codigo} · Stock ${Number(linea.producto.stockBase).toLocaleString("es-PE")}` : ""}</small>{linea.tipo === "SERVICIO" && venta.tipoComprobante === "BOLETA" ? <small className="venta-service-tax">Servicio inafecto · NRUS</small> : null}</div><input className="venta-qty" aria-label="Cantidad" type="number" min="0.001" step="0.001" value={linea.cantidad} onChange={(e) => venta.actualizarLinea(linea.clave, { cantidad: e.target.value })} />{linea.tipo === "PRODUCTO" ? <div className="venta-line-price"><strong>{soles(precio)}</strong><small>{linea.producto.listaPrecioNombre} · Precio</small></div> : <input className="venta-service-price" aria-label="Precio unitario del servicio" title="Precio unitario del servicio" type="number" min="0" step="0.01" value={linea.precio} onChange={(e) => venta.actualizarLinea(linea.clave, { precio: e.target.value })} />}<input className="venta-discount" aria-label={`Descuento total de ${linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.descripcion || "servicio"}`} title="Descuento en soles" type="number" min="0" max={importe.toFixed(2)} step="0.01" value={linea.descuento} onChange={(e) => venta.actualizarLinea(linea.clave, { descuento: e.target.value })} /><strong>{soles(totalLinea)}</strong><button type="button" aria-label="Quitar producto" onClick={() => venta.quitarLinea(linea.clave)}>×</button></div>})}</div>}
        </section>
        <div className="venta-data-footer">
          <label className="venta-observation-card">Observaciones<textarea aria-label="Observaciones" value={venta.observacion} onChange={(e) => venta.setObservacion(e.target.value)} maxLength={1000} rows={3} placeholder="Añade una nota" /></label>
          <div className="venta-checkout-actions"><div className="venta-checkout-summary"><div><span>{venta.tipoComprobante === "BOLETA" ? "Subtotal" : "Valor referencial de salida"}</span><strong>{soles(venta.tipoComprobante === "BOLETA" ? subtotal : venta.totales.total)}</strong></div>{venta.tipoComprobante === "BOLETA" && <div><span>IGV separado · NRUS</span><strong>{soles(0)}</strong></div>}</div><div className="venta-checkout-total"><span>{venta.tipoComprobante === "BOLETA" ? "Total de la venta" : "Valor referencial de salida"}</span><strong>{soles(venta.totales.total)}</strong></div><div className="venta-checkout-buttons"><button type="button" className="venta-clear" onClick={limpiarVenta}>Limpiar</button><button className="venta-submit" type="submit" disabled={venta.tipoComprobante === "BOLETA" && venta.superaLimiteMensualNrus}>{venta.tipoComprobante === "BOLETA" ? "Continuar" : "Continuar con la nota"} <span aria-hidden="true">→</span></button></div></div>
        </div>
        </article>
      </div>
      </>}

      {paso === "previa" && <section className={`venta-preview-stage paper-${tamano.toLowerCase()}`}>
        <div className="venta-preview-toolbar"><button type="button" className="venta-back" onClick={() => setPaso("datos")}>← Volver a editar</button><fieldset className="venta-size-picker"><legend>Tamaño de impresión</legend>{(["A4", "A5", "TICKET"] as const).map((opcion) => <button key={opcion} type="button" className={tamano === opcion ? "is-selected" : ""} aria-pressed={tamano === opcion} onClick={() => setTamano(opcion)}>{opcion === "TICKET" ? "Ticket 80 mm" : opcion}</button>)}</fieldset><button type="button" className="venta-print" onClick={() => window.print()}>Imprimir <span aria-hidden="true">⎙</span></button></div>
      <aside className="boleta-preview" aria-label="Documento para impresión">
        <article className="boleta-paper">
          <div className="boleta-title"><strong>{presentacionComprobante.titulo}</strong></div>
          {venta.tipoComprobante === "BOLETA" ? <div className="boleta-client"><span>CLIENTE</span><strong>{nombreCliente || "CLIENTES VARIOS"}</strong>{numeroDocumento && <small>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"}: {numeroDocumento}</small>}{String(venta.camposNubefact.cliente_direccion ?? "").trim() && <small>{String(venta.camposNubefact.cliente_direccion)}</small>}<small>Emisión: {venta.fecha}</small></div> : <div className="boleta-client"><span>CLIENTE · MOVIMIENTO INTERNO DE INVENTARIO</span><strong>{nombreCliente}</strong>{numeroDocumento && <small>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"}: {numeroDocumento}</small>}{String(venta.camposNubefact.cliente_direccion ?? "").trim() && <small>{String(venta.camposNubefact.cliente_direccion)}</small>}<small>Fecha de salida: {venta.fecha}</small></div>}
          <div className="boleta-items"><div className="boleta-items-head"><span>CANT.</span><span>DESCRIPCIÓN</span><span>IMPORTE</span></div>{venta.lineas.length ? venta.lineas.map((linea) => { const precio = linea.tipo === "PRODUCTO" ? Number(linea.producto.precio) : Number(linea.precio) || 0; return <div className="boleta-item" key={linea.clave}><span>{linea.cantidad}</span><span>{linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.descripcion || "Servicio"}</span><span>{soles(Math.max(0, precio * (Number(linea.cantidad) || 0) - (Number(linea.descuento) || 0)))}</span></div>; }) : <p>Los artículos de la venta aparecerán aquí.</p>}</div>
          <div className="boleta-totals">{venta.tipoComprobante === "BOLETA" && <>{venta.totales.gravada > 0 && <div><span>Op. gravada</span><strong>{soles(venta.totales.gravada)}</strong></div>}{venta.totales.exonerada > 0 && <div><span>Op. exonerada</span><strong>{soles(venta.totales.exonerada)}</strong></div>}{venta.totales.inafecta > 0 && <div><span>Op. inafecta</span><strong>{soles(venta.totales.inafecta)}</strong></div>}<div><span>Tratamiento NRUS</span><strong>Sin IGV desglosado</strong></div></>}<div className="boleta-total"><span>{venta.tipoComprobante === "BOLETA" ? "TOTAL" : "VALOR REFERENCIAL"}</span><strong>{soles(venta.totales.total)}</strong></div></div>
          <div className="boleta-foot"><span>Unidades: {cantidadTotal.toLocaleString("es-PE")}</span><span>Medio de pago: {venta.medioPago.toLocaleLowerCase("es-PE").replaceAll("_", " ")}</span></div>
        </article>
        <div className="boleta-actions"><button className="venta-submit" type="submit" disabled={venta.guardando || !venta.lineas.length || Boolean(venta.exito) || (venta.tipoComprobante === "BOLETA" && venta.superaLimiteMensualNrus)}>{venta.exito ? venta.tipoComprobante === "NOTA_VENTA" ? "Nota interna guardada" : ["EMITIDO_DEMO", "EMITIDO"].includes(venta.exito.nubefact?.estado ?? "") ? `Emitido en NubeFact ${venta.exito.nubefact?.ambiente}` : "Emisión no confirmada" : venta.guardando ? venta.tipoComprobante === "BOLETA" ? `Enviando a NubeFact ${venta.estadoNubefact?.ambiente ?? ""}…` : "Registrando nota interna…" : venta.tipoComprobante === "BOLETA" ? `Emitir boleta ${venta.estadoNubefact?.ambiente ?? ""}` : "Registrar nota de venta"}<span aria-hidden="true">→</span></button></div>
      </aside>
      </section>}
    </form>
    {clienteEnDetalle && <ClienteDetalleDialog cliente={clienteEnDetalle} editable={permisos.includes("PERSONAS.EDITAR")} onClose={() => setClienteEnDetalle(null)} onSave={async (datos) => { const clienteActualizado = await servicioIngresos.actualizarCliente(clienteEnDetalle.id, datos); venta.actualizarClienteEnResultados(clienteActualizado); setClienteEnDetalle(clienteActualizado); }} />}
    {mostrarCamara && <LectorCamaraDialog onClose={() => setMostrarCamara(false)} onCode={(codigo) => void agregarCodigoLeido(codigo)} />}{mostrarCobranza && venta.exito?.nubefact && venta.exito.tipoComprobante  && createPortal(<PagoIngresoDialog ingresoId={venta.exito.id} total={venta.exito.total} contadoPendiente={contadoEmitido && cobranzaContadoPendiente} importeInicialObligatorio={pagoInicialCreditoPendiente && cobranzaContadoPendiente} fechaPagoInicial={venta.fecha} importeInicial={contadoEmitido ? venta.exito.total : venta.exito.importePagoInicial} medioPagoInicial={venta.exito.medioPago} onPaymentRecorded={() => { if (cobranzaContadoPendiente) setCobranzaContadoRegistradaId(venta.exito?.id ?? null); }} onClose={() => setMostrarCobranza(false)} />, document.body)}
    {mostrarAltaProducto && createPortal(cargandoAltaProducto ? <div className="catalog-modal-backdrop"><section className="catalog-modal venta-product-register-status" role="dialog" aria-modal="true" aria-label="Preparando el registro del producto"><p>Cargando formulario de producto…</p></section></div> : catalogosAltaProducto ? <ProductoFormulario catalogos={catalogosAltaProducto} producto={null} error="" alCerrar={() => setMostrarAltaProducto(false)} alGuardar={guardarProductoDesdeVenta} alCrearMarca={async (nombre, imagen) => { const resultado = await servicioProductos.crearMarca(nombre, imagen); return { ...resultado.marca, advertencia: resultado.advertencia }; }} alCrearCategoria={async (nombre, imagen) => { const resultado = await servicioProductos.crearCategoria(nombre, imagen); return { ...resultado.categoria, advertencia: resultado.advertencia }; }} /> : <div className="catalog-modal-backdrop"><section className="catalog-modal venta-product-register-status" role="dialog" aria-modal="true" aria-labelledby="venta-alta-producto-error"><button className="catalog-modal-close" type="button" aria-label="Cerrar" onClick={() => setMostrarAltaProducto(false)}>×</button><h2 id="venta-alta-producto-error">No se pudo abrir el registro</h2><p>{errorAltaProducto}</p><div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={() => setMostrarAltaProducto(false)}>Cancelar</button><button className="catalog-submit" type="button" onClick={() => void abrirAltaProducto()}>Reintentar</button></div></section></div>, document.getElementById("root") ?? document.body)}
  </div>;
}

function LectorCamaraDialog({ onClose, onCode }: { onClose: () => void; onCode: (codigo: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState("Solicitando acceso a la cámara…");
  const [error, setError] = useState("");
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  useEffect(() => {
    let vigente = true;
    let frame = 0;
    let leyendo = false;
    let stream: MediaStream | null = null;
    const Detector = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>; }; }).BarcodeDetector;
    if (!window.isSecureContext) {
      setError("La cámara requiere abrir el sistema por HTTPS o desde localhost. El lector conectado y la búsqueda manual siguen disponibles.");
      return () => { vigente = false; };
    }
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no ofrece lectura de códigos por cámara. Usa el campo de búsqueda manual o un lector conectado.");
      return () => { vigente = false; };
    }
    void (async () => {
      try {
        const formatosDisponibles = await (Detector as unknown as { getSupportedFormats?: () => Promise<string[]> }).getSupportedFormats?.();
        const preferidos = ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "codabar", "data_matrix", "pdf417", "aztec"];
        const formatos = formatosDisponibles?.filter((formato) => preferidos.includes(formato));
        const detector = new Detector(formatosDisponibles === undefined || formatos?.length ? { formats: formatos } : undefined);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!vigente || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setEstado("Apunta la cámara al código QR o de barras.");
        const revisar = async () => {
          if (!vigente || !videoRef.current || leyendo) { if (vigente) frame = requestAnimationFrame(revisar); return; }
          leyendo = true;
          try {
            const encontrados = await detector.detect(videoRef.current);
            if (encontrados[0]?.rawValue) {
              vigente = false;
              stream?.getTracks().forEach((track) => track.stop());
              onCodeRef.current(encontrados[0].rawValue);
              return;
            }
          } catch { /* Continúa intentando mientras la cámara esté abierta. */ }
          finally { leyendo = false; }
          if (vigente) window.setTimeout(() => { frame = requestAnimationFrame(revisar); }, 160);
        };
        frame = requestAnimationFrame(revisar);
      } catch (problema) {
        if (vigente) setError(problema instanceof Error && problema.name === "NotAllowedError" ? "No se autorizó el acceso a la cámara. Permite el acceso o usa la búsqueda manual." : "No se pudo iniciar la cámara en este dispositivo. Puedes usar la búsqueda manual.");
      }
    })();
    return () => { vigente = false; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  return <div className="venta-camera-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}><section className="venta-camera-dialog" role="dialog" aria-modal="true" aria-labelledby="venta-camera-title"><header><div><span>LECTOR DE CÓDIGOS</span><h2 id="venta-camera-title">Leer con cámara</h2></div><button type="button" aria-label="Cerrar lector" onClick={onClose}>×</button></header>{error ? <div className="venta-camera-error" role="status">{error}</div> : <><video ref={videoRef} muted playsInline aria-label="Vista de la cámara" /><p>{estado}</p></>}</section></div>;
}

type DatosEdicionCliente = Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">;

function ClienteDetalleDialog({ cliente, editable, onClose, onSave }: { cliente: ClienteRegistrado; editable: boolean; onClose: () => void; onSave: (datos: DatosEdicionCliente) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<DatosEdicionCliente>({ nombreComercial: cliente.nombreComercial ?? "", contactoNombre: cliente.contactoNombre ?? "", correo: cliente.correo ?? "", telefono: cliente.telefono ?? "", direccion: cliente.direccion ?? "", direccionEntrega: cliente.direccionEntrega ?? "", observacion: cliente.observacion ?? "" });
  const nombre = cliente.nombreComercial || cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
  const editarCampo = (campo: keyof DatosEdicionCliente, valor: string) => setDatos((actual) => ({ ...actual, [campo]: valor }));
  async function guardarCambios() { setGuardando(true); setError(""); try { await onSave(datos); setEditando(false); } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo actualizar el cliente."); } finally { setGuardando(false); } }
  return <div className="venta-client-detail-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}><section className="venta-client-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="venta-client-detail-title">
    <header><div><small>FICHA DE CLIENTE</small><h2 id="venta-client-detail-title">{nombre}</h2></div><button type="button" aria-label="Cerrar detalle" onClick={onClose}>×</button></header>
    <div className="venta-client-detail-grid">
      <div><small>Documento</small><strong>{cliente.numeroDocumento}</strong></div>
      <div><small>Tipo de persona</small><strong>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Persona natural"}</strong></div>
      {editando ? <>
        <label>Nombre comercial<input value={datos.nombreComercial} maxLength={180} onChange={(evento) => editarCampo("nombreComercial", evento.target.value)} /></label>
        <label>Persona de contacto<input value={datos.contactoNombre} maxLength={180} onChange={(evento) => editarCampo("contactoNombre", evento.target.value)} /></label>
        <label>Correo<input type="email" value={datos.correo} maxLength={254} onChange={(evento) => editarCampo("correo", evento.target.value)} /></label>
        <label>Teléfono<input type="tel" value={datos.telefono} maxLength={30} onChange={(evento) => editarCampo("telefono", evento.target.value)} /></label>
        <label className="venta-client-detail-wide">Dirección fiscal<input value={datos.direccion} maxLength={240} onChange={(evento) => editarCampo("direccion", evento.target.value)} /></label>
        <label className="venta-client-detail-wide">Dirección de entrega<input value={datos.direccionEntrega} maxLength={240} onChange={(evento) => editarCampo("direccionEntrega", evento.target.value)} /></label>
        <label className="venta-client-detail-wide">Nota interna<textarea rows={3} maxLength={1000} value={datos.observacion} onChange={(evento) => editarCampo("observacion", evento.target.value)} /></label>
      </> : <>
        <div><small>Nombre comercial</small><strong>{cliente.nombreComercial || "—"}</strong></div>
        <div><small>Persona de contacto</small><strong>{cliente.contactoNombre || "—"}</strong></div>
        <div><small>Correo</small><strong>{cliente.correo || "—"}</strong></div>
        <div><small>Teléfono</small><strong>{cliente.telefono || "—"}</strong></div>
        <div className="venta-client-detail-wide"><small>Dirección fiscal</small><strong>{cliente.direccion || "—"}</strong></div>
        <div className="venta-client-detail-wide"><small>Dirección de entrega</small><strong>{cliente.direccionEntrega || "—"}</strong></div>
        <div className="venta-client-detail-wide"><small>Nota interna</small><strong>{cliente.observacion || "—"}</strong></div>
      </>}
    </div>
    {error && <p className="venta-client-detail-error" role="alert">{error}</p>}
    <footer>{editando ? <><button type="button" className="venta-client-detail-secondary" onClick={() => setEditando(false)}>Cancelar</button><button type="button" className="venta-client-detail-primary" onClick={() => void guardarCambios()} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></> : <><button type="button" className="venta-client-detail-secondary" onClick={onClose}>Cerrar</button>{editable && <button type="button" className="venta-client-detail-primary" onClick={() => setEditando(true)}>Editar cliente</button>}</>}</footer>
  </section></div>;
}


