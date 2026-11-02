import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { servicioEntradasStock, type DatosEntradaStock, type EntradaStock, type LineaDocumentoCompra, type ProductoParaCompra } from "../services/inventario/entradas-stock.service";

type DetalleBorrador = { clave: string; productoId: string; presentacionId: string; detalleDocumentoId: string | null; codigo: string; nombre: string; presentacion: string; unidad: string; cantidad: string; costoUnitario: string; factor: number };
type DocumentoBorrador = LineaDocumentoCompra & { clave: string };
const claveLocal = () => globalThis.crypto?.randomUUID?.() ?? `linea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fechaHoy = () => { const ahora = new Date(); return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`; };

export function useEntradasStock() {
  const navegar = useNavigate();
  const [paginaDatos, setPaginaDatos] = useState({ items: [] as EntradaStock[], total: 0, totalPaginas: 1 });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
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
  const [proveedoresEncontrados, setProveedoresEncontrados] = useState<EntradaStock[]>([]);
  const [buscandoProveedores, setBuscandoProveedores] = useState(false);
  const [proveedorNoEncontrado, setProveedorNoEncontrado] = useState(false);
  const [datosProveedorEditables, setDatosProveedorEditables] = useState(false);
  const [medioPago, setMedioPago] = useState("");
  const [montoPagado, setMontoPagado] = useState("0.00");
  const [totalDocumento, setTotalDocumento] = useState("");
  const [observacion, setObservacion] = useState("");
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoParaCompra[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoElegido, setProductoElegido] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("1");
  const [costoProducto, setCostoProducto] = useState("");
  const [detalles, setDetalles] = useState<DetalleBorrador[]>([]);
  const [detallesDocumento, setDetallesDocumento] = useState<DocumentoBorrador[]>([]);
  const [lineaDocumentoPendiente, setLineaDocumentoPendiente] = useState<string | null>(null);
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
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
    setProductoElegido(producto.presentacionId);
    setProductoBusqueda(`${producto.nombre} · ${producto.presentacion}`);
    setProductosEncontrados((actuales) => actuales.length ? actuales : [producto]);
    setError("");
  }

  function limpiarProductoElegido() {
    setProductoElegido(""); setProductoBusqueda(""); setProductosEncontrados([]); setCantidadProducto("1"); setCostoProducto("");
  }

  function seleccionarEvidencia(archivo: File) {
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 15 * 1024 * 1024) {
      setError("Adjunta un PDF o una imagen JPG, PNG o WebP de máximo 15 MB."); return;
    }
    setError(""); setArchivoEvidencia(archivo);
  }

  async function buscarProveedor() {
    const numero = proveedorNumeroDocumento.trim();
    const requerido = proveedorTipoDocumento === "DNI" ? 8 : proveedorTipoDocumento === "RUC" ? 11 : 1;
    if (numero.length < requerido || (proveedorTipoDocumento !== "EXT" && numero.length !== requerido)) {
      setError(proveedorTipoDocumento === "DNI" ? "Ingresa los 8 dígitos del DNI para buscar al proveedor." : proveedorTipoDocumento === "RUC" ? "Ingresa los 11 dígitos del RUC para buscar al proveedor." : "Ingresa el documento extranjero para buscar al proveedor.");
      setProveedoresEncontrados([]); setProveedorNoEncontrado(false); return;
    }
    setError(""); setBuscandoProveedores(true); setProveedoresEncontrados([]); setProveedorNoEncontrado(false);
    try {
      const paginaProveedores = await servicioEntradasStock.listar(1, 20, numero);
      const coincidencias = paginaProveedores.items.filter((entrada) => entrada.proveedorTipoDocumento === proveedorTipoDocumento && entrada.proveedorNumeroDocumento === numero);
      const unicos = [...new Map(coincidencias.map((entrada) => [`${entrada.proveedorTipoDocumento}:${entrada.proveedorNumeroDocumento}`, entrada])).values()];
      setProveedoresEncontrados(unicos);
      setProveedorNoEncontrado(unicos.length === 0);
    } catch (problema) { manejarError(problema, "No se pudo buscar el proveedor en compras anteriores."); }
    finally { setBuscandoProveedores(false); }
  }

  function seleccionarProveedor(entrada: EntradaStock) {
    setProveedor(entrada.proveedor ?? "");
    setProveedorTipoPersona(entrada.proveedorTipoPersona ?? "");
    setProveedorTipoDocumento(entrada.proveedorTipoDocumento ?? "RUC");
    setProveedorNumeroDocumento(entrada.proveedorNumeroDocumento ?? "");
    setProveedorDireccion(entrada.proveedorDireccion ?? "");
    setDatosProveedorEditables(true);
    setProveedoresEncontrados([]); setProveedorNoEncontrado(false); setError("");
  }

  function actualizarDetalleDocumento(clave: string, campo: keyof LineaDocumentoCompra, valor: string) {
    setDetallesDocumento((actuales) => actuales.map((fila) => {
      if (fila.clave !== clave) return fila;
      const siguiente = { ...fila, [campo]: valor };
      if (["cantidad", "costoUnitario", "descuento"].includes(campo)) {
        const subtotal = Math.max(0, (Number(siguiente.cantidad) || 0) * (Number(siguiente.costoUnitario) || 0) - (Number(siguiente.descuento) || 0));
        siguiente.subtotal = subtotal.toFixed(2);
        siguiente.total = subtotal.toFixed(2);
      }
      return siguiente;
    }));
  }

  function agregarDetalleDocumento() {
    setDetallesDocumento((actuales) => [...actuales, { clave: claveLocal(), codigo: "", descripcion: "", unidad: "", cantidad: "1", costoUnitario: "0", descuento: "0", subtotal: "0.00", total: "0.00" }]);
  }

  function prepararRecepcionDocumento(linea: DocumentoBorrador) {
    setLineaDocumentoPendiente(linea.clave);
    setProductoElegido(""); setProductosEncontrados([]); setProductoBusqueda(linea.descripcion);
    setCantidadProducto(linea.cantidad || "1"); setCostoProducto(linea.costoUnitario || "0"); setError("");
  }

  function abrirNuevo() {
    setError(""); setFecha(fechaHoy()); setTipoDocumento("FACTURA"); setNumeroDocumento(""); setProveedor(""); setProveedorTipoPersona(""); setProveedorTipoDocumento("RUC"); setProveedorNumeroDocumento(""); setProveedorDireccion(""); setProveedoresEncontrados([]); setBuscandoProveedores(false); setProveedorNoEncontrado(false); setDatosProveedorEditables(false); setMedioPago(""); setMontoPagado("0.00"); setTotalDocumento(""); setArchivoEvidencia(null); setObservacion("");
    setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(""); setCantidadProducto("1"); setCostoProducto(""); setDetalles([]); setDetallesDocumento([]); setLineaDocumentoPendiente(null); setModalAbierto(true);
  }
  function agregarDetalle() {
    const producto = productosEncontrados.find((fila) => fila.presentacionId === productoElegido);
    const cantidad = Number(cantidadProducto);
    const costo = Number(costoProducto);
    if (!producto) { setError("Busca y selecciona un producto y su presentación de compra."); return; }
    if (!Number.isFinite(cantidad) || cantidad <= 0 || !costoProducto.trim() || !Number.isFinite(costo) || costo < 0) { setError("Revisa la cantidad y el costo unitario ingresados."); return; }
    if (detalles.some((fila) => fila.productoId === producto.productoId && fila.presentacionId === producto.presentacionId)) { setError("Ese producto y presentación ya están en la entrada. Actualiza su cantidad en la línea existente."); return; }
    setDetalles((actuales) => [...actuales, { clave: claveLocal(), productoId: producto.productoId, presentacionId: producto.presentacionId, detalleDocumentoId: lineaDocumentoPendiente, codigo: producto.codigoInterno, nombre: producto.nombre, presentacion: producto.presentacion, unidad: producto.unidadMedida, cantidad: cantidad.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""), costoUnitario: costo.toFixed(4), factor: Number(producto.factorAUnidadBase) }]);
    setError(""); setProductoBusqueda(""); setProductosEncontrados([]); setProductoElegido(""); setCantidadProducto("1"); setCostoProducto("");
    setLineaDocumentoPendiente(null);
  }
  function abrirProductoDetalle(id: string) {
    setCargandoDetalle(true); setError("");
    void servicioEntradasStock.consultar(id).then(setEntradaDetalle).catch((problema) => manejarError(problema, "No se pudo cargar el detalle de la entrada.")).finally(() => setCargandoDetalle(false));
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    if (!detalles.length && !detallesDocumento.length) { setError("Agrega líneas del comprobante o productos recibidos en el inventario."); return; }
    const pago = Number(montoPagado);
    const totalDocumentoCalculado = totalDocumento.trim() ? Number(totalDocumento) : detallesDocumento.length ? detallesDocumento.reduce((suma, fila) => suma + (Number(fila.total) || 0), 0) : totalBorrador;
    if (!Number.isFinite(pago) || pago < 0 || Number(pago.toFixed(2)) !== pago || pago > totalDocumentoCalculado) { setError("El monto abonado debe ser válido y no puede superar el total de la compra."); return; }
    if (pago > 0 && !medioPago) { setError("Selecciona el medio de pago del abono."); return; }
    const datos: DatosEntradaStock = { fecha, tipoDocumento, numeroDocumento: numeroDocumento.trim(), proveedor: proveedor.trim(), proveedorTipoPersona, proveedorTipoDocumento, proveedorNumeroDocumento: proveedorNumeroDocumento.trim(), proveedorDireccion: proveedorDireccion.trim(), medioPago: medioPago || null, montoPagado: pago.toFixed(2), totalDocumento: totalDocumento.trim() || detallesDocumento.length ? totalDocumentoCalculado.toFixed(2) : null, detallesDocumento, observacion: observacion.trim(), detalles: detalles.map(({ productoId, presentacionId, detalleDocumentoId, cantidad, costoUnitario }) => ({ productoId, presentacionId, detalleDocumentoId, cantidad, costoUnitario })) };
    setGuardando(true);
    try {
      const creada = await servicioEntradasStock.crear(datos);
      let avisoEvidencia = "";
      if (archivoEvidencia) {
        try { await servicioEntradasStock.subirEvidencia(creada.id, archivoEvidencia); }
        catch (problema) { avisoEvidencia = `La compra ${creada.codigo} se registró, pero no se pudo subir la evidencia: ${problema instanceof Error ? problema.message : "intenta adjuntarla de nuevo."}`; }
      }
      setModalAbierto(false); setPagina(1); await cargarPagina(1, porPagina, busqueda);
      if (avisoEvidencia) setError(avisoEvidencia);
    } catch (problema) { manejarError(problema, "No se pudo registrar la compra."); }
    finally { setGuardando(false); }
  }
  function cambiarPorPagina(cantidad: number) { if ([12, 16, 20].includes(cantidad)) { setPorPagina(cantidad); setPagina(1); } }

  const totalBorrador = useMemo(() => detalles.reduce((total, fila) => total + Number(fila.cantidad) * Number(fila.costoUnitario), 0), [detalles]);
  const totalDocumentoBorrador = useMemo(() => totalDocumento.trim() ? Number(totalDocumento) || 0 : detallesDocumento.reduce((total, fila) => total + (Number(fila.total) || 0), 0), [totalDocumento, detallesDocumento]);
  return {
    entradas: paginaDatos.items, total: paginaDatos.total, pagina, porPagina, totalPaginas: paginaDatos.totalPaginas,
    desde: paginaDatos.total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, paginaDatos.total),
    cargando, error, setError, busqueda, setBusqueda, cambiarPagina: setPagina, cambiarPorPagina,
    modalAbierto, abrirNuevo, cerrarModal: () => { if (!guardando) setModalAbierto(false); }, guardando,
    fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento, proveedor, setProveedor, medioPago, setMedioPago, montoPagado, setMontoPagado, totalDocumento, setTotalDocumento, totalDocumentoBorrador,
    proveedorTipoPersona, setProveedorTipoPersona,
    proveedorTipoDocumento, setProveedorTipoDocumento,
    proveedorNumeroDocumento, setProveedorNumeroDocumento, proveedorDireccion, setProveedorDireccion,
    proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, setDatosProveedorEditables, buscarProveedor, seleccionarProveedor,
    observacion, setObservacion,
    productoBusqueda, cambiarBusquedaProducto, productosEncontrados, buscandoProductos, productoElegido,
    seleccionarProductoCompra, limpiarProductoElegido, cantidadProducto, setCantidadProducto, costoProducto, setCostoProducto,
    detalles, setDetalles, totalBorrador, detallesDocumento, actualizarDetalleDocumento, agregarDetalleDocumento, prepararRecepcionDocumento, archivoEvidencia, seleccionarEvidencia, agregarDetalle, quitarDetalle: (clave: string) => setDetalles((actuales) => actuales.filter((fila) => fila.clave !== clave)), quitarDetalleDocumento: (clave: string) => setDetallesDocumento((actuales) => actuales.filter((fila) => fila.clave !== clave)), guardar,
    entradaDetalle, cerrarDetalle: () => setEntradaDetalle(null), abrirProductoDetalle, cargandoDetalle,
  };
}
