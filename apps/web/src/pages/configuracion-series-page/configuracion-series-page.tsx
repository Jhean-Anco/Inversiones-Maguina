import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Pencil, Save } from "lucide-react";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { solicitarApi } from "../../services/api-cliente";
import { inventarioMototaxisClasses as c } from "../inventario-mototaxis-page/inventario-mototaxis-page-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { dialogosModeloClasses as d, tonosPill } from "../inventario-mototaxis-page/dialogos-modelo-classes";

type Tipo = "BOLETA" | "FACTURA" | "NOTA_CREDITO_FACTURA" | "NOTA_DEBITO_FACTURA" | "NOTA_CREDITO_BOLETA" | "NOTA_DEBITO_BOLETA" | "GUIA_REMITENTE" | "NOTA_VENTA" | "ORDEN_SERVICIO" | "COTIZACION";
type Serie = { id: string; tipoComprobante: Tipo; serie: string; activa: boolean; ultimoNumero: number };
type Estado = "ACTIVAS" | "INACTIVAS";
type Familia = "" | "FISCALES" | "INTERNOS";

const tipos: { tipo: Tipo; nombre: string; regla: RegExp }[] = [
  { tipo: "BOLETA", nombre: "Boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "FACTURA", nombre: "Factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_FACTURA", nombre: "Nota de crédito · factura", regla: /^F[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_FACTURA", nombre: "Nota de débito · factura", regla: /^F[A-Z0-9]{3}$/ },
  { tipo: "NOTA_CREDITO_BOLETA", nombre: "Nota de crédito · boleta", regla: /^B[A-Z0-9]{3}$/ }, { tipo: "NOTA_DEBITO_BOLETA", nombre: "Nota de débito · boleta", regla: /^B[A-Z0-9]{3}$/ },
  { tipo: "GUIA_REMITENTE", nombre: "Guía de remisión · remitente", regla: /^T[A-Z0-9]{3}$/ },
  { tipo: "NOTA_VENTA", nombre: "Nota de venta", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "ORDEN_SERVICIO", nombre: "Orden de servicio", regla: /^[A-Z0-9]{1,4}$/ }, { tipo: "COTIZACION", nombre: "Cotización", regla: /^[A-Z0-9]{1,4}$/ },
];

const esFiscal = (tipo: Tipo) => !["NOTA_VENTA", "ORDEN_SERVICIO", "COTIZACION"].includes(tipo);
const nombreDocumento = (tipo: Tipo) => tipos.find((opcion) => opcion.tipo === tipo)?.nombre ?? tipo;
const correlativo = (serie: string, numero: number) => `${serie}-${String(numero).padStart(6, "0")}`;
const ejemploSerie = (tipo: Tipo) => tipo === "FACTURA" || tipo.endsWith("_FACTURA") ? "F001"
  : tipo === "BOLETA" || tipo.endsWith("_BOLETA") ? "B001"
    : tipo === "GUIA_REMITENTE" ? "T001"
      : tipo === "ORDEN_SERVICIO" ? "OS01" : tipo === "COTIZACION" ? "COT1" : "NV01";

