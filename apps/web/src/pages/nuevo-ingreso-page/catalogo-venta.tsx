import type { KeyboardEvent } from "react";
import { Plus, Search } from "lucide-react";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { TipoVenta } from "../../types/nuevo-ingreso";
import { soles } from "./nuevo-ingreso-formatters";

type CatalogoVentaProps = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  /** Abre el registro rápido de repuesto con lo buscado precargado (solo con permiso de inventario). */
  onCrearRepuesto?: () => void;
  onKeyDownBusquedaRepuesto: (evento: KeyboardEvent<HTMLInputElement>) => void;
};

type Resultado = { id: string; nombre: string; detalle: string; precio: string; deshabilitado: boolean; agregar: () => void };

/** Buscador del catálogo con el mismo estilo que el detalle de Órdenes de servicio. */
export function CatalogoVenta({ venta, tipoVenta, onCrearRepuesto, onKeyDownBusquedaRepuesto }: CatalogoVentaProps) {
  const esMototaxis = tipoVenta === "MOTOTAXIS";
  const busqueda = esMototaxis ? venta.busquedaMototaxi : venta.busqueda;
  const consulta = busqueda.trim();
  const buscando = esMototaxis ? venta.buscandoMototaxis : venta.buscando;
  const recientes: CatalogoReciente[] = esMototaxis ? venta.mototaxisRecientes : venta.productosRecientes;
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
      detalle: producto.presentacion,
      precio: producto.precio ? soles(Number(producto.precio)) : producto.tramos?.length ? "Según lista y cantidad" : "Sin precio",
      deshabilitado: !producto.precio && !producto.tramos?.length,
      agregar: () => venta.agregarProducto(producto),
    }));

  return <div className="os-buscador">
    <label className="os-buscador-campo">
      <Search aria-hidden="true" size={18} strokeWidth={2} />
      <input value={busqueda} onChange={(evento) => esMototaxis ? venta.setBusquedaMototaxi(evento.target.value) : venta.setBusqueda(evento.target.value)} onKeyDown={esMototaxis ? (evento) => { if (evento.key === "Enter") evento.preventDefault(); } : onKeyDownBusquedaRepuesto} placeholder={esMototaxis ? "Buscar mototaxi por modelo, marca o código…" : "Buscar repuesto por nombre o código…"} aria-label={esMototaxis ? "Buscar mototaxis disponibles" : "Buscar repuestos para la venta"} autoComplete="off" />
    </label>
    {consulta ? (
      <div className="os-resultados" aria-live="polite">
        {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar{esMototaxis ? "." : " en inventario."}</p>
          : buscando ? <p className="os-resultados-estado">{esMototaxis ? "Buscando modelos…" : "Buscando en inventario…"}</p>
          : resultados.length ? resultados.map((resultado) => (
            <button className="os-resultado" key={resultado.id} type="button" disabled={resultado.deshabilitado} aria-label={`Agregar ${resultado.nombre}`} onClick={resultado.agregar}>
              <span className="os-resultado-datos"><strong>{resultado.nombre}</strong><small>{resultado.detalle}</small></span>
              <strong className="os-resultado-precio">{resultado.precio}</strong>
            </button>
          )) : <div className="os-resultados-estado">
            <strong>{esMototaxis ? "No hay mototaxis para mostrar" : "No hay repuestos para mostrar"}</strong>
            <span>No encontramos «{consulta}» {esMototaxis ? "entre los modelos disponibles" : "en inventario"}.</span>
            {!esMototaxis && onCrearRepuesto && <button className="os-crear-repuesto" type="button" onClick={onCrearRepuesto}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Crear repuesto «{consulta}»</button>}
          </div>}
      </div>
    ) : (
      <div className="os-recientes" aria-live="polite">
        <span className="os-recientes-titulo">{esMototaxis ? "Últimos modelos seleccionados" : "Últimos repuestos seleccionados"}</span>
        {recientes.length ? recientes.map((reciente) => (
          <button className="os-reciente" key={reciente.id} type="button" aria-label={`Volver a agregar ${reciente.nombre}`} title={[reciente.codigo, reciente.detalle].filter(Boolean).join(" · ")} onClick={() => void (esMototaxis ? venta.agregarMototaxiReciente(reciente) : venta.agregarProductoReciente(reciente))}>
            <Plus aria-hidden="true" size={13} strokeWidth={2.4} />{reciente.nombre}
          </button>
        )) : <span className="os-recientes-vacio">Aún no has seleccionado artículos.</span>}
      </div>
    )}
  </div>;
}
