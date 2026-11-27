import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampoFormulario } from "./campo-formulario";
import { SeccionFormulario } from "./seccion-formulario";

describe("CampoFormulario", () => {
  it("asocia etiqueta, ayuda y error con el control", () => {
    render(
      <CampoFormulario id="f" etiqueta="Cilindrada" unidad="cc" ayuda="Ayuda" error="Obligatorio" requerido>
        {(p) => <input {...p} />}
      </CampoFormulario>,
    );
    const control = screen.getByLabelText("Cilindrada");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-describedby")).toBe("f-error f-ayuda");
    expect(screen.getByText("Obligatorio").id).toBe("f-error");
    expect(screen.getByText("cc")).toBeTruthy();
  });

  it("sin error ni ayuda no declara asociaciones", () => {
    render(<CampoFormulario id="g" etiqueta="Nombre" ancho="completo">{(p) => <input {...p} />}</CampoFormulario>);
    const control = screen.getByLabelText("Nombre");
    expect(control.getAttribute("aria-invalid")).toBeNull();
    expect(control.getAttribute("aria-describedby")).toBeNull();
  });
});

describe("SeccionFormulario", () => {
  it("expone la sección con su título como nombre accesible", () => {
    render(<SeccionFormulario titulo="Motor" descripcion="Datos" columnas={3}><p>contenido</p></SeccionFormulario>);
    expect(screen.getByRole("region", { name: "Motor" })).toBeTruthy();
    expect(screen.getByText("Datos")).toBeTruthy();
  });
});
