import "./precios-productos-page.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { ErrorApi, srcImagen } from "../../services/api-cliente";
import { redondearPrecioADecimos, servicioProductos, type PrecioCatalogo } from "../../services/inventario/productos.service";

const soles = (valor: string) => `S/ ${Number(valor).toFixed(2)}`;

type PropiedadesPreciosProductos = {
  integrado?: boolean;
  revision?: number;
  alCrearProducto?: () => void;
  alEditarProducto?: (id: string) => void;
  alCambiarEstado?: (id: string, activo: boolean) => void;
  alCrearLista?: (nombre: string) => Promise<{ id: string; codigo?: string; nombre: string }>;
};

export function PreciosProductosPage({ integrado = false, revision = 0, alCrearProducto, alEditarProducto, alCambiarEstado, alCrearLista }: PropiedadesPreciosProductos) {
  const [items, setItems] = useState<PrecioCatalogo[]>([]);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [crearListaAbierto, setCrearListaAbierto] = useState(false);
  const [nombreNuevaLista, setNombreNuevaLista] = useState("");
  const [guardandoLista, setGuardandoLista] = useState(false);
  const consecutivo = useRef(0);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setConsulta(busqueda.trim()), 220);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    const idConsulta = ++consecutivo.current;
    setCargando(true);
    setError("");
    void servicioProductos.listarPrecios(pagina, consulta).then((resultado) => {
      if (idConsulta !== consecutivo.current) return;
      setItems(resultado.items);
      setTotal(resultado.total);
      setTotalPaginas(resultado.totalPaginas);
      setPrecios(Object.fromEntries(resultado.items.map((item) => [item.id, redondearPrecioADecimos(item.precio)])));
    }).catch((problema) => {
      if (idConsulta !== consecutivo.current) return;
      if (problema instanceof ErrorApi && problema.estado === 401) { window.location.assign("/login"); return; }
      setError(problema instanceof Error ? problema.message : "No se pudieron cargar los precios de los productos.");
    }).finally(() => { if (idConsulta === consecutivo.current) setCargando(false); });
    return () => { consecutivo.current++; };
  }, [pagina, consulta, revision]);

  async function crearLista(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!alCrearLista || guardandoLista) return;
    setGuardandoLista(true); setError(""); setExito("");
    try {
      const lista = await alCrearLista(nombreNuevaLista.trim());
      setExito(`Lista “${lista.nombre}” creada. Ya puedes asignarle precios al editar un producto.`);
      setNombreNuevaLista(""); setCrearListaAbierto(false);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo crear la lista de precios.");
    } finally { setGuardandoLista(false); }
  }

  async function guardarPrecio(item: PrecioCatalogo) {
    const precio = redondearPrecioADecimos(precios[item.id] ?? item.precio);
    setGuardandoId(item.id); setError(""); setExito("");
    try {
      const actualizado = await servicioProductos.actualizarPrecio(item.id, precio);
      setItems((actuales) => actuales.map((actual) => actual.id === item.id ? { ...actual, precio: actualizado.precio } : actual));
      setPrecios((actuales) => ({ ...actuales, [item.id]: actualizado.precio }));
      setExito(`Precio de ${item.producto} guardado en ${soles(actualizado.precio)}.`);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el precio.");
    } finally { setGuardandoId(null); }
  }

  return <section className={`precios-productos-page${integrado ? " is-integrated" : ""}`}>
    <header className="precios-productos-heading"><div><span>{integrado ? "INVENTARIO · REPUESTOS" : "INVENTARIO"}</span><h1>{integrado ? "Catálogo y precios" : "Precios del catálogo"}</h1><p>Administra productos, presentaciones y precios por lista desde un solo lugar.</p></div><div className="precios-productos-heading-actions"><strong>{total} precios</strong>{alCrearProducto && <button type="button" onClick={alCrearProducto}>＋ Nuevo repuesto</button>}</div></header>
    <section className="precios-productos-panel" aria-label="Precios de repuestos por lista y presentación">
      <div className="precios-productos-toolbar"><label>Buscar productos<input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} placeholder="Nombre, código o marca" /></label><div className="precios-productos-toolbar-actions">{alCrearProducto && <button type="button" className="precios-productos-create" onClick={alCrearProducto}><span className="erp-create-icon" aria-hidden="true">+</span>Nuevo repuesto</button>}{alCrearLista && <button type="button" className="precios-productos-create" onClick={() => setCrearListaAbierto(true)}><span className="erp-create-icon" aria-hidden="true">+</span>Nueva lista de precios</button>}<span>Mostrando {items.length} de {total} precios</span></div></div>
      {error && <p className="precios-productos-message is-error" role="alert">{error}</p>}
      {exito && <p className="precios-productos-message is-success" role="status">{exito}</p>}
      {cargando ? <div className="precios-productos-empty" role="status">Cargando productos y precios…</div> : items.length ? <div className="precios-productos-table-wrap"><table className="precios-productos-table"><thead><tr><th>Producto</th><th>Presentación</th><th>Lista</th><th>Desde</th><th>Precio S/</th><th>Precio</th><th>Producto</th></tr></thead><tbody>{items.map((item) => {
        const precio = precios[item.id] ?? redondearPrecioADecimos(item.precio);
        const cambio = precio !== item.precio;
        return <tr key={item.id} className={`${item.productoActivo && item.precioActivo ? "" : "is-inactive"}${cambio ? " has-price-change" : ""}`}>
          <td><div className="precios-productos-product"><span className="precios-productos-image">{item.imagen ? <img src={srcImagen(item.imagen)} alt="" loading="lazy" /> : <span aria-hidden="true">{item.producto.slice(0, 1).toLocaleUpperCase("es-PE")}</span>}</span><span><strong>{item.producto}</strong><small>{item.codigo} · {item.marca}{!item.productoActivo ? " · Producto inactivo" : ""}</small></span></div></td>
          <td>{item.presentacion}{item.presentacionBase && <small className="precios-productos-base">Unidad base</small>}</td>
          <td>{item.listaPrecio}{!item.precioActivo && <small className="precios-productos-base">Precio inactivo</small>}</td>
          <td>{Number(item.cantidadMinima).toLocaleString("es-PE")}</td>
          <td><label className="precios-productos-input"><span className="sr-only">Precio de {item.producto}, {item.listaPrecio}, {item.presentacion}</span><input type="number" inputMode="decimal" min="0" step="0.10" value={precio} onChange={(event) => setPrecios((actuales) => ({ ...actuales, [item.id]: event.target.value }))} onBlur={(event) => setPrecios((actuales) => ({ ...actuales, [item.id]: redondearPrecioADecimos(event.currentTarget.value) }))} /></label>{cambio && <small className="precios-productos-current">Antes {soles(item.precio)}</small>}</td>
          <td><button type="button" disabled={!cambio || guardandoId !== null} onClick={() => void guardarPrecio(item)}>{guardandoId === item.id ? "Guardando…" : cambio ? "Guardar" : "Al día"}</button></td>
          <td><div className="precios-productos-row-actions">{alEditarProducto && <AccionIcono accion="editar" etiqueta={`Editar ${item.producto}`} onClick={() => alEditarProducto(item.productoId)} />}{alCambiarEstado && <AccionIcono accion={item.productoActivo ? "desactivar" : "activar"} etiqueta={`${item.productoActivo ? "Desactivar" : "Activar"} ${item.producto}`} onClick={() => { const accion = item.productoActivo ? "desactivar" : "activar"; if (window.confirm(`¿Deseas ${accion} ${item.producto}?`)) alCambiarEstado(item.productoId, item.productoActivo); }} />}</div></td>
        </tr>;
      })}</tbody></table></div> : <div className="precios-productos-empty"><strong>No hay precios para mostrar</strong><span>{consulta ? "Prueba con otro nombre, código o marca." : "Tus productos aparecerán aquí cuando tengan precios registrados."}</span></div>}
      <footer className="precios-productos-pagination"><span>{total ? `Página ${pagina} de ${totalPaginas}` : ""}</span><div><button type="button" disabled={pagina <= 1 || cargando} onClick={() => setPagina((actual) => Math.max(1, actual - 1))}>Anterior</button><button type="button" disabled={pagina >= totalPaginas || cargando} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}>Siguiente</button></div></footer>
    </section>
    {crearListaAbierto && <div className="precios-lista-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardandoLista) setCrearListaAbierto(false); }}><form className="precios-lista-dialog" role="dialog" aria-modal="true" aria-labelledby="precios-lista-title" onSubmit={(evento) => void crearLista(evento)}><button type="button" className="precios-lista-close" aria-label="Cerrar" onClick={() => setCrearListaAbierto(false)}>×</button><span>PRECIOS</span><h2 id="precios-lista-title">Crear lista de precios</h2><p>Luego podrás asignar esta lista y sus precios desde el formulario completo de cada producto.</p><label>Nombre de la lista<input autoFocus value={nombreNuevaLista} onChange={(evento) => setNombreNuevaLista(evento.target.value)} minLength={2} maxLength={100} placeholder="Ej. Mayorista" required /></label><div><button type="button" onClick={() => setCrearListaAbierto(false)} disabled={guardandoLista}>Cancelar</button><button type="submit" disabled={guardandoLista}>{guardandoLista ? "Creando…" : "Crear lista"}</button></div></form></div>}
  </section>;
}
