import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { servicioIngresos, type ClienteRegistrado, type Cotizacion } from "../../services/ingresos.service";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { documentoDeCotizacion } from "./documento-cotizacion";
import { FormularioCliente } from "../clientes-page/clientes-page";
import "../nuevo-ingreso-page/nuevo-ingreso-page.css";
import "../ordenes-servicio-page/ordenes-servicio-page.css";
import { CotizacionEditor } from "./cotizacion-editor";
import { useGestionListado } from "./use-gestion-listado";
import { useGestionCliente } from "./use-gestion-cliente";
import { useLineasGestion } from "./use-lineas-gestion";
import { calcularTotalesCotizacion, mensajeWhatsAppCotizacion as crearMensajeWhatsApp } from "./gestion-utils";
import { GestionListadoVista } from "./gestion-listado-vista";
import { useAccionesPersistencia } from "./use-acciones-persistencia";
import { cotizacionClases } from "./cotizacion-clases";
import type { LineaGestion } from "./gestion-utils";
import "./ordenes-cotizaciones-page.css";

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const sumarDias = (fecha: string, dias: number) => { const resultado = new Date(`${fecha}T00:00:00Z`); resultado.setUTCDate(resultado.getUTCDate() + dias); return resultado.toISOString().slice(0, 10); };
const dinero = (valor: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const claveDatosCotizacion = (datos: unknown) => JSON.stringify(datos);
export function OrdenesCotizacionesPage({ puedeCrear }: { modo: "COTIZACIONES"; puedeCrear: boolean }) {
  const imprimirAlGuardar = useImprimirAlEmitir(useAlertas());
  const navegar = useNavigate();
  const listado = useGestionListado();
  const { cotizacionesFiltradas, busqueda, setBusqueda, filtroVigenciaDesde, setFiltroVigenciaDesde, filtroVigenciaHasta, setFiltroVigenciaHasta, cargando, error, setError, cargar, documentoCotizacionCompletado, estadoVisibleCotizacion } = listado;
  const clientesGestion = useGestionCliente({ setError, nombreCliente });
  const lineasGestion = useLineasGestion({ setError });
  const { cliente, setCliente, clienteBusqueda, setClienteBusqueda, clienteBusquedaConsultada, setClienteBusquedaConsultada, tipoDocumentoBusqueda, setTipoDocumentoBusqueda, cambiarTipoDocumentoBusqueda, cambiarBusquedaClienteCotizacion, buscandoClientes, clientes, setClientes, mostrarFormularioCliente, setMostrarFormularioCliente, ejecutarBusquedaCliente, registrarYSeleccionarCliente, seleccionarClienteCotizacion, limpiarClienteCotizacion, manejarEnterBusquedaCliente } = clientesGestion;
  const { busquedaProducto, setBusquedaProducto, productos, setProductos, buscandoProductos, productosRecientes, agregarProductoReciente, lineas, setLineas, agregarProducto, agregarServicioCotizacion, actualizarLineaCotizacion, eliminarLineaCotizacion } = lineasGestion;
  const [guardando, setGuardando] = useState(false);
  const [codigoCotizacionPrevisualizado, setCodigoCotizacionPrevisualizado] = useState<string | null>(null);
  const [aplicaIgvNuevaCotizacion, setAplicaIgvNuevaCotizacion] = useState<boolean>();
  const [consultandoSerieCotizacion, setConsultandoSerieCotizacion] = useState(false);
  const [errorConsultaSerieCotizacion, setErrorConsultaSerieCotizacion] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cotizacionActivaEdicion, setCotizacionActivaEdicion] = useState<Cotizacion | null>(null);
  const [clienteInicialEdicionId, setClienteInicialEdicionId] = useState<string | null>(null);
  const [clienteInicialEdicionNombre, setClienteInicialEdicionNombre] = useState<string | null>(null);
  const [confirmarDescarteCotizacion, setConfirmarDescarteCotizacion] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [fechaEmisionCotizacion, setFechaEmisionCotizacion] = useState(hoy);
  const [vigenteHasta, setVigenteHasta] = useState(() => sumarDias(hoy(), 15));
  const claveInicialCotizacion = useRef<string | null>(null);

  const claveCotizacionActual = claveDatosCotizacion({ clienteId: cliente?.id ?? clienteInicialEdicionId, clienteBusqueda, lineas, observacion, fechaEmision: fechaEmisionCotizacion, vigenteHasta });
  const totales = calcularTotalesCotizacion(lineas, cotizacionActivaEdicion ? cotizacionActivaEdicion.aplicaIgv : aplicaIgvNuevaCotizacion);

  useEffect(() => {
    if (!mostrarFormulario) return;
    if (cotizacionActivaEdicion) {
      setCodigoCotizacionPrevisualizado(cotizacionActivaEdicion.codigo);
      setErrorConsultaSerieCotizacion(false);
      setConsultandoSerieCotizacion(false);
      return;
    }
    let vigente = true;
    setCodigoCotizacionPrevisualizado(null); setErrorConsultaSerieCotizacion(false); setConsultandoSerieCotizacion(true);
    setAplicaIgvNuevaCotizacion(undefined);
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (vigente) {
        setCodigoCotizacionPrevisualizado(numeraciones.COTIZACION.codigo);
        setAplicaIgvNuevaCotizacion(numeraciones.COTIZACION.aplicaIgv);
        setErrorConsultaSerieCotizacion(false);
      }
    }).catch(() => {
      if (vigente) { setCodigoCotizacionPrevisualizado(null); setErrorConsultaSerieCotizacion(true); }
    }).finally(() => { if (vigente) setConsultandoSerieCotizacion(false); });
    return () => { vigente = false; };
  }, [mostrarFormulario, cotizacionActivaEdicion]);

  function nuevaGestion() {
    const fechaCotizacion = hoy();
    setCotizacionActivaEdicion(null); setClienteInicialEdicionId(null); setClienteInicialEdicionNombre(null);
    setFechaEmisionCotizacion(fechaCotizacion);
    setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setTipoDocumentoBusqueda("DNI"); setClientes([]); setLineas([]); setObservacion(""); setVigenteHasta(sumarDias(fechaCotizacion, 15)); setBusquedaProducto("");
    claveInicialCotizacion.current = claveDatosCotizacion({ clienteId: null, clienteBusqueda: "", lineas: [], observacion: "", fechaEmision: fechaCotizacion, vigenteHasta: sumarDias(fechaCotizacion, 15) });
    setMostrarFormularioCliente(false); setConfirmarDescarteCotizacion(false); setMostrarFormulario(true); setError("");
  }
  function cerrarFormularioGestion() {
    if (claveInicialCotizacion.current === claveCotizacionActual) {
      setMostrarFormulario(false);
      limpiarBorradorCotizacion();
      return;
    }
    setConfirmarDescarteCotizacion(true);
  }
  function limpiarBorradorCotizacion() {
    const fecha = hoy();
    setCotizacionActivaEdicion(null); setClienteInicialEdicionId(null); setClienteInicialEdicionNombre(null);
    setFechaEmisionCotizacion(fecha); setVigenteHasta(sumarDias(fecha, 15));
    setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setTipoDocumentoBusqueda("DNI"); setClientes([]);
    setLineas([]); setObservacion(""); setBusquedaProducto(""); setProductos([]); setError("");
  }
  function descartarCotizacion() {
    setConfirmarDescarteCotizacion(false);
    setMostrarFormulario(false);
    limpiarBorradorCotizacion();
  }
  function seleccionarClienteParaCotizacion(item: ClienteRegistrado) {
    seleccionarClienteCotizacion(item);
    setClienteInicialEdicionId(null); setClienteInicialEdicionNombre(null);
  }
  function limpiarClienteParaCotizacion() {
    limpiarClienteCotizacion();
    setClienteInicialEdicionId(null); setClienteInicialEdicionNombre(null);
  }
  const { guardarGestion } = useAccionesPersistencia({ datos: { cliente, clienteInicialId: clienteInicialEdicionId, lineas, vigenteHasta, fechaEmision: fechaEmisionCotizacion, codigoCotizacion: codigoCotizacionPrevisualizado, cotizacionId: cotizacionActivaEdicion?.id ?? null, errorConsultaSerie: errorConsultaSerieCotizacion, observacion }, acciones: { setError, setGuardando, setConfirmarDescarte: setConfirmarDescarteCotizacion, setMostrarFormulario, cargar, limpiarBorradorCotizacion } });

  function abrirVentaCotizacion(cotizacion: Cotizacion, tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA") {
    navegar("/ingresos/nuevo/repuestos", { state: { cotizacion: { id: cotizacion.id, codigo: cotizacion.codigo, clienteId: cotizacion.clienteId, clienteNombre: cotizacion.clienteNombre, detalles: cotizacion.detalles, observacion: cotizacion.observacion, tipoComprobante } } });
  }

  function editarCotizacion(cotizacion: Cotizacion) {
    const fechaEmision = cotizacion.fecha.slice(0, 10);
    setCotizacionActivaEdicion(cotizacion);
    setCliente(null); setClienteInicialEdicionId(cotizacion.clienteId); setClienteInicialEdicionNombre(cotizacion.clienteNombre);
    setClienteBusqueda(""); setClienteBusquedaConsultada(""); setTipoDocumentoBusqueda("DNI"); setClientes([]);
    setLineas(cotizacion.detalles.map((linea) => ({
      ...linea,
      tipo: linea.tipo === "SERVICIO" ? "SERVICIO" : "PRODUCTO",
      nombreVisible: String(linea.nombreVisible ?? linea.descripcion ?? "Repuesto"),
      precioUnitario: String(linea.precioUnitario ?? "0"),
      cantidad: String(linea.cantidad ?? "1"),
      descuento: String(linea.descuento ?? "0"),
      afectacionIgv: linea.afectacionIgv === "EXONERADO" || linea.afectacionIgv === "INAFECTO" ? linea.afectacionIgv : "GRAVADO",
    })) as LineaGestion[]);
    setFechaEmisionCotizacion(fechaEmision);
    setVigenteHasta(cotizacion.vigenteHasta ?? sumarDias(fechaEmision, 15));
    setObservacion(cotizacion.observacion ?? ""); setBusquedaProducto("");
    claveInicialCotizacion.current = claveDatosCotizacion({ clienteId: cotizacion.clienteId, clienteBusqueda: "", lineas: cotizacion.detalles.map((linea) => ({ ...linea, tipo: linea.tipo === "SERVICIO" ? "SERVICIO" : "PRODUCTO", nombreVisible: String(linea.nombreVisible ?? linea.descripcion ?? "Repuesto"), precioUnitario: String(linea.precioUnitario ?? "0"), cantidad: String(linea.cantidad ?? "1"), descuento: String(linea.descuento ?? "0"), afectacionIgv: linea.afectacionIgv === "EXONERADO" || linea.afectacionIgv === "INAFECTO" ? linea.afectacionIgv : "GRAVADO" })), observacion: cotizacion.observacion ?? "", fechaEmision, vigenteHasta: cotizacion.vigenteHasta ?? sumarDias(fechaEmision, 15) });
    setMostrarFormularioCliente(false); setConfirmarDescarteCotizacion(false); setError(""); setMostrarFormulario(true);
  }

  async function guardarEImprimirCotizacion() {
    const preparada = await imprimirAlGuardar.preparar();
    const clienteNombreImpresion = cliente ? nombreCliente(cliente) : clienteInicialEdicionNombre;
    const guardada = await guardarGestion();
    if (guardada) await imprimirAlGuardar.imprimir(() => documentoDeCotizacion(guardada, clienteNombreImpresion), preparada);
  }

  const listadoVistaProps = { busqueda, setBusqueda, desde: filtroVigenciaDesde, setDesde: setFiltroVigenciaDesde, hasta: filtroVigenciaHasta, setHasta: setFiltroVigenciaHasta, cotizaciones: cotizacionesFiltradas, cargando, estadoVisible: estadoVisibleCotizacion, documentoCompletado: documentoCotizacionCompletado, mensajeWhatsApp: (cotizacion: Cotizacion) => crearMensajeWhatsApp(cotizacion, dinero), documentoImprimible: (cotizacion: Cotizacion) => () => documentoDeCotizacion(cotizacion), prepararDocumento: abrirVentaCotizacion, puedeCrear, editar: editarCotizacion };

  return <section className={`gestion-ingresos-page ${cotizacionClases.pageShared} is-cotizaciones ${cotizacionClases.page}${mostrarFormulario ? " is-editing" : ""}`}>
    {error && <NotificacionFlotante mensaje={error} />}
    {!mostrarFormulario && <GestionListadoVista {...listadoVistaProps} />}
    {puedeCrear && !mostrarFormulario && <RegistrarAccionPrincipal etiqueta="Crear cotización" onClick={nuevaGestion} />}
    {mostrarFormulario && <section className={`gestion-editor ${cotizacionClases.editor} ${cotizacionClases.editorFooter}`} aria-label="Formulario de cotización">
      <CotizacionEditor
          productos={productos}
          buscandoProductos={buscandoProductos}
          productosRecientes={productosRecientes}
          onAgregarProductoReciente={(item) => void agregarProductoReciente(item)}
          busquedaProducto={busquedaProducto}
          onBusquedaProductoChange={setBusquedaProducto}
          onAgregarProducto={agregarProducto}
          dinero={dinero}
          fechaEmision={fechaEmisionCotizacion}
          consultandoSerie={consultandoSerieCotizacion}
          errorConsultaSerie={errorConsultaSerieCotizacion}
          codigoPrevisualizado={codigoCotizacionPrevisualizado}
          cliente={cliente}
          clienteInicialId={clienteInicialEdicionId}
          clienteInicialNombre={clienteInicialEdicionNombre}
          nombreCliente={nombreCliente}
          tipoDocumentoBusqueda={tipoDocumentoBusqueda}
          onTipoDocumentoBusquedaChange={cambiarTipoDocumentoBusqueda}
          clienteBusqueda={clienteBusqueda}
          onClienteBusquedaChange={cambiarBusquedaClienteCotizacion}
          clienteBusquedaConsultada={clienteBusquedaConsultada}
          onBuscarCliente={ejecutarBusquedaCliente}
          onKeyDownBusquedaCliente={manejarEnterBusquedaCliente}
          buscandoClientes={buscandoClientes}
          clientes={clientes}
          onSeleccionarCliente={seleccionarClienteParaCotizacion}
          onLimpiarCliente={limpiarClienteParaCotizacion}
          onAgregarCliente={() => { setError(""); setMostrarFormularioCliente(true); }}
          vigenteHasta={vigenteHasta}
          onVigenteHastaChange={setVigenteHasta}
          lineas={lineas}
          onAgregarServicio={agregarServicioCotizacion}
          onActualizarLinea={actualizarLineaCotizacion}
          onEliminarLinea={eliminarLineaCotizacion}
          observacion={observacion}
          onObservacionChange={setObservacion}
          totales={totales}
          onCerrar={cerrarFormularioGestion}
          onGuardar={() => void guardarEImprimirCotizacion()}
          guardando={guardando}
          editando={Boolean(cotizacionActivaEdicion)}
        />
    </section>}
    {confirmarDescarteCotizacion && <ConfirmarDescarteFormulario elemento={cotizacionActivaEdicion ? "los cambios de la cotización" : "la cotización"} detalle={cotizacionActivaEdicion ? "Si sales ahora, se perderán los cambios que ingresaste. La cotización original seguirá disponible. ¿Quieres descartarlos?" : undefined} accion={cotizacionActivaEdicion ? "Descartar cambios" : "Descartar cotización"} onSeguirEditando={() => setConfirmarDescarteCotizacion(false)} onDescartar={descartarCotizacion} />}
    {mostrarFormularioCliente && createPortal(<FormularioCliente numeroDocumentoInicial={/^\d+$/.test(clienteBusqueda.trim()) ? clienteBusqueda.trim() : ""} onGuardar={registrarYSeleccionarCliente} onCancelar={() => setMostrarFormularioCliente(false)} />, document.body)}
  </section>;
}
