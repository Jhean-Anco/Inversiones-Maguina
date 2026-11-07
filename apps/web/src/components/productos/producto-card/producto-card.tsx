import "./producto-card.css";
import { srcImagen } from "../../../services/api-cliente";
import type { ProductoTarjeta } from "../../../services/inventario/productos.service";
import { AccionIcono } from "../../ui/accion-icono";

type Propiedades = {
  producto: ProductoTarjeta;
  alVer: () => void;
  alEditar: () => void;
  alCambiarEstado: () => void;
};

export function ProductoCard({ producto, alVer, alEditar, alCambiarEstado }: Propiedades) {
  const imagen = srcImagen(producto.rutaImagen);
  const stock = Number(producto.stockActual) || 0;
  const minimo = Number(producto.stockMinimo) || 0;
  const estadoStock = stock <= 0 ? "is-out" : minimo > 0 && stock <= minimo ? "is-low" : "is-available";
  const etiquetaStock = stock <= 0 ? "Sin stock" : estadoStock === "is-low" ? "Stock bajo" : "Disponible";
  const formatoStock = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });
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
        <div className={`producto-card-stock ${estadoStock}`}>
          <span><small>Existencia actual</small><strong>{formatoStock.format(stock)} <i>{producto.unidadBase}</i></strong></span>
          <span className="producto-card-stock-state">{etiquetaStock}</span>
          {minimo > 0 && <small className="producto-card-stock-min">Mínimo {formatoStock.format(minimo)}</small>}
        </div>
        <span className="producto-card-open">Ver producto <b aria-hidden="true">→</b></span>
      </div>
    </button>
    <div className="producto-card-actions">
      <AccionIcono accion="editar" etiqueta={`Editar ${producto.nombre}`} onClick={alEditar} />
      <AccionIcono accion={producto.activo ? "desactivar" : "activar"} etiqueta={`${producto.activo ? "Desactivar" : "Activar"} ${producto.nombre}`} onClick={alCambiarEstado} />
    </div>
  </article>;
}
