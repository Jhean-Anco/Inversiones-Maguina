import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConfirmarCancelacionFormulario } from "./use-confirmar-cancelacion-formulario";

let formulario: HTMLFormElement;
let referencia: { current: HTMLFormElement | null };
const sinFormulario = { current: null };

beforeEach(() => {
  formulario = document.createElement("form");
  formulario.innerHTML = `
    <input name="nombre" value="Ana" />
    <input name="activo" type="checkbox" />
    <select name="tipos" multiple><option value="a" selected>A</option><option value="b">B</option></select>
    <textarea name="nota"></textarea>
    <fieldset></fieldset>
    <button type="submit">Guardar</button>`;
  document.body.append(formulario);
  referencia = { current: formulario };
});

afterEach(() => { document.body.innerHTML = ""; });

describe("useConfirmarCancelacionFormulario", () => {
  it("descarta directamente cuando el formulario no cambió", () => {
    const onDescartar = vi.fn();
    const { result } = renderHook(() => useConfirmarCancelacionFormulario(referencia, onDescartar, "el cliente"));
    act(() => result.current.solicitarCancelacion());
    expect(onDescartar).toHaveBeenCalledOnce();
    expect(result.current.dialogo).toBeNull();
  });

  it.each([
    ["un texto", () => { formulario.querySelector<HTMLInputElement>("[name=nombre]")!.value = "Luis"; }],
    ["una casilla", () => { formulario.querySelector<HTMLInputElement>("[name=activo]")!.checked = true; }],
    ["una selección múltiple", () => { formulario.querySelector<HTMLSelectElement>("[name=tipos]")!.options[1].selected = true; }],
    ["un área de texto", () => { formulario.querySelector<HTMLTextAreaElement>("[name=nota]")!.value = "x"; }],
  ])("pide confirmación cuando cambia %s", (_nombre, modificar) => {
    const onDescartar = vi.fn();
    const { result } = renderHook(() => useConfirmarCancelacionFormulario(referencia, onDescartar, "el cliente"));
    modificar();
    act(() => result.current.solicitarCancelacion());
    expect(onDescartar).not.toHaveBeenCalled();
    expect(result.current.dialogo).not.toBeNull();
  });

  it("permite seguir editando o descartar desde la confirmación", async () => {
    const usuario = userEvent.setup();
    const primera = vi.fn();
    const segunda = vi.fn();
    function Formulario({ alDescartar }: { alDescartar: () => void }) {
      const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(referencia, alDescartar, "el cliente");
      return <><button type="button" onClick={solicitarCancelacion}>Cancelar</button>{dialogo}</>;
    }
    const { rerender } = render(<Formulario alDescartar={primera} />);
    formulario.querySelector<HTMLInputElement>("[name=nombre]")!.value = "Luis";

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("¿Descartar el cliente?")).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByText("¿Descartar el cliente?")).toBeNull();

    rerender(<Formulario alDescartar={segunda} />);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await usuario.click(screen.getByRole("button", { name: "Descartar el cliente" }));
    expect(screen.queryByText("¿Descartar el cliente?")).toBeNull();
    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledOnce();
  });

  it("compara la firma de datos cuando el formulario la provee", () => {
    const onDescartar = vi.fn();
    const { result } = renderHook(() => useConfirmarCancelacionFormulario(sinFormulario, onDescartar, "la compra", "[1]"));
    act(() => result.current.solicitarCancelacion());
    expect(onDescartar).toHaveBeenCalledOnce();
  });

  it("descarta sin confirmación si no hay formulario", () => {
    const onDescartar = vi.fn();
    const { result } = renderHook(() => useConfirmarCancelacionFormulario(sinFormulario, onDescartar, "la guía"));
    act(() => result.current.solicitarCancelacion());
    expect(onDescartar).toHaveBeenCalledOnce();
  });

  // Error conocido: `solicitarCancelacion` se memoriza solo con `[referencia]`, así que conserva la `firmaDatos`
  // del primer render. Cuando el formulario informa cambios por `firmaDatos` (compras, productos, modelos de mototaxi,
  // garantías), la comparación usa siempre la firma inicial y el diálogo de confirmación nunca aparece.
  it("pide confirmación cuando cambia la firma de datos", () => {
    const onDescartar = vi.fn();
    const { result, rerender } = renderHook(({ firma }) => useConfirmarCancelacionFormulario(sinFormulario, onDescartar, "la compra", firma), { initialProps: { firma: "[]" } });
    rerender({ firma: '[{"producto":"p1"}]' });
    act(() => result.current.solicitarCancelacion());
    expect(onDescartar).not.toHaveBeenCalled();
    expect(result.current.dialogo).not.toBeNull();
  });
});
