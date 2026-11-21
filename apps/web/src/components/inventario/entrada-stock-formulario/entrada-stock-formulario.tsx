
import { useState, type FormEvent } from "react";
import type { useEntradasStock } from "../../../hooks/use-entradas-stock";
import { CatalogoRecientes } from "../../catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../catalogo/use-catalogo-recientes";
import { CompraCatalogo, CompraDocumento, CompraPie, CompraRevision } from "../../documentos/compra-documento";
import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { ProveedorCompraRepuestos } from "./proveedor-compra-repuestos";

const documentos = {
  FACTURA: "Factura",
  BOLETA: "Boleta",
  GUIA_REMISION: "Guía de remisión",
  NOTA: "Nota",
  SIN_DOCUMENTO: "Sin documento",
  OTRO: "Otro documento",
};

type ModuloEntradas = ReturnType<typeof useEntradasStock>;

export function EntradaStockFormulario({ modulo, cerrar, alAgregarProducto }: {
  modulo: ModuloEntradas; cerrar: () => void; alAgregarProducto: () => void;
}) {
  const {
    guardando, error, setError, fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento,
    proveedor, proveedorTipoDocumento, setProveedorTipoDocumento, proveedorNumeroDocumento,
    observacion, setObservacion, productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos,
    productoElegido, productosRecientes, seleccionarProductoReciente, seleccionarProductoCompra, limpiarProductoElegido,
    detalles, setDetalles, totalBorrador, pagosCompra, setPagosCompra, agregarPagoCompra, quitarPagoCompra, quitarDetalle, guardar,
  } = modulo;
  const [enRevision, setEnRevision] = useState(false);
  const tituloDocumento = documentos[tipoDocumento as keyof typeof documentos] ?? tipoDocumento;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    if (enRevision) {
      void guardar(evento);
      return;
    }
    evento.preventDefault();
    setError("");
    setEnRevision(true);
  }

  const etiquetaDetalle = `${detalles.length} ${detalles.length === 1 ? "línea" : "líneas"}`;
  const catalogo = <CompraCatalogo
    titulo="Buscar repuestos"
    etiqueta="Buscar repuestos para comprar"
    placeholder="Nombre o código"
    valor={productoBusqueda}
    alBuscar={cambiarBusquedaProducto}
    accion={<button className="compra-secundario" type="button" onClick={alAgregarProducto}>+ Agregar producto</button>}
  >
    {buscandoProductos ? <p className="venta-catalog-status">Buscando en inventario…</p>
      : productoElegido ? <div className="venta-catalog-empty">
        <strong>Repuesto agregado al detalle</strong>
        <button className="compra-secundario" type="button" onClick={limpiarProductoElegido}>Buscar otro</button>
      </div>
      : !productoBusqueda.trim() ? <CatalogoRecientes items={productosRecientes} alSeleccionar={(item) => void seleccionarProductoReciente(item)} titulo="Últimos repuestos seleccionados" etiquetaAccion="Seleccionar" />
      : productoBusqueda.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar.</span></div>
      : productosEncontrados.length ? productosEncontrados.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <article className="venta-catalog-product" key={producto.presentacionId}>
        <div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigoInterno} · {producto.marca}</span></div>
        <div className="venta-catalog-product-meta"><span>{producto.presentacion}</span><span>{producto.factorAUnidadBase} {producto.unidadMedidaCodigo}</span></div>
        <button type="button" onClick={() => seleccionarProductoCompra(producto)}>Seleccionar</button>
      </article>)
      : <div className="venta-catalog-empty"><strong>Sin resultados</strong><span>Prueba con otro nombre o código.</span></div>}
  </CompraCatalogo>;

  const campos = <>
    <div className="compra-campos compra-comprobante">
      <label>Tipo de documento
        <select value={tipoDocumento} onChange={(evento) => {
          const tipo = evento.target.value;
          setTipoDocumento(tipo);
          if (tipo === "FACTURA") setProveedorTipoDocumento("RUC");
        }}>
          {Object.entries(documentos).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
      </label>
      <label>Fecha de ingreso<input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required /></label>
      <label>Número del documento
        <input value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value)} maxLength={60}
          placeholder={tipoDocumento === "SIN_DOCUMENTO" ? "Opcional" : "Ej. F001-00001234"} required={!["SIN_DOCUMENTO", "OTRO"].includes(tipoDocumento)} />
      </label>
    </div>
    <ProveedorCompraRepuestos modulo={modulo} />
  </>;

  const detalle = detalles.length ? <div className="compra-tabla-scroll" role="region" aria-label="Detalle de repuestos" tabIndex={0}>
    <table className="compra-tabla" role="table" aria-label="Repuestos de la compra">
      <thead><tr><th scope="col">Descripción</th><th scope="col">Cantidad</th><th scope="col">Costo unitario</th><th scope="col">Total de línea</th><th scope="col" aria-label="Acciones" /></tr></thead>
      <tbody>{detalles.map((fila) => <tr key={fila.clave}>
        <td><strong>{fila.nombre}</strong><small>{fila.codigo} · {fila.presentacion}{fila.unidad && fila.unidad !== fila.presentacion ? ` · ${fila.unidad}` : ""}</small></td>
        <td data-campo="Cantidad"><input aria-label={`Cantidad de ${fila.nombre}`} type="number" min="0.001" step="0.001" value={fila.cantidad} required onChange={(evento) => {
          const cantidad = evento.target.value;
          setDetalles((filas) => filas.map((item) => item.clave === fila.clave ? {
            ...item, cantidad, costoUnitario: Number(cantidad) > 0 ? (Number(item.importeTotal) / Number(cantidad)).toFixed(4) : item.costoUnitario,
          } : item));
        }} /><small>{(Number(fila.cantidad) * fila.factor).toFixed(3)} unidades base</small></td>
        <td data-campo="Costo unitario"><span className="compra-importe">S/ {Number(fila.costoUnitario).toFixed(4)}</span></td>
        <td data-campo="Total de línea"><input aria-label={`Precio total de ${fila.nombre}`} type="number" min="0.01" step="0.01" value={fila.importeTotal} required onChange={(evento) => {
          const importeTotal = evento.target.value;
          setDetalles((filas) => filas.map((item) => item.clave === fila.clave ? {
            ...item, importeTotal, costoUnitario: Number(importeTotal) > 0 && Number(item.cantidad) > 0 ? (Number(importeTotal) / Number(item.cantidad)).toFixed(4) : "0.0000",
          } : item));
        }} /></td>
        <td><button className="compra-quitar" type="button" aria-label={`Quitar ${fila.nombre}`} onClick={() => quitarDetalle(fila.clave)}>×</button></td>
      </tr>)}</tbody>
    </table>
  </div> : <div className="venta-empty"><strong>Agrega el primer repuesto</strong><span>Busca en el catálogo e indica la cantidad y el precio total de la línea.</span></div>;

  const revision = <CompraRevision
    proveedor={<>{proveedor || "Sin nombre registrado"}<small>{proveedorTipoDocumento} {proveedorNumeroDocumento}</small></>}
    fecha={fecha}
    documento={<>{tituloDocumento}{numeroDocumento && <small>{numeroDocumento}</small>}</>}
    observacion={observacion}
    detalle={<div className="compra-revision-lineas">{detalles.map((fila) => <article key={fila.clave}>
      <div><strong>{fila.nombre}</strong><small>{fila.codigo} · {fila.presentacion}</small><small>{fila.cantidad} × S/ {Number(fila.costoUnitario).toFixed(4)}</small></div>
      <strong className="compra-importe">S/ {Number(fila.importeTotal).toFixed(2)}</strong>
    </article>)}</div>}
  />;

  return <>
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <CompraDocumento titulo={enRevision ? "Revisar compra de repuestos" : "Nueva compra de repuestos"} enRevision={enRevision}
      catalogo={catalogo} campos={campos} tituloDetalle="Repuestos de la compra" conteoDetalle={etiquetaDetalle} detalle={detalle}
      pie={<CompraPie total={totalBorrador} observacion={observacion} alObservar={setObservacion} pagos={pagosCompra} alCambiarPagos={setPagosCompra}
        alAgregarPago={agregarPagoCompra} alQuitarPago={quitarPagoCompra} alCancelar={cerrar} alEditar={() => setEnRevision(false)}
        guardando={guardando} tieneDetalle={detalles.length > 0} enRevision={enRevision} />}
      revision={revision} onSubmit={enviar}
    />
  </>;
}
