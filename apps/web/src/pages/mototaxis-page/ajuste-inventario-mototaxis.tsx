import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AjusteInventarioMototaxi, type ModeloMototaxi, type ReconteoModeloMototaxi } from "../../services/mototaxis.service";

const fecha = (valor: string) => new Date(valor).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function AjusteInventarioMototaxis({ puedeAjustar }: { puedeAjustar: boolean }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventarioMototaxi[]>([]);
  const [reconteo, setReconteo] = useState<ReconteoModeloMototaxi | null>(null);
  const [modeloId, setModeloId] = useState("");
  const [cantidadContada, setCantidadContada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoReconteo, setCargandoReconteo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useDialogoFlotante(dialogoRef, modal, () => { if (!guardando) cerrar(); });

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
    if (!modal || !modeloId) { setReconteo(null); setCantidadContada(""); return; }
    let vigente = true;
    setCargandoReconteo(true); setError("");
    void servicioMototaxis.reconteoModelo(modeloId).then((resultado) => {
      if (vigente) { setReconteo(resultado); setCantidadContada(String(resultado.cantidadSistema)); }
    }).catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo consultar el inventario del modelo."); })
      .finally(() => { if (vigente) setCargandoReconteo(false); });
    return () => { vigente = false; };
  }, [modeloId, modal]);
  function abrir() { setModeloId(""); setReconteo(null); setCantidadContada(""); setMotivo(""); setObservacion(""); setError(""); setAviso(""); setModal(true); }
  function cerrar() { if (guardando) return; setModal(false); }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cantidad = Number(cantidadContada);
    if (!reconteo || !Number.isInteger(cantidad) || cantidad < 0) { setError("Ingresa una cantidad entera igual o mayor que cero."); return; }
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId, cantidadContada: cantidad, motivo, observacion });
      setModal(false); setAviso(`Ajuste ${resultado.codigo} registrado: ${resultado.cantidadContada} mototaxis contadas para el modelo.`); await cargar();
    } catch (problema) { setError(problema instanceof ErrorApi ? problema.message : problema instanceof Error ? problema.message : "No se pudo registrar el ajuste."); }
    finally { setGuardando(false); }
  }

  const cantidad = Number(cantidadContada) || 0;
  const diferencia = cantidad - (reconteo?.cantidadSistema ?? 0);
  return <section className="moto-panel moto-stocktake-page">
    {aviso && <div className="moto-stocktake-notice" role="status">{aviso}<button type="button" onClick={() => setAviso("")} aria-label="Cerrar aviso">×</button></div>}
    <ListadoMaestro<AjusteInventarioMototaxi> variante="tarjetas" titulo="Ajustes de inventario" descripcion="Registra y consulta cantidades contadas por modelo." registros={ajustes} paginacion={{ modo: "local" }} cargando={cargando} error={!modal ? error || undefined : undefined} columnas={1} controlesCabecera={<>{puedeAjustar && <RegistrarAccionPrincipal etiqueta="Crear ajuste de inventario de mototaxis" onClick={abrir} />}</>} vacio={<span>Aún no hay reconteos registrados.</span>} renderizarTarjeta={(ajuste) => <article key={ajuste.id}><div className="moto-stocktake-history-main"><strong>{ajuste.marca} {ajuste.modelo}{ajuste.version ? ` ${ajuste.version}` : ""}</strong><small>{ajuste.codigo} · {fecha(ajuste.creadoEn)} · {ajuste.motivo}</small></div><div className="moto-stocktake-counts"><span>Sistema <b>{ajuste.cantidadSistema}</b></span><span>Conteo <b>{ajuste.cantidadContada}</b></span><span>Diferencia <b>{ajuste.cantidadContada - ajuste.cantidadSistema > 0 ? "+" : ""}{ajuste.cantidadContada - ajuste.cantidadSistema}</b></span></div>{ajuste.observacion && <p>{ajuste.observacion}</p>}</article>} />
    {modal && createPortal(<div className="catalog-modal-backdrop moto-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}><form ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="moto-stocktake-title" className="catalog-modal moto-modal moto-stocktake-modal" onSubmit={(evento) => void guardar(evento)}>
      <div className="moto-modal-title"><div><h2 id="moto-stocktake-title">Nuevo ajuste de inventario</h2><p>Indica cuántas unidades hay del modelo seleccionado.</p></div><button type="button" aria-label="Cerrar formulario" onClick={cerrar}>×</button></div>
      <div className="moto-stocktake-body">
        <label>Modelo<select required value={modeloId} onChange={(evento) => setModeloId(evento.target.value)}><option value="">Selecciona un modelo</option>{modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.marca} {modelo.nombre}{modelo.version ? ` ${modelo.version}` : ""}</option>)}</select></label>
        {cargandoReconteo && <div className="moto-stocktake-loading">Consultando inventario del modelo…</div>}
        {reconteo && <><section className="moto-stocktake-counter" aria-live="polite"><div><span>Cantidad en sistema</span><strong>{reconteo.cantidadSistema}</strong></div><div><span>Cantidad contada</span><strong>{cantidad}</strong></div><div className={diferencia === 0 ? "is-even" : diferencia > 0 ? "is-surplus" : "is-shortage"}><span>Diferencia</span><strong>{diferencia > 0 ? "+" : ""}{diferencia}</strong></div></section>
          <label>Cantidad de mototaxis contadas<input required type="number" min="0" step="1" inputMode="numeric" value={cantidadContada} onChange={(evento) => setCantidadContada(evento.target.value)} /></label>
          <p className="moto-stocktake-hint">Registra el total encontrado para este modelo. No es necesario identificar cada unidad.</p>
          <label>Motivo del ajuste<input required maxLength={120} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. inventario físico de almacén" /></label>
          <label>Observación (opcional)<textarea rows={3} maxLength={2000} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
        </>}
        {error && <div className="catalog-alert" role="alert">{error}</div>}
      </div>
      <footer><button type="button" disabled={guardando} onClick={cerrar}>Cancelar</button><button className="moto-primary" disabled={guardando || cargandoReconteo || !reconteo || !modeloId} type="submit">{guardando ? "Guardando ajuste…" : "Registrar ajuste"}</button></footer>
    </form></div>, document.body)}
  </section>;
}
