import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { servicioIngresos, type ClienteRegistrado, type ControlNrus, type DatosClienteNuevo, type DatosNuevoIngreso, type EstadoNubefact, type IngresoCreado, type LineaIngreso, type ProductoParaIngreso } from "../services/ingresos.service";

type ValorNubefact = string | number | boolean | null;

type AfectacionIgv = "GRAVADO" | "EXONERADO" | "INAFECTO";
type LineaCarrito = { clave: string; tipo: "PRODUCTO"; producto: ProductoParaIngreso; cantidad: string; descuento: string } | { clave: string; tipo: "SERVICIO"; descripcion: string; cantidad: string; precio: string; descuento: string; afectacionIgv: AfectacionIgv };
const fechaHoy = () => { const ahora = new Date(); return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const sumarDiasFecha = (fecha: string, dias: number) => { const resultado = new Date(`${fecha}T00:00:00.000Z`); resultado.setUTCDate(resultado.getUTCDate() + dias); return resultado.toISOString().slice(0, 10); };
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const nuevoUuid = () => globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (caracter) => { const aleatorio = Math.random() * 16 | 0; return (caracter === "x" ? aleatorio : (aleatorio & 3 | 8)).toString(16); });
const nuevaClaveIdempotencia = nuevoUuid;
const claveCacheProductosRecientes = "magina:ingresos:productos-recientes:v1";
function leerProductosRecientes(): ProductoParaIngreso[] {
  try {
    const datos: unknown = JSON.parse(window.localStorage.getItem(claveCacheProductosRecientes) ?? "[]");
    if (!Array.isArray(datos)) return [];
    const normalizados = datos.map((item: unknown) => {
      if (typeof item !== "object" || item === null) return item;
      const producto = item as Record<string, unknown>;
      return { ...producto };
    });
    return normalizados.filter((item: unknown): item is ProductoParaIngreso => {
      if (typeof item !== "object" || item === null) return false;
      const producto = item as Record<string, unknown>;
      const camposTexto = ["productoId", "codigo", "nombre", "marca", "presentacionId", "presentacion", "unidadCodigo", "unidad", "factorAUnidadBase", "precio", "stockBase", "listaPrecioCodigo", "listaPrecioNombre"];
      return camposTexto.every((campo) => typeof producto[campo] === "string") && typeof producto.afectoIgv === "boolean" && ["GRAVADO", "EXONERADO", "INAFECTO"].includes(String(producto.afectacionIgv)) && (typeof producto.rutaImagen === "string" || producto.rutaImagen === null);
    }).slice(0, 8);
  } catch { return []; }
}


