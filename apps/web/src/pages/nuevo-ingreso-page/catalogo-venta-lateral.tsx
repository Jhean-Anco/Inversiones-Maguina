import type { KeyboardEvent } from "react";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { TipoVenta } from "../../types/nuevo-ingreso";
import { catalogoVentaClasses } from "./catalogo-venta-classes";
import { CatalogoRecientes } from "../../components/catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";

type Props = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  puedeCrearProductos: boolean;
  formatearSoles: (monto: number) => string;
  onEnter: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCrearProducto: () => void;
};

export function CatalogoVentaLateral({ venta, tipoVenta, puedeCrearProductos, formatearSoles, onEnter, onCrearProducto }: Props) {
  const consulta = venta.busqueda.trim();
  const buscarEnCatalogo = consulta.length >= MIN_CARACTERES_BUSQUEDA_CATALOGO;
  const productos = venta.resultados.slice(0, MAX_RESULTADOS_CATALOGO);

  return <aside className={`venta-catalog-sidebar ${catalogoVentaClasses.sidebar}`} aria-label={tipoVenta === "REPUESTOS" ? "Catálogo de repuestos" : "Catálogo de mototaxis"}>
    {tipoVenta === "REPUESTOS" ? <>
      <header><div><span>CATÁLOGO</span><h2>Buscar repuestos</h2><p>Busca en inventario y revisa precios y existencias.</p></div></header>
      <div className={`venta-catalog-search ${catalogoVentaClasses.search}`}><span aria-hidden="true">⌕</span><input autoFocus value={venta.busqueda} onChange={(event) => venta.setBusqueda(event.target.value)} onKeyDown={onEnter} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar en el catálogo de repuestos" /></div>
      <div className={`venta-catalog-results ${catalogoVentaClasses.results}${!buscarEnCatalogo && !venta.buscando ? " is-recent-results" : ""}`} aria-live="polite">
        {venta.buscando ? <p className="venta-catalog-status">Buscando en inventario…</p> : buscarEnCatalogo ? productos.length ? productos.map((producto) => (
          <article className="venta-catalog-product" key={producto.presentacionId}>
            <div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigo} · {producto.presentacion}</span></div>
            <div className="venta-catalog-product-meta"><span>Stock <b>{Number(producto.stockBase).toLocaleString("es-PE")}</b></span><strong>{producto.precio ? formatearSoles(Number(producto.precio)) : producto.tramos?.length ? "Según lista y cantidad" : "Sin precio configurado"}</strong></div>
            <button type="button" disabled={!producto.precio && !producto.tramos?.length} onClick={() => venta.agregarProducto(producto)}>Agregar a la venta</button>
          </article>
        )) : <div className="venta-catalog-empty"><strong>No hay repuestos para mostrar</strong><span>No encontramos coincidencias. Prueba con otro nombre o código.</span>{puedeCrearProductos && <button className="venta-register-product-button" type="button" onClick={onCrearProducto}><span aria-hidden="true">+</span>Registrar repuesto</button>}</div> : <>
          {consulta.length > 0 && <p className="venta-catalog-status">Escribe 4 caracteres para buscar en inventario.</p>}
          <CatalogoRecientes items={venta.productosRecientes} alSeleccionar={(item) => void venta.agregarProductoReciente(item)} titulo="Últimos repuestos seleccionados" etiquetaAccion="Volver a agregar" />
        </>}
      </div>
    </> : <>
      <header><div><span>CATÁLOGO</span><h2>Mototaxis disponibles</h2><p>Selecciona el modelo y ajusta la cantidad en la venta.</p></div></header>
      <label className={`venta-catalog-search ${catalogoVentaClasses.search}`}><span aria-hidden="true">⌕</span><input value={venta.busquedaMototaxi} onChange={(event) => venta.setBusquedaMototaxi(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Buscar por modelo, marca o código…" aria-label="Buscar mototaxis disponibles" autoComplete="off" /></label>
      <div className={`venta-catalog-results is-moto-results ${catalogoVentaClasses.results}`} aria-live="polite">
        {venta.buscandoMototaxis ? <p className="venta-catalog-status">Buscando modelos…</p> : venta.busquedaMototaxi.trim().length === 0 ? <CatalogoRecientes items={venta.mototaxisRecientes} alSeleccionar={(item) => void venta.agregarMototaxiReciente(item)} titulo="Últimos modelos seleccionados" etiquetaAccion="Volver a agregar" /> : venta.busquedaMototaxi.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar modelos.</span></div> : venta.resultadosMototaxi.length ? venta.resultadosMototaxi.slice(0, MAX_RESULTADOS_CATALOGO).map((mototaxi) => (
          <article className="venta-catalog-product" key={mototaxi.mototaxiModeloId}>
            <div className="venta-catalog-product-title"><strong>{mototaxi.marca} {mototaxi.modelo}{mototaxi.version ? ` ${mototaxi.version}` : ""}</strong><span>{mototaxi.codigo}</span></div>
            <div className="venta-catalog-product-meta"><span>Disponibles <b>{mototaxi.stockDisponible}</b></span><strong>{mototaxi.precioVenta ? formatearSoles(Number(mototaxi.precioVenta)) : "Precio pendiente"}</strong></div>
            <button type="button" disabled={!mototaxi.stockDisponible || !mototaxi.precioVenta} onClick={() => venta.agregarMototaxi(mototaxi)}>Agregar a la venta</button>
          </article>
        )) : <div className="venta-catalog-empty"><strong>No hay modelos que coincidan</strong><span>Prueba con otro modelo, marca o código.</span></div>}
      </div>
    </>}
  </aside>;
}
