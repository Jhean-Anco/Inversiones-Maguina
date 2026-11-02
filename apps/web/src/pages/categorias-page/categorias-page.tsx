import "./categorias-page.css";
﻿import { useEffect, useState, type FormEvent } from "react";
import { CatalogoCard } from "../../components/catalogo/catalogo-card/catalogo-card";
import { CatalogoDetalle } from "../../components/catalogo/catalogo-detalle/catalogo-detalle";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { useCatalogo } from "../../hooks/use-catalogo";
import { usePaginacion } from "../../hooks/use-paginacion";
import { servicioCategorias, type CategoriaCatalogo } from "../../services/inventario/catalogos.service";
import { srcImagen } from "../../services/api-cliente";

type Categoria = CategoriaCatalogo;

export function CategoriasPage() {
  const { registros: categorias, cargando, guardando, error, setError, guardar: guardarCategoria, cambiarEstado: cambiarEstadoCategoria } = useCatalogo(servicioCategorias, "No se pudo cargar el catálogo.");
  const [nombre, setNombre] = useState("");
  const [rutaImagen, setRutaImagen] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [edicionId, setEdicionId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState<Categoria | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (!imagen) { setVistaPrevia(srcImagen(rutaImagen || null)); return; }
    const temporal = URL.createObjectURL(imagen);
    setVistaPrevia(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [imagen, rutaImagen]);
  useEffect(() => {
    if (!modal && !detalle) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { if (modal) cerrarModal(); else setDetalle(null); } };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escape); };
  }, [modal, detalle]);

  const { pagina, porPagina, visibles, totalPaginas, desde, hasta, cambiarPagina, cambiarPorPagina } = usePaginacion(categorias);

  function nueva() { setEdicionId(null); setNombre(""); setRutaImagen(""); setImagen(null); setError(""); setModal(true); }
  function editar(categoria: Categoria) { setEdicionId(categoria.id); setNombre(categoria.nombre); setRutaImagen(categoria.rutaImagen ?? ""); setImagen(null); setError(""); setModal(true); }
  function cerrarModal() { setModal(false); setEdicionId(null); setNombre(""); setRutaImagen(""); setImagen(null); }
  function seleccionarImagen(archivo?: File) {
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) { setError("Usa una imagen JPG, PNG o WebP de máximo 5 MB."); return; }
    setError(""); setImagen(archivo);
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault(); setError("");
    if (!imagen && !rutaImagen) { setError("Selecciona una imagen para la categoría."); return; }
    void guardarCategoria(
      { nombre, ...(edicionId ? { id: edicionId } : {}), ...(imagen ? { imagen } : {}) },
      (categoria) => setEdicionId(categoria.id),
      () => { cerrarModal(); cambiarPagina(1); },
    );
  }

  function cambiarEstado(categoria: Categoria) { void cambiarEstadoCategoria(categoria); }

  return <>
    <CatalogoListado
      titulo="Categorías"
      descripcion="Usa categorías principales para organizar y filtrar productos."
      etiquetaCrear="Nueva categoría"
      entidadSingular="categoría"
      tituloListado="Listado de categorías"
      registros={categorias}
      visibles={visibles}
      cargando={cargando}
      mensajeCarga="Cargando categorías…"
      error={modal ? "" : error}
      iconoVacio="▦"
      tituloVacio="Aún no hay categorías"
      descripcionVacio="Crea las categorías principales que utilizarás como filtros de productos."
      pagina={pagina}
      porPagina={porPagina}
      totalPaginas={totalPaginas}
      desde={desde}
      hasta={hasta}
      alCrear={nueva}
      alCambiarPagina={cambiarPagina}
      alCambiarTamanioPagina={cambiarPorPagina}
      renderizarTarjeta={(categoria) => <CatalogoCard key={categoria.id} tipo="Categoría" nombre={categoria.nombre} imagenSrc={srcImagen(categoria.rutaImagen)} imagenAlt={`Imagen de ${categoria.nombre}`} imagenFallback="▦" activa={categoria.activo} onAbrir={() => setDetalle(categoria)} textoApertura="Ver información" acciones={[{ etiqueta: "Editar", ejecutar: () => editar(categoria) }, { etiqueta: categoria.activo ? "Desactivar" : "Activar", ejecutar: () => void cambiarEstado(categoria) }]} />}
    />
    {detalle && <CatalogoDetalle tipo="Categoría" nombre={detalle.nombre} rutaImagen={detalle.rutaImagen} activo={detalle.activo} creadoEn={detalle.creadoEn} alCerrar={() => setDetalle(null)} alEditar={() => { setDetalle(null); editar(detalle); }} />}
    {modal && <div className="catalog-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrarModal(); }}><section className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="categoria-form-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario" onClick={cerrarModal}>×</button>
      {error && <div className="catalog-alert catalog-modal-alert" role="alert">{error}</div>}
      <form className="catalog-form" onSubmit={(e) => void guardar(e)}>
        <div className="catalog-form-title"><span>+</span><div><h2 id="categoria-form-title">{edicionId ? "Editar categoría" : "Nueva categoría"}</h2><p>Define el nombre y la imagen representativa.</p></div></div>
        <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} minLength={2} required placeholder="Ej. Frenos" /></label>
        <div className="catalog-upload-field">
          <div className="catalog-upload-heading"><strong>Imagen de categoría</strong><small>JPG, PNG o WebP · máximo 5 MB</small></div>
          <label className={`catalog-upload-zone${arrastrando ? " is-dragging" : ""}${vistaPrevia ? " has-preview" : ""}`} htmlFor="categoria-imagen" onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={(e) => { e.preventDefault(); setArrastrando(false); seleccionarImagen(e.dataTransfer.files[0]); }}>
            <input className="catalog-upload-input" id="categoria-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => seleccionarImagen(e.target.files?.[0])} />
            {vistaPrevia ? <><img className="catalog-upload-preview" src={vistaPrevia} alt="Vista previa de categoría" /><span className="catalog-upload-copy"><strong>{imagen?.name ?? "Imagen actual"}</strong><small>Haz clic o arrastra otra imagen para reemplazarla</small></span><span className="catalog-upload-action">Cambiar</span></> : <><span className="catalog-upload-symbol" aria-hidden="true">↑</span><span className="catalog-upload-copy"><strong>Arrastra una imagen aquí</strong><small>o selecciona un archivo desde tu dispositivo</small></span><span className="catalog-upload-action">Elegir imagen</span></>}
          </label>
        </div>
        <div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button className="catalog-submit" disabled={guardando}>{guardando ? "Guardando…" : edicionId ? "Guardar cambios" : "Crear categoría"}</button></div>
      </form>
    </section></div>}
  </>;
}

