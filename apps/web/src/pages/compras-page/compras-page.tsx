import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { EntradaStockDetalle } from "../../components/inventario/entrada-stock-detalle/entrada-stock-detalle";
import { EntradaStockFormulario } from "../../components/inventario/entrada-stock-formulario/entrada-stock-formulario";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { useProductos } from "../../hooks/use-productos";
import { useEntradasStock } from "../../hooks/use-entradas-stock";
import type { DatosProducto } from "../../services/inventario/productos.service";
import {
  egresosTableClasses,
  egresosTableNumberClasses,
  egresosTableScrollClasses,
} from "../../styles/egresos-tabla-classes";
import { FilaCompra } from "./fila-compra";

const encabezadoCompras = <tr><th>Fecha</th><th>Compra y documento</th><th>Proveedor</th><th>Artículos</th><th>Pago</th><th className={egresosTableNumberClasses}>Total</th><th>Estado</th><th>Detalle</th></tr>;
export function ComprasPage({ esNuevaCompra = false, puedeAnular = false }: { esNuevaCompra?: boolean; puedeAnular?: boolean }) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const modulo = useEntradasStock(esNuevaCompra ? () => navegar("/egresos/compras") : undefined);
  const [productoFormularioAbierto, setProductoFormularioAbierto] = useState(false);
  useEffect(() => { if (esNuevaCompra) modulo.abrirNuevo(); }, [esNuevaCompra, ubicacion.key]);
  return <>
    {!esNuevaCompra && <CatalogoListado
      titulo="Compras de repuestos"
      descripcion="Registra las compras de repuestos para mantener actualizado el inventario."
      etiquetaCrear="Crear compra de repuestos"
      tituloListado="Historial de compras de repuestos"
      registros={modulo.entradas}
      totalRegistros={modulo.total}
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
      controlesFiltro={(
        <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Filtrar compras por estado de pago">
          {([
            ["TODAS", "Todas", modulo.conteosPago.todas],
            ["PAGADAS", "Pagadas", modulo.conteosPago.pagadas],
            ["PENDIENTES", "Con saldo pendiente", modulo.conteosPago.pendientes],
            ["ANULADAS", "Anuladas", modulo.conteosPago.anuladas ?? 0],
          ] as const).map(([valor, etiqueta, conteo]) => <button key={valor} type="button" aria-pressed={modulo.filtroPago === valor}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${modulo.filtroPago === valor ? "border-[#0b2545] bg-[#0b2545] text-white" : "border-[#c5d1db] bg-white text-[#27445f] hover:border-[#8eacc9] hover:bg-[#f5f9fd]"}`}
            onClick={() => { modulo.cambiarPagina(1); modulo.setFiltroPago(valor); }}>
            {etiqueta}<span className={`inline-flex h-5 min-w-[22px] items-center justify-center rounded-[10px] px-1.5 text-[11px] font-bold ${modulo.filtroPago === valor ? "bg-white/20 text-white" : "bg-[#eef2f6] text-[#3d566e]"}`}>{conteo}</span>
          </button>)}
        </div>
      )}
      claseCabecera="compra-listado-cabecera"
      variante="tabla"
      encabezadoTabla={encabezadoCompras}
      renderizarFila={(entrada) => <FilaCompra key={entrada.id} entrada={entrada} alAbrir={modulo.abrirProductoDetalle} />}
      claseTabla={egresosTableClasses}
      claseContenedorTabla={egresosTableScrollClasses}
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={() => navegar("/egresos/compras/nueva")}
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
    />}
    {esNuevaCompra && modulo.modalAbierto && <EntradaStockFormulario
      modulo={modulo}
      cerrar={() => { modulo.cerrarModal(); navegar("/egresos/compras"); }}
      alAgregarProducto={() => setProductoFormularioAbierto(true)}
    />}
    {productoFormularioAbierto && <ProductoNuevoCompra alCerrar={() => setProductoFormularioAbierto(false)} alCrear={(nombre) => { setProductoFormularioAbierto(false); modulo.cambiarBusquedaProducto(nombre); }} />}
    {!esNuevaCompra && modulo.entradaDetalle && <EntradaStockDetalle entrada={modulo.entradaDetalle} alCerrar={modulo.cerrarDetalle} alAnular={puedeAnular ? modulo.anularCompra : undefined} />}
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

  async function guardarProducto(datos: DatosProducto) {
    const guardado = await modulo.guardar(datos);
    if (guardado) alCrear(datos.nombre);
    return guardado;
  }

  if (modulo.cargando) return <div className="catalog-modal-backdrop"><div className="catalog-modal stock-quick-product-loading" role="status">Cargando formulario de producto…</div></div>;
  return <ProductoFormulario catalogos={modulo.catalogos} error={modulo.error} alCerrar={alCerrar} alGuardar={guardarProducto} alCrearMarca={modulo.crearMarca} alCrearCategoria={modulo.crearCategoria} />;
}
