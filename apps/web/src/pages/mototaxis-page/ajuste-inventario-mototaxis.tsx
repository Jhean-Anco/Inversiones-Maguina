import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AjusteInventarioMototaxi, type ModeloMototaxi, type ReconteoModeloMototaxi } from "../../services/mototaxis.service";

const fecha = (valor: string) => new Date(valor).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });

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
    setReconteo(null); setCantidadContada("");
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
    if (!reconteo || reconteo.modelo.id !== modeloId || !cantidadContada.trim() || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 2_147_483_647) { setError("Ingresa una cantidad entera igual o mayor que cero."); return; }
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId, cantidadSistema: reconteo.cantidadSistema, cantidadContada: cantidad, motivo, observacion });
      setModal(false); setAviso(`Ajuste ${resultado.codigo} aplicado. Saldo final: ${resultado.cantidadContada} mototaxis.`); await cargar();
    } catch (problema) { setError(problema instanceof ErrorApi ? problema.message : problema instanceof Error ? problema.message : "No se pudo registrar el ajuste."); }
    finally { setGuardando(false); }
  }

  const cantidad = Number(cantidadContada) || 0;
  const diferencia = cantidad - (reconteo?.cantidadSistema ?? 0);
  return <section className="moto-panel moto-stocktake-page">
    {aviso && <NotificacionFlotante tipo="advertencia" mensaje={aviso} onCerrar={() => setAviso("")} />}
    <ListadoMaestro<AjusteInventarioMototaxi> variante="tabla" titulo="Ajustes de inventario de mototaxis" descripcion="Registra y consulta cantidades contadas por modelo." registros={ajustes} paginacion={{ modo: "local" }} cargando={cargando} error={!modal ? error || undefined : undefined} controlesCabecera={<>{puedeAjustar && <RegistrarAccionPrincipal etiqueta="Nuevo ajuste de mototaxis" onClick={abrir} />}</>} vacio={<span>Aún no hay reconteos registrados.</span>} encabezadoTabla={<tr><th>Fecha y código</th><th>Modelo</th><th>Anterior</th><th>Conteo</th><th>Variación aplicada</th><th>Final</th><th>Motivo</th><th>Responsable</th><th>Observación</th></tr>} renderizarFila={(ajuste) => <tr key={ajuste.id}><td><strong>{ajuste.codigo}</strong><small>{fecha(ajuste.creadoEn)}</small></td><td>{ajuste.marca} {ajuste.modelo}{ajuste.version ? ` ${ajuste.version}` : ""}</td><td>{ajuste.cantidadSistema}</td><td>{ajuste.cantidadContada}</td><td>{ajuste.aplicado ? `${ajuste.cantidadContada - ajuste.cantidadSistema > 0 ? "+" : ""}${ajuste.cantidadContada - ajuste.cantidadSistema}` : "Histórico"}</td><td>{ajuste.aplicado ? ajuste.cantidadContada : "—"}</td><td>{ajuste.motivo}</td><td>{ajuste.usuario}</td><td>{ajuste.observacion || "—"}</td></tr>} />
    {modal && <Dialogo
      titulo="Nuevo ajuste de mototaxis"
      ancho="md"
      cerrable={!guardando}
      onCerrar={cerrar}
      pie={<><button type="button" disabled={guardando} onClick={cerrar}>Cancelar</button><button className="moto-primary" disabled={guardando || cargandoReconteo || !reconteo || !modeloId} type="submit" form="moto-stocktake-form">{guardando ? "Guardando ajuste…" : "Registrar ajuste"}</button></>}
    >
      <p className="m-0 -mt-2 text-[13px] text-[#52697d]">Indica cuántas unidades hay del modelo seleccionado.</p>
      <form id="moto-stocktake-form" ref={dialogoRef} className="grid gap-4" onSubmit={(evento) => void guardar(evento)}>
        <label>Modelo<select required value={modeloId} onChange={(evento) => setModeloId(evento.target.value)}><option value="">Selecciona un modelo</option>{modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.marca} {modelo.nombre}{modelo.version ? ` ${modelo.version}` : ""}</option>)}</select></label>
        {cargandoReconteo && <div className="moto-stocktake-loading">Consultando inventario del modelo…</div>}
        {reconteo && <><section className="moto-stocktake-counter" aria-live="polite"><div><span>Cantidad en sistema</span><strong>{reconteo.cantidadSistema}</strong></div><div><span>Cantidad contada</span><strong>{cantidad}</strong></div><div className={diferencia === 0 ? "is-even" : diferencia > 0 ? "is-surplus" : "is-shortage"}><span>Diferencia</span><strong>{diferencia > 0 ? "+" : ""}{diferencia}</strong></div></section>
          <label>Cantidad de mototaxis contadas<input required type="number" min="0" max="2147483647" step="1" inputMode="numeric" value={cantidadContada} onChange={(evento) => setCantidadContada(evento.target.value)} /></label>
          <p className="moto-stocktake-hint">La diferencia se aplicará a las existencias del modelo.</p>
          <label>Motivo del ajuste<input required minLength={2} maxLength={120} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. inventario físico de almacén" /></label>
          <label>Observación (opcional)<textarea rows={3} maxLength={2000} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
        </>}
        {error && <NotificacionFlotante mensaje={error} />}
      </form>
    </Dialogo>}
  </section>;
}
