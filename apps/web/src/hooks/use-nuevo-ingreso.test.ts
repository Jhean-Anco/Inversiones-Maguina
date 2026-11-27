import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { useNuevoIngreso } from "./use-nuevo-ingreso";
import { ErrorApi } from "../services/api-cliente";
import { servicioIngresos, type ClienteRegistrado, type EstadoNubefact, type MototaxiParaIngreso, type ProductoParaIngreso } from "../services/ingresos.service";
import type { TipoVenta } from "../types/nuevo-ingreso";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));
vi.mock("../services/ingresos.service", () => ({
  servicioIngresos: { estadoNubefact: vi.fn(), buscarProductos: vi.fn(), buscarMototaxis: vi.fn(), buscarClientes: vi.fn(), crear: vi.fn(), registrarCliente: vi.fn() },
}));
const s = vi.mocked(servicioIngresos);

const nubefact: EstadoNubefact = { regimenTributario: "GENERAL", credencialesConfiguradas: true, seriesConfiguradas: true, emisionHabilitada: true, serieFacturaConfigurada: true, emisionFacturaHabilitada: true };
const producto = (cambios: Partial<ProductoParaIngreso> = {}) => ({ productoId: "p1", codigo: "R-1", nombre: "Filtro", presentacionId: "pr1", presentacion: "Unidad", precio: "118.00", afectacionIgv: "GRAVADO", ...cambios }) as ProductoParaIngreso;
const mototaxi = (cambios: Partial<MototaxiParaIngreso> = {}): MototaxiParaIngreso => ({ mototaxiModeloId: "m1", codigo: "M-1", marca: "Bajaj", modelo: "RE", version: null, precioVenta: "9000.00", stockDisponible: 2, ...cambios });
const cliente = (cambios: Partial<ClienteRegistrado> = {}) => ({ id: "c1", tipoDocumento: "01", numeroDocumento: "12345678", nombres: "Ana", apellidoPaterno: "Ríos", apellidoMaterno: null, razonSocial: null, direccion: "Av. 1", ...cambios }) as ClienteRegistrado;
const evento = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

async function montar(tipoVenta?: TipoVenta) {
  const hook = renderHook(() => useNuevoIngreso(tipoVenta));
  await waitFor(() => expect(hook.result.current.estadoNubefact).not.toBeNull());
  return hook;
}

beforeEach(() => {
  navegar.mockReset();
  Object.values(s).forEach((f) => f.mockReset());
  s.estadoNubefact.mockResolvedValue(nubefact);
});
afterEach(() => vi.unstubAllGlobals());

