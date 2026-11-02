import "./compras-page.css";
import { useEffect, useState } from "react";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { EntradaStockCard } from "../../components/inventario/entrada-stock-card/entrada-stock-card";
import { EntradaStockDetalle } from "../../components/inventario/entrada-stock-detalle/entrada-stock-detalle";
import { EntradaStockFormulario } from "../../components/inventario/entrada-stock-formulario/entrada-stock-formulario";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useProductos } from "../../hooks/use-productos";
import { useEntradasStock } from "../../hooks/use-entradas-stock";
import type { DatosProducto } from "../../services/inventario/productos.service";

export function ComprasPage({ permisos = [] }: { permisos?: string[] }) {
  const modulo = useEntradasStock();
  const [productoFormularioAbierto, setProductoFormularioAbierto] = useState(false);
  return <>
    <CatalogoListado
      titulo="Compras"
      descripcion="Registra las compras recibidas y actualiza las existencias de tu inventario."
      etiquetaCrear="Nueva compra"
      entidadSingular="compra"
      tituloListado="Historial de compras"
      registros={modulo.entradas}
      totalRegistros={modulo.total}
      visibles={modulo.entradas}
      cargando={modulo.cargando || modulo.cargandoDetalle}
      mensajeCarga="Cargando compras…"
      error={modulo.modalAbierto ? "" : modulo.error}
      iconoVacio="↓"
      tituloVacio="Aún no hay compras"
      descripcionVacio="Registra la primera compra recibida para empezar a controlar las existencias."
      pagina={modulo.pagina}
      porPagina={modulo.porPagina}
      totalPaginas={modulo.totalPaginas}
      desde={modulo.desde}
      hasta={modulo.hasta}
      busqueda={modulo.busqueda}
      busquedaPlaceholder="Buscar por código, proveedor o documento"
      busquedaAriaLabel="Buscar compras"
      claseTarjetas="stock-entry-card-grid"
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={modulo.abrirNuevo}
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
      renderizarTarjeta={(entrada) => <EntradaStockCard key={entrada.id} entrada={entrada} alAbrir={() => modulo.abrirProductoDetalle(entrada.id)} />}
    />
    {modulo.modalAbierto && <EntradaStockFormulario {...modulo} alAgregarProducto={() => setProductoFormularioAbierto(true)} />}
    {productoFormularioAbierto && <ProductoNuevoCompra alCerrar={() => setProductoFormularioAbierto(false)} alCrear={(nombre) => { setProductoFormularioAbierto(false); modulo.cambiarBusquedaProducto(nombre); }} />}
    {modulo.entradaDetalle && <EntradaStockDetalle entrada={modulo.entradaDetalle} alCerrar={modulo.cerrarDetalle} />}
  </>;
}

function ProductoNuevoCompra({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (nombre: string) => void }) {
  const modulo = useProductos();

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (evento: KeyboardEvent) => { if (evento.key === "Escape" && !modulo.guardando) alCerrar(); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escape); };
  }, [alCerrar, modulo.guardando]);

  async function guardarProducto(datos: DatosProducto, imagenesNuevas: File[], imagenesEliminadas: string[]) {
    const guardado = await modulo.guardar(datos, undefined, imagenesNuevas, imagenesEliminadas);
    if (guardado) alCrear(datos.nombre);
    return guardado;
  }

  if (modulo.cargando) return <div className="catalog-modal-backdrop"><div className="catalog-modal stock-quick-product-loading" role="status">Cargando formulario de producto…</div></div>;
  return <ProductoFormulario catalogos={modulo.catalogos} error={modulo.error} alCerrar={alCerrar} alGuardar={guardarProducto} alCrearMarca={modulo.crearMarca} alCrearCategoria={modulo.crearCategoria} />;
}
