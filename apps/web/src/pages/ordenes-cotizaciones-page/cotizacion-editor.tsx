import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { KeyboardEvent } from "react";
import { DesgloseImportes } from "../../components/ingresos/desglose-importes";
import type { ClienteRegistrado, ProductoParaIngreso } from "../../services/ingresos.service";
import { importeLineaCotizacion, type calcularTotalesCotizacion } from "./gestion-utils";
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

const LIMITE_OBSERVACION = 2000;
const formatoFechaLarga = (fecha: string) => new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const diasEntre = (desde: string, hasta: string) => Math.round((new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86_400_000);

const tarjeta = "flex flex-col gap-5 rounded-2xl border border-[#dbe3e9] bg-white p-6 shadow-[0_8px_24px_rgba(15,42,66,.06)]";
const paso = "grid h-7 w-7 flex-none place-items-center rounded-full bg-[#0b2545] text-[13px] font-bold text-white";
const titulo = "m-0 text-[17px] font-bold text-[#0b2545]";
const campo = "box-border h-[46px] w-full min-w-0 rounded-[10px] border border-[#c5d1db] bg-white px-3.5 text-sm text-[#142b42] outline-none focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933] disabled:bg-[#f3f6f9]";
const etiquetaCampo = "grid gap-1.5 text-xs font-semibold text-[#3d566e]";
const botonSecundario = "inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] border border-[#c5d1db] bg-white px-4 text-sm font-semibold text-[#27445f] transition-colors hover:bg-[#f5f9fd] disabled:cursor-not-allowed disabled:opacity-60";
const botonPrincipal = "inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#b91e30] bg-[linear-gradient(145deg,#d92c40,#bb1d30)] px-5 text-[15px] font-bold text-white shadow-[0_7px_20px_rgba(140,26,43,.25)] disabled:cursor-not-allowed disabled:opacity-60";
const cuadriculaDetalle = "grid grid-cols-[minmax(0,1fr)_84px_124px_112px_120px_36px] items-center gap-3";

export function CotizacionEditor({ productos, buscandoProductos, productosRecientes, onAgregarProductoReciente, busquedaProducto, onBusquedaProductoChange, onAgregarProducto, dinero, fechaEmision, consultandoSerie, errorConsultaSerie, codigoPrevisualizado, cliente, clienteInicialId = null, clienteInicialNombre = null, nombreCliente, tipoDocumentoBusqueda, onTipoDocumentoBusquedaChange, clienteBusqueda, onClienteBusquedaChange, clienteBusquedaConsultada, onBuscarCliente, onKeyDownBusquedaCliente, buscandoClientes, clientes, onSeleccionarCliente, onLimpiarCliente, onAgregarCliente, vigenteHasta, onVigenteHastaChange, lineas, onAgregarServicio, onActualizarLinea, onEliminarLinea, observacion, onObservacionChange, totales, onCerrar, onGuardar, guardando, editando }: CotizacionEditorProps) {
  const busquedaValida = busquedaProducto.trim().length >= MIN_CARACTERES_BUSQUEDA_CATALOGO;
  const clienteElegido = Boolean(cliente || clienteInicialId);
  const nombreElegido = cliente ? nombreCliente(cliente) : clienteInicialNombre;
  const dias = vigenteHasta ? diasEntre(fechaEmision, vigenteHasta) : null;
  const sinSerie = !codigoPrevisualizado || consultandoSerie || errorConsultaSerie;
  const gruposLineas = (["PRODUCTO", "SERVICIO"] as const)
    .map((tipo) => ({ tipo, items: lineas.map((linea, indice) => ({ linea, indice })).filter(({ linea }) => linea.tipo === tipo) }))
    .filter((grupo) => grupo.items.length > 0);

  return <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto pb-12 pr-1 text-[#142b42]">
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-7 items-center gap-[7px] rounded-[14px] border border-[#c9e3d4] bg-[#edf7f1] px-3 text-xs font-semibold text-[#24734e]"><i className="h-[7px] w-[7px] rounded-full bg-[#2e9467]" aria-hidden="true" />{editando ? "Editando cotización" : "Se creará como Activa"}</span>
      <div className="flex flex-col gap-0.5 rounded-xl border border-[#dbe3e9] bg-white px-4 py-2">
        <span className="text-[10px] font-bold tracking-[.08em] text-[#52697d]">N.° DE COTIZACIÓN</span>
        <strong className="text-base font-extrabold tracking-[.02em] text-[#0b2545]">{consultandoSerie ? "Consultando serie…" : errorConsultaSerie ? "Error de serie" : codigoPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong>
      </div>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className={tarjeta} aria-labelledby="cotizacion-titulo-datos">
          <div className="flex items-center gap-3"><span className={paso} aria-hidden="true">1</span><h3 id="cotizacion-titulo-datos" className={titulo}>Datos de la cotización</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={etiquetaCampo}>Fecha de emisión<input className={`${campo} bg-[#f3f6f9] text-[#52697d]`} type="date" value={fechaEmision} readOnly aria-readonly="true" /></label>
            <label className={etiquetaCampo}>Válida hasta *<input className={campo} type="date" min={fechaEmision} value={vigenteHasta} onChange={(evento) => onVigenteHastaChange(evento.target.value)} required /></label>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="cotizacion-cliente-busqueda" className={etiquetaCampo}>Cliente *</label>
            {clienteElegido ? <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#c9e3d4] bg-[#f4faf6] px-4 py-3">
              <strong className="text-sm font-semibold text-[#0b2545]">{nombreElegido}</strong>
              <button type="button" className={botonSecundario} aria-label="Cambiar cliente" title="Cambiar cliente" onClick={onLimpiarCliente}>Cambiar</button>
            </div> : <>
              <div className="flex flex-wrap gap-2.5">
                <select aria-label="Tipo de documento para buscar" className={`${campo} !w-[116px] flex-none`} value={tipoDocumentoBusqueda} onChange={(evento) => onTipoDocumentoBusquedaChange(evento.target.value as TipoDocumentoBusqueda)}>
                  <option value="NOMBRE">Nombre</option><option value="DNI">DNI</option><option value="RUC">RUC</option>
                </select>
                <input id="cotizacion-cliente-busqueda" className={`${campo} !w-auto min-w-[200px] flex-[1_1_220px]`} autoComplete="off" inputMode={tipoDocumentoBusqueda === "NOMBRE" ? "text" : "numeric"} maxLength={tipoDocumentoBusqueda === "DNI" ? 8 : tipoDocumentoBusqueda === "RUC" ? 11 : 120} value={clienteBusqueda} onChange={(evento) => onClienteBusquedaChange(evento.target.value)} onKeyDown={onKeyDownBusquedaCliente} placeholder={tipoDocumentoBusqueda === "NOMBRE" ? "Buscar por nombre" : `Ingresa ${tipoDocumentoBusqueda}`} aria-label={tipoDocumentoBusqueda === "NOMBRE" ? "Nombre del cliente" : `Número de ${tipoDocumentoBusqueda}`} required />
                <button type="button" className="inline-flex h-[46px] items-center gap-2 rounded-[10px] bg-[#0b2545] px-[18px] text-sm font-semibold text-white disabled:opacity-60" onClick={onBuscarCliente} disabled={buscandoClientes}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>{buscandoClientes ? "Buscando…" : "Buscar cliente"}
                </button>
                <button type="button" className="grid h-[46px] w-[46px] place-items-center rounded-[10px] border border-[#c5d1db] bg-white text-[#174b78] hover:bg-[#f5f9fd]" aria-label="Agregar cliente" title="Agregar cliente" onClick={onAgregarCliente}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7" /></svg>
                </button>
              </div>
              {clientes.length > 0 && <ul aria-label="Resultados de clientes" className="m-0 flex list-none flex-col gap-0.5 rounded-xl border border-[#dbe3e9] bg-white p-1.5 shadow-[0_10px_26px_rgba(15,42,66,.1)]">
                {clientes.map((item) => <li key={item.id}><button type="button" className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#eef4fa]" onClick={() => onSeleccionarCliente(item)}><strong className="text-sm font-semibold text-[#0b2545]">{nombreCliente(item)}</strong></button></li>)}
              </ul>}
              {clienteBusquedaConsultada === clienteBusqueda.trim() && clienteBusquedaConsultada.length >= 2 && clientes.length === 0 && <NotificacionFlotante tipo="informacion" mensaje="No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +." />}
            </>}
          </div>
        </section>

        <section className={tarjeta} aria-labelledby="cotizacion-titulo-detalle">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={paso} aria-hidden="true">2</span>
              <h3 id="cotizacion-titulo-detalle" className={titulo}>Detalle de la cotización</h3>
              <span className="rounded-xl bg-[#eef2f6] px-2.5 py-[3px] text-xs font-semibold text-[#3d566e]">{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
            </div>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#edbbc1] bg-[#fff4f5] px-4 text-[13px] font-bold text-[#a91b2b]" onClick={onAgregarServicio}>+ Agregar servicio</button>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="flex h-[46px] items-center gap-2.5 rounded-[10px] border border-[#c5d1db] bg-[#f7f9fb] px-3.5 text-[#52697d] focus-within:border-[#2878b9]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
              <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#142b42] outline-none" aria-label="Buscar repuestos para la cotización" placeholder="Buscar repuesto por nombre o código…" autoComplete="off" value={busquedaProducto} onChange={(evento) => onBusquedaProductoChange(evento.target.value)} />
            </label>
            {productosRecientes.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Últimos repuestos seleccionados">
              <span className="text-xs font-semibold text-[#52697d]">Últimos repuestos seleccionados</span>
              {productosRecientes.map((reciente) => <button key={reciente.id} type="button" aria-label={`Volver a agregar ${reciente.nombre}`} className="inline-flex h-8 items-center rounded-2xl border border-[#c5d1db] bg-white px-3 text-xs font-semibold text-[#27445f] hover:bg-[#f5f9fd]" onClick={() => onAgregarProductoReciente(reciente)}>{reciente.nombre}</button>)}
            </div>}
            {busquedaValida && <div className="flex flex-col gap-2" aria-live="polite">
              {buscandoProductos ? <p className="m-0 text-xs text-[#52697d]">Buscando en inventario…</p> : productos.length ? productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <article key={producto.presentacionId} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e5ecf3] bg-[#f8fcff] px-3 py-2.5">
                <div className="min-w-0"><strong className="block truncate text-sm font-semibold text-[#0b2545]">{producto.nombre}</strong><span className="text-xs text-[#5b7083]">{producto.codigo} · {producto.presentacion}</span></div>
                <div className="flex flex-none items-center gap-3"><strong className="text-sm text-[#174b80]">{dinero(Number(producto.precio))}</strong><button type="button" className="h-8 rounded-lg border border-[#d5e3ef] bg-[#f1f7fc] px-3 text-xs font-bold text-[#174b80] hover:bg-[#e6f0f9]" onClick={() => onAgregarProducto(producto)}>Agregar</button></div>
              </article>) : <p className="m-0 rounded-[10px] border border-dashed border-[#c5d1db] px-4 py-3 text-center text-xs text-[#617c96]">No encontramos repuestos con ese nombre o código.</p>}
            </div>}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#dbe3e9]">
            <div className="min-w-[760px]">
              <div className={`${cuadriculaDetalle} border-b border-[#dbe3e9] bg-[#f7f9fb] px-4 py-[11px] text-[11px] font-bold tracking-[.06em] text-[#52697d]`}>
                <span>DESCRIPCIÓN</span><span>CANT.</span><span>PRECIO</span><span>DESCUENTO</span><span className="text-right">TOTAL</span><span aria-hidden="true" />
              </div>
              {lineas.length === 0 && <div className="grid place-items-center gap-1.5 px-4 py-10 text-center">
                <strong className="text-sm text-[#294d6c]">Agrega el primer repuesto o servicio</strong>
                <p className="m-0 max-w-[420px] text-xs text-[#7a8da1]">Busca repuestos arriba o pulsa Agregar servicio para incluir mano de obra.</p>
              </div>}
              {gruposLineas.map((grupo) => <div key={grupo.tipo} role="group" aria-label={grupo.tipo === "PRODUCTO" ? "Repuestos de la cotización" : "Servicios de la cotización"}>
                <div className="border-b border-[#edf1f5] bg-[#fbfcfd] px-4 py-2 text-[11px] font-bold tracking-[.08em] text-[#174b78]">{grupo.tipo === "PRODUCTO" ? "REPUESTOS" : "SERVICIOS"}</div>
                {grupo.items.map(({ linea, indice }) => {
                  const nombre = String(linea.nombreVisible ?? linea.descripcion ?? "");
                  const etiquetaLinea = nombre || (linea.tipo === "SERVICIO" ? "servicio" : "repuesto");
                  return <div key={`${String(linea.presentacionId ?? linea.descripcion)}-${indice}`} className={`${cuadriculaDetalle} border-b border-[#edf1f5] px-4 py-2.5`}>
                    <div className="min-w-0">
                      {linea.tipo === "SERVICIO"
                        ? <input id={`cotizacion-servicio-descripcion-${indice}`} className={`${campo} h-10 uppercase`} aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={String(linea.descripcion ?? linea.nombreVisible ?? "").toLocaleUpperCase("es-PE")} onChange={(evento) => onActualizarLinea(indice, { descripcion: evento.target.value.toLocaleUpperCase("es-PE"), nombreVisible: evento.target.value.toLocaleUpperCase("es-PE") })} />
                        : <strong className="block truncate text-sm font-semibold text-[#142b42]">{nombre}</strong>}
                    </div>
                    <input className="box-border h-10 w-full rounded-lg border border-[#c5d1db] px-2.5 text-center text-sm text-[#142b42]" aria-label={`Cantidad de ${etiquetaLinea}`} type="number" min="1" step="1" inputMode="numeric" value={String(linea.cantidad)} onChange={(evento) => onActualizarLinea(indice, { cantidad: evento.target.value === "" ? "" : String(Math.max(1, Math.floor(Number(evento.target.value) || 1))) })} />
                    {linea.tipo === "SERVICIO"
                      ? <input className="box-border h-10 w-full rounded-lg border border-[#c5d1db] px-2.5 text-right text-sm text-[#142b42]" aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" value={linea.precioUnitario} placeholder="0.00" onChange={(evento) => onActualizarLinea(indice, { precioUnitario: evento.target.value })} />
                      : <span className="text-right text-sm tabular-nums text-[#142b42]">{dinero(Number(linea.precioUnitario) || 0)}</span>}
                    <input className="box-border h-10 w-full rounded-lg border border-[#c5d1db] px-2.5 text-right text-sm text-[#142b42]" aria-label={`Descuento de ${etiquetaLinea}`} title="Descuento en soles" type="number" min="0" step="0.01" value={String(linea.descuento)} onChange={(evento) => onActualizarLinea(indice, { descuento: evento.target.value })} />
                    <strong className="text-right text-sm font-bold tabular-nums text-[#0b2545]">{dinero(importeLineaCotizacion(linea))}</strong>
                    <button type="button" className="grid h-8 w-8 place-items-center justify-self-end rounded-lg text-[#7a8da0] hover:bg-[#fff1f2] hover:text-[#b42335]" aria-label={`Quitar ${etiquetaLinea}`} onClick={() => onEliminarLinea(indice)}>×</button>
                  </div>;
                })}
              </div>)}
            </div>
          </div>
        </section>

        <section className={tarjeta} aria-labelledby="cotizacion-titulo-observaciones">
          <div className="flex items-center gap-3"><span className={paso} aria-hidden="true">3</span><h3 id="cotizacion-titulo-observaciones" className={titulo}>Observaciones <span className="text-[13px] font-medium text-[#52697d]">(opcional)</span></h3></div>
          <textarea className="box-border w-full resize-y rounded-[10px] border border-[#c5d1db] bg-white px-3.5 py-3 text-sm leading-normal text-[#142b42] outline-none focus:border-[#2878b9]" aria-label="Observaciones (opcional)" rows={3} maxLength={LIMITE_OBSERVACION} placeholder="Añade una nota para el cliente" value={observacion} onChange={(evento) => onObservacionChange(evento.target.value)} />
          <span className="self-end text-xs text-[#5b7083]">{observacion.length} / {LIMITE_OBSERVACION}</span>
        </section>
      </div>

      <aside className="flex flex-col gap-5 rounded-2xl border border-[#dbe3e9] bg-white p-6 shadow-[0_8px_24px_rgba(15,42,66,.06)] xl:sticky xl:top-6" aria-label="Resumen de la cotización">
        <h3 className={titulo}>Resumen de la cotización</h3>
        <DesgloseImportes {...totales} destacado />
        <div className="flex flex-col gap-2.5 rounded-xl border border-[#edf1f5] bg-[#f7f9fb] p-4 text-[13px]">
          <div className="flex justify-between gap-3"><span className="text-[#52697d]">Emisión</span><strong className="tabular-nums text-[#0b2545]">{formatoFechaLarga(fechaEmision)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#52697d]">Válida hasta</span><strong className="tabular-nums text-[#0b2545]">{vigenteHasta ? formatoFechaLarga(vigenteHasta) : "Sin fecha"}</strong></div>
          {dias !== null && dias >= 0 && <div className="flex justify-between gap-3"><span className="text-[#52697d]">Vigencia</span><strong className="text-[#24734e]">{dias} {dias === 1 ? "día" : "días"}</strong></div>}
        </div>
        <div className="flex flex-col gap-2.5">
          <button type="button" className={botonPrincipal} disabled={guardando || sinSerie} onClick={onGuardar}>{guardando ? "Guardando…" : "Guardar e imprimir cotización"}<span aria-hidden="true">→</span></button>
          <button type="button" className={`${botonSecundario} w-full`} disabled={guardando} onClick={onCerrar}>Cancelar</button>
        </div>
      </aside>
    </div>
  </div>;
}
