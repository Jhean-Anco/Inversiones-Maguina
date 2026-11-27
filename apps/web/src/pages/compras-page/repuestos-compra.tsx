import { Plus, Search, X } from "lucide-react";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";
import type { useEntradasStock } from "../../hooks/use-entradas-stock";

const soles = (valor: number) => `S/ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = { modulo: ReturnType<typeof useEntradasStock>; onCrearRepuesto: () => void };

/** Buscador de repuestos y líneas `os-linea`: cantidad y total de la línea; el costo unitario se calcula solo. */
export function RepuestosCompra({ modulo, onCrearRepuesto }: Props) {
  const { productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos, productoElegido, productosRecientes,
    seleccionarProductoReciente, seleccionarProductoCompra, limpiarProductoElegido, detalles, setDetalles, quitarDetalle } = modulo;
  const consulta = productoElegido ? "" : productoBusqueda.trim();

  function cambiarLinea(clave: string, cambios: { cantidad?: string; importeTotal?: string }) {
    setDetalles((filas) => filas.map((fila) => {
      if (fila.clave !== clave) return fila;
      const siguiente = { ...fila, ...cambios };
      const cantidad = Number(siguiente.cantidad);
      const importe = Number(siguiente.importeTotal);
      return { ...siguiente, costoUnitario: cantidad > 0 && importe > 0 ? (importe / cantidad).toFixed(4) : "0.0000" };
    }));
  }

  return <>
    <div className="os-buscador">
      <label className="os-buscador-campo">
        <Search aria-hidden="true" size={18} strokeWidth={2} />
        <input type="search" value={consulta} autoComplete="off" placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar repuestos para comprar"
          onChange={(evento) => cambiarBusquedaProducto(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
      </label>
      {consulta ? <div className="os-resultados" aria-live="polite">
        {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar en inventario.</p>
          : buscandoProductos ? <p className="os-resultados-estado">Buscando en inventario…</p>
          : productosEncontrados.length ? productosEncontrados.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <button className="os-resultado" key={producto.presentacionId} type="button"
            onClick={() => { seleccionarProductoCompra(producto); limpiarProductoElegido(); }}>
            <span className="os-resultado-datos"><strong>{producto.nombre}</strong><small>{[producto.marca, producto.presentacion].filter(Boolean).join(" · ")}</small></span>
            <Plus aria-hidden="true" size={16} />
          </button>)
          : <div className="os-resultados-estado"><strong>No hay repuestos para mostrar</strong><span>No encontramos «{consulta}» en inventario.</span>
            <button className="os-crear-repuesto" type="button" onClick={onCrearRepuesto}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Crear repuesto «{consulta}»</button>
          </div>}
      </div> : <div className="os-recientes" aria-live="polite">
        <span className="os-recientes-titulo">Últimos repuestos seleccionados</span>
        {productosRecientes.length ? productosRecientes.map((item) => <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a agregar ${item.nombre}`} title={item.detalle ?? undefined}
          onClick={() => { void seleccionarProductoReciente(item).then(limpiarProductoElegido); }}>
          <Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}
        </button>) : <span className="os-recientes-vacio">Aún no has seleccionado repuestos.</span>}
      </div>}
    </div>

    {detalles.length === 0 ? <div className="os-vacio">
      <strong>Agrega el primer repuesto</strong>
      <span>Búscalo en el inventario e indica la cantidad y el total pagado por la línea.</span>
    </div> : <div className="os-lineas" role="table" aria-label="Repuestos de la compra">
      <div className="os-lineas-cabecera" role="row"><span role="columnheader">DESCRIPCIÓN</span><span role="columnheader">CANT.</span><span role="columnheader">COSTO UNIT.</span><span role="columnheader">TOTAL</span><span role="columnheader" aria-label="Quitar" /></div>
      <div role="rowgroup" aria-label="Repuestos de la compra">
      <div className="os-lineas-grupo">REPUESTOS</div>
      {detalles.map((fila) => <div role="row" className="os-linea es-producto" key={fila.clave}>
        <div role="cell" className="os-linea-descripcion">
          <input aria-label="Descripción del repuesto" title={`${fila.nombre} · ${fila.presentacion}`} value={fila.nombre} readOnly />
        </div>
        <label role="cell" className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
          <input aria-label={`Cantidad de ${fila.nombre}`} type="number" min="0.001" step="0.001" required value={fila.cantidad}
            onChange={(evento) => cambiarLinea(fila.clave, { cantidad: evento.target.value })} />
        </label>
        <label role="cell" className="os-linea-campo os-linea-precio"><span>Costo unit.</span>
          <input aria-label={`Costo unitario de ${fila.nombre} (calculado)`} type="text" value={soles(Number(fila.costoUnitario))} readOnly tabIndex={-1} />
        </label>
        <label role="cell" className="os-linea-campo os-linea-descuento"><span>Total</span>
          <input aria-label={`Total pagado por ${fila.nombre}`} type="number" min="0.01" step="0.01" placeholder="0.00" required value={Number(fila.importeTotal) ? fila.importeTotal : ""}
            onChange={(evento) => cambiarLinea(fila.clave, { importeTotal: evento.target.value })} />
        </label>
        <button className="os-linea-quitar" type="button" aria-label={`Quitar ${fila.nombre}`} title="Quitar" onClick={() => quitarDetalle(fila.clave)}><X aria-hidden="true" size={16} /></button>
      </div>)}
      </div>
    </div>}
  </>;
}
