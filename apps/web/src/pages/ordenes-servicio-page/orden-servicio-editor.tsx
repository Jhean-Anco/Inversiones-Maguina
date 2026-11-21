import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { FormEventHandler, KeyboardEventHandler } from "react";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import type { ClienteRegistrado, OrdenServicio, ProductoParaIngreso } from "../../services/ingresos.service";
import { selectorClienteClasses } from "../nuevo-ingreso-page/selector-cliente-classes";
import { OrdenServicioDetalle } from "./orden-servicio-detalle";
import type { LineaOrden } from "./types";
import { CatalogoRecientes } from "../../components/catalogo/catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";

type Vehiculo = { placa: string; diagnostico: string };

type OrdenServicioEditorProps = {
  alert: { message: string; onClose: () => void };
  onSubmit: FormEventHandler<HTMLFormElement>;
  orden: {
    activa: OrdenServicio | null;
    codigo: string;
    fechaRecepcion: string;
    fechaAcabado: string;
    fechaMaxima: string;
    onFechaRecepcion: (fecha: string) => void;
    onFechaAcabado: (fecha: string) => void;
  };
  catalogo: {
    busqueda: string;
    productos: ProductoParaIngreso[];
    recientes: CatalogoReciente[];
    buscando: boolean;
    onBusqueda: (valor: string) => void;
    onAgregar: (producto: ProductoParaIngreso) => void;
    onAgregarReciente: (item: CatalogoReciente) => void;
  };
  vehiculo: { datos: Vehiculo; onChange: (datos: Vehiculo) => void };
  cliente: {
    seleccionado: ClienteRegistrado | null;
    nombreSeleccionado: string;
    busqueda: string;
    busquedaConfirmada: string;
    tipoDocumento: "DNI" | "RUC" | "NOMBRE";
    clientes: ClienteRegistrado[];
    buscando: boolean;
    onBusqueda: (valor: string) => void;
    onTipoDocumento: (tipo: "DNI" | "RUC" | "NOMBRE") => void;
    onBuscar: () => void;
    onEnter: KeyboardEventHandler<HTMLInputElement>;
    onSeleccionar: (cliente: ClienteRegistrado | null) => void;
    onAgregar: () => void;
  };
  detalle: {
    lineas: LineaOrden[];
    error: string;
    recientes: CatalogoReciente[];
    buscando: boolean;
    onAgregarReciente: (item: CatalogoReciente) => void;
    onAgregarServicio: () => void;
    onAgregarProducto: (producto: ProductoParaIngreso) => void;
    onActualizarLinea: (indice: number, cambios: Partial<LineaOrden>) => void;
    onQuitarLinea: (indice: number) => void;
  };
  pago: {
    motivo: string;
    onMotivo: (valor: string) => void;
    adelanto: string;
    onAdelanto: (valor: string) => void;
    maximoAdelanto: number;
    cuentaId: string;
    medio: string;
    onCuenta: (id: string, medio: string) => void;
    guardando: boolean;
    guardarDeshabilitado: boolean;
    etiquetaGuardar: string;
    onCancelar: () => void;
  };
  formatearSoles: (monto: number) => string;
  importes: { subtotal: number; igv: number; total: number };
};

