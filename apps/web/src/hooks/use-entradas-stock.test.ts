import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { useEntradasStock } from "./use-entradas-stock";
import { ErrorApi } from "../services/api-cliente";
import { servicioEntradasStock, type PaginaEntradasStock, type ProductoParaCompra } from "../services/inventario/entradas-stock.service";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));
vi.mock("../services/inventario/entradas-stock.service", () => ({ servicioEntradasStock: { listar: vi.fn(), consultar: vi.fn(), buscarProductos: vi.fn(), crear: vi.fn() } }));
vi.mock("../services/proveedores.service", () => ({ servicioProveedores: { listar: vi.fn(), crear: vi.fn() } }));
vi.mock("../services/identidad.service", () => ({ servicioIdentidad: { consultar: vi.fn() } }));
const s = vi.mocked(servicioEntradasStock);

const pagina = (cambios: Partial<PaginaEntradasStock> = {}): PaginaEntradasStock => ({ items: [], total: 12, pagina: 1, porPagina: 10, totalPaginas: 2, conteosPago: { todas: 12, pagadas: 10, pendientes: 2 }, ...cambios });
const producto = (id = "pr1"): ProductoParaCompra => ({ productoId: "p1", codigoInterno: "R-1", nombre: "Filtro", marca: "Bosch", presentacionId: id, presentacion: "Caja", unidadMedidaCodigo: "BX", unidadMedida: "Caja", factorAUnidadBase: "12" });
const evento = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

async function montar(alGuardarse?: () => void) {
  const hook = renderHook(() => useEntradasStock(alGuardarse));
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return hook;
}

beforeEach(() => {
  navegar.mockReset();
  Object.values(s).forEach((f) => f.mockReset());
  s.listar.mockResolvedValue(pagina());
});
afterEach(() => vi.unstubAllGlobals());

