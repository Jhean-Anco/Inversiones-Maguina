import "./ventas-page.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { Ban, FileCheck, FileCode, MessageCircle, Printer } from "lucide-react";
import { ErrorApi, urlApi } from "../../services/api-cliente";
import { servicioIngresos, type FuenteNota, type NotaRelacionada, type VentaListado } from "../../services/ingresos.service";

type TipoVenta = "REPUESTOS" | "MOTOTAXIS";
const soles = (valor: string) => "S/ " + Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (valor: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(valor.slice(0, 10) + "T00:00:00Z"));
const comprobante = (tipo: VentaListado["tipoComprobante"]) => ({ BOLETA: "Boleta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" })[tipo];
const etiquetasEstado: Record<string, string> = {
  ACEPTADO_SUNAT: "Aceptado por SUNAT",
  RECHAZADO_SUNAT: "Rechazado por SUNAT",
  ANULADO: "Anulado por SUNAT",
  ANULACION_PENDIENTE: "Baja pendiente de SUNAT",
  BAJA_RECHAZADA: "Baja rechazada por SUNAT",
  ERROR_SUNAT: "Error de SUNAT",
  ERROR_NUBEFACT: "Error de NubeFact",
  EN_PROCESO: "En proceso",
  PENDIENTE_CONFIRMACION: "Pendiente de confirmación",
  ERROR_EMISION: "Error de emisión",
  EMITIDO: "Emitido",
  REGISTRADO: "Registrado",
  NUBEFACT_PENDIENTE: "Pendiente de confirmación",
};
const estado = (valor: string, estadoProveedor?: string) => etiquetasEstado[estadoProveedor ?? ""] ?? etiquetasEstado[valor] ?? valor.replaceAll("_", " ").toLocaleLowerCase("es-PE");
const medioPago = (valor: string) => valor.replaceAll("_", " ").toLocaleLowerCase("es-PE").replace(/^\p{L}/u, (letra) => letra.toLocaleUpperCase("es-PE"));
const enlaceDocumento = (ruta: string) => ruta.startsWith("/") ? urlApi(ruta) : ruta;
const enlaces = (pdf: string | null, xml: string | null, cdr: string | null, codigo: string, whatsapp = true) => <span className="ventas-actions">
  {pdf && <a href={enlaceDocumento(pdf)} target="_blank" rel="noreferrer" title={`Abrir o imprimir documento ${codigo}`} aria-label={`Abrir o imprimir documento ${codigo}`}><Printer aria-hidden="true" size={16}/></a>}
  {xml && <a href={enlaceDocumento(xml)} target="_blank" rel="noreferrer" title={`Descargar XML ${codigo}`} aria-label={`Descargar XML ${codigo}`}><FileCode aria-hidden="true" size={16}/></a>}
  {cdr && <a href={enlaceDocumento(cdr)} target="_blank" rel="noreferrer" title={`Ver CDR de SUNAT ${codigo}`} aria-label={`Ver constancia de recepción SUNAT ${codigo}`}><FileCheck aria-hidden="true" size={16}/></a>}
  {pdf && whatsapp && !pdf.startsWith("/") && <a href={`https://wa.me/?text=${encodeURIComponent(`Te comparto el comprobante ${codigo}: ${enlaceDocumento(pdf)}`)}`} target="_blank" rel="noreferrer" title={`Compartir ${codigo} por WhatsApp`} aria-label={`Compartir ${codigo} por WhatsApp`}><MessageCircle aria-hidden="true" size={16}/></a>}
</span>;

