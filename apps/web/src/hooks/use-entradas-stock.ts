import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { tamanioTablaInicial } from "../components/ui/listado-maestro/paginacion-responsive";
import { servicioIdentidad } from "../services/identidad.service";
import { servicioProveedores, type ProveedorRegistrado } from "../services/proveedores.service";
import { servicioEntradasStock, type DatosEntradaStock, type EntradaStock, type ProductoParaCompra } from "../services/inventario/entradas-stock.service";

type DetalleBorrador = { clave: string; productoId: string; presentacionId: string; codigo: string; nombre: string; presentacion: string; unidad: string; cantidad: string; costoUnitario: string; importeTotal: string; factor: number };
type PagoBorrador = { clave: string; cuentaFinancieraId: string; medioPago: string; importe: string };
const claveLocal = () => globalThis.crypto?.randomUUID?.() ?? `linea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fechaHoy = () => { const ahora = new Date(); return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`; };

export function useEntradasStock(alGuardarse?: () => void) {
  const navegar = useNavigate();
  const [paginaDatos, setPaginaDatos] = useState({ items: [] as EntradaStock[], total: 0, totalPaginas: 1 });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fecha, setFecha] = useState(fechaHoy());
  const [tipoDocumento, setTipoDocumento] = useState("FACTURA");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [proveedorTipoPersona, setProveedorTipoPersona] = useState("");
  const [proveedorTipoDocumento, setProveedorTipoDocumento] = useState("RUC");
  const [proveedorNumeroDocumento, setProveedorNumeroDocumento] = useState("");
  const [proveedorDireccion, setProveedorDireccion] = useState("");
  const [proveedoresEncontrados, setProveedoresEncontrados] = useState<ProveedorRegistrado[]>([]);
  const [buscandoProveedores, setBuscandoProveedores] = useState(false);
  const [proveedorNoEncontrado, setProveedorNoEncontrado] = useState(false);
  const [datosProveedorEditables, setDatosProveedorEditables] = useState(false);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [identidadProveedor, setIdentidadProveedor] = useState<Awaited<ReturnType<typeof servicioIdentidad.consultar>> | null>(null);
  const [medioPago, setMedioPago] = useState("");
  const [cuentaFinancieraId, setCuentaFinancieraId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoParaCompra[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoElegido, setProductoElegido] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("1");
  const [costoProducto, setCostoProducto] = useState("");
  const [detalles, setDetalles] = useState<DetalleBorrador[]>([]);
  const [pagosCompra, setPagosCompra] = useState<PagoBorrador[]>([{ clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
  const [entradaDetalle, setEntradaDetalle] = useState<EntradaStock | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const consultaActual = useRef(0);

  const manejarError = useCallback((problema: unknown, alternativa: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : alternativa);
  }, [navegar]);

  const cargarPagina = useCallback(async (numeroPagina = pagina, tamano = porPagina, textoBusqueda = busqueda) => {
    const consulta = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioEntradasStock.listar(numeroPagina, tamano, textoBusqueda);
      if (consulta !== consultaActual.current) return;
      setPaginaDatos(resultado);
      if (numeroPagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
      setError("");
    } catch (problema) { if (consulta === consultaActual.current) manejarError(problema, "No se pudieron cargar las compras."); }
    finally { if (consulta === consultaActual.current) setCargando(false); }
  }, [pagina, porPagina, busqueda, manejarError]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargarPagina(pagina, porPagina, busqueda); }, busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarPagina, pagina, porPagina, busqueda]);

  useEffect(() => {
    const texto = productoBusqueda.trim();
    if (productoElegido) { setBuscandoProductos(false); return; }
    if (texto.length < 3) { setProductosEncontrados([]); setBuscandoProductos(false); return; }
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
    setProductoElegido(producto.presentacionId);
    setProductoBusqueda(`${producto.nombre} · ${producto.presentacion}`);
    setProductosEncontrados((actuales) => actuales.length ? actuales : [producto]);
    setError(""); setCantidadProducto("1"); setCostoProducto("");
  }

  function limpiarProductoElegido() {
    setProductoElegido(""); setProductoBusqueda(""); setProductosEncontrados([]); setCantidadProducto("1"); setCostoProducto("");
  }

  async function buscarProveedor() {
    const numero = proveedorNumeroDocumento.trim();
    const requerido = proveedorTipoDocumento === "DNI" ? 8 : proveedorTipoDocumento === "RUC" ? 11 : 1;
    if (numero.length < requerido || (proveedorTipoDocumento !== "EXT" && numero.length !== requerido)) {
      setError(proveedorTipoDocumento === "DNI" ? "Ingresa los 8 dígitos del DNI para buscar al proveedor." : proveedorTipoDocumento === "RUC" ? "Ingresa los 11 dígitos del RUC para buscar al proveedor." : "Ingresa el documento extranjero para buscar al proveedor.");
      setProveedoresEncontrados([]); setProveedorNoEncontrado(false); return;
    }
    setError(""); setBuscandoProveedores(true); setProveedoresEncontrados([]); setProveedorNoEncontrado(false); setIdentidadProveedor(null);
    try {
      const resultados = await servicioProveedores.listar(numero);
      const codigoDocumento = proveedorTipoDocumento === "DNI" ? "01" : proveedorTipoDocumento === "RUC" ? "06" : proveedorTipoDocumento;
      const coincidencias = resultados.filter((item) => item.numeroDocumento === numero && (item.tipoDocumento === proveedorTipoDocumento || item.tipoDocumento === codigoDocumento));
      setProveedoresEncontrados(coincidencias);
      setProveedorNoEncontrado(coincidencias.length === 0);
    } catch (problema) { manejarError(problema, "No se pudo buscar el proveedor en el directorio."); }
    finally { setBuscandoProveedores(false); }
  }

  async function abrirRegistroProveedor() {
    setDatosProveedorEditables(true); setCreandoProveedor(true); setProveedorNoEncontrado(false); setError(""); setIdentidadProveedor(null);
    if (proveedorTipoDocumento !== "DNI" && proveedorTipoDocumento !== "RUC") { setError("El directorio de proveedores permite registrar DNI o RUC."); return; }
    setBuscandoProveedores(true);
    try {
      const identidad = await servicioIdentidad.consultar(proveedorTipoDocumento, proveedorNumeroDocumento.trim());
      setIdentidadProveedor(identidad);
      setProveedor(identidad.razonSocial || [identidad.nombres, identidad.apellidoPaterno, identidad.apellidoMaterno].filter(Boolean).join(" "));
      setProveedorTipoPersona(identidad.tipoPersona);
      setProveedorDireccion(identidad.direccion ?? "");
    } catch (problema) { manejarError(problema, "No se pudieron consultar los datos del documento."); }
    finally { setBuscandoProveedores(false); }
  }

  async function crearProveedor() {
    const tipo = proveedorTipoDocumento;
    const numero = proveedorNumeroDocumento.trim();
    if ((tipo !== "DNI" && tipo !== "RUC") || !identidadProveedor) { setError("Busca los datos del proveedor antes de registrarlo."); return; }
    try {
      const creado = await servicioProveedores.crear({ tipoDocumento: tipo, numeroDocumento: numero,
        razonSocial: tipo === "RUC" && numero.startsWith("20") ? identidadProveedor.razonSocial || proveedor : undefined,
        nombres: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.nombres : undefined,
        apellidoPaterno: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.apellidoPaterno : undefined,
        apellidoMaterno: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.apellidoMaterno : undefined,
      });
      setProveedor(creado.nombre); setProveedorTipoPersona(identidadProveedor.tipoPersona); setProveedorDireccion(identidadProveedor.direccion ?? "");
      setProveedoresEncontrados([creado]); setDatosProveedorEditables(false); setCreandoProveedor(false); setError("");
    } catch (problema) { manejarError(problema, "No se pudo registrar el proveedor en el directorio."); }
  }

  function seleccionarProveedor(entrada: ProveedorRegistrado) {
    const tipo = entrada.tipoDocumento === "01" ? "DNI" : entrada.tipoDocumento === "06" ? "RUC" : entrada.tipoDocumento;
    setProveedor(entrada.nombre || entrada.razonSocial || [entrada.nombres, entrada.apellidoPaterno, entrada.apellidoMaterno].filter(Boolean).join(" "));
    setProveedorTipoPersona(tipo === "DNI" || (tipo === "RUC" && !entrada.numeroDocumento.startsWith("20")) ? "NATURAL" : "JURIDICA");
    setProveedorTipoDocumento(tipo);
    setProveedorNumeroDocumento(entrada.numeroDocumento);
    setProveedorDireccion("");
    setIdentidadProveedor(null); setDatosProveedorEditables(true); setCreandoProveedor(false);
    setProveedoresEncontrados([]); setProveedorNoEncontrado(false); setError("");
  }

  function abrirNuevo() {
    setError(""); setFecha(fechaHoy()); setTipoDocumento("FACTURA"); setNumeroDocumento(""); setProveedor(""); setProveedorTipoPersona(""); setProveedorTipoDocumento("RUC"); setProveedorNumeroDocumento(""); setProveedorDireccion(""); setProveedoresEncontrados([]); setBuscandoProveedores(false); setProveedorNoEncontrado(false); setDatosProveedorEditables(false); setCreandoProveedor(false); setIdentidadProveedor(null); setMedioPago(""); setCuentaFinancieraId(""); setObservacion(""); setPagosCompra([{ clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
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
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (!detalles.length) { setError("Agrega al menos un producto comprado para registrar la compra."); return; }
    if (detalles.some((detalle) => Number(detalle.importeTotal) <= 0 || Number(detalle.cantidad) <= 0)) { setError("Completa la cantidad y el precio total de cada repuesto."); return; }
    const pagos = pagosCompra.map((pago) => ({ cuentaFinancieraId: pago.cuentaFinancieraId, medioPago: pago.medioPago, importePagado: pago.importe || (pagosCompra.length === 1 ? totalBorrador.toFixed(2) : "0") }));
    if (pagosCompra.some((pago) => !pago.cuentaFinancieraId || !pago.medioPago || Number(pago.importe || (pagosCompra.length === 1 ? totalBorrador : 0)) <= 0) || Math.round(pagos.reduce((suma, pago) => suma + Number(pago.importePagado), 0) * 100) !== Math.round(totalBorrador * 100)) { setError("Completa los importes y las cuentas. La suma debe coincidir con el total de la compra."); return; }
    const datos: DatosEntradaStock = { fecha, tipoDocumento, numeroDocumento: numeroDocumento.trim(), proveedor: proveedor.trim(), proveedorTipoPersona, proveedorTipoDocumento, proveedorNumeroDocumento: proveedorNumeroDocumento.trim(), proveedorDireccion: proveedorDireccion.trim(), medioPago: pagos.length === 1 ? pagos[0].medioPago : null, cuentaFinancieraId: pagos.length === 1 ? pagos[0].cuentaFinancieraId : null, montoPagado: totalBorrador.toFixed(2), pagos, observacion: observacion.trim(), detalles: detalles.map(({ productoId, presentacionId, cantidad, costoUnitario, importeTotal }) => ({ productoId, presentacionId, cantidad, costoUnitario, importeTotal })) };
    setGuardando(true);
    try {
      await servicioEntradasStock.crear(datos);
      setModalAbierto(false); setPagina(1); await cargarPagina(1, porPagina, busqueda);
      alGuardarse?.();
    } catch (problema) { manejarError(problema, "No se pudo registrar la compra."); }
    finally { setGuardando(false); }
  }
  function cambiarPorPagina(cantidad: number) { if ([4, 6, 8, 10].includes(cantidad)) { setPorPagina(cantidad); setPagina(1); } }

  const totalBorrador = useMemo(() => detalles.reduce((total, fila) => total + Number(fila.importeTotal), 0), [detalles]);
  return {
    entradas: paginaDatos.items, total: paginaDatos.total, pagina, porPagina, totalPaginas: paginaDatos.totalPaginas,
    desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, paginaDatos.total),
    cargando, error, setError, busqueda, setBusqueda, cambiarPagina: setPagina, cambiarPorPagina,
    modalAbierto, abrirNuevo, cerrarModal: () => { if (!guardando) setModalAbierto(false); }, guardando,
    fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento, proveedor, setProveedor, medioPago, setMedioPago, cuentaFinancieraId, setCuentaFinancieraId, observacion, setObservacion,
    proveedorTipoPersona, setProveedorTipoPersona,
    proveedorTipoDocumento, setProveedorTipoDocumento,
    proveedorNumeroDocumento, setProveedorNumeroDocumento, proveedorDireccion, setProveedorDireccion,
    proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, creandoProveedor, setDatosProveedorEditables, buscarProveedor, abrirRegistroProveedor, crearProveedor, seleccionarProveedor,
    productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos, productoElegido,
    seleccionarProductoCompra, limpiarProductoElegido, cantidadProducto, setCantidadProducto, costoProducto, setCostoProducto,
    detalles, setDetalles, totalBorrador, pagosCompra, setPagosCompra, agregarPagoCompra: () => setPagosCompra((actuales) => [...actuales, { clave: claveLocal(), cuentaFinancieraId: "", medioPago: "", importe: "" }]), quitarPagoCompra: (clave: string) => setPagosCompra((actuales) => actuales.filter((pago) => pago.clave !== clave)), agregarDetalle, quitarDetalle: (clave: string) => setDetalles((actuales) => actuales.filter((fila) => fila.clave !== clave)), guardar,
    entradaDetalle, cerrarDetalle: () => setEntradaDetalle(null), abrirProductoDetalle, cargandoDetalle,
  };
}
