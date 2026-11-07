import "./producto-detalle.css";
import { useState } from "react";
import { srcImagen } from "../../../services/api-cliente";
import type { Producto } from "../../../services/inventario/productos.service";
import { AccionIcono } from "../../ui/accion-icono";

type PropiedadesProductoDetalle = { producto: Producto; alCerrar: () => void; alEditar: () => void };

export function ProductoDetalle({ producto, alCerrar, alEditar }: PropiedadesProductoDetalle) {
  const imagenes = producto.imagenes?.length ? producto.imagenes : producto.rutaImagen ? [{ id: "principal", rutaImagen: producto.rutaImagen, orden: 1 }] : [];
  const [indiceImagen, setIndiceImagen] = useState(0);
  const imagenSeleccionada = imagenes[Math.min(indiceImagen, Math.max(0, imagenes.length - 1))];
  return <div className="catalog-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) alCerrar(); }}>
    <section className="catalog-modal catalog-detail-modal producto-detail-modal" role="dialog" aria-modal="true" aria-labelledby="producto-detail-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar detalle" onClick={alCerrar}>×</button>
      <div className="catalog-detail-content">
        <span className="catalog-eyebrow">INVENTARIO · PRODUCTO</span>
        <div className="producto-detail-gallery">
          <div className="producto-detail-image">{imagenSeleccionada ? <img src={srcImagen(imagenSeleccionada.rutaImagen)} alt={`Imagen ${indiceImagen + 1} de ${producto.nombre}`} /> : <span>▧</span>}</div>
        {imagenes.length > 1 && <div className="producto-detail-thumbnails" aria-label="Imágenes del repuesto">
            {imagenes.map((imagen, indice) => <button className={indice === indiceImagen ? "is-selected" : ""} type="button" key={imagen.id} aria-label={`Ver imagen ${indice + 1} de ${imagenes.length}`} aria-pressed={indice === indiceImagen} onClick={() => setIndiceImagen(indice)}>
              <img src={srcImagen(imagen.rutaImagen)} alt="" loading="lazy" />
            </button>)}
          </div>}
        </div>
        <div className="catalog-detail-heading"><div><h2 id="producto-detail-title">{producto.nombre}</h2><p>{producto.codigoInterno}</p></div><span className={`catalog-status${producto.activo ? "" : " inactive"}`}>{producto.activo ? "Activo" : "Inactivo"}</span></div>
        <dl className="catalog-detail-list">
          <div><dt>Categoría</dt><dd>{producto.categoria}</dd></div>
          <div><dt>Marca</dt><dd>{producto.marca}</dd></div>
          <div><dt>Descripción</dt><dd>{producto.descripcion || "Sin descripción"}</dd></div>
          <div><dt>Unidad base</dt><dd>{producto.unidadBase} ({producto.unidadBaseCodigo})</dd></div>
          <div><dt>Existencia actual</dt><dd>{new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(producto.stockActual) || 0)} {producto.unidadBase}</dd></div>
          <div><dt>Stock mínimo</dt><dd>{Number(producto.stockMinimo) > 0 ? `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(producto.stockMinimo))} ${producto.unidadBase}` : "Sin mínimo configurado"}</dd></div>
          <div><dt>IGV</dt><dd>{producto.afectacionIgv === "GRAVADO" ? "Gravado con IGV" : producto.afectacionIgv === "EXONERADO" ? "Exonerado" : "Inafecto"}</dd></div>
          {producto.creadoEn && <div><dt>Creado el</dt><dd>{new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(new Date(producto.creadoEn))}</dd></div>}
        </dl>
        {producto.codigos.length > 0 && <section className="producto-detail-section"><h3>Códigos vinculados</h3>{producto.codigos.map((codigo) => <div className="producto-detail-row" key={codigo.id ?? codigo.codigo}><span>{codigo.tipo === "FABRICANTE" ? "Fabricante / OEM" : codigo.tipo === "GTIN" ? "GTIN" : "Código de barras"}</span><strong>{codigo.codigo}</strong></div>)}</section>}
        {producto.presentaciones.length > 0 && <section className="producto-detail-section"><h3>Presentaciones</h3>{producto.presentaciones.map((presentacion) => <div className="producto-detail-row" key={presentacion.id}><span>{presentacion.nombre} · {presentacion.unidadMedidaCodigo}</span><strong>{presentacion.factorAUnidadBase} {producto.unidadBaseCodigo}</strong></div>)}</section>}
        {producto.precios.length > 0 && <section className="producto-detail-section"><h3>Precios</h3>{producto.precios.map((precio) => {
          const presentacion = producto.presentaciones.find((item) => item.id === precio.presentacionId);
          return <div className="producto-detail-row" key={precio.id}><span>{precio.tipoLista} · {presentacion?.nombre ?? "Presentación"} · desde {precio.cantidadMinima}</span><strong>S/ {Number(precio.precio).toFixed(2)}</strong></div>;
        })}</section>}
        {Object.keys(producto.fichaTecnica).length > 0 && <section className="producto-detail-section"><h3>Ficha técnica</h3>{Object.entries(producto.fichaTecnica).map(([clave, valor]) => <div className="producto-detail-row" key={clave}><span>{clave}</span><strong>{String(valor ?? "—")}</strong></div>)}</section>}
        <div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={alCerrar}>Cerrar</button><AccionIcono accion="editar" etiqueta={`Editar repuesto ${producto.nombre}`} onClick={alEditar} /></div>
      </div>
    </section>
  </div>;
}
