import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { MOTIVOS_AJUSTE, motivoVisible, useMovimientosStock } from "./use-movimientos-stock";
import { ErrorApi } from "../services/api-cliente";
import { servicioMovimientosStock, type PaginaMovimientosStock, type ProductoParaAjuste } from "../services/inventario/movimientos-stock.service";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));
vi.mock("../services/inventario/movimientos-stock.service", () => ({ servicioMovimientosStock: { listar: vi.fn(), buscarProductos: vi.fn(), crearAjuste: vi.fn() } }));
const s = vi.mocked(servicioMovimientosStock);

const pagina = (cambios: Partial<PaginaMovimientosStock> = {}): PaginaMovimientosStock => ({ items: [], total: 30, pagina: 1, porPagina: 10, totalPaginas: 3, ...cambios });
const producto: ProductoParaAjuste = { id: "p1", codigo: "R-1", nombre: "Filtro", marca: "Bosch", unidadCodigo: "NIU", unidad: "unidades", cantidadActual: "10" };
const evento = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

async function montar() {
  const hook = renderHook(() => useMovimientosStock());
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return hook;
}

beforeEach(() => {
  navegar.mockReset();
  Object.values(s).forEach((f) => f.mockReset());
  s.listar.mockResolvedValue(pagina());
});

describe("motivos de ajuste", () => {
  it("muestra el nombre del motivo o el código desconocido", () => {
    expect(MOTIVOS_AJUSTE).toHaveLength(7);
    expect(motivoVisible("MERMA")).toBe("Merma");
    expect(motivoVisible("RARO")).toBe("RARO");
    expect(motivoVisible(null)).toBe("—");
  });
});

