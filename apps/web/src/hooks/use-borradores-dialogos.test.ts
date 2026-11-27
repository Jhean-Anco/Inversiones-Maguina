import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBorradoresDialogos } from "./use-borradores-dialogos";

const PREFIJO = "magina:dialogo:";

function crearDialogo({ titulo = "Nuevo cliente", contexto = "Datos de contacto", etiquetado = true } = {}) {
  const dialogo = document.createElement("div");
  dialogo.setAttribute("role", "dialog");
  if (etiquetado) dialogo.setAttribute("aria-labelledby", "titulo-cliente");
  dialogo.className = "panel";
  dialogo.innerHTML = `
    <header><h2>${titulo}</h2><p>${contexto}</p></header>
    <form class="form-cliente">
      <input id="nombre" />
      <input name="tipo" type="radio" value="DNI" />
      <input name="tipo" type="radio" value="RUC" />
      <input name="acepta" type="checkbox" value="si" />
      <select name="ciudad"><option value="">-</option><option value="Lima">Lima</option></select>
      <textarea name="nota"></textarea>
      <label>Teléfono <input /></label>
      <input />
      <input type="password" id="clave" />
      <input type="hidden" id="token" value="t" />
      <button type="submit">Guardar</button>
    </form>`;
  document.body.append(dialogo);
  return dialogo;
}

const campo = <T extends Element>(raiz: ParentNode, selector: string) => raiz.querySelector<T & Element>(selector)! as T;
const escribir = (control: HTMLInputElement | HTMLTextAreaElement, valor: string) => { control.value = valor; control.dispatchEvent(new Event("input", { bubbles: true })); };
const marcar = (control: HTMLInputElement) => { control.checked = true; control.dispatchEvent(new Event("change", { bubbles: true })); };
const borradores = () => Object.keys(sessionStorage).filter((clave) => clave.startsWith(PREFIJO));
const leer = (clave: string) => JSON.parse(sessionStorage.getItem(clave)!) as Record<string, { valor: string; marcado?: boolean }>;
const siguienteCuadro = () => new Promise<void>((resolver) => window.requestAnimationFrame(() => resolver()));

