import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProductos } from "./use-productos";
import { ErrorApi } from "../services/api-cliente";
import { servicioProductos, type DatosProducto, type PaginaProductos } from "../services/inventario/productos.service";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));
vi.mock("../services/inventario/productos.service", () => ({
  servicioProductos: { catalogos: vi.fn(), listar: vi.fn(), guardar: vi.fn(), consultar: vi.fn(), crearMarca: vi.fn(), crearCategoria: vi.fn(), cambiarEstado: vi.fn() },
}));

const s = vi.mocked(servicioProductos);
const pagina = (cambios: Partial<PaginaProductos> = {}) => ({ items: [{ id: "p1" }], total: 25, pagina: 1, porPagina: 10, totalPaginas: 3, conteosStock: { todos: 25, conStock: 20, sinStock: 5 }, conteosEstado: { todos: 25, activos: 24, inactivos: 1, stockBajo: 2 }, ...cambios }) as PaginaProductos;
const catalogos = { categorias: [{ id: "c2", nombre: "Motor" }], marcas: [{ id: "m2", nombre: "Zeta" }], unidadesMedida: [], tiposListasPrecio: [] };

async function montar() {
  const hook = renderHook(() => useProductos());
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return hook;
}

beforeEach(() => {
  navegar.mockReset();
  Object.values(s).forEach((f) => f.mockReset());
  s.catalogos.mockResolvedValue(catalogos);
  s.listar.mockResolvedValue(pagina());
});

describe("useProductos", () => {
  it("carga catálogos y la primera página", async () => {
    const { result } = await montar();
    expect(s.listar).toHaveBeenCalledWith(1, 10, "", { estado: "ACTIVOS", marca: "", precio: "TODOS", existencia: "TODOS" });
    expect(result.current).toMatchObject({ total: 25, totalPaginas: 3, desde: 1, hasta: 10, catalogos });
    expect(result.current.productos).toEqual([{ id: "p1" }]);
  });

  it("reporta errores de catálogo y de listado, y redirige si expira la sesión", async () => {
    s.catalogos.mockRejectedValueOnce("x");
    s.listar.mockRejectedValueOnce(new Error("Listado caído"));
    const { result } = await montar();
    expect(["Listado caído", "No se pudieron cargar los catálogos del producto."]).toContain(result.current.error);
    s.listar.mockRejectedValueOnce({});
    await act(() => result.current.cargarPagina(1, 10, ""));
    expect(result.current.error).toBe("No se pudo cargar el catálogo de productos.");
    s.listar.mockRejectedValueOnce(new ErrorApi("exp", 401));
    await act(() => result.current.cargarPagina(1, 10, ""));
    expect(navegar).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("ajusta la página si supera el total y aplica filtros reiniciando la página", async () => {
    const { result } = await montar();
    s.listar.mockResolvedValue(pagina({ totalPaginas: 2, total: 0, items: [] }));
    act(() => result.current.cambiarPagina(3));
    await waitFor(() => expect(result.current.pagina).toBe(2));
    expect(result.current.desde).toBe(0);
    act(() => { result.current.setEstado("ACTIVOS"); result.current.setMarca("m1"); result.current.setPrecio("SIN"); result.current.setExistencia("SIN_STOCK"); });
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 10, "", { estado: "ACTIVOS", marca: "m1", precio: "SIN", existencia: "SIN_STOCK" }));
    act(() => result.current.setBusqueda("filtro"));
    await waitFor(() => expect(s.listar).toHaveBeenLastCalledWith(1, 10, "filtro", expect.any(Object)));
  });

  it("descarta respuestas obsoletas", async () => {
    const { result } = await montar();
    let lenta!: (p: PaginaProductos) => void;
    s.listar.mockReturnValueOnce(new Promise((r) => { lenta = r; })).mockResolvedValueOnce(pagina({ total: 99 }));
    let primera!: Promise<void>;
    act(() => { primera = result.current.cargarPagina(1, 10, ""); });
    await act(() => result.current.cargarPagina(1, 10, ""));
    await act(async () => { lenta(pagina({ total: 1 })); await primera; });
    expect(result.current.total).toBe(99);
  });

  it("cambia el tamaño de página solo a valores permitidos", async () => {
    const { result } = await montar();
    act(() => result.current.cambiarPorPagina(7));
    expect(result.current.porPagina).toBe(10);
    act(() => result.current.cambiarPorPagina(4));
    expect(result.current.porPagina).toBe(4);
  });

  it("guarda productos mostrando advertencias o errores", async () => {
    const { result } = await montar();
    s.guardar.mockResolvedValueOnce({ producto: {} as never, advertencia: "Revisar precio" }).mockResolvedValueOnce({ producto: {} as never }).mockRejectedValueOnce("x");
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.guardar({} as DatosProducto, "p1"); });
    expect(ok).toBe(true);
    expect(s.guardar).toHaveBeenCalledWith({}, "p1");
    expect(result.current.error).toBe("Revisar precio");
    await act(async () => { ok = await result.current.guardar({} as DatosProducto); });
    expect(result.current.error).toBe("");
    await act(async () => { ok = await result.current.guardar({} as DatosProducto); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("No se pudo guardar el producto.");
  });

  it("consulta un producto", async () => {
    const { result } = await montar();
    s.consultar.mockResolvedValueOnce({ id: "p1" } as never).mockRejectedValueOnce(new Error("No existe"));
    await expect(result.current.consultar("p1")).resolves.toEqual({ id: "p1" });
    let r: unknown;
    await act(async () => { r = await result.current.consultar("p2"); });
    expect(r).toBeNull();
    expect(result.current.error).toBe("No existe");
  });

  it("agrega marcas y categorías ordenadas alfabéticamente", async () => {
    const { result } = await montar();
    s.crearMarca.mockResolvedValue({ marca: { id: "m1", nombre: "Bosch" }, advertencia: undefined });
    s.crearCategoria.mockResolvedValue({ categoria: { id: "c1", nombre: "Aceites" } as never, advertencia: "ok" });
    await act(async () => { expect(await result.current.crearMarca("  Bosch ")).toEqual({ id: "m1", nombre: "Bosch", advertencia: undefined }); });
    expect(s.crearMarca).toHaveBeenCalledWith("Bosch");
    await act(async () => { expect(await result.current.crearCategoria("Aceites")).toMatchObject({ id: "c1", advertencia: "ok" }); });
    expect(result.current.catalogos.marcas.map((m) => m.nombre)).toEqual(["Bosch", "Zeta"]);
    expect(result.current.catalogos.categorias.map((m) => m.nombre)).toEqual(["Aceites", "Motor"]);
  });

  it("cambia el estado de un producto", async () => {
    const { result } = await montar();
    s.cambiarEstado.mockResolvedValueOnce({ id: "p1", activo: false }).mockRejectedValueOnce("x");
    await act(() => result.current.cambiarEstado({ id: "p1", activo: true }));
    expect(s.cambiarEstado).toHaveBeenCalledWith("p1", false);
    await act(() => result.current.cambiarEstado({ id: "p1", activo: false }));
    expect(result.current.error).toBe("No se pudo actualizar el estado del producto.");
    act(() => result.current.setError(""));
    expect(result.current.error).toBe("");
  });
});
