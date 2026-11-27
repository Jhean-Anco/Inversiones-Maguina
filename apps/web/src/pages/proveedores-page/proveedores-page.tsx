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
import { servicioProveedores, type DatosProveedorNuevo, type FichaProveedor, type ProveedorRegistrado } from "../../services/proveedores.service";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Eye } from "lucide-react";
import { BuscadorDirectorio, directorioClasses, Opcional, SelectDirectorio } from "../../components/ui/directorio/directorio";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

const nombreDe = (proveedor: ProveedorRegistrado) => proveedor.nombre || proveedor.razonSocial || [proveedor.nombres, proveedor.apellidoPaterno, proveedor.apellidoMaterno].filter(Boolean).join(" ");


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
  const [proveedorEnDetalle, setProveedorEnDetalle] = useState<ProveedorRegistrado | null>(null);
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

  return <section className={v.page}>
    {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear proveedor" onClick={() => { setError(""); setAbierto(true); }} />}
    <div className={v.toolbar}>
      <BuscadorDirectorio id="proveedores-search" valor={busqueda} alCambiar={(valor) => { setBusqueda(valor); setPagina(1); }} placeholder="Buscar por nombre, DNI o RUC" etiqueta="Buscar proveedor" />
    </div>
    <ListadoMaestro<ProveedorRegistrado> variante="tabla" titulo="Directorio de proveedores"
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      registros={proveedores} cargando={cargando} error={error || undefined} resetKey={busqueda}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      vacio={<div className={v.empty}><strong>{busqueda ? "No hay coincidencias" : "Aún no hay proveedores registrados"}</strong><span>{busqueda ? "Revisa el nombre o documento." : "Los proveedores registrados aquí también estarán disponibles al registrar compras."}</span></div>}
      encabezadoTabla={<tr><th>Proveedor</th><th>Documento</th><th>Tipo</th><th>Acciones</th></tr>}
      renderizarFila={(proveedor) => {
        const nombre = nombreDe(proveedor);
        const esEmpresa = proveedor.tipoDocumento === "RUC" && proveedor.numeroDocumento.startsWith("20");
        return <tr key={proveedor.id}>
          <td><strong className={v.clientName}>{nombre}</strong><small className={v.minorText}>{proveedor.nombreComercial || "Sin nombre comercial"}</small></td>
          <td><strong className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{proveedor.numeroDocumento}</strong><small className={v.minorText}>{proveedor.tipoDocumento}</small></td>
          <td><span className={`${v.status} border-[#dbe3e9] bg-[#f3f6f9] text-[#3d566e]`}>{esEmpresa ? "Empresa" : "Persona"}</span></td>
          <td><div className={v.rowActions}><BotonAccion etiqueta={`Ver ficha de ${nombre}`} tono="neutral" icono={<Eye aria-hidden="true" />} onClick={() => setProveedorEnDetalle(proveedor)} /></div></td>
        </tr>;
      }} />
    {abierto && createPortal(<FormularioProveedor onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
    {proveedorEnDetalle && createPortal(<ProveedorFichaDialog proveedor={proveedorEnDetalle} onCerrar={() => setProveedorEnDetalle(null)} />, document.body)}
  </section>;
}

function ProveedorFichaDialog({ proveedor, onCerrar }: { proveedor: ProveedorRegistrado; onCerrar: () => void }) {
  const navegar = useNavigate();
  const [ficha, setFicha] = useState<FichaProveedor | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(true);
  const [errorFicha, setErrorFicha] = useState("");
  const [revisionFicha, setRevisionFicha] = useState(0);
  useEffect(() => {
    let vigente = true;
    setCargandoFicha(true);
    setErrorFicha("");
    void servicioProveedores.ficha(proveedor.id).then((resultado) => {
      if (vigente) setFicha(resultado);
    }).catch((problema: unknown) => {
      if (!vigente) return;
      if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true });
      else setErrorFicha(problema instanceof Error ? problema.message : "No se pudo cargar la ficha del proveedor.");
    }).finally(() => { if (vigente) setCargandoFicha(false); });
    return () => { vigente = false; };
  }, [navegar, proveedor.id, revisionFicha]);
  const datosProveedor = ficha?.proveedor ?? proveedor;
  const esEmpresa = datosProveedor.tipoDocumento === "RUC" && datosProveedor.numeroDocumento.startsWith("20");
  const nombre = nombreDe(datosProveedor);
  const iniciales = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toLocaleUpperCase("es-PE")).join("") || "PR";
  const resumen = ficha?.resumenCompras ?? [];
  const formatMoney = (importe: string, moneda: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(importe));
  const totalCompras = resumen.reduce((acumulado, item) => acumulado + item.compras, 0);

  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#071a2d80] p-4" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onCerrar(); }}>
    <section className="grid w-full max-w-[760px] gap-4 overflow-auto rounded-2xl border border-[#dce5ee] bg-white p-5 shadow-[0_22px_70px_#061a2d40] [max-height:calc(100dvh-24px)] [scrollbar-gutter:stable] mobile-portrait:rounded-[16px_16px_10px_10px] mobile-portrait:p-4" role="dialog" aria-modal="true" aria-labelledby="proveedor-ficha-titulo">
      <header className="flex items-start justify-between gap-4 border-b border-[#e8eef4] pb-4">
        <div className="grid min-w-0 gap-1"><small className="text-[10px] font-extrabold tracking-[.13em] text-[#647d97]">FICHA DEL PROVEEDOR</small><h2 id="proveedor-ficha-titulo" className="m-0 break-words text-xl font-extrabold text-[#153653]">{nombre}</h2></div>
        <button className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-[#dce5ee] bg-white text-xl text-[#58708a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83acd0]" type="button" aria-label="Cerrar ficha del proveedor" onClick={onCerrar}>×</button>
      </header>
      <div className="flex min-w-0 items-center gap-3 py-1">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0b376a] text-sm font-extrabold text-white" aria-hidden="true">{iniciales}</span>
        <div className="grid min-w-0 gap-1.5"><strong className="break-words text-sm font-bold text-[#153653]">{datosProveedor.nombreComercial || nombre}</strong><div className="flex flex-wrap gap-1.5"><span className="rounded-md border border-[#dce6ef] bg-[#f2f6f9] px-2 py-1 text-[10px] font-bold text-[#35536f]">{esEmpresa ? "Empresa / organización" : "Persona"}</span><span className="rounded-md border border-[#dce6ef] bg-[#f2f6f9] px-2 py-1 text-[10px] font-bold text-[#35536f]">{datosProveedor.tipoDocumento} {datosProveedor.numeroDocumento}</span></div></div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 mobile-portrait:grid-cols-1">
        <div className="grid min-w-0 gap-1.5 rounded-[11px] border border-[#e9eef3] bg-[#f7f9fb] p-3"><small className="text-[10px] font-bold text-[#7f8fa0]">DOCUMENTO</small><strong className="break-words text-xs font-semibold text-[#24435f]">{datosProveedor.tipoDocumento} {datosProveedor.numeroDocumento}</strong></div>
        <div className="grid min-w-0 gap-1.5 rounded-[11px] border border-[#e9eef3] bg-[#f7f9fb] p-3"><small className="text-[10px] font-bold text-[#7f8fa0]">TIPO DE PERSONA</small><strong className="break-words text-xs font-semibold text-[#24435f]">{esEmpresa ? "Empresa / organización" : "Persona"}</strong></div>
        <div className="grid min-w-0 gap-1.5 rounded-[11px] border border-[#e9eef3] bg-[#f7f9fb] p-3"><small className="text-[10px] font-bold text-[#7f8fa0]">RAZÓN SOCIAL / NOMBRE</small><strong className="break-words text-xs font-semibold text-[#24435f]">{datosProveedor.razonSocial || [datosProveedor.nombres, datosProveedor.apellidoPaterno, datosProveedor.apellidoMaterno].filter(Boolean).join(" ") || "—"}</strong></div>
        <div className="grid min-w-0 gap-1.5 rounded-[11px] border border-[#e9eef3] bg-[#f7f9fb] p-3"><small className="text-[10px] font-bold text-[#7f8fa0]">NOMBRE COMERCIAL</small><strong className="break-words text-xs font-semibold text-[#24435f]">{datosProveedor.nombreComercial || "Sin nombre comercial"}</strong></div>
      </div>
      {cargandoFicha ? <div className="rounded-[11px] border border-[#e9eef3] bg-[#f7f9fb] px-4 py-6 text-center text-xs text-[#60758a]" role="status">Cargando historial de compras…</div> : errorFicha ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#f0d4d2] bg-[#fff7f6] px-4 py-3 text-xs text-[#8f3533]" role="alert"><span>{errorFicha}</span><button type="button" className="rounded-md border border-[#dca9a6] bg-white px-3 py-2 font-bold" onClick={() => setRevisionFicha((actual) => actual + 1)}>Reintentar</button></div> : ficha && (!ficha.permisosCompras.repuestos && !ficha.permisosCompras.mototaxis) ? <p className="m-0 rounded-[10px] bg-[#f7f9fb] px-3 py-3 text-xs text-[#667c91]">Tu usuario no tiene permisos para consultar el historial de compras.</p> : ficha && <>
        <section className="grid grid-cols-3 gap-3 mobile-portrait:grid-cols-1" aria-label="Resumen de compras del proveedor">
          <div className="grid gap-1 rounded-[11px] border border-[#e2e9ef] bg-white p-3.5"><small className="text-[10px] font-extrabold tracking-[.08em] text-[#71849a]">COMPRAS</small><strong className="text-lg font-extrabold text-[#153653]">{totalCompras}</strong></div>
          <div className="grid gap-1 rounded-[11px] border border-[#e2e9ef] bg-white p-3.5"><small className="text-[10px] font-extrabold tracking-[.08em] text-[#71849a]">TOTAL COMPRADO</small>{resumen.length ? resumen.map((item) => <strong className="text-sm font-extrabold text-[#153653]" key={`total-${item.moneda}`}>{formatMoney(item.totalComprado, item.moneda)}</strong>) : <strong className="text-sm font-extrabold text-[#153653]">—</strong>}</div>
          <div className="grid gap-1 rounded-[11px] border border-[#e2e9ef] bg-white p-3.5"><small className="text-[10px] font-extrabold tracking-[.08em] text-[#71849a]">SALDO PENDIENTE</small>{resumen.length ? resumen.map((item) => <strong className="text-sm font-extrabold text-[#153653]" key={`saldo-${item.moneda}`}>{formatMoney(item.saldoPendiente, item.moneda)}</strong>) : <strong className="text-sm font-extrabold text-[#153653]">—</strong>}</div>
        </section>
        <section className="grid min-w-0 gap-2" aria-label="Historial de compras">
          <h3 className="m-0 text-xs font-extrabold tracking-[.09em] text-[#60758a]">COMPRAS RECIENTES</h3>
          <div className="min-w-0 overflow-x-auto rounded-[11px] border border-[#e1e8ef]"><table className="w-full min-w-[520px] border-collapse text-left text-xs"><thead className="bg-[#f4f7fa] text-[10px] font-extrabold tracking-[.07em] text-[#647b92]"><tr><th className="px-3 py-3">COMPRA</th><th className="px-3 py-3">FECHA</th><th className="px-3 py-3 text-right">TOTAL</th><th className="px-3 py-3">PAGO</th></tr></thead><tbody>{ficha.compras.map((compra) => <tr key={`${compra.origen}-${compra.id}`} className="border-t border-[#e8eef3] text-[#294863]"><td className="px-3 py-3 font-mono font-semibold">{compra.codigo}</td><td className="px-3 py-3">{new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${compra.fecha.slice(0, 10)}T00:00:00Z`))}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{formatMoney(compra.total, compra.moneda)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${compra.estadoPago === "PAGADA" ? "bg-[#eaf6ef] text-[#237047]" : compra.estadoPago === "SIN_PAGO" ? "bg-[#f2f4f6] text-[#53677a]" : "bg-[#fff4df] text-[#895910]"}`}>{compra.estadoPago === "PAGADA" ? "Pagada" : compra.estadoPago === "SIN_PAGO" ? "Sin pago" : "Saldo"}</span></td></tr>)}</tbody></table></div>
          {!ficha.compras.length && <p className="m-0 rounded-[10px] bg-[#f7f9fb] px-3 py-4 text-center text-xs text-[#667c91]">No hay compras vinculadas a este proveedor con los permisos disponibles.</p>}
        </section>
      </>}
      <footer className="flex justify-end border-t border-[#e8eef4] pt-3"><button className="min-h-10 cursor-pointer rounded-[9px] border border-[#d5e0ea] bg-white px-[14px] text-xs font-bold text-[#49627b] hover:bg-[#f7f9fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83acd0]" type="button" onClick={onCerrar}>Cerrar</button></footer>
    </section>
  </div>;
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
      pantallaCompletaMovil
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className="clientes-secondary-action" type="button" onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="proveedor-form" className="clientes-primary-action" disabled={guardando}>{guardando ? "Guardando…" : "Guardar proveedor"}</button></>}
    >
      <form id="proveedor-form" ref={dialogoRef} className="grid gap-4" onSubmit={(evento) => void submit(evento)}>
        <div className="directorio-form-grid">
      <label>Documento *<SelectDirectorio disabled={buscando} value={tipoDocumento} onChange={(evento) => { setTipoDocumento(evento.target.value as "DNI" | "RUC"); setNumeroDocumento(""); setRazonSocial(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno(""); }}><option value="RUC">RUC</option><option value="DNI">DNI</option></SelectDirectorio></label>
      <label>Número de documento *<span className="grid grid-cols-[minmax(0,1fr)_auto] gap-[7px]"><input required disabled={buscando} inputMode="numeric" maxLength={tipoDocumento === "DNI" ? 8 : 11} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{11}"} value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value.replace(/D/g, ""))} /><button className={directorioClasses.boton} type="button" disabled={buscando || numeroDocumento.length !== (tipoDocumento === "DNI" ? 8 : 11)} onClick={() => void buscarIdentidad()}>{buscando ? "Buscando…" : tipoDocumento === "RUC" ? "Consultar en SUNAT" : "Buscar"}</button></span></label>
      {esJuridica ? <label className="directorio-form-wide">Razón social *<input required maxLength={180} value={razonSocial} onChange={(evento) => setRazonSocial(evento.target.value)} /></label> : <><label>Nombres *<input required maxLength={120} value={nombres} onChange={(evento) => setNombres(evento.target.value)} /></label><label>Apellido paterno *<input required maxLength={120} value={apellidoPaterno} onChange={(evento) => setApellidoPaterno(evento.target.value)} /></label><label>Apellido materno <Opcional /><input maxLength={120} value={apellidoMaterno} onChange={(evento) => setApellidoMaterno(evento.target.value)} /></label></>}
      <label className="directorio-form-wide">Nombre comercial <Opcional /><input maxLength={180} value={nombreComercial} onChange={(evento) => setNombreComercial(evento.target.value)} placeholder="Ej.: Repuestos El Sol" /></label>
    </div>{error && <NotificacionFlotante mensaje={error} />}
      </form>
    </Dialogo></>;
}
