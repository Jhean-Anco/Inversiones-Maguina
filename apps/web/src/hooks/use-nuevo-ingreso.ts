import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { servicioIngresos, type DatosNuevoIngreso, type EstadoNubefact, type IngresoCreado, type MototaxiParaIngreso, type ProductoParaIngreso } from "../services/ingresos.service";
import { igvIncluido, importeLinea, precioRepuestoEnLinea } from "../domain/ingresos/importes-venta";
import { validarNuevoIngreso } from "../domain/ingresos/validar-nuevo-ingreso";
import type { LineaCarrito, TipoVenta } from "../types/nuevo-ingreso";
import { useNuevoIngresoClientes } from "./use-nuevo-ingreso-clientes";
import { mapearLineasIngresoDocumento } from "./mapear-lineas-ingreso-documento";
import { useCatalogoRecientes, type CatalogoReciente } from "../components/catalogo/use-catalogo-recientes";

type ValorNubefact = string | number | boolean | null;

const fechaHoy = () => { const ahora = new Date(); return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const sumarDiasFecha = (fecha: string, dias: number) => { const resultado = new Date(`${fecha}T00:00:00.000Z`); resultado.setUTCDate(resultado.getUTCDate() + dias); return resultado.toISOString().slice(0, 10); };
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const nuevoUuid = () => globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (caracter) => { const aleatorio = Math.random() * 16 | 0; return (caracter === "x" ? aleatorio : (aleatorio & 3 | 8)).toString(16); });
const nuevaClaveIdempotencia = nuevoUuid;
export function useNuevoIngreso(tipoVenta: TipoVenta = "REPUESTOS") {
  const navegar = useNavigate();
  const claveIdempotencia = useRef<string>(nuevaClaveIdempotencia());
  const [busqueda, setBusqueda] = useState(""); const [resultados, setResultados] = useState<ProductoParaIngreso[]>([]);
  const catalogoRecienteRepuestos = useCatalogoRecientes("repuestos", "magina:ingresos:productos-recientes:v1");
  const catalogoRecienteMototaxis = useCatalogoRecientes("mototaxis-venta");
  const [buscando, setBuscando] = useState(false); const [lineas, setLineas] = useState<LineaCarrito[]>([]);
  const [busquedaMototaxi, setBusquedaMototaxi] = useState(""); const [resultadosMototaxi, setResultadosMototaxi] = useState<MototaxiParaIngreso[]>([]); const [buscandoMototaxis, setBuscandoMototaxis] = useState(false);
  const [medioPago, setMedioPago] = useState("EFECTIVO"); const [fecha, setFecha] = useState(fechaHoy()); const [observacion, setObservacion] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<"BOLETA" | "FACTURA" | "NOTA_VENTA">("BOLETA");
  const [condicionPago, setCondicionPago] = useState<"CONTADO" | "CREDITO">("CONTADO"); const [fechaVencimientoPago, setFechaVencimientoPago] = useState(sumarDiasFecha(fechaHoy(), 15));
  const [ordenServicioId, setOrdenServicioId] = useState<string | null>(null);
  const [cotizacionId, setCotizacionId] = useState<string | null>(null);
  const [importePagoInicial, setImportePagoInicial] = useState("");
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState(""); const [exito, setExito] = useState<IngresoCreado | null>(null);
  const [estadoNubefact, setEstadoNubefact] = useState<EstadoNubefact | null>(null);
  const [camposNubefact, setCamposNubefact] = useState<Record<string, ValorNubefact>>({ cliente_tipo_de_documento: "0", cliente_numero_de_documento: "", cliente_denominacion: "", cliente_direccion: "" });
  const [cuotasNubefact, setCuotasNubefact] = useState<{ cuota: string; fecha_de_pago: string; importe: string }[]>([{ cuota: "1", fecha_de_pago: sumarDiasFecha(fechaHoy(), 15), importe: "" }]);
  const consulta = useRef(0);
  const consultaMototaxis = useRef(0);

  useEffect(() => { void servicioIngresos.estadoNubefact().then(setEstadoNubefact).catch(() => setEstadoNubefact(null)); }, []);


  useEffect(() => {
    const texto = busqueda.trim(); const actual = ++consulta.current;
    if (texto.length < 4) { setResultados([]); setBuscando(false); return; }
    setResultados([]);
    setBuscando(true);
    const espera = window.setTimeout(() => { void servicioIngresos.buscarProductos(texto, false, false, true).then((data) => { if (actual === consulta.current) setResultados(data); })
      .catch((problema) => { if (actual === consulta.current) setError(problema instanceof Error ? problema.message : "No se pudieron buscar productos."); })
      .finally(() => { if (actual === consulta.current) setBuscando(false); }); }, 220);
    return () => window.clearTimeout(espera);
  }, [busqueda]);

  useEffect(() => {
    const texto = busquedaMototaxi.trim(); const actual = ++consultaMototaxis.current;
    if (tipoVenta !== "MOTOTAXIS" || texto.length < 4) { setResultadosMototaxi([]); setBuscandoMototaxis(false); return; }
    setResultadosMototaxi([]); setBuscandoMototaxis(true);
    const espera = window.setTimeout(() => { void servicioIngresos.buscarMototaxis(texto)
      .then((data) => { if (actual === consultaMototaxis.current) setResultadosMototaxi(data); })
      .catch((problema) => { if (actual === consultaMototaxis.current) setError(problema instanceof Error ? problema.message : "No se pudieron buscar mototaxis."); })
      .finally(() => { if (actual === consultaMototaxis.current) setBuscandoMototaxis(false); }); }, 220);
    return () => window.clearTimeout(espera);
  }, [busquedaMototaxi, tipoVenta]);

  function agregarProducto(producto: ProductoParaIngreso) {
    if (tipoVenta !== "REPUESTOS") return;
    if (lineas.some((linea) => linea.tipo === "SERVICIO" && (!linea.descripcion.trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || !Number.isFinite(Number(linea.precio)) || Number(linea.precio) < 0))) { setError("Completa el servicio actual antes de agregar otro ítem."); return; }
    const disponibles = producto.tramos;
    const listaPrecioCodigo = disponibles?.find((tramo) => tramo.listaCodigo === "GENERAL")?.listaCodigo ?? disponibles?.[0]?.listaCodigo;
    if (!listaPrecioCodigo && !producto.precio) { setError("Configura el precio de venta del repuesto desde Inventarios."); return; }
    catalogoRecienteRepuestos.registrar({ id: producto.presentacionId, nombre: producto.nombre, codigo: producto.codigo, detalle: producto.presentacion });
    const existente = lineas.find((linea) => linea.tipo === "PRODUCTO" && linea.producto.presentacionId === producto.presentacionId);
    const clave = existente?.clave ?? nuevoUuid();
    setLineas((actuales) => {
      const existente = actuales.find((linea) => linea.tipo === "PRODUCTO" && linea.producto.presentacionId === producto.presentacionId);
      if (existente) return actuales.map((linea) => linea === existente && linea.tipo === "PRODUCTO" ? { ...linea, producto, listaPrecioCodigo: linea.listaPrecioCodigo ?? listaPrecioCodigo, cantidad: String(Number(linea.cantidad) + 1) } : linea);
      return [...actuales, { clave, tipo: "PRODUCTO", producto, listaPrecioCodigo, cantidad: "1", descuento: "0.00", afectacionIgv: producto.afectacionIgv }];
    });
    setBusqueda(""); setResultados([]); setError("");
  }
  async function agregarProductoReciente(reciente: CatalogoReciente) {
    setBuscando(true);
    setError("");
    try {
      const productosActuales = await servicioIngresos.buscarProductos(reciente.codigo, false, false, true);
      const producto = productosActuales.find((item) => item.presentacionId === reciente.id);
      if (!producto) { setError("Ese repuesto ya no aparece en el catálogo. Búscalo nuevamente para actualizar sus datos."); return; }
      agregarProducto(producto);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo actualizar el repuesto reciente.");
    } finally { setBuscando(false); }
  }
  function agregarMototaxi(mototaxi: MototaxiParaIngreso) {
    if (tipoVenta !== "MOTOTAXIS") return;
    if (mototaxi.precioVenta == null) { setError("Configura el precio de venta de este modelo desde Inventarios."); return; }
    if (mototaxi.stockDisponible < 1) { setError("Este modelo está sin existencias."); return; }
    const existente = lineas.find((linea) => linea.tipo === "MOTOTAXI" && linea.mototaxi.mototaxiModeloId === mototaxi.mototaxiModeloId);
    const cantidad = Number(existente?.cantidad ?? 0) + 1;
    if (cantidad > mototaxi.stockDisponible) { setError("La cantidad supera el saldo disponible del modelo."); return; }
    catalogoRecienteMototaxis.registrar({ id: mototaxi.mototaxiModeloId, nombre: [mototaxi.marca, mototaxi.modelo, mototaxi.version].filter(Boolean).join(" "), codigo: mototaxi.codigo, detalle: `${mototaxi.stockDisponible} disponibles` });
    setLineas((actuales) => existente
      ? actuales.map((linea) => linea.clave === existente.clave && linea.tipo === "MOTOTAXI" ? { ...linea, mototaxi, cantidad: String(cantidad), precio: mototaxi.precioVenta! } : linea)
      : [...actuales, { clave: nuevoUuid(), tipo: "MOTOTAXI", mototaxi, cantidad: "1", precio: mototaxi.precioVenta!, descuento: "0.00", afectacionIgv: "GRAVADO" }]);
  }
  async function agregarMototaxiReciente(reciente: CatalogoReciente) {
    setBuscandoMototaxis(true);
    setError("");
    try {
      const resultadosActuales = await servicioIngresos.buscarMototaxis(reciente.codigo);
      const mototaxi = resultadosActuales.find((item) => item.mototaxiModeloId === reciente.id);
      if (!mototaxi) { setError("Este modelo ya no está disponible. Búscala nuevamente para actualizar su estado."); return; }
      agregarMototaxi(mototaxi);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo actualizar la mototaxi reciente.");
    } finally { setBuscandoMototaxis(false); }
  }
  function agregarServicio() { if (tipoVenta !== "REPUESTOS") return; if (lineas.some((linea) => linea.tipo === "SERVICIO" && (!linea.descripcion.trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || !Number.isFinite(Number(linea.precio)) || Number(linea.precio) < 0))) { setError("Completa el servicio actual antes de agregar otro."); return; } const clave = nuevoUuid(); setLineas((actuales) => [...actuales, { clave, tipo: "SERVICIO", descripcion: "", cantidad: "1", precio: "0.00", descuento: "0.00", afectacionIgv: "GRAVADO" }]); }
  function actualizarLinea(clave: string, cambios: Partial<LineaCarrito>) { setLineas((actuales) => actuales.map((linea) => linea.clave === clave ? { ...linea, ...cambios } as LineaCarrito : linea)); }
  async function cargarOrdenServicio(datos: { id: string; codigo: string; clienteId: string; clienteNombre: string; motivo: string; adelantoMedioPago: string | null; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; detalles: Record<string, unknown>[] }) {
    setOrdenServicioId(datos.id);
    claveIdempotencia.current = datos.id;
    setError(""); setExito(null); setTipoComprobante(datos.tipoComprobante); setCondicionPago("CONTADO"); setImportePagoInicial(""); setFecha(fechaHoy());
    if (datos.adelantoMedioPago) setMedioPago(datos.adelantoMedioPago);
    const clientesEncontrados = await servicioIngresos.buscarClientes(datos.clienteNombre);
    const cliente = clientesEncontrados.find((item) => item.id === datos.clienteId);
    if (!cliente) throw new Error("No se pudo cargar el cliente asociado a la orden. Búscalo nuevamente en la venta.");
    clientes.seleccionarCliente(cliente);
    if (datos.tipoComprobante === "FACTURA") {
      const documentoRuc = cliente.documentos?.find((item) => item.tipoDocumento === "06") ?? (cliente.tipoDocumento === "06" ? { tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento } : null);
      if (documentoRuc) { actualizarCampoNubefact("cliente_tipo_de_documento", "6"); actualizarCampoNubefact("cliente_numero_de_documento", documentoRuc.numeroDocumento); }
    }
    const lineasImportadas = await mapearLineasIngresoDocumento(datos.detalles, "orden");
    setLineas(lineasImportadas);
    setObservacion(`Orden de servicio ${datos.codigo}. ${datos.motivo}`.trim());
    setBusqueda(""); setResultados([]);
  }
  function actualizarCampoNubefact(clave: string, valor: ValorNubefact) { setCamposNubefact((actuales) => ({ ...actuales, [clave]: valor })); }
  const clientes = useNuevoIngresoClientes({ actualizarCampoNubefact, setError });
  function reiniciarIdempotencia() { claveIdempotencia.current = ordenServicioId ?? nuevaClaveIdempotencia(); }
  function quitarLinea(clave: string) { setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave)); }
  async function cargarCotizacion(datos: { id: string; codigo: string; clienteId: string | null; clienteNombre: string | null; observacion: string | null; tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA"; detalles: Record<string, unknown>[] }) {
    setCotizacionId(datos.id); setOrdenServicioId(null); claveIdempotencia.current = nuevaClaveIdempotencia();
    setError(""); setExito(null); setTipoComprobante(datos.tipoComprobante); setCondicionPago("CONTADO"); setImportePagoInicial(""); setFecha(fechaHoy());
    if (datos.clienteId) {
      const clientesEncontrados = await servicioIngresos.buscarClientes(datos.clienteNombre ?? "");
      const cliente = clientesEncontrados.find((item) => item.id === datos.clienteId);
      if (!cliente) throw new Error("No se pudo cargar el cliente de la cotización. Búscalo nuevamente en la venta.");
      clientes.seleccionarCliente(cliente);
      if (datos.tipoComprobante === "FACTURA") {
        const ruc = cliente.documentos?.find((item) => item.tipoDocumento === "06") ?? (cliente.tipoDocumento === "06" ? { tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento } : null);
        if (ruc) { actualizarCampoNubefact("cliente_tipo_de_documento", "6"); actualizarCampoNubefact("cliente_numero_de_documento", ruc.numeroDocumento); }
      }
    } else clientes.quitarCliente();
    const lineasImportadas = await mapearLineasIngresoDocumento(datos.detalles, "cotización");
    setLineas(lineasImportadas);
    setObservacion([`Cotización ${datos.codigo}`, datos.observacion].filter(Boolean).join(" · "));
    setBusqueda(""); setResultados([]);
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError(""); setExito(null);
    const validacion = validarNuevoIngreso({ tipoVenta, tipoComprobante, estadoNubefact, fecha, hoy: fechaHoy(), clienteSeleccionado: Boolean(clientes.clienteSeleccionado), camposNubefact, total: totales.total, ordenServicioId, lineas });
    if (!validacion.valida) { setError(validacion.error); return null; }
    const datos: DatosNuevoIngreso = { idempotencyKey: claveIdempotencia.current, fecha, tipoComprobante, ordenServicioId: ordenServicioId ?? undefined, cotizacionId: cotizacionId ?? undefined, clienteId: clientes.clienteSeleccionado?.id, clienteDireccion: String(camposNubefact.cliente_direccion || "") || undefined, clienteTipoDocumento: validacion.tipoDocInterno, clienteNumeroDocumento: String(camposNubefact.cliente_numero_de_documento || "") || undefined, clienteNombre: clientes.clienteSeleccionado ? String(camposNubefact.cliente_denominacion || "") || undefined : tipoComprobante === "BOLETA" ? "CLIENTES VARIOS" : undefined, medioPago, condicionPago: "CONTADO", importePagoInicial: "0.00", cuotasPago: [], observacion: observacion.trim() || undefined, detalles: validacion.detalles };
    setGuardando(true);
    try { const creado = await servicioIngresos.crear(datos); setExito(creado); return creado; }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo guardar el ingreso."); }
    finally { setGuardando(false); }
    return null;
  }
  const totales = lineas.reduce((suma, linea) => {
    const cantidad = Number(linea.cantidad) || 0; const precio = linea.tipo === "PRODUCTO" ? Number(precioRepuestoEnLinea(linea)) : Number(linea.precio) || 0;
    const totalLinea = importeLinea(cantidad, precio, Number(linea.descuento) || 0);
    suma.total = redondear(suma.total + totalLinea);
    const clave = linea.afectacionIgv === "GRAVADO" ? "gravada" : linea.afectacionIgv === "EXONERADO" ? "exonerada" : "inafecta";
    const igvLinea = tipoComprobante !== "NOTA_VENTA" && estadoNubefact?.regimenTributario !== "NRUS" && clave === "gravada" ? igvIncluido(totalLinea) : 0;
    suma.igv = redondear(suma.igv + igvLinea);
    suma[clave] = redondear(suma[clave] + totalLinea - igvLinea);
    return suma;
  }, { total: 0, igv: 0, gravada: 0, exonerada: 0, inafecta: 0 });
  function actualizarCuotaCredito(indice: number, campo: "fecha_de_pago" | "importe", valor: string) {
    setCuotasNubefact((actuales) => actuales.map((cuota, i) => i === indice ? { ...cuota, [campo]: valor } : cuota));
    if (campo === "fecha_de_pago" && indice === cuotasNubefact.length - 1) setFechaVencimientoPago(valor);
  }
  function agregarCuotaCredito(saldoCreditoEsperado = totales.total) {
    const cantidad = cuotasNubefact.length + 1;
    const totalCentimos = Math.round(saldoCreditoEsperado * 100);
    const cuotaBase = Math.floor(totalCentimos / cantidad);
    const ultimaFecha = cuotasNubefact.at(-1)?.fecha_de_pago || fechaVencimientoPago || fecha;
    const fechas = [...cuotasNubefact.map((cuota) => cuota.fecha_de_pago), sumarDiasFecha(ultimaFecha, 30)];
    const siguiente = fechas.map((fechaDePago, indice) => ({ cuota: String(indice + 1), fecha_de_pago: fechaDePago, importe: ((cuotaBase + (indice < totalCentimos % cantidad ? 1 : 0)) / 100).toFixed(2) }));
    setCuotasNubefact(siguiente);
    setFechaVencimientoPago(siguiente.at(-1)!.fecha_de_pago);
  }
  function quitarCuotaCredito(indice: number) {
    const siguiente = cuotasNubefact.filter((_, i) => i !== indice).map((cuota, i) => ({ ...cuota, cuota: String(i + 1) }));
    if (!siguiente.length) return;
    setCuotasNubefact(siguiente);
    setFechaVencimientoPago(siguiente.at(-1)!.fecha_de_pago);
  }
  const fechaMinimaComprobante = sumarDiasFecha(fechaHoy(), tipoComprobante === "FACTURA" ? -3 : -5);
  return { busqueda, setBusqueda, resultados, buscando, productosRecientes: catalogoRecienteRepuestos.recientes, agregarProductoReciente, lineas, agregarProducto, busquedaMototaxi, setBusquedaMototaxi, resultadosMototaxi, buscandoMototaxis, mototaxisRecientes: catalogoRecienteMototaxis.recientes, agregarMototaxi, agregarMototaxiReciente, agregarServicio, actualizarLinea, quitarLinea, cargarOrdenServicio, cargarCotizacion, tipoComprobante, setTipoComprobante, medioPago, setMedioPago, condicionPago, setCondicionPago, importePagoInicial, setImportePagoInicial, fechaVencimientoPago, setFechaVencimientoPago, fecha, setFecha, fechaMinimaComprobante, observacion, setObservacion, guardando, error, setError, exito, setExito, guardar, totales, camposNubefact, actualizarCampoNubefact, reiniciarIdempotencia, cuotasNubefact, setCuotasNubefact, actualizarCuotaCredito, agregarCuotaCredito, quitarCuotaCredito, ...clientes, estadoNubefact };
}
