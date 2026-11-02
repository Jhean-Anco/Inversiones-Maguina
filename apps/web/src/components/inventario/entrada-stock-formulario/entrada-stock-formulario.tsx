import "./entrada-stock-formulario.css";
import type { FormEvent } from "react";
import type { useEntradasStock } from "../../../hooks/use-entradas-stock";

type ModuloEntradas = ReturnType<typeof useEntradasStock>;
type Props = Pick<ModuloEntradas,
  | "cerrarModal" | "guardando" | "error" | "fecha" | "setFecha" | "tipoDocumento" | "setTipoDocumento"
  | "numeroDocumento" | "setNumeroDocumento" | "proveedor" | "setProveedor" | "medioPago" | "setMedioPago" | "montoPagado" | "setMontoPagado"
  | "proveedorTipoPersona" | "setProveedorTipoPersona" | "proveedorTipoDocumento" | "setProveedorTipoDocumento"
  | "proveedorNumeroDocumento" | "setProveedorNumeroDocumento" | "proveedorDireccion" | "setProveedorDireccion" | "observacion" | "setObservacion"
  | "productoBusqueda" | "cambiarBusquedaProducto" | "productosEncontrados" | "buscandoProductos"
  | "productoElegido" | "seleccionarProductoCompra" | "limpiarProductoElegido"
  | "cantidadProducto" | "setCantidadProducto" | "costoProducto" | "setCostoProducto"
  | "detalles" | "setDetalles" | "totalBorrador" | "agregarDetalle" | "quitarDetalle" | "guardar"
> & Pick<ModuloEntradas, "totalDocumento" | "setTotalDocumento" | "totalDocumentoBorrador" | "detallesDocumento" | "actualizarDetalleDocumento" | "agregarDetalleDocumento" | "prepararRecepcionDocumento" | "quitarDetalleDocumento" | "archivoEvidencia" | "seleccionarEvidencia" | "proveedoresEncontrados" | "buscandoProveedores" | "proveedorNoEncontrado" | "datosProveedorEditables" | "setDatosProveedorEditables" | "buscarProveedor" | "seleccionarProveedor"> & { alAgregarProducto: () => void };

