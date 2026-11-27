import "../ordenes-servicio-page/orden-servicio-editor.css";
import "./nueva-venta-editor.css";
import type { ReactNode } from "react";
import { ChevronDown, MessageSquareText, Plus, Printer } from "lucide-react";
import { importeLinea, precioRepuestoEnLinea } from "../../domain/ingresos/importes-venta";
import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { LineaCarrito, TipoVenta } from "../../types/nuevo-ingreso";
import { tonosEstadoOrden } from "../ordenes-servicio-page/estados-orden";
import { LineaVentaRow } from "./linea-venta-row";
import { soles } from "./nuevo-ingreso-formatters";

type TipoComprobante = "BOLETA" | "FACTURA" | "NOTA_VENTA";

type NuevaVentaEditorProps = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  etiquetaNumero: string;
  numero: string;
  fechaMaxima: string;
  fecha: string;
  onTipoComprobanteChange: (tipo: TipoComprobante) => void;
  onFechaChange: (fecha: string) => void;
  selectorCliente: ReactNode;
  catalogo: ReactNode;
  puedeAgregarServicio: boolean;
  lineas: LineaCarrito[];
  /** Contenido del resumen bajo el total (saldo de la orden, cuenta de cobro, detalle de la venta registrada…). */
  resumen: ReactNode;
  /** Contenido que va antes del formulario (avisos flotantes). */
  avisos?: ReactNode;
  etiquetaGuardar: string;
  guardarDeshabilitado: boolean;
  tituloGuardar?: string;
  guardando: boolean;
  onSubmit: (evento: React.FormEvent<HTMLFormElement>) => void;
  onCancelar: () => void;
};

const LIMITE_OBSERVACION = 1000;
const nombresComprobante: Record<TipoComprobante, string> = { BOLETA: "Boleta de venta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" };
const gruposVenta = [["PRODUCTO", "REPUESTOS"], ["MOTOTAXI", "MOTOTAXIS"], ["SERVICIO", "SERVICIOS"]] as const;

