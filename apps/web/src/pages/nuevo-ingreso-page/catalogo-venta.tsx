import type { KeyboardEvent } from "react";
import { formularioDocumentoClases as clases } from "../../components/documentos/formulario-documento-clases";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { TipoVenta } from "../../types/nuevo-ingreso";
import { soles } from "./nuevo-ingreso-formatters";

type CatalogoVentaProps = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  puedeRegistrarRepuesto: boolean;
  onRegistrarRepuesto: () => void;
  onKeyDownBusquedaRepuesto: (evento: KeyboardEvent<HTMLInputElement>) => void;
};

type Resultado = { id: string; nombre: string; detalle: string; precio: string; deshabilitado: boolean; agregar: () => void };

const aviso = "m-0 rounded-[10px] border border-dashed border-[#c5d1db] px-4 py-3 text-center text-xs text-[#617c96]";

export function CatalogoVenta({ venta, tipoVenta, puedeRegistrarRepuesto, onRegistrarRepuesto, onKeyDownBusquedaRepuesto }: CatalogoVentaProps) {
  const esMototaxis = tipoVenta === "MOTOTAXIS";
  const busqueda = esMototaxis ? venta.busquedaMototaxi : venta.busqueda;
  const consulta = busqueda.trim();
  const buscando = esMototaxis ? venta.buscandoMototaxis : venta.buscando;
  const recientes: CatalogoReciente[] = esMototaxis ? venta.mototaxisRecientes : venta.productosRecientes;
  const tituloRecientes = esMototaxis ? "Últimos modelos seleccionados" : "Últimos repuestos seleccionados";
  const resultados: Resultado[] = esMototaxis
    ? venta.resultadosMototaxi.slice(0, MAX_RESULTADOS_CATALOGO).map((mototaxi) => ({
      id: mototaxi.mototaxiModeloId,
      nombre: `${mototaxi.marca} ${mototaxi.modelo}${mototaxi.version ? ` ${mototaxi.version}` : ""}`,
      detalle: `${mototaxi.codigo} · ${mototaxi.stockDisponible} disponibles`,
      precio: mototaxi.precioVenta ? soles(Number(mototaxi.precioVenta)) : "Precio pendiente",
      deshabilitado: !mototaxi.stockDisponible || !mototaxi.precioVenta,
      agregar: () => venta.agregarMototaxi(mototaxi),
    }))
    : venta.resultados.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => ({
      id: producto.presentacionId,
      nombre: producto.nombre,
      detalle: `${producto.codigo} · ${producto.presentacion} · Stock ${Number(producto.stockBase).toLocaleString("es-PE")}`,
      precio: producto.precio ? soles(Number(producto.precio)) : producto.tramos?.length ? "Según lista y cantidad" : "Sin precio configurado",
      deshabilitado: !producto.precio && !producto.tramos?.length,
      agregar: () => venta.agregarProducto(producto),
    }));

  return <div className="flex flex-col gap-2.5">
    <label className={clases.buscador}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
      <input className={clases.buscadorInput} value={busqueda} onChange={(evento) => esMototaxis ? venta.setBusquedaMototaxi(evento.target.value) : venta.setBusqueda(evento.target.value)} onKeyDown={esMototaxis ? (evento) => { if (evento.key === "Enter") evento.preventDefault(); } : onKeyDownBusquedaRepuesto} placeholder={esMototaxis ? "Buscar por modelo, marca o código…" : "Buscar repuesto por nombre o código…"} aria-label={esMototaxis ? "Buscar mototaxis disponibles" : "Buscar repuestos para la venta"} autoComplete="off" />
    </label>
    {!consulta && recientes.length > 0 && <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tituloRecientes}>
      <span className="text-xs font-semibold text-[#52697d]">{tituloRecientes}</span>
      {recientes.map((reciente) => <button key={reciente.id} type="button" aria-label={`Volver a agregar ${reciente.nombre}`} title={[reciente.codigo, reciente.detalle].filter(Boolean).join(" · ")} className="inline-flex h-8 items-center rounded-2xl border border-[#c5d1db] bg-white px-3 text-xs font-semibold text-[#27445f] hover:bg-[#f5f9fd]" onClick={() => void (esMototaxis ? venta.agregarMototaxiReciente(reciente) : venta.agregarProductoReciente(reciente))}>{reciente.nombre}</button>)}
    </div>}
    <div className="flex flex-col gap-2 empty:hidden" aria-live="polite">
      {buscando ? <p className="m-0 text-xs text-[#52697d]">{esMototaxis ? "Buscando modelos…" : "Buscando en inventario…"}</p>
        : !consulta ? null
          : consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className={aviso}>Escribe al menos cuatro caracteres para buscar.</p>
            : resultados.length ? resultados.map((resultado) => <article key={resultado.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e5ecf3] bg-[#f8fcff] px-3 py-2.5">
              <div className="min-w-0"><strong className="block truncate text-sm font-semibold text-[#0b2545]">{resultado.nombre}</strong><span className="text-xs text-[#5b7083]">{resultado.detalle}</span></div>
              <div className="flex flex-none items-center gap-3"><strong className="text-sm text-[#174b80]">{resultado.precio}</strong><button type="button" className="h-8 rounded-lg border border-[#d5e3ef] bg-[#f1f7fc] px-3 text-xs font-bold text-[#174b80] hover:bg-[#e6f0f9] disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Agregar ${resultado.nombre}`} disabled={resultado.deshabilitado} onClick={resultado.agregar}>Agregar</button></div>
            </article>)
              : <div className={`${aviso} flex flex-col items-center gap-2`}>
                <span>{esMototaxis ? "No hay modelos que coincidan. Prueba con otro modelo, marca o código." : "No encontramos repuestos con ese nombre o código."}</span>
                {!esMototaxis && puedeRegistrarRepuesto && <button type="button" className={clases.botonAgregarServicio} onClick={onRegistrarRepuesto}>+ Registrar repuesto</button>}
              </div>}
    </div>
  </div>;
}
