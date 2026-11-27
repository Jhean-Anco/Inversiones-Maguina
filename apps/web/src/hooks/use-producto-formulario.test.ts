import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { useProductoFormulario } from "./use-producto-formulario";
import type { Producto } from "../services/inventario/productos.service";

const evento = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;
const catalogos = { categorias: [], marcas: [], unidadesMedida: [], tiposListasPrecio: [] };
const producto = {
  nombre: "Filtro", descripcion: "Desc", categoriaId: "c1", marcaId: "m1", unidadBaseCodigo: "KGM", stockMinimo: "5", afectoIgv: false, activo: false,
  fichaTecnica: { rosca: "M20", peso: 1.5, original: true, nada: null }, codigos: [{ id: "k1", tipo: "BARRAS", codigo: "775" }, { tipo: "GTIN", codigo: "1" }],
  presentaciones: [{ id: "b", clave: "base", esBase: true }, { id: "x1", clave: "caja", nombre: "Caja", unidadMedidaCodigo: "BX", factorAUnidadBase: "12", seCompra: true, seVende: true }, { id: "x2", nombre: "Pack" }],
} as unknown as Producto;

function montar(props: Partial<Parameters<typeof useProductoFormulario>[0]> = {}) {
  const alGuardar = vi.fn().mockResolvedValue(true);
  const alCrearMarca = vi.fn();
  const alCrearCategoria = vi.fn();
  const hook = renderHook((p: Parameters<typeof useProductoFormulario>[0]) => useProductoFormulario(p), { initialProps: { catalogos, alGuardar, alCrearMarca, alCrearCategoria, ...props } });
  return { ...hook, alGuardar, alCrearMarca, alCrearCategoria };
}

afterEach(() => vi.unstubAllGlobals());

