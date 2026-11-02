import "./catalogo-card.css";
type AccionTarjeta = {
  etiqueta: string;
  ejecutar: () => void;
};

type PropiedadesTarjeta = {
  tipo: "Categoría" | "Marca" | "Producto";
  nombre: string;
  imagenSrc: string;
  imagenAlt: string;
  imagenFallback: string;
  activa: boolean;
  onAbrir?: () => void;
  textoApertura?: string;
  descripcionBreve?: string;
  acciones: AccionTarjeta[];
  imagenMarca?: boolean;
};

export function CatalogoCard({
  tipo,
  nombre,
  imagenSrc,
  imagenAlt,
  imagenFallback,
  activa,
  onAbrir,
  textoApertura,
  descripcionBreve,
  acciones,
  imagenMarca = false,
}: PropiedadesTarjeta) {
  return (
    <article className={`catalog-card${activa ? "" : " is-inactive"}`}>
      <button
        className="catalog-card-main"
        type="button"
        disabled={!onAbrir}
        onClick={onAbrir}
        aria-label={onAbrir ? `Ver información de ${tipo.toLocaleLowerCase("es-PE")} ${nombre}` : undefined}
      >
        <div className={`catalog-card-image${imagenMarca ? " catalog-brand-image" : ""}`}>
          {imagenSrc ? <img src={imagenSrc} alt={imagenAlt} loading="lazy" /> : <span>{imagenFallback}</span>}
          <span className={`catalog-status${activa ? "" : " inactive"}`}>{activa ? "Activa" : "Inactiva"}</span>
        </div>
        <div className="catalog-card-copy">
          <div className="catalog-card-title"><span className="catalog-card-kicker">{tipo.toLocaleUpperCase("es-PE")}</span><h3>{nombre}</h3></div>
          {textoApertura && <span className="catalog-card-open-hint">{textoApertura}<span aria-hidden="true">→</span></span>}
          {descripcionBreve && <span className="catalog-card-caption">{descripcionBreve}</span>}
        </div>
      </button>
      <div className="catalog-card-actions">
        {acciones.map((accion) => <button className="catalog-card-action" key={accion.etiqueta} type="button" onClick={accion.ejecutar}>{accion.etiqueta}</button>)}
      </div>
    </article>
  );
}
