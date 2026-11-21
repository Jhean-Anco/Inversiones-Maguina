import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";
import { Button } from "../../components/ui/button";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { clasesCamposPrecio, DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi } from "../../services/api-cliente";
import { servicioConductores, type Conductor, type DatosConductor } from "../../services/conductores.service";

const nombreDe = (conductor: Conductor) => [conductor.nombres, conductor.apellidoPaterno, conductor.apellidoMaterno].filter(Boolean).join(" ");
const tipoVisible = (tipo: Conductor["tipoDocumento"]) => ({ DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" })[tipo];

export function ConductoresPage({ puedeCrear = false, puedeEditar = false }: { puedeCrear?: boolean; puedeEditar?: boolean }) {
  const navegar = useNavigate();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(() => tamanioListadoSegunPantalla(window.innerWidth, "tabla"));
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Conductor | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [actualizar, setActualizar] = useState(0);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const resultado = await servicioConductores.listarPaginado(pagina, porPagina, busqueda); setConductores(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio de conductores."); }
    finally { setCargando(false); }
  }, [busqueda, navegar, pagina, porPagina]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), busqueda ? 180 : 0); return () => window.clearTimeout(timer); }, [cargar, actualizar]);

  async function guardar(datos: DatosConductor) {
    try { await servicioConductores.crear(datos); setAbierto(false); setBusqueda(datos.numeroDocumento); setPagina(1); setActualizar((valor) => valor + 1); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo crear el conductor."; }
  }

  async function editar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || guardandoEdicion) return;
    const campos = new FormData(evento.currentTarget);
    setGuardandoEdicion(true); setErrorEdicion("");
    try {
      await servicioConductores.actualizar(editando.id, { numeroLicencia: String(campos.get("numeroLicencia")), telefono: String(campos.get("telefono")) });
      setEditando(null); setActualizar((valor) => valor + 1);
    } catch (problema) {
      setErrorEdicion(problema instanceof Error ? problema.message : "No se pudo actualizar el conductor.");
    } finally { setGuardandoEdicion(false); }
  }

  return <section className="min-w-0">
    <ListadoMaestro<Conductor>
      variante="tabla" titulo="Directorio de conductores" descripcion="Licencias disponibles para las guías de remisión."
      registros={conductores} cargando={cargando} error={error || undefined} resetKey={busqueda}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      controlesCabecera={<>
        <label className="listado-maestro-busqueda">Buscar conductor<input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} placeholder="Nombre, documento o licencia" /></label>
        {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear conductor" onClick={() => { setError(""); setAbierto(true); }} />}
      </>}
      vacio="No hay conductores para mostrar."
      encabezadoTabla={<tr><th>Conductor</th><th>Documento</th><th>Licencia</th><th>Teléfono</th>{puedeEditar && <th>Acciones</th>}</tr>}
      renderizarFila={(conductor) => <tr key={conductor.id}>
        <td><strong className={nombreRelacionListadoClasses}>{nombreDe(conductor)}</strong></td>
        <td>{tipoVisible(conductor.tipoDocumento)} · {conductor.numeroDocumento}</td>
        <td>{conductor.numeroLicencia}</td><td>{conductor.telefono ?? "—"}</td>
        {puedeEditar && <td><BotonEditarConfirmacion titulo="¿Editar los datos del conductor?" descripcion={`Vas a editar la licencia y el teléfono de ${nombreDe(conductor)}. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver al listado" etiquetaConfirmar="Sí, editar conductor" onConfirmar={() => { setErrorEdicion(""); setEditando(conductor); }}><Button size="sm" variant="outline">Editar licencia</Button></BotonEditarConfirmacion></td>}
      </tr>}
    />
    {editando && <DialogoCatalogo titulo="Editar datos del conductor" articulo={nombreDe(editando)} codigo={editando.numeroDocumento} alCerrar={() => setEditando(null)} guardando={guardandoEdicion} acciones={<Button type="submit" form="editar-conductor" disabled={guardandoEdicion}>Guardar cambios</Button>}>
      <form id="editar-conductor" onSubmit={(evento) => void editar(evento)}>
        <div className={clasesCamposPrecio}>
          <label>Número de licencia<input name="numeroLicencia" defaultValue={editando.numeroLicencia} required maxLength={10} /></label>
          <label>Teléfono<input name="telefono" type="tel" defaultValue={editando.telefono ?? ""} maxLength={30} /></label>
        </div>
        {errorEdicion && <p role="alert">{errorEdicion}</p>}
      </form>
    </DialogoCatalogo>}
    {abierto && createPortal(<FormularioConductor onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
  </section>;
}

function FormularioConductor({ onGuardar, onCerrar }: { onGuardar: (datos: DatosConductor) => Promise<string | null>; onCerrar: () => void }) {
  const referencia = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(referencia, onCerrar, "el conductor");
  useDialogoFlotante(referencia, true, solicitarCancelacion);
  const [tipoDocumento, setTipoDocumento] = useState<DatosConductor["tipoDocumento"]>("DNI");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  async function submit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datosForm = new FormData(evento.currentTarget);
    const datos: DatosConductor = { tipoDocumento, numeroDocumento: String(datosForm.get("numeroDocumento") ?? "").trim(), nombres: String(datosForm.get("nombres") ?? "").trim(), apellidoPaterno: String(datosForm.get("apellidoPaterno") ?? "").trim(), apellidoMaterno: String(datosForm.get("apellidoMaterno") ?? "").trim() || undefined, numeroLicencia: String(datosForm.get("numeroLicencia") ?? "").trim(), telefono: String(datosForm.get("telefono") ?? "").trim() || undefined };
    const resultado = await onGuardar(datos); if (resultado) setError(resultado); setGuardando(false);
  }
  const maxDocumento = tipoDocumento === "DNI" ? 8 : 15;
  return <>{dialogo}<div className="conductores-backdrop fixed inset-0 z-[180] grid place-items-center overflow-y-auto bg-[#071a2d80] p-5" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) solicitarCancelacion(); }}><form ref={referencia} className="conductores-form max-h-[calc(100dvh-40px)] w-full max-w-[620px] overflow-auto rounded-2xl border border-[#dce5ee] bg-white p-[22px] shadow-[0_22px_70px_#061a2d40]" role="dialog" aria-modal="true" aria-labelledby="conductor-form-title" onSubmit={(evento) => void submit(evento)}>
    <header className="inventario-dialogo-cabecera -mx-[22px] -mt-[22px] mb-[18px] flex items-center justify-between px-[22px] py-4"><div><h2 className="mb-0 mt-1 text-xl" id="conductor-form-title">Crear conductor</h2></div><button className="h-[38px] w-[38px] rounded-[9px] border border-[#dce5ee] bg-white text-xl text-[#58708a]" type="button" aria-label="Cerrar" onClick={solicitarCancelacion}>×</button></header>
    <div className="conductores-fields grid grid-cols-2 gap-[14px] [html[data-responsive-profile=mobile-portrait]_&]:grid-cols-1 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-bold [&_label]:text-[#526981]"><label>Tipo de documento<select className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" value={tipoDocumento} onChange={(evento) => setTipoDocumento(evento.target.value as DatosConductor["tipoDocumento"])}><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label><label>Número de documento<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="numeroDocumento" required maxLength={maxDocumento} inputMode={tipoDocumento === "DNI" ? "numeric" : "text"} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : tipoDocumento === "CE" ? "[A-Za-z0-9-]{6,15}" : "[A-Za-z0-9-]{5,15}"} /></label><label>Nombres<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="nombres" required maxLength={120} /></label><label>Apellido paterno<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="apellidoPaterno" required maxLength={120} /></label><label>Apellido materno<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="apellidoMaterno" maxLength={120} /></label><label>Número de licencia<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="numeroLicencia" required maxLength={10} /></label><label className="col-span-2 [html[data-responsive-profile=mobile-portrait]_&]:col-span-1">Teléfono (opcional)<input className="min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652]" name="telefono" maxLength={30} /></label></div>
    {error && <NotificacionFlotante mensaje={error} />}<footer className="mt-5 flex justify-end gap-[9px]"><button className="cursor-pointer rounded-[9px] border border-[#d5e0ea] bg-white px-[14px] text-[#49627b] font-bold" type="button" onClick={solicitarCancelacion}>Cancelar</button><button type="submit" className="min-h-10 cursor-pointer rounded-[10px] border border-[var(--action-primary-border)] bg-[var(--action-primary-surface)] px-[14px] text-xs font-bold text-[var(--action-primary)] disabled:cursor-wait disabled:opacity-[.65]" disabled={guardando}>{guardando ? "Guardando…" : "Crear conductor"}</button></footer>
  </form></div></>;
}
