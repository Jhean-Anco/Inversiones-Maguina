import { Plus, Search, X } from "lucide-react";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { ProductoParaIngreso } from "../../services/ingresos.service";
import type { LineaOrden } from "./types";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";

type OrdenServicioDetalleProps = {
  lineas: LineaOrden[];
  productos: ProductoParaIngreso[];
  busqueda: string;
  recientes: CatalogoReciente[];
  buscando: boolean;
  error: string;
  formatearSoles: (monto: number) => string;
  onBusqueda: (valor: string) => void;
  onAgregarReciente: (item: CatalogoReciente) => void;
  onAgregarServicio: () => void;
  onAgregarProducto: (producto: ProductoParaIngreso) => void;
  onActualizarLinea: (indice: number, cambios: Partial<LineaOrden>) => void;
  onQuitarLinea: (indice: number) => void;
  /** Abre el registro rápido de repuesto con lo buscado precargado. */
  onCrearRepuesto?: () => void;
};

type LineaIndexada = { linea: LineaOrden; indice: number };

export function OrdenServicioDetalle({
  lineas,
  productos,
  busqueda,
  recientes,
  buscando,
  error,
  formatearSoles,
  onBusqueda,
  onAgregarReciente,
  onAgregarServicio,
  onAgregarProducto,
  onActualizarLinea,
  onQuitarLinea,
  onCrearRepuesto,
}: OrdenServicioDetalleProps) {
  const lineasIndexadas: LineaIndexada[] = lineas.map((linea, indice) => ({ linea, indice }));
  const lineasProducto = lineasIndexadas.filter(({ linea }) => linea.tipo === "PRODUCTO");
  const lineasServicio = lineasIndexadas.filter(({ linea }) => linea.tipo === "SERVICIO");
  const consulta = busqueda.trim();

  const renderizarLinea = ({ linea, indice }: LineaIndexada) => {
    const esServicio = linea.tipo === "SERVICIO";
    const descripcionServicio = String(linea.descripcion ?? linea.nombreVisible ?? "");
    const precio = Number(linea.precioUnitario) || 0;
    const cantidad = Number(linea.cantidad) || 0;
    const descuento = Number(linea.descuento) || 0;
    const totalLinea = Math.max(0, cantidad * precio - descuento);
    const descripcion = esServicio ? "servicio" : linea.nombreVisible;
    return (
      <div className={`os-linea ${esServicio ? "es-servicio" : "es-producto"}`} key={`${linea.tipo}-${indice}`}>
        <div className="os-linea-descripcion">
          {esServicio ? (
            <input
              id={`ordenes-servicio-descripcion-${indice}`}
              aria-label="Descripción del servicio"
              placeholder="Descripción del servicio"
              maxLength={240}
              value={descripcionServicio.toLocaleUpperCase("es-PE")}
              onChange={(evento) => {
                const valor = evento.target.value.toLocaleUpperCase("es-PE");
                onActualizarLinea(indice, { descripcion: valor, nombreVisible: valor });
              }}
            />
          ) : <input aria-label="Descripción del repuesto" value={linea.nombreVisible} readOnly />}
          {esServicio && <small className="os-linea-metadato">Mano de obra</small>}
        </div>
        <label className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
          <input
            aria-label={`Cantidad de ${descripcion}`}
            type="number"
            min="1"
            step="1"
            value={linea.cantidad}
            onChange={(evento) => {
              const valor = evento.target.value;
              onActualizarLinea(indice, { cantidad: valor === "" ? "" : String(Math.max(1, Math.trunc(Number(valor) || 1))) });
            }}
          />
        </label>
        <label className="os-linea-campo os-linea-precio"><span>Precio</span>
          {esServicio
            ? <input aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" placeholder="0.00" value={linea.precioUnitario} onChange={(evento) => onActualizarLinea(indice, { precioUnitario: evento.target.value })} />
            : <input aria-label="Precio unitario del repuesto (precio de catálogo)" type="text" value={formatearSoles(precio)} readOnly />}
        </label>
        <label className="os-linea-campo os-linea-descuento"><span>Descuento</span>
          <input aria-label={`Descuento de ${descripcion}`} type="number" min="0" max={(cantidad * precio).toFixed(2)} step="0.01" value={linea.descuento} onChange={(evento) => onActualizarLinea(indice, { descuento: evento.target.value })} />
        </label>
        <div className="os-linea-total"><span>Total</span><strong>{formatearSoles(totalLinea)}</strong></div>
        <button className="os-linea-quitar" type="button" aria-label={`Quitar ${descripcion}`} onClick={() => onQuitarLinea(indice)}><X aria-hidden="true" size={16} /></button>
      </div>
    );
  };

  return (
    <section className="os-tarjeta" aria-labelledby="os-titulo-detalle">
      <div className="os-tarjeta-cabecera is-dividida">
        <div className="os-titulo">
          <span className="os-paso" aria-hidden="true">2</span>
          <h3 id="os-titulo-detalle">Detalle de la orden</h3>
          <span className="os-contador">{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
        </div>
        <button className="os-boton-servicio" type="button" onClick={onAgregarServicio}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Agregar servicio</button>
      </div>
      {error && <NotificacionFlotante mensaje={error} />}

      <div className="os-buscador">
        <label className="os-buscador-campo">
          <Search aria-hidden="true" size={18} strokeWidth={2} />
          <input value={busqueda} onChange={(evento) => onBusqueda(evento.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar repuestos para la orden" autoComplete="off" />
        </label>
        {consulta ? (
          <div className="os-resultados" aria-live="polite">
            {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar en inventario.</p>
              : buscando ? <p className="os-resultados-estado">Buscando en inventario…</p>
              : productos.length ? productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => (
                <button className="os-resultado" key={producto.presentacionId} type="button" onClick={() => onAgregarProducto(producto)}>
                  <span className="os-resultado-datos">
                    <strong>{producto.nombre}</strong>
                    <small>{producto.codigo} · {producto.presentacion} · Stock {Number(producto.stockBase).toLocaleString("es-PE")}</small>
                  </span>
                  <strong className="os-resultado-precio">{formatearSoles(Number(producto.precio))}</strong>
                </button>
              )) : <div className="os-resultados-estado"><strong>No hay repuestos para mostrar</strong><span>No encontramos «{consulta}» en inventario.</span>{onCrearRepuesto && <button className="os-crear-repuesto" type="button" onClick={onCrearRepuesto}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Crear repuesto «{consulta}»</button>}</div>}
          </div>
        ) : (
          <div className="os-recientes" aria-live="polite">
            <span className="os-recientes-titulo">Últimos repuestos seleccionados</span>
            {recientes.length ? recientes.map((item) => (
              <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a agregar ${item.nombre}`} title={[item.codigo, item.detalle].filter(Boolean).join(" · ")} onClick={() => onAgregarReciente(item)}>
                <Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}
              </button>
            )) : <span className="os-recientes-vacio">Aún no has seleccionado artículos.</span>}
          </div>
        )}
      </div>

      {lineas.length === 0 ? (
        <div className="os-vacio">
          <strong>Agrega el primer repuesto o servicio</strong>
          <span>Busca repuestos en el inventario o pulsa Agregar servicio para incluir mano de obra.</span>
        </div>
      ) : (
        <div className="os-lineas">
          <div className="os-lineas-cabecera" aria-hidden="true">
            <span>DESCRIPCIÓN</span><span>CANT.</span><span>PRECIO</span><span>DESCUENTO</span><span>TOTAL</span><span />
          </div>
          {lineasProducto.length > 0 && <div role="group" aria-label="Productos de la orden">
            <div className="os-lineas-grupo">REPUESTOS</div>
            {lineasProducto.map(renderizarLinea)}
          </div>}
          {lineasServicio.length > 0 && <div role="group" aria-label="Servicios de la orden">
            <div className="os-lineas-grupo">SERVICIOS</div>
            {lineasServicio.map(renderizarLinea)}
          </div>}
        </div>
      )}
    </section>
  );
}
