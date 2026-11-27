import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type FuenteNota, type NotaRelacionada, type VentaListado } from "../../services/ingresos.service";
import { VentaRow } from "./venta-row";
import { pendienteSunat } from "./ventas-formatters";
import { useActualizacionPendientes } from "../../hooks/use-actualizacion-pendientes";
import type { DocumentoAnulacion } from "./ventas-types";
import { DialogoRechazo } from "./dialogo-rechazo";
import { NotaAjusteFormulario } from "./nota-ajuste-formulario";
import { DialogoInicioNota } from "./dialogo-inicio-nota";
import { DialogoAnulacion } from "./dialogo-anulacion";
import { ventasClasses } from "./ventas-classes";
import { AplicarGarantiaVentaDialog } from "./aplicar-garantia-venta-dialog";
import { EditorNotaVenta } from "./editor-nota-venta";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { documentoDeIngreso, type ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";

type TipoVenta = "REPUESTOS" | "MOTOTAXIS";
// Sin filtros de estado ni de medio de pago: el listado muestra todas las ventas.
const medioPago = "";
const estadoFiltro = "TODAS" as const;
const soloConSaldo = false;
const encabezadoVentas = <tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado SUNAT</th><th>Acciones</th></tr>;
export function VentasPage({ tipoVenta, puedeCrear, puedeEmitirNotas = false, puedeAnular = false, puedeAplicarGarantia = false }: { tipoVenta: TipoVenta; puedeCrear: boolean; puedeEmitirNotas?: boolean; puedeAnular?: boolean; puedeAplicarGarantia?: boolean }) {
  const navegar = useNavigate();
  const imprimirAlEmitir = useImprimirAlEmitir(useAlertas());
  const esMoto = tipoVenta === "MOTOTAXIS";
  const [ventas, setVentas] = useState<VentaListado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaListado | null>(null);
  const [ventaParaGarantia, setVentaParaGarantia] = useState<VentaListado | null>(null);
  const [mensajeGarantia, setMensajeGarantia] = useState("");
  const [revisionGarantias, setRevisionGarantias] = useState(0);
  const [notaPorEditar, setNotaPorEditar] = useState<VentaListado | null>(null);
  const [mensajeEdicion, setMensajeEdicion] = useState("");
  const [fuenteNota, setFuenteNota] = useState<FuenteNota | null>(null);
  const [notas, setNotas] = useState<NotaRelacionada[]>([]);
  const [tipoNota, setTipoNota] = useState<"NOTA_CREDITO" | "NOTA_DEBITO">("NOTA_CREDITO");
  const [notaPorIniciar, setNotaPorIniciar] = useState<{ venta: VentaListado; tipo: typeof tipoNota } | null>(null);
  const [ajustesNota, setAjustesNota] = useState<Record<string, string>>({});
  const [cuentaNotaId, setCuentaNotaId] = useState("");
  const [medioNota, setMedioNota] = useState("");
  const [cargandoFuente, setCargandoFuente] = useState(false);
  const [observacionNota, setObservacionNota] = useState("");
  const [errorNota, setErrorNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [notaEmitida, setNotaEmitida] = useState("");
  const [revisionNotas, setRevisionNotas] = useState(0);
  const [documentoAnulacion, setDocumentoAnulacion] = useState<DocumentoAnulacion | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [confirmoNoEntregado, setConfirmoNoEntregado] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState("");
  const [guardandoAnulacion, setGuardandoAnulacion] = useState(false);
  const [ventaRechazada, setVentaRechazada] = useState<VentaListado | null>(null);
  const [guardandoReintento, setGuardandoReintento] = useState(false);
  const [consultandoRechazo, setConsultandoRechazo] = useState(false);
  const [errorReintento, setErrorReintento] = useState("");
  const [mensajeReintento, setMensajeReintento] = useState("");

  useEffect(() => {
    let vigente = true;
    const temporizador = window.setTimeout(() => {
      setCargando(true);
      void servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo).then((resultado) => {
        if (!vigente) return;
        setVentas(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      }).catch((problema: unknown) => {
        if (!vigente) return;
        if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
        setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar las ventas." : problema instanceof Error ? problema.message : "No se pudo cargar el listado de ventas.");
      }).finally(() => { if (vigente) setCargando(false); });
    }, busqueda ? 220 : 0);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo, navegar, revisionGarantias]);

  const pendientes = ventas.filter(pendienteSunat).length;
  useActualizacionPendientes({
    activo: pendientes > 0 && !cargando,
    clave: JSON.stringify([tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo, revisionGarantias]),
    consultar: () => servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo),
    aplicar: (resultado) => { setVentas(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); },
  });

  useEffect(() => {
    if (!ventaSeleccionada) return;
    let vigente = true;
    setCargandoFuente(true);
    void Promise.all([servicioIngresos.listarNotas(ventaSeleccionada.id), servicioIngresos.fuenteNota(ventaSeleccionada.id)]).then(([items, fuente]) => {
      if (!vigente) return;
      setNotas(items); setFuenteNota(fuente);
    }).catch((problema: unknown) => {
      if (vigente) setErrorNota((actual) => actual || (problema instanceof Error ? problema.message : "No se pudo cargar el comprobante y sus notas."));
    }).finally(() => { if (vigente) setCargandoFuente(false); });
    return () => { vigente = false; };
  }, [ventaSeleccionada, revisionNotas]);

  const totalAjuste = Object.values(ajustesNota).reduce((total, importe) => total + (Number(importe) > 0 ? Number(importe) : 0), 0);

  const abrirNota = (venta: VentaListado, tipo: "NOTA_CREDITO" | "NOTA_DEBITO") => {
    if (!puedeEmitirNotas) return;
    setVentaSeleccionada(venta); setTipoNota(tipo); setFuenteNota(null); setAjustesNota({}); setCuentaNotaId(""); setMedioNota(""); setErrorNota(""); setNotas([]); setObservacionNota("");
    setNotaEmitida("");
    setCargandoFuente(true);
  };

  const abrirAnulacion = (documento: DocumentoAnulacion) => { setDocumentoAnulacion(documento); setMotivoAnulacion(""); setConfirmoNoEntregado(false); setErrorAnulacion(""); };
  const abrirEstadoComprobante = (venta: VentaListado) => { setVentaRechazada(venta); setErrorReintento(""); setMensajeReintento(""); };
  const procesarConsultaRechazo = async () => {
    if (!ventaRechazada) return;
    setConsultandoRechazo(true); setErrorReintento("");
    try {
      const resultado = await servicioIngresos.consultarEstadoComprobante(ventaRechazada.id);
      const actualizado = await servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo);
      setVentas(actualizado.items); setTotal(actualizado.total); setTotalPaginas(actualizado.totalPaginas);
      const ventaActualizada = actualizado.items.find((item) => item.id === ventaRechazada.id);
      if (resultado.estadoProveedor === "ACEPTADO_SUNAT") {
        setVentaRechazada(null);
        setMensajeReintento(`NubeFact confirmó que ${ventaRechazada.codigoComprobante} fue aceptado por SUNAT.`);
      } else {
        if (ventaActualizada && ["RECHAZADO_SUNAT", "PENDIENTE_CONFIRMACION", "EN_PROCESO"].includes(ventaActualizada.estadoProveedor)) {
          setVentaRechazada({ ...ventaActualizada, detalleProveedor: resultado.detalleProveedor || ventaActualizada.detalleProveedor });
          setErrorReintento(["ERROR_SUNAT", "ERROR_NUBEFACT", "ERROR_EMISION"].includes(resultado.estadoProveedor)
            ? resultado.detalleProveedor || "NubeFact no pudo confirmar el estado del comprobante."
            : "");
        } else {
          setErrorReintento(resultado.detalleProveedor || "NubeFact no confirmó un estado final. El estado previo se conserva; consulta nuevamente antes de volver a enviar.");
        }
      }
    } catch (problema) {
      setErrorReintento(problema instanceof Error ? problema.message : "No se pudo consultar el comprobante en NubeFact.");
    } finally { setConsultandoRechazo(false); }
  };
  const procesarReintento = async () => {
    if (!ventaRechazada) return;
    setGuardandoReintento(true); setErrorReintento("");
    try {
      const resultado = await servicioIngresos.reintentarEmision(ventaRechazada.id);
      const actualizado = await servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo);
      setVentas(actualizado.items); setTotal(actualizado.total); setTotalPaginas(actualizado.totalPaginas);
      const ventaActualizada = actualizado.items.find((item) => item.id === ventaRechazada.id);
      if (ventaActualizada?.estadoProveedor === "RECHAZADO_SUNAT") {
        setVentaRechazada(ventaActualizada);
        setErrorReintento(ventaActualizada.detalleProveedor || resultado.mensaje || "SUNAT volvió a rechazar el comprobante. Revisa el motivo antes de otro intento.");
      } else if (resultado.estado === "PENDIENTE") {
        setVentaRechazada(null);
        setMensajeReintento(`La emisión de ${ventaRechazada.codigoComprobante} quedó pendiente de confirmación. Consulta el estado en el listado antes de volver a enviar.`);
      } else {
        setVentaRechazada(null);
        setMensajeReintento(resultado.estado === "EMITIDO" ? `El nuevo comprobante ${resultado.codigo ?? ""} fue aceptado por SUNAT.` : resultado.mensaje || "La emisión no se confirmó. Revisa el estado y el motivo en el listado.");
      }
    } catch (problema) {
      setErrorReintento(problema instanceof Error ? problema.message : "No se pudo reintentar la emisión.");
    } finally { setGuardandoReintento(false); }
  };
  const procesarAnulacion = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!documentoAnulacion) return;
    setGuardandoAnulacion(true); setErrorAnulacion("");
    try {
      const resultado = documentoAnulacion.interna
        ? await servicioIngresos.anularNotaVenta(documentoAnulacion.ingresoId, motivoAnulacion)
        : documentoAnulacion.pendiente
        ? documentoAnulacion.esNota ? await servicioIngresos.consultarAnulacionNota(documentoAnulacion.ingresoId, documentoAnulacion.documentoId) : await servicioIngresos.consultarAnulacionIngreso(documentoAnulacion.ingresoId)
        : documentoAnulacion.esNota ? await servicioIngresos.anularNota(documentoAnulacion.ingresoId, documentoAnulacion.documentoId, motivoAnulacion, confirmoNoEntregado) : await servicioIngresos.anularIngreso(documentoAnulacion.ingresoId, motivoAnulacion, confirmoNoEntregado);
      setDocumentoAnulacion({ ...documentoAnulacion, pendiente: resultado.estado === "ANULACION_PENDIENTE" });
      setErrorAnulacion(resultado.estado === "ANULADO" ? documentoAnulacion.interna ? "La nota de venta fue anulada: se revirtieron sus cobros y el inventario." : "La baja fue aceptada por SUNAT." : resultado.estado === "ANULACION_PENDIENTE" ? resultado.mensaje || "La comunicación sigue pendiente de respuesta de SUNAT. Consulta nuevamente más tarde." : resultado.detalle || "NubeFact rechazó la comunicación de baja.");
      const actualizado = await servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda, tipoDocumento, medioPago, estadoFiltro, soloConSaldo);
      setVentas(actualizado.items);
      if (documentoAnulacion.esNota) {
        setFuenteNota(null);
        setCargandoFuente(true);
        setRevisionNotas((actual) => actual + 1);
      }
    } catch (problema) { setErrorAnulacion(problema instanceof Error ? problema.message : "No se pudo comunicar la baja del documento."); }
    finally { setGuardandoAnulacion(false); }
  };

  const emitirNota = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!puedeEmitirNotas || !ventaSeleccionada || !fuenteNota || cargandoFuente || guardandoNota) return;
    const lineas = Object.entries(ajustesNota).filter(([, monto]) => Number(monto) > 0).map(([detalleId, monto]) => ({ detalleId, monto }));
    if (!lineas.length) { setErrorNota("Ingresa el importe de al menos una línea para emitir la nota."); return; }
    if (!cuentaNotaId) { setErrorNota(tipoNota === "NOTA_CREDITO" ? "Selecciona la cuenta de donde saldrá la devolución." : "Selecciona la cuenta donde ingresará la diferencia."); return; }
    const venta = ventaSeleccionada;
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    setGuardandoNota(true); setErrorNota(""); setNotaEmitida("");
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { setErrorNota(mensajeErrorImpresion(problema)); setGuardandoNota(false); return; }
      try {
        const resultado = await servicioIngresos.emitirNota(venta.id, { tipo: tipoNota, lineas, cuentaFinancieraId: cuentaNotaId, medioPago: medioNota, observacion: observacionNota });
        setNotaEmitida(resultado.codigoComprobante);
        setAjustesNota({}); setObservacionNota("");
        if (resultado.estado === "EMITIDO") void imprimirAlEmitir.imprimir(documentoDeIngreso({ ingresoId: venta.id, notaId: resultado.id }), preparada);
      } catch (problema) { setErrorNota(problema instanceof Error ? problema.message : "No se pudo emitir la nota."); }
      finally {
        setFuenteNota(null);
        setCargandoFuente(true);
        setRevisionNotas((actual) => actual + 1);
        setGuardandoNota(false);
      }
    })();
  };

  const dialogos = <>
    {notaPorIniciar && puedeEmitirNotas && <DialogoInicioNota
      venta={notaPorIniciar.venta} tipo={notaPorIniciar.tipo}
      onCancelar={() => setNotaPorIniciar(null)}
      onContinuar={() => {
        abrirNota(notaPorIniciar.venta, notaPorIniciar.tipo);
        setNotaPorIniciar(null);
      }}
    />}
    {documentoAnulacion && <DialogoAnulacion
      documento={documentoAnulacion} motivo={motivoAnulacion} confirmado={confirmoNoEntregado} error={errorAnulacion} guardando={guardandoAnulacion}
      onClose={() => setDocumentoAnulacion(null)} onMotivo={setMotivoAnulacion} onConfirmar={setConfirmoNoEntregado} onSubmit={procesarAnulacion}
    />}
  </>;

  // Los formularios de documentos se devuelven sin contenedor: así toman los márgenes y el scroll propio de `.os-editor`.
  if (ventaSeleccionada && puedeEmitirNotas) return <>
    <NotaAjusteFormulario
      venta={ventaSeleccionada} fuente={fuenteNota} notas={notas} tipo={tipoNota} ajustes={ajustesNota}
      totalAjuste={totalAjuste} cargando={cargandoFuente} error={errorNota} guardando={guardandoNota} observacion={observacionNota} cuentaFinancieraId={cuentaNotaId} medioPago={medioNota}
      emitida={notaEmitida} onRecargar={() => { setErrorNota(""); setCargandoFuente(true); setRevisionNotas((actual) => actual + 1); }}
      puedeAnular={puedeAnular} onCancelar={() => setVentaSeleccionada(null)} onCerrarError={() => setErrorNota("")}
      onAmount={(id, monto) => setAjustesNota((actual) => ({ ...actual, [id]: monto }))}
      onAccount={(cuentaId, medio) => { setCuentaNotaId(cuentaId); setMedioNota(medio); }}
      onObservation={setObservacionNota} onSubmit={emitirNota} onAnular={abrirAnulacion}
    />
    {dialogos}
  </>;
  if (notaPorEditar && puedeCrear) return <EditorNotaVenta ingresoId={notaPorEditar.id} codigo={notaPorEditar.codigoComprobante} esMototaxi={esMoto} onCerrar={() => setNotaPorEditar(null)}
    onGuardada={(mensaje) => { setNotaPorEditar(null); setMensajeEdicion(mensaje); setRevisionGarantias((n) => n + 1); }} />;

  return <section className={ventasClasses.page}>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta={esMoto ? "Crear venta de mototaxi" : "Crear venta de repuestos"} onClick={() => navegar(esMoto ? "/ingresos/nuevo/mototaxis" : "/ingresos/nuevo/repuestos")} />}
    {mensajeReintento && <NotificacionFlotante tipo={mensajeReintento.toLocaleLowerCase("es-PE").includes("pendiente") ? "advertencia" : "exito"} mensaje={mensajeReintento} onCerrar={() => setMensajeReintento("")} />}
    <div className={ventasClasses.toolbar}>
      <label className={`${ventasClasses.search} listado-maestro-busqueda-icono`}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg><input type="search" value={busqueda} placeholder="Buscar por código, cliente o artículo" aria-label="Buscar ventas" onChange={(evento) => { setPagina(1); setBusqueda(evento.target.value); }} /></label>
      <label className={ventasClasses.selectField}><select aria-label="Tipo de documento" value={tipoDocumento} onChange={(evento) => { setPagina(1); setTipoDocumento(evento.target.value); }}><option value="">Todos los documentos</option><option value="BOLETA">Boleta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta</option></select><ChevronDown aria-hidden="true" /></label>
    </div>
    <ListadoMaestro
      variante="tabla"
      titulo={`Historial de ventas de ${esMoto ? "mototaxis" : "repuestos"}`}
      registros={ventas}
      cargando={cargando}
      error={error}
      vacio={<div className={ventasClasses.empty}><strong>No hay ventas para mostrar</strong><span>Prueba con otra búsqueda o con otro tipo de documento.</span></div>}
      claseCabecera={ventasClasses.header}
      centrarCeldas={false}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      encabezadoTabla={encabezadoVentas}
      renderizarFila={(venta) => <VentaRow key={venta.id} venta={venta} onEditarNota={puedeCrear ? setNotaPorEditar : undefined} puedeEmitirNotas={puedeEmitirNotas} puedeAnular={puedeAnular} onConsultarEstado={abrirEstadoComprobante} onEmitirNota={(venta, tipo) => setNotaPorIniciar({ venta, tipo })} onAnular={abrirAnulacion} onAplicarGarantia={esMoto && puedeAplicarGarantia ? setVentaParaGarantia : undefined} />}
      claseTabla={ventasClasses.table}
      claseContenedor={ventasClasses.tableScroll}
    />
    <p className="sr-only" role="status">{pendientes > 0 ? `${pendientes} ${pendientes === 1 ? "documento pendiente" : "documentos pendientes"} de confirmación de SUNAT. El listado se actualiza automáticamente.` : ""}</p>
    {ventaRechazada && <DialogoRechazo venta={ventaRechazada} error={errorReintento} guardando={guardandoReintento} consultando={consultandoRechazo} puedeCrear={puedeCrear} onClose={() => setVentaRechazada(null)} onConsultar={() => void procesarConsultaRechazo()} onReintentar={() => void procesarReintento()} />}
    {mensajeGarantia && <NotificacionFlotante tipo="exito" mensaje={mensajeGarantia} onCerrar={() => setMensajeGarantia("")} />}
    {mensajeEdicion && <NotificacionFlotante tipo="exito" mensaje={mensajeEdicion} onCerrar={() => setMensajeEdicion("")} />}
    {ventaParaGarantia && <AplicarGarantiaVentaDialog venta={ventaParaGarantia} onClose={() => setVentaParaGarantia(null)} onApplied={() => { setMensajeGarantia(`Garantía aplicada a ${ventaParaGarantia.codigoComprobante}.`); setRevisionGarantias((n) => n + 1); }} />}
    {dialogos}
  </section>;
}