function llenar(dialogo: HTMLElement) {
  escribir(campo<HTMLInputElement>(dialogo, "#nombre"), "Ana Pérez");
  marcar(campo<HTMLInputElement>(dialogo, "input[value=RUC]"));
  marcar(campo<HTMLInputElement>(dialogo, "input[name=acepta]"));
  const ciudad = campo<HTMLSelectElement>(dialogo, "select");
  ciudad.value = "Lima";
  ciudad.dispatchEvent(new Event("change", { bubbles: true }));
  escribir(campo<HTMLTextAreaElement>(dialogo, "textarea"), "Cliente frecuente");
  escribir(campo<HTMLInputElement>(dialogo, "label input"), "999 888 777");
  escribir(campo<HTMLInputElement>(dialogo, "form > input:not([id]):not([name])"), "sin etiqueta");
  escribir(campo<HTMLInputElement>(dialogo, "#clave"), "secreta");
}

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("useBorradoresDialogos", () => {
  it("guarda los campos del diálogo en la sesión sin incluir contraseñas ni campos ocultos", () => {
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(dialogo);

    const [clave] = borradores();
    expect(clave).toMatch(/^magina:dialogo:u1:\/clientes:titulo-cliente:[0-9a-z]+:form-cliente$/);
    const valores = leer(clave);
    expect(valores["INPUT:nombre"]).toEqual({ valor: "Ana Pérez" });
    expect(valores["INPUT:tipo:radio:RUC"]).toEqual({ valor: "RUC", marcado: true });
    expect(valores["INPUT:tipo:radio:DNI"]).toEqual({ valor: "DNI", marcado: false });
    expect(valores["INPUT:acepta:checkbox:si"]).toEqual({ valor: "si", marcado: true });
    expect(valores["SELECT:ciudad:"]).toEqual({ valor: "Lima" });
    expect(valores["TEXTAREA:nota:"]).toEqual({ valor: "Cliente frecuente" });
    expect(valores["INPUT:Teléfono:6"]).toEqual({ valor: "999 888 777" });
    expect(valores["INPUT:campo:7"]).toEqual({ valor: "sin etiqueta" });
    expect(JSON.stringify(valores)).not.toContain("secreta");
    expect(Object.keys(valores)).not.toContain("INPUT:token");
  });

  it("restaura el borrador cuando el mismo diálogo se vuelve a abrir", async () => {
    const primero = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(primero);
    primero.remove();

    const segundo = crearDialogo();
    const cambios = vi.fn();
    segundo.addEventListener("change", cambios);
    await waitFor(() => expect(campo<HTMLInputElement>(segundo, "#nombre").value).toBe("Ana Pérez"));
    expect(campo<HTMLInputElement>(segundo, "input[value=RUC]").checked).toBe(true);
    expect(campo<HTMLInputElement>(segundo, "input[value=DNI]").checked).toBe(false);
    expect(campo<HTMLInputElement>(segundo, "input[name=acepta]").checked).toBe(true);
    expect(campo<HTMLSelectElement>(segundo, "select").value).toBe("Lima");
    expect(campo<HTMLTextAreaElement>(segundo, "textarea").value).toBe("Cliente frecuente");
    expect(campo<HTMLInputElement>(segundo, "#clave").value).toBe("");
    expect(cambios).toHaveBeenCalled();
  });

  it("separa los borradores por usuario, ruta y contenido del diálogo", async () => {
    const dialogo = crearDialogo({ etiquetado: false });
    renderHook(() => useBorradoresDialogos("/proveedores", null));
    escribir(campo<HTMLInputElement>(dialogo, "#nombre"), "x");
    dialogo.remove();
    const otro = crearDialogo({ titulo: "Editar cliente", etiquetado: false });
    await Promise.resolve();
    escribir(campo<HTMLInputElement>(otro, "#nombre"), "y");
    const claves = borradores();
    expect(claves).toHaveLength(2);
    expect(claves.every((clave) => clave.startsWith(`${PREFIJO}sesion:/proveedores:panel:`))).toBe(true);
  });

  it("usa valores genéricos cuando el diálogo no tiene título", () => {
    const dialogo = document.createElement("div");
    dialogo.className = "catalog-modal";
    dialogo.innerHTML = `<form><input id="nombre" /></form>`;
    document.body.append(dialogo);
    renderHook(() => useBorradoresDialogos("/catalogo", "u1"));
    escribir(campo<HTMLInputElement>(dialogo, "#nombre"), "x");
    expect(borradores()[0]).toMatch(/^magina:dialogo:u1:\/catalogo:catalog-modal:[0-9a-z]+:$/);
  });

  it("ignora formularios fuera de diálogos", () => {
    const formulario = document.createElement("form");
    formulario.innerHTML = `<input id="buscar" />`;
    document.body.append(formulario);
    renderHook(() => useBorradoresDialogos("/ventas", "u1"));
    escribir(campo<HTMLInputElement>(formulario, "#buscar"), "boleta");
    expect(borradores()).toEqual([]);
  });

  it("elimina el borrador cuando el formulario se envía y el diálogo se cierra", async () => {
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(dialogo);
    campo<HTMLFormElement>(dialogo, "form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    dialogo.remove();
    await waitFor(() => expect(borradores()).toEqual([]));
  });

  it("elimina el borrador al vencer la espera posterior al envío si el formulario ya no está", () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(dialogo);
    const formulario = campo<HTMLFormElement>(dialogo, "form");
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    formulario.remove();
    expect(borradores()).toHaveLength(1);
    vi.advanceTimersByTime(1200);
    expect(borradores()).toEqual([]);
  });

  it("conserva el borrador si el envío terminó con error", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(dialogo);
    const formulario = campo<HTMLFormElement>(dialogo, "form");
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const error = document.createElement("p");
    error.setAttribute("data-error-formulario", "");
    formulario.append(error);
    await Promise.resolve();
    vi.advanceTimersByTime(1200);
    dialogo.remove();
    await Promise.resolve();
    expect(borradores()).toHaveLength(1);
  });

  it("conserva el borrador si el diálogo se cierra sin enviar", async () => {
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    llenar(dialogo);
    dialogo.remove();
    await Promise.resolve();
    expect(borradores()).toHaveLength(1);
  });

  it("no restaura si el formulario se cerró antes del siguiente cuadro", async () => {
    const primero = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    escribir(campo<HTMLInputElement>(primero, "#nombre"), "Ana");
    primero.remove();
    const segundo = crearDialogo();
    await Promise.resolve();
    segundo.remove();
    await siguienteCuadro();
    expect(campo<HTMLInputElement>(segundo, "#nombre").value).toBe("");
  });

  it("deja de guardar cuando el hook se desmonta", () => {
    const dialogo = crearDialogo();
    const { unmount } = renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    unmount();
    escribir(campo<HTMLInputElement>(dialogo, "#nombre"), "Ana");
    campo<HTMLFormElement>(dialogo, "form").dispatchEvent(new Event("submit"));
    expect(borradores()).toEqual([]);
  });

  it("sigue funcionando si el almacenamiento de sesión falla", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Cuota excedida", "QuotaExceededError"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Bloqueado", "SecurityError"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Bloqueado", "SecurityError"); });
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const dialogo = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    expect(() => llenar(dialogo)).not.toThrow();
    const formulario = campo<HTMLFormElement>(dialogo, "form");
    formulario.dispatchEvent(new Event("submit"));
    dialogo.remove();
    await Promise.resolve();
    expect(() => vi.advanceTimersByTime(1200)).not.toThrow();
  });

  it("ignora borradores dañados", async () => {
    const primero = crearDialogo();
    renderHook(() => useBorradoresDialogos("/clientes", "u1"));
    escribir(campo<HTMLInputElement>(primero, "#nombre"), "Ana");
    const [clave] = borradores();
    sessionStorage.setItem(clave, "{no es json");
    primero.remove();
    const segundo = crearDialogo();
    await Promise.resolve();
    await siguienteCuadro();
    expect(campo<HTMLInputElement>(segundo, "#nombre").value).toBe("");
  });
});
