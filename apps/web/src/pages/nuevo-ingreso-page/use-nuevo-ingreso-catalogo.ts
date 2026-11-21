import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { servicioIngresos } from "../../services/ingresos.service";
import { servicioProductos, type DatosProducto } from "../../services/inventario/productos.service";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";

type Venta = ReturnType<typeof useNuevoIngreso>;

export function useNuevoIngresoCatalogo(venta: Venta) {
  const [mostrarAltaProducto, setMostrarAltaProducto] = useState(false);
  const [catalogosAltaProducto, setCatalogosAltaProducto] = useState<Awaited<ReturnType<typeof servicioProductos.catalogos>> | null>(null);
  const [cargandoAltaProducto, setCargandoAltaProducto] = useState(false);
  const [errorAltaProducto, setErrorAltaProducto] = useState("");
  const codigoLector = useRef("");
  const tiempoUltimaTeclaLector = useRef(0);
  const objetivoLector = useRef<EventTarget | null>(null);
  const buscarCodigoLectorRef = useRef<(codigo: string) => Promise<void>>(async () => undefined);

  const buscarProductoConEnter = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== "Enter") return;
    const consulta = venta.busqueda.trim().toLocaleLowerCase("es-PE");
    const coincidenciaExacta = venta.resultados.find((producto) => producto.codigo.toLocaleLowerCase("es-PE") === consulta);
    if (coincidenciaExacta) {
      evento.preventDefault();
      venta.agregarProducto(coincidenciaExacta);
    } else if (venta.resultados.length === 1) {
      evento.preventDefault();
      venta.agregarProducto(venta.resultados[0]);
    }
  };

  const buscarCodigoEscaneado = async (codigo: string) => {
    try {
      const coincidencias = await servicioIngresos.buscarProductos(codigo, false, true, true);
      const producto = coincidencias.length === 1 ? coincidencias[0] : null;
      if (producto) venta.agregarProducto(producto);
      else venta.setBusqueda(codigo);
    } catch (problema) {
      venta.setError(problema instanceof Error ? problema.message : "No se pudo buscar el código leído.");
    }
  };

  async function abrirAltaProducto() {
    setMostrarAltaProducto(true);
    setErrorAltaProducto("");
    if (catalogosAltaProducto) return;
    setCargandoAltaProducto(true);
    try {
      setCatalogosAltaProducto(await servicioProductos.catalogos());
    } catch (problema) {
      setErrorAltaProducto(problema instanceof Error ? problema.message : "No se pudieron cargar los datos para registrar el repuesto.");
    } finally {
      setCargandoAltaProducto(false);
    }
  }

  async function guardarProductoDesdeVenta(datos: DatosProducto) {
    try {
      const resultado = await servicioProductos.guardar(datos);
      venta.setBusqueda(resultado.producto.codigoInterno);
      venta.setError(resultado.advertencia ?? "");
      setMostrarAltaProducto(false);
      return true;
    } catch (problema) {
      venta.setError(problema instanceof Error ? problema.message : "No se pudo registrar el repuesto.");
      return false;
    }
  }

  buscarCodigoLectorRef.current = buscarCodigoEscaneado;

  useEffect(() => {
    const capturarLector = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === "Enter" || evento.key === "Tab") {
        const codigo = codigoLector.current.trim();
        codigoLector.current = "";
        const destino = objetivoLector.current;
        objetivoLector.current = null;
        const esLecturaRapida = codigo.length >= 3 && performance.now() - tiempoUltimaTeclaLector.current < 120;
        if (esLecturaRapida) {
          evento.preventDefault();
          if (destino instanceof HTMLInputElement || destino instanceof HTMLTextAreaElement) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(destino), "value")?.set;
            if (setter && destino.value.endsWith(codigo)) {
              setter.call(destino, destino.value.slice(0, -codigo.length));
              destino.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
          void buscarCodigoLectorRef.current(codigo);
        }
        return;
      }
      if (evento.key.length !== 1 || evento.ctrlKey || evento.altKey || evento.metaKey || evento.isComposing) {
        codigoLector.current = "";
        objetivoLector.current = null;
        return;
      }
      const ahora = performance.now();
      if (ahora - tiempoUltimaTeclaLector.current > 100) {
        codigoLector.current = "";
        objetivoLector.current = evento.target;
      }
      tiempoUltimaTeclaLector.current = ahora;
      codigoLector.current += evento.key;
      if (codigoLector.current.length > 128) {
        codigoLector.current = "";
        objetivoLector.current = null;
      }
    };
    window.addEventListener("keydown", capturarLector, true);
    return () => window.removeEventListener("keydown", capturarLector, true);
  }, []);

  return {
    mostrarAltaProducto,
    setMostrarAltaProducto,
    catalogosAltaProducto,
    cargandoAltaProducto,
    errorAltaProducto,
    buscarProductoConEnter,
    abrirAltaProducto,
    guardarProductoDesdeVenta,
    crearMarca: async (nombre: string) => {
      const resultado = await servicioProductos.crearMarca(nombre);
      return { ...resultado.marca, advertencia: resultado.advertencia };
    },
    crearCategoria: async (nombre: string) => {
      const resultado = await servicioProductos.crearCategoria(nombre);
      return { ...resultado.categoria, advertencia: resultado.advertencia };
    },
  };
}
