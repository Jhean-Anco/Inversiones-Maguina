import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
﻿import type { KeyboardEvent } from "react";
import { DesgloseImportes } from "../../components/ingresos/desglose-importes";
import type { ClienteRegistrado, ProductoParaIngreso } from "../../services/ingresos.service";
import { importeLineaCotizacion, type calcularTotalesCotizacion } from "./gestion-utils";
import { lineaVentaClasses } from "../nuevo-ingreso-page/linea-venta-classes";
import { cotizacionClases } from "./cotizacion-clases";
import { CatalogoRecientes } from "../../components/catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";

type LineaCotizacion = Record<string, unknown> & {
  tipo: "PRODUCTO" | "SERVICIO";
  nombreVisible: string;
  precioUnitario: string;
  cantidad: string;
  descuento: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
};
type TipoDocumentoBusqueda = "DNI" | "RUC" | "NOMBRE";
type CotizacionEditorProps = {
  productos: ProductoParaIngreso[];
  buscandoProductos: boolean;
  productosRecientes: CatalogoReciente[];
  onAgregarProductoReciente: (reciente: CatalogoReciente) => void;
  busquedaProducto: string;
  onBusquedaProductoChange: (valor: string) => void;
  onAgregarProducto: (producto: ProductoParaIngreso) => void;
  dinero: (valor: number) => string;
  fechaEmision: string;
  consultandoSerie: boolean;
  errorConsultaSerie: boolean;
  codigoPrevisualizado: string | null;
  cliente: ClienteRegistrado | null;
  clienteInicialId?: string | null;
  clienteInicialNombre?: string | null;
  nombreCliente: (cliente: ClienteRegistrado) => string;
  tipoDocumentoBusqueda: TipoDocumentoBusqueda;
  onTipoDocumentoBusquedaChange: (tipo: TipoDocumentoBusqueda) => void;
  clienteBusqueda: string;
  onClienteBusquedaChange: (valor: string) => void;
  clienteBusquedaConsultada: string;
  onBuscarCliente: () => void;
  onKeyDownBusquedaCliente: (evento: KeyboardEvent<HTMLInputElement>) => void;
  buscandoClientes: boolean;
  clientes: ClienteRegistrado[];
  onSeleccionarCliente: (cliente: ClienteRegistrado) => void;
  onLimpiarCliente: () => void;
  onAgregarCliente: () => void;
  vigenteHasta: string;
  onVigenteHastaChange: (fecha: string) => void;
  lineas: LineaCotizacion[];
  onAgregarServicio: () => void;
  onActualizarLinea: (indice: number, cambios: Partial<LineaCotizacion>) => void;
  onEliminarLinea: (indice: number) => void;
  observacion: string;
  onObservacionChange: (observacion: string) => void;
  totales: ReturnType<typeof calcularTotalesCotizacion>;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  editando: boolean;
};