export function useNuevoIngreso() {
  const navegar = useNavigate();
  const claveIdempotencia = useRef(nuevaClaveIdempotencia());
  const [busqueda, setBusqueda] = useState(""); const [resultados, setResultados] = useState<ProductoParaIngreso[]>([]);
  const [productosRecientes, setProductosRecientes] = useState<ProductoParaIngreso[]>(leerProductosRecientes);
  const productosRecientesRef = useRef(productosRecientes);
  const [buscando, setBuscando] = useState(false); const [lineas, setLineas] = useState<LineaCarrito[]>([]);
  const [busquedaCliente, cambiarBusquedaCliente] = useState(""); const [clientesEncontrados, setClientesEncontrados] = useState<ClienteRegistrado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteRegistrado | null>(null); const [buscandoClientes, setBuscandoClientes] = useState(false); const [registrandoCliente, setRegistrandoCliente] = useState(false);
  const [medioPago, setMedioPago] = useState("EFECTIVO"); const [fecha, setFecha] = useState(fechaHoy()); const [observacion, setObservacion] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<"BOLETA" | "NOTA_VENTA">("BOLETA");
  const [condicionPago, setCondicionPago] = useState<"CONTADO" | "CREDITO">("CONTADO"); const [fechaVencimientoPago, setFechaVencimientoPago] = useState(sumarDiasFecha(fechaHoy(), 15));
  const [importePagoInicial, setImportePagoInicial] = useState("");
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState(""); const [exito, setExito] = useState<IngresoCreado | null>(null);
  const [estadoNubefact, setEstadoNubefact] = useState<EstadoNubefact | null>(null);
  const [controlNrus, setControlNrus] = useState<ControlNrus | null>(null);
  const [camposNubefact, setCamposNubefact] = useState<Record<string, ValorNubefact>>({ cliente_tipo_de_documento: "0", cliente_numero_de_documento: "", cliente_denominacion: "", cliente_direccion: "" });
  const [cuotasNubefact, setCuotasNubefact] = useState<{ cuota: string; fecha_de_pago: string; importe: string }[]>([{ cuota: "1", fecha_de_pago: sumarDiasFecha(fechaHoy(), 15), importe: "" }]);
  const consulta = useRef(0);
  const consultaClientes = useRef(0);

  useEffect(() => { void servicioIngresos.estadoNubefact().then(setEstadoNubefact).catch(() => setEstadoNubefact(null)); }, []);

  useEffect(() => {
    let vigente = true;
    void servicioIngresos.controlNrus(fecha).then((control) => { if (vigente) setControlNrus(control); }).catch(() => { if (vigente) setControlNrus(null); });
    return () => { vigente = false; };
  }, [fecha, exito?.id]);


  useEffect(() => {
    const texto = busqueda.trim(); const actual = ++consulta.current;
    if (texto.length < 4) { setResultados([]); setBuscando(false); return; }
    setResultados([]);
    setBuscando(true);
    const espera = window.setTimeout(() => { void servicioIngresos.buscarProductos(texto).then((data) => { if (actual === consulta.current) setResultados(data); })
      .catch((problema) => { if (actual === consulta.current) setError(problema instanceof Error ? problema.message : "No se pudieron buscar productos."); })
      .finally(() => { if (actual === consulta.current) setBuscando(false); }); }, 220);
    return () => window.clearTimeout(espera);
  }, [busqueda]);

  function setBusquedaCliente(valor: string) {
    ++consultaClientes.current;
    cambiarBusquedaCliente(valor);
    setClientesEncontrados([]);
    setBuscandoClientes(false);
  }

  async function buscarClientes(tipoDocumento: "01" | "06") {
    const texto = busquedaCliente.trim();
    const longitudRequerida = tipoDocumento === "01" ? 8 : 11;
    if (!new RegExp(`^\\d{${longitudRequerida}}$`).test(texto) || clienteSeleccionado) return null;
    const actual = ++consultaClientes.current;
    setClientesEncontrados([]);
    setBuscandoClientes(true);
    setError("");
    try {
      const data = await servicioIngresos.buscarClientes(texto);
      if (actual !== consultaClientes.current) return null;
      const filtrados = data.filter((cliente) => {
        const documentos = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
        return documentos.some((documento) => documento.tipoDocumento === tipoDocumento && documento.numeroDocumento.includes(texto));
      });
      setClientesEncontrados(filtrados);
      return filtrados;
    } catch (problema) {
      if (actual === consultaClientes.current) setError(problema instanceof Error ? problema.message : "No se pudo buscar clientes.");
      return null;
    } finally {
      if (actual === consultaClientes.current) setBuscandoClientes(false);
    }
  }

  function seleccionarDocumentoCliente(documento: { tipoDocumento: string; numeroDocumento: string }) {
    const tipo = ({ "01": "1", "06": "6", "04": "4", "07": "7" } as Record<string, string>)[documento.tipoDocumento] ?? "0";
    actualizarCampoNubefact("cliente_tipo_de_documento", tipo); actualizarCampoNubefact("cliente_numero_de_documento", documento.numeroDocumento);
  }

  function seleccionarCliente(cliente: ClienteRegistrado) {
    setClienteSeleccionado(cliente); setBusquedaCliente(""); setClientesEncontrados([]);
    const nombre = cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
    const identificadores = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
    const preferido = identificadores.find((item) => item.tipoDocumento === "01") ?? identificadores[0];
    seleccionarDocumentoCliente(preferido);
    actualizarCampoNubefact("cliente_denominacion", nombre); actualizarCampoNubefact("cliente_direccion", cliente.direccion ?? "");
  }


  function actualizarClienteEnResultados(cliente: ClienteRegistrado) {
    setClientesEncontrados((actuales) => actuales.map((item) => item.id === cliente.id ? cliente : item));
    if (clienteSeleccionado?.id === cliente.id) seleccionarCliente(cliente);
  }

  async function guardarCliente(datos: DatosClienteNuevo) {
    setRegistrandoCliente(true); setError("");
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const encontrados = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const cliente = encontrados.find((item) => item.id === creado.id);
      if (!cliente) throw new Error("Cliente registrado, pero no se pudo cargar para esta venta. Búscalo por su documento.");
      seleccionarCliente(cliente);
      return true;
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el cliente."); return false; }
    finally { setRegistrandoCliente(false); }
  }

  function quitarCliente() {
    setClienteSeleccionado(null); setBusquedaCliente("");
    actualizarCampoNubefact("cliente_tipo_de_documento", "0");
    actualizarCampoNubefact("cliente_numero_de_documento", ""); actualizarCampoNubefact("cliente_denominacion", ""); actualizarCampoNubefact("cliente_direccion", "");
  }

  function agregarProducto(producto: ProductoParaIngreso) {
    const recientes = [producto, ...productosRecientesRef.current.filter((item) => item.presentacionId !== producto.presentacionId)].slice(0, 8);
    productosRecientesRef.current = recientes;
    setProductosRecientes(recientes);
    try { window.localStorage.setItem(claveCacheProductosRecientes, JSON.stringify(recientes)); } catch { /* La venta sigue aunque el navegador no permita guardar caché local. */ }
    const existente = lineas.find((linea) => linea.tipo === "PRODUCTO" && linea.producto.presentacionId === producto.presentacionId);
    const clave = existente?.clave ?? nuevoUuid();
    setLineas((actuales) => {
      const existente = actuales.find((linea) => linea.tipo === "PRODUCTO" && linea.producto.presentacionId === producto.presentacionId);
      if (existente) return actuales.map((linea) => linea === existente && linea.tipo === "PRODUCTO" ? { ...linea, cantidad: String(Number(linea.cantidad) + 1) } : linea);
      return [...actuales, { clave, tipo: "PRODUCTO", producto, cantidad: "1", descuento: "0.00" }];
    });
    setBusqueda(""); setResultados([]); setError("");
  }
  function agregarServicio() { const clave = nuevoUuid(); setLineas((actuales) => [...actuales, { clave, tipo: "SERVICIO", descripcion: "", cantidad: "1", precio: "0.00", descuento: "0.00", afectacionIgv: "GRAVADO" }]); }
  function actualizarLinea(clave: string, cambios: Partial<LineaCarrito>) { setLineas((actuales) => actuales.map((linea) => linea.clave === clave ? { ...linea, ...cambios } as LineaCarrito : linea)); }
  function actualizarCampoNubefact(clave: string, valor: ValorNubefact) { setCamposNubefact((actuales) => ({ ...actuales, [clave]: valor })); }
  function reiniciarIdempotencia() { claveIdempotencia.current = nuevaClaveIdempotencia(); }
  function quitarLinea(clave: string) { setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave)); }
  async function guardar(evento: FormEvent<HTMLFormElement>, saldoCreditoEsperado = totales.total) {
    evento.preventDefault(); setError(""); setExito(null);
    if (!lineas.length) { setError("Agrega al menos un producto o servicio."); return; }
    const pagoInicial = tipoComprobante === "BOLETA" && condicionPago === "CREDITO" ? Number(importePagoInicial || 0) : 0;
    if (!Number.isFinite(pagoInicial) || pagoInicial < 0 || Number(pagoInicial.toFixed(2)) !== pagoInicial || (tipoComprobante === "BOLETA" && condicionPago === "CREDITO" && saldoCreditoEsperado <= 0)) { setError("El pago inicial debe ser válido y dejar un saldo pendiente para financiar."); return; }
    const cuotasCredito = tipoComprobante === "BOLETA" && condicionPago === "CREDITO" ? cuotasNubefact.map((cuota, indice) => ({ cuota: indice + 1, fechaDePago: cuota.fecha_de_pago, importe: cuota.importe.trim() || (cuotasNubefact.length === 1 ? saldoCreditoEsperado.toFixed(2) : "0.00") })) : [];
    if (tipoComprobante === "BOLETA" && condicionPago === "CREDITO" && (!cuotasCredito.length || cuotasCredito.some((cuota, indice) => !/^\d{4}-\d{2}-\d{2}$/.test(cuota.fechaDePago) || Number.isNaN(Date.parse(`${cuota.fechaDePago}T00:00:00Z`)) || cuota.fechaDePago <= (indice ? cuotasCredito[indice - 1].fechaDePago : fecha) || !Number.isFinite(Number(cuota.importe)) || Number(cuota.importe) <= 0 || Number(Number(cuota.importe).toFixed(2)) !== Number(cuota.importe)) || redondear(cuotasCredito.reduce((suma, cuota) => suma + Number(cuota.importe), 0)) !== saldoCreditoEsperado)) { setError(`Las cuotas deben tener fechas posteriores y sumar el saldo neto financiado de S/ ${saldoCreditoEsperado.toFixed(2)}.`); return; }
    const detalles: LineaIngreso[] = [];
    for (const [i, linea] of lineas.entries()) {
      const cantidad = Number(linea.cantidad);
      const descuento = Number(linea.descuento);
      const precio = linea.tipo === "PRODUCTO" ? Number(linea.producto.precio) : Number(linea.precio);
      if (!Number.isFinite(cantidad) || cantidad <= 0 || Number(cantidad.toFixed(3)) !== cantidad) { setError(`Revisa la cantidad de la línea ${i + 1}.`); return; }
      if (!Number.isFinite(descuento) || descuento < 0 || Number(descuento.toFixed(2)) !== descuento || descuento > redondear(cantidad * precio)) { setError(`El descuento de la línea ${i + 1} debe ser válido y no superar el importe con IGV.`); return; }
      if (linea.tipo === "PRODUCTO") detalles.push({ tipo: "PRODUCTO", presentacionId: linea.producto.presentacionId, cantidad: linea.cantidad, descuento: descuento.toFixed(2) });
      else {
        if (!linea.descripcion.trim() || !Number.isFinite(precio) || precio < 0 || Number(precio.toFixed(2)) !== precio) { setError(`Completa la descripción y un precio válido con IGV para el servicio ${i + 1}.`); return; }
        detalles.push({ tipo: "SERVICIO", descripcion: linea.descripcion.trim(), cantidad: linea.cantidad, precioUnitario: linea.precio, descuento: descuento.toFixed(2), afectacionIgv: linea.afectacionIgv });
      }
    }
    const tipoDocumentoNubefact = String(camposNubefact.cliente_tipo_de_documento ?? "");
    const tipoDocInterno = tipoDocumentoNubefact === "1" ? "DNI" : tipoDocumentoNubefact === "6" ? "RUC" : tipoDocumentoNubefact === "4" ? "CE" : tipoDocumentoNubefact === "7" ? "PASAPORTE" : undefined;
    const fechaVencimientoCredito = cuotasCredito.at(-1)?.fechaDePago;
    const datos: DatosNuevoIngreso = { idempotencyKey: claveIdempotencia.current, fecha, tipoComprobante, clienteId: clienteSeleccionado?.id, clienteDireccion: String(camposNubefact.cliente_direccion || "") || undefined, clienteTipoDocumento: tipoDocInterno, clienteNumeroDocumento: String(camposNubefact.cliente_numero_de_documento || "") || undefined, clienteNombre: clienteSeleccionado ? String(camposNubefact.cliente_denominacion || "") || undefined : tipoComprobante === "BOLETA" ? "CLIENTES VARIOS" : undefined, medioPago, condicionPago: tipoComprobante === "BOLETA" ? condicionPago : "CONTADO", importePagoInicial: pagoInicial.toFixed(2), fechaVencimientoPago: fechaVencimientoCredito, cuotasPago: cuotasCredito, observacion: observacion.trim() || undefined, detalles };
    setGuardando(true);
    try { const creado = await servicioIngresos.crear(datos); setExito(creado); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo guardar el ingreso."); }
    finally { setGuardando(false); }
  }
  const tasaIgv = 18;
  const totales = lineas.reduce((suma, linea) => {
    const cantidad = Number(linea.cantidad) || 0; const precio = linea.tipo === "PRODUCTO" ? Number(linea.producto.precio) : Number(linea.precio) || 0;
    const bruto = redondear(cantidad * precio); const totalLinea = Math.max(0, redondear(bruto - (Number(linea.descuento) || 0)));
    const afectacion = linea.tipo === "PRODUCTO" ? linea.producto.afectacionIgv : linea.afectacionIgv;
    const base = afectacion === "GRAVADO" ? redondear(totalLinea * 100 / (100 + tasaIgv)) : totalLinea;
    suma.total = redondear(suma.total + totalLinea);
    suma.igv = redondear(suma.igv + (afectacion === "GRAVADO" ? redondear(totalLinea * tasaIgv / (100 + tasaIgv)) : 0));
    if (afectacion === "GRAVADO") suma.gravada = redondear(suma.gravada + base);
    if (afectacion === "EXONERADO") suma.exonerada = redondear(suma.exonerada + base);
    if (afectacion === "INAFECTO") suma.inafecta = redondear(suma.inafecta + base);
    return suma;
  }, { total: 0, igv: 0, gravada: 0, exonerada: 0, inafecta: 0 });
  const ingresoBrutoProyectadoNrus = tipoComprobante === "BOLETA" && controlNrus?.periodo === fecha.slice(0, 7) ? redondear(controlNrus.ingresoBruto + totales.total) : null;
  const superaLimiteMensualNrus = tipoComprobante === "BOLETA" && ingresoBrutoProyectadoNrus !== null && ingresoBrutoProyectadoNrus >= (controlNrus?.limiteMensual ?? 8000);
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
  return { busqueda, setBusqueda, resultados, buscando, productosRecientes, lineas, agregarProducto, agregarServicio, actualizarLinea, quitarLinea, tipoComprobante, setTipoComprobante, medioPago, setMedioPago, condicionPago, setCondicionPago, importePagoInicial, setImportePagoInicial, fechaVencimientoPago, setFechaVencimientoPago, fecha, setFecha, observacion, setObservacion, guardando, error, setError, exito, setExito, guardar, totales, tasaIgv, controlNrus, ingresoBrutoProyectadoNrus, superaLimiteMensualNrus, camposNubefact, actualizarCampoNubefact, reiniciarIdempotencia, seleccionarDocumentoCliente, cuotasNubefact, setCuotasNubefact, actualizarCuotaCredito, agregarCuotaCredito, quitarCuotaCredito, busquedaCliente, setBusquedaCliente, buscarClientes, clientesEncontrados, clienteSeleccionado, buscandoClientes, registrandoCliente, seleccionarCliente, actualizarClienteEnResultados, guardarCliente, quitarCliente, estadoNubefact };
}
