import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { tamanioTablaInicial } from "../components/ui/listado-maestro/paginacion-responsive";
import { servicioProductos, type CatalogosProducto, type DatosProducto, type PaginaProductos, type Producto, type ProductoTarjeta } from "../services/inventario/productos.service";

export function useProductos() {
  const navegar = useNavigate();
  const [catalogos, setCatalogos] = useState<CatalogosProducto>({ categorias: [], marcas: [], unidadesMedida: [], tiposListasPrecio: [] });
  const [paginaDatos, setPaginaDatos] = useState<PaginaProductos>(() => ({ items: [], total: 0, pagina: 1, porPagina: tamanioTablaInicial(), totalPaginas: 1, conteosStock: { todos: 0, conStock: 0, sinStock: 0 }, conteosEstado: { todos: 0, activos: 0, inactivos: 0, stockBajo: 0 } }));
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("ACTIVOS");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("TODOS");
  const [existencia, setExistencia] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const consecutivoConsulta = useRef(0);

  const manejarError = useCallback((problema: unknown, alternativa: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : alternativa);
  }, [navegar]);

  const cargarCatalogos = useCallback(async () => {
    setCargandoCatalogos(true);
    try { setCatalogos(await servicioProductos.catalogos()); }
    catch (problema) { manejarError(problema, "No se pudieron cargar los catálogos del producto."); }
    finally { setCargandoCatalogos(false); }
  }, [manejarError]);

  const cargarPagina = useCallback(async (paginaSolicitada = pagina, tamano = porPagina, textoBusqueda = busqueda) => {
    const consulta = ++consecutivoConsulta.current;
    setCargando(true);
    try {
      const resultado = await servicioProductos.listar(paginaSolicitada, tamano, textoBusqueda, { estado, marca, precio, existencia });
      if (consulta !== consecutivoConsulta.current) return;
      setPaginaDatos(resultado);
      if (paginaSolicitada > resultado.totalPaginas) setPagina(resultado.totalPaginas);
      setError("");
    } catch (problema) {
      if (consulta === consecutivoConsulta.current) manejarError(problema, "No se pudo cargar el catálogo de productos.");
    } finally { if (consulta === consecutivoConsulta.current) setCargando(false); }
  }, [pagina, porPagina, busqueda, estado, marca, precio, existencia, manejarError]);

  useEffect(() => { void cargarCatalogos(); }, [cargarCatalogos]);
  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargarPagina(pagina, porPagina, busqueda); }, busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [pagina, porPagina, busqueda, cargarPagina]);

  const guardar = useCallback(async (datos: DatosProducto, id?: string) => {
    setError(""); setGuardando(true);
    try {
      const resultado = await servicioProductos.guardar(datos, id);
      setPagina(1);
      await cargarPagina(1, porPagina, busqueda);
      if (resultado.advertencia) setError(resultado.advertencia);
      return true;
    } catch (problema) { manejarError(problema, "No se pudo guardar el producto."); return false; }
    finally { setGuardando(false); }
  }, [cargarPagina, porPagina, busqueda, manejarError]);

  const consultar = useCallback(async (id: string): Promise<Producto | null> => {
    setError("");
    try { return await servicioProductos.consultar(id); }
    catch (problema) { manejarError(problema, "No se pudo cargar el detalle del producto."); return null; }
  }, [manejarError]);

  const crearMarca = useCallback(async (nombre: string) => {
    const resultado = await servicioProductos.crearMarca(nombre.trim());
    const marca = resultado.marca;
    setCatalogos((actual) => ({ ...actual, marcas: [...actual.marcas, marca].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
    return { ...marca, advertencia: resultado.advertencia };
  }, []);

  const crearCategoria = useCallback(async (nombre: string) => {
    const resultado = await servicioProductos.crearCategoria(nombre.trim());
    const categoria = resultado.categoria;
    setCatalogos((actual) => ({ ...actual, categorias: [...actual.categorias, categoria].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
    return { ...categoria, advertencia: resultado.advertencia };
  }, []);

  const cambiarEstado = useCallback(async (producto: Pick<ProductoTarjeta, "id" | "activo">) => {
    setError("");
    try { await servicioProductos.cambiarEstado(producto.id, !producto.activo); await cargarPagina(pagina, porPagina, busqueda); }
    catch (problema) { manejarError(problema, "No se pudo actualizar el estado del producto."); }
  }, [pagina, porPagina, busqueda, cargarPagina, manejarError]);

  const cambiarPorPagina = useCallback((cantidad: number) => {
    if (![4, 6, 8, 10].includes(cantidad)) return;
    setPorPagina(cantidad); setPagina(1);
  }, []);

  return {
    catalogos, productos: paginaDatos.items, total: paginaDatos.total, pagina, porPagina,
    conteosStock: paginaDatos.conteosStock, conteosEstado: paginaDatos.conteosEstado,
    totalPaginas: paginaDatos.totalPaginas, desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0,
    hasta: Math.min(pagina * porPagina, paginaDatos.total),
    busqueda, estado, marca, precio, existencia, cargarPagina,
    setBusqueda: (valor: string) => { setPagina(1); setBusqueda(valor); },
    setEstado: (valor: string) => { setPagina(1); setEstado(valor); },
    setMarca: (valor: string) => { setPagina(1); setMarca(valor); },
    setPrecio: (valor: string) => { setPagina(1); setPrecio(valor); },
    setExistencia: (valor: string) => { setPagina(1); setExistencia(valor); },
    cargando: cargando || cargandoCatalogos, guardando, error, setError,
    cambiarPagina: setPagina, cambiarPorPagina, guardar, consultar, crearMarca, crearCategoria, cambiarEstado,
  };
}
