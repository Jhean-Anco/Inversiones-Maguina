import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { catalogAdminClasses as ui } from "./catalogo-admin-classes";
import { useCatalogo } from "../../../hooks/use-catalogo";
import { Dialogo } from "../../ui/dialogo/dialogo";
import { RegistrarAccionPrincipal } from "../../ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../ui/listado-maestro/listado-maestro";
import { AccionIcono } from "../../ui/accion-icono";
import { Etiqueta } from "../../ui/etiqueta";
import type { RegistroCatalogo, ServicioCatalogo, UsoMarca } from "../../../services/inventario/catalogos.service";

type FiltroEstado = "ACTIVOS" | "INACTIVOS";
type FiltroTipoMarca = "TODOS" | "REPUESTOS" | "MOTOTAXIS";
type TipoCatalogo = "categoria" | "marca";

const filtrosEstado: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "ACTIVOS", etiqueta: "Activas" },
  { valor: "INACTIVOS", etiqueta: "Inactivas" },
];

type CatalogoAdminPageProps<T extends RegistroCatalogo> = {
  tipo: TipoCatalogo;
  ejemplo: string;
  servicio: ServicioCatalogo<T>;
  mensajeCarga: string;
};

const normalizar = (valor: string) => valor.trim().toLocaleLowerCase("es-PE");

