import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useActualizacionPendientes } from "./use-actualizacion-pendientes";

describe("useActualizacionPendientes", () => {
  let visibilidad: DocumentVisibilityState;
  beforeEach(() => {
    vi.useFakeTimers();
    visibilidad = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilidad);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const montar = (activo: boolean, consultar = vi.fn().mockResolvedValue("nuevo")) => {
    const aplicar = vi.fn();
    const vista = renderHook((props: { activo: boolean; clave: string }) => useActualizacionPendientes({ ...props, consultar, aplicar, intervaloMs: 1000 }), { initialProps: { activo, clave: "a" } });
    return { consultar, aplicar, ...vista };
  };
  const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("no consulta si no hay pendientes", async () => {
    const { consultar } = montar(false);
    await avanzar(5000);
    expect(consultar).not.toHaveBeenCalled();
  });

  it("consulta cada intervalo y se detiene al resolverse", async () => {
    const { consultar, aplicar, rerender } = montar(true);
    await avanzar(2000);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(aplicar).toHaveBeenCalledWith("nuevo");
    rerender({ activo: false, clave: "a" });
    await avanzar(3000);
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it("se pausa con la pestaña oculta y refresca al volver", async () => {
    const { consultar } = montar(true);
    visibilidad = "hidden";
    await avanzar(3000);
    expect(consultar).not.toHaveBeenCalled();
    visibilidad = "visible";
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it("descarta respuestas de filtros anteriores y tolera fallos", async () => {
    let resolver: (valor: string) => void = () => undefined;
    const consultar = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((ok) => { resolver = ok; }))
      .mockRejectedValue(new Error("sin red"));
    const { aplicar, rerender } = montar(true, consultar);
    await avanzar(2000);
    expect(consultar).toHaveBeenCalledTimes(1);
    rerender({ activo: true, clave: "b" });
    await act(async () => { resolver("viejo"); });
    await avanzar(2000);
    expect(aplicar).not.toHaveBeenCalled();
    expect(consultar.mock.calls.length).toBeGreaterThan(1);
  });
});
