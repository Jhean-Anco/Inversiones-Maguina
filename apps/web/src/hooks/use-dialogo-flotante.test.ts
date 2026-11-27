import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDialogoFlotante } from "./use-dialogo-flotante";

let dialogo: HTMLDivElement;
let disparador: HTMLButtonElement;

function crearDialogo() {
  const contenedor = document.createElement("div");
  contenedor.setAttribute("aria-modal", "true");
  contenedor.innerHTML = `
    <input id="deshabilitado" disabled />
    <input id="nombre" />
    <select id="tipo"><option>A</option></select>
    <button id="guardar" type="button">Guardar</button>`;
  document.body.append(contenedor);
  return contenedor;
}

const presionar = (key: string, shiftKey = false) => {
  const evento = new KeyboardEvent("keydown", { key, shiftKey, cancelable: true });
  window.dispatchEvent(evento);
  return evento;
};

beforeEach(() => {
  disparador = document.createElement("button");
  document.body.append(disparador);
  disparador.focus();
  dialogo = crearDialogo();
  // jsdom no calcula el layout: se considera visible todo elemento conectado.
  Object.defineProperty(HTMLElement.prototype, "offsetParent", { configurable: true, get() { return (this as HTMLElement).parentElement; } });
});

afterEach(() => {
  delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("useDialogoFlotante", () => {
  it("no hace nada mientras el diálogo está cerrado", () => {
    const cerrar = vi.fn();
    renderHook(() => useDialogoFlotante({ current: dialogo }, false, cerrar));
    presionar("Escape");
    expect(cerrar).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
  });

  it("bloquea el scroll del fondo y enfoca el primer control habilitado", async () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderHook(() => useDialogoFlotante({ current: dialogo }, true, vi.fn()));
    expect(document.body.style.overflow).toBe("hidden");
    await waitFor(() => expect(document.activeElement?.id).toBe("nombre"));
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(disparador);
  });

  it("cierra con Escape usando la última función recibida", () => {
    const primera = vi.fn();
    const segunda = vi.fn();
    const { rerender } = renderHook(({ cerrar }) => useDialogoFlotante({ current: dialogo }, true, cerrar), { initialProps: { cerrar: primera } });
    rerender({ cerrar: segunda });
    presionar("Escape");
    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledOnce();
  });

  it("mantiene el foco dentro del diálogo con Tab y Shift+Tab", () => {
    renderHook(() => useDialogoFlotante({ current: dialogo }, true, vi.fn()));
    const nombre = dialogo.querySelector<HTMLInputElement>("#nombre")!;
    const guardar = dialogo.querySelector<HTMLButtonElement>("#guardar")!;

    guardar.focus();
    expect(presionar("Tab").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(nombre);

    expect(presionar("Tab", true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(guardar);

    dialogo.querySelector<HTMLSelectElement>("#tipo")!.focus();
    expect(presionar("Tab").defaultPrevented).toBe(false);
    expect(presionar("Tab", true).defaultPrevented).toBe(false);
    expect(presionar("Enter").defaultPrevented).toBe(false);
  });

  it("ignora Tab cuando el diálogo no tiene controles visibles o no existe", () => {
    const vacio = document.createElement("div");
    vacio.setAttribute("aria-modal", "true");
    document.body.append(vacio);
    const { unmount } = renderHook(() => useDialogoFlotante({ current: vacio }, true, vi.fn()));
    expect(presionar("Tab").defaultPrevented).toBe(false);
    unmount();

    vacio.remove();
    dialogo.remove();
    const cerrar = vi.fn();
    renderHook(() => useDialogoFlotante({ current: null }, true, cerrar));
    expect(presionar("Tab").defaultPrevented).toBe(false);
    presionar("Escape");
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it("solo responde el diálogo superior cuando hay varios abiertos", () => {
    const cerrarInferior = vi.fn();
    renderHook(() => useDialogoFlotante({ current: dialogo }, true, cerrarInferior));
    const superior = crearDialogo();
    const cerrarSuperior = vi.fn();
    renderHook(() => useDialogoFlotante({ current: superior }, true, cerrarSuperior));
    presionar("Escape");
    expect(cerrarSuperior).toHaveBeenCalledOnce();
    expect(cerrarInferior).not.toHaveBeenCalled();
  });
});
