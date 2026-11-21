import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import type { FormEvent } from "react";

type PropiedadesProductoCategoriaModal = {
  nombre: string;
  guardando: boolean;
  error: string;
  alCambiarNombre: (valor: string) => void;
  alCrear: () => void;
  alCerrar: () => void;
};

export function ProductoCategoriaModal({ nombre, guardando, error, alCambiarNombre, alCrear, alCerrar }: PropiedadesProductoCategoriaModal) {
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alCrear();
  }

  return (
    <div className="producto-brand-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) alCerrar(); }} onKeyDown={(evento) => { if (evento.key === "Escape") { evento.stopPropagation(); alCerrar(); } }}>
      <section className="producto-brand-modal" role="dialog" aria-modal="true" aria-labelledby="categoria-rapida-titulo">
        <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario de categoría" onClick={alCerrar}>×</button>
        <form onSubmit={manejarEnvio}>
          <div className="catalog-form-title"><span aria-hidden="true">▦</span><div><h2 id="categoria-rapida-titulo">Agregar categoría</h2><p>Define el grupo en el catálogo.</p></div></div>
          {error && <NotificacionFlotante mensaje={error} />}
          <label>Nombre de la categoría<input autoFocus value={nombre} onChange={(evento) => alCambiarNombre(evento.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Frenos" /></label>
          <div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={guardando} onClick={alCerrar}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar categoría"}</button></div>
        </form>
      </section>
    </div>
  );
}
