import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { servicioIngresos, type ClienteRegistrado, type OrdenServicio, type ProductoParaIngreso } from "../../services/ingresos.service";
import { servicioPersonal, type PersonaPersonal } from "../../services/personal.service";
import { documentoDeOrden } from "./documento-orden";
import { useAltaRapidaRepuesto } from "../../components/productos/use-alta-rapida-repuesto";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { FormularioCliente } from "../clientes-page/clientes-page";
import { useOrdenesServicioListado } from "./use-ordenes-servicio-listado";
import { OrdenServicioEditor } from "./orden-servicio-editor";
import type { TipoDocumentoOrden } from "./orden-servicio-menu-acciones";
import { lineaServicioIncompleta, useOrdenServicioLineas } from "./use-orden-servicio-lineas";
import { useOrdenServicioClientes } from "./use-orden-servicio-clientes";
import type { LineaOrden } from "./types";
import { OrdenesServicioListado } from "./ordenes-servicio-listado";
import { importesOrden } from "./importes-orden";
import { ConfirmarDescartarOrden } from "./confirmar-descartar-orden";
import { etiquetasEstadoOrden } from "./estados-orden";
import "../nuevo-ingreso-page/nuevo-ingreso-page.css";
import "./ordenes-servicio-page.css";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";

const fechaHoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const fechaLegible = (fecha: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${fecha.slice(0, 10)}T00:00:00Z`));
const soles = (monto: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number.isFinite(monto) ? monto : 0);
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const estadosOrden = etiquetasEstadoOrden;
const totalOrden = (lineas: LineaOrden[]) => importesOrden(lineas).total;
type EstadoFormularioOrden = {
  fechaRecepcion: string;
  fechaAcabado: string;
  clienteId: string | null;
  clienteBusqueda: string;
  tipoDocumentoBusqueda: "DNI" | "RUC" | "NOMBRE";
  vehiculo: { placa: string; diagnostico: string };
  trabajadorResponsableId: string;
  condicionRecepcion: string;
  motivo: string;
  adelanto: string;
  adelantoMedioPago: string;
  adelantoCuentaId: string;
  lineas: LineaOrden[];
  estado: OrdenServicio["estado"];
};
const claveEstadoFormulario = (datos: EstadoFormularioOrden) => JSON.stringify(datos);
export function OrdenesServicioPage({ puedeCrear }: { puedeCrear: boolean }) {
  const imprimirAlGuardar = useImprimirAlEmitir(useAlertas());
  const navegar = useNavigate();
  const listado = useOrdenesServicioListado();
  const { ordenes, busqueda, setBusqueda, cargando, error, setError, cargarOrdenes } = listado;
  const [guardando, setGuardando] = useState(false);
  const [enFormulario, setEnFormulario] = useState(false);
  const [codigoOrdenPrevisualizado, setCodigoOrdenPrevisualizado] = useState<string | null>(null);
  const [consultandoNumeroOrden, setConsultandoNumeroOrden] = useState(false);
  const [errorConsultaNumeroOrden, setErrorConsultaNumeroOrden] = useState(false);
  const [ordenActiva, setOrdenActiva] = useState<OrdenServicio | null>(null);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const claveFormularioInicial = useRef<string | null>(null);
  const [fechaRecepcion, setFechaRecepcion] = useState(fechaHoy);
  const [fechaAcabado, setFechaAcabado] = useState(fechaHoy);
  const clientesForm = useOrdenServicioClientes({ setError });
  const { clienteBusqueda, clienteConsultado, buscandoClientes, tipoDocumentoBusqueda, clientes, cliente } = clientesForm;
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<ProductoParaIngreso[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const lineasForm = useOrdenServicioLineas({ setBusquedaProducto, setProductos });
  const altaRepuesto = useAltaRapidaRepuesto({ busqueda: busquedaProducto, alCrear: (producto) => lineasForm.agregarProducto(producto), alError: (mensaje) => lineasForm.setErrorServicio(mensaje) });
  const { lineas, setLineas, errorServicio, setErrorServicio, agregarProducto, agregarProductoReciente, productosRecientes, agregarServicio, actualizarLinea } = lineasForm;
  const [vehiculo, setVehiculo] = useState({ placa: "", diagnostico: "" });
  const [motivo, setMotivo] = useState("");
  const [adelanto, setAdelanto] = useState("0.00");
  const [adelantoMedioPago, setAdelantoMedioPago] = useState("EFECTIVO");
  const [adelantoCuentaId, setAdelantoCuentaId] = useState("");
  const [estado, setEstado] = useState<OrdenServicio["estado"]>("ABIERTA");
  const [tiposDocumentoDisponibles, setTiposDocumentoDisponibles] = useState<TipoDocumentoOrden[]>([]);
  const [personal, setPersonal] = useState<PersonaPersonal[]>([]);
  const [trabajadorResponsableId, setTrabajadorResponsableId] = useState("");
  const [condicionRecepcion, setCondicionRecepcion] = useState("");

  useEffect(() => { void servicioPersonal.listar().then(setPersonal).catch(() => setPersonal([])); }, []);

  useEffect(() => {
    if (!puedeCrear) { setTiposDocumentoDisponibles([]); return; }
    let vigente = true;
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (!vigente) return;
      setTiposDocumentoDisponibles(([
        "BOLETA",
        "FACTURA",
        "NOTA_VENTA",
      ] as const).filter((tipo) => Boolean(numeraciones[tipo].serie && numeraciones[tipo].codigo)));
    }).catch(() => {
      if (vigente) { setTiposDocumentoDisponibles([]); setError("No se pudieron cargar los tipos de documento configurados en la base de datos."); }
    });
    return () => { vigente = false; };
  }, [puedeCrear, setError]);

  const nombreClienteSeleccionado = cliente ? nombreCliente(cliente) : "";
  const claveFormularioActual = claveEstadoFormulario({
    fechaRecepcion,
    fechaAcabado,
    clienteId: cliente?.id ?? null,
    clienteBusqueda,
    tipoDocumentoBusqueda,
    vehiculo,
    trabajadorResponsableId,
    condicionRecepcion,
    motivo,
    adelanto,
    adelantoMedioPago,
    adelantoCuentaId,
    lineas,
    estado,
  });

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
    if (consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO) { setProductos([]); setBuscandoProductos(false); return; }
    let vigente = true;
    setBuscandoProductos(true);
    const temporizador = window.setTimeout(() => {
      void servicioIngresos.buscarProductos(consulta).then((resultado) => { if (vigente) setProductos(resultado.slice(0, MAX_RESULTADOS_CATALOGO)); }).catch(() => { if (vigente) setProductos([]); }).finally(() => { if (vigente) setBuscandoProductos(false); });
    }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [busquedaProducto]);

  function nuevaOrden() {
    const fechaInicial = fechaHoy();
    setOrdenActiva(null);
    setFechaRecepcion(fechaInicial);
    setFechaAcabado(fechaInicial);
    clientesForm.limpiarBusqueda();
    setVehiculo({ placa: "", diagnostico: "" });
    setTrabajadorResponsableId(""); setCondicionRecepcion("");
    setMotivo(""); setAdelanto("0.00"); setAdelantoMedioPago("EFECTIVO"); setAdelantoCuentaId("");
    setLineas([]); setErrorServicio("");
    setBusquedaProducto(""); setProductos([]); setEstado("ABIERTA"); setError("");
    claveFormularioInicial.current = claveEstadoFormulario({
      fechaRecepcion: fechaInicial,
      fechaAcabado: fechaInicial,
      clienteId: null,
      clienteBusqueda: "",
      tipoDocumentoBusqueda: "DNI",
      vehiculo: { placa: "", diagnostico: "" },
      trabajadorResponsableId: "", condicionRecepcion: "",
      motivo: "",
      adelanto: "0.00",
      adelantoMedioPago: "EFECTIVO",
      adelantoCuentaId: "",
      lineas: [],
      estado: "ABIERTA",
    });
    setEnFormulario(true);
  }

  function abrirOrden(orden: OrdenServicio) {
    const lineasIniciales = (orden.detalles as LineaOrden[]).map((linea) => ({ ...linea, cantidad: String(Math.max(1, Math.trunc(Number(linea.cantidad) || 1))) }));
    const vehiculoInicial = { placa: orden.vehiculoPlaca, diagnostico: orden.diagnostico ?? "" };
    setTrabajadorResponsableId(orden.trabajadorResponsableId ?? ""); setCondicionRecepcion(orden.condicionRecepcion ?? "");
    const motivoInicial = orden.motivo ?? "";
    const adelantoInicial = String(orden.adelanto ?? "0.00");
    const adelantoMedioInicial = orden.adelantoMedioPago ?? "EFECTIVO";
    const cuentaInicial = orden.adelantoCuentaFinancieraId ?? "";
    const fechaAcabadoInicial = orden.fechaAcabado ?? "";
    setOrdenActiva(orden);
    setFechaRecepcion(orden.fechaRecepcion);
    setFechaAcabado(fechaAcabadoInicial);
    clientesForm.prepararEdicion(orden.clienteNombre);
    setVehiculo(vehiculoInicial);
    setMotivo(motivoInicial); setAdelanto(adelantoInicial); setAdelantoMedioPago(adelantoMedioInicial); setAdelantoCuentaId(cuentaInicial);
    setLineas(lineasIniciales); setEstado(orden.estado); setError(""); setErrorServicio("");
    setBusquedaProducto(""); setProductos([]);
    claveFormularioInicial.current = claveEstadoFormulario({
      fechaRecepcion: orden.fechaRecepcion,
      fechaAcabado: fechaAcabadoInicial,
      clienteId: null,
      clienteBusqueda: orden.clienteNombre,
      tipoDocumentoBusqueda,
      vehiculo: vehiculoInicial,
      trabajadorResponsableId: orden.trabajadorResponsableId ?? "", condicionRecepcion: orden.condicionRecepcion ?? "",
      motivo: motivoInicial,
      adelanto: adelantoInicial,
      adelantoMedioPago: adelantoMedioInicial,
      adelantoCuentaId: cuentaInicial,
      lineas: lineasIniciales,
      estado: orden.estado,
    });
    setEnFormulario(true);
  }

  function descartarFormulario() {
    setConfirmarCancelacion(false);
    claveFormularioInicial.current = null;
    setEnFormulario(false);
    setOrdenActiva(null);
    setError("");
  }

  function cancelarFormulario() {
    if (guardando) return;
    if (claveFormularioInicial.current !== null && claveFormularioActual !== claveFormularioInicial.current) {
      setConfirmarCancelacion(true);
      return;
    }
    descartarFormulario();
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ordenActiva && !cliente) { setError("Selecciona un cliente para registrar la orden."); return; }
    if (!vehiculo.placa.trim()) { setError("Ingresa la placa o el identificador del vehículo."); return; }
    if (!trabajadorResponsableId) { setError("Selecciona a la persona responsable de revisar el móvil."); return; }
    if (lineas.some(lineaServicioIncompleta)) { setErrorServicio("Completa la descripción, cantidad y precio del servicio antes de guardar."); return; }
    if (Number(adelanto) > 0 && !adelantoCuentaId) { setError("Selecciona la cuenta donde se recibió el adelanto."); return; }
    // Imprimir es la acción principal: la impresora se pide en el clic (gesto del usuario) y la orden se guarda antes de imprimir.
    let preparada;
    try { preparada = await imprimirAlGuardar.preparar("TICKET"); }
    catch (problema) { setError(mensajeErrorImpresion(problema)); return; }
    setGuardando(true); setError("");
    try {
      let guardada: OrdenServicio;
      if (ordenActiva) {
        guardada = await servicioIngresos.actualizarOrdenServicio(ordenActiva.id, { trabajadorResponsableId, condicionRecepcion, motivo, adelanto: Number(adelanto || 0), adelantoMedioPago, adelantoCuentaFinancieraId: adelantoCuentaId, diagnostico: vehiculo.diagnostico, detalles: lineas, estado, fechaAcabado });
      } else {
        guardada = await servicioIngresos.crearOrdenServicio({ clienteId: cliente!.id, trabajadorResponsableId, condicionRecepcion, vehiculoPlaca: vehiculo.placa.trim().toLocaleUpperCase("es-PE"), motivo, adelanto: Number(adelanto || 0), adelantoMedioPago, adelantoCuentaFinancieraId: adelantoCuentaId, diagnostico: vehiculo.diagnostico.trim() || null, fechaRecepcion, fechaAcabado, detalles: lineas });
      }
      claveFormularioInicial.current = null;
      const impresa = { ...guardada, clienteNombre: guardada.clienteNombre || ordenActiva?.clienteNombre || (cliente ? cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ") : ""), responsableNombre: guardada.responsableNombre ?? (() => { const p = personal.find((persona) => persona.id === trabajadorResponsableId); return p ? [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ") : null; })() };
      setEnFormulario(false); setOrdenActiva(null);
      await Promise.all([cargarOrdenes(), imprimirAlGuardar.imprimir(() => documentoDeOrden(impresa), preparada)]);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo guardar la orden."); }
    finally { setGuardando(false); }
  }

  function emitirDocumento(orden: OrdenServicio, tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA") {
    navegar("/ingresos/nuevo/repuestos", { state: { ordenServicio: { ...orden, tipoComprobante } } });
  }

  if (!enFormulario) return <>
    <OrdenesServicioListado
      ordenes={ordenes}
      busqueda={busqueda}
      cargando={cargando}
      error={error}
      puedeCrear={puedeCrear}
      onBuscar={setBusqueda}
      onCrear={nuevaOrden}
      onEmitir={emitirDocumento}
      documentoImprimible={(orden) => () => documentoDeOrden(orden)}
      onEditar={abrirOrden}
      formatearFecha={fechaLegible}
      formatearTotal={(lineas) => soles(totalOrden(lineas))}
      tiposDocumentoDisponibles={tiposDocumentoDisponibles}
      etiquetaEstado={(orden) => estadosOrden[orden.estado]}
    />
  </>;

  return <>
    <OrdenServicioEditor
      alert={{ message: error, onClose: () => setError("") }}
      onSubmit={(evento) => void guardar(evento)}
      orden={{
        activa: ordenActiva,
        estado,
        modificada: claveFormularioInicial.current !== null && claveFormularioActual !== claveFormularioInicial.current,
        codigo: codigoOrdenPrevisualizado ?? (consultandoNumeroOrden ? "Consultando?" : errorConsultaNumeroOrden ? "No se pudo consultar la serie" : "FALTA CONFIGURAR SERIE"),
        fechaRecepcion,
        fechaAcabado,
        fechaMaxima: fechaHoy(),
        onFechaRecepcion: (fecha) => { setFechaRecepcion(fecha); if (fechaAcabado && fechaAcabado < fecha) setFechaAcabado(fecha); },
        onFechaAcabado: setFechaAcabado,
      }}
      catalogo={{ busqueda: busquedaProducto, productos, recientes: productosRecientes, buscando: buscandoProductos, onBusqueda: setBusquedaProducto, onAgregar: agregarProducto, onAgregarReciente: (item) => void agregarProductoReciente(item) }}
      vehiculo={{ datos: vehiculo, onChange: setVehiculo }}
      recepcion={{ trabajadorId: trabajadorResponsableId, condicion: condicionRecepcion, personal: personal.map((p) => ({ id: p.id, nombre: [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ") })), onTrabajador: setTrabajadorResponsableId, onCondicion: setCondicionRecepcion }}
      cliente={{
        seleccionado: cliente,
        nombreSeleccionado: nombreClienteSeleccionado,
        busqueda: clienteBusqueda,
        busquedaConfirmada: clienteConsultado,
        tipoDocumento: tipoDocumentoBusqueda,
        clientes,
        buscando: buscandoClientes,
        onBusqueda: clientesForm.cambiarBusqueda,
        onTipoDocumento: clientesForm.cambiarTipoDocumento,
        onBuscar: () => void clientesForm.buscarCliente(),
        onEnter: clientesForm.manejarEnterCliente,
        onSeleccionar: clientesForm.seleccionarCliente,
        onAgregar: () => { setError(""); clientesForm.setMostrarFormularioCliente(true); },
      }}
      detalle={{ lineas, error: errorServicio, recientes: productosRecientes, onAgregarReciente: (item) => void agregarProductoReciente(item), buscando: buscandoProductos, onAgregarServicio: agregarServicio, onAgregarProducto: agregarProducto, onActualizarLinea: actualizarLinea, onQuitarLinea: (indice) => { setLineas((actuales) => actuales.filter((_, i) => i !== indice)); setErrorServicio(""); }, onCrearRepuesto: () => void altaRepuesto.abrir() }}
      pago={{
        motivo,
        onMotivo: setMotivo,
        adelanto,
        onAdelanto: setAdelanto,
        maximoAdelanto: totalOrden(lineas),
        cuentaId: adelantoCuentaId,
        medio: adelantoMedioPago,
        onCuenta: (id, medio) => { setAdelantoCuentaId(id); setAdelantoMedioPago(medio); },
        guardando,
        guardarDeshabilitado: guardando || (!ordenActiva && (!codigoOrdenPrevisualizado || consultandoNumeroOrden || errorConsultaNumeroOrden)),
        etiquetaGuardar: guardando ? "Imprimiendo…" : "Imprimir orden",
        onCancelar: cancelarFormulario,
      }}
      formatearSoles={soles}
      importes={importesOrden(lineas)}
    />
    {confirmarCancelacion && <ConfirmarDescartarOrden onSeguirEditando={() => setConfirmarCancelacion(false)} onDescartar={descartarFormulario} />}
    {altaRepuesto.dialogo}
    {clientesForm.mostrarFormularioCliente && createPortal(<FormularioCliente numeroDocumentoInicial={/^\d+$/.test(clienteBusqueda.trim()) ? clienteBusqueda.trim() : ""} onGuardar={clientesForm.registrarCliente} onCancelar={() => clientesForm.setMostrarFormularioCliente(false)} />, document.body)}
  </>;

}
