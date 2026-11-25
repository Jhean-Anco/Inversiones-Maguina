import type { ReactNode } from "react";
import { formularioDocumentoClases as clases } from "../../components/documentos/formulario-documento-clases";
import { importeLinea, precioRepuestoEnLinea } from "../../domain/ingresos/importes-venta";
import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { LineaCarrito, TipoVenta } from "../../types/nuevo-ingreso";
import { LineaVentaRow } from "./linea-venta-row";
import { soles } from "./nuevo-ingreso-formatters";

type NuevaVentaEditorProps = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  etiquetaNumero: string;
  numero: string;
  fechaMaxima: string;
  fecha: string;
  onTipoComprobanteChange: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  onFechaChange: (fecha: string) => void;
  selectorCliente: ReactNode;
  catalogo: ReactNode;
  puedeAgregarServicio: boolean;
  lineas: LineaCarrito[];
  cantidadTotal: number;
  resumen: ReactNode;
  onCancelar: () => void;
};

const LIMITE_OBSERVACION = 1000;
const nombresComprobante = { BOLETA: "Boleta de venta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" } as const;
const gruposVenta = [["PRODUCTO", "REPUESTOS"], ["MOTOTAXI", "MOTOTAXIS"], ["SERVICIO", "SERVICIOS"]] as const;
const formatoFechaLarga = (fecha: string) => new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

