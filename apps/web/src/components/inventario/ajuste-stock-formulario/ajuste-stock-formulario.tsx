import { Dialogo } from "../../ui/dialogo/dialogo";
import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { useRef, type FormEvent } from "react";
import type { ModuloMovimientosStock } from "../../../hooks/use-movimientos-stock";
import { useConfirmarCancelacionFormulario } from "../../../hooks/use-confirmar-cancelacion-formulario";
import { MOTIVOS_AJUSTE } from "../../../hooks/use-movimientos-stock";
import { CatalogoRecientes } from "../../catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../catalogo/use-catalogo-recientes";

type Propiedades = Pick<ModuloMovimientosStock,
  | "cerrarModal" | "guardando" | "error" | "setError" | "guardar" | "productoBusqueda" | "setProductoBusqueda"
  | "productosEncontrados" | "buscandoProductos" | "productoElegido" | "elegirProducto" | "productosRecientes" | "elegirProductoReciente" | "limpiarProducto"
  | "sentido" | "setSentido" | "cantidad" | "setCantidad" | "motivo" | "setMotivo"
  | "observacion" | "setObservacion" | "cantidadProyectada"
>;

export function AjusteStockFormulario({ cerrarModal, guardando, error, setError, guardar, productoBusqueda, setProductoBusqueda, productosEncontrados, buscandoProductos, productoElegido, elegirProducto, productosRecientes, elegirProductoReciente, limpiarProducto, sentido, setSentido, cantidad, setCantidad, motivo, setMotivo, observacion, setObservacion, cantidadProyectada }: Propiedades) {
  const formularioRef = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(formularioRef, cerrarModal, "el ajuste de inventario");
  function enviar(evento: FormEvent<HTMLFormElement>) { void guardar(evento); }
  return <>{dialogo}<Dialogo
      titulo="Nuevo ajuste de inventario"
      ancho="lg"
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className="catalog-cancel" type="button" disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button><button className="catalog-submit" type="submit" form="stock-adjustment-form" disabled={guardando || !productoElegido}>{guardando ? "Guardando…" : "Registrar ajuste"}</button></>}
    >
      <p className="m-0 -mt-2 text-[13px] text-[#52697d]">Registra una corrección de stock con motivo y trazabilidad.</p>
      <form id="stock-adjustment-form" ref={formularioRef} className="grid gap-4" onSubmit={enviar}>
        <div className="stock-adjustment-scroll">
          {error && <NotificacionFlotante mensaje={error} />}
          <fieldset className="stock-entry-section"><legend>Producto</legend>
            {productoElegido ? <div className="stock-adjustment-selected"><div><span>{productoElegido.codigo} · {productoElegido.marca}</span><strong>{productoElegido.nombre}</strong><small>Stock actual: {productoElegido.cantidadActual} {productoElegido.unidad}</small></div><button type="button" onClick={limpiarProducto}>Cambiar producto</button></div> : <div className="stock-product-search-field stock-adjustment-search">
              <label>Buscar por nombre, código o marca<input autoFocus value={productoBusqueda} onChange={(evento) => { setError(""); setProductoBusqueda(evento.target.value); }} placeholder="Escribe al menos 4 caracteres" autoComplete="off" aria-autocomplete="list" aria-expanded={productoBusqueda.trim().length >= MIN_CARACTERES_BUSQUEDA_CATALOGO && (buscandoProductos || productosEncontrados.length > 0)} aria-controls="adjustment-product-results" /></label>
              {buscandoProductos && <div className="stock-product-search-message" role="status">Buscando productos…</div>}
              {!productoBusqueda.trim() && <CatalogoRecientes items={productosRecientes} alSeleccionar={(item) => void elegirProductoReciente(item)} titulo="Últimos repuestos seleccionados" etiquetaAccion="Seleccionar" />}
              {productoBusqueda.trim().length > 0 && productoBusqueda.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO && <div className="stock-product-search-message" role="status">Escribe al menos cuatro caracteres para buscar.</div>}
              {!buscandoProductos && productoBusqueda.trim().length >= MIN_CARACTERES_BUSQUEDA_CATALOGO && productosEncontrados.length === 0 && <div className="stock-product-search-message" role="status">No encontramos productos para “{productoBusqueda}”.</div>}
              {productosEncontrados.length > 0 && <div className="stock-product-results" id="adjustment-product-results" role="listbox" aria-label="Resultados de productos">{productosEncontrados.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <button type="button" role="option" aria-selected="false" className="stock-product-result" key={producto.id} onClick={() => elegirProducto(producto)}><span><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.marca}</small></span><span className="stock-product-result-presentation">Stock: {producto.cantidadActual}<small>{producto.unidad}</small></span></button>)}</div>}
            </div>}
          </fieldset>
          <fieldset className="stock-entry-section"><legend>Detalle del ajuste</legend>
            <div className="stock-entry-fields">
              <label>Tipo de ajuste<select value={sentido} onChange={(evento) => setSentido(evento.target.value as "INGRESO" | "RETIRO" | "CONTEO")}><option value="CONTEO">Por conteo</option><option value="INGRESO">Aumentar stock</option><option value="RETIRO">Disminuir stock</option></select></label>
              <label>{sentido === "CONTEO" ? "Cantidad contada" : "Cantidad a ajustar"} en {productoElegido?.unidad ?? "unidad base"}<input type="number" min={sentido === "CONTEO" ? "0" : "0.001"} step="0.001" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} required /></label>
              <label>Motivo<select value={motivo} onChange={(evento) => setMotivo(evento.target.value)} required>{MOTIVOS_AJUSTE.map((opcion) => <option key={opcion.codigo} value={opcion.codigo}>{opcion.nombre}</option>)}</select></label>
              <label className="stock-entry-observation">Observación <span className="stock-field-optional">Opcional</span><input value={observacion} onChange={(evento) => setObservacion(evento.target.value)} maxLength={1000} placeholder="Agrega contexto para el historial" /></label>
            </div>
            {productoElegido && <div className={`stock-adjustment-preview${sentido === "RETIRO" ? " is-decrease" : ""}`}><span>Saldo final previsto</span><strong>{cantidadProyectada.toFixed(3)} {productoElegido.unidad}</strong></div>}
          </fieldset>
          <div className="stock-adjustment-note">El ajuste quedará registrado en el historial con el usuario, motivo y fecha. No se puede retirar más stock del disponible.</div>
        </div>
      </form>
    </Dialogo></>;
}
