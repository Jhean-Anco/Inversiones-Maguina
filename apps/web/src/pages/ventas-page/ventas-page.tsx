import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type EstadoFiltroVenta, type FuenteNota, type NotaRelacionada, type VentaListado } from "../../services/ingresos.service";
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
import { DialogoEditarNotaVenta } from "./dialogo-editar-nota-venta";

type TipoVenta = "REPUESTOS" | "MOTOTAXIS";
const encabezadoVentas = <tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th className="!text-right">Total</th><th>Estado SUNAT</th><th className="!text-right">Acciones</th></tr>;
export function VentasPage({ tipoVenta, puedeCrear, puedeEmitirNotas = false, puedeAnular = false, puedeAplicarGarantia = false }: { tipoVenta: TipoVenta; puedeCrear: boolean; puedeEmitirNotas?: boolean; puedeAnular?: boolean; puedeAplicarGarantia?: boolean }) {
  const navegar = useNavigate();
  const esMoto = tipoVenta === "MOTOTAXIS";
  const [ventas, setVentas] = useState<VentaListado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltroVenta>("TODAS");
  const [soloConSaldo, setSoloConSaldo] = useState(false);
  const [conteos, setConteos] = useState<{ todas: number; emitidas: number; pendientes: number; rechazadas: number; anuladas: number; conSaldo?: number } | null>(null);
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
        setVentas(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setConteos(resultado.conteos ?? null); setError("");
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
    aplicar: (resultado) => { setVentas(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setConteos(resultado.conteos ?? null); },
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
      setVentas(actualizado.items); setTotal(actualizado.total); setTotalPaginas(actualizado.totalPaginas); setConteos(actualizado.conteos ?? null);
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
      setVentas(actualizado.items); setTotal(actualizado.total); setTotalPaginas(actualizado.totalPaginas); setConteos(actualizado.conteos ?? null);
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
      setVentas(actualizado.items); setConteos(actualizado.conteos ?? null);
      if (documentoAnulacion.esNota) {
        setFuenteNota(null);
        setCargandoFuente(true);
        setRevisionNotas((actual) => actual + 1);
      }
    } catch (problema) { setErrorAnulacion(problema instanceof Error ? problema.message : "No se pudo comunicar la baja del documento."); }
    finally { setGuardandoAnulacion(false); }
  };

  const emitirNota = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!puedeEmitirNotas || !ventaSeleccionada || !fuenteNota || cargandoFuente || guardandoNota) return;
    const lineas = Object.entries(ajustesNota).filter(([, monto]) => Number(monto) > 0).map(([detalleId, monto]) => ({ detalleId, monto }));
    if (!lineas.length) { setErrorNota("Ingresa el importe de al menos una línea para emitir la nota."); return; }
    if (!cuentaNotaId) { setErrorNota(tipoNota === "NOTA_CREDITO" ? "Selecciona la cuenta de donde saldrá la devolución." : "Selecciona la cuenta donde ingresará la diferencia."); return; }
    setGuardandoNota(true); setErrorNota(""); setNotaEmitida("");
    try {
      const resultado = await servicioIngresos.emitirNota(ventaSeleccionada.id, { tipo: tipoNota, lineas, cuentaFinancieraId: cuentaNotaId, medioPago: medioNota, observacion: observacionNota });
      setNotaEmitida(resultado.codigoComprobante);
      setAjustesNota({}); setObservacionNota("");
    } catch (problema) { setErrorNota(problema instanceof Error ? problema.message : "No se pudo emitir la nota."); }
    finally {
      setFuenteNota(null);
      setCargandoFuente(true);
      setRevisionNotas((actual) => actual + 1);
      setGuardandoNota(false);
    }
  };

  return <section className={ventasClasses.page}>
    {!ventaSeleccionada && <>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta={esMoto ? "Crear venta de mototaxi" : "Crear venta de repuestos"} onClick={() => navegar(esMoto ? "/ingresos/nuevo/mototaxis" : "/ingresos/nuevo/repuestos")} />}
    {mensajeReintento && <NotificacionFlotante tipo={mensajeReintento.toLocaleLowerCase("es-PE").includes("pendiente") ? "advertencia" : "exito"} mensaje={mensajeReintento} onCerrar={() => setMensajeReintento("")} />}
    <ListadoMaestro
      variante="tabla"
      titulo={`Historial de ventas de ${esMoto ? "mototaxis" : "repuestos"}`}
      registros={ventas}
      cargando={cargando}
      error={error}
      vacio={<div className={ventasClasses.empty}><strong>No hay ventas para mostrar</strong></div>}
      claseCabecera={ventasClasses.header}
      claseControlesCabecera={ventasClasses.controls}
      controlesCabecera={<>
        <label className={`${ventasClasses.search} listado-maestro-busqueda-icono`}><svg className={ventasClasses.searchIcon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg><input className={ventasClasses.searchInput} type="search" value={busqueda} placeholder="Buscar por código, cliente o artículo" aria-label="Buscar ventas" onChange={(evento) => { setPagina(1); setBusqueda(evento.target.value); }} /></label>
        <label className="grid min-w-[150px] flex-1 gap-1 text-[10px] font-bold uppercase tracking-[.06em] text-[#687e96]">Tipo de documento<select className="h-11 rounded-xl border border-[#d8e3ee] bg-white px-3 text-[13px] font-medium normal-case tracking-normal text-[#173554]" value={tipoDocumento} onChange={(evento) => { setPagina(1); setTipoDocumento(evento.target.value); }}><option value="">Todos los documentos</option><option value="BOLETA">Boleta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta</option></select></label>
        <label className="grid min-w-[150px] flex-1 gap-1 text-[10px] font-bold uppercase tracking-[.06em] text-[#687e96]">Medio de pago<select className="h-11 rounded-xl border border-[#d8e3ee] bg-white px-3 text-[13px] font-medium normal-case tracking-normal text-[#173554]" value={medioPago} onChange={(evento) => { setPagina(1); setMedioPago(evento.target.value); }}><option value="">Todos los medios</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="BILLETERA_DIGITAL">Billetera digital</option><option value="OTRO">Otro</option></select></label>
        {conteos && <div className="hidden w-full grid-cols-5 gap-2 mobile-portrait:grid mobile-landscape:grid mobile-portrait:grid-cols-3 mobile-landscape:grid-cols-3" role="group" aria-label="Filtrar ventas móvil">
          {([
            ["TODAS", "Todas", conteos.todas], ["PENDIENTES", "Pendientes", conteos.pendientes], ["CON_SALDO", "Con saldo", conteos.conSaldo ?? 0],
          ] as const).map(([estado, etiqueta, cantidad]) => {
            const activo = estado === "CON_SALDO" ? soloConSaldo : !soloConSaldo && estadoFiltro === estado;
            return <button key={estado} type="button" aria-pressed={activo}
              className={`flex min-h-[52px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${activo ? "border-[#8eb0cf] bg-[#edf5fc] text-[#174f7c]" : "border-[#e1e8ef] bg-white text-[#52697d] hover:bg-[#f6f9fc]"}`}
              onClick={() => { setPagina(1); if (estado === "CON_SALDO") { setSoloConSaldo(true); setEstadoFiltro("TODAS"); } else { setSoloConSaldo(false); setEstadoFiltro(estado); } }}>
              <span className="text-xs font-semibold">{etiqueta}</span><strong className="text-lg tabular-nums">{cantidad.toLocaleString("es-PE")}</strong></button>;
          })}
        </div>}
        {conteos && <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5 mobile-portrait:hidden mobile-landscape:hidden" role="group" aria-label="Filtrar ventas por estado">
          {([
            ["TODAS", "Todas", conteos.todas], ["EMITIDAS", "Emitidas", conteos.emitidas], ["PENDIENTES", "Pendientes", conteos.pendientes],
            ["RECHAZADAS", "Rechazadas", conteos.rechazadas], ["ANULADAS", "Anuladas", conteos.anuladas],
          ] as const).map(([estado, etiqueta, cantidad]) => <button key={estado} type="button" aria-pressed={!soloConSaldo && estadoFiltro === estado}
            className={`flex min-h-[52px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${!soloConSaldo && estadoFiltro === estado ? "border-[#8eb0cf] bg-[#edf5fc] text-[#174f7c]" : "border-[#e1e8ef] bg-white text-[#52697d] hover:bg-[#f6f9fc]"}`}
            onClick={() => { setPagina(1); setSoloConSaldo(false); setEstadoFiltro(estado); }}><span className="text-xs font-semibold">{etiqueta}</span><strong className="text-lg tabular-nums">{cantidad.toLocaleString("es-PE")}</strong></button>)}
        </div>}
      </>}
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
    {notaPorEditar && puedeCrear && <DialogoEditarNotaVenta ingresoId={notaPorEditar.id} codigo={notaPorEditar.codigoComprobante} esMototaxi={esMoto} onCerrar={() => setNotaPorEditar(null)}
      onGuardada={(mensaje) => { setNotaPorEditar(null); setMensajeEdicion(mensaje); setRevisionGarantias((n) => n + 1); }} />}
    {ventaParaGarantia && <AplicarGarantiaVentaDialog venta={ventaParaGarantia} onClose={() => setVentaParaGarantia(null)} onApplied={() => { setMensajeGarantia(`Garantía aplicada a ${ventaParaGarantia.codigoComprobante}.`); setRevisionGarantias((n) => n + 1); }} />}
    </>}
    {notaPorIniciar && puedeEmitirNotas && <DialogoInicioNota
      venta={notaPorIniciar.venta} tipo={notaPorIniciar.tipo}
      onCancelar={() => setNotaPorIniciar(null)}
      onContinuar={() => {
        abrirNota(notaPorIniciar.venta, notaPorIniciar.tipo);
        setNotaPorIniciar(null);
      }}
    />}
    {ventaSeleccionada && puedeEmitirNotas && <NotaAjusteFormulario
      venta={ventaSeleccionada} fuente={fuenteNota} notas={notas} tipo={tipoNota} ajustes={ajustesNota}
      totalAjuste={totalAjuste} cargando={cargandoFuente} error={errorNota} guardando={guardandoNota} observacion={observacionNota} cuentaFinancieraId={cuentaNotaId} medioPago={medioNota}
      emitida={notaEmitida} onRecargar={() => { setErrorNota(""); setCargandoFuente(true); setRevisionNotas((actual) => actual + 1); }}
      puedeAnular={puedeAnular} onCancelar={() => setVentaSeleccionada(null)}
      onAmount={(id, monto) => setAjustesNota((actual) => ({ ...actual, [id]: monto }))}
      onAccount={(cuentaId, medio) => { setCuentaNotaId(cuentaId); setMedioNota(medio); }}
      onObservation={setObservacionNota} onSubmit={emitirNota} onAnular={abrirAnulacion}
    />}
    {documentoAnulacion && <DialogoAnulacion
      documento={documentoAnulacion} motivo={motivoAnulacion} confirmado={confirmoNoEntregado} error={errorAnulacion} guardando={guardandoAnulacion}
      onClose={() => setDocumentoAnulacion(null)} onMotivo={setMotivoAnulacion} onConfirmar={setConfirmoNoEntregado} onSubmit={procesarAnulacion}
    />}
  </section>;
}
