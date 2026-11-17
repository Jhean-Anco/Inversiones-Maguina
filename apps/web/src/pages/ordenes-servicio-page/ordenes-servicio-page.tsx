import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FileOutput, Mail, Phone } from "lucide-react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { AccionIcono } from "../../components/ui/accion-icono";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo, type OrdenServicio, type ProductoParaIngreso } from "../../services/ingresos.service";
import { imprimirDocumento } from "../../services/impresion-documentos";
import { FormularioCliente } from "../clientes-page/clientes-page";
import "../nuevo-ingreso-page/nuevo-ingreso-page.css";
import "../ventas-page/ventas-page.css";
import "./ordenes-servicio-page.css";

type LineaOrden = Record<string, unknown> & {
  tipo: "PRODUCTO" | "SERVICIO";
  nombreVisible: string;
  descripcion?: string;
  precioUnitario: string;
  cantidad: string;
  descuento: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
};

const fechaHoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const fechaLegible = (fecha: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${fecha.slice(0, 10)}T00:00:00Z`));
const soles = (monto: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number.isFinite(monto) ? monto : 0);
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const estadosOrden: Record<OrdenServicio["estado"], string> = { ABIERTA: "Abierta", EN_PROCESO: "En proceso", ESPERANDO_REPUESTOS: "Esperando repuestos", COMPLETADA: "Completada", EMITIENDO: "Emitiendo", FACTURADA: "Facturada", ANULADA: "Anulada" };
const totalOrden = (lineas: LineaOrden[]) => lineas.reduce((total, linea) => total + Math.max(0, Math.round((Math.round(Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0) * 100) / 100 - Number(linea.descuento || 0)) * 100) / 100), 0);
const telefonoParaLlamar = (telefono: string) => telefono.trim().replace(/[^+\d]/g, "");
const telefonoParaWhatsApp = (telefono: string) => {
  const digitos = telefono.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
  if (/^519\d{8}$/.test(digitos)) return digitos;
  return null;
};

function SelectorDocumentoOrden({ onSeleccionar }: { onSeleccionar: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void }) {
  const id = useId();
  const menu = useMenuAccionExclusivo(`emitir-${id}`);
  const elegir = (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => {
    menu.cerrar();
    onSeleccionar(tipo);
  };
  return <span className="document-print-menu">
    <button type="button" className="erp-icon-action" title="Emitir documento" aria-label="Emitir documento" aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar}><FileOutput aria-hidden="true" size={16}/></button>
    {menu.presente && <span className="document-print-options" data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label="Tipo de documento a emitir">
      <button type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("BOLETA")}>Boleta de venta</button>
      <button type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("FACTURA")}>Factura</button>
      <button type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("NOTA_VENTA")}>Nota de venta</button>
    </span>}
  </span>;
}

function MenuWhatsAppOrden({ orden }: { orden: OrdenServicio }) {
  const id = useId();
  const menu = useMenuAccionExclusivo(`whatsapp-${id}`);
  const [solicitandoProrroga, setSolicitandoProrroga] = useState(false);
  const [motivoProrroga, setMotivoProrroga] = useState("");
  const numero = orden.clienteTelefono ? telefonoParaWhatsApp(orden.clienteTelefono) : null;
  if (!numero) return null;
  const nombre = orden.clienteNombre || "cliente";
  const abrirWhatsApp = (mensaje: string) => {
    menu.cerrar();
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  };
  const fechaFinal = orden.fechaAcabado ? fechaLegible(orden.fechaAcabado) : "la fecha acordada";
  const servicioAnulado = orden.estado === "ANULADA";
  const servicioCompletado = ["COMPLETADA", "FACTURADA"].includes(orden.estado);
  const mensajeServicioListo = `Hola ${nombre}, esperamos que estés muy bien.\n\nTe saludamos de *Inversiones Maguiña* para contarte que el servicio de tu vehículo fue *completado correctamente*.\n\n*Motivo de ingreso:* ${orden.motivo}\n*Vehículo:* ${orden.vehiculoPlaca}\n*Orden de servicio:* ${orden.codigo}\n\nTu vehículo está listo. Quedamos atentos para coordinar su recojo. ¡Gracias por confiar en nosotros!`;
  return <span className="document-print-menu ordenes-whatsapp-menu">
    <button type="button" className="erp-icon-action" title="Opciones de WhatsApp" aria-label={`Opciones de WhatsApp para ${nombre}`} aria-haspopup="true" aria-expanded={menu.abierto} onClick={() => { if (!menu.abierto) { setSolicitandoProrroga(false); setMotivoProrroga(""); } menu.alternar(); }}><svg className="orden-whatsapp-icon" aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.87 9.87 0 0 0-8.46 14.96L2 22l5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 1 1 6.96 3.84Zm4.5-6.15c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.5-1.38-1.75-.14-.25-.02-.39.1-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.52.6.19 1.14.16 1.57.1.48-.07 1.48-.61 1.69-1.2.21-.58.21-1.08.15-1.19-.06-.11-.23-.17-.48-.29Z"/></svg></button>
    {menu.presente && <div className="ordenes-whatsapp-options" data-menu-state={menu.fase} role="group" aria-hidden={!menu.abierto} aria-label="Mensajes de WhatsApp">
      <button type="button" disabled={!menu.abierto || servicioAnulado} title={servicioAnulado ? "No se puede contactar por una orden anulada" : "Avisar al cliente que el servicio se completó y el vehículo está listo para recoger"} onClick={() => abrirWhatsApp(mensajeServicioListo)}>Avisar que el servicio está listo para recoger</button>
      <button type="button" disabled={!menu.abierto || servicioCompletado} title={servicioCompletado ? "La orden ya está completada" : "Preparar solicitud de prórroga indicando el motivo"} onClick={() => { setSolicitandoProrroga((valor) => !valor); setMotivoProrroga(""); }}>Preparar solicitud de prórroga</button>
      {solicitandoProrroga && <div className="ordenes-whatsapp-extension"><label>Motivo de la prórroga<textarea autoFocus value={motivoProrroga} maxLength={500} onChange={(evento) => setMotivoProrroga(evento.target.value)} placeholder="Explica por qué se requiere más tiempo" /></label><button type="button" disabled={!menu.abierto || !motivoProrroga.trim()} onClick={() => abrirWhatsApp(`Hola ${nombre}, esperamos que estés muy bien.\n\nTe escribimos de *Inversiones Maguiña* por el servicio de tu vehículo. Necesitamos solicitar una *prórroga* para completar el trabajo.\n\n*Vehículo:* ${orden.vehiculoPlaca}\n*Orden de servicio:* ${orden.codigo}\n*Fecha de acabado prevista:* ${fechaFinal}\n*Motivo:* ${motivoProrroga.trim()}\n\nLamentamos el cambio y agradecemos tu comprensión. ¿Podrías confirmarnos si estás de acuerdo con la prórroga?`)}>Abrir WhatsApp con solicitud de prórroga</button></div>}
    </div>}
  </span>;
}

export function OrdenesServicioPage({ puedeCrear }: { puedeCrear: boolean }) {
  const navegar = useNavigate();
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [enFormulario, setEnFormulario] = useState(false);
  const [codigoOrdenPrevisualizado, setCodigoOrdenPrevisualizado] = useState<string | null>(null);
  const [consultandoNumeroOrden, setConsultandoNumeroOrden] = useState(false);
  const [errorConsultaNumeroOrden, setErrorConsultaNumeroOrden] = useState(false);
  const [ordenActiva, setOrdenActiva] = useState<OrdenServicio | null>(null);
  const [fechaRecepcion, setFechaRecepcion] = useState(fechaHoy);
  const [fechaAcabado, setFechaAcabado] = useState(fechaHoy);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteConsultado, setClienteConsultado] = useState("");
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"DNI" | "RUC" | "NOMBRE">("DNI");
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cliente, setCliente] = useState<ClienteRegistrado | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<ProductoParaIngreso[]>([]);
  const [lineas, setLineas] = useState<LineaOrden[]>([]);
  const [errorServicio, setErrorServicio] = useState("");
  const [vehiculo, setVehiculo] = useState({ placa: "", diagnostico: "" });
  const [motivo, setMotivo] = useState("");
  const [adelanto, setAdelanto] = useState("0.00");
  const [adelantoMedioPago, setAdelantoMedioPago] = useState("EFECTIVO");
  const [adelantoCuentaId, setAdelantoCuentaId] = useState("");
  const [estado, setEstado] = useState<OrdenServicio["estado"]>("ABIERTA");

  const nombreClienteSeleccionado = cliente ? nombreCliente(cliente) : "";
  const lineasConIndice = lineas.map((linea, indice) => ({ linea, indice }));

  async function cargarOrdenes() {
    setCargando(true);
    try {
      setOrdenes(await servicioIngresos.listarOrdenesServicio(busqueda));
      setError("");
    } catch (problema) {
      if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
      setError(problema instanceof Error ? problema.message : "No se pudieron cargar las órdenes de servicio.");
    } finally { setCargando(false); }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargarOrdenes(), busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    if (!enFormulario || ordenActiva) return;
    let vigente = true;
    setCodigoOrdenPrevisualizado(null);
    setErrorConsultaNumeroOrden(false);
    setConsultandoNumeroOrden(true);
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (vigente) { setCodigoOrdenPrevisualizado(numeraciones.ORDEN_SERVICIO.codigo); setErrorConsultaNumeroOrden(false); }
    }).catch(() => {
      if (vigente) { setCodigoOrdenPrevisualizado(null); setErrorConsultaNumeroOrden(true); }
    }).finally(() => {
      if (vigente) setConsultandoNumeroOrden(false);
    });
    return () => { vigente = false; };
  }, [enFormulario, ordenActiva]);

  useEffect(() => {
    const consulta = busquedaProducto.trim();
    if (consulta.length < 2) { setProductos([]); return; }
    let vigente = true;
    const temporizador = window.setTimeout(() => {
      void servicioIngresos.buscarProductos(consulta).then((resultado) => { if (vigente) setProductos(resultado); }).catch(() => { if (vigente) setProductos([]); });
    }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [busquedaProducto]);

  function nuevaOrden() {
    setOrdenActiva(null);
    setFechaRecepcion(fechaHoy());
    setFechaAcabado(fechaHoy());
    setCliente(null); setClienteBusqueda(""); setClienteConsultado(""); setClientes([]); setTipoDocumentoBusqueda("DNI");
    setVehiculo({ placa: "", diagnostico: "" });
    setMotivo(""); setAdelanto("0.00"); setAdelantoMedioPago("EFECTIVO"); setAdelantoCuentaId("");
    setLineas([]); setErrorServicio("");
    setBusquedaProducto(""); setProductos([]); setEstado("ABIERTA"); setError(""); setMostrarFormularioCliente(false);
    setEnFormulario(true);
  }

  function abrirOrden(orden: OrdenServicio) {
    setOrdenActiva(orden);
    setFechaRecepcion(orden.fechaRecepcion);
    setFechaAcabado(orden.fechaAcabado ?? "");
    setCliente(null); setClienteBusqueda(orden.clienteNombre); setClienteConsultado(""); setClientes([]);
    setVehiculo({ placa: orden.vehiculoPlaca, diagnostico: orden.diagnostico ?? "" });
    setMotivo(orden.motivo ?? ""); setAdelanto(String(orden.adelanto ?? "0.00")); setAdelantoMedioPago(orden.adelantoMedioPago ?? "EFECTIVO"); setAdelantoCuentaId(orden.adelantoCuentaFinancieraId ?? "");
    setLineas((orden.detalles as LineaOrden[]).map((linea) => ({ ...linea, cantidad: String(Math.max(1, Math.trunc(Number(linea.cantidad) || 1))) }))); setEstado(orden.estado); setError(""); setErrorServicio("");
    setBusquedaProducto(""); setProductos([]);
    setEnFormulario(true);
  }

  async function ejecutarBusquedaCliente() {
    const consulta = clienteBusqueda.trim();
    if (buscandoClientes) return;
    if (consulta.length < 2) { setError("Ingresa al menos dos caracteres para buscar al cliente."); return; }
    setBuscandoClientes(true); setClientes([]); setClienteConsultado(""); setError("");
    try {
      const resultado = await servicioIngresos.buscarClientes(consulta);
      setClientes(resultado); setClienteConsultado(consulta);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo buscar el cliente.");
    } finally { setBuscandoClientes(false); }
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
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) {
      setErrorServicio("Completa el servicio actual antes de agregar otro ítem.");
      return;
    }
    setLineas((anteriores) => [...anteriores, { tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: "1", descuento: "0", afectacionIgv: producto.afectacionIgv, precioUnitario: producto.precio, nombreVisible: `${producto.nombre} · ${producto.presentacion}` }]);
    setBusquedaProducto(""); setProductos([]); setErrorServicio("");
  }

  function agregarServicio() {
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) {
      setErrorServicio("Completa el servicio actual antes de agregar otro.");
      return;
    }
    const indiceNuevo = lineas.length;
    setLineas((actuales) => [...actuales, { tipo: "SERVICIO", descripcion: "", nombreVisible: "", cantidad: "1", precioUnitario: "", descuento: "0", afectacionIgv: "GRAVADO" }]);
    setErrorServicio("");
    window.requestAnimationFrame(() => {
      const campo = document.getElementById(`ordenes-servicio-descripcion-${indiceNuevo}`) as HTMLInputElement | null;
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
      campo?.focus({ preventScroll: true });
    });
  }

  function actualizarLinea(indice: number, cambios: Partial<LineaOrden>) {
    setLineas((actuales) => {
      const siguientes = actuales.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea);
      const incompleto = siguientes.some((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
      if (!incompleto) setErrorServicio("");
      return siguientes;
    });
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ordenActiva && !cliente) { setError("Selecciona un cliente para registrar la orden."); return; }
    if (!vehiculo.placa.trim()) { setError("Ingresa la placa o el identificador del vehículo."); return; }
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) { setErrorServicio("Completa la descripción, cantidad y precio del servicio antes de guardar."); return; }
    if (Number(adelanto) > 0 && !adelantoCuentaId) { setError("Selecciona la cuenta donde se recibió el adelanto."); return; }
    setGuardando(true); setError("");
    try {
      if (ordenActiva) {
        await servicioIngresos.actualizarOrdenServicio(ordenActiva.id, { motivo, adelanto: Number(adelanto || 0), adelantoMedioPago, adelantoCuentaFinancieraId: adelantoCuentaId, diagnostico: vehiculo.diagnostico, detalles: lineas, estado, fechaAcabado });
      } else {
        await servicioIngresos.crearOrdenServicio({ clienteId: cliente!.id, vehiculoPlaca: vehiculo.placa.trim().toLocaleUpperCase("es-PE"), motivo, adelanto: Number(adelanto || 0), adelantoMedioPago, adelantoCuentaFinancieraId: adelantoCuentaId, diagnostico: vehiculo.diagnostico.trim() || null, fechaRecepcion, fechaAcabado, detalles: lineas });
      }
      setEnFormulario(false); setOrdenActiva(null); await cargarOrdenes();
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo guardar la orden."); }
    finally { setGuardando(false); }
  }

  function emitirDocumento(orden: OrdenServicio, tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA") {
    navegar("/ingresos/nuevo/repuestos", { state: { ordenServicio: { ...orden, tipoComprobante } } });
  }

  function manejarEnterCliente(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") { evento.preventDefault(); void ejecutarBusquedaCliente(); }
  }

  function imprimirOrden(orden: OrdenServicio, formato: "A4" | "TICKET") {
    const detalles = orden.detalles as LineaOrden[];
    imprimirDocumento({ tipo: "ORDEN DE SERVICIO", codigo: orden.codigo, fecha: fechaLegible(orden.fechaRecepcion), fechaAcabado: orden.fechaAcabado ? fechaLegible(orden.fechaAcabado) : undefined, cliente: orden.clienteNombre, vehiculo: orden.vehiculoPlaca, estado: estadosOrden[orden.estado], motivo: orden.motivo, adelanto: soles(Number(orden.adelanto)), lineas: detalles.map((linea) => { const cantidad = Number(linea.cantidad ?? 1); const precio = Number(linea.precioUnitario ?? 0); return { descripcion: linea.nombreVisible || linea.descripcion || "Servicio", cantidad: String(cantidad), precio: soles(precio), total: soles(cantidad * precio - Number(linea.descuento ?? 0)) }; }), total: soles(totalOrden(detalles)) }, formato);
  }

  const controlesListado = <label className="ventas-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input type="search" value={busqueda} placeholder="Buscar por orden, cliente o vehículo" aria-label="Buscar órdenes de servicio" onChange={(evento) => setBusqueda(evento.target.value)} /></label>;

  if (!enFormulario) return <section className="ventas-page ordenes-page">
    {error && <p className="ventas-message is-error" role="alert">{error}</p>}
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear orden de servicio" onClick={nuevaOrden} />}
    <ListadoMaestro
      variante="tabla" titulo="Órdenes de servicio" descripcion="Seguimiento de las órdenes por vehículo y cliente."
      registros={ordenes} cargando={cargando} error={null}
      vacio={<div className="ventas-empty"><strong>{busqueda ? "No hay órdenes para mostrar" : "Aún no hay órdenes de servicio"}</strong><span>{busqueda ? "Prueba con otro código, cliente o dato del vehículo." : "Las órdenes registradas para tus clientes aparecerán aquí."}</span></div>}
      controlesCabecera={controlesListado} paginacion={{ modo: "local" }} resetKey={busqueda} claseTabla="ventas-table ordenes-table" claseContenedor="ventas-table-scroll" centrarCeldas
      encabezadoTabla={<tr><th>Fecha</th><th>N.° de orden</th><th>Vehículo</th><th>Cliente</th><th>Estado</th><th className="ventas-number">Total estimado</th><th>Acciones</th></tr>}
      renderizarFila={(orden) => <tr key={orden.id}>
        <td className="ventas-date">{fechaLegible(orden.fechaRecepcion)}</td>
        <td><strong className="ventas-document-code">{orden.codigo}</strong><small className="ordenes-row-caption">Orden de servicio</small></td>
        <td><strong className="ventas-client-name">Vehículo</strong><small className="ventas-client-document">{orden.vehiculoPlaca || "Sin identificador"}</small></td>
        <td><strong className="ventas-client-name">{orden.clienteNombre}</strong></td>
        <td><span className={`ventas-state${["COMPLETADA", "FACTURADA"].includes(orden.estado) ? " is-success" : orden.estado === "ANULADA" ? " is-error" : " is-progress"}`}>{estadosOrden[orden.estado]}</span></td>
        <td className="ventas-number ventas-total">{soles(totalOrden(orden.detalles as LineaOrden[]))}</td>
        <td><div className="ventas-row-actions"><BotonImprimir etiqueta={`Imprimir orden ${orden.codigo}`} alImprimirA4={() => imprimirOrden(orden, "A4")} alImprimirTicket={() => imprimirOrden(orden, "TICKET")} />{orden.estado !== "FACTURADA" && orden.estado !== "ANULADA" && <><AccionIcono accion="editar" etiqueta="Editar orden de servicio" onClick={() => abrirOrden(orden)} />{puedeCrear && <SelectorDocumentoOrden onSeleccionar={(tipo) => emitirDocumento(orden, tipo)} />}</>}{orden.clienteTelefono && <><a className="erp-icon-action" href={`tel:${telefonoParaLlamar(orden.clienteTelefono)}`} aria-label="Llamar al cliente" title={`Llamar al cliente · ${orden.clienteTelefono}`}><Phone aria-hidden="true" size={16} /></a><MenuWhatsAppOrden orden={orden} /></>}{orden.clienteCorreo && <a className="erp-icon-action" href={`mailto:${orden.clienteCorreo}`} aria-label="Enviar correo al cliente" title={`Enviar correo · ${orden.clienteCorreo}`}><Mail aria-hidden="true" size={16} /></a>}{orden.ingresoId && <AccionIcono accion="editar" etiqueta="Ver orden y documento emitido" onClick={() => abrirOrden(orden)} />}</div></td>
      </tr>}
    />
  </section>;

  return <div className="venta-page is-data-step ordenes-servicio-page">
    {error && <div className="venta-alert" role="alert">{error}<button type="button" aria-label="Cerrar alerta" onClick={() => setError("")}>×</button></div>}
    <form className="venta-layout is-data-step" onSubmit={(evento) => void guardar(evento)}>
      <div className="venta-editor is-catalog-open">
        <aside className="venta-catalog-sidebar" aria-label="Catálogo de repuestos">
          <header><div><span>CATÁLOGO</span><h2>Buscar repuestos</h2><p>Busca en inventario y agrega los necesarios para la orden.</p></div></header>
          <label className="venta-catalog-search"><span aria-hidden="true">⌕</span><input value={busquedaProducto} onChange={(evento) => setBusquedaProducto(evento.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar en el catálogo de repuestos" autoComplete="off" /></label>
          <div className="venta-catalog-results" aria-live="polite">
            {productos.length ? productos.map((producto) => <article className="venta-catalog-product" key={producto.presentacionId}>
              <div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigo} · {producto.presentacion}</span></div>
              <div className="venta-catalog-product-meta"><span>Stock <b>{Number(producto.stockBase).toLocaleString("es-PE")}</b></span><strong>{soles(Number(producto.precio))}</strong></div>
              <button type="button" onClick={() => agregarProducto(producto)}>Agregar a la orden</button>
            </article>) : <div className={`venta-catalog-empty${busquedaProducto.trim().length < 2 ? " is-hint" : ""}`}><strong>{busquedaProducto.trim().length >= 2 ? "No hay repuestos para mostrar" : "Busca repuestos para la orden"}</strong><span>{busquedaProducto.trim().length >= 2 ? "No encontramos coincidencias. Prueba con otro nombre o código." : "Escribe al menos dos caracteres para buscar en inventario."}</span></div>}
          </div>
        </aside>

        <article className="venta-form-paper ordenes-form-paper" aria-label="Orden de servicio">
          <header className="venta-form-heading"><div><p>DOCUMENTO DE SERVICIO</p><h2>ORDEN DE SERVICIO</h2></div><div className="venta-number-card"><span>N° DE ORDEN</span><strong>{ordenActiva?.codigo ?? (codigoOrdenPrevisualizado ?? (consultandoNumeroOrden ? "Consultando…" : errorConsultaNumeroOrden ? "No se pudo consultar la serie" : "FALTA CONFIGURAR SERIE"))}</strong></div></header>
          <div className="venta-form-header-fields ordenes-reception-fields">
            <div className="venta-fields venta-document-fields ordenes-vehicle-fields">
              <label>Fecha de recepción<input type="date" value={fechaRecepcion} max={fechaHoy()} disabled={Boolean(ordenActiva)} onChange={(evento) => { const fecha = evento.target.value; setFechaRecepcion(fecha); if (fechaAcabado && fechaAcabado < fecha) setFechaAcabado(fecha); }} required /></label>
              <label>Fecha estimada de acabado<input type="date" value={fechaAcabado} min={fechaRecepcion} onChange={(evento) => setFechaAcabado(evento.target.value)} required /></label>
              <label>Placa o identificador *<input value={vehiculo.placa} disabled={Boolean(ordenActiva)} onChange={(evento) => setVehiculo({ ...vehiculo, placa: evento.target.value.toLocaleUpperCase("es-PE") })} placeholder="Ej. ABC-123" required /></label>
              <div className="ordenes-customer-field">
                <label htmlFor="orden-cliente-busqueda">Cliente</label>
                {ordenActiva ? <div className="venta-client-selected"><div><strong>{ordenActiva.clienteNombre}</strong></div></div> : cliente ? <div className="venta-client-selected"><div><strong>{nombreClienteSeleccionado}</strong></div><button className="venta-client-remove" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => { setCliente(null); setClienteBusqueda(""); setClienteConsultado(""); setClientes([]); }}>×</button></div> : <div className="venta-client-picker ordenes-client-picker">
                  <label className="venta-sr-only" htmlFor="orden-cliente-busqueda">Buscar cliente</label>
                  <select className="ordenes-document-select" aria-label="Tipo de documento para buscar" value={tipoDocumentoBusqueda} onChange={(evento) => { setTipoDocumentoBusqueda(evento.target.value as typeof tipoDocumentoBusqueda); setClienteBusqueda(""); setClienteConsultado(""); setClientes([]); }}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option></select>
                  <input id="orden-cliente-busqueda" inputMode={tipoDocumentoBusqueda === "NOMBRE" ? "text" : "numeric"} maxLength={tipoDocumentoBusqueda === "DNI" ? 8 : tipoDocumentoBusqueda === "RUC" ? 11 : 120} value={clienteBusqueda} onChange={(evento) => { const valor = tipoDocumentoBusqueda === "NOMBRE" ? evento.target.value : evento.target.value.replace(/\D/g, ""); setClienteBusqueda(valor); setClienteConsultado(""); setClientes([]); }} onKeyDown={manejarEnterCliente} placeholder={tipoDocumentoBusqueda === "NOMBRE" ? "Buscar por nombre" : "Ingresa " + tipoDocumentoBusqueda} autoComplete="off" aria-label={tipoDocumentoBusqueda === "NOMBRE" ? "Nombre del cliente" : "Número de " + tipoDocumentoBusqueda} required />
                  <button className="ordenes-search-client" type="button" onClick={() => void ejecutarBusquedaCliente()} disabled={buscandoClientes}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><span>{buscandoClientes ? "Buscando…" : "Buscar cliente"}</span>
                  </button>
                  <button className="ordenes-add-client" type="button" aria-label="Agregar cliente" title="Agregar cliente" onClick={() => { setError(""); setMostrarFormularioCliente(true); }}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7"/></svg>
                  </button>
                  {clientes.length > 0 && <div className="venta-client-results">{clientes.map((item) => <button className="venta-client-result-select" type="button" key={item.id} onClick={() => { setCliente(item); setClienteBusqueda(nombreCliente(item)); setClientes([]); }}><strong>{nombreCliente(item)}</strong></button>)}</div>}
                  {clienteConsultado === clienteBusqueda.trim() && clienteBusqueda.trim().length >= 2 && clientes.length === 0 && <div className="ordenes-client-feedback" role="status">No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +.</div>}
                </div>}
              </div>
            </div>
          </div>


          <div className="venta-form-scroll ordenes-form-scroll">
            <section className="venta-form-body">
              <div className="venta-form-body-heading"><h3>Detalle de la orden</h3><div className="venta-product-tools"><span>{lineas.length} líneas</span><button type="button" onClick={agregarServicio}>{"+ Agregar servicio"}</button></div></div>
              {errorServicio && <p className="ordenes-service-error" role="alert">{errorServicio}</p>}
              <div className="venta-inline-product-search"><label className="venta-inline-product-input"><span aria-hidden="true">⌕</span><input value={busquedaProducto} onChange={(evento) => setBusquedaProducto(evento.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar repuestos para la orden" autoComplete="off" /></label>
                <div className="venta-inline-product-list" aria-live="polite">{productos.map((producto) => <button className="venta-inline-product-row" key={producto.presentacionId} type="button" onClick={() => agregarProducto(producto)}><span><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.presentacion} · Stock {Number(producto.stockBase).toLocaleString("es-PE")}</small></span><strong>{soles(Number(producto.precio))}</strong></button>)}</div>
              </div>
              {lineas.length === 0 ? <div className="venta-empty"><strong>Agrega el primer repuesto o servicio</strong><span>Busca repuestos en el inventario o pulsa Agregar servicio para incluir mano de obra.</span></div> : <div className="venta-lines is-boleta">
                <div className="venta-table-head is-boleta"><span>Descripción</span><span>Cant.</span><span>Precio</span><span>Descuento</span><span>Total</span><i /></div>
                {lineasConIndice.map(({ linea, indice }) => {
                  const descripcionServicio = String(linea.descripcion ?? linea.nombreVisible ?? "");
                  const precio = Number(linea.precioUnitario) || 0;
                  const cantidad = Number(linea.cantidad) || 0;
                  const descuento = Number(linea.descuento) || 0;
                  const totalLinea = Math.max(0, cantidad * precio - descuento);
                  return <div className={`venta-line is-boleta${linea.tipo === "SERVICIO" ? " ordenes-service-line" : ""}`} key={`${linea.tipo}-${indice}`}>
                    <div className="venta-line-name"><strong>{linea.tipo === "PRODUCTO" ? linea.nombreVisible : <input id={`ordenes-servicio-descripcion-${indice}`} aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={descripcionServicio.toLocaleUpperCase("es-PE")} onChange={(evento) => actualizarLinea(indice, { descripcion: evento.target.value.toLocaleUpperCase("es-PE"), nombreVisible: evento.target.value.toLocaleUpperCase("es-PE") })} />}</strong>{linea.tipo === "PRODUCTO" && <small>Repuesto</small>}</div>
                    <input className="venta-qty" aria-label={`Cantidad de ${linea.tipo === "PRODUCTO" ? linea.nombreVisible : "servicio"}`} type="number" min="1" step="1" value={linea.cantidad} onChange={(evento) => { const valor = evento.target.value; actualizarLinea(indice, { cantidad: valor === "" ? "" : String(Math.max(1, Math.trunc(Number(valor) || 1))) }); }} />
                    {linea.tipo === "PRODUCTO" ? <div className="venta-line-price"><strong>{soles(precio)}</strong></div> : <input className="venta-service-price" aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" placeholder="0.00" value={linea.precioUnitario} onChange={(evento) => actualizarLinea(indice, { precioUnitario: evento.target.value })} />}
                    <input className="venta-discount" aria-label={`Descuento de ${linea.tipo === "PRODUCTO" ? linea.nombreVisible : "servicio"}`} type="number" min="0" max={(cantidad * precio).toFixed(2)} step="0.01" value={linea.descuento} onChange={(evento) => actualizarLinea(indice, { descuento: evento.target.value })} />
                    <strong>{soles(totalLinea)}</strong>
                    <button type="button" aria-label={`Quitar ${linea.tipo === "PRODUCTO" ? linea.nombreVisible : "servicio"}`} onClick={() => { setLineas((actuales) => actuales.filter((_, i) => i !== indice)); setErrorServicio(""); }}>&times;</button>
                  </div>;
                })}
              </div>}
            </section>

            <div className="venta-data-footer ordenes-data-footer">
              <label className="venta-observation-card ordenes-reason-card">Motivo de ingreso<textarea aria-label="Motivo de ingreso" value={motivo} maxLength={2000} rows={3} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Describe por qué ingresa el vehículo al taller" required /></label>
              <div className="venta-checkout-actions ordenes-checkout-actions">
                <div className="venta-checkout-total">
                  <label className="venta-checkout-amount ordenes-advance-amount"><span>Monto de adelanto recibido</span><input type="number" min="0" step="0.01" max={totalOrden(lineas)} value={adelanto} onChange={(evento) => setAdelanto(evento.target.value)} /></label>
                  <SelectorCuentaFinanciera value={adelantoCuentaId} medioActual={adelantoMedioPago} etiqueta="Cuenta donde se recibe el adelanto" required={Number(adelanto) > 0} onChange={(id, medio) => { setAdelantoCuentaId(id); setAdelantoMedioPago(medio); }} />
                </div>
                <div className="venta-checkout-buttons"><button type="button" className="venta-clear" disabled={guardando} onClick={() => { setEnFormulario(false); setOrdenActiva(null); setError(""); }}>Cancelar</button><button className="venta-submit" type="submit" disabled={guardando || (!ordenActiva && (!codigoOrdenPrevisualizado || consultandoNumeroOrden || errorConsultaNumeroOrden))}>{guardando ? "Guardando…" : ordenActiva ? "Guardar cambios" : "Guardar orden"}<span aria-hidden="true">→</span></button></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </form>
    {mostrarFormularioCliente && createPortal(<FormularioCliente numeroDocumentoInicial={/^\d+$/.test(clienteBusqueda.trim()) ? clienteBusqueda.trim() : ""} onGuardar={registrarYSeleccionarCliente} onCancelar={() => setMostrarFormularioCliente(false)} />, document.body)}
  </div>;
}
