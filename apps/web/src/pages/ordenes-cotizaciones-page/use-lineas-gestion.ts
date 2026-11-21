import { useEffect, useRef, useState } from "react";
import { servicioIngresos, type ProductoParaIngreso } from "../../services/ingresos.service";
import type { LineaGestion } from "./gestion-utils";
import { useCatalogoRecientes, type CatalogoReciente, MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";

type UseLineasGestionProps = { setError: (mensaje: string) => void };

export function useLineasGestion({ setError }: UseLineasGestionProps) {
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productos, setProductos] = useState<ProductoParaIngreso[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const catalogoRecienteRepuestos = useCatalogoRecientes("repuestos");
  const consultaActual = useRef(0);
  const [lineas, setLineas] = useState<LineaGestion[]>([]);

  useEffect(() => {
    const texto = busquedaProducto.trim();
    const actual = ++consultaActual.current;
    if (texto.length < MIN_CARACTERES_BUSQUEDA_CATALOGO) { setProductos([]); setBuscandoProductos(false); return; }
    setBuscandoProductos(true);
    const temporizador = window.setTimeout(() => void servicioIngresos.buscarProductos(texto).then((resultado) => { if (actual === consultaActual.current) setProductos(resultado.slice(0, MAX_RESULTADOS_CATALOGO)); }).catch(() => { if (actual === consultaActual.current) setProductos([]); }).finally(() => { if (actual === consultaActual.current) setBuscandoProductos(false); }), 220);
    return () => window.clearTimeout(temporizador);
  }, [busquedaProducto]);

  function agregarProducto(producto: ProductoParaIngreso) {
    catalogoRecienteRepuestos.registrar({ id: producto.presentacionId, nombre: producto.nombre, codigo: producto.codigo, detalle: producto.presentacion });
    setLineas((anteriores) => [...anteriores, { tipo: "PRODUCTO", presentacionId: producto.presentacionId, cantidad: "1", descuento: "0", afectacionIgv: producto.afectacionIgv, precioUnitario: producto.precio, nombreVisible: `${producto.nombre} · ${producto.presentacion}` }]);
    setBusquedaProducto(""); setProductos([]);
  }

  async function agregarProductoReciente(reciente: CatalogoReciente) {
    try {
      const resultado = await servicioIngresos.buscarProductos(reciente.codigo);
      const producto = resultado.find((item) => item.presentacionId === reciente.id);
      if (producto) agregarProducto(producto);
      else setError("Ese repuesto ya no aparece en el catálogo. Búscalo nuevamente para actualizar sus datos.");
    } catch {
      setError("No se pudo actualizar el repuesto reciente.");
    }
  }

  function agregarServicioCotizacion() {
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) { setError("Completa la descripción, cantidad y precio del servicio antes de agregar otro."); return; }
    const indice = lineas.length;
    setLineas((actuales) => [...actuales, { tipo: "SERVICIO", descripcion: "", nombreVisible: "", cantidad: "1", precioUnitario: "", descuento: "0", afectacionIgv: "GRAVADO" }]);
    setError("");
    window.requestAnimationFrame(() => {
      const campo = document.getElementById(`cotizacion-servicio-descripcion-${indice}`) as HTMLInputElement | null;
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
      campo?.focus({ preventScroll: true });
    });
  }

  function actualizarLineaCotizacion(indice: number, cambios: Partial<LineaGestion>) {
    setLineas((actuales) => actuales.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea));
    setError("");
  }
  function eliminarLineaCotizacion(indice: number) { setLineas((actuales) => actuales.filter((_, i) => i !== indice)); }

  return {
    busquedaProducto, setBusquedaProducto, productos, setProductos, buscandoProductos, productosRecientes: catalogoRecienteRepuestos.recientes, agregarProductoReciente,
    lineas, setLineas,
    agregarProducto, agregarServicioCotizacion, actualizarLineaCotizacion,
    eliminarLineaCotizacion,
  };
}
