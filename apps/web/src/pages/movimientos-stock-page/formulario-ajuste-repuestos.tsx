import "../ordenes-servicio-page/orden-servicio-editor.css";
import "./formulario-ajuste-repuestos.css";
import { ChevronDown, MessageSquareText, Plus, Save, Search } from "lucide-react";
import { useRef, type FormEvent, type ReactNode } from "react";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { MOTIVOS_AJUSTE, type ModuloMovimientosStock } from "../../hooks/use-movimientos-stock";

const LIMITE_OBSERVACION = 1000;
const numero = (valor: number) => valor.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const tipos = { CONTEO: "Por conteo", INGRESO: "Aumentar stock", RETIRO: "Disminuir stock" } as const;
const iniciales = (texto: string) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();

function Tarjeta({ paso, id, titulo, children }: { paso: number; id: string; titulo: string; children: ReactNode }) {
  return <section className="os-tarjeta" aria-labelledby={id}>
    <div className="os-tarjeta-cabecera"><div className="os-titulo"><span className="os-paso" aria-hidden="true">{paso}</span><h3 id={id}>{titulo}</h3></div></div>
    {children}
  </section>;
}

/** Ajuste de inventario de repuestos con la estructura `os-*` de Órdenes de servicio, a página completa. */
export function FormularioAjusteRepuestos({ modulo }: { modulo: ModuloMovimientosStock }) {
  const { cerrarModal, guardando, error, setError, guardar, productoBusqueda, setProductoBusqueda, productosEncontrados, buscandoProductos,
    productoElegido, elegirProducto, productosRecientes, elegirProductoReciente, limpiarProducto, sentido, setSentido, cantidad, setCantidad,
    motivo, setMotivo, observacion, setObservacion, cantidadProyectada } = modulo;
  const formulario = useRef<HTMLFormElement>(null);
  const firma = JSON.stringify({ producto: productoElegido?.id, sentido, cantidad, motivo, observacion });
  const cancelar = useConfirmarCancelacionFormulario(formulario, cerrarModal, "el ajuste de inventario", firma);
  const consulta = productoBusqueda.trim();
  const actual = Number(productoElegido?.cantidadActual ?? 0);
  const variacion = cantidadProyectada - actual;
  const porConteo = sentido === "CONTEO";

  function enviar(evento: FormEvent<HTMLFormElement>) { void guardar(evento); }

  return <div className="os-editor ajuste-repuestos-editor">
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <form ref={formulario} className="os-formulario" onSubmit={enviar} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />Quedará en el historial</span>
        <div className="os-numero"><span>TIPO DE AJUSTE</span><strong>{tipos[sentido]}</strong></div>
      </div>

      <div className="os-disposicion">
        <fieldset className="os-columna ajuste-rep-columna" disabled={guardando}>
          <Tarjeta paso={1} id="ajuste-titulo-repuesto" titulo="Repuesto *">
            {productoElegido ? <div className="os-cliente-fijo es-editable">
              <span className="os-avatar" aria-hidden="true">{iniciales(productoElegido.nombre)}</span>
              <div className="os-cliente-datos">
                <strong>{productoElegido.nombre}</strong>
                <span>{[productoElegido.marca, `Stock actual: ${numero(actual)} ${productoElegido.unidad}`].filter(Boolean).join(" · ")}</span>
              </div>
              <button className="os-cancelar" type="button" onClick={limpiarProducto}>Cambiar</button>
            </div> : <div className="os-buscador">
              <label className="os-buscador-campo">
                <Search aria-hidden="true" size={18} strokeWidth={2} />
                <input type="search" autoFocus value={productoBusqueda} autoComplete="off" placeholder="Buscar repuesto por nombre, código o marca…" aria-label="Buscar repuesto para ajustar"
                  onChange={(evento) => { setError(""); setProductoBusqueda(evento.target.value); }} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
              </label>
              {consulta ? <div className="os-resultados" aria-live="polite">
                {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar en inventario.</p>
                  : buscandoProductos ? <p className="os-resultados-estado">Buscando en inventario…</p>
                  : productosEncontrados.length ? productosEncontrados.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <button className="os-resultado" key={producto.id} type="button" onClick={() => elegirProducto(producto)}>
                    <span className="os-resultado-datos"><strong>{producto.nombre}</strong><small>{[producto.marca, producto.unidad].filter(Boolean).join(" · ")}</small></span>
                    <Plus aria-hidden="true" size={16} />
                  </button>)
                  : <div className="os-resultados-estado"><strong>No hay repuestos para mostrar</strong><span>No encontramos «{consulta}» en inventario.</span></div>}
              </div> : <div className="os-recientes" aria-live="polite">
                <span className="os-recientes-titulo">Últimos repuestos seleccionados</span>
                {productosRecientes.length ? productosRecientes.map((item) => <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a elegir ${item.nombre}`} title={item.detalle ?? undefined}
                  onClick={() => void elegirProductoReciente(item)}><Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}</button>)
                  : <span className="os-recientes-vacio">Aún no has seleccionado repuestos.</span>}
              </div>}
            </div>}
          </Tarjeta>

          <Tarjeta paso={2} id="ajuste-titulo-detalle" titulo="Detalle del ajuste">
            <div className="os-campos ajuste-rep-datos">
              <label className="os-campo">Tipo de ajuste *
                <span className="os-select">
                  <select value={sentido} onChange={(evento) => setSentido(evento.target.value as keyof typeof tipos)}>
                    {Object.entries(tipos).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">{porConteo ? "Cantidad contada" : "Cantidad a ajustar"} *
                <input type="number" min={porConteo ? "0" : "0.001"} step="0.001" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)}
                  placeholder={`En ${productoElegido?.unidad ?? "unidad base"}`} required />
              </label>
              <label className="os-campo">Motivo *
                <span className="os-select">
                  <select value={motivo} onChange={(evento) => setMotivo(evento.target.value)} required>
                    {MOTIVOS_AJUSTE.map((opcion) => <option key={opcion.codigo} value={opcion.codigo}>{opcion.nombre}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
            </div>
          </Tarjeta>

          <Tarjeta paso={3} id="ajuste-titulo-observacion" titulo="Observación">
            <div className="os-revision">
              <label className="os-campo">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observación del ajuste <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACION} rows={3} value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
                  placeholder="Ej. En el conteo del viernes faltaron 2 filtros de aceite; se encontraron dañados en el almacén." />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </Tarjeta>
        </fieldset>

        <aside className="os-resumen" aria-label="Resumen del ajuste">
          <h3>Resumen del ajuste</h3>
          <dl className="os-importes">
            <div><dt>Repuesto</dt><dd className="ajuste-resumen-texto">{productoElegido?.nombre ?? "Pendiente"}</dd></div>
            <div><dt>Stock actual</dt><dd>{productoElegido ? `${numero(actual)} ${productoElegido.unidad}` : "—"}</dd></div>
            <div><dt>Variación</dt><dd className={variacion < 0 ? "ajuste-baja" : variacion > 0 ? "ajuste-alza" : undefined}>{productoElegido && cantidad.trim() ? `${variacion > 0 ? "+" : variacion < 0 ? "−" : ""}${numero(Math.abs(variacion))}` : "—"}</dd></div>
            <div className="es-total"><dt>Saldo final</dt><dd aria-live="polite" className={cantidadProyectada < 0 ? "ajuste-baja" : undefined}>{productoElegido ? `${numero(cantidadProyectada)} ${productoElegido.unidad}` : "—"}</dd></div>
          </dl>
          <p className="ajuste-nota">Se registra con tu usuario, el motivo y la fecha. No se puede retirar más stock del disponible.</p>
          <div className="os-acciones">
            <button className="os-guardar" type="submit" disabled={guardando || !productoElegido}><Save aria-hidden="true" size={18} />{guardando ? "Registrando ajuste…" : "Registrar ajuste"}</button>
            <button className="os-cancelar" type="button" disabled={guardando} onClick={cancelar.solicitarCancelacion}>Cancelar</button>
          </div>
        </aside>
      </div>
    </form>
    {cancelar.dialogo}
  </div>;
}