describe("useProductoFormulario", () => {
  it("inicia vacío en modo creación", () => {
    const { result } = montar();
    expect(result.current).toMatchObject({ nombre: "", unidadBaseCodigo: "NIU", stockMinimo: "0", afectacionIgv: "GRAVADO", activo: true, modoEdicion: false, ficha: [], codigos: [], presentaciones: [] });
  });

  it("carga los datos del producto a editar", () => {
    const { result } = montar({ producto });
    expect(result.current).toMatchObject({ nombre: "Filtro", descripcion: "Desc", categoriaId: "c1", marcaId: "m1", unidadBaseCodigo: "KGM", stockMinimo: "5", afectacionIgv: "INAFECTO", activo: false, modoEdicion: true });
    expect(result.current.ficha.map(({ clave, valor }) => [clave, valor])).toEqual([["rosca", "M20"], ["peso", "1.5"], ["original", "true"], ["nada", ""]]);
    expect(result.current.codigos.map((c) => c.clave)[0]).toBe("k1");
    expect(result.current.presentaciones.map((p) => p.clave)).toEqual(["caja", "x2"]);
    const { result: r2 } = montar({ producto: { ...producto, afectacionIgv: "EXONERADO", descripcion: null } as Producto });
    expect(r2.current.afectacionIgv).toBe("EXONERADO");
    expect(r2.current.descripcion).toBe("");
  });

  it("crea marcas validando el nombre", async () => {
    const { result, alCrearMarca } = montar();
    await act(() => result.current.crearMarca());
    expect(result.current.errorLocal).toBe("Escribe el nombre de la marca.");
    alCrearMarca.mockResolvedValueOnce({ id: "m9", nombre: "Bosch", advertencia: "Duplicada" }).mockResolvedValueOnce({ id: "m8", nombre: "X" }).mockRejectedValueOnce(new Error("Sin permiso")).mockRejectedValueOnce("x");
    act(() => { result.current.setMarcaNueva("Bosch"); result.current.setMarcaModalAbierto(true); });
    await act(() => result.current.crearMarca());
    expect(result.current).toMatchObject({ marcaId: "m9", marcaNueva: "", marcaModalAbierto: false, errorLocal: "Duplicada", creandoMarca: false });
    act(() => result.current.setMarcaNueva("XX"));
    await act(() => result.current.crearMarca());
    expect(result.current.errorLocal).toBe("");
    act(() => result.current.setMarcaNueva("XX"));
    await act(() => result.current.crearMarca());
    expect(result.current.errorLocal).toBe("Sin permiso");
    await act(() => result.current.crearMarca());
    expect(result.current.errorLocal).toBe("No se pudo crear la marca.");
  });

  it("crea categorías validando el nombre", async () => {
    const { result, alCrearCategoria } = montar();
    await act(() => result.current.crearCategoria());
    expect(result.current.errorLocal).toBe("Escribe el nombre de la categoría.");
    alCrearCategoria.mockResolvedValueOnce({ id: "c9", nombre: "A", advertencia: "Aviso" }).mockResolvedValueOnce({ id: "c8", nombre: "B" }).mockRejectedValueOnce(new Error("Error")).mockRejectedValueOnce(1);
    act(() => { result.current.setCategoriaNueva("Aceites"); result.current.setCategoriaModalAbierto(true); });
    await act(() => result.current.crearCategoria());
    expect(result.current).toMatchObject({ categoriaId: "c9", categoriaNueva: "", categoriaModalAbierto: false, errorLocal: "Aviso", creandoCategoria: false });
    act(() => result.current.setCategoriaNueva("Aceites"));
    await act(() => result.current.crearCategoria());
    expect(result.current.categoriaId).toBe("c8");
    act(() => result.current.setCategoriaNueva("Aceites"));
    await act(() => result.current.crearCategoria());
    expect(result.current.errorLocal).toBe("Error");
    await act(() => result.current.crearCategoria());
    expect(result.current.errorLocal).toBe("No se pudo crear la categoría.");
  });

  it("agrega presentaciones con claves generadas aun sin randomUUID", () => {
    vi.stubGlobal("crypto", {});
    const { result } = montar();
    act(() => result.current.agregarPresentacion());
    expect(result.current.presentaciones[0]).toMatchObject({ unidadMedidaCodigo: "BX", nombre: "Caja", factorAUnidadBase: "12", seCompra: true, seVende: false });
    expect(result.current.presentaciones[0].clave).toMatch(/^presentacion-/);
  });

  it("exige marca antes de guardar", async () => {
    const { result, alGuardar } = montar();
    await act(() => result.current.guardar(evento()));
    expect(result.current.errorLocal).toBe("Selecciona o crea la marca del producto.");
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("normaliza la ficha técnica, los códigos y las presentaciones al guardar", async () => {
    const { result, alGuardar } = montar({ producto });
    act(() => {
      result.current.setFicha([{ id: "1", clave: " sí ", valor: "true" }, { id: "2", clave: "no", valor: "false" }, { id: "3", clave: "n", valor: " 12 " }, { id: "4", clave: "t", valor: "abc" }, { id: "5", clave: "v", valor: " " }, { id: "6", clave: "  ", valor: "x" }]);
      result.current.setCodigos([{ clave: "a", tipo: "BARRAS", codigo: " 775 " }, { clave: "b", tipo: "GTIN", codigo: " " }]);
      result.current.setDescripcion("  ");
      result.current.setAfectacionIgv("GRAVADO");
    });
    await act(() => result.current.guardar(evento()));
    expect(alGuardar).toHaveBeenCalledWith({
      nombre: "Filtro", descripcion: null, categoriaId: "c1", marcaId: "m1", unidadBaseCodigo: "KGM", stockMinimo: "5", afectacionIgv: "GRAVADO", afectoIgv: true, activo: false,
      fichaTecnica: { sí: true, no: false, n: 12, t: "abc", v: null },
      codigos: [{ tipo: "BARRAS", codigo: "775" }],
      presentaciones: [{ clave: "caja", unidadMedidaCodigo: "BX", nombre: "Caja", factorAUnidadBase: "12", seCompra: true, seVende: true }, { clave: "x2", unidadMedidaCodigo: undefined, nombre: "Pack", factorAUnidadBase: undefined, seCompra: undefined, seVende: undefined }],
    });
    expect(result.current.guardando).toBe(false);
  });

  it("libera el estado de guardado aunque el guardado falle", async () => {
    const { result, alGuardar } = montar({ producto });
    alGuardar.mockRejectedValueOnce(new Error("x"));
    await act(async () => { await expect(result.current.guardar(evento())).rejects.toThrow("x"); });
    expect(result.current.guardando).toBe(false);
  });
});
