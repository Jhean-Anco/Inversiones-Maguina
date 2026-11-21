import type { CatalogoReciente } from "./use-catalogo-recientes";

export function CatalogoRecientes({ items, alSeleccionar, titulo = "Últimos productos seleccionados", etiquetaAccion = "Volver a agregar" }: {
  items: CatalogoReciente[];
  alSeleccionar: (item: CatalogoReciente) => void;
  titulo?: string;
  etiquetaAccion?: string;
}) {
  return <section className="venta-recent-products" aria-label={titulo}>
    <h3>{titulo}</h3>
    {items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => alSeleccionar(item)}>
      <span className="venta-recent-product-info"><strong>{item.nombre}</strong><small>{[item.codigo, item.detalle].filter(Boolean).join(" · ")}</small></span>
      <strong>{etiquetaAccion}</strong>
    </button>) : <p>Aún no has seleccionado artículos.</p>}
  </section>;
}
