import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
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
  const [paginaDatos, setPaginaDatos] = useState<PaginaMovimientosStock>({ items: [], total: 0, pagina: 1, porPagina: 12, totalPaginas: 1 });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoParaAjuste[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoElegido, setProductoElegido] = useState<ProductoParaAjuste | null>(null);
  const [sentido, setSentido] = useState<"INGRESO" | "RETIRO">("INGRESO");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState<string>(MOTIVOS_AJUSTE[0].codigo);
  const [observacion, setObservacion] = useState("");
  const consultaActual = useRef(0);

  const manejarError = useCallback((problema: unknown, alternativo: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : alternativo);
  }, [navegar]);

  const cargarPagina = useCallback(async () => {
    const consulta = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioMovimientosStock.listar(pagina, porPagina, busqueda, tipo);
      if (consulta !== consultaActual.current) return;
      setPaginaDatos(resultado);
      if (pagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
      setError("");
    } catch (problema) { if (consulta === consultaActual.current) manejarError(problema, "No se pudieron cargar los movimientos del inventario."); }
    finally { if (consulta === consultaActual.current) setCargando(false); }
  }, [pagina, porPagina, busqueda, tipo, manejarError]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargarPagina(); }, busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarPagina, busqueda]);

  useEffect(() => {
    const texto = productoBusqueda.trim();
    if (productoElegido) { setBuscandoProductos(false); setProductosEncontrados([]); return; }
    if (texto.length < 2) { setProductosEncontrados([]); setBuscandoProductos(false); return; }
    let vigente = true;
    setBuscandoProductos(true);
    const temporizador = window.setTimeout(() => {
      void servicioMovimientosStock.buscarProductos(texto).then((resultados) => { if (vigente) setProductosEncontrados(resultados); })
        .catch((problema) => { if (vigente) manejarError(problema, "No se pudieron buscar productos."); })
        .finally(() => { if (vigente) setBuscandoProductos(false); });
    }, 200);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [productoBusqueda, productoElegido, manejarError]);

  function abrirNuevo() {
    setError(""); setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(null);
    setSentido("INGRESO"); setCantidad("1"); setMotivo(MOTIVOS_AJUSTE[0].codigo); setObservacion(""); setModalAbierto(true);
  }
  function cerrarModal() { if (!guardando) { setModalAbierto(false); setError(""); } }
  function elegirProducto(producto: ProductoParaAjuste) { setProductoElegido(producto); setProductoBusqueda(""); setProductosEncontrados([]); setError(""); }
  function limpiarProducto() { setProductoElegido(null); setProductoBusqueda(""); setCantidad("1"); }
  function filtrarTipo(valor: string) { setTipo(valor); setPagina(1); }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (!productoElegido) { setError("Busca y selecciona el producto que vas a ajustar."); return; }
    const unidades = Number(cantidad);
    if (!Number.isFinite(unidades) || unidades < 0.001 || Number(unidades.toFixed(3)) !== unidades) { setError("Ingresa una cantidad mayor que cero con hasta 3 decimales."); return; }
    if (sentido === "RETIRO" && unidades > Number(productoElegido.cantidadActual)) { setError("La cantidad supera el stock disponible."); return; }
    const datos: DatosAjusteStock = { productoId: productoElegido.id, sentido, cantidad: cantidad.trim(), motivo, observacion: observacion.trim() };
    setGuardando(true);
    try {
      await servicioMovimientosStock.crearAjuste(datos);
      setModalAbierto(false); setPagina(1); await servicioMovimientosStock.listar(1, porPagina, busqueda, tipo).then((resultado) => setPaginaDatos(resultado));
    } catch (problema) { manejarError(problema, "No se pudo registrar el ajuste de inventario."); }
    finally { setGuardando(false); }
  }

  const cantidadActual = Number(productoElegido?.cantidadActual ?? 0);
  const cantidadAjustada = Number(cantidad || 0);
  const cantidadProyectada = sentido === "INGRESO" ? cantidadActual + cantidadAjustada : Math.max(0, cantidadActual - cantidadAjustada);
  return {
    movimientos: paginaDatos.items, total: paginaDatos.total, pagina, porPagina, totalPaginas: paginaDatos.totalPaginas,
    desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, paginaDatos.total),
    cargando, guardando, error, setError, busqueda, setBusqueda, tipo, filtrarTipo,
    cambiarPagina: setPagina, cambiarPorPagina: (valor: number) => { if ([12, 16, 20].includes(valor)) { setPorPagina(valor); setPagina(1); } },
    modalAbierto, abrirNuevo, cerrarModal, guardar, productoBusqueda, setProductoBusqueda,
    productosEncontrados, buscandoProductos, productoElegido, elegirProducto, limpiarProducto,
    sentido, setSentido, cantidad, setCantidad, motivo, setMotivo, observacion, setObservacion,
    cantidadProyectada, motivoVisible,
  };
}

export type ModuloMovimientosStock = ReturnType<typeof useMovimientosStock>;
export type { MovimientoStock };