export function OrdenServicioEditor({ alert, onSubmit, orden, catalogo, vehiculo, cliente, detalle, pago, formatearSoles, importes }: OrdenServicioEditorProps) {
  return <div className="venta-page is-data-step ordenes-servicio-page">
    {alert.message && <NotificacionFlotante mensaje={alert.message} onCerrar={alert.onClose} />}
    <form className="venta-layout is-data-step" onSubmit={onSubmit}>
      <div className="venta-editor is-catalog-open">
        <aside className="venta-catalog-sidebar" aria-label="Catálogo de repuestos">
          <header><div><span>CATÁLOGO</span><h2>Buscar repuestos</h2><p>Busca en inventario y agrega los necesarios para la orden.</p></div></header>
          <label className="venta-catalog-search"><span aria-hidden="true">⌕</span><input value={catalogo.busqueda} onChange={(evento) => catalogo.onBusqueda(evento.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar en el catálogo de repuestos" autoComplete="off" /></label>
          <div className="venta-catalog-results" aria-live="polite">
            {!catalogo.busqueda.trim() ? <CatalogoRecientes items={catalogo.recientes} alSeleccionar={catalogo.onAgregarReciente} titulo="Últimos repuestos seleccionados" etiquetaAccion="Volver a agregar" /> : catalogo.busqueda.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar en inventario.</span></div> : catalogo.buscando ? <p className="venta-catalog-status">Buscando en inventario…</p> : catalogo.productos.length ? catalogo.productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <article className="venta-catalog-product" key={producto.presentacionId}>
              <div className="venta-catalog-product-title"><strong>{producto.nombre}</strong><span>{producto.codigo} · {producto.presentacion}</span></div>
              <div className="venta-catalog-product-meta"><span>Stock <b>{Number(producto.stockBase).toLocaleString("es-PE")}</b></span><strong>{formatearSoles(Number(producto.precio))}</strong></div>
              <button type="button" onClick={() => catalogo.onAgregar(producto)}>Agregar a la orden</button>
            </article>) : <div className="venta-catalog-empty"><strong>No hay repuestos para mostrar</strong><span>No encontramos coincidencias. Prueba con otro nombre o código.</span></div>}
          </div>
        </aside>

        <article className="venta-form-paper ordenes-form-paper" aria-label="Orden de servicio">
          <header className="venta-form-heading"><div><p>DOCUMENTO DE SERVICIO</p><h2>ORDEN DE SERVICIO</h2></div><div className="venta-number-card"><span>N° DE ORDEN</span><strong>{orden.activa?.codigo ?? orden.codigo}</strong></div></header>
          <div className="venta-form-header-fields ordenes-reception-fields">
            <div className="venta-fields venta-document-fields ordenes-vehicle-fields">
              <label>Fecha de recepción<input type="date" value={orden.fechaRecepcion} max={orden.fechaMaxima} disabled={Boolean(orden.activa)} onChange={(evento) => orden.onFechaRecepcion(evento.target.value)} required /></label>
              <label>Fecha estimada de acabado<input type="date" value={orden.fechaAcabado} min={orden.fechaRecepcion} onChange={(evento) => orden.onFechaAcabado(evento.target.value)} required /></label>
              <label>Placa o identificador *<input value={vehiculo.datos.placa} disabled={Boolean(orden.activa)} onChange={(evento) => vehiculo.onChange({ ...vehiculo.datos, placa: evento.target.value.toLocaleUpperCase("es-PE") })} placeholder="Ej. ABC-123" required /></label>
              <div className="ordenes-customer-field">
                <label htmlFor="orden-cliente-busqueda">Cliente</label>
                {orden.activa ? <div className={`venta-client-selected ${selectorClienteClasses.selected}`}><div><strong>{orden.activa.clienteNombre}</strong></div></div> : cliente.seleccionado ? <div className={`venta-client-selected ${selectorClienteClasses.selected}`}><div><strong>{cliente.nombreSeleccionado}</strong>{(cliente.seleccionado.documentos?.length ? cliente.seleccionado.documentos : [{ tipoDocumento: cliente.seleccionado.tipoDocumento, numeroDocumento: cliente.seleccionado.numeroDocumento }]).map((documento) => <span key={`${documento.tipoDocumento}-${documento.numeroDocumento}`}>{documento.tipoDocumento === "06" ? "RUC" : documento.tipoDocumento === "01" ? "DNI" : documento.tipoDocumento} {documento.numeroDocumento}</span>)}{cliente.seleccionado.direccion?.trim() && <span>{cliente.seleccionado.direccion}</span>}</div><div className={`venta-client-selected-actions ${selectorClienteClasses.selectedActions}`}><button className={`venta-client-remove ${selectorClienteClasses.clientRemove}`} type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => cliente.onSeleccionar(null)}>×</button></div></div> : <div className="venta-client-picker ordenes-client-picker">
                  <label className="venta-sr-only" htmlFor="orden-cliente-busqueda">Buscar cliente</label>
                  <select className="ordenes-document-select" aria-label="Tipo de documento para buscar" value={cliente.tipoDocumento} onChange={(evento) => cliente.onTipoDocumento(evento.target.value as typeof cliente.tipoDocumento)}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option></select>
                  <input id="orden-cliente-busqueda" inputMode={cliente.tipoDocumento === "NOMBRE" ? "text" : "numeric"} maxLength={cliente.tipoDocumento === "DNI" ? 8 : cliente.tipoDocumento === "RUC" ? 11 : 120} value={cliente.busqueda} onChange={(evento) => cliente.onBusqueda(evento.target.value)} onKeyDown={cliente.onEnter} placeholder={cliente.tipoDocumento === "NOMBRE" ? "Buscar por nombre" : "Ingresa " + cliente.tipoDocumento} autoComplete="off" aria-label={cliente.tipoDocumento === "NOMBRE" ? "Nombre del cliente" : "Número de " + cliente.tipoDocumento} required />
                  <button className="ordenes-search-client" type="button" onClick={cliente.onBuscar} disabled={cliente.buscando}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><span>{cliente.buscando ? "Buscando…" : "Buscar cliente"}</span></button>
                  <button className="ordenes-add-client" type="button" aria-label="Agregar cliente" title="Agregar cliente" onClick={cliente.onAgregar}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7"/></svg></button>
                  {cliente.clientes.length > 0 && <div className="venta-client-results">{cliente.clientes.map((item) => <button className="venta-client-result-select" type="button" key={item.id} onClick={() => cliente.onSeleccionar(item)}><strong>{item.razonSocial ?? [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(" ")}</strong></button>)}</div>}
                  {cliente.busquedaConfirmada === cliente.busqueda.trim() && cliente.busqueda.trim().length >= 2 && cliente.clientes.length === 0 && <NotificacionFlotante tipo="informacion" mensaje="No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +." />}
                </div>}
              </div>
            </div>
          </div>

          <OrdenServicioDetalle
            lineas={detalle.lineas}
            productos={catalogo.productos}
            busqueda={catalogo.busqueda}
            recientes={catalogo.recientes}
            buscando={catalogo.buscando}
            onAgregarReciente={catalogo.onAgregarReciente}
            error={detalle.error}
            formatearSoles={formatearSoles}
            footer={(
              <div className="venta-data-footer ordenes-data-footer">
                <label className="venta-observation-card ordenes-reason-card">Motivo de ingreso (opcional)<textarea aria-label="Motivo de ingreso (opcional)" value={pago.motivo} maxLength={2000} rows={3} onChange={(evento) => pago.onMotivo(evento.target.value)} placeholder="Describe por qué ingresa el vehículo al taller" /></label>
                <div className="venta-checkout-actions ordenes-checkout-actions">
                  <div className="venta-checkout-total">
                    <div className="ordenes-tax-breakdown" aria-label="Desglose de importes de la orden">
                      <div><span>Subtotal sin IGV</span><strong>{formatearSoles(importes.subtotal)}</strong></div>
                      <div><span>IGV (18%)</span><strong>{formatearSoles(importes.igv)}</strong></div>
                      <div className="ordenes-tax-total"><span>Total de la orden</span><strong>{formatearSoles(importes.total)}</strong></div>
                    </div>
                    <label className="venta-checkout-amount ordenes-advance-amount"><span>Monto de adelanto recibido</span><input type="number" min="0" step="0.01" max={pago.maximoAdelanto} value={pago.adelanto} onChange={(evento) => pago.onAdelanto(evento.target.value)} /></label>
                    <SelectorCuentaFinanciera value={pago.cuentaId} medioActual={pago.medio} etiqueta="Cuenta donde se recibe el adelanto" required={Number(pago.adelanto) > 0} onChange={pago.onCuenta} />
                  </div>
                  <div className="venta-checkout-buttons"><button type="button" className="venta-clear" disabled={pago.guardando} onClick={pago.onCancelar}>Cancelar</button><button className="venta-submit" type="submit" disabled={pago.guardarDeshabilitado}>{pago.etiquetaGuardar}<span aria-hidden="true">→</span></button></div>
                </div>
              </div>
            )}
            onBusqueda={catalogo.onBusqueda}
            onAgregarServicio={detalle.onAgregarServicio}
            onAgregarProducto={detalle.onAgregarProducto}
            onActualizarLinea={detalle.onActualizarLinea}
            onQuitarLinea={detalle.onQuitarLinea}
          />
        </article>
      </div>
    </form>
  </div>;
}