const encabezadoVentas = <tr><th>Fecha</th><th>Tipo</th><th>Nro. de documento</th><th>Cliente</th><th>Pago</th><th className="ventas-number">Total</th><th>Estado</th><th>Archivos y acciones</th></tr>;
type DocumentoAnulacion = { ingresoId: string; documentoId: string; codigo: string; tipo: string; esNota: boolean; pendiente: boolean };
export function VentasPage({ tipoVenta, puedeCrear, puedeEmitirNotas = false, puedeAnular = false }: { tipoVenta: TipoVenta; puedeCrear: boolean; puedeEmitirNotas?: boolean; puedeAnular?: boolean }) {
  const navegar = useNavigate();
  const esMoto = tipoVenta === "MOTOTAXIS";
  const [ventas, setVentas] = useState<VentaListado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaListado | null>(null);
  const [fuenteNota, setFuenteNota] = useState<FuenteNota | null>(null);
  const [notas, setNotas] = useState<NotaRelacionada[]>([]);
  const [tipoNota, setTipoNota] = useState<"NOTA_CREDITO" | "NOTA_DEBITO">("NOTA_CREDITO");
  const [lineasSeleccionadas, setLineasSeleccionadas] = useState<Record<string, boolean>>({});
  const [ajustesNota, setAjustesNota] = useState<Record<string, string>>({});
  const [cargandoFuente, setCargandoFuente] = useState(false);
  const [observacionNota, setObservacionNota] = useState("");
  const [errorNota, setErrorNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [documentoAnulacion, setDocumentoAnulacion] = useState<DocumentoAnulacion | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [confirmoNoEntregado, setConfirmoNoEntregado] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState("");
  const [guardandoAnulacion, setGuardandoAnulacion] = useState(false);

  useEffect(() => {
    let vigente = true;
    const temporizador = window.setTimeout(() => {
      setCargando(true);
      void servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda).then((resultado) => {
        if (!vigente) return;
        setVentas(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      }).catch((problema: unknown) => {
        if (!vigente) return;
        if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
        setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar las ventas." : problema instanceof Error ? problema.message : "No se pudo cargar el listado de ventas.");
      }).finally(() => { if (vigente) setCargando(false); });
    }, busqueda ? 220 : 0);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [tipoVenta, pagina, porPagina, busqueda, navegar]);

  useEffect(() => {
    if (!ventaSeleccionada) return;
    let vigente = true;
    setCargandoFuente(true);
    void Promise.all([servicioIngresos.listarNotas(ventaSeleccionada.id), servicioIngresos.fuenteNota(ventaSeleccionada.id)]).then(([items, fuente]) => {
      if (!vigente) return;
      setNotas(items); setFuenteNota(fuente);
    }).catch((problema: unknown) => {
      if (vigente) setErrorNota(problema instanceof Error ? problema.message : "No se pudo cargar el historial de notas.");
    }).finally(() => { if (vigente) setCargandoFuente(false); });
    return () => { vigente = false; };
  }, [ventaSeleccionada]);

  const totalAjuste = Object.entries(lineasSeleccionadas).reduce((total, [id, seleccionada]) => total + (seleccionada ? Number(ajustesNota[id] ?? 0) || 0 : 0), 0);

  const abrirNota = (venta: VentaListado, tipo: "NOTA_CREDITO" | "NOTA_DEBITO") => {
    setVentaSeleccionada(venta); setTipoNota(tipo); setFuenteNota(null); setLineasSeleccionadas({}); setAjustesNota({}); setErrorNota(""); setNotas([]); setObservacionNota("");
  };

  const abrirAnulacion = (documento: DocumentoAnulacion) => { setDocumentoAnulacion(documento); setMotivoAnulacion(""); setConfirmoNoEntregado(false); setErrorAnulacion(""); };
  const procesarAnulacion = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!documentoAnulacion) return;
    setGuardandoAnulacion(true); setErrorAnulacion("");
    try {
      const resultado = documentoAnulacion.pendiente
        ? documentoAnulacion.esNota ? await servicioIngresos.consultarAnulacionNota(documentoAnulacion.ingresoId, documentoAnulacion.documentoId) : await servicioIngresos.consultarAnulacionIngreso(documentoAnulacion.ingresoId)
        : documentoAnulacion.esNota ? await servicioIngresos.anularNota(documentoAnulacion.ingresoId, documentoAnulacion.documentoId, motivoAnulacion, confirmoNoEntregado) : await servicioIngresos.anularIngreso(documentoAnulacion.ingresoId, motivoAnulacion, confirmoNoEntregado);
      setDocumentoAnulacion({ ...documentoAnulacion, pendiente: resultado.estado === "ANULACION_PENDIENTE" });
      setErrorAnulacion(resultado.estado === "ANULADO" ? "La baja fue aceptada por SUNAT." : resultado.estado === "ANULACION_PENDIENTE" ? resultado.mensaje || "La comunicación sigue pendiente de respuesta de SUNAT. Consulta nuevamente más tarde." : resultado.detalle || "NubeFact rechazó la comunicación de baja.");
      const actualizado = await servicioIngresos.listarVentas(tipoVenta, pagina, porPagina, busqueda);
      setVentas(actualizado.items);
      if (documentoAnulacion.esNota) setNotas(await servicioIngresos.listarNotas(documentoAnulacion.ingresoId));
    } catch (problema) { setErrorAnulacion(problema instanceof Error ? problema.message : "No se pudo comunicar la baja del documento."); }
    finally { setGuardandoAnulacion(false); }
  };

  const emitirNota = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!ventaSeleccionada) return;
    const lineas = Object.entries(lineasSeleccionadas).filter(([, seleccionada]) => seleccionada).map(([detalleId]) => ({ detalleId, monto: ajustesNota[detalleId] ?? "" }));
    if (!lineas.length || lineas.some((linea) => !linea.monto || Number(linea.monto) <= 0)) { setErrorNota("Selecciona los productos que modificarás e indica el ajuste de cada uno."); return; }
    setGuardandoNota(true); setErrorNota("");
    try {
      await servicioIngresos.emitirNota(ventaSeleccionada.id, { tipo: tipoNota, lineas, observacion: observacionNota });
      setNotas(await servicioIngresos.listarNotas(ventaSeleccionada.id));
      setFuenteNota(await servicioIngresos.fuenteNota(ventaSeleccionada.id));
      setLineasSeleccionadas({}); setAjustesNota({}); setObservacionNota("");
    } catch (problema) { setErrorNota(problema instanceof Error ? problema.message : "No se pudo emitir la nota."); }
    finally { setGuardandoNota(false); }
  };

  const renderizarVenta = (venta: VentaListado) => <tr key={venta.id}><td className="ventas-date">{fecha(venta.fecha)}</td><td>{comprobante(venta.tipoComprobante)}</td><td><strong className="ventas-document-code" title={venta.codigoComprobante}>{venta.codigoComprobante}</strong></td><td><strong className="ventas-client-name">{venta.clienteNombre || "Cliente no especificado"}</strong>{venta.clienteNumeroDocumento && <small className="ventas-client-document">{venta.clienteNumeroDocumento}</small>}</td><td><span>{medioPago(venta.medioPago)}</span><small className="ventas-payment-condition">{venta.condicionPago === "CREDITO" ? "Crédito" : "Contado"}</small></td><td className="ventas-number ventas-total">{soles(venta.total)}</td><td><span className={"ventas-state" + (["ERROR_SUNAT", "RECHAZADO_SUNAT", "BAJA_RECHAZADA", "ERROR_NUBEFACT", "ERROR_EMISION"].includes(venta.estadoProveedor) || venta.estado.startsWith("ERROR") ? " is-error" : ["ACEPTADO_SUNAT", "EMITIDO", "ANULADO"].includes(venta.estadoProveedor) || venta.estado.startsWith("EMITIDO") ? " is-success" : "")}>{estado(venta.estado, venta.estadoProveedor)}</span>{venta.detalleProveedor && <small className="ventas-status-detail" title={venta.detalleProveedor}>{venta.detalleProveedor}</small>}</td><td><div className="ventas-row-actions">{enlaces(venta.enlacePdf, venta.enlaceXml, venta.enlaceCdr, venta.codigoComprobante)}{puedeEmitirNotas && venta.estado === "EMITIDO" && venta.tipoComprobante !== "NOTA_VENTA" && <><button type="button" className="ventas-note-action is-credit" title="Emitir nota de crédito" aria-label={`Emitir nota de crédito para ${venta.codigoComprobante}`} onClick={() => abrirNota(venta, "NOTA_CREDITO")}><span aria-hidden="true">NC</span></button><button type="button" className="ventas-note-action is-debit" title="Emitir nota de débito" aria-label={`Emitir nota de débito para ${venta.codigoComprobante}`} onClick={() => abrirNota(venta, "NOTA_DEBITO")}><span aria-hidden="true">ND</span></button></>}{puedeAnular && venta.tipoComprobante !== "NOTA_VENTA" && (venta.estado === "ANULACION_PENDIENTE" ? <button type="button" title="Consultar estado de la baja" aria-label={`Consultar baja de ${venta.codigoComprobante}`} onClick={() => abrirAnulacion({ ingresoId: venta.id, documentoId: venta.id, codigo: venta.codigoComprobante, tipo: comprobante(venta.tipoComprobante), esNota: false, pendiente: true })}><Ban aria-hidden="true" size={16}/></button> : venta.estado === "EMITIDO" && venta.estadoProveedor === "ACEPTADO_SUNAT" && <button type="button" className="ventas-cancel-action" title="Comunicar baja a SUNAT" aria-label={`Anular ${venta.codigoComprobante}`} onClick={() => abrirAnulacion({ ingresoId: venta.id, documentoId: venta.id, codigo: venta.codigoComprobante, tipo: comprobante(venta.tipoComprobante), esNota: false, pendiente: false })}><Ban aria-hidden="true" size={16}/></button>)}</div></td></tr>;

  return <section className="ventas-page">
    {puedeCrear && <RegistrarAccionPrincipal etiqueta={esMoto ? "Crear venta de mototaxi" : "Crear venta de repuestos"} onClick={() => navegar(esMoto ? "/ingresos/nuevo/mototaxis" : "/ingresos/nuevo/repuestos")} />}
    <ListadoMaestro
      variante="tabla"
      titulo={`Historial de ventas de ${esMoto ? "mototaxis" : "repuestos"}`}
      registros={ventas}
      cargando={cargando}
      error={error}
      vacio={<div className="ventas-empty"><strong>No hay ventas para mostrar</strong></div>}
      controlesCabecera={<label className="ventas-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input type="search" value={busqueda} placeholder="Buscar por código, cliente o artículo" aria-label="Buscar ventas" onChange={(evento) => { setPagina(1); setBusqueda(evento.target.value); }} /></label>}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      encabezadoTabla={encabezadoVentas}
      renderizarFila={renderizarVenta}
      claseTabla="ventas-table"
      claseContenedor="ventas-table-scroll"
    />
    {ventaSeleccionada && <div className="ventas-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setVentaSeleccionada(null); }}>
      <section className="ventas-notes-modal" role="dialog" aria-modal="true" aria-labelledby="ventas-notes-title">
        <header><div><span>COMPROBANTE ORIGINAL · {ventaSeleccionada.tipoComprobante === "BOLETA" ? "BOLETA" : "FACTURA"}</span><h2 id="ventas-notes-title">{ventaSeleccionada.codigoComprobante}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setVentaSeleccionada(null)}>×</button></header>
        <div className="ventas-notes-body">
          <div className="ventas-notes-origin"><strong>{ventaSeleccionada.clienteNombre || "Cliente no especificado"}</strong><span>{fuenteNota ? fecha(fuenteNota.fecha) : fecha(ventaSeleccionada.fecha)} · Total original {soles(ventaSeleccionada.total)}</span>{enlaces(ventaSeleccionada.enlacePdf, ventaSeleccionada.enlaceXml, ventaSeleccionada.enlaceCdr, ventaSeleccionada.codigoComprobante)}</div>
          <h3>Productos y servicios del comprobante</h3>
          {cargandoFuente ? <p className="ventas-notes-empty">Cargando detalle del comprobante…</p> : fuenteNota ? <>
            <div className="ventas-note-lines-scroll"><table className="ventas-note-lines"><thead><tr><th>Seleccionar</th><th>Producto o servicio</th><th>Cantidad</th><th>Precio unitario</th><th>Total de línea</th>{tipoNota === "NOTA_CREDITO" && <th>Disponible para descuento</th>}<th>Ajuste (S/)</th></tr></thead><tbody>{fuenteNota.lineas.map((linea) => {
              const seleccionado = Boolean(lineasSeleccionadas[linea.id]);
              const saldo = Number(linea.saldoParaCredito);
              return <tr key={linea.id}>
                <td><input type="checkbox" aria-label={`Seleccionar ${linea.descripcion}`} checked={seleccionado} disabled={tipoNota === "NOTA_CREDITO" && saldo <= 0} onChange={(evento) => setLineasSeleccionadas((actual) => ({ ...actual, [linea.id]: evento.target.checked }))}/></td>
                <td><strong>{linea.descripcion}</strong>{linea.codigo && <small>{linea.codigo}</small>}<small>{linea.tipo === "PRODUCTO" ? "Producto" : linea.tipo === "MOTOTAXI" ? "Mototaxi" : "Servicio"}</small></td>
                <td>{Number(linea.cantidad).toLocaleString("es-PE", { maximumFractionDigits: 3 })}{linea.unidad ? ` ${linea.unidad}` : ""}</td>
                <td>{soles(linea.precioUnitario)}</td><td>{soles(linea.total)}</td>
                {tipoNota === "NOTA_CREDITO" && <td>{soles(linea.saldoParaCredito)}<small className="ventas-note-credit-used">Aplicado: {soles(linea.creditoAplicado)}</small></td>}
                <td><input type="number" min="0.01" max={tipoNota === "NOTA_CREDITO" ? linea.saldoParaCredito : undefined} step="0.01" value={ajustesNota[linea.id] ?? ""} disabled={!seleccionado} required={seleccionado} aria-label={`Monto de ajuste para ${linea.descripcion}`} placeholder="0.00" onChange={(evento) => setAjustesNota((actual) => ({ ...actual, [linea.id]: evento.target.value }))}/></td>
              </tr>;
            })}</tbody></table></div>
            <div className="ventas-note-selection-summary"><span>{Object.values(lineasSeleccionadas).filter(Boolean).length} producto(s) seleccionado(s)</span><strong>Total del ajuste: {soles(String(totalAjuste))}</strong></div>
          </> : <p className="ventas-notes-empty">{errorNota || "No se pudo cargar el detalle del comprobante."}</p>}
          <h3>Notas vinculadas</h3>
          {notas.length ? <ul className="ventas-notes-list">{notas.map((nota) => <li key={nota.id}><div><strong>{nota.tipoComprobante === "NOTA_CREDITO" ? "Nota de credito" : "Nota de debito"} - {nota.codigoComprobante}</strong><span>{nota.motivo} - {soles(nota.total)}</span><small>{nota.estadoAnulacion === "ANULADO" ? "Anulada por SUNAT" : nota.estadoAnulacion === "PENDIENTE" ? "Baja pendiente de SUNAT" : nota.estadoAnulacion === "RECHAZADO" ? "Baja rechazada; el documento sigue vigente" : estado(nota.estado)}</small>{nota.motivoAnulacion && <small>Motivo de baja: {nota.motivoAnulacion}</small>}</div><span className="ventas-row-actions">{enlaces(nota.enlacePdf, nota.enlaceXml, nota.enlaceCdr, nota.codigoComprobante)}{puedeAnular && (nota.estado === "ANULACION_PENDIENTE" ? <button type="button" title="Consultar estado de la baja" aria-label={`Consultar baja de ${nota.codigoComprobante}`} onClick={() => abrirAnulacion({ ingresoId: ventaSeleccionada.id, documentoId: nota.id, codigo: nota.codigoComprobante, tipo: nota.tipoComprobante === "NOTA_CREDITO" ? "Nota de credito" : "Nota de debito", esNota: true, pendiente: true })}><Ban aria-hidden="true" size={16}/></button> : nota.estado === "EMITIDO" && <button type="button" className="ventas-cancel-action" title="Comunicar baja a SUNAT" aria-label={`Anular ${nota.codigoComprobante}`} onClick={() => abrirAnulacion({ ingresoId: ventaSeleccionada.id, documentoId: nota.id, codigo: nota.codigoComprobante, tipo: nota.tipoComprobante === "NOTA_CREDITO" ? "Nota de credito" : "Nota de debito", esNota: true, pendiente: false })}><Ban aria-hidden="true" size={16}/></button>)}</span></li>)}</ul> : <p className="ventas-notes-empty">Aun no hay notas vinculadas.</p>}
          <form onSubmit={emitirNota}>
            <h3>{tipoNota === "NOTA_CREDITO" ? "Emitir nota de crédito" : "Emitir nota de débito"}</h3>
            <label>Observación (opcional)<input maxLength={240} value={observacionNota} onChange={(evento) => setObservacionNota(evento.target.value)} placeholder="Motivo o detalle del ajuste" /></label>
            {errorNota && <p className="ventas-message is-error" role="alert">{errorNota}</p>}
            <p className="ventas-notes-hint">La nota se vincula a {ventaSeleccionada.tipoComprobante === "BOLETA" ? "la boleta" : "la factura"} original e incluye solo las líneas seleccionadas. Cada importe se valida contra el saldo disponible de la línea.</p>
            <button className={`ventas-new-button ${tipoNota === "NOTA_CREDITO" ? "is-credit" : "is-debit"}`} type="submit" disabled={guardandoNota || cargandoFuente || totalAjuste <= 0}>{guardandoNota ? "Emitiendo…" : `Emitir ${tipoNota === "NOTA_CREDITO" ? "nota de crédito" : "nota de débito"} · ${soles(String(totalAjuste))}`}</button>
          </form>
        </div>
      </section>
    </div>}
    {documentoAnulacion && <div className="ventas-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardandoAnulacion) setDocumentoAnulacion(null); }}>
      <section className="ventas-notes-modal ventas-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="ventas-cancel-title">
        <header><div><span>COMUNICACION DE BAJA A SUNAT</span><h2 id="ventas-cancel-title">{documentoAnulacion.codigo}</h2></div><button type="button" aria-label="Cerrar" disabled={guardandoAnulacion} onClick={() => setDocumentoAnulacion(null)}>X</button></header>
        <div className="ventas-notes-body"><p><strong>{documentoAnulacion.tipo}</strong> - La solicitud se enviara a NubeFact para comunicar la baja a SUNAT. SUNAT puede dejarla pendiente y requerir una consulta posterior.</p>
          <p className="ventas-cancel-warning">Esta accion solo anula el documento tributario. No revierte cobros, pagos ni movimientos de inventario.</p>
          {!documentoAnulacion.pendiente && <label className="ventas-cancel-reason">Motivo de baja<input required maxLength={100} value={motivoAnulacion} onChange={(evento) => setMotivoAnulacion(evento.target.value)} placeholder="Describe por que se comunica la baja" /></label>}
          {!documentoAnulacion.pendiente && <label className="ventas-cancel-confirm"><input type="checkbox" checked={confirmoNoEntregado} onChange={(evento) => setConfirmoNoEntregado(evento.target.checked)} /> Confirmo que el documento no fue entregado al cliente. SUNAT establece un plazo de 7 dias calendario desde el dia siguiente de su generacion.</label>}
          {documentoAnulacion.pendiente && <p>La solicitud ya fue enviada. Consulta el resultado antes de intentar otra accion.</p>}
          {errorAnulacion && <p className={errorAnulacion.startsWith("La baja fue aceptada") ? "ventas-message is-success" : "ventas-message is-error"} role="status">{errorAnulacion}</p>}
          <form onSubmit={procesarAnulacion}><button className="ventas-new-button is-cancel" type="submit" disabled={guardandoAnulacion || (!documentoAnulacion.pendiente && (!motivoAnulacion.trim() || !confirmoNoEntregado))}>{guardandoAnulacion ? "Procesando..." : documentoAnulacion.pendiente ? "Consultar estado con NubeFact" : "Confirmar comunicacion de baja"}</button></form>
        </div>
      </section>
    </div>}
  </section>;
}
