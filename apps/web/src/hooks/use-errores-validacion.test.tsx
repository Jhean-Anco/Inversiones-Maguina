import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useErroresValidacion } from "./use-errores-validacion";

function Prueba() {
  const { errores, propsFormulario } = useErroresValidacion();
  return (
    <form {...propsFormulario} aria-label="prueba">
      <input id="nombre" required aria-label="nombre" />
      <input aria-label="sin id" required />
      <input id="otro" required aria-label="otro" />
      <output data-testid="errores">{JSON.stringify(errores)}</output>
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("useErroresValidacion", () => {
  it("registra el mensaje nativo, enfoca el primer campo inválido y lo limpia al escribir", () => {
    render(<Prueba />);
    fireEvent.click(screen.getByText("Enviar"));
    const errores = JSON.parse(screen.getByTestId("errores").textContent ?? "{}") as Record<string, string>;
    expect(Object.keys(errores).sort()).toEqual(["nombre", "otro"]);
    expect(document.activeElement).toBe(screen.getByLabelText("nombre"));

    fireEvent.input(screen.getByLabelText("nombre"), { target: { value: "RIK" } });
    expect(Object.keys(JSON.parse(screen.getByTestId("errores").textContent ?? "{}"))).toEqual(["otro"]);
    fireEvent.input(screen.getByLabelText("sin id"), { target: { value: "x" } });
    expect(Object.keys(JSON.parse(screen.getByTestId("errores").textContent ?? "{}"))).toEqual(["otro"]);
  });
});
