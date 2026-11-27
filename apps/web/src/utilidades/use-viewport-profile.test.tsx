import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useViewportProfile } from "./use-viewport-profile";

const tamanioOriginal = { ancho: window.innerWidth, alto: window.innerHeight };

function cambiarTamanio(ancho: number, alto: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: ancho });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: alto });
}

afterEach(() => cambiarTamanio(tamanioOriginal.ancho, tamanioOriginal.alto));

describe("useViewportProfile", () => {
  it("lee el perfil actual de la ventana", () => {
    cambiarTamanio(1440, 900);
    const { result } = renderHook(() => useViewportProfile());
    expect(result.current).toBe("laptop");
  });

  it("se actualiza al redimensionar y al girar el dispositivo", () => {
    cambiarTamanio(1440, 900);
    const { result } = renderHook(() => useViewportProfile());
    act(() => { cambiarTamanio(375, 667); window.dispatchEvent(new Event("resize")); });
    expect(result.current).toBe("mobile-portrait");
    act(() => { cambiarTamanio(667, 375); window.dispatchEvent(new Event("orientationchange")); });
    expect(result.current).toBe("mobile-landscape");
  });

  it("deja de escuchar la ventana al desmontarse", () => {
    const quitar = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useViewportProfile());
    unmount();
    expect(quitar).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(quitar).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });

  it("asume una laptop al renderizar en el servidor", () => {
    cambiarTamanio(375, 667);
    function Perfil() { return <span>{useViewportProfile()}</span>; }
    expect(renderToString(<Perfil />)).toContain("laptop");
  });
});
