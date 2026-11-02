import "./producto-categoria-modal.css";
import type { FormEvent } from "react";

type PropiedadesProductoCategoriaModal = {
  nombre: string;
  imagen?: File;
  vistaPrevia: string;
  guardando: boolean;
  error: string;
  alCambiarNombre: (valor: string) => void;
  alSeleccionarImagen: (archivo?: File) => void;
  alCrear: () => void;
  alCerrar: () => void;
};

export function ProductoCategoriaModal({ nombre, imagen, vistaPrevia, guardando, error, alCambiarNombre, alSeleccionarImagen, alCrear, alCerrar }: PropiedadesProductoCategoriaModal) {
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alCrear();
  }

  return (
    <div className="producto-brand-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) alCerrar(); }} onKeyDown={(evento) => { if (evento.key === "Escape") { evento.stopPropagation(); alCerrar(); } }}>
      <section className="producto-brand-modal" role="dialog" aria-modal="true" aria-labelledby="categoria-rapida-titulo">
        <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario de categoría" onClick={alCerrar}>×</button>
        <form onSubmit={manejarEnvio}>
          <div className="catalog-form-title"><span aria-hidden="true">▦</span><div><h2 id="categoria-rapida-titulo">Agregar categoría</h2><p>Define el grupo y una imagen para identificarlo en el catálogo.</p></div></div>
          {error && <div className="catalog-alert" role="alert">{error}</div>}
          <label>Nombre de la categoría<input autoFocus value={nombre} onChange={(evento) => alCambiarNombre(evento.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Frenos" /></label>
          <div className="catalog-upload-field">
            <div className="catalog-upload-heading"><strong>Imagen de la categoría</strong><small>JPG, PNG o WebP · máximo 5 MB</small></div>
            <label className={`catalog-upload-zone${vistaPrevia ? " has-preview" : ""}`} htmlFor="producto-categoria-imagen">
              <input className="catalog-upload-input" id="producto-categoria-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(evento) => alSeleccionarImagen(evento.target.files?.[0])} />
              {vistaPrevia
                ? <><img className="catalog-upload-preview" src={vistaPrevia} alt="Vista previa de la categoría" /><span className="catalog-upload-copy"><strong>{imagen?.name}</strong><small>Haz clic para reemplazarla</small></span><span className="catalog-upload-action">Cambiar</span></>
                : <><span className="catalog-upload-symbol" aria-hidden="true">↑</span><span className="catalog-upload-copy"><strong>Selecciona una imagen</strong><small>La imagen representativa aparecerá en Categorías.</small></span><span className="catalog-upload-action">Elegir imagen</span></>}
            </label>
          </div>
          <div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={guardando} onClick={alCerrar}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando || !imagen}>{guardando ? "Guardando…" : "Guardar categoría"}</button></div>
        </form>
      </section>
    </div>
  );
}