function Icono({ nombre }: { nombre: "buscar" | "activar" | "desactivar" | "categoria" | "marca" }) {
  if (nombre === "buscar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
  if (nombre === "activar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></svg>;
  if (nombre === "desactivar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>;
  if (nombre === "marca") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 15l3-3 2 2 2-3 3 4"/><circle cx="9" cy="9" r="1.4"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></svg>;
}

export function CatalogoAdminPage<T extends RegistroCatalogo>({ tipo, ejemplo, servicio, mensajeCarga }: CatalogoAdminPageProps<T>) {
  const esMarca = tipo === "marca";
  const singular = esMarca ? "marca" : "categoría";
  const plural = esMarca ? "Marcas" : "Categorías";
  const pluralMinuscula = plural.toLocaleLowerCase("es-PE");
  const { registros, cargando, guardando, error, setError, guardar, cambiarEstado } = useCatalogo(servicio, mensajeCarga);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [registroEditado, setRegistroEditado] = useState<T | null>(null);
  const [usoMarca, setUsoMarca] = useState<UsoMarca | "">("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("ACTIVOS");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoMarca>("TODOS");
  const [confirmacionEstado, setConfirmacionEstado] = useState<T | null>(null);
  const [confirmandoEstado, setConfirmandoEstado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [versionListado, setVersionListado] = useState(0);

  const filtrados = useMemo(() => registros.filter((registro) => {
    const coincideTexto = !busqueda || normalizar(registro.nombre).includes(normalizar(busqueda));
    const coincideEstado = filtroEstado === "ACTIVOS" ? registro.activo : !registro.activo;
    const uso = registro.uso ?? "AMBOS";
    const coincideTipo = !esMarca || filtroTipo === "TODOS"
      || (filtroTipo === "REPUESTOS" && (uso === "REPUESTOS" || uso === "AMBOS"))
      || (filtroTipo === "MOTOTAXIS" && (uso === "MOTOTAXIS" || uso === "AMBOS"));
    return coincideTexto && coincideEstado && coincideTipo;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })), [registros, busqueda, filtroEstado, filtroTipo, esMarca]);
  const conteos = useMemo(() => ({
    ACTIVOS: registros.filter((registro) => registro.activo).length,
    INACTIVOS: registros.filter((registro) => !registro.activo).length,
  }), [registros]);
  const hayFiltros = Boolean(busqueda) || registros.length > 0;

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

  return <section className={cn("catalog-manager", ui.page)} aria-label={plural}>
    {error && !modalAbierto && <NotificacionFlotante mensaje={error} />}
    <RegistrarAccionPrincipal etiqueta={`Crear ${singular}`} onClick={abrirNuevo} />
    <div className={ui.toolbar}>
      <label className={cn(ui.search, "listado-maestro-busqueda-icono")}>
        <Icono nombre="buscar" />
        <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder={`Buscar ${singular}`} aria-label={`Buscar ${pluralMinuscula}`} />
      </label>
      <div className={ui.filters} role="group" aria-label="Filtrar por estado">
        {filtrosEstado.map(({ valor, etiqueta }) => <button key={valor} className={ui.chip} type="button" aria-pressed={filtroEstado === valor} onClick={() => setFiltroEstado(valor)}>
          {etiqueta}<span className={ui.chipCount}>{conteos[valor]}</span>
        </button>)}
      </div>
      {esMarca && <label className={ui.selectField}>
        <select value={filtroTipo} aria-label="Filtrar por tipo de producto" onChange={(evento) => setFiltroTipo(evento.target.value as FiltroTipoMarca)}>
          <option value="TODOS">Todos los tipos</option><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option>
        </select>
        <ChevronDown aria-hidden="true" />
      </label>}
    </div>
    <ListadoMaestro
      variante="tabla"
      titulo={plural}
      etiqueta={plural}
      registros={filtrados}
      cargando={cargando}
      error={null}
      vacio={<div className={ui.empty}><strong>{hayFiltros ? `No hay ${pluralMinuscula} para mostrar` : `Aún no hay ${pluralMinuscula}`}</strong><span>{hayFiltros ? "Prueba con otra búsqueda o con otro estado." : `Agrega una ${singular} para organizar el inventario.`}</span></div>}
      claseCabecera={ui.header}
      claseControlesCabecera={ui.controls}
      paginacion={{ modo: "local" }}
      resetKey={`${busqueda}|${filtroEstado}|${filtroTipo}|${versionListado}`}
      claseTabla={ui.table}
      claseContenedor={ui.tableScroll}
      centrarCeldas={false}
      encabezadoTabla={<tr><th>Nombre</th>{esMarca && <th>Se usa en</th>}<th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(registro) => <tr key={registro.id}>
        <td><strong className={ui.name} title={registro.nombre}>{registro.nombre}</strong></td>
        {esMarca && <td><div className={ui.usage}>
          {(registro.uso === "AMBOS" || registro.uso === "REPUESTOS") && <Etiqueta tono="marca" compacta>Repuestos</Etiqueta>}
          {(registro.uso === "AMBOS" || registro.uso === "MOTOTAXIS") && <Etiqueta tono="informativa" compacta>Mototaxis</Etiqueta>}
        </div></td>}
        <td><span className={cn(ui.status, registro.activo ? ui.statusActive : ui.statusInactive)}><i className={cn("h-[7px] w-[7px] rounded-full", registro.activo ? ui.dotActive : ui.dotInactive)} aria-hidden="true" />{registro.activo ? "Activa" : "Inactiva"}</span></td>
        <td className="whitespace-nowrap"><div className={ui.rowActions}>
          <AccionIcono accion="editar" etiqueta={`Editar ${singular} ${registro.nombre}`} onClick={() => abrirEdicion(registro)} />
          <AccionIcono accion={registro.activo ? "desactivar" : "activar"} etiqueta={`${registro.activo ? "Desactivar" : "Activar"} ${singular} ${registro.nombre}`} onClick={() => setConfirmacionEstado(registro)} />
        </div></td>
      </tr>}
    />

    {modalAbierto && (
      <Dialogo
        titulo={registroEditado ? `Editar ${singular}` : `Nueva ${singular}`}
        subtitulo={registroEditado ? "Actualiza el nombre." : `Agrega una ${singular} al catálogo.`}
        icono={<span className={ui.dialogIcon}><Icono nombre={tipo} /></span>}
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
          <label className={ui.field}>
            <span>Nombre<b>*</b></span>
            <input className={ui.input} autoFocus value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={100} minLength={2} required placeholder={ejemplo} />
            <span className={ui.hint}>{nombre.length}/100</span>
          </label>
          {esMarca && <label className={ui.field}>
            <span>Se usa en<b>*</b></span>
            <span className={ui.selectWrap}>
              <select className={ui.select} value={usoMarca} onChange={(evento) => setUsoMarca(evento.target.value as UsoMarca | "")} required>
                <option value="">Elige el tipo de producto</option><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option><option value="AMBOS">Ambos</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>}
        </form>
      </Dialogo>
    )}

    {confirmacionEstado && (
      <Dialogo
        tipo="alerta"
        titulo={confirmacionEstado.activo ? `¿Desactivar ${singular}?` : `¿Habilitar ${singular}?`}
        icono={<span className={ui.dialogIcon}><Icono nombre={confirmacionEstado.activo ? "desactivar" : "activar"} /></span>}
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
