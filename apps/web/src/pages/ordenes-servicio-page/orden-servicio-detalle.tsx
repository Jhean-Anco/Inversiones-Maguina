import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { ReactNode } from "react";
import type { ProductoParaIngreso } from "../../services/ingresos.service";
import type { LineaOrden } from "./types";
import { lineaVentaClasses } from "../nuevo-ingreso-page/linea-venta-classes";
import { ordenServicioDetalleClasses as classes } from "./orden-servicio-detalle-classes";
import { CatalogoRecientes } from "../../components/catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";

type OrdenServicioDetalleProps = {
  lineas: LineaOrden[];
  productos: ProductoParaIngreso[];
  busqueda: string;
  recientes: CatalogoReciente[];
  buscando: boolean;
  error: string;
  formatearSoles: (monto: number) => string;
  footer: ReactNode;
  onBusqueda: (valor: string) => void;
  onAgregarReciente: (item: CatalogoReciente) => void;
  onAgregarServicio: () => void;
  onAgregarProducto: (producto: ProductoParaIngreso) => void;
  onActualizarLinea: (indice: number, cambios: Partial<LineaOrden>) => void;
  onQuitarLinea: (indice: number) => void;
};

export function OrdenServicioDetalle({
  lineas,
  productos,
  busqueda,
  recientes,
  buscando,
  error,
  formatearSoles,
  footer,
  onBusqueda,
  onAgregarReciente,
  onAgregarServicio,
  onAgregarProducto,
  onActualizarLinea,
  onQuitarLinea,
}: OrdenServicioDetalleProps) {
  const lineasProducto = lineas.map((linea, indice) => ({ linea, indice })).filter(({ linea }) => linea.tipo === "PRODUCTO");
  const lineasServicio = lineas.map((linea, indice) => ({ linea, indice })).filter(({ linea }) => linea.tipo === "SERVICIO");
  const renderizarLinea = ({ linea, indice }: { linea: LineaOrden; indice: number }) => {
    const descripcionServicio = String(linea.descripcion ?? linea.nombreVisible ?? "");
    const precio = Number(linea.precioUnitario) || 0;
    const cantidad = Number(linea.cantidad) || 0;
    const descuento = Number(linea.descuento) || 0;
    const totalLinea = Math.max(0, cantidad * precio - descuento);
    const descripcion = linea.tipo === "PRODUCTO" ? linea.nombreVisible : "servicio";
    return (
      <div className={`venta-line is-boleta ${lineaVentaClasses.row}${linea.tipo === "SERVICIO" ? " ordenes-service-line" : " ordenes-product-line"}`} key={`${linea.tipo}-${indice}`}>
        <div className="venta-line-name">
          <strong>
            {linea.tipo === "PRODUCTO" ? <input className={`${lineaVentaClasses.serviceDescription} ${classes.productDescription}`} aria-label="Descripción del repuesto" value={linea.nombreVisible} readOnly /> : (
              <input
                className={lineaVentaClasses.serviceDescription}
                id={`ordenes-servicio-descripcion-${indice}`}
                aria-label="Descripción del servicio"
                placeholder="Descripción del servicio"
                maxLength={240}
                value={descripcionServicio.toLocaleUpperCase("es-PE")}
                onChange={(evento) => {
                  const valor = evento.target.value.toLocaleUpperCase("es-PE");
                  onActualizarLinea(indice, { descripcion: valor, nombreVisible: valor });
                }}
              />
            )}
          </strong>
        </div>
        <input
          className={`venta-qty ${lineaVentaClasses.quantity}`}
          aria-label={`Cantidad de ${descripcion}`}
          type="number"
          min="1"
          step="1"
          value={linea.cantidad}
          onChange={(evento) => {
            const valor = evento.target.value;
            onActualizarLinea(indice, { cantidad: valor === "" ? "" : String(Math.max(1, Math.trunc(Number(valor) || 1))) });
          }}
        />
        {linea.tipo === "PRODUCTO" ? (
          <input className={`venta-service-price ${lineaVentaClasses.servicePrice} ${classes.catalogPrice}`} aria-label="Precio unitario del repuesto (precio de catálogo)" type="text" value={formatearSoles(precio)} readOnly />
        ) : (
          <input className={`venta-service-price ${lineaVentaClasses.servicePrice}`} aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" placeholder="0.00" value={linea.precioUnitario} onChange={(evento) => onActualizarLinea(indice, { precioUnitario: evento.target.value })} />
        )}
        <input className={`venta-discount ${lineaVentaClasses.discount}`} aria-label={`Descuento de ${descripcion}`} type="number" min="0" max={(cantidad * precio).toFixed(2)} step="0.01" value={linea.descuento} onChange={(evento) => onActualizarLinea(indice, { descuento: evento.target.value })} />
        <strong>{formatearSoles(totalLinea)}</strong>
        <button type="button" aria-label={`Quitar ${descripcion}`} onClick={() => onQuitarLinea(indice)}>&times;</button>
      </div>
    );
  };

  return (
    <div className="venta-form-scroll ordenes-form-scroll">
      <section className="venta-form-body">
        <div className={`venta-form-body-heading ${classes.heading}`}>
          <h3 className={classes.headingTitle}>Detalle de la orden</h3>
          <div className={`venta-product-tools ${classes.productTools}`}>
            <span className={classes.productCount}>{lineas.length} líneas</span>
            <button type="button" onClick={onAgregarServicio}>+ Agregar servicio</button>
          </div>
        </div>
        {error && <NotificacionFlotante mensaje={error} />}
        <div className={`venta-inline-product-search ${classes.inlineSearch}`}>
          <label className={`venta-inline-product-input ${classes.inlineInput}`}>
            <span className={classes.searchIcon} aria-hidden="true">⌕</span>
            <input
              className={classes.searchField}
              value={busqueda}
              onChange={(evento) => onBusqueda(evento.target.value)}
              placeholder="Buscar repuesto por nombre o código…"
              aria-label="Buscar repuestos para la orden"
              autoComplete="off"
            />
          </label>
          <div className={`venta-inline-product-list ${classes.productList}`} aria-live="polite">
            {!busqueda.trim() ? <CatalogoRecientes items={recientes} alSeleccionar={onAgregarReciente} titulo="Últimos repuestos seleccionados" etiquetaAccion="Volver a agregar" /> : busqueda.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar en inventario.</span></div> : buscando ? <p className="venta-catalog-status">Buscando en inventario…</p> : productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => (
              <button
                className={`venta-inline-product-row ${classes.productRow}`}
                key={producto.presentacionId}
                type="button"
                onClick={() => onAgregarProducto(producto)}
              >
                <span className={classes.productDetails}>
                  <strong className={classes.productName}>{producto.nombre}</strong>
                  <small className={classes.productMetadata}>{producto.codigo} · {producto.presentacion} · Stock {Number(producto.stockBase).toLocaleString("es-PE")}</small>
                </span>
                <strong className={classes.productPrice}>{formatearSoles(Number(producto.precio))}</strong>
              </button>
            ))}
          </div>
        </div>
        {lineas.length === 0 ? (
          <div className="venta-empty">
            <strong>Agrega el primer repuesto o servicio</strong>
            <span>Busca repuestos en el inventario o pulsa Agregar servicio para incluir mano de obra.</span>
          </div>
        ) : (
          <div className="venta-lines is-boleta">
            <div className="venta-table-head is-boleta">
              <span>Descripción</span><span>Cant.</span><span>Precio</span><span>Descuento</span><span>Total</span><i />
            </div>
            {lineasProducto.length > 0 && <div className={classes.lineGroup} role="group" aria-label="Productos de la orden">
              {lineasProducto.map(renderizarLinea)}
            </div>}
            {lineasProducto.length > 0 && lineasServicio.length > 0 && <div className={classes.lineGroupDivider} role="separator" aria-label="Separación entre repuestos y servicios" />}
            {lineasServicio.length > 0 && <div className={classes.lineGroup} role="group" aria-label="Servicios de la orden">
              {lineasServicio.map(renderizarLinea)}
            </div>}
          </div>
        )}
      </section>
      {footer}
    </div>
  );
}
