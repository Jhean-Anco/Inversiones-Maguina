import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { AccionIcono } from "../../components/ui/accion-icono";
import { Etiqueta } from "../../components/ui/etiqueta";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { Button } from "../../components/ui/button";
import { clasesCamposPrecio, DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { solicitarApi } from "../../services/api-cliente";

type Tipo = "BOLETA" | "FACTURA" | "NOTA_CREDITO_FACTURA" | "NOTA_DEBITO_FACTURA" | "NOTA_CREDITO_BOLETA" | "NOTA_DEBITO_BOLETA" | "GUIA_REMITENTE" | "NOTA_VENTA" | "ORDEN_SERVICIO" | "COTIZACION";
type Serie = { id: string; tipoComprobante: Tipo; serie: string; activa: boolean; ultimoNumero: number };
const tipos: { tipo: Tipo; nombre: string; regla: RegExp }[] = [
  { tipo: "BOLETA", nombre: "Boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "FACTURA", nombre: "Factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_FACTURA", nombre: "Nota de crédito · factura", regla: /^F[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_FACTURA", nombre: "Nota de débito · factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_BOLETA", nombre: "Nota de crédito · boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_BOLETA", nombre: "Nota de débito · boleta", regla: /^B[A-Z0-9]{3}$/ },
  { tipo: "GUIA_REMITENTE", nombre: "Guía de remisión · remitente", regla: /^T[A-Z0-9]{3}$/ },
  { tipo: "NOTA_VENTA", nombre: "Nota de venta", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "ORDEN_SERVICIO", nombre: "Orden de servicio", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "COTIZACION", nombre: "Cotización", regla: /^[A-Z0-9]{1,4}$/ },
];

const esFiscal = (tipo: Tipo) => !["NOTA_VENTA", "ORDEN_SERVICIO", "COTIZACION"].includes(tipo);
const nombreDocumento = (tipo: Tipo) => tipos.find((opcion) => opcion.tipo === tipo)?.nombre ?? tipo;
const ejemploSerie = (tipo: Tipo) => tipo.startsWith("NOTA_CREDITO_FACTURA") || tipo.startsWith("NOTA_DEBITO_FACTURA") || tipo === "FACTURA" ? "F001"
  : tipo.startsWith("NOTA_CREDITO_BOLETA") || tipo.startsWith("NOTA_DEBITO_BOLETA") || tipo === "BOLETA" ? "B001"
    : tipo === "GUIA_REMITENTE" ? "T001"
      : tipo === "ORDEN_SERVICIO" ? "OS01" : tipo === "COTIZACION" ? "COT1" : "NV01";

export function ConfiguracionSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [familia, setFamilia] = useState("");
  const [tipo, setTipo] = useState<Tipo>("BOLETA");
  const [serie, setSerie] = useState("");
  const [ultimoNumero, setUltimoNumero] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizarLista, setActualizarLista] = useState(0);
  const [confirmacion, setConfirmacion] = useState("");

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
    return series.filter((item) => {
      const coincideEstado = filtroEstado === "TODAS" || (filtroEstado === "ACTIVAS" ? item.activa : !item.activa);
      const coincideBusqueda = !termino || `${nombreDocumento(item.tipoComprobante)} ${item.serie} ${item.activa ? "activa" : "inactiva"}`.toLocaleLowerCase("es-PE").includes(termino);
      const coincideFamilia = !familia || (familia === "FISCALES") === esFiscal(item.tipoComprobante);
      return coincideEstado && coincideBusqueda && coincideFamilia;
    });
  }, [busqueda, familia, filtroEstado, series]);

  function abrirFormulario(item?: Serie) {
    setMensaje("");
    setConfirmacion("");
    setTipo(item?.tipoComprobante ?? "BOLETA");
    setSerie(item?.serie ?? "");
    setUltimoNumero(item?.ultimoNumero ?? 0);
    setMostrarFormulario(true);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const normalizada = serie.trim().toUpperCase();
    const opcion = tipos.find((item) => item.tipo === tipo)!;
    if (!opcion.regla.test(normalizada)) { setMensaje(`Formato inválido para ${opcion.nombre}.`); return; }
    setGuardando(true);
    setMensaje("");
    try {
      await solicitarApi("/ingresos/series/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipoComprobante: tipo, serie: normalizada, ultimoNumero }) });
      setConfirmacion(`Serie ${normalizada} guardada.`);
      setMostrarFormulario(false);
      setActualizarLista((actual) => actual + 1);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar la serie.");
    } finally { setGuardando(false); }
  }

  const serieActiva = series.find((item) => item.tipoComprobante === tipo && item.activa);
  const configurada = series.find((item) => item.tipoComprobante === tipo && item.serie === serie.trim().toUpperCase());
  const minimoCorrelativo = configurada?.ultimoNumero ?? (esFiscal(tipo) ? 0 : serieActiva?.ultimoNumero ?? 0);
  const siguiente = Math.max(ultimoNumero, minimoCorrelativo) + 1;

  return <section className="grid min-w-0 gap-4">
    {confirmacion && <NotificacionFlotante tipo="exito" mensaje={confirmacion} onCerrar={() => setConfirmacion("")} />}
    <ListadoMaestro<Serie> variante="tabla" titulo="Numeración de documentos" registros={seriesFiltradas} cargando={cargando} error={mensaje && !mostrarFormulario ? mensaje : undefined}
      paginacion={{ modo: "local" }} resetKey={`${busqueda}|${familia}|${filtroEstado}`} vacio="No hay series para mostrar."
      controlesCabecera={<>
        <label className="listado-maestro-busqueda">Buscar serie<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Documento o serie" /></label>
        <label className="listado-maestro-filtro">Documento<select value={familia} onChange={(e) => setFamilia(e.target.value)}><option value="">Todos</option><option value="FISCALES">Fiscales</option><option value="INTERNOS">Internos</option></select></label>
        <label className="listado-maestro-filtro">Estado<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="TODAS">Todas</option><option value="ACTIVAS">Activas</option><option value="INACTIVAS">Inactivas</option></select></label>
        <RegistrarAccionPrincipal etiqueta="Configurar serie" onClick={() => abrirFormulario()} />
      </>}
      encabezadoTabla={<tr><th>Documento</th><th>Serie</th><th>Último emitido</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(item) => <tr key={item.id}>
        <td><strong>{nombreDocumento(item.tipoComprobante)}</strong><small className="block">{esFiscal(item.tipoComprobante) ? "Fiscal" : "Interno"}</small></td>
        <td><span className="font-mono font-semibold text-[var(--erp-focus)]">{item.serie}</span></td>
        <td>{item.ultimoNumero.toLocaleString("es-PE")}</td><td><Etiqueta tono={item.activa ? "positiva" : "neutral"}>{item.activa ? "Activa" : "Inactiva"}</Etiqueta></td>
        <td><AccionIcono accion="editar" etiqueta={`Configurar ${nombreDocumento(item.tipoComprobante)} ${item.serie}`} onClick={() => abrirFormulario(item)} /></td>
      </tr>}
    />
    {mostrarFormulario && <DialogoCatalogo titulo="Configurar serie" articulo={nombreDocumento(tipo)} codigo={serie.trim().toUpperCase()} alCerrar={() => setMostrarFormulario(false)} guardando={guardando}
      acciones={<><Button variant="outline" disabled={guardando} onClick={() => setMostrarFormulario(false)}>Cancelar</Button><Button type="submit" form="config-series-form" disabled={guardando}>{guardando ? "Guardando…" : "Guardar serie"}</Button></>}>
      <form id="config-series-form" onSubmit={(e) => void guardar(e)}>
        <fieldset disabled={guardando} className={`m-0 border-0 p-0 ${clasesCamposPrecio}`}>
          <label className="sm:col-span-2">Documento<select value={tipo} onChange={(e) => {
            const elegido = e.target.value as Tipo;
            const actual = series.find((item) => item.activa && item.tipoComprobante === elegido);
            setTipo(elegido); setSerie(actual?.serie ?? ""); setUltimoNumero(actual?.ultimoNumero ?? 0);
          }}>
            <optgroup label="Fiscales">{tipos.filter((item) => esFiscal(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup>
            <optgroup label="Internos">{tipos.filter((item) => !esFiscal(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup>
          </select></label>
          <label>Serie<input required value={serie} maxLength={4} placeholder={ejemploSerie(tipo)} onChange={(e) => {
            const valor = e.target.value.toUpperCase();
            setSerie(valor);
            setUltimoNumero(series.find((item) => item.tipoComprobante === tipo && item.serie === valor)?.ultimoNumero ?? (esFiscal(tipo) ? 0 : serieActiva?.ultimoNumero ?? 0));
          }} /></label>
          <label>Último número emitido<input type="number" required min={minimoCorrelativo} max={99999999} step={1} value={ultimoNumero} onChange={(e) => setUltimoNumero(Number(e.target.value))} /></label>
        </fieldset>
        <dl className="my-4 grid gap-3 rounded-xl bg-[var(--erp-surface-muted)] p-4 sm:grid-cols-2 [&_dd]:m-0 [&_dt]:text-sm">
          <div><dt>Serie activa actual</dt><dd className="font-semibold">{serieActiva?.serie ?? "Sin configurar"}</dd></div>
          <div><dt>Próximo documento</dt><dd className="font-mono font-semibold">{serie.trim() ? `${serie.trim()}-${String(siguiente).padStart(6, "0")}` : "—"}</dd></div>
        </dl>
        {serieActiva && serie.trim() && serieActiva.serie !== serie.trim() && <p className="text-sm">Al guardar, {serie.trim()} será la serie activa para {nombreDocumento(tipo)}.</p>}
        {mensaje && <p role="alert" className="text-sm text-[var(--erp-accent)]">{mensaje}</p>}
      </form>
    </DialogoCatalogo>}
  </section>;
}
