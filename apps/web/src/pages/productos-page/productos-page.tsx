import "./productos-page.css";
import { useEffect, useState } from "react";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { ProductoCard } from "../../components/productos/producto-card/producto-card";
import { ProductoDetalle } from "../../components/productos/producto-detalle/producto-detalle";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useProductos } from "../../hooks/use-productos";
import type { Producto, ProductoTarjeta } from "../../services/inventario/productos.service";

export function ProductosPage() {
  const modulo = useProductos();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);

  useEffect(() => {
    if (!formularioAbierto && !productoDetalle) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { if (formularioAbierto) cerrarFormulario(); else setProductoDetalle(null); } };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escape); };
  }, [formularioAbierto, productoDetalle]);

  function nuevoProducto() { modulo.setError(""); setProductoEditando(null); setFormularioAbierto(true); }
  function cerrarFormulario() { setFormularioAbierto(false); setProductoEditando(null); modulo.setError(""); }
  function guardarProducto(datos: Parameters<typeof modulo.guardar>[0], imagenesNuevas: File[], imagenesEliminadas: string[]) {
    return modulo.guardar(datos, productoEditando?.id, imagenesNuevas, imagenesEliminadas).then((guardado) => { if (guardado) cerrarFormulario(); return guardado; });
  }
  function abrirEdicion(producto: ProductoTarjeta) {
    modulo.setError(""); setDetalleCargando(true);
    void modulo.consultar(producto.id).then((completo) => { if (completo) { setProductoDetalle(null); setProductoEditando(completo); setFormularioAbierto(true); } }).finally(() => setDetalleCargando(false));
  }
  function abrirDetalle(producto: ProductoTarjeta) {
    setDetalleCargando(true);
    void modulo.consultar(producto.id).then((completo) => { if (completo) setProductoDetalle(completo); }).finally(() => setDetalleCargando(false));
  }
  function cambiarEstado(producto: ProductoTarjeta) { void modulo.cambiarEstado(producto); }

  return <>
    <CatalogoListado
      titulo="Productos"
      descripcion="Administra los repuestos, accesorios, consumibles y motocicletas de tu catálogo."
      etiquetaCrear="Nuevo producto"
      entidadSingular="producto"
      tituloListado="Listado de productos"
      registros={modulo.productos}
      totalRegistros={modulo.total}
      visibles={modulo.productos}
      cargando={modulo.cargando || detalleCargando}
      mensajeCarga="Cargando productos…"
      error={formularioAbierto ? "" : modulo.error}
      iconoVacio="▧"
      tituloVacio="Aún no hay productos"
      descripcionVacio="Registra tus productos para controlar el catálogo y preparar las ventas."
      pagina={modulo.pagina}
      porPagina={modulo.porPagina}
      totalPaginas={modulo.totalPaginas}
      desde={modulo.desde}
      hasta={modulo.hasta}
      busqueda={modulo.busqueda}
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={nuevoProducto}
      claseTarjetas="producto-card-grid"
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
      renderizarTarjeta={(producto) => <ProductoCard key={producto.id} producto={producto} alVer={() => abrirDetalle(producto)} alEditar={() => abrirEdicion(producto)} alCambiarEstado={() => cambiarEstado(producto)} />}
    />
    {formularioAbierto && <ProductoFormulario catalogos={modulo.catalogos} producto={productoEditando} error={modulo.error} alCerrar={cerrarFormulario} alGuardar={guardarProducto} alCrearMarca={modulo.crearMarca} alCrearCategoria={modulo.crearCategoria} />}
    {productoDetalle && <ProductoDetalle producto={productoDetalle} alCerrar={() => setProductoDetalle(null)} alEditar={() => abrirEdicion(productoDetalle)} />}
  </>;
}
