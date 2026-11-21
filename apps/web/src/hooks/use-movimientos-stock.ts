import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { tamanioTablaInicial } from "../components/ui/listado-maestro/paginacion-responsive";
import { useCatalogoRecientes, type CatalogoReciente, MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../components/catalogo/use-catalogo-recientes";
import { servicioMovimientosStock, type DatosAjusteStock, type MovimientoStock, type PaginaMovimientosStock, type ProductoParaAjuste } from "../services/inventario/movimientos-stock.service";

export const MOTIVOS_AJUSTE = [
  { codigo: "INVENTARIO_FISICO", nombre: "Conteo de inventario" },
  { codigo: "MERMA", nombre: "Merma" },
  { codigo: "DANIO", nombre: "Producto dañado" },
  { codigo: "PERDIDA", nombre: "Pérdida" },
  { codigo: "DEVOLUCION", nombre: "Devolución" },
  { codigo: "CORRECCION", nombre: "Corrección de registro" },
  { codigo: "OTRO", nombre: "Otro motivo" },
] as const;

export const motivoVisible = (codigo: string | null) => MOTIVOS_AJUSTE.find((motivo) => motivo.codigo === codigo)?.nombre ?? codigo ?? "—";

export function useMovimientosStock() {
  const navegar = useNavigate();
  const [paginaDatos, setPaginaDatos] = useState<PaginaMovimientosStock>(() => ({ items: [], total: 0, pagina: 1, porPagina: tamanioTablaInicial(), totalPaginas: 1 }));
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoParaAjuste[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoElegido, setProductoElegido] = useState<ProductoParaAjuste | null>(null);
  const [sentido, setSentido] = useState<"INGRESO" | "RETIRO" | "CONTEO">("CONTEO");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState<string>(MOTIVOS_AJUSTE[0].codigo);
  const [observacion, setObservacion] = useState("");
  const consultaActual = useRef(0);
  const catalogoRecienteRepuestos = useCatalogoRecientes("repuestos");

  const manejarError = useCallback((problema: unknown, alternativo: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : alternativo);
  }, [navegar]);

  const cargarPagina = useCallback(async () => {
    const consulta = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioMovimientosStock.listar(pagina, porPagina, busqueda, "AJUSTE");
      if (consulta !== consultaActual.current) return;
      setPaginaDatos(resultado);
      if (pagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
      setError("");
    } catch (problema) { if (consulta === consultaActual.current) manejarError(problema, "No se pudieron cargar los movimientos del inventario."); }
    finally { if (consulta === consultaActual.current) setCargando(false); }
  }, [pagina, porPagina, busqueda, manejarError]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargarPagina(); }, busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarPagina, busqueda]);

  useEffect(() => {
    const texto = productoBusqueda.trim();
    if (productoElegido) { setBuscandoProductos(false); setProductosEncontrados([]); return; }
    if (texto.length < MIN_CARACTERES_BUSQUEDA_CATALOGO) { setProductosEncontrados([]); setBuscandoProductos(false); return; }
    let vigente = true;
    setBuscandoProductos(true);
    const temporizador = window.setTimeout(() => {
      void servicioMovimientosStock.buscarProductos(texto).then((resultados) => { if (vigente) setProductosEncontrados(resultados.slice(0, MAX_RESULTADOS_CATALOGO)); })
        .catch((problema) => { if (vigente) manejarError(problema, "No se pudieron buscar productos."); })
        .finally(() => { if (vigente) setBuscandoProductos(false); });
    }, 200);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [productoBusqueda, productoElegido, manejarError]);

  function abrirNuevo() {
    setError(""); setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(null);
    setSentido("CONTEO"); setCantidad(""); setMotivo(MOTIVOS_AJUSTE[0].codigo); setObservacion(""); setModalAbierto(true);
  }
  function cerrarModal() { if (!guardando) { setModalAbierto(false); setError(""); } }
  function elegirProducto(producto: ProductoParaAjuste) {
    setProductoElegido(producto); setCantidad(""); setProductoBusqueda(""); setProductosEncontrados([]); setError("");
    catalogoRecienteRepuestos.registrar({ id: producto.id, nombre: producto.nombre, codigo: producto.codigo, detalle: producto.marca });
  }
  async function elegirProductoReciente(reciente: CatalogoReciente) {
    try {
      const resultados = await servicioMovimientosStock.buscarProductos(reciente.codigo);
      const producto = resultados.find((actual) => actual.id === reciente.id);
      if (!producto) { setError("El producto ya no está disponible en el inventario."); return; }
      elegirProducto(producto);
    } catch (problema) { manejarError(problema, "No se pudo volver a cargar el producto."); }
  }
  function limpiarProducto() { setProductoElegido(null); setProductoBusqueda(""); setCantidad(""); }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (!productoElegido) { setError("Busca y selecciona el producto que vas a ajustar."); return; }
    const unidades = Number(cantidad);
    const porConteo = sentido === "CONTEO";
    if (!cantidad.trim() || !Number.isFinite(unidades) || unidades < (porConteo ? 0 : 0.001) || Number(unidades.toFixed(3)) !== unidades) {
      setError(porConteo ? "Ingresa el total contado con hasta 3 decimales." : "Ingresa una cantidad mayor que cero con hasta 3 decimales."); return;
    }
    if (sentido === "RETIRO" && unidades > Number(productoElegido.cantidadActual)) { setError("La cantidad supera el stock disponible."); return; }
    const datos: DatosAjusteStock = {
      productoId: productoElegido.id, saldoEsperado: productoElegido.cantidadActual,
      ...(porConteo ? { cantidadContada: cantidad.trim() } : { sentido, cantidad: cantidad.trim() }),
      motivo, observacion: observacion.trim(),
    };
    setGuardando(true); setMensaje("");
    try {
      const resultado = await servicioMovimientosStock.crearAjuste(datos);
      setMensaje(`Ajuste registrado. Saldo final: ${Number(resultado.saldoFinal).toLocaleString("es-PE")} ${productoElegido.unidad}.`);
      setModalAbierto(false);
      if (pagina === 1) await cargarPagina();
      else setPagina(1);
    } catch (problema) { manejarError(problema, "No se pudo registrar el ajuste de inventario."); }
    finally { setGuardando(false); }
  }

  const cantidadActual = Number(productoElegido?.cantidadActual ?? 0);
  const cantidadAjustada = Number(cantidad || 0);
  const cantidadProyectada = !cantidad.trim() ? cantidadActual : sentido === "CONTEO" ? cantidadAjustada : cantidadActual + (sentido === "INGRESO" ? cantidadAjustada : -cantidadAjustada);
  return {
    movimientos: paginaDatos.items, total: paginaDatos.total, pagina, porPagina, totalPaginas: paginaDatos.totalPaginas,
    desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, paginaDatos.total),
    cargando, guardando, error, setError, mensaje, setMensaje, busqueda, setBusqueda,
    cambiarPagina: setPagina, cambiarPorPagina: (valor: number) => { if ([4, 6, 8, 10].includes(valor)) { setPorPagina(valor); setPagina(1); } },
    modalAbierto, abrirNuevo, cerrarModal, guardar, productoBusqueda, setProductoBusqueda,
    productosEncontrados, buscandoProductos, productoElegido, elegirProducto, productosRecientes: catalogoRecienteRepuestos.recientes, elegirProductoReciente, limpiarProducto,
    sentido, setSentido, cantidad, setCantidad, motivo, setMotivo, observacion, setObservacion,
    cantidadProyectada, motivoVisible,
  };
}

export type ModuloMovimientosStock = ReturnType<typeof useMovimientosStock>;
export type { MovimientoStock };
