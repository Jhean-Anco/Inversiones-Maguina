import "./precios-productos-page.css";
import { useEffect, useRef, useState } from "react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi, srcImagen } from "../../services/api-cliente";
import { redondearPrecioADecimos, servicioProductos, type PrecioCatalogo } from "../../services/inventario/productos.service";

const soles = (valor: string) => `S/ ${Number(valor).toFixed(2)}`;

type PropiedadesPreciosProductos = {
  integrado?: boolean;
  revision?: number;
  alCrearProducto?: () => void;
  alEditarProducto?: (id: string) => void;
  alCambiarEstado?: (id: string, activo: boolean) => void;
};

export function PreciosProductosPage({ integrado = false, revision = 0, alCrearProducto, alEditarProducto, alCambiarEstado }: PropiedadesPreciosProductos) {
  const [items, setItems] = useState<PrecioCatalogo[]>([]);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const consecutivo = useRef(0);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setConsulta(busqueda.trim()), 220);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    const idConsulta = ++consecutivo.current;
    setCargando(true);
    setError("");
    void servicioProductos.listarPrecios(pagina, porPagina, consulta).then((resultado) => {
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
  }, [pagina, porPagina, consulta, revision]);

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

  const renderizarPrecio = (item: PrecioCatalogo) => {
    const precio = precios[item.id] ?? redondearPrecioADecimos(item.precio);
    const cambio = precio !== item.precio;
    return <tr key={item.id} className={`${item.productoActivo && item.precioActivo ? "" : "is-inactive"}${cambio ? " has-price-change" : ""}`}>
          <td data-label="Producto"><div className="precios-productos-product"><span className="precios-productos-image">{item.imagen ? <img src={srcImagen(item.imagen)} alt="" loading="lazy" /> : <span aria-hidden="true">{item.producto.slice(0, 1).toLocaleUpperCase("es-PE")}</span>}</span><span><strong>{item.producto}</strong><small>{item.codigo} · {item.marca}{!item.productoActivo ? " · Producto inactivo" : ""}</small></span></div></td>
          <td data-label="Presentación">{item.presentacion}{item.presentacionBase && <small className="precios-productos-base">Unidad base</small>}</td>
          <td data-label="Lista">{item.listaPrecio}{!item.precioActivo && <small className="precios-productos-base">Precio inactivo</small>}</td>
          <td data-label="Desde">{Number(item.cantidadMinima).toLocaleString("es-PE")}</td>
          <td data-label="Precio S/"><label className="precios-productos-input"><span className="sr-only">Precio de {item.producto}, {item.listaPrecio}, {item.presentacion}</span><input type="number" inputMode="decimal" min="0" step="0.10" value={precio} onChange={(event) => setPrecios((actuales) => ({ ...actuales, [item.id]: event.target.value }))} onBlur={(event) => setPrecios((actuales) => ({ ...actuales, [item.id]: redondearPrecioADecimos(event.currentTarget.value) }))} /></label>{cambio && <small className="precios-productos-current">Antes {soles(item.precio)}</small>}</td>
          <td data-label="Guardar precio"><button type="button" disabled={!cambio || guardandoId !== null} onClick={() => void guardarPrecio(item)}>{guardandoId === item.id ? "Guardando…" : cambio ? "Guardar" : "Al día"}</button></td>
          <td data-label="Acciones"><div className="precios-productos-row-actions">{alEditarProducto && <AccionIcono accion="editar" etiqueta={`Editar ${item.producto}`} onClick={() => alEditarProducto(item.productoId)} />}{alCambiarEstado && <AccionIcono accion={item.productoActivo ? "desactivar" : "activar"} etiqueta={`${item.productoActivo ? "Desactivar" : "Activar"} ${item.producto}`} onClick={() => { const accion = item.productoActivo ? "desactivar" : "activar"; if (window.confirm(`¿Deseas ${accion} ${item.producto}?`)) alCambiarEstado(item.productoId, item.productoActivo); }} />}</div></td>
        </tr>;
  };

  return <section className={`precios-productos-page${integrado ? " is-integrated" : ""}`}>
    <header className="precios-productos-heading"><div><span>{integrado ? "INVENTARIO · REPUESTOS" : "INVENTARIO"}</span><h1>{integrado ? "Catálogo y precios" : "Precios del catálogo"}</h1><p>Administra productos, presentaciones y precios por lista desde un solo lugar.</p></div><div className="precios-productos-heading-actions"><strong>{total} precios</strong></div></header>
    {exito && <p className="precios-productos-message is-success" role="status">{exito}</p>}
      <ListadoMaestro variante="tabla" titulo="Precios del catálogo" descripcion="Valores por presentación y lista; ajusta el precio desde cada fila." etiquetaConteo="PRECIOS CONFIGURADOS" registros={items} cargando={cargando} error={error} vacio={<div className="precios-productos-empty"><strong>No hay precios para mostrar</strong><span>{consulta ? "Prueba con otro nombre, código o marca." : "Tus productos aparecerán aquí cuando tengan precios registrados."}</span></div>} controlesCabecera={<><label>Buscar productos<input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} placeholder="Nombre, código o marca" /></label>{alCrearProducto && <RegistrarAccionPrincipal etiqueta="Crear repuesto" onClick={alCrearProducto} />}</>} paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }} encabezadoTabla={<tr><th>Producto</th><th>Presentación</th><th>Lista</th><th>Desde</th><th>Precio S/</th><th>Precio</th><th>Producto</th></tr>} renderizarFila={renderizarPrecio} claseTabla="precios-productos-table" claseContenedor="precios-productos-table-wrap" />
  </section>;
}