describe("useMovimientosStock", () => {
  it("lista solo ajustes y calcula el rango mostrado", async () => {
    const { result } = await montar();
    expect(s.listar).toHaveBeenCalledWith(1, 10, "", "AJUSTE");
    expect(result.current).toMatchObject({ total: 30, desde: 1, hasta: 10, totalPaginas: 3 });
    act(() => result.current.cambiarPorPagina(5));
    expect(result.current.porPagina).toBe(10);
    act(() => result.current.cambiarPorPagina(4));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 4, "", "AJUSTE"));
    act(() => result.current.setBusqueda("aceite"));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 4, "aceite", "AJUSTE"));
  });

  it("ajusta la página fuera de rango y maneja errores", async () => {
    s.listar.mockResolvedValueOnce(pagina({ total: 0, totalPaginas: 1 })).mockResolvedValueOnce(pagina({ total: 0, totalPaginas: 1 }));
    const { result } = await montar();
    expect(result.current.desde).toBe(0);
    act(() => result.current.cambiarPagina(3));
    await waitFor(() => expect(result.current.pagina).toBe(1));
    s.listar.mockRejectedValueOnce("x");
    act(() => result.current.cambiarPagina(2));
    await waitFor(() => expect(result.current.error).toBe("No se pudieron cargar los movimientos del inventario."));
    s.listar.mockRejectedValueOnce(new ErrorApi("x", 401));
    act(() => result.current.cambiarPagina(3));
    await waitFor(() => expect(navegar).toHaveBeenCalledWith("/login", { replace: true }));
  });

  it("busca productos con espera y limita los resultados", async () => {
    s.buscarProductos.mockResolvedValueOnce(Array.from({ length: 15 }, (_, i) => ({ ...producto, id: `p${i}` })));
    const { result } = await montar();
    act(() => result.current.setProductoBusqueda("fil"));
    expect(result.current.buscandoProductos).toBe(false);
    act(() => result.current.setProductoBusqueda("filtro"));
    expect(result.current.buscandoProductos).toBe(true);
    await waitFor(() => expect(result.current.productosEncontrados).toHaveLength(10));
    expect(s.buscarProductos).toHaveBeenCalledWith("filtro");
    s.buscarProductos.mockRejectedValueOnce(new Error("Caído"));
    act(() => result.current.setProductoBusqueda("filtros"));
    await waitFor(() => expect(result.current.error).toBe("Caído"));
    expect(result.current.buscandoProductos).toBe(false);
  });

  it("elige productos recientes o informa si ya no existen", async () => {
    const { result } = await montar();
    s.buscarProductos.mockResolvedValueOnce([producto]).mockResolvedValueOnce([]).mockRejectedValueOnce("x");
    await act(() => result.current.elegirProductoReciente({ id: "p1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.productoElegido).toEqual(producto);
    expect(result.current.productosRecientes[0]).toMatchObject({ id: "p1", detalle: "Bosch" });
    await act(() => result.current.elegirProductoReciente({ id: "p1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("El producto ya no está disponible en el inventario.");
    await act(() => result.current.elegirProductoReciente({ id: "p1", nombre: "Filtro", codigo: "R-1" }));
    expect(result.current.error).toBe("No se pudo volver a cargar el producto.");
  });

  it("proyecta el saldo según el tipo de ajuste", async () => {
    const { result } = await montar();
    act(() => result.current.elegirProducto(producto));
    expect(result.current.cantidadProyectada).toBe(10);
    act(() => { result.current.setCantidad("4"); });
    expect(result.current.cantidadProyectada).toBe(4);
    act(() => result.current.setSentido("INGRESO"));
    expect(result.current.cantidadProyectada).toBe(14);
    act(() => result.current.setSentido("RETIRO"));
    expect(result.current.cantidadProyectada).toBe(6);
    act(() => result.current.limpiarProducto());
    expect(result.current.productoElegido).toBeNull();
    expect(result.current.cantidadProyectada).toBe(0);
  });

  it("valida el ajuste antes de enviarlo", async () => {
    const { result } = await montar();
    act(() => result.current.abrirNuevo());
    expect(result.current.modalAbierto).toBe(true);
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Busca y selecciona el producto que vas a ajustar.");
    act(() => result.current.elegirProducto(producto));
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Ingresa el total contado con hasta 3 decimales.");
    act(() => { result.current.setSentido("INGRESO"); result.current.setCantidad("0"); });
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Ingresa una cantidad mayor que cero con hasta 3 decimales.");
    act(() => result.current.setCantidad("1.2345"));
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("Ingresa una cantidad mayor que cero con hasta 3 decimales.");
    act(() => { result.current.setSentido("RETIRO"); result.current.setCantidad("11"); });
    await act(() => result.current.guardar(evento()));
    expect(result.current.error).toBe("La cantidad supera el stock disponible.");
    expect(s.crearAjuste).not.toHaveBeenCalled();
  });

  it("registra un conteo y recarga la primera página", async () => {
    s.crearAjuste.mockResolvedValue({ id: "a1", saldoFinal: "1234.5" });
    const { result } = await montar();
    act(() => { result.current.abrirNuevo(); result.current.elegirProducto(producto); });
    act(() => { result.current.setCantidad(" 0 "); result.current.setMotivo("MERMA"); result.current.setObservacion("  rota "); });
    await act(() => result.current.guardar(evento()));
    expect(s.crearAjuste).toHaveBeenCalledWith({ productoId: "p1", saldoEsperado: "10", cantidadContada: "0", motivo: "MERMA", observacion: "rota" });
    expect(result.current.mensaje).toBe("Ajuste registrado. Saldo final: 1,234.5 unidades.");
    expect(result.current.modalAbierto).toBe(false);
    expect(s.listar).toHaveBeenCalledTimes(2);
  });

  it("registra un ingreso desde otra página volviendo a la primera", async () => {
    s.crearAjuste.mockResolvedValue({ id: "a1", saldoFinal: "12" });
    const { result } = await montar();
    act(() => result.current.cambiarPagina(2));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(2, 10, "", "AJUSTE"));
    act(() => result.current.elegirProducto(producto));
    act(() => { result.current.setSentido("INGRESO"); result.current.setCantidad("2"); });
    await act(() => result.current.guardar(evento()));
    expect(s.crearAjuste).toHaveBeenCalledWith(expect.objectContaining({ sentido: "INGRESO", cantidad: "2" }));
    expect(result.current.pagina).toBe(1);
  });

  it("informa si el ajuste falla y no cierra mientras guarda", async () => {
    let rechazar!: (e: unknown) => void;
    s.crearAjuste.mockReturnValueOnce(new Promise((_r, rej) => { rechazar = rej; }));
    const { result } = await montar();
    act(() => { result.current.abrirNuevo(); result.current.elegirProducto(producto); });
    act(() => result.current.setCantidad("3"));
    let guardado!: Promise<void>;
    act(() => { guardado = result.current.guardar(evento()); });
    act(() => result.current.cerrarModal());
    expect(result.current.modalAbierto).toBe(true);
    await act(async () => { rechazar("x"); await guardado; });
    expect(result.current.error).toBe("No se pudo registrar el ajuste de inventario.");
    act(() => result.current.cerrarModal());
    expect(result.current.modalAbierto).toBe(false);
    act(() => { result.current.setError("e"); result.current.setMensaje("m"); });
    expect(result.current.mensaje).toBe("m");
  });
});