describe("useEntradasStock", () => {
  it("lista compras con filtros de pago, búsqueda y tamaño", async () => {
    const { result } = await montar();
    expect(s.listar).toHaveBeenCalledWith(1, 10, "", "TODAS");
    expect(result.current).toMatchObject({ total: 12, desde: 1, hasta: 10, conteosPago: { pendientes: 2 } });
    act(() => result.current.setFiltroPago("PENDIENTES"));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 10, "", "PENDIENTES"));
    act(() => result.current.cambiarPorPagina(3));
    act(() => result.current.cambiarPorPagina(6));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 6, "", "PENDIENTES"));
    act(() => result.current.setBusqueda("acme"));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 6, "acme", "PENDIENTES"));
  });

  it("corrige la página fuera de rango e informa errores", async () => {
    s.listar.mockResolvedValue(pagina({ total: 0, totalPaginas: 1 }));
    const { result } = await montar();
    expect(result.current.desde).toBe(0);
    act(() => result.current.cambiarPagina(4));
    await waitFor(() => expect(result.current.pagina).toBe(1));
    s.listar.mockRejectedValueOnce("x");
    act(() => result.current.setFiltroPago("PAGADAS"));
    await waitFor(() => expect(result.current.error).toBe("No se pudieron cargar las compras."));
    s.listar.mockRejectedValueOnce(new ErrorApi("x", 401));
    act(() => result.current.setFiltroPago("TODAS"));
    await waitFor(() => expect(navegar).toHaveBeenCalledWith("/login", { replace: true }));
  });

  it("descarta respuestas de consultas anteriores", async () => {
    let lenta!: (p: PaginaEntradasStock) => void;
    s.listar.mockReturnValueOnce(new Promise((r) => { lenta = r; })).mockResolvedValue(pagina({ total: 7 }));
    const { result } = renderHook(() => useEntradasStock());
    await waitFor(() => expect(s.listar).toHaveBeenCalledTimes(1));
    act(() => result.current.setFiltroPago("PAGADAS"));
    await waitFor(() => expect(result.current.total).toBe(7));
    await act(async () => { lenta(pagina({ total: 99 })); });
    expect(result.current.total).toBe(7);
  });

  it("busca productos de compra con espera", async () => {
    s.buscarProductos.mockResolvedValueOnce([producto()]);
    const { result } = await montar();
    act(() => result.current.cambiarBusquedaProducto("fi"));
    expect(result.current.buscandoProductos).toBe(false);
    act(() => result.current.cambiarBusquedaProducto("filtro"));
    await waitFor(() => expect(result.current.productosEncontrados).toEqual([producto()]));
    s.buscarProductos.mockRejectedValueOnce(new Error("Caído"));
    act(() => result.current.cambiarBusquedaProducto("filtros"));
    await waitFor(() => expect(result.current.error).toBe("Caído"));
  });

  it("agrega productos seleccionados evitando duplicados", async () => {
    const { result } = await montar();
    act(() => result.current.seleccionarProductoCompra(producto()));
    expect(result.current.detalles).toHaveLength(1);
    expect(result.current.detalles[0]).toMatchObject({ codigo: "R-1", cantidad: "1", importeTotal: "0.00", factor: 12 });
    expect(result.current.productoBusqueda).toBe("Filtro · Caja");
    expect(result.current.productosRecientes[0]).toMatchObject({ id: "pr1" });
    act(() => result.current.seleccionarProductoCompra(producto()));
    expect(result.current.error).toBe("Ese repuesto ya está en la tabla. Edita su cantidad o precio total en la línea existente.");
    expect(result.current.detalles).toHaveLength(1);
  });

  it("agrega líneas con cantidad y total validados", async () => {
    vi.stubGlobal("crypto", {});
    const { result } = await montar();
    act(() => result.current.agregarDetalle());
    expect(result.current.error).toBe("Busca y selecciona un producto y su presentación de compra.");
    act(() => result.current.seleccionarProductoCompra(producto()));
    act(() => result.current.agregarDetalle());
    expect(result.current.error).toBe("Revisa la cantidad y el precio total de la línea.");
    act(() => { result.current.setCantidadProducto("2.5"); result.current.setCostoProducto("25"); });
    act(() => result.current.agregarDetalle());
    expect(result.current.error).toBe("Ese producto y presentación ya están en la entrada. Actualiza su cantidad en la línea existente.");
    act(() => result.current.quitarDetalle(result.current.detalles[0].clave));
    act(() => result.current.agregarDetalle());
    expect(result.current.detalles[0]).toMatchObject({ cantidad: "2.5", costoUnitario: "10.0000", importeTotal: "25.00" });
    expect(result.current.detalles[0].clave).toMatch(/^linea-/);
    expect(result.current.totalBorrador).toBe(25);
    expect(result.current.productoElegido).toBe("");
  });

  it("selecciona productos recientes actualizados", async () => {
    const { result } = await montar();
    s.buscarProductos.mockResolvedValueOnce([producto("otro"), producto()]).mockResolvedValueOnce([]).mockRejectedValueOnce("x");
    await act(() => result.current.seleccionarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(s.buscarProductos).toHaveBeenCalledWith("R-1");
    expect(result.current.detalles).toHaveLength(1);
    await act(() => result.current.seleccionarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("Ese repuesto ya no está disponible para compra. Búscalo nuevamente para actualizar sus datos.");
    await act(() => result.current.seleccionarProductoReciente({ id: "pr1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("No se pudo actualizar el repuesto reciente.");
    expect(result.current.buscandoProductos).toBe(false);
    act(() => result.current.limpiarProductoElegido());
    expect(result.current).toMatchObject({ productoElegido: "", productoBusqueda: "", cantidadProducto: "1", costoProducto: "" });
  });

  it("abre el detalle de una compra", async () => {
    const { result } = await montar();
    s.consultar.mockResolvedValueOnce({ id: "e1" } as never).mockRejectedValueOnce("x");
    act(() => result.current.abrirProductoDetalle("e1"));
    await waitFor(() => expect(result.current.entradaDetalle).toEqual({ id: "e1" }));
    act(() => result.current.cerrarDetalle());
    expect(result.current.entradaDetalle).toBeNull();
    act(() => result.current.abrirProductoDetalle("e2"));
    await waitFor(() => expect(result.current.error).toBe("No se pudo cargar el detalle de la entrada."));
    expect(result.current.cargandoDetalle).toBe(false);
  });

  it("valida la compra antes de guardar", async () => {
    const { result } = await montar();
    act(() => result.current.abrirNuevo());
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Agrega al menos un producto comprado para registrar la compra.");
    act(() => result.current.seleccionarProductoCompra(producto()));
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Completa la cantidad y el precio total de cada repuesto.");
    act(() => result.current.setDetalles((d) => d.map((f) => ({ ...f, importeTotal: "100.00" }))));
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Completa los importes y las cuentas. La suma debe coincidir con el total de la compra.");
    act(() => { result.current.agregarPagoCompra(); });
    act(() => result.current.setPagosCompra((p) => p.map((pago, i) => ({ ...pago, cuentaFinancieraId: "c" + i, medioPago: "EFECTIVO", importe: i ? "30" : "60" }))));
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Completa los importes y las cuentas. La suma debe coincidir con el total de la compra.");
    expect(s.crear).not.toHaveBeenCalled();
  });

  it("registra una compra pagada con una sola cuenta", async () => {
    s.crear.mockResolvedValue({} as never);
    const alGuardarse = vi.fn();
    const { result } = await montar(alGuardarse);
    act(() => result.current.abrirNuevo());
    act(() => result.current.seleccionarProductoCompra(producto()));
    act(() => {
      result.current.setDetalles((d) => d.map((f) => ({ ...f, cantidad: "2", costoUnitario: "50.0000", importeTotal: "100.00" })));
      result.current.setPagosCompra((p) => p.map((pago) => ({ ...pago, cuentaFinancieraId: "c1", medioPago: "EFECTIVO" })));
      result.current.setNumeroDocumento(" F001-9 "); result.current.setObservacion(" ok "); result.current.setFecha("2026-01-05"); result.current.setTipoDocumento("BOLETA");
      result.current.setProveedor(" ACME "); result.current.setProveedorNumeroDocumento(" 20123456789 "); result.current.setProveedorDireccion(" Av ");
      result.current.setMedioPago("x"); result.current.setCuentaFinancieraId("y");
    });
    await act(() => result.current.guardar(evento()));
    expect(s.crear).toHaveBeenCalledWith({ claveIdempotencia: expect.any(String),
      fecha: "2026-01-05", tipoDocumento: "BOLETA", numeroDocumento: "F001-9", proveedor: "ACME", proveedorTipoPersona: "", proveedorTipoDocumento: "RUC", proveedorNumeroDocumento: "20123456789", proveedorDireccion: "Av",
      medioPago: "EFECTIVO", cuentaFinancieraId: "c1", montoPagado: "100.00", pagos: [{ cuentaFinancieraId: "c1", medioPago: "EFECTIVO", importePagado: "100.00" }], observacion: "ok",
      detalles: [{ productoId: "p1", presentacionId: "pr1", cantidad: "2", costoUnitario: "50.0000", importeTotal: "100.00" }],
    });
    expect(result.current.modalAbierto).toBe(false);
    expect(alGuardarse).toHaveBeenCalledOnce();
  });

  it("registra pagos repartidos y maneja el fallo al guardar", async () => {
    let rechazar!: (e: unknown) => void;
    s.crear.mockResolvedValueOnce({} as never).mockReturnValueOnce(new Promise((_r, rej) => { rechazar = rej; }));
    const { result } = await montar();
    act(() => result.current.abrirNuevo());
    act(() => result.current.seleccionarProductoCompra(producto()));
    act(() => { result.current.setDetalles((d) => d.map((f) => ({ ...f, importeTotal: "90.00" }))); result.current.agregarPagoCompra(); result.current.agregarPagoCompra(); });
    act(() => result.current.quitarPagoCompra(result.current.pagosCompra[2].clave));
    act(() => result.current.setPagosCompra((p) => p.map((pago, i) => ({ ...pago, cuentaFinancieraId: "c" + i, medioPago: "YAPE", importe: i ? "30" : "60" }))));
    await act(() => result.current.guardar(evento()));
    expect(s.crear).toHaveBeenCalledWith(expect.objectContaining({ medioPago: null, cuentaFinancieraId: null, montoPagado: "90.00" }));

    act(() => result.current.abrirNuevo());
    act(() => result.current.seleccionarProductoCompra(producto()));
    act(() => { result.current.setDetalles((d) => d.map((f) => ({ ...f, importeTotal: "10.00" }))); result.current.setPagosCompra((p) => p.map((pago) => ({ ...pago, cuentaFinancieraId: "c", medioPago: "YAPE" }))); });
    let guardado!: Promise<void>;
    act(() => { guardado = result.current.guardar(evento()); });
    act(() => result.current.cerrarModal());
    expect(result.current.modalAbierto).toBe(true);
    await act(async () => { rechazar("x"); await guardado; });
    expect(result.current.error).toBe("No se pudo registrar la compra.");
    act(() => result.current.cerrarModal());
    expect(result.current.modalAbierto).toBe(false);
    act(() => result.current.setError(""));
  });
});
