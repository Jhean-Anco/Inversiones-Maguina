import "./producto-card.css";
import { srcImagen } from "../../../services/api-cliente";
import type { ProductoTarjeta } from "../../../services/inventario/productos.service";

type Propiedades = {
  producto: ProductoTarjeta;
  alVer: () => void;
  alEditar: () => void;
  alCambiarEstado: () => void;
};

export function ProductoCard({ producto, alVer, alEditar, alCambiarEstado }: Propiedades) {
  const imagen = srcImagen(producto.rutaImagen);
  return <article className={`producto-card${producto.activo ? "" : " is-inactive"}`}>
    <button className="producto-card-main" type="button" onClick={alVer} aria-label={`Ver información de ${producto.nombre}`}>
      <div className="producto-card-visual">
        {imagen ? <img src={imagen} alt={`Imagen de ${producto.nombre}`} loading="lazy" /> : <span className="producto-card-placeholder" aria-hidden="true">{producto.nombre.trim().slice(0, 1).toLocaleUpperCase("es-PE")}</span>}
        <span className={`producto-card-status${producto.activo ? "" : " inactive"}`}><i />{producto.activo ? "Activo" : "Inactivo"}</span>
        <span className="producto-card-code">{producto.codigoInterno}</span>
      </div>
      <div className="producto-card-copy">
        <div className="producto-card-tags"><span>{producto.categoria}</span><span>{producto.marca}</span></div>
        <h3>{producto.nombre}</h3>
        <p>{producto.descripcion?.trim() || "Sin descripción adicional"}</p>
        <span className="producto-card-open">Ver producto <b aria-hidden="true">→</b></span>
      </div>
    </button>
    <div className="producto-card-actions">
      <button type="button" onClick={alEditar}>Editar</button>
      <button type="button" onClick={alCambiarEstado}>{producto.activo ? "Desactivar" : "Activar"}</button>
    </div>
  </article>;
}
