import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type ClienteRegistrado, type Cotizacion, type DatosClienteNuevo, type OrdenServicio, type ProductoParaIngreso } from "../../services/ingresos.service";
import { FormularioCliente } from "../clientes-page/clientes-page";
import "./ordenes-cotizaciones-page.css";
import "./cotizaciones-page.css";

type ModoGestion = "ORDENES" | "COTIZACIONES";
type LineaGestion = Record<string, unknown> & { tipo: "PRODUCTO" | "SERVICIO"; nombreVisible: string; precioUnitario: string; cantidad: string; descuento: string; afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO" };
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const dinero = (valor: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const totalLineas = (lineas: Record<string, unknown>[]) => lineas.reduce((suma, linea) => suma + Number(linea.cantidad ?? 1) * Number(linea.precioUnitario ?? 0) - Number(linea.descuento ?? 0), 0);
const escaparHtml = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[caracter]!);

export function OrdenesCotizacionesPage({ modo, puedeCrear }: { modo: ModoGestion; puedeCrear: boolean }) {
  const navegar = useNavigate();
  const esOrden = modo === "ORDENES";
  const [registrosOrden, setRegistrosOrden] = useState<OrdenServicio[]>([]);
  const [registrosCotizacion, setRegistrosCotizacion] = useState<Cotizacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ordenActiva, setOrdenActiva] = useState<OrdenServicio | null>(null);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteBusquedaConsultada, setClienteBusquedaConsultada] = useState("");
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cliente, setCliente] = useState<ClienteRegistrado | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<ProductoParaIngreso[]>([]);
  const [lineas, setLineas] = useState<LineaGestion[]>([]);
  const [trabajo, setTrabajo] = useState("");
  const [precioTrabajo, setPrecioTrabajo] = useState("");
  const [cantidadTrabajo, setCantidadTrabajo] = useState("1");
  const [vehiculo, setVehiculo] = useState({ placa: "", marca: "", modelo: "", motivo: "", diagnostico: "" });
  const [estadoOrden, setEstadoOrden] = useState<OrdenServicio["estado"]>("ABIERTA");
  const [notaAvance, setNotaAvance] = useState("");
  const [observacion, setObservacion] = useState("");
  const [vigenteHasta, setVigenteHasta] = useState("");
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
    const texto = clienteBusqueda.trim();
    setClienteBusquedaConsultada("");
    if (texto.length < 2 || cliente) { setClientes([]); return; }
    let vigente = true;
    const temporizador = window.setTimeout(() => void servicioIngresos.buscarClientes(texto).then((resultados) => { if (vigente) { setClientes(resultados); setClienteBusquedaConsultada(texto); } }).catch(() => { if (vigente) setClientes([]); }), 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [clienteBusqueda, cliente]);
  useEffect(() => {
    const texto = busquedaProducto.trim();
    if (texto.length < 2) { setProductos([]); return; }
    const temporizador = window.setTimeout(() => void servicioIngresos.buscarProductos(texto).then(setProductos).catch(() => setProductos([])), 220);
    return () => window.clearTimeout(temporizador);
  }, [busquedaProducto]);

  const total = useMemo(() => totalLineas(lineas), [lineas]);
  function nuevaGestion() {
    setOrdenActiva(null); setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setLineas([]); setObservacion(""); setVigenteHasta(""); setTrabajo(""); setPrecioTrabajo(""); setBusquedaProducto("");
    setVehiculo({ placa: "", marca: "", modelo: "", motivo: "", diagnostico: "" }); setEstadoOrden("ABIERTA"); setNotaAvance(""); setMostrarFormularioCliente(false); setMostrarFormulario(true); setError("");
  }
  function abrirOrden(orden: OrdenServicio) {
    setOrdenActiva(orden); setCliente(null); setClienteBusqueda(orden.clienteNombre); setLineas(orden.detalles as LineaGestion[]); setEstadoOrden(orden.estado);
    setVehiculo({ placa: orden.vehiculoPlaca, marca: orden.vehiculoMarca ?? "", modelo: orden.vehiculoModelo ?? "", motivo: orden.motivo, diagnostico: orden.diagnostico ?? "" });
    setNotaAvance(""); setMostrarFormulario(true); setError("");
  }
  async function registrarYSeleccionarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const coincidencias = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const nuevoCliente = coincidencias.find((item) => item.id === creado.id) ?? coincidencias.find((item) => item.numeroDocumento === datos.numeroDocumento);
      if (!nuevoCliente) return "El cliente se registró, pero no se pudo cargar en la orden. Vuelve a buscarlo por su documento.";
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
  async function guardarGestion() {
    if (!cliente && !ordenActiva) { setError("Selecciona un cliente."); return; }
    if (esOrden && !vehiculo.placa.trim()) { setError("Ingresa la placa o el identificador del vehículo."); return; }
    if (esOrden && !vehiculo.motivo.trim()) { setError("Indica el motivo de ingreso del vehículo."); return; }
    if (!esOrden && !lineas.length) { setError("Agrega al menos un repuesto o un trabajo."); return; }
    setGuardando(true); setError("");
    try {
      const detalles = lineas as Record<string, unknown>[];
      if (esOrden) {
        if (ordenActiva) await servicioIngresos.actualizarOrdenServicio(ordenActiva.id, { diagnostico: vehiculo.diagnostico, motivo: vehiculo.motivo, detalles, estado: estadoOrden, notaAvance });
        else await servicioIngresos.crearOrdenServicio({ clienteId: cliente!.id, vehiculoPlaca: vehiculo.placa, vehiculoVin: null, vehiculoMarca: vehiculo.marca || null, vehiculoModelo: vehiculo.modelo || null, motivo: vehiculo.motivo, diagnostico: vehiculo.diagnostico || null, fechaRecepcion: hoy(), detalles });
      } else {
        await servicioIngresos.crearCotizacion({ clienteId: cliente!.id, detalles, observacion, vigenteHasta: vigenteHasta || null });
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
  async function cambiarEstadoCotizacion(cotizacion: Cotizacion, estado: string) {
    try { await servicioIngresos.cambiarEstadoCotizacion(cotizacion.id, estado); await cargar(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo actualizar el estado."); }
  }
  function imprimirCotizacion(cotizacion: Cotizacion) {
    const filas = cotizacion.detalles.map((linea) => `<tr><td>${escaparHtml(linea.nombreVisible ?? linea.descripcion ?? "Repuesto")}</td><td>${escaparHtml(linea.cantidad ?? "1")}</td><td>${dinero(Number(linea.precioUnitario ?? 0))}</td><td>${dinero(Number(linea.cantidad ?? 1) * Number(linea.precioUnitario ?? 0) - Number(linea.descuento ?? 0))}</td></tr>`).join("");
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Cotización ${escaparHtml(cotizacion.codigo)}</title><style>body{font:14px Arial,sans-serif;max-width:780px;margin:40px auto;color:#26384a}header{display:flex;justify-content:space-between;border-bottom:2px solid #b92f49;padding-bottom:16px}h1{font-size:24px;margin:0}p{margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:10px;border-bottom:1px solid #dce4ea;text-align:left}th{background:#f2f5f7}.num{text-align:right}.total{text-align:right;margin:22px 0;font-size:20px;font-weight:700}.nota{margin-top:30px;color:#64748b}@media print{body{margin:12mm auto}}</style><body><header><div><h1>COTIZACIÓN</h1><p>${escaparHtml(cotizacion.codigo)}</p></div><div><p>Fecha: ${escaparHtml(cotizacion.fecha)}</p><p>Vigente hasta: ${escaparHtml(cotizacion.vigenteHasta ?? "Sin fecha")}</p></div></header><p><strong>Cliente:</strong> ${escaparHtml(cotizacion.clienteNombre)}</p><table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table><p class="total">Total: ${dinero(totalLineas(cotizacion.detalles))}</p>${cotizacion.observacion ? `<p class="nota">${escaparHtml(cotizacion.observacion)}</p>` : ""}<script>window.onload=()=>window.print()</script></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  async function convertirCotizacion(cotizacion: Cotizacion) {
    setGuardando(true); setError("");
    try { await servicioIngresos.convertirCotizacion(cotizacion.id, { tipoComprobante, medioPago: "EFECTIVO" }); await cargar(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo convertir la cotización."); }
    finally { setGuardando(false); }
  }

  const controlesListado = <div className="gestion-ingresos-heading">{!esOrden && <label className="gestion-comprobante">Comprobante al convertir<select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as typeof tipoComprobante)}><option value="BOLETA">Boleta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta interna</option></select></label>}<input aria-label="Buscar" placeholder={esOrden ? "Buscar código, cliente o vehículo" : "Buscar código o cliente"} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /></div>;

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
        renderizarFila={(orden) => <tr key={orden.id}><td>{orden.codigo}</td><td>{[orden.vehiculoMarca, orden.vehiculoModelo, orden.vehiculoPlaca].filter(Boolean).join(" · ")}</td><td>{orden.clienteNombre}</td><td>{orden.fechaRecepcion}</td><td><span className={`gestion-status is-${orden.estado.toLowerCase()}`}>{orden.estado.replaceAll("_", " ")}</span></td><td>{dinero(totalLineas(orden.detalles))}</td><td>{orden.estado !== "FACTURADA" && orden.estado !== "ANULADA" && <button type="button" onClick={() => abrirOrden(orden)}>Abrir</button>}{orden.ingresoId && <span> Documento emitido</span>}</td></tr>}
      />
    ) : (
      <ListadoMaestro
        controlesCabecera={controlesListado}
        titulo="Cotizaciones"
        descripcion="Propuestas comerciales y su conversión en ventas."
        registros={registrosCotizacion}
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
          <td className="cotizacion-client">{cotizacion.clienteNombre}</td>
          <td>{cotizacion.vigenteHasta ?? "Sin fecha"}</td>
          <td><span className={`gestion-status is-${cotizacion.estado.toLowerCase()}`}>{cotizacion.estado}</span></td>
          <td className="cotizacion-total">{dinero(totalLineas(cotizacion.detalles))}<details><summary>Ver detalle</summary>{cotizacion.detalles.map((linea, i) => <div key={i}>{String(linea.nombreVisible ?? linea.descripcion ?? "Repuesto")} · {String(linea.cantidad ?? "1")} × {dinero(Number(linea.precioUnitario ?? 0))}</div>)}</details></td>
          <td><div className="cotizacion-actions">
            <button type="button" className="is-secondary" onClick={() => imprimirCotizacion(cotizacion)}>Imprimir</button>
            {cotizacion.estado === "BORRADOR" && <button type="button" className="is-secondary" onClick={() => void cambiarEstadoCotizacion(cotizacion, "ENVIADA")}>Marcar como enviada</button>}
            {["BORRADOR", "ENVIADA"].includes(cotizacion.estado) && <button type="button" className="is-secondary" onClick={() => void cambiarEstadoCotizacion(cotizacion, "ACEPTADA")}>Marcar como aceptada</button>}
            {cotizacion.estado === "ACEPTADA" && <button type="button" className="is-primary" disabled={guardando} onClick={() => void convertirCotizacion(cotizacion)}>Convertir a venta</button>}
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
            <div className="orden-reception-fields">
              {!ordenActiva && <div className="gestion-field orden-client-field"><label htmlFor="orden-cliente">Cliente</label>{cliente ? <div className="gestion-selected"><div><strong>{nombreCliente(cliente)}</strong><small>{cliente.numeroDocumento}</small></div><button type="button" onClick={() => { setCliente(null); setClienteBusqueda(""); }}>Cambiar</button></div> : <><input id="orden-cliente" autoComplete="off" value={clienteBusqueda} onChange={(e) => setClienteBusqueda(e.target.value)} placeholder="Buscar por nombre, DNI o RUC" />{clientes.length > 0 && <div className="gestion-results">{clientes.map((item) => <button type="button" key={item.id} onClick={() => { setCliente(item); setClienteBusqueda(nombreCliente(item)); setClientes([]); }}>{nombreCliente(item)} · {item.numeroDocumento}</button>)}</div>}{clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusqueda.trim().length >= 2 && clientes.length === 0 && <div className="orden-client-not-found"><span>No encontramos un cliente con esa búsqueda.</span><button type="button" onClick={() => setMostrarFormularioCliente(true)}>Crear cliente</button></div>}</>}</div>}
              {ordenActiva && <div className="orden-cliente-readonly"><span>CLIENTE</span><strong>{ordenActiva.clienteNombre}</strong></div>}
              <div className="orden-vehicle-fields"><label>Placa o identificador *<input required value={vehiculo.placa} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, placa: e.target.value.toUpperCase() })} placeholder="Ej. ABC-123" /></label><label>Marca (opcional)<input value={vehiculo.marca} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, marca: e.target.value })} placeholder="Marca" /></label><label>Modelo (opcional)<input value={vehiculo.modelo} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, modelo: e.target.value })} placeholder="Modelo" /></label></div>
            </div>
          </section>
          <section className="orden-document-lines" aria-label="Repuestos y conceptos de la orden">
            <div className="gestion-cotizacion-lines-heading"><h3>Repuestos y servicios de esta orden</h3><span>{lineas.length} líneas</span><button type="button" onClick={() => { setTrabajo(""); setError(""); document.getElementById("orden-trabajo")?.focus(); }}>+ Agregar servicio</button></div>
            <div className="orden-invoice-columns"><span>Concepto</span><span>Cant.</span><span>Importe</span><span aria-label="Acciones" /></div>
            <div className="orden-invoice-lines">{lineas.length ? lineas.map((linea, indice) => <div className="orden-invoice-line" key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`}><span className="orden-line-description"><strong>{String(linea.nombreVisible ?? linea.descripcion)}</strong><small>{linea.tipo === "PRODUCTO" ? "Repuesto" : "Mano de obra"} · {dinero(Number(linea.precioUnitario))} por unidad</small>{Number(linea.descuento) > 0 && <small>Descuento: {dinero(Number(linea.descuento))}</small>}</span><input aria-label={`Cantidad de ${String(linea.nombreVisible ?? linea.descripcion)}`} type="number" min="0.001" step="0.001" value={String(linea.cantidad)} onChange={(e) => setLineas((actuales) => actuales.map((fila, i) => i === indice ? { ...fila, cantidad: e.target.value } : fila))} /><strong>{dinero(Number(linea.cantidad) * Number(linea.precioUnitario) - Number(linea.descuento))}</strong><button type="button" aria-label={`Quitar ${String(linea.nombreVisible ?? linea.descripcion)}`} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))}>×</button></div>) : <div className="orden-invoice-empty"><span aria-hidden="true">＋</span><strong>La orden aún no tiene conceptos</strong><p>Agrega repuestos desde el catálogo o registra la mano de obra.</p></div>}</div>
          </section>
          <section className="orden-document-labor" aria-labelledby="orden-mano-obra-title"><header><h3 id="orden-mano-obra-title">Agregar mano de obra</h3><p>Registra el trabajo realizado por el taller.</p></header><div className="orden-labor-fields"><label>Descripción del trabajo<input id="orden-trabajo" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} placeholder="Ej. Cambio de frenos" /></label><div className="orden-labor-numbers"><label>Cantidad<input type="number" min="0.001" step="0.001" value={cantidadTrabajo} onChange={(e) => setCantidadTrabajo(e.target.value)} /></label><label>Precio unitario<input type="number" min="0" step="0.01" value={precioTrabajo} onChange={(e) => setPrecioTrabajo(e.target.value)} placeholder="0.00" /></label></div><button type="button" onClick={agregarTrabajo}>Agregar trabajo</button></div></section>
          <section className="orden-document-diagnosis" aria-labelledby="orden-diagnostico-title"><header><h3 id="orden-diagnostico-title">Motivo y diagnóstico</h3><p>Información reportada y hallazgos del servicio.</p></header><div className="orden-diagnostico-fields"><label>Motivo de ingreso *<textarea required value={vehiculo.motivo} disabled={Boolean(ordenActiva)} onChange={(e) => setVehiculo({ ...vehiculo, motivo: e.target.value })} placeholder="¿Qué problema o servicio solicita el cliente?" /></label><label>Diagnóstico (opcional)<textarea value={vehiculo.diagnostico} onChange={(e) => setVehiculo({ ...vehiculo, diagnostico: e.target.value })} placeholder="Hallazgos, recomendaciones o trabajo por realizar" /></label></div>{ordenActiva && <><label className="orden-advance-field">Nota de avance<textarea value={notaAvance} onChange={(e) => setNotaAvance(e.target.value)} placeholder="Describe el trabajo realizado en esta actualización" /></label>{ordenActiva.notasTrabajo.length > 0 && <div className="gestion-timeline"><strong>Historial de avances</strong>{ordenActiva.notasTrabajo.map((nota, i) => <p key={`${nota.fecha}-${i}`}><time>{new Date(nota.fecha).toLocaleString("es-PE")}</time>{nota.texto}</p>)}</div>}</>}</section>
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
          <header className="orden-document-header"><div><span>PROPUESTA COMERCIAL</span><h2>NUEVA COTIZACIÓN</h2><p>Fecha de emisión: {hoy()}</p></div><div className="orden-document-meta"><strong>BORRADOR</strong><span>Sin guardar</span></div></header>
          <section className="orden-document-reception gestion-cotizacion-fields" aria-label="Datos de la cotización">
            <div className="gestion-cotizacion-client"><label>Cliente</label>{cliente ? <div className="gestion-selected"><div><strong>{nombreCliente(cliente)}</strong><small>{cliente.numeroDocumento}</small></div><button type="button" onClick={() => { setCliente(null); setClienteBusqueda(""); }}>Cambiar</button></div> : <><input autoComplete="off" value={clienteBusqueda} onChange={(e) => setClienteBusqueda(e.target.value)} placeholder="Buscar por nombre, DNI o RUC" />{clientes.length > 0 && <div className="gestion-results">{clientes.map((item) => <button type="button" key={item.id} onClick={() => { setCliente(item); setClienteBusqueda(nombreCliente(item)); setClientes([]); }}>{nombreCliente(item)} · {item.numeroDocumento}</button>)}</div>}{clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusqueda.trim().length >= 2 && clientes.length === 0 && <div className="orden-client-not-found"><span>No encontramos un cliente con esa búsqueda.</span><button type="button" onClick={() => setMostrarFormularioCliente(true)}>Crear cliente</button></div>}</>}</div>
            <label>Válida hasta (opcional)<input type="date" min={hoy()} value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} /></label>
            <label>Comprobante al convertir<select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as typeof tipoComprobante)}><option value="BOLETA">Boleta de venta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta interna</option></select></label>
          </section>
          <section className="orden-document-lines" aria-label="Repuestos y servicios de la cotización">
            <div className="gestion-cotizacion-lines-heading"><h3>Repuestos y servicios de esta cotización</h3><span>{lineas.length} líneas</span><button type="button" onClick={() => document.getElementById("cotizacion-trabajo")?.focus()}>+ Agregar servicio</button></div>
            <div className="orden-invoice-columns"><span>Concepto</span><span>Cant.</span><span>Importe</span><span aria-label="Acciones" /></div>
            <div className="orden-invoice-lines">{lineas.length ? lineas.map((linea, indice) => <div className="orden-invoice-line" key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`}><span className="orden-line-description"><strong>{String(linea.nombreVisible ?? linea.descripcion)}</strong><small>{linea.tipo === "PRODUCTO" ? "Repuesto" : "Servicio"} · {dinero(Number(linea.precioUnitario))} por unidad</small></span><input aria-label={`Cantidad de ${String(linea.nombreVisible ?? linea.descripcion)}`} type="number" min="0.001" step="0.001" value={String(linea.cantidad)} onChange={(e) => setLineas((actuales) => actuales.map((fila, i) => i === indice ? { ...fila, cantidad: e.target.value } : fila))} /><strong>{dinero(Number(linea.cantidad) * Number(linea.precioUnitario) - Number(linea.descuento))}</strong><button type="button" aria-label={`Quitar ${String(linea.nombreVisible ?? linea.descripcion)}`} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))}>×</button></div>) : <div className="orden-invoice-empty"><strong>Agrega el primer repuesto</strong><p>Busca en el catálogo o añade un servicio para iniciar.</p></div>}</div>
          </section>
          <section className="orden-document-labor gestion-cotizacion-service" aria-label="Agregar servicio"><div className="orden-labor-fields"><label>Trabajo / mano de obra<input id="cotizacion-trabajo" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} placeholder="Ej. Cambio de frenos" /></label><div className="orden-labor-numbers"><label>Cantidad<input type="number" min="0.001" step="0.001" value={cantidadTrabajo} onChange={(e) => setCantidadTrabajo(e.target.value)} /></label><label>Precio unitario<input type="number" min="0" step="0.01" value={precioTrabajo} onChange={(e) => setPrecioTrabajo(e.target.value)} placeholder="0.00" /></label></div><button type="button" onClick={agregarTrabajo}>Agregar servicio</button></div></section>
          <section className="gestion-cotizacion-notes"><label>Observaciones<textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Añade una nota para el cliente" /></label><div className="orden-document-total"><div><span>TOTAL COTIZADO</span><strong>{dinero(total)}</strong></div></div></section>
        </article>
      </div>}
      <footer><button type="button" onClick={() => setMostrarFormulario(false)}>{esOrden ? "Cancelar" : "Cerrar"}</button><button type="button" className="gestion-primary" disabled={guardando} onClick={() => void guardarGestion()}>{guardando ? "Guardando…" : esOrden ? "Guardar orden" : "Guardar cotización"}</button></footer>
    </section>}
    {mostrarFormularioCliente && createPortal(<FormularioCliente numeroDocumentoInicial={/^\d+$/.test(clienteBusqueda.trim()) ? clienteBusqueda.trim() : ""} onGuardar={registrarYSeleccionarCliente} onCancelar={() => setMostrarFormularioCliente(false)} />, document.body)}
  </section>;
}