export function EntradaStockFormulario({ cerrarModal, guardando, error, fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento, proveedor, setProveedor, proveedorTipoPersona, setProveedorTipoPersona, proveedorTipoDocumento, setProveedorTipoDocumento, proveedorNumeroDocumento, setProveedorNumeroDocumento, proveedorDireccion, setProveedorDireccion, medioPago, setMedioPago, montoPagado, setMontoPagado, totalDocumento, setTotalDocumento, totalDocumentoBorrador, detallesDocumento, actualizarDetalleDocumento, agregarDetalleDocumento, prepararRecepcionDocumento, archivoEvidencia, seleccionarEvidencia, quitarDetalleDocumento, observacion, setObservacion, productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos, productoElegido, seleccionarProductoCompra, limpiarProductoElegido, cantidadProducto, setCantidadProducto, costoProducto, setCostoProducto, detalles, setDetalles, totalBorrador, agregarDetalle, quitarDetalle, guardar, alAgregarProducto, proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, setDatosProveedorEditables, buscarProveedor, seleccionarProveedor }: Props) {
  function enviar(evento: FormEvent<HTMLFormElement>) { void guardar(evento); }
  return <div className="catalog-modal-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) cerrarModal(); }}>
    <section className="catalog-modal stock-entry-modal" role="dialog" aria-modal="true" aria-labelledby="stock-entry-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar compra" onClick={cerrarModal}>×</button>
      <form className="catalog-form stock-entry-form" onSubmit={enviar}>
        <div className="stock-entry-form-scroll">
        <div className="catalog-form-title"><span aria-hidden="true">↓</span><div><h2 id="stock-entry-title">Nueva compra</h2><p>Registra el comprobante de compra. Puedes anotar servicios o gastos sin mover stock; solo los productos recibidos abajo actualizan existencias.</p></div></div>
        {error && <div className="catalog-alert" role="alert">{error}</div>}
        <fieldset className="stock-entry-section"><legend>Documento y proveedor</legend>
          <div className="stock-entry-fields">
            <label>Fecha de ingreso<input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required /></label>
            <label>Tipo de documento<select value={tipoDocumento} onChange={(evento) => { const tipo = evento.target.value; setTipoDocumento(tipo); if (tipo === "FACTURA") setProveedorTipoDocumento("RUC"); }}><option value="FACTURA">Factura</option><option value="BOLETA">Boleta</option><option value="GUIA_REMISION">Guía de remisión</option><option value="NOTA">Nota</option><option value="SIN_DOCUMENTO">Sin documento</option><option value="OTRO">Otro documento</option></select></label>
            <div className="stock-provider-identity">
              <label>Tipo de identificación<select value={proveedorTipoDocumento} onChange={(evento) => { const tipo = evento.target.value; setProveedorTipoDocumento(tipo); setDatosProveedorEditables(false); const numero = proveedorNumeroDocumento; setProveedorTipoPersona(tipo === "DNI" || (tipo === "RUC" && /^(10|15)/.test(numero)) ? "NATURAL" : tipo === "RUC" && numero.startsWith("20") ? "JURIDICA" : tipo === "EXT" ? proveedorTipoPersona || "JURIDICA" : ""); }} required={tipoDocumento !== "SIN_DOCUMENTO"}><option value="">Selecciona documento</option><option value="RUC">RUC</option><option value="DNI" disabled={tipoDocumento === "FACTURA"}>DNI</option><option value="EXT">Documento extranjero</option></select></label>
              <label>{proveedorTipoDocumento === "EXT" ? "Documento extranjero" : `${proveedorTipoDocumento || "RUC/DNI"} del proveedor`}<input type="text" inputMode={proveedorTipoDocumento === "EXT" ? "text" : "numeric"} pattern={proveedorTipoDocumento === "DNI" ? "[0-9]{8}" : proveedorTipoDocumento === "RUC" ? "[0-9]{11}" : proveedorTipoDocumento === "EXT" ? "[A-Za-z0-9][A-Za-z0-9 ./-]{0,99}" : "[0-9]{8,11}"} value={proveedorNumeroDocumento} onChange={(evento) => { const numero = proveedorTipoDocumento === "EXT" ? evento.target.value.replace(/[^A-Za-z0-9 ./-]/g, "").slice(0, 100) : evento.target.value.replace(/\D/g, "").slice(0, proveedorTipoDocumento === "DNI" ? 8 : 11); setProveedorNumeroDocumento(numero); setDatosProveedorEditables(false); if (proveedorTipoDocumento !== "EXT") setProveedorTipoPersona(proveedorTipoDocumento === "DNI" || (proveedorTipoDocumento === "RUC" && /^(10|15)/.test(numero)) ? "NATURAL" : proveedorTipoDocumento === "RUC" && numero.startsWith("20") ? "JURIDICA" : ""); }} maxLength={proveedorTipoDocumento === "EXT" ? 100 : proveedorTipoDocumento === "DNI" ? 8 : 11} placeholder={proveedorTipoDocumento === "DNI" ? "8 dígitos" : proveedorTipoDocumento === "EXT" ? "Pasaporte o identificación extranjera" : "11 dígitos"} required={tipoDocumento !== "SIN_DOCUMENTO"} /></label>
              <button type="button" disabled={buscandoProveedores || tipoDocumento === "SIN_DOCUMENTO"} onClick={() => void buscarProveedor()}>{buscandoProveedores ? "Buscando…" : "Buscar proveedor"}</button>
              {proveedorNoEncontrado && <span className="stock-provider-message">No encontramos este proveedor en compras anteriores.</span>}
              {proveedorNoEncontrado && <button className="stock-provider-add" type="button" onClick={() => { setDatosProveedorEditables(true); }}>+ Agregar proveedor</button>}
              {proveedoresEncontrados.length > 0 && <div className="stock-provider-results" role="listbox" aria-label="Proveedores encontrados">{proveedoresEncontrados.map((entrada) => <button type="button" role="option" aria-selected="false" key={entrada.id} onClick={() => seleccionarProveedor(entrada)}><strong>{entrada.proveedor}</strong><span>{entrada.proveedorTipoDocumento} {entrada.proveedorNumeroDocumento}</span></button>)}</div>}
            </div>
            <label>Número del documento<input value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value)} maxLength={60} placeholder={tipoDocumento === "SIN_DOCUMENTO" ? "Opcional" : "Ej. F001-00001234"} required={!['SIN_DOCUMENTO', 'OTRO'].includes(tipoDocumento)} /></label>
            {datosProveedorEditables && <><label>Nombre o razón social del proveedor<input value={proveedor} onChange={(evento) => setProveedor(evento.target.value)} maxLength={180} placeholder="Como aparece en el documento" required={tipoDocumento !== "SIN_DOCUMENTO"} /></label>
            <label>Dirección del proveedor<input value={proveedorDireccion} onChange={(evento) => setProveedorDireccion(evento.target.value)} maxLength={250} placeholder="Como figura en la ficha RUC o el comprobante" /></label></>}
            <label className="stock-entry-observation">Observación <span className="stock-field-optional">Opcional</span><input value={observacion} onChange={(evento) => setObservacion(evento.target.value)} maxLength={2000} placeholder="Detalle adicional de esta compra" /></label>
          </div>
        </fieldset>
        <fieldset className="stock-entry-section stock-document-lines-section"><legend>Según el documento</legend>
          <div className="stock-document-lines-heading"><p>Estas líneas conservan lo que indica la factura o boleta. No actualizan existencias.</p><button className="stock-document-add-line" type="button" onClick={agregarDetalleDocumento}>+ Agregar línea</button></div>
          {detallesDocumento.length ? <div className="stock-document-lines">{detallesDocumento.map((linea, indice) => <article className="stock-document-line" key={linea.clave}>
            <header><strong>Línea {indice + 1}</strong><button className="producto-remove-row" type="button" aria-label={`Quitar línea ${indice + 1} del documento`} onClick={() => quitarDetalleDocumento(linea.clave)}>×</button></header>
            <div className="stock-document-line-fields">
              <label className="stock-document-line-description">Descripción<input value={linea.descripcion} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "descripcion", evento.target.value)} maxLength={500} /></label>
              <label>Código<input value={linea.codigo} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "codigo", evento.target.value)} maxLength={100} /></label>
              <label>Unidad<input value={linea.unidad} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "unidad", evento.target.value)} maxLength={40} /></label>
              <label>Cantidad<input type="number" min="0.001" step="0.001" value={linea.cantidad} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "cantidad", evento.target.value)} /></label>
              <label>Precio unitario<input type="number" min="0" step="0.0001" value={linea.costoUnitario} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "costoUnitario", evento.target.value)} /></label>
              <label>Descuento<input type="number" min="0" step="0.01" value={linea.descuento} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "descuento", evento.target.value)} /></label>
              <label>Total de línea<input type="number" min="0" step="0.01" value={linea.total} onChange={(evento) => actualizarDetalleDocumento(linea.clave, "total", evento.target.value)} /></label>
            </div>
            <button className="stock-document-receive-line" type="button" onClick={() => prepararRecepcionDocumento(linea)}>Preparar recepción de esta línea <span aria-hidden="true">→</span></button>
          </article>)}</div> : <div className="stock-entry-empty-lines"><strong>Aún no se han agregado líneas del documento</strong><small>Agrega las líneas manualmente si deseas conservar el detalle indicado por el proveedor.</small></div>}
          <div className="stock-document-total"><label>Total según el documento (S/)<input type="number" min="0" step="0.01" value={totalDocumento} onChange={(evento) => setTotalDocumento(evento.target.value)} placeholder={totalDocumentoBorrador.toFixed(2)} /></label><strong>S/ {totalDocumentoBorrador.toFixed(2)}</strong></div>
        </fieldset>
        
        <fieldset className="stock-entry-section stock-inventory-receipt-section"><legend>Recepción de inventario</legend>
          <p className="stock-inventory-receipt-help">Registra aquí solamente lo que llegó físicamente. Estas cantidades son las que actualizarán el stock.</p>
          <div className="stock-product-search">
            <div className="stock-product-search-field">
              <div className="stock-product-search-row">
                <label>Buscar producto por nombre o código<input value={productoBusqueda} onChange={(evento) => cambiarBusquedaProducto(evento.target.value)} placeholder="Escribe 3 o más caracteres" autoComplete="off" aria-autocomplete="list" aria-expanded={!productoElegido && productoBusqueda.trim().length >= 3 && (buscandoProductos || productosEncontrados.length > 0)} aria-controls="stock-product-results" /></label>
                <button className="stock-create-product" type="button" onClick={alAgregarProducto}><span aria-hidden="true">+</span> Agregar producto</button>
              </div>
              {buscandoProductos && !productoElegido && <div className="stock-product-search-message" role="status">Buscando productos…</div>}
              {!buscandoProductos && !productoElegido && productoBusqueda.trim().length >= 3 && productosEncontrados.length === 0 && <div className="stock-product-search-message stock-product-empty-result"><span aria-live="polite">No encontramos productos con “{productoBusqueda}”.</span><button type="button" onClick={alAgregarProducto}><span aria-hidden="true">+</span> Agregar producto</button></div>}
              {!productoElegido && productosEncontrados.length > 0 && <div className="stock-product-results" id="stock-product-results" role="listbox" aria-label="Resultados de productos">{productosEncontrados.slice(0, 10).map((producto) => <button type="button" role="option" aria-selected="false" className="stock-product-result" key={producto.presentacionId} onClick={() => seleccionarProductoCompra(producto)}>
                <span><strong>{producto.nombre}</strong><small>{producto.codigoInterno} · {producto.marca}</small></span><span className="stock-product-result-presentation">{producto.presentacion}<small>{producto.factorAUnidadBase} {producto.unidadMedidaCodigo}</small></span>
              </button>)}</div>}
              {productoElegido && <div className="stock-product-selected" role="status"><span>Producto y presentación seleccionados</span><button type="button" onClick={limpiarProductoElegido}>Cambiar</button></div>}
            </div>
          </div>
          <div className="stock-entry-add-fields">
            <label>Cantidad recibida<input type="number" min="0.001" step="0.001" value={cantidadProducto} onChange={(evento) => setCantidadProducto(evento.target.value)} /></label>
            <label>Costo por presentación (S/)<input type="number" min="0" step="0.0001" value={costoProducto} onChange={(evento) => setCostoProducto(evento.target.value)} placeholder="0.00" /></label>
            <button className="stock-add-product" type="button" onClick={agregarDetalle} disabled={!productoElegido}>+ Agregar a la compra</button>
          </div>
          {detalles.length ? <div className="stock-entry-lines-wrap"><table className="stock-entry-lines"><thead><tr><th>Producto</th><th>Presentación</th><th>Cantidad</th><th>Unidades base</th><th>Costo</th><th>Subtotal</th><th /></tr></thead><tbody>
            {detalles.map((detalle, indice) => <tr key={detalle.clave}>
              <td><strong>{detalle.nombre}</strong><small>{detalle.codigo}</small><small>{detalle.detalleDocumentoId ? `Vinculado: ${detallesDocumento.find((linea) => linea.clave === detalle.detalleDocumentoId)?.descripcion ?? "línea del documento"}` : "No vinculado a una línea del documento"}</small></td><td>{detalle.presentacion} · {detalle.unidad}</td>
              <td><input aria-label={`Cantidad de ${detalle.nombre}`} type="number" min="0.001" step="0.001" value={detalle.cantidad} onChange={(evento) => setDetalles((actuales) => actuales.map((fila, index) => index === indice ? { ...fila, cantidad: evento.target.value } : fila))} /></td>
              <td>{(Number(detalle.cantidad) * detalle.factor).toFixed(3)}</td>
              <td><input aria-label={`Costo de ${detalle.nombre}`} type="number" min="0" step="0.0001" value={detalle.costoUnitario} onChange={(evento) => setDetalles((actuales) => actuales.map((fila, index) => index === indice ? { ...fila, costoUnitario: evento.target.value } : fila))} /></td>
              <td><strong>S/ {(Number(detalle.cantidad) * Number(detalle.costoUnitario)).toFixed(2)}</strong></td>
              <td><button className="producto-remove-row" type="button" aria-label={`Quitar ${detalle.nombre}`} onClick={() => quitarDetalle(detalle.clave)}>×</button></td>
            </tr>)}
          </tbody></table></div> : <div className="stock-entry-empty-lines"><span aria-hidden="true">▤</span><strong>Aún no agregas productos</strong><small>Busca un artículo, indica cuánto recibiste y su costo de compra.</small></div>}
          <div className="stock-entry-total"><span>Total recibido en inventario</span><strong>S/ {totalBorrador.toFixed(2)}</strong></div>
          <div className="stock-payment-fields">
            <label>Monto pagado ahora (S/)<input type="number" min="0" max={(detallesDocumento.length ? totalDocumentoBorrador : totalBorrador).toFixed(2)} step="0.01" value={montoPagado} onChange={(evento) => setMontoPagado(evento.target.value)} /></label>
            <label>Medio de pago<select value={medioPago} onChange={(evento) => setMedioPago(evento.target.value)} disabled={Number(montoPagado) <= 0}><option value="">No aplica por ahora</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="BILLETERA_DIGITAL">Billetera digital</option><option value="OTRO">Otro</option></select></label>
            <div className="stock-payment-balance"><span>Saldo del documento</span><strong>S/ {Math.max(0, (detallesDocumento.length ? totalDocumentoBorrador : totalBorrador) - (Number(montoPagado) || 0)).toFixed(2)}</strong></div>
          </div>
        </fieldset>
        <fieldset className="stock-entry-section stock-evidence-section"><legend>Evidencia de compra</legend>
          <label className="stock-evidence-upload">Adjunta el comprobante original<input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" disabled={guardando} onChange={(evento) => { const archivo = evento.currentTarget.files?.[0]; if (archivo) seleccionarEvidencia(archivo); evento.currentTarget.value = ""; }} /><span className="stock-upload-hint">PDF o imagen JPG, PNG o WebP, max. 15 MB</span></label>
          {archivoEvidencia && <span className="stock-evidence-name">Archivo seleccionado: {archivoEvidencia.name}</span>}
        </fieldset>
        </div>
        <div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={guardando} onClick={cerrarModal}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando || (!detalles.length && !detallesDocumento.length)}>{guardando ? "Registrando…" : "Registrar compra"}</button></div>
      </form>
    </section>
  </div>;
}