export function CotizacionEditor({ productos, buscandoProductos, productosRecientes, onAgregarProductoReciente, busquedaProducto, onBusquedaProductoChange, onAgregarProducto, dinero, fechaEmision, consultandoSerie, errorConsultaSerie, codigoPrevisualizado, cliente, clienteInicialId = null, clienteInicialNombre = null, nombreCliente, tipoDocumentoBusqueda, onTipoDocumentoBusquedaChange, clienteBusqueda, onClienteBusquedaChange, clienteBusquedaConsultada, onBuscarCliente, onKeyDownBusquedaCliente, buscandoClientes, clientes, onSeleccionarCliente, onLimpiarCliente, onAgregarCliente, vigenteHasta, onVigenteHastaChange, lineas, onAgregarServicio, onActualizarLinea, onEliminarLinea, observacion, onObservacionChange, totales, onCerrar, onGuardar, guardando, editando }: CotizacionEditorProps) {
  return <div className="gestion-cotizacion-page">
    <div className="cotizacion-layout">
      <div className="cotizacion-editor">
        <aside className="venta-catalog-sidebar" aria-label="Catálogo de repuestos">
          <header><div><span>CATÁLOGO</span><h2>Buscar repuestos</h2><p>Busca en inventario y agrega los necesarios para la cotización.</p></div></header>
          <label className="venta-catalog-search"><span aria-hidden="true">⌕</span><input value={busquedaProducto} onChange={(e) => onBusquedaProductoChange(e.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar en el catálogo de repuestos" autoComplete="off" /></label>
          <div className="venta-catalog-results" aria-live="polite">
            {!busquedaProducto.trim() ? <CatalogoRecientes items={productosRecientes} alSeleccionar={onAgregarProductoReciente} titulo="Últimos repuestos seleccionados" etiquetaAccion="Volver a agregar" /> : busquedaProducto.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar en inventario.</span></div> : buscandoProductos ? <p className="venta-catalog-status">Buscando en inventario…</p> : productos.length ? productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <article className="venta-catalog-product" key={producto.presentacionId}>
              <div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigo} · {producto.presentacion}</span></div>
              <div className="venta-catalog-product-meta"><strong>{dinero(Number(producto.precio))}</strong></div>
              <button type="button" onClick={() => onAgregarProducto(producto)}>Agregar a la cotización</button>
            </article>) : <div className="venta-catalog-empty"><strong>No hay repuestos para mostrar</strong><span>No encontramos coincidencias. Prueba con otro nombre o código.</span></div>}
          </div>
        </aside>
        <article className="venta-form-paper gestion-cotizacion-paper" aria-label="Documento de cotización">
          <header className="venta-form-heading"><div><p>DOCUMENTO COMERCIAL</p><h2>{editando ? "EDITAR COTIZACIÓN" : "NUEVA COTIZACIÓN"}</h2></div><div className="venta-number-card"><span>N° DE COTIZACIÓN</span><strong>{consultandoSerie ? "Consultando serie…" : errorConsultaSerie ? "Error de serie" : codigoPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong></div></header>
          <div className="cotizacion-form-scroll">
          <div className="venta-form-header-fields cotizacion-header-fields" aria-label="Datos de la cotización">
            <div className="venta-fields venta-document-fields cotizacion-document-fields">
              <label>Fecha de emisión<input type="date" value={fechaEmision} readOnly aria-readonly="true" /></label>
              <label>Válida hasta<input type="date" min={fechaEmision} value={vigenteHasta} onChange={(e) => onVigenteHastaChange(e.target.value)} required /></label>
            </div>
            <div className="ordenes-customer-field gestion-cotizacion-client">
              <label htmlFor="cotizacion-cliente-busqueda">Cliente</label>
              {cliente || clienteInicialId ? <div className="venta-client-selected"><div><strong>{cliente ? nombreCliente(cliente) : clienteInicialNombre}</strong></div><button className="venta-client-remove" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={onLimpiarCliente}>×</button></div> : <div className="venta-client-picker ordenes-client-picker cotizacion-client-picker">
                <select className="ordenes-document-select" aria-label="Tipo de documento para buscar" value={tipoDocumentoBusqueda} onChange={(e) => onTipoDocumentoBusquedaChange(e.target.value as TipoDocumentoBusqueda)}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option></select>
                <input id="cotizacion-cliente-busqueda" autoComplete="off" inputMode={tipoDocumentoBusqueda === "NOMBRE" ? "text" : "numeric"} maxLength={tipoDocumentoBusqueda === "DNI" ? 8 : tipoDocumentoBusqueda === "RUC" ? 11 : 120} value={clienteBusqueda} onChange={(e) => onClienteBusquedaChange(e.target.value)} onKeyDown={onKeyDownBusquedaCliente} placeholder={tipoDocumentoBusqueda === "NOMBRE" ? "Buscar por nombre" : `Ingresa ${tipoDocumentoBusqueda}`} aria-label={tipoDocumentoBusqueda === "NOMBRE" ? "Nombre del cliente" : `Número de ${tipoDocumentoBusqueda}`} required />
                <button type="button" className="ordenes-search-client" onClick={onBuscarCliente} disabled={buscandoClientes}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><span>{buscandoClientes ? "Buscando…" : "Buscar cliente"}</span></button>
                <button type="button" className="ordenes-add-client" aria-label="Agregar cliente" title="Agregar cliente" onClick={onAgregarCliente}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7"/></svg></button>
                {clientes.length > 0 && <div className="venta-client-results">{clientes.map((item) => <button className="venta-client-result-select" type="button" key={item.id} onClick={() => onSeleccionarCliente(item)}><strong>{nombreCliente(item)}</strong></button>)}</div>}
                {clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusquedaConsultada.length >= 2 && clientes.length === 0 && <NotificacionFlotante tipo="informacion" mensaje="No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +." />}
              </div>}
            </div>
          </div>
            <section className="cotizacion-form-body" aria-label="Repuestos y servicios">
              <div className="venta-form-body-heading"><h3>Detalle de la cotización</h3><div className="venta-product-tools"><span>{lineas.length} líneas</span><button type="button" onClick={onAgregarServicio}>+ Agregar servicio</button></div></div>
              {lineas.length ? <>
              <div className={`orden-invoice-columns ${cotizacionClases.invoiceColumns}`}><span>Descripción</span><span>Cant.</span><span>Precio</span><span>Descuento</span><span>Total</span><span aria-label="Acciones" /></div>
              <div className={`orden-invoice-lines ${cotizacionClases.invoiceLines}`}>
                {(["PRODUCTO", "SERVICIO"] as const).map((tipo) => {
                  const lineasGrupo = lineas.map((linea, indice) => ({ linea, indice })).filter(({ linea }) => linea.tipo === tipo);
                  if (!lineasGrupo.length) return null;
                  return <div className={`cotizacion-line-group${tipo === "SERVICIO" && lineas.some((linea) => linea.tipo === "PRODUCTO") ? " has-separator" : ""}`} role="group" aria-label={tipo === "PRODUCTO" ? "Repuestos de la cotización" : "Servicios de la cotización"} key={tipo}>
                    {lineasGrupo.map(({ linea, indice }) => {
                      const nombre = String(linea.nombreVisible ?? linea.descripcion ?? "");
                      const cantidad = Number(linea.cantidad) || 0;
                      const precio = Number(linea.precioUnitario) || 0;
                      const importe = importeLineaCotizacion(linea);
                      return <div className={`orden-invoice-line venta-line is-boleta ${lineaVentaClasses.row} ${cotizacionClases.invoiceLine}`} key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`}>
                        <div className="venta-line-name orden-line-description"><strong>{linea.tipo === "SERVICIO" ? <input id={`cotizacion-servicio-descripcion-${indice}`} className={`cotizacion-service-description ${lineaVentaClasses.serviceDescription}`} aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={String(linea.descripcion ?? linea.nombreVisible ?? "").toLocaleUpperCase("es-PE")} onChange={(e) => onActualizarLinea(indice, { descripcion: e.target.value.toLocaleUpperCase("es-PE"), nombreVisible: e.target.value.toLocaleUpperCase("es-PE") })} /> : nombre}</strong></div>
                        <input className={`venta-qty ${lineaVentaClasses.quantity}`} aria-label={`Cantidad de ${nombre || "servicio"}`} type="number" min="1" step="1" inputMode="numeric" value={String(linea.cantidad)} onChange={(e) => onActualizarLinea(indice, { cantidad: e.target.value === "" ? "" : String(Math.max(1, Math.floor(Number(e.target.value) || 1))) })} />
                        {linea.tipo === "SERVICIO" ? <input className={`venta-service-price cotizacion-service-price ${lineaVentaClasses.servicePrice}`} aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" value={linea.precioUnitario} placeholder="0.00" onChange={(e) => onActualizarLinea(indice, { precioUnitario: e.target.value })} /> : <span className={`venta-line-price cotizacion-line-price ${lineaVentaClasses.productPrice}`}>{dinero(precio)}</span>}
                        <input className={`venta-discount ${lineaVentaClasses.discount}`} aria-label={`Descuento total de ${nombre || "servicio"}`} title="Descuento en soles" type="number" min="0" max={(cantidad * precio).toFixed(2)} step="0.01" value={String(linea.descuento)} onChange={(e) => onActualizarLinea(indice, { descuento: e.target.value })} />
                        <strong>{dinero(importe)}</strong><button type="button" aria-label={`Quitar ${nombre || "servicio"}`} onClick={() => onEliminarLinea(indice)}>×</button>
                      </div>;
                    })}
                  </div>;
                })}
              </div>
              </> : <div className="orden-invoice-empty cotizacion-empty"><strong>Agrega el primer repuesto o servicio</strong><p>Busca repuestos en el catálogo o pulsa Agregar servicio para incluir mano de obra.</p></div>}
            </section>
            <div className="venta-data-footer ordenes-data-footer cotizacion-data-footer">
              <label className="venta-observation-card ordenes-reason-card cotizacion-observations">Observaciones<textarea value={observacion} onChange={(e) => onObservacionChange(e.target.value)} placeholder="Añade una nota para el cliente" /></label>
              <div className="venta-checkout-actions ordenes-checkout-actions cotizacion-checkout-actions">
                <DesgloseImportes {...totales} destacado />
                <div className="venta-checkout-buttons"><button type="button" className="venta-clear" disabled={guardando} onClick={onCerrar}>Cancelar</button><button type="button" className="venta-submit" disabled={guardando || !codigoPrevisualizado || consultandoSerie || Boolean(errorConsultaSerie)} onClick={onGuardar}>{guardando ? "Guardando…" : "Guardar e imprimir cotización"}<span aria-hidden="true">→</span></button></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>;
}
