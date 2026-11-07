import "./catalogo-admin-page.css";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useCatalogo } from "../../../hooks/use-catalogo";
import { useDialogoFlotante } from "../../../hooks/use-dialogo-flotante";
import { RegistrarAccionPrincipal } from "../../ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../ui/listado-maestro/listado-maestro";
import { srcImagen } from "../../../services/api-cliente";
import { AccionIcono } from "../../ui/accion-icono";
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

function Icono({ nombre }: { nombre: "buscar" | "editar" | "activar" | "desactivar" | "cerrar" | "subir" | "categoria" | "marca" }) {
  if (nombre === "buscar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
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
  const imagenLabel = esMarca ? "Logotipo" : "Imagen";
  const idArchivo = `catalogo-${tipo}-imagen`;
  const { registros, cargando, guardando, error, setError, guardar, cambiarEstado } = useCatalogo(servicio, mensajeCarga);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [rutaImagen, setRutaImagen] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [registroEditado, setRegistroEditado] = useState<T | null>(null);
  const [usoMarca, setUsoMarca] = useState<UsoMarca | "">("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoMarca>("TODOS");
  const [confirmacionEstado, setConfirmacionEstado] = useState<T | null>(null);
  const [confirmandoEstado, setConfirmandoEstado] = useState(false);
  const dialogoRef = useRef<HTMLElement>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [anchoViewport, setAnchoViewport] = useState(() => typeof window === "undefined" ? 1280 : window.innerWidth);

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
  const columnas = anchoViewport >= 1200 ? 4 : anchoViewport >= 900 ? 3 : anchoViewport >= 600 ? 2 : 1;

  useEffect(() => {
    const actualizarAncho = () => setAnchoViewport(window.innerWidth);
    window.addEventListener("resize", actualizarAncho);
    return () => window.removeEventListener("resize", actualizarAncho);
  }, []);

  useEffect(() => {
    if (!imagen) { setVistaPrevia(srcImagen(rutaImagen || null)); return; }
    const temporal = URL.createObjectURL(imagen);
    setVistaPrevia(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [imagen, rutaImagen]);

  function limpiarFormulario() {
    setNombre(""); setRutaImagen(""); setImagen(null); setRegistroEditado(null); setUsoMarca(""); setArrastrando(false);
  }
  function cerrarModal() { if (guardando) return; setModalAbierto(false); limpiarFormulario(); }
  function cerrarConfirmacionEstado() { if (confirmandoEstado) return; setConfirmacionEstado(null); }
  function abrirNuevo() { setError(""); limpiarFormulario(); setModalAbierto(true); }
  function abrirEdicion(registro: T) {
    setError(""); setRegistroEditado(registro); setNombre(registro.nombre); setRutaImagen(registro.rutaImagen ?? ""); setImagen(null); setUsoMarca(registro.uso ?? "AMBOS"); setModalAbierto(true);
  }
  function seleccionarImagen(archivo?: File) {
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setError("Elige una imagen JPG, PNG o WebP de hasta 5 MB."); return;
    }
    setError(""); setImagen(archivo);
  }
  function manejarDrop(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault(); setArrastrando(false); seleccionarImagen(evento.dataTransfer.files[0]);
  }
  function guardarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (esMarca && !usoMarca) { setError("Indica si la marca se usa en repuestos, mototaxis o ambos."); return; }
    if (!imagen && !rutaImagen) { setError(`Selecciona ${esMarca ? "el logotipo" : "una imagen"} para ${singular}.`); return; }
    void guardar(
      { nombre: nombre.trim(), ...(registroEditado ? { id: registroEditado.id } : {}), ...(esMarca && usoMarca ? { uso: usoMarca } : {}), ...(imagen ? { imagen } : {}) },
      (registro) => setRegistroEditado(registro),
      () => { setModalAbierto(false); limpiarFormulario(); setVersionListado((version) => version + 1); },
    );
  }

  useDialogoFlotante(dialogoRef, modalAbierto || Boolean(confirmacionEstado), () => {
    if (confirmacionEstado) cerrarConfirmacionEstado();
    else cerrarModal();
  });

  async function confirmarCambioEstado() {
    if (!confirmacionEstado || confirmandoEstado) return;
    setConfirmandoEstado(true);
    await cambiarEstado(confirmacionEstado);
    setConfirmandoEstado(false);
    setConfirmacionEstado(null);
  }

  const renderizarTarjeta = (registro: T) => <article className="catalog-manager-card" key={registro.id}>
              <div className={`catalog-manager-thumbnail${esMarca ? " is-logo" : ""}`}>{registro.rutaImagen ? <img src={srcImagen(registro.rutaImagen)} alt="" loading="lazy" /> : <span>{registro.nombre.trim().slice(0, 1).toLocaleUpperCase("es-PE")}</span>}</div>
              <div className="catalog-manager-card-main"><strong className="catalog-manager-name">{registro.nombre}</strong>
                {esMarca && <div className="catalog-manager-usage">{(registro.uso === "AMBOS" || registro.uso === "REPUESTOS") && <span>Repuestos</span>}{(registro.uso === "AMBOS" || registro.uso === "MOTOTAXIS") && <span>Mototaxis</span>}</div>}
              </div>
              <span className={`catalog-manager-status${registro.activo ? " is-active" : " is-inactive"}`}><i/>{registro.activo ? "Activa" : "Inactiva"}</span>
              <div className="catalog-manager-row-actions">
                <AccionIcono accion="editar" etiqueta={`Editar ${singular} ${registro.nombre}`} onClick={() => abrirEdicion(registro)} />
                <AccionIcono accion={registro.activo ? "desactivar" : "activar"} etiqueta={`${registro.activo ? "Desactivar" : "Activar"} ${singular} ${registro.nombre}`} onClick={() => setConfirmacionEstado(registro)} />
              </div>
            </article>;

  return <section className={`catalog-manager ${esMarca ? "is-brand-manager" : "is-category-manager"}`} aria-label={plural}>
    <RegistrarAccionPrincipal etiqueta={`Crear ${singular}`} onClick={abrirNuevo} />
    <ListadoMaestro
      variante="tarjetas"
      titulo={plural}
      etiqueta={plural}
      registros={filtrados}
      cargando={cargando}
      error={!modalAbierto ? error : ""}
      vacio={<div className="catalog-manager-empty"><span className="catalog-manager-empty-icon"><Icono nombre={tipo}/></span><strong>{busqueda || filtroEstado !== "TODOS" ? "No hay resultados" : `Aún no hay ${plural.toLocaleLowerCase("es-PE")}`}</strong><p>{busqueda || filtroEstado !== "TODOS" ? "Prueba otra búsqueda o estado." : `Agrega una ${singular} para organizar el inventario.`}</p></div>}
      controlesCabecera={<>
        <label className="catalog-manager-search"><Icono nombre="buscar"/><input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder={`Buscar ${singular}...`} aria-label={`Buscar ${plural.toLocaleLowerCase("es-PE")}`} /></label>
        <label className="catalog-manager-status-filter"><span>Estado</span><select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as FiltroEstado)}><option value="TODOS">Todos</option><option value="ACTIVOS">Activas</option><option value="INACTIVOS">Inactivas</option></select></label>
        {esMarca && <label className="catalog-manager-status-filter"><span>Tipo</span><select value={filtroTipo} onChange={(evento) => setFiltroTipo(evento.target.value as FiltroTipoMarca)}><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option><option value="TODOS">Todos</option></select></label>}
      </>}
      paginacion={{ modo: "local" }}
      resetKey={`${busqueda}|${filtroEstado}|${filtroTipo}|${filtrados.length}|${versionListado}`}
      columnas={columnas}
      renderizarTarjeta={renderizarTarjeta}
      claseTarjeta="catalog-manager-grid"
    />

    {modalAbierto && <div className="catalog-manager-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrarModal(); }}>
      <section ref={dialogoRef} className="catalog-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-manager-form-title">
        <header className="catalog-manager-dialog-head"><div className={`catalog-manager-dialog-symbol${esMarca ? " is-brand" : ""}`}><Icono nombre={tipo}/></div><div><h2 id="catalog-manager-form-title">{registroEditado ? `Editar ${singular}` : `Nueva ${singular}`}</h2><p>{registroEditado ? "Actualiza el nombre o la imagen." : `Agrega una ${singular} al catálogo.`}</p></div><button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar formulario"><Icono nombre="cerrar"/></button></header>
        {error && <div className="catalog-manager-dialog-error" role="alert">{error}</div>}
        <form className="catalog-manager-form" onSubmit={guardarRegistro}>
          <label className="catalog-manager-name-field"><span>Nombre<b>*</b></span><input autoFocus value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={100} minLength={2} required placeholder={ejemplo}/></label>
          {esMarca && <label className="catalog-manager-name-field"><span>Se usa en<b>*</b></span><select value={usoMarca} onChange={(evento) => setUsoMarca(evento.target.value as UsoMarca | "")} required><option value="">Elige el tipo de producto</option><option value="REPUESTOS">Repuestos</option><option value="MOTOTAXIS">Mototaxis</option><option value="AMBOS">Ambos</option></select></label>}
          <div className="catalog-manager-image-field"><div className="catalog-manager-image-label"><span>{imagenLabel}<b>*</b></span><small>JPG, PNG o WebP · hasta 5 MB</small></div>
            <label className={`catalog-manager-dropzone${arrastrando ? " is-dragging" : ""}${vistaPrevia ? " has-preview" : ""}`} htmlFor={idArchivo} onDragOver={(evento) => { evento.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={manejarDrop}>
              <input id={idArchivo} type="file" accept="image/jpeg,image/png,image/webp" onChange={(evento) => { seleccionarImagen(evento.target.files?.[0]); evento.currentTarget.value = ""; }} />
              {vistaPrevia ? <><span className={`catalog-manager-preview${esMarca ? " is-logo" : ""}`}><img src={vistaPrevia} alt={`Vista previa: ${imagenLabel.toLocaleLowerCase("es-PE")}`} /></span><span className="catalog-manager-drop-copy"><strong>{imagen?.name ?? (esMarca ? "Logotipo actual" : "Imagen actual")}</strong><small>Haz clic para reemplazar la imagen</small></span><span className="catalog-manager-upload-action">Cambiar</span></> : <><span className="catalog-manager-upload-icon"><Icono nombre="subir"/></span><span className="catalog-manager-drop-copy"><strong>Selecciona una imagen</strong><small>También puedes arrastrarla aquí</small></span><span className="catalog-manager-upload-action">Elegir archivo</span></>}
            </label>
          </div>
          <footer className="catalog-manager-form-actions"><button type="button" className="catalog-manager-cancel" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="catalog-manager-save" disabled={guardando || !nombre.trim()}>{guardando ? "Guardando…" : registroEditado ? "Guardar cambios" : `Crear ${singular}`}</button></footer>
        </form>
      </section>
    </div>}

    {confirmacionEstado && <div className="catalog-manager-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrarConfirmacionEstado(); }}>
      <section ref={dialogoRef} className="catalog-manager-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-manager-confirm-title">
        <div className={`catalog-manager-confirm-icon${confirmacionEstado.activo ? " is-disable" : " is-enable"}`}><Icono nombre={confirmacionEstado.activo ? "desactivar" : "activar"}/></div>
        <h2 id="catalog-manager-confirm-title">{confirmacionEstado.activo ? `¿Desactivar ${singular}?` : `¿Habilitar ${singular}?`}</h2>
        <p>Vas a {confirmacionEstado.activo ? "desactivar" : "habilitar"} <strong>{confirmacionEstado.nombre}</strong>. {confirmacionEstado.activo ? "Dejará de estar disponible para nuevos registros; la información histórica se conservará." : "Volverá a estar disponible para nuevos registros."}</p>
        <footer><button className="catalog-manager-cancel" type="button" onClick={cerrarConfirmacionEstado} disabled={confirmandoEstado}>Cancelar</button><button className={`catalog-manager-save${confirmacionEstado.activo ? " is-destructive" : ""}`} type="button" onClick={() => void confirmarCambioEstado()} disabled={confirmandoEstado}>{confirmandoEstado ? "Actualizando…" : confirmacionEstado.activo ? "Sí, desactivar" : "Sí, habilitar"}</button></footer>
      </section>
    </div>}
  </section>;
}