export function NuevaVentaEditor({ venta, tipoVenta, etiquetaNumero, numero, fechaMaxima, fecha, onTipoComprobanteChange, onFechaChange, selectorCliente, catalogo, puedeAgregarServicio, lineas, cantidadTotal, resumen, onCancelar }: NuevaVentaEditorProps) {
  const esMototaxis = tipoVenta === "MOTOTAXIS";
  const esFactura = venta.tipoComprobante === "FACTURA";
  const esNotaVenta = venta.tipoComprobante === "NOTA_VENTA";
  const cuadricula = `grid items-center gap-3 ${esFactura ? "grid-cols-[minmax(0,1fr)_84px_124px_112px_124px_112px_36px]" : "grid-cols-[minmax(0,1fr)_84px_124px_112px_120px_36px]"}`;
  const grupos = gruposVenta
    .map(([tipo, titulo]) => ({ tipo, titulo, items: lineas.filter((linea) => linea.tipo === tipo) }))
    .filter((grupo) => grupo.items.length > 0);

  return <>
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-7 items-center gap-[7px] rounded-[14px] border border-[#c9e3d4] bg-[#edf7f1] px-3 text-xs font-semibold text-[#24734e]"><i className="h-[7px] w-[7px] rounded-full bg-[#2e9467]" aria-hidden="true" />{nombresComprobante[venta.tipoComprobante]} · {esMototaxis ? "Venta de mototaxis" : "Venta de repuestos"}</span>
      <div className="flex flex-col gap-0.5 rounded-xl border border-[#dbe3e9] bg-white px-4 py-2">
        <span className="text-[10px] font-bold tracking-[.08em] text-[#52697d]">{etiquetaNumero}</span>
        <strong className="text-base font-extrabold tracking-[.02em] text-[#0b2545]">{numero}</strong>
      </div>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className={clases.tarjeta} aria-labelledby="venta-titulo-datos">
          <div className="flex items-center gap-3"><span className={clases.paso} aria-hidden="true">1</span><h3 id="venta-titulo-datos" className={clases.titulo}>Datos de la venta</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={clases.etiquetaCampo}>Tipo de comprobante<select className={clases.campo} value={venta.tipoComprobante} onChange={(evento) => onTipoComprobanteChange(evento.target.value as "BOLETA" | "FACTURA" | "NOTA_VENTA")}><option value="BOLETA">Boleta de venta</option><option value="FACTURA">Factura</option><option value="NOTA_VENTA">Nota de venta</option></select></label>
            <label className={clases.etiquetaCampo}>{esNotaVenta ? "Fecha de salida" : "Fecha de emisión"}<input className={clases.campo} type="date" min={esNotaVenta ? undefined : venta.fechaMinimaComprobante} max={esNotaVenta ? undefined : fechaMaxima} value={fecha} onChange={(evento) => onFechaChange(evento.target.value)} required /></label>
          </div>
          {selectorCliente}
        </section>

        <section className={clases.tarjeta} aria-labelledby="venta-titulo-detalle">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={clases.paso} aria-hidden="true">2</span>
              <h3 id="venta-titulo-detalle" className={clases.titulo}>{esMototaxis ? "Mototaxis de esta venta" : "Repuestos y servicios de esta venta"}</h3>
              <span className={clases.contador}>{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
            </div>
            {puedeAgregarServicio && <button type="button" className={clases.botonAgregarServicio} onClick={venta.agregarServicio}>+ Agregar servicio</button>}
          </div>

          {catalogo}

          <div className="overflow-x-auto rounded-xl border border-[#dbe3e9]">
            <div className={esFactura ? "min-w-[880px]" : "min-w-[760px]"}>
              <div className={`${cuadricula} border-b border-[#dbe3e9] bg-[#f7f9fb] px-4 py-[11px] text-[11px] font-bold tracking-[.06em] text-[#52697d]`}>
                <span>DESCRIPCIÓN</span><span className="text-center">CANT.</span><span className="text-right">PRECIO</span><span className="text-right">DESCUENTO</span>{esFactura && <span>OPERACIÓN</span>}<span className="text-right">TOTAL</span><span aria-hidden="true" />
              </div>
              {lineas.length === 0 && <div className="grid place-items-center gap-1.5 px-4 py-10 text-center">
                <strong className="text-sm text-[#294d6c]">{esMototaxis ? "Agrega la primera mototaxi" : "Agrega el primer repuesto"}</strong>
                <p className="m-0 max-w-[420px] text-xs text-[#7a8da1]">{esMototaxis ? "Busca arriba un modelo disponible para iniciar." : "Busca en el catálogo o añade un servicio para iniciar."}</p>
              </div>}
              {grupos.map((grupo) => <div key={grupo.tipo} role="group" aria-label={`${grupo.titulo.toLocaleLowerCase("es-PE")} de la venta`}>
                <div className="border-b border-[#edf1f5] bg-[#fbfcfd] px-4 py-2 text-[11px] font-bold tracking-[.08em] text-[#174b78]">{grupo.titulo}</div>
                {grupo.items.map((linea) => {
                  const precio = linea.tipo === "PRODUCTO" ? Number(precioRepuestoEnLinea(linea)) : Number(linea.precio) || 0;
                  const importe = precio * (Number(linea.cantidad) || 0);
                  const nombreLinea = linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.tipo === "MOTOTAXI" ? `${linea.mototaxi.marca} ${linea.mototaxi.modelo}` : linea.descripcion || "servicio";
                  return <LineaVentaRow key={linea.clave} linea={linea} esFactura={esFactura} cuadricula={cuadricula} precio={precio} importe={importe} nombreLinea={nombreLinea} totalLinea={importeLinea(Number(linea.cantidad) || 0, precio, Number(linea.descuento) || 0)} formatearSoles={soles} onActualizar={(cambios) => venta.actualizarLinea(linea.clave, cambios)} onQuitar={() => venta.quitarLinea(linea.clave)} />;
                })}
              </div>)}
            </div>
          </div>
        </section>

        <section className={clases.tarjeta} aria-labelledby="venta-titulo-observaciones">
          <div className="flex items-center gap-3"><span className={clases.paso} aria-hidden="true">3</span><h3 id="venta-titulo-observaciones" className={clases.titulo}>Observaciones <span className="text-[13px] font-medium text-[#52697d]">(opcional)</span></h3></div>
          <textarea className={clases.observaciones} aria-label="Observaciones (opcional)" rows={3} maxLength={LIMITE_OBSERVACION} placeholder="Añade una nota" value={venta.observacion} onChange={(evento) => venta.setObservacion(evento.target.value)} />
          <span className="self-end text-xs text-[#5b7083]">{venta.observacion.length} / {LIMITE_OBSERVACION}</span>
        </section>
      </div>

      <aside className={clases.resumen} aria-label="Resumen de la venta">
        <h3 className={clases.titulo}>Resumen de la venta</h3>
        {resumen}
        <div className="flex flex-col gap-2.5 rounded-xl border border-[#edf1f5] bg-[#f7f9fb] p-4 text-[13px]">
          <div className="flex justify-between gap-3"><span className="text-[#52697d]">{esNotaVenta ? "Salida" : "Emisión"}</span><strong className="tabular-nums text-[#0b2545]">{fecha ? formatoFechaLarga(fecha) : "Sin fecha"}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#52697d]">Comprobante</span><strong className="text-[#0b2545]">{nombresComprobante[venta.tipoComprobante]}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#52697d]">Unidades</span><strong className="tabular-nums text-[#0b2545]">{cantidadTotal.toLocaleString("es-PE")}</strong></div>
        </div>
        <div className="flex flex-col gap-2.5">
          <button type="submit" className={clases.botonPrincipal}>Continuar <span aria-hidden="true">→</span></button>
          <button type="button" className={`${clases.botonSecundario} w-full`} onClick={onCancelar}>Cancelar</button>
        </div>
      </aside>
    </div>
  </>;
}
