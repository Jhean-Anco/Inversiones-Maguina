import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi } from "../../services/api-cliente";
import { servicioConductores, type Conductor, type DatosConductor } from "../../services/conductores.service";
import "./conductores-page.css";

const nombreDe = (conductor: Conductor) => [conductor.nombres, conductor.apellidoPaterno, conductor.apellidoMaterno].filter(Boolean).join(" ");
const tipoVisible = (tipo: Conductor["tipoDocumento"]) => ({ DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" })[tipo];

export function ConductoresPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const navegar = useNavigate();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(() => tamanioListadoSegunPantalla(window.innerWidth, "tarjetas"));
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [actualizar, setActualizar] = useState(0);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const resultado = await servicioConductores.listarPaginado(pagina, porPagina, busqueda); setConductores(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio de conductores."); }
    finally { setCargando(false); }
  }, [busqueda, navegar, pagina, porPagina]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), 180); return () => window.clearTimeout(timer); }, [cargar, actualizar]);

  async function guardar(datos: DatosConductor) {
    try { await servicioConductores.crear(datos); setAbierto(false); setBusqueda(datos.numeroDocumento); setPagina(1); setActualizar((valor) => valor + 1); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo crear el conductor."; }
  }

  return <section className="conductores-page">
    <header className="conductores-heading"><div><span className="conductores-kicker">CONTACTOS COMERCIALES</span><h1>Conductores</h1><p>Directorio de conductores y licencias para las guías de remisión.</p></div>{puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear conductor" onClick={() => { setError(""); setAbierto(true); }} />}</header>
    <ListadoMaestro<Conductor> variante="tarjetas" titulo="Directorio de conductores" registros={conductores} cargando={cargando} error={error || undefined} columnas={2} resetKey={busqueda} paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }} controlesCabecera={<label className="listado-maestro-busqueda">Buscar conductor<input id="conductores-search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} placeholder="Nombre, documento o licencia" /></label>} vacio={<><strong>{busqueda ? "No hay coincidencias" : "Aún no hay conductores registrados"}</strong><span>Registra conductores para seleccionarlos al crear guías de remisión.</span></>} renderizarTarjeta={(conductor) => <article className="conductores-card" key={conductor.id}><span className="conductores-avatar" aria-hidden="true">{nombreDe(conductor).slice(0, 1).toLocaleUpperCase("es-PE")}</span><div className="conductores-info"><h2>{nombreDe(conductor)}</h2><p>{tipoVisible(conductor.tipoDocumento)} · {conductor.numeroDocumento}</p><small>Licencia {conductor.numeroLicencia}{conductor.telefono ? ` · ${conductor.telefono}` : ""}</small></div><span className="conductores-tag">Conductor</span></article>} />
    {abierto && createPortal(<FormularioConductor onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
  </section>;
}

function FormularioConductor({ onGuardar, onCerrar }: { onGuardar: (datos: DatosConductor) => Promise<string | null>; onCerrar: () => void }) {
  const referencia = useRef<HTMLFormElement>(null);
  useDialogoFlotante(referencia, true, onCerrar);
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
  return <div className="conductores-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) onCerrar(); }}><form ref={referencia} className="conductores-form" role="dialog" aria-modal="true" aria-labelledby="conductor-form-title" onSubmit={(evento) => void submit(evento)}>
    <header><div><span className="conductores-kicker">DIRECTORIO DE CONTACTOS</span><h2 id="conductor-form-title">Crear conductor</h2></div><button type="button" aria-label="Cerrar" onClick={onCerrar}>×</button></header>
    <div className="conductores-fields"><label>Tipo de documento<select value={tipoDocumento} onChange={(evento) => setTipoDocumento(evento.target.value as DatosConductor["tipoDocumento"])}><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label><label>Número de documento<input name="numeroDocumento" required maxLength={maxDocumento} inputMode={tipoDocumento === "DNI" ? "numeric" : "text"} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : tipoDocumento === "CE" ? "[A-Za-z0-9-]{6,15}" : "[A-Za-z0-9-]{5,15}"} /></label><label>Nombres<input name="nombres" required maxLength={120} /></label><label>Apellido paterno<input name="apellidoPaterno" required maxLength={120} /></label><label>Apellido materno<input name="apellidoMaterno" maxLength={120} /></label><label>Número de licencia<input name="numeroLicencia" required maxLength={10} /></label><label className="conductores-wide">Teléfono (opcional)<input name="telefono" maxLength={30} /></label></div>
    {error && <p className="conductores-alert" role="alert">{error}</p>}<footer><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="conductores-primary" disabled={guardando}>{guardando ? "Guardando…" : "Crear conductor"}</button></footer>
  </form></div>;
}
