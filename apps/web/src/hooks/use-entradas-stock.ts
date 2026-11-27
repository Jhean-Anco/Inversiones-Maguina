import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { tamanioTablaInicial } from "../components/ui/listado-maestro/paginacion-responsive";
import { servicioEntradasStock, type DatosEntradaStock, type EntradaStock, type FiltroEstadoPagoEntrada, type PaginaEntradasStock, type ProductoParaCompra } from "../services/inventario/entradas-stock.service";
import { useProveedorEntradaStock } from "./use-proveedor-entrada-stock";
import { useCatalogoRecientes, type CatalogoReciente, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../components/catalogo/use-catalogo-recientes";

type DetalleBorrador = { clave: string; productoId: string; presentacionId: string; codigo: string; nombre: string; presentacion: string; unidad: string; cantidad: string; costoUnitario: string; importeTotal: string; factor: number };
type PagoBorrador = { clave: string; cuentaFinancieraId: string; medioPago: string; importe: string };
const claveLocal = () => globalThis.crypto?.randomUUID?.() ?? `linea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fechaHoy = () => { const ahora = new Date(); return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`; };

export function useEntradasStock(alGuardarse?: () => void) {
  const navegar = useNavigate();
  const [paginaDatos, setPaginaDatos] = useState({ items: [] as EntradaStock[], total: 0, totalPaginas: 1, conteosPago: { todas: 0, pagadas: 0, pendientes: 0 } as PaginaEntradasStock["conteosPago"] });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPago, setFiltroPago] = useState<FiltroEstadoPagoEntrada>("TODAS");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fecha, setFecha] = useState(fechaHoy());
  const [tipoDocumento, setTipoDocumento] = useState("FACTURA");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [cuentaFinancieraId, setCuentaFinancieraId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoParaCompra[]>([]);
  const catalogoRecienteRepuestos = useCatalogoRecientes("repuestos");
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoElegido, setProductoElegido] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("1");
  const [costoProducto, setCostoProducto] = useState("");
  const [detalles, setDetalles] = useState<DetalleBorrador[]>([]);
  const [pagosCompra, setPagosCompra] = useState<PagoBorrador[]>([{ clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
  const [entradaDetalle, setEntradaDetalle] = useState<EntradaStock | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const consultaActual = useRef(0);
  const claveCompra = useRef<string | undefined>(globalThis.crypto?.randomUUID?.());

  const manejarError = useCallback((problema: unknown, alternativa: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : alternativa);
  }, [navegar]);
  const datosProveedor = useProveedorEntradaStock(setError, manejarError);

  const cargarPagina = useCallback(async (numeroPagina = pagina, tamano = porPagina, textoBusqueda = busqueda, estadoPago = filtroPago) => {
    const consulta = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioEntradasStock.listar(numeroPagina, tamano, textoBusqueda, estadoPago);
      if (consulta !== consultaActual.current) return;
      setPaginaDatos(resultado);
      if (numeroPagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
      setError("");
    } catch (problema) { if (consulta === consultaActual.current) manejarError(problema, "No se pudieron cargar las compras."); }
    finally { if (consulta === consultaActual.current) setCargando(false); }
  }, [pagina, porPagina, busqueda, filtroPago, manejarError]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargarPagina(pagina, porPagina, busqueda); }, busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarPagina, pagina, porPagina, busqueda, filtroPago]);

  useEffect(() => {
    const texto = productoBusqueda.trim();
    if (productoElegido) { setBuscandoProductos(false); return; }
    if (texto.length < MIN_CARACTERES_BUSQUEDA_CATALOGO) { setProductosEncontrados([]); setBuscandoProductos(false); return; }
    let vigente = true;
    setBuscandoProductos(true);
    const temporizador = window.setTimeout(() => {
      void servicioEntradasStock.buscarProductos(texto).then((resultados) => { if (vigente) setProductosEncontrados(resultados); })
        .catch((problema) => { if (vigente) manejarError(problema, "No se pudo buscar el producto."); })
        .finally(() => { if (vigente) setBuscandoProductos(false); });
    }, 220);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [productoBusqueda, productoElegido, manejarError]);

  function cambiarBusquedaProducto(texto: string) {
    setProductoElegido("");
    setProductoBusqueda(texto);
    setError("");
  }

  function seleccionarProductoCompra(producto: ProductoParaCompra) {
    if (detalles.some((fila) => fila.productoId === producto.productoId && fila.presentacionId === producto.presentacionId)) {
      setError("Ese repuesto ya está en la tabla. Edita su cantidad o precio total en la línea existente.");
      setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido("");
      return;
    }
    setDetalles((actuales) => [...actuales, { clave: claveLocal(), productoId: producto.productoId, presentacionId: producto.presentacionId, codigo: producto.codigoInterno, nombre: producto.nombre, presentacion: producto.presentacion, unidad: producto.unidadMedida, cantidad: "1", costoUnitario: "0.0000", importeTotal: "0.00", factor: Number(producto.factorAUnidadBase) }]);
    catalogoRecienteRepuestos.registrar({ id: producto.presentacionId, nombre: producto.nombre, codigo: producto.codigoInterno, detalle: producto.presentacion });
    setProductoElegido(producto.presentacionId);
    setProductoBusqueda(`${producto.nombre} · ${producto.presentacion}`);
    setProductosEncontrados((actuales) => actuales.length ? actuales : [producto]);
    setError(""); setCantidadProducto("1"); setCostoProducto("");
  }
  async function seleccionarProductoReciente(reciente: CatalogoReciente) {
    setBuscandoProductos(true);
    setError("");
    try {
      const coincidencias = await servicioEntradasStock.buscarProductos(reciente.codigo);
      const producto = coincidencias.find((item) => item.presentacionId === reciente.id);
      if (!producto) { setError("Ese repuesto ya no está disponible para compra. Búscalo nuevamente para actualizar sus datos."); return; }
      seleccionarProductoCompra(producto);
    } catch (problema) {
      manejarError(problema, "No se pudo actualizar el repuesto reciente.");
    } finally { setBuscandoProductos(false); }
  }

  function limpiarProductoElegido() {
    setProductoElegido(""); setProductoBusqueda(""); setProductosEncontrados([]); setCantidadProducto("1"); setCostoProducto("");
  }

  function abrirNuevo() {
    claveCompra.current = globalThis.crypto?.randomUUID?.();
    setError(""); setFecha(fechaHoy()); setTipoDocumento("FACTURA"); setNumeroDocumento(""); datosProveedor.limpiarProveedor(); setMedioPago(""); setCuentaFinancieraId(""); setObservacion(""); setPagosCompra([{ clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
    setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(""); setCantidadProducto("1"); setCostoProducto(""); setDetalles([]); setModalAbierto(true);
  }
  function agregarDetalle() {
    const producto = productosEncontrados.find((fila) => fila.presentacionId === productoElegido);
    const cantidad = Number(cantidadProducto);
    const totalLinea = Number(costoProducto);
    if (!producto) { setError("Busca y selecciona un producto y su presentación de compra."); return; }
    if (!Number.isFinite(cantidad) || cantidad <= 0 || !costoProducto.trim() || !Number.isFinite(totalLinea) || totalLinea <= 0) { setError("Revisa la cantidad y el precio total de la línea."); return; }
    if (detalles.some((fila) => fila.productoId === producto.productoId && fila.presentacionId === producto.presentacionId)) { setError("Ese producto y presentación ya están en la entrada. Actualiza su cantidad en la línea existente."); return; }
    setDetalles((actuales) => [...actuales, { clave: claveLocal(), productoId: producto.productoId, presentacionId: producto.presentacionId, codigo: producto.codigoInterno, nombre: producto.nombre, presentacion: producto.presentacion, unidad: producto.unidadMedida, cantidad: cantidad.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""), costoUnitario: (totalLinea / cantidad).toFixed(4), importeTotal: totalLinea.toFixed(2), factor: Number(producto.factorAUnidadBase) }]);
    setError(""); setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(""); setCantidadProducto("1"); setCostoProducto("");
  }
  function abrirProductoDetalle(id: string) {
    setCargandoDetalle(true); setError("");
    void servicioEntradasStock.consultar(id).then(setEntradaDetalle).catch((problema) => manejarError(problema, "No se pudo cargar el detalle de la entrada.")).finally(() => setCargandoDetalle(false));
  }
  async function guardar(evento: FormEvent<HTMLFormElement>, pagosDirectos?: DatosEntradaStock["pagos"]): Promise<EntradaStock | null> {
    evento.preventDefault(); setError("");
    if (!detalles.length) { setError("Agrega al menos un producto comprado para registrar la compra."); return null; }
    if (detalles.some((detalle) => Number(detalle.importeTotal) <= 0 || Number(detalle.cantidad) <= 0)) { setError("Completa la cantidad y el precio total de cada repuesto."); return null; }
    const pagos = pagosDirectos ?? pagosCompra.map((pago) => ({ cuentaFinancieraId: pago.cuentaFinancieraId, medioPago: pago.medioPago, importePagado: pago.importe || (pagosCompra.length === 1 ? totalBorrador.toFixed(2) : "0") }));
    if (pagos.some((pago) => !pago.cuentaFinancieraId || !pago.medioPago || Number(pago.importePagado) <= 0) || Math.round(pagos.reduce((suma, pago) => suma + Number(pago.importePagado), 0) * 100) !== Math.round(totalBorrador * 100)) { setError("Completa los importes y las cuentas. La suma debe coincidir con el total de la compra."); return null; }
    const montoPagado = totalBorrador.toFixed(2);
    const sinDocumento = tipoDocumento === "SIN_DOCUMENTO";
    const datos: DatosEntradaStock = { claveIdempotencia: claveCompra.current, fecha, tipoDocumento, numeroDocumento: sinDocumento ? "" : numeroDocumento.trim(), proveedor: sinDocumento ? "" : datosProveedor.proveedor.trim(), proveedorTipoPersona: sinDocumento ? null : datosProveedor.proveedorTipoPersona, proveedorTipoDocumento: sinDocumento ? null : datosProveedor.proveedorTipoDocumento, proveedorNumeroDocumento: sinDocumento ? "" : datosProveedor.proveedorNumeroDocumento.trim(), proveedorDireccion: sinDocumento ? "" : datosProveedor.proveedorDireccion.trim(), medioPago: pagos.length === 1 ? pagos[0].medioPago : null, cuentaFinancieraId: pagos.length === 1 ? pagos[0].cuentaFinancieraId : null, montoPagado, pagos, observacion: observacion.trim(), detalles: detalles.map(({ productoId, presentacionId, cantidad, costoUnitario, importeTotal }) => ({ productoId, presentacionId, cantidad, costoUnitario, importeTotal })) };
    setGuardando(true);
    try {
      const creada = await servicioEntradasStock.crear(datos);
      setModalAbierto(false); setPagina(1); await cargarPagina(1, porPagina, busqueda);
      alGuardarse?.();
      return creada;
    } catch (problema) { manejarError(problema, "No se pudo registrar la compra."); return null; }
    finally { setGuardando(false); }
  }
  async function anularCompra(id: string, motivo: string) {
    await servicioEntradasStock.anular(id, motivo);
    setEntradaDetalle(null);
    await cargarPagina();
  }
  function cambiarPorPagina(cantidad: number) { if ([4, 6, 8, 10].includes(cantidad)) { setPorPagina(cantidad); setPagina(1); } }

  const totalBorrador = useMemo(() => detalles.reduce((total, fila) => total + Number(fila.importeTotal), 0), [detalles]);
  return {
    entradas: paginaDatos.items, total: paginaDatos.total, pagina, porPagina, totalPaginas: paginaDatos.totalPaginas, conteosPago: paginaDatos.conteosPago, filtroPago, setFiltroPago,
    desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, paginaDatos.total),
    cargando, error, setError, busqueda, setBusqueda, cambiarPagina: setPagina, cambiarPorPagina,
    modalAbierto, abrirNuevo, cerrarModal: () => { if (!guardando) setModalAbierto(false); }, guardando,
    fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento, ...datosProveedor, medioPago, setMedioPago, cuentaFinancieraId, setCuentaFinancieraId, observacion, setObservacion,
    productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos, productoElegido, productosRecientes: catalogoRecienteRepuestos.recientes, seleccionarProductoReciente,
    seleccionarProductoCompra, limpiarProductoElegido, cantidadProducto, setCantidadProducto, costoProducto, setCostoProducto,
    detalles, setDetalles, totalBorrador, pagosCompra, setPagosCompra, agregarPagoCompra: () => setPagosCompra((actuales) => [...actuales, { clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]), quitarPagoCompra: (clave: string) => setPagosCompra((actuales) => actuales.filter((pago) => pago.clave !== clave)), agregarDetalle, quitarDetalle: (clave: string) => setDetalles((actuales) => actuales.filter((fila) => fila.clave !== clave)), guardar,
    anularCompra, entradaDetalle, cerrarDetalle: () => setEntradaDetalle(null), abrirProductoDetalle, cargandoDetalle,
  };
}
