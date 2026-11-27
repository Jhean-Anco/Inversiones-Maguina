import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCatalogo } from "./use-catalogo";
import { ErrorApi } from "../services/api-cliente";
import type { CategoriaCatalogo, ServicioCatalogo } from "../services/inventario/catalogos.service";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));

const filtros: CategoriaCatalogo = { id: "c1", nombre: "Filtros", activo: true };
const frenos: CategoriaCatalogo = { id: "c2", nombre: "Frenos", activo: false };

function crearServicio() {
  return {
    listar: vi.fn<ServicioCatalogo<CategoriaCatalogo>["listar"]>().mockResolvedValue([filtros]),
    guardar: vi.fn<ServicioCatalogo<CategoriaCatalogo>["guardar"]>().mockResolvedValue(frenos),
    cambiarEstado: vi.fn<ServicioCatalogo<CategoriaCatalogo>["cambiarEstado"]>().mockResolvedValue(undefined),
  };
}

async function montar(servicio = crearServicio()) {
  const hook = renderHook(() => useCatalogo(servicio, "No se pudo cargar el catálogo."));
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return { ...hook, servicio };
}

beforeEach(() => navegar.mockReset());

describe("useCatalogo", () => {
  it("carga los registros al montarse", async () => {
    const { result, servicio } = await montar();
    expect(servicio.listar).toHaveBeenCalledOnce();
    expect(result.current.registros).toEqual([filtros]);
    expect(result.current.error).toBe("");
  });

  it("muestra el error de carga o el mensaje alternativo", async () => {
    const servicio = crearServicio();
    servicio.listar.mockRejectedValueOnce(new Error("Servidor caído"));
    const { result } = await montar(servicio);
    expect(result.current.error).toBe("Servidor caído");

    servicio.listar.mockRejectedValueOnce("fallo raro");
    await act(() => result.current.recargar());
    expect(result.current.error).toBe("No se pudo cargar el catálogo.");

    await act(() => result.current.recargar());
    expect(result.current.error).toBe("");
  });

  it("redirige al inicio de sesión cuando la sesión expiró", async () => {
    const servicio = crearServicio();
    servicio.listar.mockRejectedValue(new ErrorApi("Sesión expirada", 401));
    const { result } = await montar(servicio);
    expect(navegar).toHaveBeenCalledWith("/login", { replace: true });
    expect(result.current.error).toBe("");
  });

  it("crea un registro, avisa al crearlo y recarga el listado", async () => {
    const { result, servicio } = await montar();
    const alCrear = vi.fn();
    const alCompletar = vi.fn();
    let exito = false;
    await act(async () => { exito = await result.current.guardar({ nombre: "Frenos", uso: "REPUESTOS" }, alCrear, alCompletar); });
    expect(exito).toBe(true);
    expect(servicio.guardar).toHaveBeenCalledWith({ nombre: "Frenos", uso: "REPUESTOS" });
    expect(alCrear).toHaveBeenCalledWith(frenos);
    expect(alCompletar).toHaveBeenCalledOnce();
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(result.current.guardando).toBe(false);
  });

  it("al editar no invoca alCrear y funciona sin callbacks", async () => {
    const { result, servicio } = await montar();
    const alCrear = vi.fn();
    await act(async () => { await result.current.guardar({ nombre: "Filtros", id: "c1" }, alCrear); });
    await act(async () => { await result.current.guardar({ nombre: "Otro" }); });
    expect(servicio.guardar).toHaveBeenNthCalledWith(1, { nombre: "Filtros", id: "c1" });
    expect(alCrear).not.toHaveBeenCalled();
  });

  it("informa si no se pudo guardar", async () => {
    const { result, servicio } = await montar();
    servicio.guardar.mockRejectedValueOnce(new Error("Nombre duplicado")).mockRejectedValueOnce(null);
    let exito = true;
    await act(async () => { exito = await result.current.guardar({ nombre: "Filtros" }); });
    expect(exito).toBe(false);
    expect(result.current.error).toBe("Nombre duplicado");
    await act(async () => { await result.current.guardar({ nombre: "Filtros" }); });
    expect(result.current.error).toBe("No se pudo guardar el registro.");
    expect(result.current.guardando).toBe(false);
  });

  it("cambia el estado de un registro y recarga", async () => {
    const { result, servicio } = await montar();
    await act(() => result.current.cambiarEstado(filtros));
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(filtros);
    expect(servicio.listar).toHaveBeenCalledTimes(2);

    servicio.cambiarEstado.mockRejectedValueOnce({});
    await act(() => result.current.cambiarEstado(filtros));
    expect(result.current.error).toBe("No se pudo actualizar el estado.");
  });

  it("permite limpiar el error manualmente", async () => {
    const servicio = crearServicio();
    servicio.listar.mockRejectedValueOnce(new Error("x"));
    const { result } = await montar(servicio);
    act(() => result.current.setError(""));
    expect(result.current.error).toBe("");
  });
});
