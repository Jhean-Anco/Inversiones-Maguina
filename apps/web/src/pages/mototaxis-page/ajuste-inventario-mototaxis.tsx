import { useEffect, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AjusteInventarioMototaxi, type ModeloMototaxi, type ReconteoModeloMototaxi } from "../../services/mototaxis.service";

type UnidadNueva = { vin: string; numeroMotor: string; numeroChasis: string; anioModelo: string; color: string; costoAdquisicion: string };
const nuevaUnidad = (): UnidadNueva => ({ vin: "", numeroMotor: "", numeroChasis: "", anioModelo: String(new Date().getFullYear()), color: "", costoAdquisicion: "" });
const fecha = (valor: string) => new Date(valor).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function AjusteInventarioMototaxis({ puedeAjustar }: { puedeAjustar: boolean }) {
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventarioMototaxi[]>([]);
  const [reconteo, setReconteo] = useState<ReconteoModeloMototaxi | null>(null);
  const [modeloId, setModeloId] = useState("");
  const [unidadesEncontradas, setUnidadesEncontradas] = useState<string[]>([]);
  const [unidadesNuevas, setUnidadesNuevas] = useState<UnidadNueva[]>([]);
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoReconteo, setCargandoReconteo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    setCargando(true); setError("");
    try {
      const [catalogo, historial] = await Promise.all([servicioMototaxis.modelos("", true), servicioMototaxis.ajustesInventario()]);
      setModelos(catalogo); setAjustes(historial);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo cargar el inventario de mototaxis."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, []);
  useEffect(() => {
    if (!modal || !modeloId) { setReconteo(null); setUnidadesEncontradas([]); return; }
    let vigente = true;
    setCargandoReconteo(true); setError("");
    void servicioMototaxis.reconteoModelo(modeloId).then((resultado) => {
      if (vigente) { setReconteo(resultado); setUnidadesEncontradas(resultado.unidades.filter((unidad) => unidad.estado !== "FALTANTE").map((unidad) => unidad.id)); }
    }).catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo consultar el inventario del modelo."); })
      .finally(() => { if (vigente) setCargandoReconteo(false); });
    return () => { vigente = false; };
  }, [modeloId, modal]);
  useEffect(() => {
    if (!modal) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escapar = (evento: KeyboardEvent) => { if (evento.key === "Escape" && !guardando) cerrar(); };
    window.addEventListener("keydown", escapar);
    return () => { document.body.style.overflow = overflowAnterior; window.removeEventListener("keydown", escapar); };
  }, [modal, guardando]);

  function abrir() { setModeloId(""); setReconteo(null); setUnidadesEncontradas([]); setUnidadesNuevas([]); setMotivo(""); setObservacion(""); setError(""); setAviso(""); setModal(true); }
  function cerrar() { if (guardando) return; setModal(false); }
  function alternarUnidad(id: string) { setUnidadesEncontradas((actuales) => actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id]); }
  function actualizarNueva(indice: number, clave: keyof UnidadNueva, valor: string) { setUnidadesNuevas((actuales) => actuales.map((unidad, i) => i === indice ? { ...unidad, [clave]: valor } : unidad)); }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!reconteo) return;
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId, unidadesSistemaIds: reconteo.unidades.map((unidad) => unidad.id), unidadesEncontradas, unidadesNuevas, motivo, observacion });
      setModal(false); setAviso(`Ajuste ${resultado.codigo} registrado: ${resultado.nuevas} VIN nuevos, ${resultado.faltantes} faltantes y ${resultado.recuperadas} recuperados.`); await cargar();
    } catch (problema) { setError(problema instanceof ErrorApi ? problema.message : problema instanceof Error ? problema.message : "No se pudo registrar el ajuste."); }
    finally { setGuardando(false); }
  }

  const cantidadContada = unidadesEncontradas.length + unidadesNuevas.length;
  const diferencia = cantidadContada - (reconteo?.cantidadSistema ?? 0);
  return <section className="moto-panel moto-stocktake-page">
    
    {aviso && <div className="moto-stocktake-notice" role="status">{aviso}<button type="button" onClick={() => setAviso("")} aria-label="Cerrar aviso">×</button></div>}
    <ListadoMaestro<AjusteInventarioMototaxi> variante="tarjetas" titulo="Ajustes de inventario" descripcion="Reconcilia las unidades por modelo e identifica cada diferencia con su VIN." registros={ajustes} paginacion={{ modo: "local" }} cargando={cargando} error={!modal ? error || undefined : undefined} columnas={1} controlesCabecera={<>{puedeAjustar && <RegistrarAccionPrincipal etiqueta="Crear ajuste de inventario de mototaxis" onClick={abrir} />}</>} vacio={<span>Aún no hay reconteos registrados.</span>} renderizarTarjeta={(ajuste) => {
      const nuevas = ajuste.diferencias.filter((d) => d.tipo === "NUEVA");
      const faltantes = ajuste.diferencias.filter((d) => d.tipo === "FALTANTE");
      const recuperadas = ajuste.diferencias.filter((d) => d.tipo === "RECUPERADA");
      return <article key={ajuste.id}><div className="moto-stocktake-history-main"><strong>{ajuste.marca} {ajuste.modelo}{ajuste.version ? ` ${ajuste.version}` : ""}</strong><small>{ajuste.codigo} · {fecha(ajuste.creadoEn)} · {ajuste.motivo}</small></div><div className="moto-stocktake-counts"><span>Sistema <b>{ajuste.cantidadSistema}</b></span><span>Conteo <b>{ajuste.cantidadContada}</b></span><span>Diferencia <b>{ajuste.cantidadContada - ajuste.cantidadSistema > 0 ? "+" : ""}{ajuste.cantidadContada - ajuste.cantidadSistema}</b></span></div><div className="moto-stocktake-differences">{nuevas.length > 0 && <div><b>Agregadas:</b> {nuevas.map((d) => d.vin).join(", ")}</div>}{faltantes.length > 0 && <div><b>No encontradas:</b> {faltantes.map((d) => d.vin).join(", ")}</div>}{recuperadas.length > 0 && <div><b>Recuperadas:</b> {recuperadas.map((d) => d.vin).join(", ")}</div>}{!nuevas.length && !faltantes.length && !recuperadas.length && <span>Sin diferencias</span>}</div>{ajuste.observacion && <p>{ajuste.observacion}</p>}</article>;
    }} />
    {modal && <div className="catalog-modal-backdrop moto-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}><form role="dialog" aria-modal="true" aria-labelledby="moto-stocktake-title" className="catalog-modal moto-modal moto-stocktake-modal" onSubmit={(evento) => void guardar(evento)}>
      <div className="moto-modal-title"><div><h2 id="moto-stocktake-title">Nuevo reconteo de mototaxis</h2><p>Selecciona un modelo y registra las unidades físicas por VIN.</p></div><button type="button" aria-label="Cerrar formulario" onClick={cerrar}>×</button></div>
      <label>Modelo<select required value={modeloId} onChange={(evento) => setModeloId(evento.target.value)}><option value="">Selecciona un modelo</option>{modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.marca} {modelo.nombre}{modelo.version ? ` ${modelo.version}` : ""}</option>)}</select></label>
      {cargandoReconteo && <div className="moto-stocktake-loading">Consultando inventario del modelo…</div>}
      {reconteo && <><section className="moto-stocktake-counter" aria-live="polite"><div><span>Registradas en sistema</span><strong>{reconteo.cantidadSistema}</strong></div><div><span>Contadas físicamente</span><strong>{cantidadContada}</strong></div><div className={diferencia === 0 ? "is-even" : diferencia > 0 ? "is-surplus" : "is-shortage"}><span>Diferencia</span><strong>{diferencia > 0 ? "+" : ""}{diferencia}</strong></div></section>
        <fieldset className="moto-stocktake-existing"><legend>VIN registrados · marca las unidades que encontraste</legend>{reconteo.unidades.length ? <div className="moto-stocktake-unit-list">{reconteo.unidades.map((unidad) => <label key={unidad.id}><input type="checkbox" checked={unidadesEncontradas.includes(unidad.id)} onChange={() => alternarUnidad(unidad.id)} /><span><strong>{unidad.vin}</strong><small>{unidad.codigo} · Motor {unidad.numeroMotor} · {unidad.estado.replaceAll("_", " ")}</small></span></label>)}</div> : <p className="moto-stocktake-empty">No hay unidades registradas para este modelo. Agrega los VIN que encontraste.</p>}</fieldset>
        <section className="moto-stocktake-new-units"><div className="moto-stocktake-section-title"><div><h3>VIN nuevos encontrados</h3><p>Agrega cada unidad que no existe en el sistema.</p></div><button type="button" onClick={() => setUnidadesNuevas((actuales) => [...actuales, nuevaUnidad()])}>Agregar VIN</button></div>
          {unidadesNuevas.map((unidad, indice) => <fieldset className="moto-stocktake-new-unit" key={indice}><legend>Mototaxi nueva #{indice + 1}</legend><button type="button" aria-label={`Quitar VIN nuevo ${indice + 1}`} onClick={() => setUnidadesNuevas((actuales) => actuales.filter((_, i) => i !== indice))}>Quitar</button><div className="moto-stocktake-new-fields"><label>VIN<input required maxLength={40} value={unidad.vin} onChange={(evento) => actualizarNueva(indice, "vin", evento.target.value)} /></label><label>Número de motor<input required maxLength={100} value={unidad.numeroMotor} onChange={(evento) => actualizarNueva(indice, "numeroMotor", evento.target.value)} /></label><label>Costo de adquisición (S/)<input required type="number" min="0.01" step="0.01" value={unidad.costoAdquisicion} onChange={(evento) => actualizarNueva(indice, "costoAdquisicion", evento.target.value)} /></label><label>Número de chasis (opcional)<input maxLength={100} value={unidad.numeroChasis} onChange={(evento) => actualizarNueva(indice, "numeroChasis", evento.target.value)} /></label><label>Año modelo<input type="number" min="1990" max="2100" value={unidad.anioModelo} onChange={(evento) => actualizarNueva(indice, "anioModelo", evento.target.value)} /></label><label>Color<input maxLength={60} value={unidad.color} onChange={(evento) => actualizarNueva(indice, "color", evento.target.value)} /></label></div></fieldset>)}
        </section>
        <label>Motivo del reconteo<input required maxLength={120} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. inventario físico de almacén" /></label><label>Observación (opcional)<textarea rows={3} maxLength={2000} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
      </>}
      {error && <div className="catalog-alert" role="alert">{error}</div>}
      <footer><button type="button" disabled={guardando} onClick={cerrar}>Cancelar</button><button className="moto-primary" disabled={guardando || cargandoReconteo || !reconteo || !modeloId} type="submit">{guardando ? "Guardando ajuste…" : "Registrar ajuste"}</button></footer>
    </form></div>}
  </section>;
}
