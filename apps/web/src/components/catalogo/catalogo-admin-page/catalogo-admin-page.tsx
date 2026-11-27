import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { cn } from "../../../lib/utils";
import { catalogAdminClasses as ui } from "./catalogo-admin-classes";
import { useCatalogo } from "../../../hooks/use-catalogo";
import { Dialogo } from "../../ui/dialogo/dialogo";
import { getViewportProfile } from "../../../utilidades/viewport";
import { RegistrarAccionPrincipal } from "../../ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../ui/listado-maestro/listado-maestro";
import { AccionIcono } from "../../ui/accion-icono";
import { Etiqueta } from "../../ui/etiqueta";
import type { RegistroCatalogo, ServicioCatalogo, UsoMarca } from "../../../services/inventario/catalogos.service";

type FiltroEstado = "TODOS" | "ACTIVOS" | "INACTIVOS";
type FiltroTipoMarca = "TODOS" | "REPUESTOS" | "MOTOTAXIS";
type TipoCatalogo = "categoria" | "marca";

type CatalogoAdminPageProps<T extends RegistroCatalogo> = {
  tipo: TipoCatalogo;
  ejemplo: string;
  servicio: ServicioCatalogo<T>;
  mensajeCarga: string;
};

const normalizar = (valor: string) => valor.trim().toLocaleLowerCase("es-PE");

