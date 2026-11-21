import { useState } from "react";
import type { ProductoParaIngreso } from "../../services/ingresos.service";
import type { LineaOrden } from "./types";
import { servicioIngresos } from "../../services/ingresos.service";
import { useCatalogoRecientes, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";

type UseOrdenServicioLineasProps = {
  setBusquedaProducto: (valor: string) => void;
  setProductos: (productos: ProductoParaIngreso[]) => void;
};

export function lineaServicioIncompleta(linea: LineaOrden) {
  return linea.tipo === "SERVICIO"
    && (!String(linea.descripcion ?? linea.nombreVisible).trim()
      || !Number.isFinite(Number(linea.cantidad))
      || Number(linea.cantidad) <= 0
      || String(linea.precioUnitario).trim() === ""
      || !Number.isFinite(Number(linea.precioUnitario))
      || Number(linea.precioUnitario) < 0);
}

export function useOrdenServicioLineas({ setBusquedaProducto, setProductos }: UseOrdenServicioLineasProps) {
  const [lineas, setLineas] = useState<LineaOrden[]>([]);
  const [errorServicio, setErrorServicio] = useState("");
  const catalogoRecienteRepuestos = useCatalogoRecientes("repuestos");

  function agregarProducto(producto: ProductoParaIngreso) {
    if (lineas.some(lineaServicioIncompleta)) {
      setErrorServicio("Completa el servicio actual antes de agregar otro ítem.");
      return;
    }
    catalogoRecienteRepuestos.registrar({ id: producto.presentacionId, nombre: producto.nombre, codigo: producto.codigo, detalle: producto.presentacion });
    setLineas((actuales) => [...actuales, {
      tipo: "PRODUCTO",
      presentacionId: producto.presentacionId,
      cantidad: "1",
      descuento: "0",
      afectacionIgv: producto.afectacionIgv,
      precioUnitario: producto.precio,
      nombreVisible: `${producto.nombre} · ${producto.presentacion}`,
    }]);
    setBusquedaProducto("");
    setProductos([]);
    setErrorServicio("");
  }

  async function agregarProductoReciente(reciente: CatalogoReciente) {
    try {
      const resultado = await servicioIngresos.buscarProductos(reciente.codigo);
      const producto = resultado.find((item) => item.presentacionId === reciente.id);
      if (producto) agregarProducto(producto);
      else setErrorServicio("Ese repuesto ya no aparece en el catálogo. Búscalo nuevamente para actualizar sus datos.");
    } catch {
      setErrorServicio("No se pudo actualizar el repuesto reciente.");
    }
  }

  function agregarServicio() {
    if (lineas.some(lineaServicioIncompleta)) {
      setErrorServicio("Completa el servicio actual antes de agregar otro.");
      return;
    }
    const indiceNuevo = lineas.length;
    setLineas((actuales) => [...actuales, {
      tipo: "SERVICIO", descripcion: "", nombreVisible: "", cantidad: "1",
      precioUnitario: "", descuento: "0", afectacionIgv: "GRAVADO",
    }]);
    setErrorServicio("");
    window.requestAnimationFrame(() => {
      const campo = document.getElementById(`ordenes-servicio-descripcion-${indiceNuevo}`) as HTMLInputElement | null;
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
      campo?.focus({ preventScroll: true });
    });
  }

  function actualizarLinea(indice: number, cambios: Partial<LineaOrden>) {
    setLineas((actuales) => {
      const siguientes = actuales.map((linea, i) => i === indice ? { ...linea, ...cambios } : linea);
      if (!siguientes.some(lineaServicioIncompleta)) setErrorServicio("");
      return siguientes;
    });
  }

  return { lineas, setLineas, errorServicio, setErrorServicio, agregarProducto, agregarProductoReciente, productosRecientes: catalogoRecienteRepuestos.recientes, agregarServicio, actualizarLinea };
}
