import "./productos-page.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useProductos } from "../../hooks/use-productos";
import type { Producto } from "../../services/inventario/productos.service";

const PreciosProductosPage = lazy(() => import("../precios-productos-page/precios-productos-page").then((modulo) => ({ default: modulo.PreciosProductosPage })));

export function ProductosPage() {
  const modulo = useProductos();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!formularioAbierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escapar = (evento: KeyboardEvent) => { if (evento.key === "Escape") cerrarFormulario(); };
    window.addEventListener("keydown", escapar);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escapar); };
  }, [formularioAbierto]);

  function cerrarFormulario() { setFormularioAbierto(false); setProductoEditando(null); modulo.setError(""); }
  function nuevoProducto() { modulo.setError(""); setProductoEditando(null); setFormularioAbierto(true); }
  async function editarProducto(id: string) {
    modulo.setError("");
    const completo = await modulo.consultar(id);
    if (completo) { setProductoEditando(completo); setFormularioAbierto(true); }
  }
  async function guardarProducto(datos: Parameters<typeof modulo.guardar>[0], imagenesNuevas: File[], imagenesEliminadas: string[]) {
    const guardado = await modulo.guardar(datos, productoEditando?.id, imagenesNuevas, imagenesEliminadas);
    if (guardado) { setRevision((actual) => actual + 1); cerrarFormulario(); }
    return guardado;
  }
  async function cambiarEstado(id: string, activo: boolean) {
    await modulo.cambiarEstado({ id, activo });
    setRevision((actual) => actual + 1);
  }

  return <section className="repuestos-module">
    <Suspense fallback={<div className="repuestos-module-loading" role="status">Cargando catálogo y precios…</div>}>
      <PreciosProductosPage integrado revision={revision} alCrearProducto={nuevoProducto} alEditarProducto={editarProducto} alCambiarEstado={cambiarEstado} />
    </Suspense>
    {formularioAbierto && <ProductoFormulario catalogos={modulo.catalogos} producto={productoEditando} error={modulo.error} alCerrar={cerrarFormulario} alGuardar={guardarProducto} alCrearMarca={modulo.crearMarca} alCrearCategoria={modulo.crearCategoria} />}
  </section>;
}
