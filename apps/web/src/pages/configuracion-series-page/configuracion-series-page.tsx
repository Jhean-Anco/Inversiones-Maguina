import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { AccionIcono } from "../../components/ui/accion-icono";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { solicitarApi } from "../../services/api-cliente";
import "./configuracion-series-page.css";

type Tipo = "BOLETA" | "FACTURA" | "NOTA_CREDITO_FACTURA" | "NOTA_DEBITO_FACTURA" | "NOTA_CREDITO_BOLETA" | "NOTA_DEBITO_BOLETA" | "GUIA_REMITENTE" | "NOTA_VENTA" | "ORDEN_SERVICIO" | "COTIZACION";
type Serie = { id: string; tipoComprobante: Tipo; serie: string; activa: boolean; ultimoNumero: number };
const tipos: { tipo: Tipo; nombre: string; regla: RegExp }[] = [
  { tipo: "BOLETA", nombre: "Boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "FACTURA", nombre: "Factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_FACTURA", nombre: "Nota de crédito · factura", regla: /^F[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_FACTURA", nombre: "Nota de débito · factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_BOLETA", nombre: "Nota de crédito · boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_BOLETA", nombre: "Nota de débito · boleta", regla: /^B[A-Z0-9]{3}$/ },
  { tipo: "GUIA_REMITENTE", nombre: "Guía de remisión · remitente", regla: /^T[A-Z0-9]{3}$/ },
  { tipo: "NOTA_VENTA", nombre: "Nota de venta", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "ORDEN_SERVICIO", nombre: "Orden de servicio", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "COTIZACION", nombre: "Cotización", regla: /^[A-Z0-9]{1,4}$/ },
];

const nombreDocumento = (tipo: Tipo) => tipos.find((opcion) => opcion.tipo === tipo)?.nombre ?? tipo;
const ejemploSerie = (tipo: Tipo) => tipo.startsWith("NOTA_CREDITO_FACTURA") || tipo.startsWith("NOTA_DEBITO_FACTURA") || tipo === "FACTURA" ? "F001"
  : tipo.startsWith("NOTA_CREDITO_BOLETA") || tipo.startsWith("NOTA_DEBITO_BOLETA") || tipo === "BOLETA" ? "B001"
    : tipo === "GUIA_REMITENTE" ? "T001"
      : tipo === "ORDEN_SERVICIO" ? "OS01" : tipo === "COTIZACION" ? "COT1" : "NV01";