describe("useNuevoIngreso", () => {
  it("inicia con valores por defecto y tolera NubeFact no disponible", async () => {
    s.estadoNubefact.mockRejectedValueOnce(new Error("x"));
    const { result } = renderHook(() => useNuevoIngreso());
    await waitFor(() => expect(s.estadoNubefact).toHaveBeenCalled());
    expect(result.current).toMatchObject({ tipoComprobante: "BOLETA", medioPago: "EFECTIVO", condicionPago: "CONTADO", lineas: [], estadoNubefact: null });
    expect(result.current.totales).toEqual({ total: 0, igv: 0, gravada: 0, exonerada: 0, inafecta: 0 });
    expect(result.current.fechaMinimaComprobante < result.current.fecha).toBe(true);
  });

  it("busca productos para venta con espera y maneja errores", async () => {
    s.buscarProductos.mockResolvedValueOnce([producto()]).mockRejectedValueOnce(new Error("Caído")).mockRejectedValueOnce("x");
    const { result } = await montar();
    act(() => result.current.setBusqueda("fil"));
    expect(result.current.buscando).toBe(false);
    act(() => result.current.setBusqueda("filtro"));
    expect(result.current.buscando).toBe(true);
    await waitFor(() => expect(result.current.resultados).toHaveLength(1));
    expect(s.buscarProductos).toHaveBeenCalledWith("filtro", false, false, true);
    act(() => result.current.setBusqueda("filtros"));
    await waitFor(() => expect(result.current.error).toBe("Caído"));
    act(() => result.current.setBusqueda("filtrox"));
    await waitFor(() => expect(result.current.error).toBe("No se pudieron buscar productos."));
  });

  it("busca mototaxis solo en la venta de mototaxis", async () => {
    const repuestos = await montar();
    act(() => repuestos.result.current.setBusquedaMototaxi("bajaj"));
    expect(repuestos.result.current.buscandoMototaxis).toBe(false);

    s.buscarMototaxis.mockResolvedValueOnce([mototaxi()]).mockRejectedValueOnce(new Error("Caído")).mockRejectedValueOnce(1);
    const { result } = await montar("MOTOTAXIS");
    act(() => result.current.setBusquedaMototaxi("bajaj"));
    await waitFor(() => expect(result.current.resultadosMototaxi).toHaveLength(1));
    act(() => result.current.setBusquedaMototaxi("bajaj2"));
    await waitFor(() => expect(result.current.error).toBe("Caído"));
    act(() => result.current.setBusquedaMototaxi("bajaj3"));
    await waitFor(() => expect(result.current.error).toBe("No se pudieron buscar mototaxis."));
  });

  it("agrega repuestos eligiendo la lista general y acumula cantidades", async () => {
    const { result } = await montar();
    const conTramos = producto({ tramos: [{ listaCodigo: "MAYOR", listaNombre: "M", precio: "100", cantidadMinima: "1" }, { listaCodigo: "GENERAL", listaNombre: "G", precio: "118", cantidadMinima: "1" }] });
    act(() => result.current.agregarProducto(conTramos));
    act(() => result.current.agregarProducto(conTramos));
    expect(result.current.lineas).toHaveLength(1);
    expect(result.current.lineas[0]).toMatchObject({ tipo: "PRODUCTO", cantidad: "2", listaPrecioCodigo: "GENERAL" });
    expect(result.current.totales).toEqual({ total: 236, igv: 36, gravada: 200, exonerada: 0, inafecta: 0 });
    act(() => result.current.agregarProducto(producto({ presentacionId: "pr2", tramos: [{ listaCodigo: "MAYOR", listaNombre: "M", precio: "50", cantidadMinima: "1" }], afectacionIgv: "EXONERADO" })));
    expect(result.current.lineas[1]).toMatchObject({ listaPrecioCodigo: "MAYOR" });
    expect(result.current.totales.exonerada).toBe(50);
    expect(result.current.productosRecientes.map((r) => r.id)).toEqual(["pr2", "pr1"]);
  });

  it("rechaza repuestos sin precio, en venta de mototaxis o con un servicio incompleto", async () => {
    const { result } = await montar();
    act(() => result.current.agregarProducto(producto({ precio: "" })));
    expect(result.current.error).toBe("Configura el precio de venta del repuesto desde Inventarios.");
    act(() => result.current.agregarServicio());
    act(() => result.current.agregarProducto(producto()));
    expect(result.current.error).toBe("Completa el servicio actual antes de agregar otro ítem.");
    act(() => result.current.agregarServicio());
    expect(result.current.error).toBe("Completa el servicio actual antes de agregar otro.");
    expect(result.current.lineas).toHaveLength(1);

    const mototaxis = await montar("MOTOTAXIS");
    act(() => { mototaxis.result.current.agregarProducto(producto()); mototaxis.result.current.agregarServicio(); });
    expect(mototaxis.result.current.lineas).toEqual([]);
  });

  it("edita, quita líneas y calcula IGV según comprobante y régimen", async () => {
    vi.stubGlobal("crypto", {});
    const { result } = await montar();
    act(() => result.current.agregarServicio());
    const clave = result.current.lineas[0].clave;
    expect(clave).toMatch(/^[0-9a-f-]{36}$/);
    act(() => result.current.actualizarLinea(clave, { descripcion: "Afinado", precio: "59", afectacionIgv: "INAFECTO" } as never));
    act(() => result.current.agregarServicio());
    act(() => result.current.actualizarLinea(result.current.lineas[1].clave, { descripcion: "Lavado", precio: "11.8", cantidad: "x" } as never));
    expect(result.current.totales).toEqual({ total: 59, igv: 0, gravada: 0, exonerada: 0, inafecta: 59 });
    act(() => result.current.actualizarLinea(result.current.lineas[1].clave, { cantidad: "1" } as never));
    expect(result.current.totales.igv).toBe(1.8);
    act(() => result.current.setTipoComprobante("NOTA_VENTA"));
    expect(result.current.totales.igv).toBe(0);
    act(() => result.current.quitarLinea(clave));
    expect(result.current.lineas).toHaveLength(1);
  });

  it("no calcula IGV en el Nuevo RUS", async () => {
    s.estadoNubefact.mockResolvedValue({ ...nubefact, regimenTributario: "NRUS" });
    const { result } = await montar();
    act(() => result.current.agregarProducto(producto()));
    expect(result.current.totales).toMatchObject({ total: 118, igv: 0, gravada: 118 });
  });

  it("agrega repuestos recientes actualizados", async () => {
    const { result } = await montar();
    s.buscarProductos.mockResolvedValueOnce([producto()]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Sin red")).mockRejectedValueOnce(0);
    await act(() => result.current.agregarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.lineas).toHaveLength(1);
    await act(() => result.current.agregarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("Ese repuesto ya no aparece en el catálogo. Búscalo nuevamente para actualizar sus datos.");
    await act(() => result.current.agregarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("Sin red");
    await act(() => result.current.agregarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("No se pudo actualizar el repuesto reciente.");
  });

  it("agrega mototaxis respetando precio y existencias", async () => {
    const { result } = await montar("MOTOTAXIS");
    act(() => result.current.agregarMototaxi(mototaxi({ precioVenta: null })));
    expect(result.current.error).toBe("Configura el precio de venta de este modelo desde Inventarios.");
    act(() => result.current.agregarMototaxi(mototaxi({ stockDisponible: 0 })));
    expect(result.current.error).toBe("Este modelo está sin existencias.");
    act(() => result.current.agregarMototaxi(mototaxi({ version: "2026" })));
    act(() => result.current.agregarMototaxi(mototaxi({ precioVenta: "9500.00" })));
    expect(result.current.lineas).toHaveLength(1);
    expect(result.current.lineas[0]).toMatchObject({ cantidad: "2", precio: "9500.00" });
    act(() => result.current.agregarMototaxi(mototaxi()));
    expect(result.current.error).toBe("La cantidad supera el saldo disponible del modelo.");
    expect(result.current.mototaxisRecientes[0]).toMatchObject({ id: "m1", detalle: "2 disponibles" });

    const repuestos = await montar();
    act(() => repuestos.result.current.agregarMototaxi(mototaxi()));
    expect(repuestos.result.current.lineas).toEqual([]);
  });

  it("agrega mototaxis recientes actualizadas", async () => {
    const { result } = await montar("MOTOTAXIS");
    s.buscarMototaxis.mockResolvedValueOnce([mototaxi()]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Sin red")).mockRejectedValueOnce(0);
    await act(() => result.current.agregarMototaxiReciente({ id: "m1", nombre: "Bajaj RE", codigo: "M-1" }));
    expect(result.current.lineas).toHaveLength(1);
    await act(() => result.current.agregarMototaxiReciente({ id: "m1", nombre: "Bajaj RE", codigo: "M-1" }));
    expect(result.current.error).toBe("Este modelo ya no está disponible. Búscala nuevamente para actualizar su estado.");
    await act(() => result.current.agregarMototaxiReciente({ id: "m1", nombre: "Bajaj RE", codigo: "M-1" }));
    expect(result.current.error).toBe("Sin red");
    await act(() => result.current.agregarMototaxiReciente({ id: "m1", nombre: "Bajaj RE", codigo: "M-1" }));
    expect(result.current.error).toBe("No se pudo actualizar la mototaxi reciente.");
    expect(result.current.buscandoMototaxis).toBe(false);
  });

  it("carga una orden de servicio con su cliente y sus líneas", async () => {
    const { result } = await montar();
    s.buscarClientes.mockResolvedValue([cliente({ documentos: [{ tipoDocumento: "01", numeroDocumento: "12345678" }, { tipoDocumento: "06", numeroDocumento: "10123456789" }] })]);
    const orden = { id: "os1", codigo: "OS-1", clienteId: "c1", clienteNombre: "Ana", motivo: "Afinado", adelantoMedioPago: "TARJETA", tipoComprobante: "FACTURA" as const, detalles: [{ tipo: "SERVICIO", descripcion: "Mano de obra", precioUnitario: "50" }] };
    await act(() => result.current.cargarOrdenServicio(orden));
    expect(result.current).toMatchObject({ tipoComprobante: "FACTURA", medioPago: "TARJETA", observacion: "Orden de servicio OS-1. Afinado" });
    expect(result.current.camposNubefact).toMatchObject({ cliente_tipo_de_documento: "6", cliente_numero_de_documento: "10123456789", cliente_denominacion: "Ana Ríos" });
    expect(result.current.lineas).toHaveLength(1);

    s.buscarClientes.mockResolvedValue([cliente()]);
    await act(() => result.current.cargarOrdenServicio({ ...orden, adelantoMedioPago: null }));
    expect(result.current.medioPago).toBe("TARJETA");
    s.buscarClientes.mockResolvedValue([cliente({ tipoDocumento: "06", numeroDocumento: "20123456789", razonSocial: "ACME" })]);
    await act(() => result.current.cargarOrdenServicio(orden));
    expect(result.current.camposNubefact.cliente_numero_de_documento).toBe("20123456789");
    s.buscarClientes.mockResolvedValue([]);
    await expect(result.current.cargarOrdenServicio(orden)).rejects.toThrow("No se pudo cargar el cliente asociado a la orden. Búscalo nuevamente en la venta.");
  });

  it("carga una cotización con o sin cliente", async () => {
    const { result } = await montar();
    s.buscarClientes.mockResolvedValue([cliente({ tipoDocumento: "06", numeroDocumento: "20123456789", razonSocial: "ACME" })]);
    const cot = { id: "co1", codigo: "COT-1", clienteId: "c1", clienteNombre: "ACME", observacion: "Urgente", tipoComprobante: "FACTURA" as const, detalles: [{ tipo: "SERVICIO" }] };
    await act(() => result.current.cargarCotizacion(cot));
    expect(result.current.observacion).toBe("Cotización COT-1 · Urgente");
    expect(result.current.camposNubefact).toMatchObject({ cliente_tipo_de_documento: "6", cliente_numero_de_documento: "20123456789" });
    s.buscarClientes.mockResolvedValue([cliente({ documentos: [{ tipoDocumento: "06", numeroDocumento: "10999999999" }] })]);
    await act(() => result.current.cargarCotizacion(cot));
    expect(result.current.camposNubefact.cliente_numero_de_documento).toBe("10999999999");
    s.buscarClientes.mockResolvedValue([cliente()]);
    await act(() => result.current.cargarCotizacion({ ...cot, clienteNombre: null }));
    expect(s.buscarClientes).toHaveBeenLastCalledWith("");
    await act(() => result.current.cargarCotizacion({ ...cot, tipoComprobante: "BOLETA" }));
    await act(() => result.current.cargarCotizacion({ ...cot, clienteId: null, observacion: null }));
    expect(result.current.clienteSeleccionado).toBeNull();
    expect(result.current.observacion).toBe("Cotización COT-1");
    s.buscarClientes.mockResolvedValue([]);
    await expect(result.current.cargarCotizacion(cot)).rejects.toThrow("No se pudo cargar el cliente de la cotización. Búscalo nuevamente en la venta.");
  });

  it("no guarda una venta inválida", async () => {
    const { result } = await montar();
    let r: unknown = "x";
    await act(async () => { r = await result.current.guardar(evento()); });
    expect(r).toBeNull();
    expect(result.current.error).toBe("Agrega al menos un repuesto o servicio.");
    expect(s.crear).not.toHaveBeenCalled();
  });

  it("guarda una boleta a clientes varios con clave de idempotencia", async () => {
    s.crear.mockResolvedValue({ id: "i1" } as never);
    const { result } = await montar();
    act(() => { result.current.agregarProducto(producto()); result.current.setObservacion("  "); });
    let r: unknown;
    await act(async () => { r = await result.current.guardar(evento()); });
    expect(r).toEqual({ id: "i1" });
    expect(result.current.exito).toEqual({ id: "i1" });
    const datos = s.crear.mock.calls[0][0];
    expect(datos).toMatchObject({ tipoComprobante: "BOLETA", clienteNombre: "CLIENTES VARIOS", medioPago: "EFECTIVO", condicionPago: "CONTADO", importePagoInicial: "0.00", cuotasPago: [], observacion: undefined, clienteId: undefined });
    expect(datos.detalles).toHaveLength(1);
    await act(() => result.current.guardar(evento()));
    expect(s.crear.mock.calls[1][0].idempotencyKey).toBe(datos.idempotencyKey);
    act(() => result.current.reiniciarIdempotencia());
    await act(() => result.current.guardar(evento()));
    expect(s.crear.mock.calls[2][0].idempotencyKey).not.toBe(datos.idempotencyKey);
  });

  it("guarda con el cliente seleccionado y la clave de la orden", async () => {
    s.crear.mockResolvedValue({ id: "i1" } as never);
    s.buscarClientes.mockResolvedValue([cliente()]);
    const { result } = await montar();
    await act(() => result.current.cargarOrdenServicio({ id: "os1", codigo: "OS", clienteId: "c1", clienteNombre: "Ana", motivo: "", adelantoMedioPago: null, tipoComprobante: "NOTA_VENTA", detalles: [{ tipo: "SERVICIO", descripcion: "x", precioUnitario: "10" }] }));
    act(() => result.current.reiniciarIdempotencia());
    await act(() => result.current.guardar(evento()));
    expect(s.crear).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "os1", ordenServicioId: "os1", clienteId: "c1", clienteNombre: "Ana Ríos", clienteTipoDocumento: "DNI", clienteNumeroDocumento: "12345678", clienteDireccion: "Av. 1" }));
    act(() => result.current.actualizarCampoNubefact("cliente_denominacion", ""));
    act(() => result.current.setTipoComprobante("FACTURA"));
    act(() => result.current.quitarCliente());
    act(() => result.current.setTipoComprobante("NOTA_VENTA"));
    await act(() => result.current.guardar(evento()));
    expect(s.crear).toHaveBeenLastCalledWith(expect.objectContaining({ clienteNombre: undefined, clienteDireccion: undefined, clienteNumeroDocumento: undefined }));
  });

  it("maneja fallos al guardar", async () => {
    s.crear.mockRejectedValueOnce(new ErrorApi("exp", 401)).mockRejectedValueOnce(new Error("Stock insuficiente")).mockRejectedValueOnce("x");
    const { result } = await montar();
    act(() => result.current.agregarProducto(producto()));
    await act(() => result.current.guardar(evento()));
    expect(navegar).toHaveBeenCalledWith("/login", { replace: true });
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Stock insuficiente");
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("No se pudo guardar el ingreso.");
    expect(result.current.guardando).toBe(false);
  });

  it("gestiona las cuotas de crédito", async () => {
    const { result } = await montar();
    act(() => result.current.agregarProducto(producto({ precio: "100.00" })));
    const primera = result.current.cuotasNubefact[0].fecha_de_pago;
    act(() => result.current.agregarCuotaCredito());
    expect(result.current.cuotasNubefact.map((c) => [c.cuota, c.importe])).toEqual([["1", "50.00"], ["2", "50.00"]]);
    act(() => result.current.agregarCuotaCredito(100.01));
    expect(result.current.cuotasNubefact.map((c) => c.importe)).toEqual(["33.34", "33.34", "33.33"]);
    expect(result.current.fechaVencimientoPago).toBe(result.current.cuotasNubefact[2].fecha_de_pago);
    act(() => result.current.actualizarCuotaCredito(2, "fecha_de_pago", "2030-01-01"));
    expect(result.current.fechaVencimientoPago).toBe("2030-01-01");
    act(() => result.current.actualizarCuotaCredito(0, "importe", "10"));
    expect(result.current.cuotasNubefact[0].importe).toBe("10");
    act(() => result.current.quitarCuotaCredito(0));
    expect(result.current.cuotasNubefact.map((c) => c.cuota)).toEqual(["1", "2"]);
    expect(result.current.fechaVencimientoPago).toBe("2030-01-01");
    act(() => { result.current.quitarCuotaCredito(0); });
    act(() => { result.current.quitarCuotaCredito(0); });
    expect(result.current.cuotasNubefact).toHaveLength(1);
    act(() => result.current.setCuotasNubefact([{ cuota: "1", fecha_de_pago: "", importe: "" }]));
    act(() => result.current.setFechaVencimientoPago(""));
    act(() => result.current.agregarCuotaCredito(10));
    expect(result.current.cuotasNubefact[1].fecha_de_pago).not.toBe("");
    expect(primera).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
