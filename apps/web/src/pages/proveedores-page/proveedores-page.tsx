import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIdentidad } from "../../services/identidad.service";
import { servicioProveedores, type DatosProveedorNuevo, type ProveedorRegistrado } from "../../services/proveedores.service";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { Etiqueta } from "../../components/ui/etiqueta";
import { anchoMinimoColumnaRelacionClasses, nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

const nombreDe = (proveedor: ProveedorRegistrado) => proveedor.nombre || proveedor.razonSocial || [proveedor.nombres, proveedor.apellidoPaterno, proveedor.apellidoMaterno].filter(Boolean).join(" ");

const clase = {
  page: "grid gap-[18px] px-[clamp(18px,4vw,54px)] pt-7 pb-10 text-[var(--blue-deep,#163a60)] [html[data-responsive-profile='mobile-portrait']_&]:px-[14px] [html[data-responsive-profile='mobile-portrait']_&]:pt-5 [html[data-responsive-profile='mobile-portrait']_&]:pb-[30px]",
  heading: "hidden items-center justify-between gap-5 border-b border-[#dce5ee] pb-[18px] [html[data-responsive-profile='mobile-portrait']_&]:items-start [html[data-responsive-profile='mobile-portrait']_&]:flex-col",
  kicker: "text-[10px] font-extrabold tracking-[.14em] text-[#7187a0]",
  success: "flex justify-between rounded-[10px] bg-[#edf8f1] px-[14px] py-3 text-[13px] text-[#276b49]",
  successClose: "cursor-pointer border-0 bg-transparent text-[18px] text-inherit focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3784bd55]",
  card: "flex min-w-0 items-center gap-3 rounded-[13px] border border-[#dce5ee] bg-white p-4 shadow-[0_4px_14px_#17345108]",
  cardTitle: "mb-[5px] mt-0 text-sm",
  cardDetail: "my-0 block text-[11px] text-[#72849a]",
  tag: "ml-auto whitespace-nowrap rounded-[20px] bg-[#eaf5ef] px-2 py-[5px] text-[10px] font-[750] text-[#24724f]",
  backdrop: "fixed inset-0 z-[80] grid place-items-center overflow-y-auto overscroll-contain bg-[#071a2d80] p-5 [html[data-responsive-profile='mobile-portrait']_&]:items-end [html[data-responsive-profile='mobile-portrait']_&]:p-2",
  form: "max-h-[calc(100vh-40px)] w-full max-w-[620px] overflow-auto overscroll-contain rounded-2xl border border-[#dce5ee] bg-white p-[22px] shadow-[0_22px_70px_#061a2d40] [scrollbar-gutter:stable] [html[data-responsive-profile='mobile-portrait']_&]:max-h-[calc(100dvh-16px)] [html[data-responsive-profile='mobile-portrait']_&]:rounded-[16px_16px_10px_10px] [html[data-responsive-profile='mobile-portrait']_&]:p-4",
  formHeader: "sticky top-[-22px] z-[1] -mx-[22px] -mt-[22px] mb-[18px] flex items-center justify-between border-b border-[#e8eef4] bg-inherit px-[22px] pt-[22px] pb-[14px] [html[data-responsive-profile='mobile-portrait']_&]:top-[-16px] [html[data-responsive-profile='mobile-portrait']_&]:-mx-4 [html[data-responsive-profile='mobile-portrait']_&]:-mt-4 [html[data-responsive-profile='mobile-portrait']_&]:mb-[14px] [html[data-responsive-profile='mobile-portrait']_&]:px-4 [html[data-responsive-profile='mobile-portrait']_&]:pt-4 [html[data-responsive-profile='mobile-portrait']_&]:pb-3",
  formClose: "h-[38px] w-[38px] cursor-pointer rounded-[9px] border border-[#dce5ee] bg-white text-xl text-[#58708a] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3784bd55]",
  fields: "grid grid-cols-2 gap-[14px] [html[data-responsive-profile='mobile-portrait']_&]:grid-cols-1",
  label: "grid gap-1.5 text-xs font-bold text-[#526981]",
  documentRow: "flex gap-2",
  input: "min-h-[42px] w-full rounded-[9px] border border-[#d5e0ea] bg-white px-3 text-[13px] text-[#1c3652] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3784bd55] disabled:opacity-50",
  search: "min-w-24 cursor-pointer rounded-[9px] border border-[#c7d8e7] bg-[#f4f8fb] font-[750] text-[#174f88] hover:bg-[#edf4f9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3784bd55]",
  wide: "col-span-2 [html[data-responsive-profile='mobile-portrait']_&]:col-span-1",
  alert: "rounded-[10px] bg-[#fff0ef] px-[14px] py-3 text-[13px] text-[#a3382f]",
  footer: "sticky bottom-[-22px] -mx-[22px] -mb-[22px] mt-5 flex justify-end gap-[9px] border-t border-[#e8eef4] bg-inherit px-[22px] pt-[14px] pb-[22px] [html[data-responsive-profile='mobile-portrait']_&]:bottom-[-16px] [html[data-responsive-profile='mobile-portrait']_&]:-mx-4 [html[data-responsive-profile='mobile-portrait']_&]:-mb-4 [html[data-responsive-profile='mobile-portrait']_&]:mt-[14px] [html[data-responsive-profile='mobile-portrait']_&]:px-4 [html[data-responsive-profile='mobile-portrait']_&]:pt-3 [html[data-responsive-profile='mobile-portrait']_&]:pb-4",
  cancel: "cursor-pointer rounded-[9px] border border-[#d5e0ea] bg-white px-[14px] text-[#49627b] hover:bg-[#f7f9fb] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3784bd55]",
  primary: "min-h-10 cursor-pointer rounded-[10px] border border-[var(--action-primary-border)] bg-[var(--action-primary-surface)] px-[14px] text-xs font-[750] text-[var(--action-primary)] hover:border-[var(--action-primary-border)] hover:bg-[var(--action-primary-hover-surface)] hover:text-[var(--action-primary-hover)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-primary-focus)] disabled:cursor-wait disabled:opacity-[.65]",
};

export function ProveedoresPage({ puedeCrear }: { puedeCrear: boolean }) {
  const navegar = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorRegistrado[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(() => tamanioListadoSegunPantalla(window.innerWidth, "tabla"));
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const resultado = await servicioProveedores.listarPaginado(pagina, porPagina, busqueda); setProveedores(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio."); }
    finally { setCargando(false); }
  }, [busqueda, navegar, pagina, porPagina]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), busqueda ? 180 : 0); return () => window.clearTimeout(timer); }, [cargar]);

  async function guardar(datos: DatosProveedorNuevo) {
    try { await servicioProveedores.crear(datos); setAbierto(false); setExito("Proveedor registrado y disponible para las compras."); await cargar(); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo registrar el proveedor."; }
  }

  return <section className="min-w-0">
    {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
    <ListadoMaestro<ProveedorRegistrado> variante="tabla" titulo="Directorio de proveedores" registros={proveedores} cargando={cargando} error={error || undefined} resetKey={busqueda} paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }} controlesCabecera={<><label className="listado-maestro-busqueda">Buscar por nombre o documento<input id="proveedores-search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} placeholder="Nombre, DNI o RUC" /></label>{puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear proveedor" onClick={() => { setError(""); setAbierto(true); }} />}</>} vacio={<><strong>{busqueda ? "No hay coincidencias" : "Aún no hay proveedores registrados"}</strong><span>Los proveedores registrados aquí también estarán disponibles al registrar compras.</span></>} encabezadoTabla={<tr><th>Proveedor</th><th>Documento</th><th>Razón social</th><th>Tipo</th></tr>} renderizarFila={(proveedor) => <tr key={proveedor.id}><td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}><strong className={nombreRelacionListadoClasses}>{nombreDe(proveedor)}</strong></td><td>{proveedor.tipoDocumento} · {proveedor.numeroDocumento}</td><td className="min-w-[210px] w-[22%]"><span className={nombreRelacionListadoClasses}>{proveedor.razonSocial || "—"}</span></td><td><Etiqueta tono="marca">Proveedor</Etiqueta></td></tr>} />
    {abierto && createPortal(<FormularioProveedor onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
  </section>;
}

function FormularioProveedor({ onGuardar, onCerrar }: { onGuardar: (datos: DatosProveedorNuevo) => Promise<string | null>; onCerrar: () => void }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(dialogoRef, onCerrar, "el proveedor");
  useDialogoFlotante(dialogoRef, true, solicitarCancelacion);
  const [tipoDocumento, setTipoDocumento] = useState<"DNI" | "RUC">("RUC");
  const [numeroDocumento, setNumeroDocumento] = useState(""); const [razonSocial, setRazonSocial] = useState(""); const [nombres, setNombres] = useState(""); const [apellidoPaterno, setApellidoPaterno] = useState(""); const [apellidoMaterno, setApellidoMaterno] = useState(""); const [nombreComercial, setNombreComercial] = useState("");
  const [buscando, setBuscando] = useState(false); const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  const esJuridica = tipoDocumento === "RUC" && numeroDocumento.startsWith("20");
  async function buscarIdentidad() {
    setBuscando(true); setError("");
    try { const identidad = await servicioIdentidad.consultar(tipoDocumento, numeroDocumento); setRazonSocial(identidad.razonSocial ?? ""); setNombres(identidad.nombres ?? ""); setApellidoPaterno(identidad.apellidoPaterno ?? ""); setApellidoMaterno(identidad.apellidoMaterno ?? ""); if (identidad.razonSocial && !nombreComercial) setNombreComercial(identidad.razonSocial); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscando(false); }
  }
  async function submit(evento: FormEvent) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datos: DatosProveedorNuevo = { tipoDocumento, numeroDocumento, ...(esJuridica ? { razonSocial } : { nombres, apellidoPaterno, apellidoMaterno }), nombreComercial };
    const resultado = await onGuardar(datos); if (resultado) setError(resultado); setGuardando(false);
  }
  return <>{dialogo}<Dialogo
      kicker="DIRECTORIO COMERCIAL"
      titulo="Registrar proveedor"
      ancho="md"
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className={clase.cancel} type="button" onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="proveedor-form" className={clase.primary} disabled={guardando}>{guardando ? "Guardando…" : "Guardar proveedor"}</button></>}
    >
      <form id="proveedor-form" ref={dialogoRef} className="grid gap-4" onSubmit={(evento) => void submit(evento)}>
        <div className={clase.fields}><label className={clase.label}>Documento<select className={clase.input} disabled={buscando} value={tipoDocumento} onChange={(evento) => { setTipoDocumento(evento.target.value as "DNI" | "RUC"); setNumeroDocumento(""); setRazonSocial(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno(""); }}><option value="RUC">RUC</option><option value="DNI">DNI</option></select></label><label className={clase.label}>Número de documento<div className={clase.documentRow}><input className={clase.input} required disabled={buscando} inputMode="numeric" maxLength={tipoDocumento === "DNI" ? 8 : 11} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{11}"} value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value.replace(/\D/g, ""))} /><button className={clase.search} type="button" disabled={buscando || numeroDocumento.length !== (tipoDocumento === "DNI" ? 8 : 11)} onClick={() => void buscarIdentidad()}>{buscando ? "Buscando…" : "Buscar"}</button></div></label>
      {esJuridica ? <label className={`${clase.label} ${clase.wide}`}>Razón social<input className={clase.input} required maxLength={180} value={razonSocial} onChange={(evento) => setRazonSocial(evento.target.value)} /></label> : <><label className={clase.label}>Nombres<input className={clase.input} required maxLength={120} value={nombres} onChange={(evento) => setNombres(evento.target.value)} /></label><label className={clase.label}>Apellido paterno<input className={clase.input} required maxLength={120} value={apellidoPaterno} onChange={(evento) => setApellidoPaterno(evento.target.value)} /></label><label className={clase.label}>Apellido materno<input className={clase.input} maxLength={120} value={apellidoMaterno} onChange={(evento) => setApellidoMaterno(evento.target.value)} /></label></>}
      <label className={`${clase.label} ${clase.wide}`}>Nombre comercial<input className={clase.input} maxLength={180} value={nombreComercial} onChange={(evento) => setNombreComercial(evento.target.value)} placeholder="Opcional" /></label>
    </div>{error && <NotificacionFlotante mensaje={error} />}
      </form>
    </Dialogo></>;
}