function Icono({ nombre, className }: { nombre: "buscar" | "editar" | "activar" | "desactivar" | "cerrar" | "subir" | "categoria" | "marca"; className?: string }) {
  if (nombre === "buscar") return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
  if (nombre === "editar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.1-.8L19 8.3a2.1 2.1 0 0 0-3-3L5.1 16.2 4 20Z"/></svg>;
  if (nombre === "activar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></svg>;
  if (nombre === "desactivar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>;
  if (nombre === "cerrar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (nombre === "subir") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>;
  if (nombre === "marca") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 15l3-3 2 2 2-3 3 4"/><circle cx="9" cy="9" r="1.4"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></svg>;
}

export function CatalogoAdminPage<T extends RegistroCatalogo>({ tipo, ejemplo, servicio, mensajeCarga }: CatalogoAdminPageProps<T>) {
  const esMarca = tipo === "marca";
  const singular = esMarca ? "marca" : "categoría";
  const plural = esMarca ? "Marcas" : "Categorías";
  const { registros, cargando, guardando, error, setError, guardar, cambiarEstado } = useCatalogo(servicio, mensajeCarga);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [registroEditado, setRegistroEditado] = useState<T | null>(null);
  const [usoMarca, setUsoMarca] = useState<UsoMarca | "">("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoMarca>("TODOS");
  const [confirmacionEstado, setConfirmacionEstado] = useState<T | null>(null);
  const [confirmandoEstado, setConfirmandoEstado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [anchoViewport, setAnchoViewport] = useState(() => typeof window === "undefined" ? 1366 : window.innerWidth);
  const [altoViewport, setAltoViewport] = useState(() => typeof window === "undefined" ? 768 : window.innerHeight);

  const filtrados = useMemo(() => registros.filter((registro) => {
    const coincideTexto = !busqueda || normalizar(registro.nombre).includes(normalizar(busqueda));
    const coincideEstado = filtroEstado === "TODOS" || (filtroEstado === "ACTIVOS" ? registro.activo : !registro.activo);
    const uso = registro.uso ?? "AMBOS";
    const coincideTipo = !esMarca || filtroTipo === "TODOS"
      || (filtroTipo === "REPUESTOS" && (uso === "REPUESTOS" || uso === "AMBOS"))
      || (filtroTipo === "MOTOTAXIS" && (uso === "MOTOTAXIS" || uso === "AMBOS"));
    return coincideTexto && coincideEstado && coincideTipo;
  }), [registros, busqueda, filtroEstado, filtroTipo, esMarca]);
  const [versionListado, setVersionListado] = useState(0);
  const perfilResponsive = getViewportProfile(anchoViewport, altoViewport);
  const columnas = perfilResponsive === "laptop" ? 4 : perfilResponsive === "tablet-landscape" ? 3 : perfilResponsive === "tablet-portrait" || perfilResponsive === "mobile-landscape" ? 2 : 1;

  useEffect(() => {
    const actualizarAncho = () => { setAnchoViewport(window.innerWidth); setAltoViewport(window.innerHeight); };
    window.addEventListener("resize", actualizarAncho);
    return () => window.removeEventListener("resize", actualizarAncho);
  }, []);

  function limpiarFormulario() {
    setNombre(""); setRegistroEditado(null); setUsoMarca("");
  }
  function cerrarModal() { if (guardando) return; setModalAbierto(false); limpiarFormulario(); }
  function cerrarConfirmacionEstado() { if (confirmandoEstado) return; setConfirmacionEstado(null); }
  function abrirNuevo() { setError(""); limpiarFormulario(); setModalAbierto(true); }
  function abrirEdicion(registro: T) {
    setError(""); setRegistroEditado(registro); setNombre(registro.nombre); setUsoMarca(registro.uso ?? "AMBOS"); setModalAbierto(true);
  }
  function guardarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (esMarca && !usoMarca) { setError("Indica si la marca se usa en repuestos, mototaxis o ambos."); return; }
    void guardar(
      { nombre: nombre.trim(), ...(registroEditado ? { id: registroEditado.id } : {}), ...(esMarca && usoMarca ? { uso: usoMarca } : {}) },
      (registro) => setRegistroEditado(registro),
      () => { setModalAbierto(false); limpiarFormulario(); setVersionListado((version) => version + 1); },
    );
  }


  async function confirmarCambioEstado() {
    if (!confirmacionEstado || confirmandoEstado) return;
    setConfirmandoEstado(true);
    await cambiarEstado(confirmacionEstado);
    setConfirmandoEstado(false);
    setConfirmacionEstado(null);
  }

  const renderizarTarjeta = (registro: T) => <article className={cn("catalog-manager-card", ui.card)} key={registro.id}>
              <div className={cn("catalog-manager-card-main", ui.cardMain)}><strong className={cn("catalog-manager-name", ui.name)}>{registro.nombre}</strong>
                {esMarca && <div className={cn("catalog-manager-usage", ui.usage)}>{(registro.uso === "AMBOS" || registro.uso === "REPUESTOS") && <Etiqueta tono="marca" compacta>Repuestos</Etiqueta>}{(registro.uso === "AMBOS" || registro.uso === "MOTOTAXIS") && <Etiqueta tono="informativa" compacta>Mototaxis</Etiqueta>}</div>}
              </div>
              <Etiqueta tono={registro.activo ? "positiva" : "neutral"}>{registro.activo ? "Activa" : "Inactiva"}</Etiqueta>
              <div className={cn("catalog-manager-row-actions", ui.rowActions)}>
                <AccionIcono accion="editar" etiqueta={`Editar ${singular} ${registro.nombre}`} onClick={() => abrirEdicion(registro)} />
                <AccionIcono accion={registro.activo ? "desactivar" : "activar"} etiqueta={`${registro.activo ? "Desactivar" : "Activar"} ${singular} ${registro.nombre}`} onClick={() => setConfirmacionEstado(registro)} />
              </div>
            </article>;

  return <section className={cn("catalog-manager", esMarca ? "is-brand-manager" : "is-category-manager", ui.manager)} aria-label={plural}>
    <RegistrarAccionPrincipal etiqueta={`Crear ${singular}`} onClick={abrirNuevo} />
    <ListadoMaestro
      variante="tarjetas"
      titulo={plural}
      etiqueta={plural}
      registros={filtrados}
      cargando={cargando}
      error={!modalAbierto ? error : ""}
      vacio={<div className={cn("catalog-manager-empty", ui.empty)}><span className={cn("catalog-manager-empty-icon", ui.emptyIcon)}><Icono nombre={tipo}/></span><strong className={ui.emptyHeading}>{busqueda || filtroEstado !== "TODOS" ? "No hay resultados" : `Aún no hay ${plural.toLocaleLowerCase("es-PE")}`}</strong><p className={ui.emptyText}>{busqueda || filtroEstado !== "TODOS" ? "Prueba otra búsqueda o estado." : `Agrega una ${singular} para organizar el inventario.`}</p></div>}
      controlesCabecera={<>
        <label className={cn("catalog-manager-search", ui.search)}><Icono nombre="buscar" className={ui.searchIcon}/><input className={ui.searchInput} type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder={`Buscar ${singular}...`} aria-label={`Buscar ${plural.toLocaleLowerCase("es-PE")}`} /></label>
        <label className={cn("catalog-manager-status-filter", ui.statusFilter)}><span className={ui.filterLabel}>Estado</span><select className={ui.filterSelect} value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as FiltroEstado)}><option value="TODOS">Todos</option><option value="ACTIVOS">Activas</option><option value="INACTIVOS">Inactivas</option></select></label>
        {esMarca && <label className={cn("catalog-manager-status-filter", ui.statusFilter)}><span className={ui.filterLabel}>Tipo</span><select className={ui.filterSelect} value={filtroTipo} onChange={(evento) => setFiltroTipo(evento.target.value as FiltroTipoMarca)}><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option><option value="TODOS">Todos</option></select></label>}
      </>}
      claseCabecera={cn("catalog-admin-header", ui.header, ui.landscapeHeader, ui.portraitHeader)}
      claseControlesCabecera={cn("catalog-admin-controls", ui.controls, esMarca && ui.brandControls, ui.landscapeControls, esMarca && ui.landscapeBrandControls, ui.portraitControls, esMarca && ui.portraitBrandControls)}
      paginacion={{ modo: "local" }}
      resetKey={`${busqueda}|${filtroEstado}|${filtroTipo}|${filtrados.length}|${versionListado}`}
      columnas={columnas}
      renderizarTarjeta={renderizarTarjeta}
      claseTarjeta={cn("catalog-manager-grid catalog-admin-grid", ui.grid)}
    />

    {modalAbierto && (
      <Dialogo
        titulo={registroEditado ? `Editar ${singular}` : `Nueva ${singular}`}
        subtitulo={registroEditado ? "Actualiza el nombre." : `Agrega una ${singular} al catálogo.`}
        icono={<span className="grid size-11 place-items-center rounded-xl bg-[#eef4fa] text-[#174b78]"><Icono nombre={tipo} /></span>}
        ancho="sm"
        pantallaCompletaMovil={esMarca && Boolean(registroEditado)}
        cerrable={!guardando}
        onCerrar={cerrarModal}
        pie={
          <>
            <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
            <button type="submit" form="catalogo-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando || !nombre.trim()}>{guardando ? "Guardando…" : registroEditado ? "Guardar cambios" : `Crear ${singular}`}</button>
          </>
        }
      >
        {error && <NotificacionFlotante mensaje={error} />}
        <form id="catalogo-form" className="grid gap-4" onSubmit={guardarRegistro}>
          <label className="grid gap-1.5 text-xs font-bold text-[#52697d]"><span>Nombre<b className="text-[#b91e30]">*</b></span><input className="h-11 w-full rounded-xl border border-[#c5d1db] px-3 text-sm text-[#142b42]" autoFocus value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={100} minLength={2} required placeholder={ejemplo} /></label>
          {esMarca && <label className="grid gap-1.5 text-xs font-bold text-[#52697d]"><span>Se usa en<b className="text-[#b91e30]">*</b></span><select className="h-11 w-full rounded-xl border border-[#c5d1db] px-3 text-sm text-[#142b42]" value={usoMarca} onChange={(evento) => setUsoMarca(evento.target.value as UsoMarca | "")} required><option value="">Elige el tipo de producto</option><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option><option value="AMBOS">Ambos</option></select></label>}
        </form>
      </Dialogo>
    )}

    {confirmacionEstado && (
      <Dialogo
        tipo="alerta"
        titulo={confirmacionEstado.activo ? `¿Desactivar ${singular}?` : `¿Habilitar ${singular}?`}
        icono={<span className="grid size-11 place-items-center rounded-xl bg-[#eef4fa] text-[#174b78]"><Icono nombre={confirmacionEstado.activo ? "desactivar" : "activar"} /></span>}
        ancho="sm"
        cerrable={!confirmandoEstado}
        onCerrar={cerrarConfirmacionEstado}
        pie={
          <>
            <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={cerrarConfirmacionEstado} disabled={confirmandoEstado}>Cancelar</button>
            <button type="button" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" onClick={() => void confirmarCambioEstado()} disabled={confirmandoEstado}>{confirmandoEstado ? "Actualizando…" : confirmacionEstado.activo ? "Sí, desactivar" : "Sí, habilitar"}</button>
          </>
        }
      >
        <p className="m-0 text-sm leading-relaxed text-[#52697d]">Vas a {confirmacionEstado.activo ? "desactivar" : "habilitar"} <strong className="text-[#0b2545]">{confirmacionEstado.nombre}</strong>. {confirmacionEstado.activo ? "Dejará de estar disponible para nuevos registros; la información histórica se conservará." : "Volverá a estar disponible para nuevos registros."}</p>
      </Dialogo>
    )}
  </section>;
}
