import "./marcas-page.css";
﻿import { useEffect, useState, type FormEvent } from "react";
import { CatalogoCard } from "../../components/catalogo/catalogo-card/catalogo-card";
import { CatalogoDetalle } from "../../components/catalogo/catalogo-detalle/catalogo-detalle";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { useCatalogo } from "../../hooks/use-catalogo";
import { usePaginacion } from "../../hooks/use-paginacion";
import { servicioMarcas, type MarcaCatalogo } from "../../services/inventario/catalogos.service";
import { srcImagen } from "../../services/api-cliente";

type Marca = MarcaCatalogo;

export function MarcasPage() {
  const { registros: marcas, cargando, guardando, error, setError, guardar: guardarMarca, cambiarEstado: cambiarEstadoMarca } = useCatalogo(servicioMarcas, "No se pudo cargar el catálogo de marcas.");
  const [nombre, setNombre] = useState("");
  const [rutaImagen, setRutaImagen] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [edicionId, setEdicionId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState<Marca | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (!imagen) { setVistaPrevia(srcImagen(rutaImagen || null)); return; }
    const temporal = URL.createObjectURL(imagen); setVistaPrevia(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [imagen, rutaImagen]);
  useEffect(() => {
    if (!modal && !detalle) return;
    const anterior = document.body.style.overflow; document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { if (modal) cerrarModal(); else setDetalle(null); } };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escape); };
  }, [modal, detalle]);

  const { pagina, porPagina, visibles, totalPaginas, desde, hasta, cambiarPagina, cambiarPorPagina } = usePaginacion(marcas);

  function nueva() { setEdicionId(null); setNombre(""); setRutaImagen(""); setImagen(null); setError(""); setModal(true); }
  function editar(marca: Marca) { setEdicionId(marca.id); setNombre(marca.nombre); setRutaImagen(marca.rutaImagen ?? ""); setImagen(null); setError(""); setModal(true); }
  function cerrarModal() { setModal(false); setEdicionId(null); setNombre(""); setRutaImagen(""); setImagen(null); }
  function seleccionarImagen(archivo?: File) {
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) { setError("Usa una imagen JPG, PNG o WebP de máximo 5 MB."); return; }
    setError(""); setImagen(archivo);
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault(); setError("");
    if (!imagen && !rutaImagen) { setError("Selecciona el logotipo de la marca."); return; }
    void guardarMarca(
      { nombre, ...(edicionId ? { id: edicionId } : {}), ...(imagen ? { imagen } : {}) },
      (marca) => setEdicionId(marca.id),
      () => { cerrarModal(); cambiarPagina(1); },
    );
  }

  function cambiarEstado(marca: Marca) { void cambiarEstadoMarca(marca); }

  return <>
    <CatalogoListado
      titulo="Marcas"
      descripcion="Administra las marcas de tus productos y motocicletas."
      etiquetaCrear="Nueva marca"
      entidadSingular="marca"
      tituloListado="Listado de marcas"
      registros={marcas}
      visibles={visibles}
      cargando={cargando}
      mensajeCarga="Cargando marcas…"
      error={modal ? "" : error}
      iconoVacio="✦"
      tituloVacio="Aún no hay marcas"
      descripcionVacio="Registra las marcas que trabajará tu negocio para asociarlas a productos."
      pagina={pagina}
      porPagina={porPagina}
      totalPaginas={totalPaginas}
      desde={desde}
      hasta={hasta}
      alCrear={nueva}
      alCambiarPagina={cambiarPagina}
      alCambiarTamanioPagina={cambiarPorPagina}
      renderizarTarjeta={(marca) => <CatalogoCard key={marca.id} tipo="Marca" nombre={marca.nombre} imagenSrc={srcImagen(marca.rutaImagen)} imagenAlt={`Imagen de ${marca.nombre}`} imagenFallback={marca.nombre.trim().slice(0, 1).toLocaleUpperCase("es-PE")} activa={marca.activo} onAbrir={() => setDetalle(marca)} textoApertura="Ver información" acciones={[{ etiqueta: "Editar", ejecutar: () => editar(marca) }, { etiqueta: marca.activo ? "Desactivar" : "Activar", ejecutar: () => void cambiarEstado(marca) }]} imagenMarca />}
    />
    {detalle && <CatalogoDetalle tipo="Marca" nombre={detalle.nombre} rutaImagen={detalle.rutaImagen} activo={detalle.activo} alCerrar={() => setDetalle(null)} alEditar={() => { setDetalle(null); editar(detalle); }} />}
    {modal && <div className="catalog-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrarModal(); }}><section className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="marca-form-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario" onClick={cerrarModal}>×</button>
      {error && <div className="catalog-alert catalog-modal-alert" role="alert">{error}</div>}
      <form className="catalog-form" onSubmit={(e) => void guardar(e)}>
        <div className="catalog-form-title"><span>✦</span><div><h2 id="marca-form-title">{edicionId ? "Editar marca" : "Nueva marca"}</h2><p>Registra el nombre y el logotipo de la marca.</p></div></div>
        <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} minLength={2} required placeholder="Ej. Honda" /></label>
        <div className="catalog-upload-field">
          <div className="catalog-upload-heading"><strong>Logotipo de la marca</strong><small>JPG, PNG o WebP · máximo 5 MB</small></div>
          <label className={`catalog-upload-zone${arrastrando ? " is-dragging" : ""}${vistaPrevia ? " has-preview" : ""}`} htmlFor="marca-imagen" onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={(e) => { e.preventDefault(); setArrastrando(false); seleccionarImagen(e.dataTransfer.files[0]); }}>
            <input className="catalog-upload-input" id="marca-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => seleccionarImagen(e.target.files?.[0])} />
            {vistaPrevia ? <><img className="catalog-upload-preview" src={vistaPrevia} alt="Vista previa del logotipo" /><span className="catalog-upload-copy"><strong>{imagen?.name ?? "Logotipo actual"}</strong><small>Haz clic o arrastra otra imagen para reemplazarla</small></span><span className="catalog-upload-action">Cambiar</span></> : <><span className="catalog-upload-symbol" aria-hidden="true">↑</span><span className="catalog-upload-copy"><strong>Arrastra una imagen aquí</strong><small>o selecciona un archivo desde tu dispositivo</small></span><span className="catalog-upload-action">Elegir imagen</span></>}
          </label>
        </div>
        <div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button className="catalog-submit" disabled={guardando}>{guardando ? "Guardando…" : edicionId ? "Guardar cambios" : "Crear marca"}</button></div>
      </form>
    </section></div>}
  </>;
}

