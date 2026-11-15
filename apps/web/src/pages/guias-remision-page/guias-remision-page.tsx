import { useEffect, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { servicioIngresos, type GuiaRemision } from "../../services/ingresos.service";
import "./guias-remision-page.css";

type LineaGuia = { unidad: string; codigo: string; descripcion: string; cantidad: string };
const lineaVacia = (): LineaGuia => ({ unidad: "NIU", codigo: "", descripcion: "", cantidad: "1" });
const fechaHoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

export function GuiasRemisionPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const tipo = "REMITENTE" as const;
  const [tipoTransporte, setTipoTransporte] = useState("01");
  const [motivoTraslado, setMotivoTraslado] = useState("01");
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [totalGuias, setTotalGuias] = useState(0);
  const [totalPaginasGuias, setTotalPaginasGuias] = useState(1);
  const [paginaGuias, setPaginaGuias] = useState(1);
  const [porPaginaGuias, setPorPaginaGuias] = useState(tamanioTablaInicial);
  const [cargandoGuias, setCargandoGuias] = useState(true);
  const [lineas, setLineas] = useState<LineaGuia[]>([lineaVacia()]);
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
    return () => { vigente = false; };
  }, [mostrarFormulario]);

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
    setGuardando(true);
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario).entries());
    try {
      const guia = await servicioIngresos.emitirGuia({ ...valores, tipo, items: lineas });
      setMensaje(guia.mensaje ? `${guia.codigo}: ${guia.mensaje}` : `${guia.codigo} enviada. Consulta SUNAT para obtener el PDF y el CDR.`);
      setLineas([lineaVacia()]); setPaginaGuias(1); setActualizada((valor) => valor + 1); formulario.reset(); setMostrarFormulario(false);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo enviar la guía a NubeFact."); }
    finally { setGuardando(false); }
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
  const documento = (id: string, etiqueta: string) => <label key={id}>{etiqueta}<select name={id} defaultValue="6"><option value="6">RUC</option><option value="1">DNI</option><option value="4">Carné de extranjería</option><option value="7">Pasaporte</option></select></label>;

  return <main className="guide-page">
    {puedeCrear && !mostrarFormulario && <RegistrarAccionPrincipal etiqueta="Crear guía de remisión" onClick={() => { setError(""); setMensaje(""); setTipoTransporte("01"); setMotivoTraslado("01"); setLineas([lineaVacia()]); setMostrarFormulario(true); }} />}
    {!mostrarFormulario && mensaje && <p className="guide-message" role="status">{mensaje}</p>}
    {puedeCrear && mostrarFormulario && <div className="guide-create-layout"><section className="guide-form-pane guide-panel" aria-labelledby="guide-form-title">
      <header className="guide-form-heading is-remitente"><div><span>DOCUMENTO DE TRASLADO · REMITENTE</span><h2 id="guide-form-title">Nueva guía de remisión</h2><p>Registra el destino, el transporte y los bienes que vas a trasladar.</p></div><div className="guide-number-preview"><span>N° DE GUÍA · REMITENTE</span><strong>{consultandoSerieGuia ? "Consultando…" : errorConsultaSerieGuia ? "No se pudo consultar la serie" : codigoGuiaPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong></div></header>
      <form onSubmit={emitir}>
        <fieldset><legend>Destinatario</legend><div className="guide-fields">{documento("clienteTipoDocumento", "Tipo de documento")}{campo("clienteNumeroDocumento", "Número de documento", true, 15)}{campo("clienteNombre", "Nombre o razón social", true, 100)}{campo("clienteDireccion", "Dirección", true, 100)}</div></fieldset>
        <fieldset><legend>Datos del traslado</legend><div className="guide-fields">
          <label>Motivo del traslado<select name="motivoTraslado" value={motivoTraslado} onChange={(evento) => setMotivoTraslado(evento.target.value)}><option value="01">Venta</option><option value="14">Venta sujeta a confirmación</option><option value="02">Compra</option><option value="04">Traslado entre establecimientos</option><option value="03">Venta con entrega a terceros</option><option value="06">Devolución</option><option value="13">Otros</option></select></label>
          {motivoTraslado === "13" && campo("motivoTrasladoOtros", "Descripción del motivo", true, 70)}
          <label>Tipo de transporte<select name="tipoTransporte" value={tipoTransporte} onChange={(evento) => setTipoTransporte(evento.target.value)}><option value="01">Público</option><option value="02">Privado</option></select></label>
          <label>Peso bruto total (kg)<input name="pesoBrutoTotal" type="number" min="0.001" step="0.001" required /></label>
          <label>Número de bultos<input name="numeroBultos" type="number" min="1" step="1" defaultValue="1" required /></label>
          <label>Fecha de inicio<input name="fechaInicio" type="date" min={fechaHoy()} defaultValue={fechaHoy()} required /></label>
          <label>Fecha de entrega al transportista<input name="fechaEntregaTransportista" type="date" min={fechaHoy()} defaultValue={fechaHoy()} /></label>
          {tipoTransporte === "01" && <><label>RUC del transportista<input name="transportistaRuc" inputMode="numeric" maxLength={11} /></label>{campo("transportistaNombre", "Razón social del transportista", false, 100)}</>}
          {tipoTransporte === "01" && campo("placa", "Placa del vehículo", true, 8)}
        </div></fieldset>
        {tipoTransporte === "02" && <fieldset><legend>Vehículo y conductor</legend><div className="guide-fields">{campo("placa", "Placa del vehículo", true, 8)}{documento("conductorTipoDocumento", "Documento del conductor")}{campo("conductorNumeroDocumento", "Número de documento", true, 15)}{campo("conductorNombre", "Nombres del conductor", true, 100)}{campo("conductorApellidos", "Apellidos del conductor", true, 100)}{campo("conductorLicencia", "Licencia de conducir", true, 10)}</div></fieldset>}
        <fieldset><legend>Origen y destino</legend><div className="guide-fields">{campo("partidaUbigeo", "Ubigeo de partida", true, 6)}{campo("partidaDireccion", "Dirección de partida", true, 150)}{campo("llegadaUbigeo", "Ubigeo de llegada", true, 6)}{campo("llegadaDireccion", "Dirección de llegada", true, 150)}</div><small>Ingresa el ubigeo de 6 dígitos correspondiente a cada dirección.</small></fieldset>
        <fieldset><legend>Bienes trasladados</legend>{lineas.map((linea, indice) => <div className="guide-item" key={indice}><label>Descripción<input required maxLength={250} value={linea.descripcion} onChange={(evento) => setLineas((actual) => actual.map((fila, i) => i === indice ? { ...fila, descripcion: evento.target.value } : fila))} /></label><label>Código<input maxLength={40} value={linea.codigo} onChange={(evento) => setLineas((actual) => actual.map((fila, i) => i === indice ? { ...fila, codigo: evento.target.value } : fila))} /></label><label>Unidad<select value={linea.unidad} onChange={(evento) => setLineas((actual) => actual.map((fila, i) => i === indice ? { ...fila, unidad: evento.target.value } : fila))}><option value="NIU">Unidad</option><option value="ZZ">Servicio</option><option value="KGM">Kilogramo</option><option value="LTR">Litro</option><option value="MTR">Metro</option></select></label><label>Cantidad<input type="number" min="0.001" step="0.001" required value={linea.cantidad} onChange={(evento) => setLineas((actual) => actual.map((fila, i) => i === indice ? { ...fila, cantidad: evento.target.value } : fila))} /></label>{lineas.length > 1 && <button type="button" className="guide-remove" onClick={() => setLineas((actual) => actual.filter((_, i) => i !== indice))}>Quitar</button>}</div>)}<button type="button" className="guide-add" onClick={() => setLineas((actual) => [...actual, lineaVacia()])}>Agregar bien</button></fieldset>
        <label className="guide-observations">Observaciones (opcional)<textarea name="observaciones" maxLength={1000} rows={3} /></label>
        {error && <p className="guide-message is-error" role="alert">{error}</p>}{mensaje && <p className="guide-message" role="status">{mensaje}</p>}
        <div className="guide-form-actions"><button className="guide-back" type="button" disabled={guardando} onClick={cerrarFormulario}>Cancelar</button><button className="guide-submit" type="submit" disabled={guardando || !codigoGuiaPrevisualizado || consultandoSerieGuia || errorConsultaSerieGuia}>{guardando ? "Enviando guía…" : "Emitir guía en NubeFact"}</button></div>
      </form>
    </section></div>}
    {!mostrarFormulario && <ListadoMaestro variante="tabla" titulo="Guías de remisión" registros={guias} cargando={cargandoGuias} error={error || undefined} paginacion={{ modo: "remota", pagina: paginaGuias, tamanio: porPaginaGuias, total: totalGuias, totalPaginas: totalPaginasGuias, desde: totalGuias ? (paginaGuias - 1) * porPaginaGuias + 1 : 0, hasta: Math.min(paginaGuias * porPaginaGuias, totalGuias), alCambiarPagina: setPaginaGuias, alCambiarTamanio: (tamanio) => { setPorPaginaGuias(tamanio); setPaginaGuias(1); } }} vacio={<span>Las guías emitidas aparecerán aquí.</span>} encabezadoTabla={<tr><th>Tipo y código</th><th>Fecha</th><th>Estado y detalle</th><th>Documentos y acciones</th></tr>} renderizarFila={(guia) => <tr key={guia.id}><td><strong>{guia.tipo === "REMITENTE" ? "Remitente" : "Transportista"}</strong><small>{guia.codigo}</small></td><td>{guia.fecha}</td><td><strong>{guia.estado}</strong>{guia.detalle && <small>{guia.detalle}</small>}</td><td><div className="guide-actions">{guia.enlacePdf && <a href={guia.enlacePdf} target="_blank" rel="noreferrer">PDF</a>}{guia.enlaceXml && <a href={guia.enlaceXml} target="_blank" rel="noreferrer">XML</a>}{guia.enlaceCdr && <a href={guia.enlaceCdr} target="_blank" rel="noreferrer">CDR</a>}{guia.estado !== "EMITIDO" && <button type="button" disabled={consultando === guia.id} onClick={() => void consultar(guia.id)}>{consultando === guia.id ? "Consultando…" : "Consultar SUNAT"}</button>}</div></td></tr>} />}
  </main>;
}
