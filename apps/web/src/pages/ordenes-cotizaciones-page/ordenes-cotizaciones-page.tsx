import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FileOutput, MessageCircle } from "lucide-react";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type ClienteRegistrado, type Cotizacion, type DatosClienteNuevo, type OrdenServicio, type ProductoParaIngreso } from "../../services/ingresos.service";
import { imprimirDocumento } from "../../services/impresion-documentos";
import { FormularioCliente } from "../clientes-page/clientes-page";
import "./ordenes-cotizaciones-page.css";
import "./cotizaciones-page.css";

type ModoGestion = "ORDENES" | "COTIZACIONES";
type LineaGestion = Record<string, unknown> & { tipo: "PRODUCTO" | "SERVICIO"; nombreVisible: string; precioUnitario: string; cantidad: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" };
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const sumarDias = (fecha: string, dias: number) => { const resultado = new Date(`${fecha}T00:00:00Z`); resultado.setUTCDate(resultado.getUTCDate() + dias); return resultado.toISOString().slice(0, 10); };
const dinero = (valor: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const totalLineas = (lineas: Record<string, unknown>[]) => lineas.reduce((suma, linea) => suma + Number(linea.cantidad ?? 1) * Number(linea.precioUnitario ?? 0) - Number(linea.descuento ?? 0), 0);
const mensajeWhatsAppCotizacion = (cotizacion: Cotizacion) => [
  `Cotización ${cotizacion.codigo}`,
  `Cliente: ${cotizacion.clienteNombre ?? "Sin cliente"}`,
  `Vigente hasta: ${cotizacion.vigenteHasta ?? "sin fecha"}`,
  ...cotizacion.detalles.map((linea) => {
    const cantidad = Number(linea.cantidad ?? 1);
    const precio = Number(linea.precioUnitario ?? 0);
    return `${String(linea.nombreVisible ?? linea.descripcion ?? "Artículo")} · ${cantidad} x ${dinero(cantidad * precio - Number(linea.descuento ?? 0))}`;
  }),
  `Total: ${dinero(totalLineas(cotizacion.detalles))}`,
].join("\n");

export function OrdenesCotizacionesPage({ modo, puedeCrear }: { modo: ModoGestion; puedeCrear: boolean }) {
  const navegar = useNavigate();
  const esOrden = modo === "ORDENES";
  const [registrosOrden, setRegistrosOrden] = useState<OrdenServicio[]>([]);
  const [registrosCotizacion, setRegistrosCotizacion] = useState<Cotizacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstadoCotizacion, setFiltroEstadoCotizacion] = useState("TODAS");
  const [filtroVigenciaDesde, setFiltroVigenciaDesde] = useState("");
  const [filtroVigenciaHasta, setFiltroVigenciaHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [codigoCotizacionPrevisualizado, setCodigoCotizacionPrevisualizado] = useState<string | null>(null);
  const [consultandoSerieCotizacion, setConsultandoSerieCotizacion] = useState(false);
  const [errorConsultaSerieCotizacion, setErrorConsultaSerieCotizacion] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [confirmarDescarteCotizacion, setConfirmarDescarteCotizacion] = useState(false);
  const [ordenActiva, setOrdenActiva] = useState<OrdenServicio | null>(null);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteBusquedaConsultada, setClienteBusquedaConsultada] = useState("");
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"DNI" | "RUC" | "NOMBRE">("DNI");
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cliente, setCliente] = useState<ClienteRegistrado | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<ProductoParaIngreso[]>([]);
  const [lineas, setLineas] = useState<LineaGestion[]>([]);
  const [trabajo, setTrabajo] = useState("");
  const [precioTrabajo, setPrecioTrabajo] = useState("");
  const [cantidadTrabajo, setCantidadTrabajo] = useState("1");
  const [vehiculo, setVehiculo] = useState({ placa: "", motivo: "", diagnostico: "" });
  const [fechaRecepcionOrden, setFechaRecepcionOrden] = useState(hoy());
  const [fechaAcabadoOrden, setFechaAcabadoOrden] = useState(hoy());
  const [estadoOrden, setEstadoOrden] = useState<OrdenServicio["estado"]>("ABIERTA");
  const [notaAvance, setNotaAvance] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaEmisionCotizacion, setFechaEmisionCotizacion] = useState(hoy);
  const [vigenteHasta, setVigenteHasta] = useState(() => sumarDias(hoy(), 15));
  const [tipoComprobante, setTipoComprobante] = useState<"BOLETA" | "FACTURA" | "NOTA_VENTA">("BOLETA");

  async function cargar() {
    setCargando(true);
    try {
      if (esOrden) setRegistrosOrden(await servicioIngresos.listarOrdenesServicio(busqueda));
      else setRegistrosCotizacion(await servicioIngresos.listarCotizaciones(busqueda));
      setError("");
    } catch (problema) {
      if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
      setError(problema instanceof Error ? problema.message : "No se pudo cargar la información.");
    } finally { setCargando(false); }
  }
  useEffect(() => { const temporizador = window.setTimeout(() => void cargar(), busqueda ? 220 : 0); return () => window.clearTimeout(temporizador); }, [busqueda, esOrden]);
  useEffect(() => {
    if (!esOrden) return;
    const texto = clienteBusqueda.trim();
    setClienteBusquedaConsultada("");
    if (texto.length < 2 || cliente) { setClientes([]); return; }
    let vigente = true;
    const temporizador = window.setTimeout(() => void servicioIngresos.buscarClientes(texto).then((resultados) => { if (vigente) { setClientes(resultados); setClienteBusquedaConsultada(texto); } }).catch(() => { if (vigente) setClientes([]); }), 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [clienteBusqueda, cliente, esOrden]);
  useEffect(() => {
    const texto = busquedaProducto.trim();
    if (texto.length < 2) { setProductos([]); return; }
    const temporizador = window.setTimeout(() => void servicioIngresos.buscarProductos(texto).then(setProductos).catch(() => setProductos([])), 220);
    return () => window.clearTimeout(temporizador);
  }, [busquedaProducto]);
  useEffect(() => {
    if (esOrden || !mostrarFormulario) return;
    let vigente = true;
    setCodigoCotizacionPrevisualizado(null); setErrorConsultaSerieCotizacion(false); setConsultandoSerieCotizacion(true);
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (vigente) { setCodigoCotizacionPrevisualizado(numeraciones.COTIZACION.codigo); setErrorConsultaSerieCotizacion(false); }
    }).catch(() => {
      if (vigente) { setCodigoCotizacionPrevisualizado(null); setErrorConsultaSerieCotizacion(true); }
    }).finally(() => { if (vigente) setConsultandoSerieCotizacion(false); });
    return () => { vigente = false; };
  }, [esOrden, mostrarFormulario]);

  const total = useMemo(() => totalLineas(lineas), [lineas]);
  function nuevaGestion() {
    const fechaCotizacion = hoy();
    setFechaEmisionCotizacion(fechaCotizacion);
    setOrdenActiva(null); setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setTipoDocumentoBusqueda("DNI"); setClientes([]); setLineas([]); setObservacion(""); setVigenteHasta(sumarDias(fechaCotizacion, 15)); setTrabajo(""); setPrecioTrabajo(""); setBusquedaProducto("");
    setVehiculo({ placa: "", motivo: "", diagnostico: "" }); setFechaRecepcionOrden(hoy()); setFechaAcabadoOrden(hoy()); setEstadoOrden("ABIERTA"); setNotaAvance(""); setMostrarFormularioCliente(false); setConfirmarDescarteCotizacion(false); setMostrarFormulario(true); setError("");
  }
  function cerrarFormularioGestion() {
    if (!esOrden) { setConfirmarDescarteCotizacion(true); return; }
    setMostrarFormulario(false);
  }
  function limpiarBorradorCotizacion() {
    const fecha = hoy();
    setFechaEmisionCotizacion(fecha); setVigenteHasta(sumarDias(fecha, 15));
    setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setTipoDocumentoBusqueda("DNI"); setClientes([]);
    setLineas([]); setObservacion(""); setBusquedaProducto(""); setProductos([]); setError("");
  }
  function descartarCotizacion() {
    setConfirmarDescarteCotizacion(false);
    setMostrarFormulario(false);
    limpiarBorradorCotizacion();
  }
  function abrirOrden(orden: OrdenServicio) {
    setOrdenActiva(orden); setCliente(null); setClienteBusqueda(orden.clienteNombre); setLineas(orden.detalles as LineaGestion[]); setEstadoOrden(orden.estado);
    setVehiculo({ placa: orden.vehiculoPlaca, motivo: orden.motivo, diagnostico: orden.diagnostico ?? "" });
    setFechaRecepcionOrden(orden.fechaRecepcion); setFechaAcabadoOrden(orden.fechaAcabado ?? "");
    setNotaAvance(""); setMostrarFormulario(true); setError("");
  }
  async function ejecutarBusquedaCliente() {
    const consulta = clienteBusqueda.trim();
    if (buscandoClientes) return;
    if (consulta.length < 2) { setError("Ingresa al menos dos caracteres para buscar al cliente."); return; }
    setBuscandoClientes(true); setClientes([]); setClienteBusquedaConsultada(""); setError("");
    try {
      const resultados = await servicioIngresos.buscarClientes(consulta);
      setClientes(resultados); setClienteBusquedaConsultada(consulta);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo buscar el cliente."); }
    finally { setBuscandoClientes(false); }
  }
  async function registrarYSeleccionarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const coincidencias = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const nuevoCliente = coincidencias.find((item) => item.id === creado.id) ?? coincidencias.find((item) => item.numeroDocumento === datos.numeroDocumento);
      if (!nuevoCliente) return esOrden ? "El cliente se registró, pero no se pudo cargar en la orden. Vuelve a buscarlo por su documento." : "El cliente se registró, pero no se pudo cargar en la cotización. Vuelve a buscarlo por su documento.";
      setCliente(nuevoCliente); setClienteBusqueda(nombreCliente(nuevoCliente)); setClientes([]); setMostrarFormularioCliente(false);
      return null;
    } catch (problema) { return problema instanceof Error ? problema.message : "No se pudo registrar el cliente."; }
  }
  function agregarProducto(producto: ProductoParaIngreso) {
    setLineas((anteriores) => [...anteriores, { tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: "1", descuento: "0", afectacionIgv: producto.afectacionIgv, precioUnitario: producto.precio, nombreVisible: `${producto.nombre} · ${producto.presentacion}` }]);
    setBusquedaProducto(""); setProductos([]);
  }
  function agregarTrabajo() {
    if (!trabajo.trim() || Number(precioTrabajo) < 0 || !Number.isFinite(Number(precioTrabajo)) || Number(cantidadTrabajo) <= 0) { setError("Indica la descripción, la cantidad y un precio válido para el trabajo."); return; }
    setLineas((anteriores) => [...anteriores, { tipo: "SERVICIO", descripcion: trabajo.trim().toLocaleUpperCase("es-PE"), nombreVisible: trabajo.trim().toLocaleUpperCase("es-PE"), cantidad: cantidadTrabajo, precioUnitario: Number(precioTrabajo).toFixed(2), descuento: "0", afectacionIgv: "GRAVADO" }]);
    setTrabajo(""); setPrecioTrabajo(""); setCantidadTrabajo("1"); setError("");
  }
  function agregarServicioCotizacion() {
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) { setError("Completa la descripción, cantidad y precio del servicio antes de agregar otro."); return; }
    const indice = lineas.length;
    setLineas((actuales) => [...actuales, { tipo: "SERVICIO", descripcion: "", nombreVisible: "", cantidad: "1", precioUnitario: "", descuento: "0", afectacionIgv: "GRAVADO" }]);
    setError("");
    window.requestAnimationFrame(() => {
      const campo = document.getElementById(`cotizacion-servicio-descripcion-${indice}`) as HTMLInputElement | null;
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
      campo?.focus({ preventScroll: true });
    });
  }
  function actualizarLineaCotizacion(indice: number, cambios: Partial<LineaGestion>) {
    setLineas((actuales) => actuales.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea));
    setError("");
  }
  async function guardarGestion() {
    if (esOrden && !cliente && !ordenActiva) { setError("Selecciona un cliente."); return; }
    if (!esOrden && !codigoCotizacionPrevisualizado) { setError(errorConsultaSerieCotizacion ? "No se pudo consultar la serie de cotización." : "Falta configurar una serie para cotizaciones."); return; }
    if (esOrden && !vehiculo.placa.trim()) { setError("Ingresa la placa o el identificador del vehículo."); return; }
    if (!esOrden && !lineas.length) { setError("Agrega al menos un repuesto o un trabajo."); return; }
    if (!esOrden && vigenteHasta < fechaEmisionCotizacion) { setError("La fecha de vigencia no puede ser anterior a la fecha de emisión."); return; }
    if (!esOrden) {
      const cantidadNoEntera = lineas.find((linea) => !Number.isInteger(Number(linea.cantidad)) || Number(linea.cantidad) < 1);
      if (cantidadNoEntera) { setError("La cantidad de cada repuesto o servicio debe ser un entero mayor que cero."); return; }
      const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
      if (servicioIncompleto) { setError("Completa la descripción, cantidad y precio de cada servicio antes de guardar la cotización."); return; }
    }
    setGuardando(true); setError("");
    try {
      const detalles = lineas as Record<string, unknown>[];
      if (esOrden) {
        if (ordenActiva) await servicioIngresos.actualizarOrdenServicio(ordenActiva.id, { diagnostico: vehiculo.diagnostico, motivo: vehiculo.motivo, detalles, estado: estadoOrden, notaAvance, fechaAcabado: fechaAcabadoOrden });
        else await servicioIngresos.crearOrdenServicio({ clienteId: cliente!.id, vehiculoPlaca: vehiculo.placa, motivo: vehiculo.motivo, diagnostico: vehiculo.diagnostico || null, fechaRecepcion: fechaRecepcionOrden, fechaAcabado: fechaAcabadoOrden, detalles });
      } else {
        await servicioIngresos.crearCotizacion({ clienteId: cliente?.id ?? null, detalles, observacion, vigenteHasta: vigenteHasta || null });
        setConfirmarDescarteCotizacion(false); limpiarBorradorCotizacion();
      }
      setMostrarFormulario(false); setOrdenActiva(null); await cargar();
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  }
  async function cerrarOrden() {
    if (!ordenActiva) return;
    setGuardando(true); setError("");
    try {
      await servicioIngresos.actualizarOrdenServicio(ordenActiva.id, { diagnostico: vehiculo.diagnostico, motivo: vehiculo.motivo, detalles: lineas, estado: "COMPLETADA", notaAvance });
      await servicioIngresos.emitirOrdenServicio(ordenActiva.id, { tipoComprobante, medioPago: "EFECTIVO" }); setMostrarFormulario(false); setOrdenActiva(null); await cargar();
    }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo emitir el documento."); }
    finally { setGuardando(false); }
  }
  function imprimirCotizacion(cotizacion: Cotizacion) {
    return (formato: "A4" | "TICKET") => imprimirDocumento({ tipo: "COTIZACIÓN", codigo: cotizacion.codigo, fecha: cotizacion.fecha, cliente: cotizacion.clienteNombre ?? "Sin cliente", vigencia: cotizacion.vigenteHasta ?? undefined, estado: cotizacion.estado, lineas: cotizacion.detalles.map((linea) => { const cantidad = Number(linea.cantidad ?? 1); const precio = Number(linea.precioUnitario ?? 0); return { descripcion: String(linea.nombreVisible ?? linea.descripcion ?? "Repuesto"), cantidad: String(cantidad), precio: dinero(precio), total: dinero(cantidad * precio - Number(linea.descuento ?? 0)) }; }), total: dinero(totalLineas(cotizacion.detalles)), observacion: cotizacion.observacion ?? undefined }, formato);
  }

  function abrirVentaCotizacion(cotizacion: Cotizacion, tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA") {
    navegar("/ingresos/nuevo/repuestos", { state: { cotizacion: { id: cotizacion.id, codigo: cotizacion.codigo, clienteId: cotizacion.clienteId, clienteNombre: cotizacion.clienteNombre, detalles: cotizacion.detalles, observacion: cotizacion.observacion, tipoComprobante } } });
  }

  const controlesListado = <div className={`gestion-ingresos-heading${esOrden ? "" : " cotizaciones-list-filters"}`}><input aria-label="Buscar" placeholder={esOrden ? "Buscar código, cliente o vehículo" : "Buscar código o cliente"} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />{!esOrden && <><label>Estado<select value={filtroEstadoCotizacion} onChange={(evento) => setFiltroEstadoCotizacion(evento.target.value)}><option value="TODAS">Todos los estados</option><option value="ACTIVA">Activa</option><option value="INACTIVA">Inactiva</option><option value="EMITIDA">Emitida</option></select></label><label>Vigencia desde<input type="date" value={filtroVigenciaDesde} onChange={(evento) => setFiltroVigenciaDesde(evento.target.value)} /></label><label>Vigencia hasta<input type="date" value={filtroVigenciaHasta} onChange={(evento) => setFiltroVigenciaHasta(evento.target.value)} /></label></>}</div>;

  const documentoCotizacionCompletado = (cotizacion: Cotizacion) => Boolean(cotizacion.ingresoId && (cotizacion.ingresoTipoComprobante === "NOTA_VENTA" ? cotizacion.ingresoEstado === "REGISTRADO" : cotizacion.ingresoEstado === "EMITIDO"));
  const estadoVisibleCotizacion = (cotizacion: Cotizacion) => documentoCotizacionCompletado(cotizacion) ? "EMITIDA" : cotizacion.estado === "ANULADA" || cotizacion.estado === "RECHAZADA" || Boolean(cotizacion.vigenteHasta && cotizacion.vigenteHasta < hoy()) ? "INACTIVA" : "ACTIVA";
  const cotizacionesFiltradas = registrosCotizacion.filter((cotizacion) => {
    const fecha = cotizacion.vigenteHasta ?? "";
    return (filtroEstadoCotizacion === "TODAS" || estadoVisibleCotizacion(cotizacion) === filtroEstadoCotizacion)
      && (!filtroVigenciaDesde || fecha >= filtroVigenciaDesde)
      && (!filtroVigenciaHasta || (fecha && fecha <= filtroVigenciaHasta));
  });
  return <section className={`gestion-ingresos-page ${esOrden ? "is-ordenes" : "is-cotizaciones"}${mostrarFormulario ? " is-editing" : ""}`}>
    {error && <p className="gestion-ingresos-error" role="alert">{error}</p>}
    {!mostrarFormulario && (esOrden ? (
      <ListadoMaestro
        controlesCabecera={controlesListado}
        titulo="Órdenes de servicio"
        descripcion="Seguimiento de las órdenes de servicio por vehículo."
        registros={registrosOrden}
        cargando={cargando}
        error={null}
        vacio="Todavía no hay órdenes de servicio."
        paginacion={{ modo: "local" }}
        variante="tabla"
        claseTabla="ordenes-table"
        claseContenedor="ordenes-table-scroll"
        encabezadoTabla={<tr><th>Orden</th><th>Vehículo</th><th>Cliente</th><th>Fecha de ingreso</th><th>Estado</th><th>Total estimado</th><th>Acciones</th></tr>}
        renderizarFila={(orden) => <tr key={orden.id}><td>{orden.codigo}</td><td>{orden.vehiculoPlaca}</td><td>{orden.clienteNombre}</td><td>{orden.fechaRecepcion}</td><td><span className={`gestion-status is-${orden.estado.toLowerCase()}`}>{orden.estado.replaceAll("_", " ")}</span></td><td>{dinero(totalLineas(orden.detalles))}</td><td>{orden.estado !== "FACTURADA" && orden.estado !== "ANULADA" && <button type="button" onClick={() => abrirOrden(orden)}>Abrir</button>}{orden.ingresoId && <span> Documento emitido</span>}</td></tr>}
      />
    ) : (
      <ListadoMaestro
        controlesCabecera={controlesListado}
        titulo="Cotizaciones"
        descripcion="Propuestas comerciales y su conversión en ventas."
        registros={cotizacionesFiltradas}
        cargando={cargando}
        error={null}
        claseTabla="cotizaciones-tabla"
        vacio={<div className="cotizaciones-empty"><span aria-hidden="true">+</span><strong>Aún no hay cotizaciones</strong><p>Cuando prepares una propuesta para un cliente, aparecerá aquí.</p></div>}
        paginacion={{ modo: "local" }}
        variante="tabla"
        encabezadoTabla={<tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Vigencia</th><th>Estado</th><th>Total</th><th>Acciones</th></tr>}
        renderizarFila={(cotizacion) => <tr key={cotizacion.id}>
          <td className="cotizacion-code">{cotizacion.codigo}</td>
          <td>{cotizacion.fecha}</td>
          <td className="cotizacion-client">{cotizacion.clienteNombre || "Sin cliente"}</td>
          <td>{cotizacion.vigenteHasta ?? "Sin fecha"}</td>
          <td><span className={`gestion-status is-${estadoVisibleCotizacion(cotizacion).toLowerCase()}`}>{estadoVisibleCotizacion(cotizacion) === "EMITIDA" ? "Emitida" : estadoVisibleCotizacion(cotizacion) === "INACTIVA" ? "Inactiva" : "Activa"}</span></td>
          <td className="cotizacion-total">{dinero(totalLineas(cotizacion.detalles))}</td>
          <td><div className="cotizacion-actions">
            <BotonImprimir etiqueta={`Imprimir cotización ${cotizacion.codigo}`} alImprimirA4={() => imprimirCotizacion(cotizacion)("A4")} alImprimirTicket={() => imprimirCotizacion(cotizacion)("TICKET")} />
            <a className="cotizacion-whatsapp cotizacion-icon-action erp-icon-action" href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsAppCotizacion(cotizacion))}`} target="_blank" rel="noreferrer" title={`Enviar cotización ${cotizacion.codigo} por WhatsApp`} aria-label={`Enviar cotización ${cotizacion.codigo} por WhatsApp`}><MessageCircle aria-hidden="true" size={17}/></a>
            {!cotizacion.ingresoId && estadoVisibleCotizacion(cotizacion) !== "EMITIDA" && <details className="cotizacion-document-menu"><summary className="cotizacion-document-trigger erp-icon-action is-primary" title={`Preparar documento de ${cotizacion.codigo}`} aria-label={`Preparar documento de ${cotizacion.codigo}`} aria-haspopup="menu"><FileOutput aria-hidden="true" size={17}/></summary><div className="cotizacion-document-options" role="menu" aria-label={`Tipo de documento para ${cotizacion.codigo}`}><button type="button" role="menuitem" disabled={estadoVisibleCotizacion(cotizacion) === "INACTIVA"} onClick={() => abrirVentaCotizacion(cotizacion, "FACTURA")}>Factura</button><button type="button" role="menuitem" disabled={estadoVisibleCotizacion(cotizacion) === "INACTIVA"} onClick={() => abrirVentaCotizacion(cotizacion, "BOLETA")}>Boleta de venta</button><button type="button" role="menuitem" disabled={estadoVisibleCotizacion(cotizacion) === "INACTIVA"} onClick={() => abrirVentaCotizacion(cotizacion, "NOTA_VENTA")}>Nota de venta</button></div></details>}
            {cotizacion.ingresoId && !documentoCotizacionCompletado(cotizacion) && <span className="cotizacion-emision-pendiente">Documento pendiente de confirmación</span>}
          </div></td>
        </tr>}
      />
    ))}
    {puedeCrear && !mostrarFormulario && <RegistrarAccionPrincipal etiqueta={esOrden ? "Crear orden de servicio" : "Crear cotización"} onClick={nuevaGestion} />}
    {mostrarFormulario && <section className={`gestion-editor${esOrden ? " is-service-order" : ""}`} aria-label="Formulario de orden o cotización">
      {esOrden ? <div className="orden-workspace">
        <aside className="orden-catalog-panel" aria-label="Catálogo de repuestos">
          <header><span>CATÁLOGO DE INVENTARIO</span><h2>Buscar repuestos</h2><p>Busca por nombre o código y agrégalos a la orden.</p></header>
          <label className="orden-catalog-search">Nombre o código<input autoComplete="off" value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} placeholder="Buscar repuesto…" /></label>
          <div className="orden-catalog-results" aria-live="polite">{productos.length ? productos.map((producto) => <article className="orden-catalog-product" key={producto.presentacionId}><div><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.presentacion}</small><span>{dinero(Number(producto.precio))}</span></div><button type="button" onClick={() => agregarProducto(producto)}>Agregar</button></article>) : busquedaProducto.trim().length >= 2 ? <p className="orden-catalog-empty">No encontramos repuestos con esa búsqueda.</p> : <p className="orden-catalog-empty is-hint">Escribe al menos dos caracteres para buscar en inventario.</p>}</div>
        </aside>
        <article className="orden-invoice-paper" aria-label="Documento de orden de servicio">
          <header className="orden-document-header"><div><span>DOCUMENTO DE SERVICIO</span><h2>ORDEN DE SERVICIO</h2><p>Fecha de recepción: {ordenActiva?.fechaRecepcion ?? hoy()}</p></div><div className="orden-document-meta"><strong>{ordenActiva?.codigo ?? "NUEVA ORDEN"}</strong>{ordenActiva && <span className={`gestion-status is-${estadoOrden.toLowerCase()}`}>{estadoOrden.replaceAll("_", " ")}</span>}</div></header>
          <section className="orden-document-reception" aria-labelledby="orden-recepcion-title">
            <header><h3 id="orden-recepcion-title">Datos de recepción</h3>{ordenActiva && <label>Estado<select value={estadoOrden} onChange={(e) => setEstadoOrden(e.target.value as OrdenServicio["estado"])}><option value="ABIERTA">Abierta</option><option value="EN_PROCESO">En proceso</option><option value="ESPERANDO_REPUESTOS">Esperando repuestos</option><option value="COMPLETADA">Completada</option></select></label>}</header>
            <div className="orden-reception-fields"><label>Fecha de recepción<input type="date" value={fechaRecepcionOrden} disabled={Boolean(ordenActiva)} onChange={(e) => { setFechaRecepcionOrden(e.target.value); if (fechaAcabadoOrden && fechaAcabadoOrden < e.target.value) setFechaAcabadoOrden(e.target.value); }} required /></label><label>Fecha estimada de acabado<input type="date" min={fechaRecepcionOrden} value={fechaAcabadoOrden} onChange={(e) => setFechaAcabadoOrden(e.target.value)} required /></label>
              {!ordenActiva && <div className="gestion-field orden-client-field"><label htmlFor="orden-cliente">Cliente</label>{cliente ? <div className="gestion-selected"><div><strong>{nombreCliente(cliente)}</strong><small>{cliente.numeroDocumento}</small></div><button type="button" onClick={() => { setCliente(null); setClienteBusqueda(""); }}>Cambiar</button></div> : <><input id="orden-cliente" autoComplete="off" value={clienteBusqueda} onChange={(e) => setClienteBusqueda(e.target.value)} placeholder="Buscar por nombre, DNI o RUC" />{clientes.length > 0 && <div className="gestion-results">{clientes.map((item) => <button type="button" key={item.id} onClick={() => { setCliente(item); setClienteBusqueda(nombreCliente(item)); setClientes([]); }}>{nombreCliente(item)} · {item.numeroDocumento}</button>)}</div>}{clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusqueda.trim().length >= 2 && clientes.length === 0 && <div className="orden-client-not-found"><span>No encontramos un cliente con esa búsqueda.</span><button type="button" onClick={() => setMostrarFormularioCliente(true)}>Crear cliente</button></div>}</>}</div>}
              {ordenActiva && <div className="orden-cliente-readonly"><span>CLIENTE</span><strong>{ordenActiva.clienteNombre}</strong></div>}
              <div className="orden-vehicle-fields"><label>Placa o identificador *<input required value={vehiculo.placa} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, placa: e.target.value.toUpperCase() })} placeholder="Ej. ABC-123" /></label></div>
            </div>
          </section>
          <section className="orden-document-lines" aria-label="Repuestos y conceptos de la orden">
            <div className="gestion-cotizacion-lines-heading"><h3>Repuestos y servicios de esta orden</h3><span>{lineas.length} líneas</span><button type="button" onClick={() => { setTrabajo(""); setError(""); document.getElementById("orden-trabajo")?.focus(); }}>+ Agregar servicio</button></div>
            <div className="orden-invoice-columns"><span>Concepto</span><span>Cant.</span><span>Importe</span><span aria-label="Acciones" /></div>
            <div className="orden-invoice-lines">{lineas.length ? lineas.map((linea, indice) => <div className="orden-invoice-line" key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`}><span className="orden-line-description"><strong>{String(linea.nombreVisible ?? linea.descripcion)}</strong><small>{linea.tipo === "PRODUCTO" ? "Repuesto" : "Mano de obra"} · {dinero(Number(linea.precioUnitario))} por unidad</small>{Number(linea.descuento) > 0 && <small>Descuento: {dinero(Number(linea.descuento))}</small>}</span><input aria-label={`Cantidad de ${String(linea.nombreVisible ?? linea.descripcion)}`} type="number" min="0.001" step="0.001" value={String(linea.cantidad)} onChange={(e) => setLineas((actuales) => actuales.map((fila, i) => i === indice ? { ...fila, cantidad: e.target.value } : fila))} /><strong>{dinero(Number(linea.cantidad) * Number(linea.precioUnitario) - Number(linea.descuento))}</strong><button type="button" aria-label={`Quitar ${String(linea.nombreVisible ?? linea.descripcion)}`} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))}>×</button></div>) : <div className="orden-invoice-empty"><span aria-hidden="true">＋</span><strong>La orden aún no tiene conceptos</strong><p>Agrega repuestos desde el catálogo o registra la mano de obra.</p></div>}</div>
          </section>
          <section className="orden-document-labor" aria-labelledby="orden-mano-obra-title"><header><h3 id="orden-mano-obra-title">Agregar mano de obra</h3><p>Registra el trabajo realizado por el taller.</p></header><div className="orden-labor-fields"><label>Descripción del trabajo<input id="orden-trabajo" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} placeholder="Ej. Cambio de frenos" /></label><div className="orden-labor-numbers"><label>Cantidad<input type="number" min="0.001" step="0.001" value={cantidadTrabajo} onChange={(e) => setCantidadTrabajo(e.target.value)} /></label><label>Precio unitario<input type="number" min="0" step="0.01" value={precioTrabajo} onChange={(e) => setPrecioTrabajo(e.target.value)} placeholder="0.00" /></label></div><button type="button" onClick={agregarTrabajo}>Agregar trabajo</button></div></section>
          <section className="orden-document-diagnosis" aria-labelledby="orden-diagnostico-title"><header><h3 id="orden-diagnostico-title">Motivo y diagnóstico</h3><p>Información reportada y hallazgos del servicio.</p></header><div className="orden-diagnostico-fields"><label>Motivo de ingreso (opcional)<textarea value={vehiculo.motivo} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, motivo: e.target.value })} placeholder="¿Qué problema o servicio solicita el cliente?" /></label><label>Diagnóstico (opcional)<textarea value={vehiculo.diagnostico} onChange={(e) => setVehiculo({ ...vehiculo, diagnostico: e.target.value })} placeholder="Hallazgos, recomendaciones o trabajo por realizar" /></label></div>{ordenActiva && <><label className="orden-advance-field">Nota de avance<textarea value={notaAvance} onChange={(e) => setNotaAvance(e.target.value)} placeholder="Describe el trabajo realizado en esta actualización" /></label>{ordenActiva.notasTrabajo.length > 0 && <div className="gestion-timeline"><strong>Historial de avances</strong>{ordenActiva.notasTrabajo.map((nota, i) => <p key={`${nota.fecha}-${i}`}><time>{new Date(nota.fecha).toLocaleString("es-PE")}</time>{nota.texto}</p>)}</div>}</>}</section>
          <footer className="orden-document-total"><div><span>TOTAL ESTIMADO</span><strong>{dinero(total)}</strong></div>{ordenActiva && <label>Comprobante al finalizar<select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as typeof tipoComprobante)}><option value="BOLETA">Boleta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta interna</option></select></label>}</footer>
          {ordenActiva && estadoOrden === "COMPLETADA" && <button className="orden-document-emit" type="button" disabled={guardando} onClick={() => void cerrarOrden()}>Finalizar y emitir documento</button>}
        </article>
      </div> : <div className="orden-workspace gestion-cotizacion-workspace">
        <aside className="orden-catalog-panel" aria-label="Catálogo de repuestos">
          <header><span>CATÁLOGO DE INVENTARIO</span><h2>Buscar repuestos</h2><p>Busca en inventario y revisa precios y existencias.</p></header>
          <label className="orden-catalog-search">Nombre o código<input autoComplete="off" value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} placeholder="Buscar repuesto…" /></label>
          <div className="orden-catalog-results" aria-live="polite">{productos.length ? productos.map((producto) => <article className="orden-catalog-product" key={producto.presentacionId}><div><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.presentacion}</small><span>{dinero(Number(producto.precio))}</span></div><button type="button" onClick={() => agregarProducto(producto)}>Agregar</button></article>) : busquedaProducto.trim().length >= 2 ? <p className="orden-catalog-empty">No encontramos repuestos con esa búsqueda.</p> : <p className="orden-catalog-empty is-hint">Escribe al menos dos caracteres para buscar en inventario.</p>}</div>
        </aside>
        <article className="orden-invoice-paper gestion-cotizacion-paper" aria-label="Documento de cotización">
          <header className="orden-document-header"><div><span>PROPUESTA COMERCIAL</span><h2>NUEVA COTIZACIÓN</h2><p>Fecha de emisión: {fechaEmisionCotizacion}</p></div><div className="orden-document-meta"><span className="cotizacion-preview-label">N° DE COTIZACIÓN · PREVIA</span><strong>{consultandoSerieCotizacion ? "Consultando serie…" : errorConsultaSerieCotizacion ? "No se pudo consultar la serie" : codigoCotizacionPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong></div></header>
          <section className="orden-document-reception gestion-cotizacion-fields" aria-label="Datos de la cotización">
            <div className="gestion-cotizacion-client">
              <label htmlFor="cotizacion-cliente-busqueda">Cliente</label>
              {cliente ? <div className="cotizacion-client-selected"><strong>{nombreCliente(cliente)}</strong><button type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => { setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setClientes([]); }}>×</button></div> : <div className="cotizacion-client-picker">
                <select aria-label="Tipo de documento para buscar" value={tipoDocumentoBusqueda} onChange={(e) => { setTipoDocumentoBusqueda(e.target.value as typeof tipoDocumentoBusqueda); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setClientes([]); }}>
                  <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option>
                </select>
                <input id="cotizacion-cliente-busqueda" autoComplete="off" inputMode={tipoDocumentoBusqueda === "NOMBRE" ? "text" : "numeric"} maxLength={tipoDocumentoBusqueda === "DNI" ? 8 : tipoDocumentoBusqueda === "RUC" ? 11 : 120} value={clienteBusqueda} onChange={(e) => { setClienteBusqueda(tipoDocumentoBusqueda === "NOMBRE" ? e.target.value : e.target.value.replace(/\D/g, "")); setClienteBusquedaConsultada(""); setClientes([]); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ejecutarBusquedaCliente(); } }} placeholder={tipoDocumentoBusqueda === "NOMBRE" ? "Buscar por nombre" : `Ingresa ${tipoDocumentoBusqueda}`} aria-label={tipoDocumentoBusqueda === "NOMBRE" ? "Nombre del cliente" : `Número de ${tipoDocumentoBusqueda}`} required />
                <button type="button" className="cotizacion-client-search" onClick={() => void ejecutarBusquedaCliente()} disabled={buscandoClientes}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><span>{buscandoClientes ? "Buscando…" : "Buscar cliente"}</span></button>
                <button type="button" className="cotizacion-client-add" aria-label="Agregar cliente" title="Agregar cliente" onClick={() => { setError(""); setMostrarFormularioCliente(true); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7"/></svg></button>
                {clientes.length > 0 && <div className="cotizacion-client-results">{clientes.map((item) => <button type="button" key={item.id} onClick={() => { setCliente(item); setClienteBusqueda(nombreCliente(item)); setClienteBusquedaConsultada(""); setClientes([]); }}><strong>{nombreCliente(item)}</strong></button>)}</div>}
                {clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusquedaConsultada.length >= 2 && clientes.length === 0 && <div className="cotizacion-client-feedback" role="status">No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +.</div>}
              </div>}
            </div>
            <label>Válida hasta<input type="date" min={fechaEmisionCotizacion} value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} required /></label>
          </section>
          <section className="orden-document-lines" aria-label="Repuestos y servicios de la cotización">
            <div className="gestion-cotizacion-lines-heading"><h3>Repuestos y servicios de esta cotización</h3><span>{lineas.length} líneas</span><button type="button" onClick={agregarServicioCotizacion}>+ Agregar servicio</button></div>
            <div className="orden-invoice-columns"><span>Concepto</span><span>Cant.</span><span>Precio</span><span>Importe</span><span aria-label="Acciones" /></div>
            <div className="orden-invoice-lines">{lineas.length ? lineas.map((linea, indice) => {
              const nombre = String(linea.nombreVisible ?? linea.descripcion ?? "");
              const cantidad = Number(linea.cantidad) || 0;
              const precio = Number(linea.precioUnitario) || 0;
              const importe = Math.max(0, cantidad * precio - Number(linea.descuento ?? 0));
              return <div className="orden-invoice-line" key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`}>
                <span className="orden-line-description"><strong>{linea.tipo === "SERVICIO" ? <input id={`cotizacion-servicio-descripcion-${indice}`} className="cotizacion-service-description" aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={String(linea.descripcion ?? linea.nombreVisible ?? "").toLocaleUpperCase("es-PE")} onChange={(e) => actualizarLineaCotizacion(indice, { descripcion: e.target.value.toLocaleUpperCase("es-PE"), nombreVisible: e.target.value.toLocaleUpperCase("es-PE") })} /> : nombre}</strong><small>{linea.tipo === "PRODUCTO" ? "Repuesto" : "Servicio"}</small></span>
                <input aria-label={`Cantidad de ${nombre || "servicio"}`} type="number" min="1" step="1" inputMode="numeric" value={String(linea.cantidad)} onChange={(e) => actualizarLineaCotizacion(indice, { cantidad: e.target.value === "" ? "" : String(Math.max(1, Math.floor(Number(e.target.value) || 1))) })} />
                {linea.tipo === "SERVICIO" ? <input className="cotizacion-service-price" aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" value={linea.precioUnitario} placeholder="0.00" onChange={(e) => actualizarLineaCotizacion(indice, { precioUnitario: e.target.value })} /> : <span className="cotizacion-line-price">{dinero(precio)}</span>}
                <strong>{dinero(importe)}</strong><button type="button" aria-label={`Quitar ${nombre || "servicio"}`} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))}>×</button>
              </div>;
            }) : <div className="orden-invoice-empty"><strong>Agrega el primer repuesto o servicio</strong><p>Busca repuestos en el catálogo o agrega un servicio desde este detalle.</p></div>}</div>
          </section>

          <section className="gestion-cotizacion-notes"><label>Observaciones<textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Añade una nota para el cliente" /></label><div className="orden-document-total"><div><span>TOTAL COTIZADO</span><strong>{dinero(total)}</strong></div></div></section>
          <footer className="gestion-cotizacion-actions"><button type="button" onClick={cerrarFormularioGestion}>Cerrar</button><button type="button" className="gestion-primary" disabled={guardando || !codigoCotizacionPrevisualizado || consultandoSerieCotizacion || Boolean(errorConsultaSerieCotizacion)} onClick={() => void guardarGestion()}>{guardando ? "Guardando…" : "Guardar cotización"}</button></footer>
        </article>
      </div>}
      {esOrden && <footer><button type="button" onClick={() => setMostrarFormulario(false)}>Cancelar</button><button type="button" className="gestion-primary" disabled={guardando} onClick={() => void guardarGestion()}>{guardando ? "Guardando…" : "Guardar orden"}</button></footer>}
    </section>}
    {confirmarDescarteCotizacion && <div className="cotizacion-discard-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmarDescarteCotizacion(false); }}><section className="cotizacion-discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cotizacion-discard-title" aria-describedby="cotizacion-discard-description"><span className="cotizacion-discard-icon" aria-hidden="true">!</span><div><h2 id="cotizacion-discard-title">¿Descartar esta cotización?</h2><p id="cotizacion-discard-description">Se perderán los datos y los repuestos o servicios que agregaste.</p></div><footer><button type="button" onClick={() => setConfirmarDescarteCotizacion(false)}>Seguir editando</button><button type="button" className="cotizacion-discard-confirm" onClick={descartarCotizacion}>Descartar cotización</button></footer></section></div>}
    {mostrarFormularioCliente && createPortal(<FormularioCliente numeroDocumentoInicial={/^\d+$/.test(clienteBusqueda.trim()) ? clienteBusqueda.trim() : ""} onGuardar={registrarYSeleccionarCliente} onCancelar={() => setMostrarFormularioCliente(false)} />, document.body)}
  </section>;
}
