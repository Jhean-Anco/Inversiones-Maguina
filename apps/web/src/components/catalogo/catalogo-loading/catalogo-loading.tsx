import "./catalogo-loading.css";
type PropiedadesCargaCatalogo = {
  mensaje: string;
  cantidadTarjetas?: number;
};

export function CatalogoLoading({ mensaje, cantidadTarjetas = 5 }: PropiedadesCargaCatalogo) {
  return (
    <div className="catalog-loading" role="status" aria-live="polite" aria-label={mensaje}>
      <span className="catalog-loading-message"><span className="catalog-loading-spinner" aria-hidden="true" />{mensaje}</span>
      <div className="catalog-loading-grid" aria-hidden="true">
        {Array.from({ length: cantidadTarjetas }, (_, indice) => (
          <div className="catalog-loading-card" key={indice}>
            <span className="catalog-loading-image" />
            <span className="catalog-loading-line catalog-loading-line-short" />
            <span className="catalog-loading-line" />
            <span className="catalog-loading-actions"><i /><i /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
