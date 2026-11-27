import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmarAnulacion } from "./confirmar-anulacion";

afterEach(cleanup);

describe("ConfirmarAnulacion", () => {
  it("exige motivo, muestra el rechazo del servidor y permite cancelar", async () => {
    const onConfirmar = vi.fn().mockRejectedValueOnce(new Error("El stock ya se vendió.")).mockRejectedValueOnce("x");
    const onCancelar = vi.fn();
    render(<ConfirmarAnulacion titulo="Anular" descripcion="Detalle" etiquetaConfirmar="Anular compra" onCancelar={onCancelar} onConfirmar={onConfirmar} />);
    const confirmar = () => fireEvent.click(screen.getByRole("button", { name: "Anular compra" }));
    confirmar();
    expect(screen.getByRole("alert").textContent).toContain("mínimo 5");
    expect(onConfirmar).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  duplicada  " } });
    confirmar();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("El stock ya se vendió."));
    expect(onConfirmar).toHaveBeenCalledWith("duplicada");
    confirmar();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("No se pudo anular."));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
