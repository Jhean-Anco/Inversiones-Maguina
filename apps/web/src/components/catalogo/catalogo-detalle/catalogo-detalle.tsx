import "./catalogo-detalle.css";
import { srcImagen } from "../../../services/api-cliente";

type PropiedadesCatalogoDetalle = {
  tipo: "Categoría" | "Marca";
  nombre: string;
  rutaImagen: string | null;
  activo: boolean;
  creadoEn?: string;
  alCerrar: () => void;
  alEditar: () => void;
};

export function CatalogoDetalle({ tipo, nombre, rutaImagen, activo, creadoEn, alCerrar, alEditar }: PropiedadesCatalogoDetalle) {
  const etiqueta = tipo.toLocaleLowerCase("es-PE");
  const estado = activo
    ? tipo === "Categoría" ? "Disponible para asignar a productos" : "Disponible para asociar a productos y motocicletas"
    : `Inactiva para nuevos ${tipo === "Categoría" ? "productos" : "registros"}`;

  return <div className="catalog-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) alCerrar(); }}>
    <section className="catalog-modal catalog-detail-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-detail-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar detalle" onClick={alCerrar}>×</button>
      <div className="catalog-detail-content">
        <span className="catalog-eyebrow">INVENTARIO · {tipo.toLocaleUpperCase("es-PE")}</span>
        <div className={`catalog-detail-image${tipo === "Marca" ? " catalog-brand-image" : ""}`}>
          {rutaImagen ? <img src={srcImagen(rutaImagen)} alt={`${tipo === "Marca" ? "Logotipo" : "Imagen"} de ${nombre}`} /> : <span>{tipo === "Marca" ? nombre.trim().slice(0, 1).toLocaleUpperCase("es-PE") : "▦"}</span>}
        </div>
        <div className="catalog-detail-heading">
          <div><h2 id="catalog-detail-title">{nombre}</h2><p>Información {tipo === "Categoría" ? "de la categoría" : "de la marca"}</p></div>
          <span className={`catalog-status${activo ? "" : " inactive"}`}>{activo ? "Activa" : "Inactiva"}</span>
        </div>
        <dl className="catalog-detail-list">
          <div><dt>Nombre</dt><dd>{nombre}</dd></div>
          <div><dt>Estado</dt><dd>{estado}</dd></div>
          {creadoEn && <div><dt>Creada el</dt><dd>{new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(new Date(creadoEn))}</dd></div>}
        </dl>
        <div className="catalog-form-actions">
          <button className="catalog-cancel" type="button" onClick={alCerrar}>Cerrar</button>
          <button className="catalog-submit" type="button" onClick={alEditar}>Editar {etiqueta}</button>
        </div>
      </div>
    </section>
  </div>;
}