export function ConfiguracionSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<Tipo>("BOLETA");
  const [serie, setSerie] = useState("");
  const [ultimoNumero, setUltimoNumero] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizarLista, setActualizarLista] = useState(0);
  const dialogoRef = useRef<HTMLElement>(null);
  useDialogoFlotante(dialogoRef, mostrarFormulario, () => setMostrarFormulario(false));

  useEffect(() => {
    let vigente = true;
    void solicitarApi<Serie[]>("/ingresos/series/configuracion")
      .then((datos) => { if (vigente) { setSeries(datos); setMensaje(""); } })
      .catch((error: unknown) => { if (vigente) setMensaje(error instanceof Error ? error.message : "No se pudieron cargar las series configuradas."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [actualizarLista]);

  const seriesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-PE");
    if (!termino) return series;
    return series.filter((item) => `${nombreDocumento(item.tipoComprobante)} ${item.serie} ${item.activa ? "activa" : "inactiva"}`.toLocaleLowerCase("es-PE").includes(termino));
  }, [busqueda, series]);

  function abrirFormulario(item?: Serie) {
    setMensaje("");
    setTipo(item?.tipoComprobante ?? "BOLETA");
    setSerie(item?.serie ?? "");
    setUltimoNumero(item?.ultimoNumero ?? 0);
    setMostrarFormulario(true);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const normalizada = serie.trim().toUpperCase();
    const opcion = tipos.find((item) => item.tipo === tipo)!;
    if (!opcion.regla.test(normalizada)) { setMensaje(`Formato inválido para ${opcion.nombre}.`); return; }
    setGuardando(true);
    setMensaje("");
    try {
      await solicitarApi("/ingresos/series/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipoComprobante: tipo, serie: normalizada, ultimoNumero }) });
      setMostrarFormulario(false);
      setActualizarLista((actual) => actual + 1);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar la serie.");
    } finally { setGuardando(false); }
  }

  return <main className="config-series-page">
    <ListadoMaestro<Serie> variante="tabla" titulo="Series configuradas" descripcion="Series activas e históricas para cada tipo de documento." registros={seriesFiltradas} cargando={cargando} error={mensaje && !mostrarFormulario ? mensaje : undefined} paginacion={{ modo: "local" }} claseContenedor="config-series-table-wrap" controlesCabecera={<label className="listado-maestro-busqueda">Buscar serie<input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Documento, serie o estado" autoComplete="off" /></label>} resetKey={busqueda} vacio={<><strong>{busqueda ? "No hay series que coincidan" : "Aún no hay series configuradas"}</strong><span>{busqueda ? "Prueba con otro documento, código de serie o estado." : "Configura una serie para habilitar la numeración de documentos."}</span></>} encabezadoTabla={<tr><th>Documento</th><th>Serie</th><th>Último número emitido</th><th>Estado</th><th>Acciones</th></tr>} renderizarFila={(item) => <tr key={item.id}><td><strong>{nombreDocumento(item.tipoComprobante)}</strong><small>{item.tipoComprobante === "NOTA_VENTA" || item.tipoComprobante === "ORDEN_SERVICIO" || item.tipoComprobante === "COTIZACION" ? "Documento interno" : "Documento fiscal"}</small></td><td><span className="config-series-code">{item.serie}</span></td><td>{item.ultimoNumero.toLocaleString("es-PE")}</td><td><span className={`config-series-status${item.activa ? " is-active" : ""}`}><i aria-hidden="true" />{item.activa ? "Activa" : "Inactiva"}</span></td><td><AccionIcono accion="editar" etiqueta={`Configurar ${nombreDocumento(item.tipoComprobante)} · ${item.serie}`} onClick={() => abrirFormulario(item)} /></td></tr>} />
    <RegistrarAccionPrincipal etiqueta="Configurar serie" onClick={() => abrirFormulario()} />
    {mostrarFormulario && createPortal(<div className="config-series-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) setMostrarFormulario(false); }}><section ref={dialogoRef} className="config-series-dialog" role="dialog" aria-modal="true" aria-labelledby="config-series-form-title"><header><div><p className="page-eyebrow">NUMERACIÓN DE DOCUMENTOS</p><h2 id="config-series-form-title">Configurar serie</h2><p>La numeración se guarda para el tipo de documento seleccionado.</p></div><button type="button" aria-label="Cerrar formulario" onClick={() => { if (!guardando) setMostrarFormulario(false); }}>×</button></header><form id="config-series-form" className="config-series-form-floating" onSubmit={(evento) => void guardar(evento)}><div className="config-series-fields"><label className="config-series-field-wide">Documento<select value={tipo} onChange={(evento) => { const siguienteTipo = evento.target.value as Tipo; setTipo(siguienteTipo); setSerie(series.find((item) => item.tipoComprobante === siguienteTipo && item.activa)?.serie ?? ""); setUltimoNumero(series.find((item) => item.tipoComprobante === siguienteTipo && item.activa)?.ultimoNumero ?? 0); }}><optgroup label="Documentos fiscales">{tipos.filter((item) => !["NOTA_VENTA", "ORDEN_SERVICIO", "COTIZACION"].includes(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup><optgroup label="Documentos internos">{tipos.filter((item) => ["NOTA_VENTA", "ORDEN_SERVICIO", "COTIZACION"].includes(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup></select></label><label>Serie<input required value={serie} onChange={(evento) => setSerie(evento.target.value.toUpperCase())} maxLength={4} placeholder={ejemploSerie(tipo)} /></label><label>Último número emitido<input type="number" min={0} max={99999999} step={1} required value={ultimoNumero} onChange={(evento) => setUltimoNumero(Number(evento.target.value))} /></label></div>{mensaje && mostrarFormulario && <p className="config-series-error" role="alert">{mensaje}</p>}</form><footer><button className="config-series-cancel" type="button" disabled={guardando} onClick={() => setMostrarFormulario(false)}>Cancelar</button><button className="config-series-save" type="submit" form="config-series-form" disabled={guardando}>{guardando ? "Guardando…" : "Guardar serie"}</button></footer></section></div>, document.body)}
  </main>;
}