/** Formulario de nueva venta con la estructura `os-*` de Órdenes de servicio. */
export function NuevaVentaEditor({ venta, tipoVenta, etiquetaNumero, numero, fechaMaxima, fecha, onTipoComprobanteChange, onFechaChange, selectorCliente, catalogo, puedeAgregarServicio, lineas, resumen, avisos, etiquetaGuardar, guardarDeshabilitado, tituloGuardar, guardando, onSubmit, onCancelar }: NuevaVentaEditorProps) {
  const esMototaxis = tipoVenta === "MOTOTAXIS";
  const esFactura = venta.tipoComprobante === "FACTURA";
  const esNotaVenta = venta.tipoComprobante === "NOTA_VENTA";
  const grupos = gruposVenta
    .map(([tipo, titulo]) => ({ tipo, titulo, items: lineas.filter((linea) => linea.tipo === tipo) }))
    .filter((grupo) => grupo.items.length > 0);
  const tonoAbierta = tonosEstadoOrden.ABIERTA;

  return <div className="os-editor venta-editor">
    {avisos}
    <form className="os-formulario" onSubmit={onSubmit}>
      <div className="os-indicadores">
        <span className={`os-chip ${tonoAbierta.caja}`}><i className={tonoAbierta.punto} aria-hidden="true" />{nombresComprobante[venta.tipoComprobante]} · {esMototaxis ? "Venta de mototaxis" : "Venta de repuestos"}</span>
        <div className="os-numero"><span>{etiquetaNumero}</span><strong>{numero}</strong></div>
      </div>

      <div className="os-disposicion">
        <div className="os-columna">
          <section className="os-tarjeta" aria-labelledby="venta-titulo-datos">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">1</span><h3 id="venta-titulo-datos">Datos de la venta</h3></div>
            </div>
            <div className="os-campos venta-campos">
              <label className="os-campo">Tipo de comprobante *
                <span className="os-select">
                  <select value={venta.tipoComprobante} onChange={(evento) => onTipoComprobanteChange(evento.target.value as TipoComprobante)}><option value="BOLETA">Boleta de venta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta</option></select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">{esNotaVenta ? "Fecha de salida *" : "Fecha de emisión *"}
                <input type="date" min={esNotaVenta ? undefined : venta.fechaMinimaComprobante} max={esNotaVenta ? undefined : fechaMaxima} value={fecha} onChange={(evento) => onFechaChange(evento.target.value)} required />
              </label>
            </div>
            {selectorCliente}
          </section>

          <section className="os-tarjeta" aria-labelledby="venta-titulo-detalle">
            <div className="os-tarjeta-cabecera is-dividida">
              <div className="os-titulo">
                <span className="os-paso" aria-hidden="true">2</span>
                <h3 id="venta-titulo-detalle">Detalle de la venta</h3>
                <span className="os-contador">{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
              </div>
              {puedeAgregarServicio && <button className="os-boton-servicio" type="button" onClick={venta.agregarServicio}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Agregar servicio</button>}
            </div>

            {catalogo}

            {lineas.length === 0 ? (
              <div className="os-vacio">
                <strong>{esMototaxis ? "Agrega la primera mototaxi" : "Agrega el primer repuesto o servicio"}</strong>
                <span>{esMototaxis ? "Busca un modelo disponible para iniciar la venta." : "Busca repuestos en el inventario o pulsa Agregar servicio."}</span>
              </div>
            ) : (
              <div className={`os-lineas${esFactura ? " es-factura" : ""}`}>
                <div className="os-lineas-cabecera" aria-hidden="true">
                  <span>DESCRIPCIÓN</span><span>CANT.</span><span>PRECIO</span><span>DESCUENTO</span>{esFactura && <span>OPERACIÓN</span>}<span>TOTAL</span><span />
                </div>
                {grupos.map((grupo) => <div key={grupo.tipo} role="group" aria-label={`${grupo.titulo.toLocaleLowerCase("es-PE")} de la venta`}>
                  <div className="os-lineas-grupo">{grupo.titulo}</div>
                  {grupo.items.map((linea) => {
                    const precio = linea.tipo === "PRODUCTO" ? Number(precioRepuestoEnLinea(linea)) || 0 : Number(linea.precio) || 0;
                    const importe = precio * (Number(linea.cantidad) || 0);
                    const nombreLinea = linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.tipo === "MOTOTAXI" ? `${linea.mototaxi.marca} ${linea.mototaxi.modelo}${linea.mototaxi.version ? ` ${linea.mototaxi.version}` : ""}` : linea.descripcion || "servicio";
                    return <LineaVentaRow key={linea.clave} linea={linea} esFactura={esFactura} precio={precio} importe={importe} nombreLinea={nombreLinea} totalLinea={importeLinea(Number(linea.cantidad) || 0, precio, Number(linea.descuento) || 0)} formatearSoles={soles} onActualizar={(cambios) => venta.actualizarLinea(linea.clave, cambios)} onQuitar={() => venta.quitarLinea(linea.clave)} />;
                  })}
                </div>)}
              </div>
            )}
          </section>

          <section className="os-tarjeta" aria-labelledby="venta-titulo-observaciones">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">3</span><h3 id="venta-titulo-observaciones">Observaciones</h3></div>
            </div>
            <div className="os-revision">
              <label className="os-campo os-revision-condicion">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Nota para el comprobante <em className="os-opcional">Opcional</em></span>
                <textarea value={venta.observacion} maxLength={LIMITE_OBSERVACION} rows={3} onChange={(evento) => venta.setObservacion(evento.target.value)} placeholder="Ej. Se entrega con garantía de 3 meses; el cliente recoge el pedido el lunes." />
                <small className="os-ayuda os-contador">{venta.observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </section>
        </div>

        <aside className="os-resumen" aria-label="Resumen de la venta">
          <h3>Resumen de la venta</h3>
          <dl className="os-importes" aria-label="Total de la venta">
            <div className="es-total"><dt>Total de la venta</dt><dd>{soles(venta.exito ? Number(venta.exito.total) : venta.totales.total)}</dd></div>
          </dl>
          {resumen}
          <div className="os-acciones">
            <button className="os-guardar" type="submit" disabled={guardarDeshabilitado} title={tituloGuardar}><Printer aria-hidden="true" size={18} />{etiquetaGuardar}</button>
            <button className="os-cancelar" type="button" disabled={guardando} onClick={onCancelar}>{venta.exito ? "Volver al listado" : "Cancelar"}</button>
          </div>
        </aside>
      </div>
    </form>
  </div>;
}
