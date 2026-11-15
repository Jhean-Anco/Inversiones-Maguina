import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { servicioIngresos, type DocumentoGuia, type DocumentoOrigenGuia, type GuiaRemision, type UbigeoPeru } from "../../services/ingresos.service";
import { servicioConductores, type Conductor } from "../../services/conductores.service";
import { servicioTransportistas, type TransportistaRegistrado } from "../../services/transportistas.service";
import "./guias-remision-page.css";

type LineaGuia = { detalleId: string; unidad: string; codigo: string; descripcion: string; cantidad: string; cantidadDocumento: number; tipo: "PRODUCTO" | "MOTOTAXI" };
const fechaHoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

export function GuiasRemisionPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const tipo: "REMITENTE" | "TRANSPORTISTA" = "REMITENTE";
  const [tipoTransporte, setTipoTransporte] = useState("01");
  const [motivoTraslado, setMotivoTraslado] = useState("01");
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [totalGuias, setTotalGuias] = useState(0);
  const [totalPaginasGuias, setTotalPaginasGuias] = useState(1);
  const [paginaGuias, setPaginaGuias] = useState(1);
  const [porPaginaGuias, setPorPaginaGuias] = useState(tamanioTablaInicial);
  const [cargandoGuias, setCargandoGuias] = useState(true);
  const [lineas, setLineas] = useState<LineaGuia[]>([]);
  const [ubigeos, setUbigeos] = useState<UbigeoPeru[]>([]);
  const [documentosOrigen, setDocumentosOrigen] = useState<DocumentoOrigenGuia[]>([]);
  const [documentoOrigen, setDocumentoOrigen] = useState<DocumentoGuia | null>(null);
  const [busquedaDocumento, setBusquedaDocumento] = useState("");
  const [busquedaBien, setBusquedaBien] = useState("");
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [origen, setOrigen] = useState({ departamento: "", provincia: "", distrito: "" });
  const [destino, setDestino] = useState({ departamento: "", provincia: "", distrito: "" });
  const [busquedaTransportista, setBusquedaTransportista] = useState("");
  const [transportistas, setTransportistas] = useState<TransportistaRegistrado[]>([]);
  const [transportista, setTransportista] = useState<TransportistaRegistrado | null>(null);
  const [nuevoTransportista, setNuevoTransportista] = useState({ ruc: "", razonSocial: "" });
  const [busquedaConductor, setBusquedaConductor] = useState("");
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductor, setConductor] = useState<Conductor | null>(null);
  const [nuevoConductor, setNuevoConductor] = useState({ tipoDocumento: "DNI" as "DNI" | "CE" | "PASAPORTE", numeroDocumento: "", nombres: "", apellidoPaterno: "", numeroLicencia: "" });
  const [guardando, setGuardando] = useState(false);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [actualizada, setActualizada] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [codigoGuiaPrevisualizado, setCodigoGuiaPrevisualizado] = useState<string | null>(null);
  const [consultandoSerieGuia, setConsultandoSerieGuia] = useState(false);
  const [errorConsultaSerieGuia, setErrorConsultaSerieGuia] = useState(false);
  const cerrarFormulario = () => { setMostrarFormulario(false); setError(""); setMensaje(""); };

  useEffect(() => {
    if (!mostrarFormulario) return;
    let vigente = true;
    setCodigoGuiaPrevisualizado(null); setErrorConsultaSerieGuia(false); setConsultandoSerieGuia(true);
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (vigente) { setCodigoGuiaPrevisualizado(numeraciones.GUIA_REMITENTE.codigo); setErrorConsultaSerieGuia(false); }
    }).catch(() => {
      if (vigente) { setCodigoGuiaPrevisualizado(null); setErrorConsultaSerieGuia(true); }
    }).finally(() => { if (vigente) setConsultandoSerieGuia(false); });
    void Promise.all([servicioIngresos.listarUbigeos(), servicioIngresos.buscarDocumentosParaGuia(), servicioTransportistas.listar(), servicioConductores.listar()]).then(([catalogoUbigeos, documentos, listaTransportistas, listaConductores]) => {
      if (vigente) { setUbigeos(catalogoUbigeos); setDocumentosOrigen(documentos); setTransportistas(listaTransportistas); setConductores(listaConductores); }
    }).catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar los catálogos de la guía."); });
    return () => { vigente = false; };
  }, [mostrarFormulario]);

  useEffect(() => {
    if (!mostrarFormulario) return;
    let vigente = true;
    const temporizador = window.setTimeout(() => { void servicioIngresos.buscarDocumentosParaGuia(busquedaDocumento).then((items) => { if (vigente) setDocumentosOrigen(items); }).catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron buscar comprobantes."); }); }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [mostrarFormulario, busquedaDocumento]);

  useEffect(() => {
    if (!mostrarFormulario || tipoTransporte !== "01" || !busquedaTransportista.trim()) return;
    let vigente = true;
    const temporizador = window.setTimeout(() => { void servicioTransportistas.listar(busquedaTransportista).then((items) => { if (vigente) setTransportistas(items); }).catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo buscar transportistas."); }); }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [mostrarFormulario, tipoTransporte, busquedaTransportista]);

  useEffect(() => {
    if (!mostrarFormulario || tipoTransporte !== "02" || !busquedaConductor.trim()) return;
    let vigente = true;
    const temporizador = window.setTimeout(() => { void servicioConductores.listar(busquedaConductor).then((items) => { if (vigente) setConductores(items); }).catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo buscar conductores."); }); }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [mostrarFormulario, tipoTransporte, busquedaConductor]);

  useEffect(() => {
    let vigente = true;
    setCargandoGuias(true);
    void servicioIngresos.listarGuias(paginaGuias, porPaginaGuias).then((resultado) => { if (vigente) { setGuias(resultado.items); setTotalGuias(resultado.total); setTotalPaginasGuias(resultado.totalPaginas); setError(""); } })
      .catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las guías."); })
      .finally(() => { if (vigente) setCargandoGuias(false); });
    return () => { vigente = false; };
  }, [actualizada, paginaGuias, porPaginaGuias]);

  async function emitir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError(""); setMensaje("");
    if (!codigoGuiaPrevisualizado) { setError(errorConsultaSerieGuia ? "No se pudo consultar la serie de la guía." : "Falta configurar una serie para este tipo de guía."); return; }
    if (!documentoOrigen || !lineas.length) { setError("Selecciona un comprobante emitido y al menos un bien de ese documento."); return; }
    if (tipoTransporte === "01" && !transportista) { setError("Busca y selecciona un transportista registrado."); return; }
    if (tipoTransporte === "02" && !conductor) { setError("Busca y selecciona un conductor registrado."); return; }
    setGuardando(true);
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario).entries());
    try {
      const guia = await servicioIngresos.emitirGuia({ ...valores, tipo, ingresoId: documentoOrigen.id, clienteDireccion: valores.clienteDireccion, transportistaId: transportista?.id, conductorId: conductor?.id, items: lineas.map(({ detalleId, cantidad }) => ({ detalleId, cantidad })) });
      setMensaje(guia.mensaje ? `${guia.codigo}: ${guia.mensaje}` : `${guia.codigo} enviada. Consulta SUNAT para obtener el PDF y el CDR.`);
      setLineas([]); setDocumentoOrigen(null); setPaginaGuias(1); setActualizada((valor) => valor + 1); formulario.reset(); setMostrarFormulario(false);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo enviar la guía a NubeFact."); }
    finally { setGuardando(false); }
  }

  async function seleccionarDocumento(id: string) {
    setError(""); setDocumentoOrigen(null); setLineas([]); setCargandoDocumento(true);
    try { const documento = await servicioIngresos.obtenerDocumentoParaGuia(id); setDocumentoOrigen(documento); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo cargar el comprobante."); }
    finally { setCargandoDocumento(false); }
  }

  function agregarBien(detalle: NonNullable<DocumentoGuia["detalles"]>[number]) {
    setLineas((actuales) => actuales.some((linea) => linea.detalleId === detalle.id) ? actuales : [...actuales, { detalleId: detalle.id, unidad: detalle.unidad ?? "NIU", codigo: detalle.codigo ?? "", descripcion: detalle.descripcion, cantidad: detalle.cantidad, cantidadDocumento: Number(detalle.cantidad), tipo: detalle.tipo }]);
  }

  async function crearTransportista() {
    setError(""); if (!/^\d{11}$/.test(nuevoTransportista.ruc) || !nuevoTransportista.razonSocial.trim()) { setError("Completa un RUC de 11 dígitos y la razón social."); return; }
    try { const creada = await servicioTransportistas.crear({ numeroDocumento: nuevoTransportista.ruc, razonSocial: nuevoTransportista.razonSocial }); setTransportistas((actuales) => [creada, ...actuales.filter((persona) => persona.id !== creada.id)]); setTransportista(creada); setBusquedaTransportista(""); setNuevoTransportista({ ruc: "", razonSocial: "" }); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el transportista."); }
  }

  async function crearConductor() {
    setError(""); if (!nuevoConductor.numeroDocumento.trim() || !nuevoConductor.nombres.trim() || !nuevoConductor.apellidoPaterno.trim() || !nuevoConductor.numeroLicencia.trim()) { setError("Completa los datos requeridos para registrar al conductor."); return; }
    try { const creado = await servicioConductores.crear(nuevoConductor); setConductores((actuales) => [creado, ...actuales.filter((persona) => persona.id !== creado.id)]); setConductor(creado); setBusquedaConductor(""); setNuevoConductor({ tipoDocumento: "DNI", numeroDocumento: "", nombres: "", apellidoPaterno: "", numeroLicencia: "" }); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el conductor."); }
  }

  async function consultar(id: string) {
    setConsultando(id); setError("");
    try {
      const resultado = await servicioIngresos.consultarGuia(id);
      setMensaje(resultado.detalle || `${resultado.codigo}: ${resultado.estado === "EMITIDO" ? "aceptada por SUNAT" : resultado.estado}.`);
      setActualizada((valor) => valor + 1);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar la guía."); }
    finally { setConsultando(null); }
  }

  const campo = (id: string, etiqueta: string, requerido = true, maxLength?: number) => <label key={id}>{etiqueta}<input name={id} required={requerido} maxLength={maxLength} /></label>;
  const departamentos = useMemo(() => [...new Set(ubigeos.map((item) => item.departamento))], [ubigeos]);
  const campoUbigeo = (etiqueta: string, valor: { departamento: string; provincia: string; distrito: string }, cambiar: (siguiente: { departamento: string; provincia: string; distrito: string }) => void, prefijo: "partida" | "llegada") => {
    const provincias = [...new Set(ubigeos.filter((item) => item.departamento === valor.departamento).map((item) => item.provincia))];
    const distritos = ubigeos.filter((item) => item.departamento === valor.departamento && item.provincia === valor.provincia);
    return <div className="guide-ubigeo"><strong>{etiqueta}</strong><label>Departamento<select value={valor.departamento} required onChange={(evento) => cambiar({ departamento: evento.target.value, provincia: "", distrito: "" })}><option value="">Selecciona departamento</option>{departamentos.map((item) => <option key={item}>{item}</option>)}</select></label><label>Provincia<select value={valor.provincia} required disabled={!valor.departamento} onChange={(evento) => cambiar({ ...valor, provincia: evento.target.value, distrito: "" })}><option value="">Selecciona provincia</option>{provincias.map((item) => <option key={item}>{item}</option>)}</select></label><label>Distrito<select name={`${prefijo}Ubigeo`} value={valor.distrito} required disabled={!valor.provincia} onChange={(evento) => cambiar({ ...valor, distrito: evento.target.value })}><option value="">Selecciona distrito</option>{distritos.map((item) => <option key={item.codigo} value={item.codigo}>{item.distrito} · {item.codigo}</option>)}</select></label></div>;
  };

  return <main className="guide-page">
    {puedeCrear && !mostrarFormulario && <RegistrarAccionPrincipal etiqueta="Crear guía de remisión" onClick={() => { setError(""); setMensaje(""); setTipoTransporte("01"); setMotivoTraslado("01"); setLineas([]); setDocumentoOrigen(null); setTransportista(null); setConductor(null); setOrigen({ departamento: "", provincia: "", distrito: "" }); setDestino({ departamento: "", provincia: "", distrito: "" }); setMostrarFormulario(true); }} />}
    {!mostrarFormulario && mensaje && <p className="guide-message" role="status">{mensaje}</p>}
    {puedeCrear && mostrarFormulario && <div className="guide-create-layout">
      <aside className="guide-source-sidebar" aria-label="Comprobante y bienes de la guía">
        <section className="guide-source-card"><span className="guide-section-kicker">COMPROBANTE DE VENTA</span><h2>Elige el documento origen</h2><p>Busca una boleta, factura o nota de venta emitida desde el ERP.</p><label>Buscar comprobante<input type="search" value={busquedaDocumento} onChange={(evento) => setBusquedaDocumento(evento.target.value)} placeholder="Código, cliente o producto" /></label><div className="guide-source-results">{documentosOrigen.map((item) => <button className={documentoOrigen?.id === item.id ? "is-selected" : ""} key={item.id} type="button" disabled={cargandoDocumento} onClick={() => void seleccionarDocumento(item.id)}><strong>{item.codigo}</strong><span>{item.tipoComprobante.replace("_", " ")} · {item.fecha}</span><small>{item.clienteNombre ?? "Cliente sin nombre"} · S/ {item.total}</small></button>)}{!documentosOrigen.length && <p>No hay comprobantes emitidos con bienes trasladables para mostrar.</p>}</div></section>
        {documentoOrigen && <section className="guide-source-card guide-goods-card"><span className="guide-section-kicker">REPUESTOS Y MOTOTAXIS</span><h2>Bienes del documento</h2><label>Buscar bien<input type="search" value={busquedaBien} onChange={(evento) => setBusquedaBien(evento.target.value)} placeholder="Nombre o código" /></label><div className="guide-source-results">{documentoOrigen.detalles.filter((bien) => !busquedaBien.trim() || `${bien.descripcion} ${bien.codigo ?? ""} ${bien.tipo}`.toLocaleLowerCase().includes(busquedaBien.toLocaleLowerCase())).map((bien) => <button key={bien.id} type="button" disabled={lineas.some((linea) => linea.detalleId === bien.id)} onClick={() => agregarBien(bien)}><strong>{bien.descripcion}</strong><span>{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"} · {bien.codigo ?? "Sin código"}</span><small>En comprobante: {bien.cantidad} {bien.unidad ?? "NIU"}{lineas.some((linea) => linea.detalleId === bien.id) ? " · Agregado" : " · Agregar"}</small></button>)}</div></section>}
      </aside>
      <section className="guide-form-pane guide-panel" aria-labelledby="guide-form-title">
        <header className="guide-form-heading is-remitente"><div><span>DOCUMENTO DE TRASLADO · REMITENTE</span><h2 id="guide-form-title">Nueva guía de remisión</h2><p>La guía se emite después del comprobante y conserva su cliente y bienes.</p></div><div className="guide-number-preview"><span>N° DE GUÍA · REMITENTE</span><strong>{consultandoSerieGuia ? "Consultando…" : errorConsultaSerieGuia ? "No se pudo consultar la serie" : codigoGuiaPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong></div></header>
        <form onSubmit={emitir}>
          <fieldset><legend>Cliente del comprobante</legend>{documentoOrigen ? <div className="guide-linked-customer"><strong>{documentoOrigen.clienteNombreCompleto}</strong><span>{documentoOrigen.clienteTipoDocumento} · {documentoOrigen.clienteNumeroDocumento}</span><small>Origen: {documentoOrigen.tipoComprobante.replace("_", " ")} {documentoOrigen.codigo}</small><label>Dirección para esta entrega<input name="clienteDireccion" maxLength={100} defaultValue={documentoOrigen.clienteDireccion} placeholder="Completa la dirección del cliente" /></label></div> : <p className="guide-instruction">Selecciona primero un comprobante de la lista para traer el cliente registrado.</p>}</fieldset>
          <fieldset><legend>Datos del traslado</legend><div className="guide-fields">
            <label>Motivo del traslado<select name="motivoTraslado" value={motivoTraslado} onChange={(evento) => setMotivoTraslado(evento.target.value)}><option value="01">Venta</option><option value="14">Venta sujeta a confirmación</option><option value="02">Compra</option><option value="04">Traslado entre establecimientos</option><option value="03">Venta con entrega a terceros</option><option value="06">Devolución</option><option value="13">Otros</option></select></label>
            {motivoTraslado === "13" && campo("motivoTrasladoOtros", "Descripción del motivo", true, 70)}
            <label>Tipo de transporte<select name="tipoTransporte" value={tipoTransporte} onChange={(evento) => { setTipoTransporte(evento.target.value); setTransportista(null); setConductor(null); }}><option value="01">Público</option><option value="02">Privado</option></select></label>
            <label>Peso bruto total (kg)<input name="pesoBrutoTotal" type="number" min="0.001" step="0.001" required /></label><label>Número de bultos<input name="numeroBultos" type="number" min="1" step="1" defaultValue="1" required /></label><label>Fecha de inicio<input name="fechaInicio" type="date" min={fechaHoy()} defaultValue={fechaHoy()} required /></label>
            {tipoTransporte === "01" && <label>Fecha de entrega al transportista<input name="fechaEntregaTransportista" type="date" min={fechaHoy()} defaultValue={fechaHoy()} required /></label>}
          </div>
          {tipoTransporte === "01" && <div className="guide-catalog-field"><label>Transportista registrado<input type="search" value={busquedaTransportista} onChange={(evento) => { setBusquedaTransportista(evento.target.value); setTransportista(null); }} placeholder="Buscar por RUC o razón social" /></label><div className="guide-catalog-results">{transportistas.map((persona) => <button type="button" key={persona.id} onClick={() => { setTransportista(persona); setBusquedaTransportista(persona.nombre); }}><strong>{persona.nombre}</strong><span>RUC {persona.numeroDocumento}</span></button>)}</div>{transportista && <p className="guide-selection">Seleccionado: {transportista.nombre} · RUC {transportista.numeroDocumento}</p>}<details className="guide-quick-create"><summary>Registrar transportista</summary><div className="guide-quick-create-form"><label>RUC<input inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={nuevoTransportista.ruc} onChange={(evento) => setNuevoTransportista((actual) => ({ ...actual, ruc: evento.target.value.replace(/\D/g, "").slice(0, 11) }))} /></label><label>Razón social<input maxLength={180} value={nuevoTransportista.razonSocial} onChange={(evento) => setNuevoTransportista((actual) => ({ ...actual, razonSocial: evento.target.value }))} /></label><button type="button" onClick={() => void crearTransportista()}>Guardar transportista</button></div></details></div>}
          <div className="guide-fields"><label>Placa del vehículo<input name="placa" required maxLength={8} /></label>{tipoTransporte === "02" && <div className="guide-catalog-field guide-full"><label>Conductor registrado<input type="search" value={busquedaConductor} onChange={(evento) => { setBusquedaConductor(evento.target.value); setConductor(null); }} placeholder="Buscar por nombre, documento o licencia" /></label><div className="guide-catalog-results">{conductores.map((persona) => <button type="button" key={persona.id} onClick={() => { setConductor(persona); setBusquedaConductor(`${persona.nombres} ${persona.apellidoPaterno}`); }}><strong>{persona.nombres} {persona.apellidoPaterno} {persona.apellidoMaterno ?? ""}</strong><span>{persona.tipoDocumento} {persona.numeroDocumento} · Licencia {persona.numeroLicencia}</span></button>)}</div>{conductor && <p className="guide-selection">Seleccionado: {conductor.nombres} {conductor.apellidoPaterno} · Licencia {conductor.numeroLicencia}</p>}<details className="guide-quick-create"><summary>Registrar conductor</summary><div className="guide-quick-create-form"><label>Tipo de documento<select value={nuevoConductor.tipoDocumento} onChange={(evento) => setNuevoConductor((actual) => ({ ...actual, tipoDocumento: evento.target.value as "DNI" | "CE" | "PASAPORTE" }))}><option>DNI</option><option>CE</option><option>PASAPORTE</option></select></label><label>Número de documento<input maxLength={15} value={nuevoConductor.numeroDocumento} onChange={(evento) => setNuevoConductor((actual) => ({ ...actual, numeroDocumento: evento.target.value }))} /></label><label>Nombres<input maxLength={120} value={nuevoConductor.nombres} onChange={(evento) => setNuevoConductor((actual) => ({ ...actual, nombres: evento.target.value }))} /></label><label>Apellido paterno<input maxLength={120} value={nuevoConductor.apellidoPaterno} onChange={(evento) => setNuevoConductor((actual) => ({ ...actual, apellidoPaterno: evento.target.value }))} /></label><label>Licencia<input maxLength={10} value={nuevoConductor.numeroLicencia} onChange={(evento) => setNuevoConductor((actual) => ({ ...actual, numeroLicencia: evento.target.value }))} /></label><button type="button" onClick={() => void crearConductor()}>Guardar conductor</button></div></details></div>}</div></fieldset>
          <fieldset><legend>Origen y destino</legend><div className="guide-address-grid">{campoUbigeo("Punto de partida", origen, setOrigen, "partida")}<label>Dirección de partida<input name="partidaDireccion" required maxLength={150} /></label>{campoUbigeo("Punto de llegada", destino, setDestino, "llegada")}<label>Dirección de llegada<input name="llegadaDireccion" required maxLength={150} /></label></div></fieldset>
          <fieldset><legend>Bienes trasladados</legend>{lineas.length ? <div className="guide-selected-items">{lineas.map((linea) => <div className="guide-item" key={linea.detalleId}><div><strong>{linea.descripcion}</strong><small>{linea.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"} · {linea.codigo || "Sin código"} · {linea.unidad}</small></div><label>Cantidad<input type="number" min="0.001" max={linea.cantidadDocumento} step="0.001" required value={linea.cantidad} onChange={(evento) => setLineas((actual) => actual.map((fila) => fila.detalleId === linea.detalleId ? { ...fila, cantidad: evento.target.value } : fila))} /></label><small>Máximo {linea.cantidadDocumento}</small><button type="button" className="guide-remove" onClick={() => setLineas((actual) => actual.filter((fila) => fila.detalleId !== linea.detalleId))}>Quitar</button></div>)}</div> : <p className="guide-instruction">Busca en el panel lateral y agrega los repuestos o mototaxis incluidos en el comprobante.</p>}</fieldset>
          <label className="guide-observations">Observaciones (opcional)<textarea name="observaciones" maxLength={1000} rows={3} /></label>
          {error && <p className="guide-message is-error" role="alert">{error}</p>}{mensaje && <p className="guide-message" role="status">{mensaje}</p>}
          <div className="guide-form-actions"><button className="guide-back" type="button" disabled={guardando} onClick={cerrarFormulario}>Cancelar</button><button className="guide-submit" type="submit" disabled={guardando || !codigoGuiaPrevisualizado || consultandoSerieGuia || errorConsultaSerieGuia || !documentoOrigen || !lineas.length}>{guardando ? "Enviando guía…" : "Emitir guía en NubeFact"}</button></div>
        </form>
      </section>
    </div>}
    {!mostrarFormulario && <ListadoMaestro variante="tabla" titulo="Guías de remisión" registros={guias} cargando={cargandoGuias} error={error || undefined} paginacion={{ modo: "remota", pagina: paginaGuias, tamanio: porPaginaGuias, total: totalGuias, totalPaginas: totalPaginasGuias, desde: totalGuias ? (paginaGuias - 1) * porPaginaGuias + 1 : 0, hasta: Math.min(paginaGuias * porPaginaGuias, totalGuias), alCambiarPagina: setPaginaGuias, alCambiarTamanio: (tamanio) => { setPorPaginaGuias(tamanio); setPaginaGuias(1); } }} vacio={<span>Las guías emitidas aparecerán aquí.</span>} encabezadoTabla={<tr><th>Tipo y código</th><th>Comprobante origen</th><th>Fecha</th><th>Estado y detalle</th><th>Documentos y acciones</th></tr>} renderizarFila={(guia) => <tr key={guia.id}><td><strong>{guia.tipo === "REMITENTE" ? "Remitente" : "Transportista"}</strong><small>{guia.codigo}</small></td><td>{guia.comprobanteOrigen ? <><strong>{guia.comprobanteOrigen.codigo}</strong><small>{guia.comprobanteOrigen.tipo.replace("_", " ")}</small></> : "Sin vínculo"}</td><td>{guia.fecha}</td><td><strong>{guia.estado}</strong>{guia.detalle && <small>{guia.detalle}</small>}</td><td><div className="guide-actions">{guia.enlacePdf && <a href={guia.enlacePdf} target="_blank" rel="noreferrer">PDF</a>}{guia.enlaceXml && <a href={guia.enlaceXml} target="_blank" rel="noreferrer">XML</a>}{guia.enlaceCdr && <a href={guia.enlaceCdr} target="_blank" rel="noreferrer">CDR</a>}{guia.estado !== "EMITIDO" && <button type="button" disabled={consultando === guia.id} onClick={() => void consultar(guia.id)}>{consultando === guia.id ? "Consultando…" : "Consultar SUNAT"}</button>}</div></td></tr>} />}
  </main>;
}
