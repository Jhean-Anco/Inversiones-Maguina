import { useId, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Etiqueta } from "../../components/ui/etiqueta";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { clasesCamposPrecio, DialogoCatalogo, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { servicioMototaxis, type GarantiaMototaxi, type ReclamoGarantia } from "../../services/mototaxis.service";

const estados = { ABIERTO: "Abierto", ENVIADO: "Enviado", APROBADO: "Aprobado", RECHAZADO: "Rechazado", RESUELTO: "Resuelto" } as const;
type Estado = keyof typeof estados;
const pasos: Record<Estado, Estado[]> = { ABIERTO: ["ENVIADO"], ENVIADO: ["APROBADO", "RECHAZADO"], APROBADO: ["RESUELTO"], RECHAZADO: ["RESUELTO"], RESUELTO: [] };
const nombre = (g: GarantiaMototaxi) => [g.marca, g.modelo, g.version].filter(Boolean).join(" ");

type Props = {
  garantias: GarantiaMototaxi[];
  reclamos: ReclamoGarantia[];
  cargando: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  alActualizar: () => Promise<void>;
};

export function GarantiasMototaxis({ garantias, reclamos, cargando, puedeCrear, puedeEditar, alActualizar }: Props) {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
  const [busqueda, setBusqueda] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [filtroReclamo, setFiltroReclamo] = useState("");
  const [ficha, setFicha] = useState<GarantiaMototaxi | null>(null);
  const [garantia, setGarantia] = useState<GarantiaMototaxi | null>(null);
  const [seguimiento, setSeguimiento] = useState<ReclamoGarantia | null>(null);
  const [estado, setEstado] = useState<Estado | "">("");
  const [resolucion, setResolucion] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [falla, setFalla] = useState("");
  const [costo, setCosto] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const idFormulario = useId();
  const porId = new Map(garantias.map((item) => [item.id, item]));
  function estadoGarantia(item: GarantiaMototaxi) {
    return hoy < item.iniciaEn ? "Programada" : hoy > item.terminaEn ? "Vencida" : "Vigente";
  }
  const visibles = garantias.filter((g) => (!vigencia || vigencia === estadoGarantia(g)) &&
    [nombre(g), g.codigo, g.proveedor].join(" ").toLocaleLowerCase("es-PE").includes(busqueda.trim().toLocaleLowerCase("es-PE")));
  const hist = reclamos.filter((item) => !filtroReclamo || item.estado === filtroReclamo);
  const parteProveedor = garantia && costo !== "" ? Math.round(Math.round(Number(costo) * 100) * Number(garantia.porcentajeProveedor) / 100) / 100 : null;

  function abrirReclamo(item: GarantiaMototaxi) {
    setFicha(null); setGarantia(item); setFecha(item.terminaEn < hoy ? item.terminaEn : hoy);
    setCosto(""); setFalla(""); setError(""); setMensaje("");
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      if (garantia) await servicioMototaxis.crearReclamo({ garantiaId: garantia.id, fecha, descripcionFalla: falla, costoTotal: costo });
      else if (seguimiento && estado) await servicioMototaxis.avanzarReclamo(seguimiento.id, { estado, estadoAnterior: seguimiento.estado, resolucion });
      else return;
      setMensaje(garantia ? "Reclamo registrado." : "Estado del reclamo actualizado.");
      setGarantia(null); setSeguimiento(null);
      await alActualizar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el reclamo.");
    } finally { setGuardando(false); }
  }

  return <div className="grid min-w-0 gap-5">
    {mensaje && <p role="status" className="m-0 text-sm font-semibold">{mensaje}</p>}
    <ListadoMaestro<GarantiaMototaxi> variante="tabla" titulo="Cobertura de proveedores" registros={visibles} cargando={cargando} resetKey={`${busqueda}|${vigencia}`} paginacion={{ modo: "local" }}
      vacio="No hay garantías para esta búsqueda."
      controlesCabecera={<>
        <label className="listado-maestro-busqueda">Buscar garantía<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Modelo, proveedor o referencia" /></label>
        <label className="listado-maestro-filtro">Vigencia<select value={vigencia} onChange={(e) => setVigencia(e.target.value)}><option value="">Todas</option><option>Vigente</option><option>Vencida</option><option>Programada</option></select></label>
      </>}
      encabezadoTabla={<tr><th>Modelo</th><th>Referencia</th><th>Proveedor</th><th>Cobertura</th><th>Vigencia</th><th>Acciones</th></tr>}
      renderizarFila={(g) => <tr key={g.id}>
        <td><strong>{nombre(g)}</strong></td><td>{g.codigo}<small className="block">{g.compraDetalleId ? `${g.cantidad} de la compra` : "Registro histórico"}</small></td>
        <td>{g.proveedor}</td><td>{Number(g.porcentajeProveedor)} %<small className="block">{g.mesesVigencia} meses</small></td>
        <td><Etiqueta tono={estadoGarantia(g) === "Vigente" ? "positiva" : "neutral"}>{estadoGarantia(g)}</Etiqueta><small className="block">Hasta {fechaInventario(g.terminaEn)}</small></td>
        <td><div className="flex flex-wrap gap-1.5"><Button variant="outline" size="sm" onClick={() => setFicha(g)}>Ver cobertura</Button>
          {puedeCrear && g.iniciaEn <= hoy && <Button size="sm" onClick={() => abrirReclamo(g)}>Registrar reclamo</Button>}</div></td>
      </tr>} />
    <ListadoMaestro<ReclamoGarantia> variante="tabla" titulo="Seguimiento de reclamos" registros={hist} cargando={cargando} resetKey={filtroReclamo} paginacion={{ modo: "local" }}
      vacio="No hay reclamos para este estado." controlesCabecera={<label className="listado-maestro-filtro">Estado<select value={filtroReclamo} onChange={(e) => setFiltroReclamo(e.target.value)}><option value="">Todos</option>{Object.entries(estados).map(([clave, valor]) => <option key={clave} value={clave}>{valor}</option>)}</select></label>}
      encabezadoTabla={<tr><th>Modelo y diagnóstico</th><th>Fecha</th><th>Costo</th><th>Proveedor</th><th>Empresa</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(r) => {
        const g = porId.get(r.garantiaId);
        return <tr key={r.id}>
          <td><strong>{g ? nombre(g) : "Mototaxi"}</strong><small className="block break-words">{r.descripcionFalla}</small></td>
          <td>{fechaInventario(r.fecha)}</td><td>{monedaInventario(r.costoTotal)}</td><td>{monedaInventario(r.importeProveedor)}</td><td>{monedaInventario(r.importeEmpresa)}</td>
          <td><Etiqueta tono={r.estado === "RESUELTO" || r.estado === "APROBADO" ? "positiva" : "neutral"}>{estados[r.estado as Estado] ?? r.estado}</Etiqueta></td>
          <td><Button variant="outline" size="sm" onClick={() => { setSeguimiento(r); setEstado(""); setResolucion(""); setError(""); }}>{puedeEditar && pasos[r.estado as Estado]?.length ? "Dar seguimiento" : "Ver reclamo"}</Button></td>
        </tr>;
      }} />
    {ficha && <DialogoCatalogo titulo="Cobertura de garantía" articulo={nombre(ficha)} codigo={ficha.codigo} alCerrar={() => setFicha(null)} acciones={puedeCrear && ficha.iniciaEn <= hoy ? <Button onClick={() => abrirReclamo(ficha)}>Registrar reclamo</Button> : undefined}>
      <dl className="m-0 grid gap-4 sm:grid-cols-2 [&_dd]:m-0 [&_dt]:text-sm">
        <div><dt>Proveedor</dt><dd>{ficha.proveedor}</dd></div>
        <div><dt>Participación del proveedor</dt><dd>{Number(ficha.porcentajeProveedor)} %</dd></div>
        <div><dt>Inicio</dt><dd>{fechaInventario(ficha.iniciaEn)}</dd></div>
        <div><dt>Fin</dt><dd>{fechaInventario(ficha.terminaEn)}</dd></div>
        {ficha.alcance && <div><dt>Alcance</dt><dd>{ficha.alcance}</dd></div>}
        {ficha.exclusiones && <div><dt>Exclusiones</dt><dd>{ficha.exclusiones}</dd></div>}
      </dl>
    </DialogoCatalogo>}
    {(garantia || seguimiento) && <DialogoCatalogo titulo={garantia ? "Registrar reclamo de garantía" : "Seguimiento del reclamo"} articulo={garantia ? nombre(garantia) : seguimiento?.descripcionFalla ?? ""} codigo={garantia?.codigo ?? ""} guardando={guardando} alCerrar={() => { setGarantia(null); setSeguimiento(null); }}
      acciones={garantia || (puedeEditar && estado) ? <Button type="submit" form={idFormulario} disabled={guardando}>{guardando ? "Guardando…" : garantia ? "Registrar reclamo" : "Guardar estado"}</Button> : undefined}>
      <form id={idFormulario} onSubmit={(e) => void guardar(e)}>
        <fieldset disabled={guardando} className={`m-0 border-0 p-0 ${clasesCamposPrecio}`}>
          {garantia && <>
            <label>Fecha del reclamo<input type="date" required min={garantia.iniciaEn} max={garantia.terminaEn < hoy ? garantia.terminaEn : hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
            <label>Costo total en soles<input type="number" min="0" max="999999999999.99" step="0.01" required value={costo} onChange={(e) => setCosto(e.target.value)} /></label>
            <label className="sm:col-span-2">Diagnóstico<textarea className="rounded-md border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2" required maxLength={2000} rows={3} value={falla} onChange={(e) => setFalla(e.target.value)} /></label>
            {parteProveedor !== null && <p className="m-0 rounded-lg bg-[var(--erp-surface-muted)] p-3 text-sm sm:col-span-2">Proveedor {monedaInventario(parteProveedor)} · Empresa {monedaInventario(Number(costo) - parteProveedor)}</p>}
          </>}
          {seguimiento && <>
            <p className="m-0 text-sm sm:col-span-2">Estado actual <strong>{estados[seguimiento.estado as Estado] ?? seguimiento.estado}</strong></p>
            {seguimiento.resolucion && <p className="m-0 text-sm sm:col-span-2">{seguimiento.resolucion}</p>}
            {puedeEditar && Boolean(pasos[seguimiento.estado as Estado]?.length) && <>
              <label className="sm:col-span-2">Nuevo estado<select required value={estado} onChange={(e) => setEstado(e.target.value as Estado)}><option value="">Selecciona un estado</option>{pasos[seguimiento.estado as Estado].map((paso) => <option value={paso} key={paso}>{estados[paso]}</option>)}</select></label>
              <label className="sm:col-span-2">Resolución<textarea className="rounded-md border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2" required={estado !== "ENVIADO"} maxLength={2000} rows={3} value={resolucion} onChange={(e) => setResolucion(e.target.value)} /></label>
            </>}
          </>}
        </fieldset>
        {error && <p role="alert" className="mb-0 text-sm text-[var(--erp-accent)]">{error}</p>}
      </form>
    </DialogoCatalogo>}
  </div>;
}
