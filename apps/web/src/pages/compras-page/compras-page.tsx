import "./compras-page.css";
import "../../styles/egresos-tabla.css";
import { useEffect, useState } from "react";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { EntradaStockDetalle } from "../../components/inventario/entrada-stock-detalle/entrada-stock-detalle";
import { EntradaStockFormulario } from "../../components/inventario/entrada-stock-formulario/entrada-stock-formulario";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useProductos } from "../../hooks/use-productos";
import { useEntradasStock } from "../../hooks/use-entradas-stock";
import type { DatosProducto } from "../../services/inventario/productos.service";
import type { EntradaStock } from "../../services/inventario/entradas-stock.service";

const soles = (valor: string | number) => `S/ ${Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const documentosCompra: Record<string, string> = { FACTURA: "Factura", BOLETA: "Boleta", GUIA_REMISION: "Guía de remisión", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento", OTRO: "Otro" };
function tablaCompras(entradas: EntradaStock[], alAbrir: (id: string) => void) {
  return <div className="egresos-table-scroll"><table className="egresos-table stock-purchases-table"><thead><tr><th>Fecha</th><th>Compra y documento</th><th>Proveedor</th><th>Artículos</th><th>Pago</th><th className="is-number">Total</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{entradas.map((entrada) => {
    const total = Number(entrada.totalDocumento ?? entrada.total);
    const pagado = entrada.montoPagado == null ? null : Number(entrada.montoPagado);
    const saldo = pagado == null ? null : Math.max(0, total - pagado);
    return <tr key={entrada.id}><td>{new Date(`${entrada.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</td><td><strong>{entrada.codigo}</strong><small>{documentosCompra[entrada.tipoDocumento] ?? entrada.tipoDocumento} · {entrada.numeroDocumento || "Registro interno"}</small></td><td><strong>{entrada.proveedor || "No especificado"}</strong>{entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento && <small>{entrada.proveedorTipoDocumento} · {entrada.proveedorNumeroDocumento}</small>}</td><td>{entrada.cantidadProductos ?? 0} {(entrada.cantidadProductos ?? 0) === 1 ? "producto" : "productos"}</td><td>{entrada.medioPago || "Sin registrar"}<small>{pagado == null ? "Pago no registrado" : saldo === 0 ? "Pagada" : `Pagado ${soles(pagado)}`}</small></td><td className="is-number"><strong>{soles(total)}</strong></td><td><span className={`egresos-status${saldo === null ? " is-muted" : saldo > 0 ? " is-pending" : " is-paid"}`}>{saldo === null ? "Sin pago" : saldo > 0 ? `Saldo ${soles(saldo)}` : "Pagada"}</span></td><td><button className="egresos-row-button" type="button" onClick={() => alAbrir(entrada.id)}>Ver detalle</button></td></tr>;
  })}</tbody></table></div>;
}

export function ComprasPage({ permisos = [] }: { permisos?: string[] }) {
  const modulo = useEntradasStock();
  const [productoFormularioAbierto, setProductoFormularioAbierto] = useState(false);
  return <>
    <CatalogoListado
      titulo="Compras de repuestos"
      descripcion="Registra las compras de repuestos para mantener actualizado el inventario."
      etiquetaCrear="Nueva compra de repuestos"
      tituloListado="Historial de compras de repuestos"
      registros={modulo.entradas}
      totalRegistros={modulo.total}
      visibles={modulo.entradas}
      cargando={modulo.cargando || modulo.cargandoDetalle}
      mensajeCarga="Cargando compras…"
      error={modulo.modalAbierto ? "" : modulo.error}
      iconoVacio="↓"
      tituloVacio="Aún no hay compras de repuestos"
      descripcionVacio="Registra la primera compra de repuestos para empezar a controlar las existencias."
      pagina={modulo.pagina}
      porPagina={modulo.porPagina}
      totalPaginas={modulo.totalPaginas}
      desde={modulo.desde}
      hasta={modulo.hasta}
      busqueda={modulo.busqueda}
      busquedaPlaceholder="Buscar por código, proveedor o documento"
      busquedaAriaLabel="Buscar compras"
      contenidoListado={tablaCompras(modulo.entradas, modulo.abrirProductoDetalle)}
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={modulo.abrirNuevo}
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
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