export function ConfiguracionSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Estado>("ACTIVAS");
  const [familia, setFamilia] = useState<Familia>("");
  const [tipo, setTipo] = useState<Tipo>("BOLETA");
  const [serie, setSerie] = useState("");
  const [ultimoNumero, setUltimoNumero] = useState(0);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizarLista, setActualizarLista] = useState(0);
  const [confirmacion, setConfirmacion] = useState("");

  useEffect(() => {
    let vigente = true;
    void solicitarApi<Serie[]>("/ingresos/series/configuracion")
      .then((datos) => { if (vigente) setSeries(datos); })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las series configuradas."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [actualizarLista]);

  const deLaFamilia = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-PE");
    return series.filter((item) => (!familia || (familia === "FISCALES") === esFiscal(item.tipoComprobante))
      && (!termino || `${nombreDocumento(item.tipoComprobante)} ${item.serie}`.toLocaleLowerCase("es-PE").includes(termino)));
  }, [busqueda, familia, series]);
  const conteo = { ACTIVAS: deLaFamilia.filter((item) => item.activa).length, INACTIVAS: deLaFamilia.filter((item) => !item.activa).length };
  const visibles = deLaFamilia.filter((item) => (filtroEstado === "ACTIVAS" ? item.activa : !item.activa));
  const conteoFiscales = series.filter((item) => esFiscal(item.tipoComprobante)).length;

  function abrirFormulario(item?: Serie) {
    setError(""); setConfirmacion("");
    const elegido = item?.tipoComprobante ?? "BOLETA";
    const actual = item ?? series.find((s) => s.activa && s.tipoComprobante === elegido);
    setTipo(elegido); setSerie(actual?.serie ?? ""); setUltimoNumero(actual?.ultimoNumero ?? 0);
    setMostrarFormulario(true);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const normalizada = serie.trim().toUpperCase();
    const opcion = tipos.find((item) => item.tipo === tipo)!;
    if (!opcion.regla.test(normalizada)) { setError(`Formato inválido para ${opcion.nombre}. Ejemplo: ${ejemploSerie(tipo)}.`); return; }
    setGuardando(true); setError("");
    try {
      await solicitarApi("/ingresos/series/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipoComprobante: tipo, serie: normalizada, ultimoNumero }) });
      setConfirmacion(`Serie ${normalizada} guardada para ${opcion.nombre}.`);
      setMostrarFormulario(false);
      setActualizarLista((actual) => actual + 1);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar la serie.");
    } finally { setGuardando(false); }
  }

  const serieActiva = series.find((item) => item.tipoComprobante === tipo && item.activa);
  const normalizada = serie.trim().toUpperCase();
  const configurada = series.find((item) => item.tipoComprobante === tipo && item.serie === normalizada);
  const minimoCorrelativo = configurada?.ultimoNumero ?? (esFiscal(tipo) ? 0 : serieActiva?.ultimoNumero ?? 0);

  return <section className={c.page}>
    <RegistrarAccionPrincipal etiqueta="Configurar serie" onClick={() => abrirFormulario()} />
    {confirmacion && <NotificacionFlotante tipo="exito" mensaje={confirmacion} onCerrar={() => setConfirmacion("")} />}
    {error && <NotificacionFlotante tipo="error" mensaje={error} onCerrar={() => setError("")} />}
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por documento o serie" aria-label="Buscar serie" />
      </label>
      <label className={v.selectField}><select aria-label="Tipo de documento" value={familia} onChange={(e) => setFamilia(e.target.value as Familia)}>
        <option value="">Todos los documentos ({series.length})</option>
        <option value="FISCALES">Fiscales ({conteoFiscales})</option>
        <option value="INTERNOS">Internos ({series.length - conteoFiscales})</option>
      </select><ChevronDown aria-hidden="true" /></label>
      <div className={v.filters} role="group" aria-label="Estado">
        {(["ACTIVAS", "INACTIVAS"] as const).map((estado) => <button key={estado} type="button" className={v.chip} aria-pressed={filtroEstado === estado} onClick={() => setFiltroEstado(estado)}>
          {estado === "ACTIVAS" ? "Activas" : "Inactivas"}<span className={v.chipCount}>{conteo[estado]}</span>
        </button>)}
      </div>
    </div>
    <ListadoMaestro<Serie>
      variante="tabla" titulo="Series de documentos"
      registros={visibles} cargando={cargando}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      vacio={<div className={v.empty}><strong>No hay series para mostrar</strong><span>{busqueda.trim() || familia ? "Prueba con otra búsqueda o tipo de documento." : "Configura la primera serie de documentos."}</span></div>}
      paginacion={{ modo: "local" }} resetKey={`${busqueda}|${filtroEstado}|${familia}`}
      encabezadoTabla={<tr><th>Documento</th><th>Serie</th><th>Último emitido</th><th>Próximo documento</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(item) => {
        const nombre = nombreDocumento(item.tipoComprobante);
        const tono = item.activa ? tonosPill.verde : tonosPill.gris;
        return <tr key={item.id}>
          <td><strong className={v.documentCode}>{nombre}</strong><small className={v.minorText}>{esFiscal(item.tipoComprobante) ? "Fiscal" : "Interno"}</small></td>
          <td><span className="font-mono text-sm font-semibold text-[#0b2545]">{item.serie}</span></td>
          <td className="[font-variant-numeric:tabular-nums]">{item.ultimoNumero.toLocaleString("es-PE")}</td>
          <td><span className="font-mono font-semibold text-[#142b42]">{item.activa ? correlativo(item.serie, item.ultimoNumero + 1) : "—"}</span></td>
          <td><span className={`${v.status} ${tono.caja}`}><i className={`${d.punto} ${tono.punto}`} aria-hidden="true" />{item.activa ? "Activa" : "Inactiva"}</span></td>
          <td><div className={v.rowActions}>
            <BotonAccion etiqueta={`Configurar ${nombre} ${item.serie}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => abrirFormulario(item)} />
          </div></td>
        </tr>;
      }}
    />
    {mostrarFormulario && <DialogoCatalogo titulo="Configurar serie" articulo={nombreDocumento(tipo)} codigo={normalizada} alCerrar={() => setMostrarFormulario(false)} guardando={guardando}
      acciones={<>
        <button type="button" className={d.botonSecundario} disabled={guardando} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
        <button type="submit" form="config-series-form" className={d.botonPrincipal} disabled={guardando}><Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : "Guardar serie"}</button>
      </>}>
      <form id="config-series-form" className={d.contenido} onSubmit={(e) => void guardar(e)}>
        <dl className={`${d.bloqueDatos} ${d.bloqueTres}`}>
          <div><dt>Serie activa actual</dt><dd>{serieActiva?.serie ?? "Sin configurar"}</dd></div>
          <div><dt>Último emitido</dt><dd>{serieActiva ? serieActiva.ultimoNumero.toLocaleString("es-PE") : "—"}</dd></div>
          <div><dt>Próximo documento</dt><dd className="font-mono">{normalizada ? correlativo(normalizada, ultimoNumero + 1) : "—"}</dd></div>
        </dl>
        <fieldset disabled={guardando} className={d.formulario}>
          <div className={d.campos}>
            <label>Documento *<span className="relative flex items-center">
              <select className="box-border h-[46px] w-full cursor-pointer appearance-none rounded-[10px] border border-[#c5d1db] bg-white pl-3 pr-10 text-[14px] font-normal text-[#142b42] outline-none focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933]" value={tipo} onChange={(e) => {
                const elegido = e.target.value as Tipo;
                const actual = series.find((item) => item.activa && item.tipoComprobante === elegido);
                setTipo(elegido); setSerie(actual?.serie ?? ""); setUltimoNumero(actual?.ultimoNumero ?? 0);
              }}>
                <optgroup label="Fiscales">{tipos.filter((item) => esFiscal(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup>
                <optgroup label="Internos">{tipos.filter((item) => !esFiscal(item.tipo)).map((item) => <option key={item.tipo} value={item.tipo}>{item.nombre}</option>)}</optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4 text-[#52697d]" aria-hidden="true" />
            </span></label>
            <label>Serie *<input required value={serie} maxLength={4} placeholder={`Ej.: ${ejemploSerie(tipo)}`} onChange={(e) => {
              const valor = e.target.value.toUpperCase();
              setSerie(valor);
              setUltimoNumero(series.find((item) => item.tipoComprobante === tipo && item.serie === valor)?.ultimoNumero ?? (esFiscal(tipo) ? 0 : serieActiva?.ultimoNumero ?? 0));
            }} /><small>{esFiscal(tipo) ? `4 caracteres; empieza con ${ejemploSerie(tipo)[0]}.` : "Hasta 4 letras o números."}</small></label>
            <label>Último número emitido *<input type="number" required min={minimoCorrelativo} max={99999999} step={1} value={ultimoNumero} onChange={(e) => setUltimoNumero(Number(e.target.value))} /><small>Mínimo {minimoCorrelativo.toLocaleString("es-PE")}.</small></label>
          </div>
          {serieActiva && normalizada && serieActiva.serie !== normalizada && <p className={d.nota}>Al guardar, {normalizada} será la serie activa para {nombreDocumento(tipo)}.</p>}
        </fieldset>
      </form>
    </DialogoCatalogo>}
  </section>;
}
